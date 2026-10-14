/** "Afna Navas — 1108/1200" becomes { name: 'Afna Navas', score: '1108/1200' }; headlines without a dash keep it all as the name. */
export function splitHeadline(headline) {
  const match = /^(.+?)\s+[—–]\s+(.+)$/.exec(String(headline ?? '').trim());
  return match ? { name: match[1], score: match[2] } : { name: String(headline ?? '').trim(), score: '' };
}

const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The parts of a result's detail that say something the exam heading and year do not, e.g. "Full A+" or a centre. */
export function extraDetail(detail, exam, year, board) {
  const known = [exam, board, 'CBSE', 'State Board', year].filter(Boolean).map(word => new RegExp(`\\b${escape(word)}\\b`, 'gi'));
  return String(detail ?? '')
    .split(/[,·]/)
    .map(part => known.reduce((text, pattern) => text.replace(pattern, ''), part)
      .replace(/\b\d{4}\s*[–-]\s*\d{2,4}\b/g, '')
      .replace(/\s+/g, ' ')
      .trim())
    .filter(part => /[\p{L}\p{N}]/u.test(part))
    .join(' · ');
}

/** "107 students with Full A+" becomes { figure: '107', rest: 'students with Full A+' }. */
export function leadFigure(headline) {
  const match = /^([\d,.]+%?\+?)\s+(.+)$/.exec(String(headline ?? '').trim());
  return match ? { figure: match[1], rest: match[2] } : { figure: '', rest: String(headline ?? '').trim() };
}
