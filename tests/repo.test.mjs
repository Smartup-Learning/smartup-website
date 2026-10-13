import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

test('no source, content or test file is hidden by .gitignore', () => {
  const ignored = execFileSync('git', ['ls-files', '--others', '--ignored', '--exclude-standard', 'src', 'public', 'data-seed', 'scripts', 'tests', 'server'], { encoding: 'utf8' }).trim();
  assert.equal(ignored, '', `ignored but needed:\n${ignored}`);
});

test('no Python cache files are tracked', () => {
  const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(f => f.includes('__pycache__'));
  assert.deepEqual(tracked, []);
});

test('the production image builds the Astro site and ships only runtime dependencies', () => {
  const docker = readFileSync('Dockerfile', 'utf8');
  assert.match(docker, /^FROM node:24-slim AS build$/m);
  assert.match(docker, /^RUN npx astro build$/m);
  assert.match(docker, /^FROM node:24-alpine$/m);
  assert.match(docker, /npm ci --omit=dev/);
  assert.match(docker, /^COPY --from=build \/app\/build \.\/build$/m);
  const { dependencies } = JSON.parse(readFileSync('package.json', 'utf8'));
  for (const name of ['astro', '@astrojs/node', 'compression', 'sharp']) assert.ok(dependencies[name], `${name} is a runtime dependency`);
  const ignore = readFileSync('.dockerignore', 'utf8').split('\n');
  for (const entry of ['content-source', 'build', 'tests']) assert.ok(ignore.includes(entry), `.dockerignore lists ${entry}`);
});

test('every package the built site imports is installed at the top level in production', () => {
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8')).packages;
  const files = execFileSync('find', ['build/server', '-name', '*.mjs'], { encoding: 'utf8' }).trim().split('\n');
  const names = new Set();
  for (const file of files) {
    for (const [, spec] of readFileSync(file, 'utf8').matchAll(/(?:from|import)\s*\(?\s*"([a-z@][^"]*)"/g)) {
      if (spec.startsWith('node:') || spec.startsWith('astro:')) continue;
      names.add(spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]);
    }
  }
  assert.ok(names.has('astro'));
  for (const name of names) {
    const entry = lock[`node_modules/${name}`];
    assert.ok(entry && !entry.dev && !entry.devOptional, `${name} must be a top-level production package (npm ci --omit=dev)`);
  }
});
