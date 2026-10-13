import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// Builds to build/ because dist/client and dist/server belong to the Sites bundle.
export default defineConfig({
  output: 'server',
  outDir: './build',
  adapter: node({ mode: 'middleware' }),
  devToolbar: { enabled: false },
  // Inline page CSS so no stylesheet request delays the first paint on mobile data.
  build: { inlineStylesheets: 'always' },
});
