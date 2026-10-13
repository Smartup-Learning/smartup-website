import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('no source, content or test file is hidden by .gitignore', () => {
  const ignored = execFileSync('git', ['ls-files', '--others', '--ignored', '--exclude-standard', 'src', 'public', 'data-seed', 'scripts', 'tests', 'server'], { encoding: 'utf8' }).trim();
  assert.equal(ignored, '', `ignored but needed:\n${ignored}`);
});
