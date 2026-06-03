#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, 'staxio/publishing.config.json');
const QUEUE_PATH = path.join(ROOT, 'staxio/publishing.queue.json');
const HISTORY_PATH = path.join(ROOT, 'staxio/publishing.history.json');

async function main() {
  const config = await readJson(CONFIG_PATH);

  if (!config?.enabled) {
    console.log('Scheduled publishing is disabled.');
    return;
  }

  const now = new Date();
  const collections = config.content?.collections ?? [];
  const scheduledPosts = (await Promise.all(
    collections.map((collection) => readScheduledPosts(collection, now)),
  )).flat();
  const duePosts = scheduledPosts
    .filter((post) => post.publishAt <= now)
    .sort((left, right) => left.publishAt.valueOf() - right.publishAt.valueOf());
  const maxPostsPerRun = Math.max(1, Number(config.publishing?.maxPostsPerRun ?? 1));
  const postsToPublish = duePosts.slice(0, maxPostsPerRun);

  if (postsToPublish.length === 0) {
    console.log('No scheduled posts are due.');
    return;
  }

  const publishedAt = now.toISOString();
  const published = [];

  for (const post of postsToPublish) {
    await publishPost(post, publishedAt);
    published.push({
      path: path.relative(ROOT, post.filePath),
      collection: post.collection.name,
      slug: post.frontmatter.slug ?? path.basename(post.filePath, path.extname(post.filePath)),
      title: post.frontmatter.title ?? null,
      publishAt: post.publishAt.toISOString(),
      publishedAt,
    });
  }

  const remainingScheduledPosts = scheduledPosts
    .filter((post) => !postsToPublish.some((publishedPost) => publishedPost.filePath === post.filePath))
    .map((post) => ({
      path: path.relative(ROOT, post.filePath),
      collection: post.collection.name,
      slug: post.frontmatter.slug ?? path.basename(post.filePath, path.extname(post.filePath)),
      title: post.frontmatter.title ?? null,
      publishAt: post.publishAt.toISOString(),
      status: post.frontmatter.status ?? null,
    }))
    .sort((left, right) => left.publishAt.localeCompare(right.publishAt));

  await writeJson(QUEUE_PATH, {
    updatedAt: publishedAt,
    items: remainingScheduledPosts,
  });

  const history = await readJson(HISTORY_PATH).catch(() => ({ items: [] }));
  await writeJson(HISTORY_PATH, {
    items: [...(history.items ?? []), ...published],
  });

  console.log('Published ' + published.length + ' scheduled post(s).');
}

async function readScheduledPosts(collection, now) {
  const directory = path.join(ROOT, collection.directory);
  const files = await listMarkdownFiles(directory).catch(() => []);
  const posts = [];

  for (const filePath of files) {
    const source = await fs.readFile(filePath, 'utf8');
    const parsed = parseFrontmatter(source);

    if (!parsed) {
      continue;
    }

    const status = parsed.values.status;
    const hasScheduleIntent = status === 'scheduled';

    if (!hasScheduleIntent) {
      continue;
    }

    const publishAtValue = parsed.values.publishAt ?? parsed.values[collection.dateField];
    const publishAt = new Date(String(publishAtValue ?? ''));

    if (Number.isNaN(publishAt.valueOf())) {
      console.warn('Skipping ' + path.relative(ROOT, filePath) + ': invalid publishAt/date.');
      continue;
    }

    posts.push({
      filePath,
      collection,
      frontmatter: parsed.values,
      source,
      parsed,
      publishAt,
      now,
    });
  }

  return posts;
}

async function publishPost(post, publishedAt) {
  const dueIso = post.publishAt.toISOString();
  const currentDate = new Date(String(post.frontmatter[post.collection.dateField] ?? ''));
  const updates = {
    status: 'published',
    draft: false,
    publishedAt,
  };

  if (Number.isNaN(currentDate.valueOf()) || currentDate > post.now) {
    updates[post.collection.dateField] = dueIso;
  }

  const nextFrontmatter = upsertFrontmatter(post.parsed.frontmatter, updates);
  const nextSource = [
    '---',
    nextFrontmatter.trimEnd(),
    '---',
    post.parsed.body.replace(/^\r?\n/, ''),
  ].join('\n');

  await fs.writeFile(post.filePath, nextSource.endsWith('\n') ? nextSource : nextSource + '\n');
}

function parseFrontmatter(source) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(source);

  if (!match) {
    return null;
  }

  const values = {};

  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);

    if (!pair) {
      continue;
    }

    values[pair[1]] = parseFrontmatterValue(pair[2]);
  }

  return {
    frontmatter: match[1],
    body: match[2],
    values,
  };
}

function parseFrontmatterValue(value) {
  const trimmed = value.trim();

  if (trimmed === 'true') {
    return true;
  }

  if (trimmed === 'false') {
    return false;
  }

  return trimmed.replace(/^['"]|['"]$/g, '');
}

function upsertFrontmatter(frontmatter, updates) {
  const remaining = new Map(Object.entries(updates));
  const lines = frontmatter.split(/\r?\n/).map((line) => {
    const pair = /^([A-Za-z0-9_-]+):/.exec(line);

    if (!pair || !remaining.has(pair[1])) {
      return line;
    }

    const value = remaining.get(pair[1]);
    remaining.delete(pair[1]);
    return pair[1] + ': ' + formatFrontmatterValue(value);
  });

  for (const [key, value] of remaining) {
    lines.push(key + ': ' + formatFrontmatterValue(value));
  }

  return lines.join('\n');
}

function formatFrontmatterValue(value) {
  if (typeof value === 'boolean' || typeof value === 'number') {
    return String(value);
  }

  return JSON.stringify(String(value));
}

async function listMarkdownFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listMarkdownFiles(entryPath)));
      continue;
    }

    if (/\.(md|mdx)$/.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2) + '\n');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
