const escapeHtml = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Indian mobile numbers written as +91 followed by ten digits, with optional spaces or dashes. */
export const PHONE = /\+91[\s-]?(\d{5})[\s-]?(\d{5})\b/g;
export const phoneAnchor = (number, first, second) => `<a href="tel:+91${first}${second}">${number}</a>`;

/** Plain text as safe HTML, with Indian mobile numbers as tap-to-call links. */
export function linkPhones(text) {
  return escapeHtml(String(text ?? '')).replace(PHONE, phoneAnchor);
}
