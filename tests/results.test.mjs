import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitHeadline, extraDetail, leadFigure } from '../src/lib/results.mjs';

test('a result headline splits into the name and the score', () => {
  assert.deepEqual(splitHeadline('Afna Navas — 1108/1200'), { name: 'Afna Navas', score: '1108/1200' });
  assert.deepEqual(splitHeadline('Angela and Ann Fiya — Full A+'), { name: 'Angela and Ann Fiya', score: 'Full A+' });
  assert.deepEqual(splitHeadline('Plus One 2026 toppers'), { name: 'Plus One 2026 toppers', score: '' });
});

test('detail that only repeats the exam, board and year is dropped; anything new is kept', () => {
  assert.equal(extraDetail('CBSE Class 10, 2025–26', 'Class 10', '2026', 'CBSE'), '');
  assert.equal(extraDetail('Plus Two 2026', 'Plus Two', '2026', 'State'), '');
  assert.equal(extraDetail('Full A+, Plus Two 2026', 'Plus Two', '2026', 'State'), 'Full A+');
  assert.equal(extraDetail('SSLC 2024 · Chullickal', 'SSLC', '2024', 'State'), 'Chullickal');
  assert.equal(extraDetail('Full A+, Plus One 2024 · Palluruthy', 'Plus One', '2024', 'State'), 'Full A+ · Palluruthy');
  assert.equal(extraDetail('', 'SSLC', '2024', 'State'), '');
});

test('a summary headline leads with its figure', () => {
  assert.deepEqual(leadFigure('107 students with Full A+'), { figure: '107', rest: 'students with Full A+' });
  assert.deepEqual(leadFigure('100% pass in CBSE Class 10'), { figure: '100%', rest: 'pass in CBSE Class 10' });
  assert.deepEqual(leadFigure('Plus One 2026 toppers'), { figure: '', rest: 'Plus One 2026 toppers' });
});
