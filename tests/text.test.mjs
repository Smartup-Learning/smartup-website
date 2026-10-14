import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keepTogether } from '../src/lib/text.mjs';

const WJ = '⁠', NBSP = ' ';

test('time and number ranges stay on one line', () => {
  assert.equal(keepTogether('open 5–9 pm'), `open 5–${WJ}9${NBSP}pm`);
  assert.equal(keepTogether('classes 8–12 and a K–12 brand'), `classes 8–${WJ}12 and a K–${WJ}12 brand`);
  assert.equal(keepTogether('10 AM to 6 PM'), `10${NBSP}AM to 6${NBSP}PM`);
});

test('ordinary text and empty values are left alone', () => {
  assert.equal(keepTogether('Kochi — online too'), 'Kochi — online too');
  assert.equal(keepTogether(''), '');
  assert.equal(keepTogether(undefined), '');
});
