import { createD1Store, D1Store } from './d1-store';

let fallbackStore: D1Store | undefined;

/** Returns the D1-backed content store attached by middleware, or an in-memory fallback. */
export function getStore(locals: App.Locals): D1Store {
  if (locals?.store) return locals.store;
  fallbackStore ??= new D1Store(
    // Fallback store using synchronous seed data
    (createD1Store as any).__fallbackSnapshot || {
      settings: {},
      stats: [],
      timeline: [],
      growth: [],
      leaders: [],
      results: [],
      faculty: [],
      events: [],
      videos: [],
      posts: [],
      faqs: [],
      testimonials: { feedback: [], alumni: [] },
      jobs: [],
      alumni: [],
      centres: [],
      programmes: [],
      media: new Map(),
    }
  );
  return fallbackStore;
}
