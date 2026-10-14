import { keepTogether } from './text.mjs';
import { PHONE, phoneAnchor } from './phones.mjs';

const escapeHtml = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// http(s), mailto and paths on this site ("/demo", never "//other-site"); one level of balanced brackets is allowed inside the address.
const LINK = /\[([^\]]+)\]\(((?:https?:\/\/|mailto:|\/(?![\/\\]))(?:[^()\s]|\([^()\s]*\))*)\)/g;

// Inline formatting runs on already-escaped text, so no HTML from the source can survive.
// Links are swapped out before emphasis runs, so a * inside an address never becomes markup.
function inline(text) {
  const links = [];
  return escapeHtml(text)
    .replace(LINK, (_, label, href) => `\u0000${links.push(`<a href="${href}">${label}</a>`) - 1}\u0000`)
    .replace(PHONE, (...match) => `\u0000${links.push(phoneAnchor(...match)) - 1}\u0000`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/[^\u0000]+/g, part => keepTogether(part))
    .replace(/\u0000(\d+)\u0000/g, (_, i) => links[Number(i)]);
}

/** Renders the small Markdown subset staff use for posts. Output is safe to insert as HTML. */
export function renderMarkdown(source) {
  const text = String(source).replace(/\u0000/g, '').replace(/\r\n?/g, '\n').trim();
  if (!text) return '';
  return text.split(/\n\s*\n/).flatMap(block => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    const out = [];
    // The page title is the only h1, so # and ## both become h2.
    const heading = /^(#{1,3})\s+(.*)$/.exec(lines[0]);
    if (heading) {
      const level = Math.max(2, heading[1].length);
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      lines.shift();
    }
    if (lines.length === 0) return out;
    if (lines.every(l => /^[-*]\s+/.test(l))) out.push(`<ul>${lines.map(l => `<li>${inline(l.replace(/^[-*]\s+/, ''))}</li>`).join('')}</ul>`);
    else if (lines.every(l => /^\d+\.\s+/.test(l))) out.push(`<ol>${lines.map(l => `<li>${inline(l.replace(/^\d+\.\s+/, ''))}</li>`).join('')}</ol>`);
    else out.push(`<p>${inline(lines.join(' '))}</p>`);
    return out;
  }).join('\n');
}
