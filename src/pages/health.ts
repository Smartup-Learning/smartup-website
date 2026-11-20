import type { APIRoute } from 'astro';

export const ALL: APIRoute = async () => {
  return new Response('ok', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
};
