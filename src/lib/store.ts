import { openContentStore } from '../../server/content-store.mjs';

let devStore: ReturnType<typeof openContentStore> | undefined;

/** Production passes the shared store through locals; `astro dev` opens DATA_DIR directly. */
export function getStore(locals: App.Locals) {
  if (locals.store) return locals.store;
  devStore ??= openContentStore();
  return devStore;
}
