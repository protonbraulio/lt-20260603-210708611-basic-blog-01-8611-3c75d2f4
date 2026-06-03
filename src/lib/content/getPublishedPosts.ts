import { getCollection, type CollectionKey } from 'astro:content';

import { isPublished } from './isPublished';

const DEFAULT_COLLECTION = "blog" as CollectionKey;
const DEFAULT_DATE_FIELD = "pubDate";

export async function getPublishedPosts(
  collectionName: CollectionKey = DEFAULT_COLLECTION,
  options: { dateField?: string; now?: Date } = {},
) {
  const dateField = options.dateField ?? DEFAULT_DATE_FIELD;
  const now = options.now ?? new Date();
  const posts = await getCollection(collectionName, ({ data }) =>
    isPublished(data as Record<string, unknown>, { dateField, now }),
  );

  return posts.sort((left, right) => {
    return (
      getDateMs(right.data as Record<string, unknown>, dateField) -
      getDateMs(left.data as Record<string, unknown>, dateField)
    );
  });
}

function getDateMs(data: Record<string, unknown>, dateField: string) {
  const value = data.publishedAt ?? data[dateField];
  const date = value instanceof Date ? value : new Date(String(value ?? ''));
  return Number.isNaN(date.valueOf()) ? 0 : date.valueOf();
}
