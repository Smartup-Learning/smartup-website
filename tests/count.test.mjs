import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCount } from '../src/lib/count.ts';

test('counters keep the grouping the editor typed', () => {
  assert.equal(formatCount(30000, true), '30,000');
  assert.equal(formatCount(2014, false), '2014');
  assert.equal(formatCount(107, false), '107');
});
