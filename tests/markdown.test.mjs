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

test('Windows line endings from a form post render the same as Unix ones', () => {
  assert.equal(renderMarkdown('## Plan\r\n\r\n- One\r\n- Two'), '<h2>Plan</h2>\n<ul><li>One</li><li>Two</li></ul>');
});

test('a heading followed directly by text becomes a heading and a paragraph', () => {
  assert.equal(renderMarkdown('## Plan\nStart early.'), '<h2>Plan</h2>\n<p>Start early.</p>');
  assert.equal(renderMarkdown('# Title'), '<h2>Title</h2>');
});

test('stars and brackets inside a link address stay part of the link', () => {
  assert.equal(renderMarkdown('[guide](https://example.com/a*b*c)'), '<p><a href="https://example.com/a*b*c">guide</a></p>');
  assert.equal(renderMarkdown('[Kerala](https://en.wikipedia.org/wiki/Kerala_(state))'), '<p><a href="https://en.wikipedia.org/wiki/Kerala_(state)">Kerala</a></p>');
});

test('ranges in posts stay on one line, and link addresses are left untouched', () => {
  const html = renderMarkdown('Days 1–30, then [see](https://example.com/a–b)');
  assert.ok(html.includes('1–⁠30'));
  assert.ok(html.includes('href="https://example.com/a–b"'));
});

test('Indian phone numbers in posts become tap-to-call links', () => {
  assert.ok(renderMarkdown('Call +91 88919 10919 today').includes('<a href="tel:+918891910919">+91 88919 10919</a>'));
});

test('links to pages on this site are allowed, but not to other schemes', () => {
  assert.ok(renderMarkdown('[Book a demo](/demo)').includes('<a href="/demo">Book a demo</a>'));
  assert.ok(!renderMarkdown('[x](//evil.example)').includes('href'));
  assert.ok(!renderMarkdown('[x](javascript:alert(1))').includes('href'));
});
