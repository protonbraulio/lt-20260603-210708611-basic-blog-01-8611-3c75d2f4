---
title: "Example scheduled post"
slug: "example-scheduled-post"
description: "Example post prepared for scheduled publishing."
status: scheduled
draft: true
publishAt: "2026-06-04T09:00:00.000Z"
pubDate: "2026-06-04T09:00:00.000Z"
topicCluster: "scheduled publishing"
priority: 1
internalLinks: []
license: cc-by-nc-sa-4-0
image:
  src: "https://example.com/images/placeholder-card.svg"
  alt: "Scheduled publishing placeholder image."
---

This example shows the frontmatter contract for scheduled publishing.

The GitHub Actions scheduler will publish it when `publishAt` is due by changing `status` to `published`, setting `draft: false`, and adding `publishedAt`.
