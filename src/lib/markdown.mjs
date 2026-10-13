const escapeHtml = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Inline formatting runs on already-escaped text, so no HTML from the source can survive.
function inline(text) {
  return escapeHtml(text)
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^)\s]+)\)/g, (_, label, href) => `<a href="${href}">${label}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

/** Renders the small Markdown subset staff use for posts. Output is safe to insert as HTML. */
export function renderMarkdown(source) {
  return source.trim().split(/\n{2,}/).map(block => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    const heading = /^(#{2,3})\s+(.*)$/.exec(lines[0]);
    if (heading && lines.length === 1) return `<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`;
    if (lines.every(l => /^-\s+/.test(l))) return `<ul>${lines.map(l => `<li>${inline(l.replace(/^-\s+/, ''))}</li>`).join('')}</ul>`;
    if (lines.every(l => /^\d+\.\s+/.test(l))) return `<ol>${lines.map(l => `<li>${inline(l.replace(/^\d+\.\s+/, ''))}</li>`).join('')}</ol>`;
    return `<p>${inline(lines.join(' '))}</p>`;
  }).join('\n');
}
