import test from 'node:test';
import assert from 'node:assert/strict';
import { createD1Store, D1Store } from '../src/lib/d1-store.ts';

test('D1Store initializes and returns fallback snapshot seamlessly', async () => {
  const store = await createD1Store();
  assert(store instanceof D1Store);

  const settings = store.settings();
  assert.ok(settings);
  assert.equal(typeof settings, 'object');

  const stats = store.stats();
  assert.ok(Array.isArray(stats));
  assert(stats.length > 0);

  const centres = store.centres();
  assert.ok(Array.isArray(centres));
  assert(centres.length > 0);

  const programmes = store.programmes();
  assert.ok(Array.isArray(programmes));
  assert(programmes.length > 0);

  const posts = store.posts();
  assert.ok(Array.isArray(posts));
  assert(posts.length > 0);

  const singlePost = store.post(posts[0].slug);
  assert.ok(singlePost);
  assert.equal(singlePost.slug, posts[0].slug);

  const mediaSize = store.mediaSize('/seed/img/owl');
  assert.ok(mediaSize === null || typeof mediaSize === 'object');
});
