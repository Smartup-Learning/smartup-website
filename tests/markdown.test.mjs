import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../src/lib/markdown.mjs';

test('headings, paragraphs and lists render', () => {
  const html = renderMarkdown('## Plan\n\nStart early.\n\n- One\n- Two\n\n1. First\n2. Second');
  assert.equal(html, '<h2>Plan</h2>\n<p>Start early.</p>\n<ul><li>One</li><li>Two</li></ul>\n<ol><li>First</li><li>Second</li></ol>');
});

test('bold, italic and safe links render', () => {
  assert.equal(renderMarkdown('**Bold** and *calm* [call us](https://smartupedu.in/contact)'), '<p><strong>Bold</strong> and <em>calm</em> <a href="https://smartupedu.in/contact">call us</a></p>');
  assert.equal(renderMarkdown('[mail](mailto:info@smartupedu.in)'), '<p><a href="mailto:info@smartupedu.in">mail</a></p>');
});

test('HTML and unsafe links are escaped, never executed', () => {
  assert.equal(renderMarkdown('<script>alert(1)</script>'), '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
  assert.equal(renderMarkdown('[x](javascript:alert(1))'), '<p>[x](javascript:alert(1))</p>');
  assert.equal(renderMarkdown('[x](https://a.b/"onmouseover="y)'), '<p><a href="https://a.b/&quot;onmouseover=&quot;y">x</a></p>');
});
