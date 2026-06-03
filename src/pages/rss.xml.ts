import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";

import { SITE_SETTINGS } from "../site.config";

export async function GET(context: APIContext) {
  const blogPosts = await getCollection("blog", ({ data }) => data.draft !== true && data.pubDate <= new Date());
  const projects = await getCollection("projects", ({ data }) => data.draft !== true && data.pubDate <= new Date());

  const allEntries = [...blogPosts, ...projects].sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );

  return rss({
    title: SITE_SETTINGS.title,
    description: SITE_SETTINGS.description,
    site: context.site ?? "",
    items: allEntries.map((entry) => ({
      title: entry.data.title,
      pubDate: entry.data.pubDate,
      description: entry.data.description,
      link: `/${entry.collection === "blog" ? "blog" : "projects"}/${entry.id}/`,
      ...(entry.data.tags.length > 0 && { categories: entry.data.tags }),
      author: `noreply@${new URL(context.site ?? "https://example.com").hostname} (Basic Blog Load Test 01 20260603-210708611)`,
    })),
    customData: `<language>en-us</language>`,
  });
}
