const WORD_JOINER = '⁠';
const NO_BREAK_SPACE = ' ';

/** Keeps ranges like "5–9 pm", "8–12" and "K–12" on one line: browsers may otherwise break right after the dash. */
export function keepTogether(text) {
  return String(text ?? '')
    .replace(/(\w)–(?=\w)/g, `$1–${WORD_JOINER}`)
    .replace(/(\d) (am|pm)\b/gi, `$1${NO_BREAK_SPACE}$2`);
}
