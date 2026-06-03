import type { APIRoute } from 'astro';

const getRobotsTxt = (site: URL) => `User-agent: *
Allow: /

Sitemap: ${new URL('sitemap-index.xml', site).href}
`;

export const GET: APIRoute = ({ site }) => {
  if (!site) {
    return new Response('Missing site configuration.', { status: 500 });
  }

  return new Response(getRobotsTxt(site), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
