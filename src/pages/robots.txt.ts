import type { APIRoute } from 'astro';
import { siteOrigin, hiddenFromSearch } from '../lib/site';

export const GET: APIRoute = ({ locals, url }) => {
  const body = hiddenFromSearch()
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${siteOrigin(locals, url)}/sitemap.xml\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
