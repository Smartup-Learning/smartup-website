/** Single-line text: trimmed, inner whitespace collapsed. Anything that is not a string becomes ''. */
export const line = value => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '');

/** Multi-line text: Windows and old Mac line endings become \n, then trimmed. */
export const block = value => (typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim() : '');

export function isWebUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export const isEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/** An error the API turns into `{ error, fields? }` with this status. */
export const httpError = (status, message, fields) => Object.assign(new Error(message), { status, ...(fields ? { fields } : {}) });
