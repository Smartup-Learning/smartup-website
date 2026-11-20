import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';
import { createD1Store } from './lib/d1-store';

export const onRequest = defineMiddleware(async (context, next) => {
  try {
    context.locals.store = await createD1Store((env as any)?.DB);
  } catch (err) {
    console.error('Failed to init D1 store:', err);
    context.locals.store = await createD1Store();
  }
  context.locals.origin = context.url.origin;
  return next();
});
