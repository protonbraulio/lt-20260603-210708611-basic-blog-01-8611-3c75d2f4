type PublishableData = {
  draft?: boolean;
  status?: string;
  publishAt?: Date | string;
  publishedAt?: Date | string;
  [key: string]: unknown;
};

export function isPublished(
  data: PublishableData,
  options: { dateField?: string; now?: Date } = {},
) {
  const now = options.now ?? new Date();
  const dateField = options.dateField ?? 'publishedAt';

  if (data.draft === true || data.status === 'scheduled') {
    return false;
  }

  const publishDate = toDate(data.publishedAt ?? data[dateField]);

  if (!publishDate) {
    return true;
  }

  return publishDate <= now;
}

function toDate(value: unknown) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.valueOf()) ? null : date;
}
