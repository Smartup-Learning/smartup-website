import type { APIRoute } from 'astro';
import { navGroups } from '../lib/nav';
import { getStore } from '../lib/store';
import { siteOrigin } from '../lib/site';

const escapeXml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export const GET: APIRoute = ({ locals, url }) => {
  const origin = siteOrigin(locals, url);
  const pages = ['/', ...navGroups.flatMap(group => group.links.map(link => link.href)), '/privacy'];
  const posts = getStore(locals).posts().map(post => `/blog/${post.slug}`);
  const urls = [...new Set([...pages, ...posts])].map(path => `  <url><loc>${escapeXml(origin + path)}</loc></url>`);
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
