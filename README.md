# Basic Blog Load Test 01 20260603-210708611

Faithful Basic Blog Astro port for MakerKit.

## Commands

```bash
pnpm install
pnpm build
```

## Content

- Blog posts live in `src/content/blog`
- Generated pages live in `src/content/projects` and keep `/projects/:slug` detail routes.
- About content lives in `src/content/about`
- Legal content lives in `src/content/legal`

## Scheduled publishing

- Scheduled publishing config lives in `staxio/publishing.config.json`
- Prepared posts use `status: scheduled`, `draft: true`, and `publishAt`
- `.github/workflows/publish-scheduled-posts.yml` only flips frontmatter and commits due posts
- The scheduler does not install dependencies, run Astro builds, or call LLM APIs

## Notes

- The visual structure, layouts, and component hierarchy are based on `truedaniyyel/basic-blog`
- Demo imagery was replaced with local placeholder artwork so the generated site remains self-contained
- Contact and newsletter pages keep the upstream look but ship with static default forms until you wire your own backend
