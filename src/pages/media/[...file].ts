import type { APIRoute } from 'astro';
import { env as cfEnv } from 'cloudflare:workers';

export const GET: APIRoute = async (context) => {
  const file = context.params.file;
  if (!file) return new Response('Not found', { status: 404 });

  const mediaBucket = (cfEnv as any)?.MEDIA;
  if (!mediaBucket) {
    return new Response('Media storage not configured', { status: 404 });
  }

  // Look for exact key or fallback to base name
  let object = await mediaBucket.get(file);
  if (!object) {
    const baseName = file.replace(/(-(480|960|1600))?\.webp$/, '');
    object = await mediaBucket.get(baseName);
  }

  if (!object) {
    return new Response('Not found', { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  if (!headers.get('Content-Type')) {
    headers.set('Content-Type', file.endsWith('.webp') ? 'image/webp' : 'application/octet-stream');
  }

  return new Response(object.body, { headers });
};
