/** Line-art icons from the brand collateral's education band, drawn on a 24×24 grid with a 1.3 stroke. */
export const ICONS = {
  book: '<path d="M3 6.5c2.5-1 5.5-1 9 .8 3.5-1.8 6.5-1.8 9-.8V19c-2.5-1-5.5-1-9 .8-3.5-1.8-6.5-1.8-9-.8zM12 7.3v12.5"/>',
  cap: '<path d="M2 9l10-4 10 4-10 4zM6 10.6V15c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.4M22 9v5"/>',
  atom: '<circle cx="12" cy="12" r="1.6"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/>',
  flask: '<path d="M9 3h6M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4a1.5 1.5 0 0 0 1.3-2L14 9V3M7.5 15h9"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0M12 3v2"/>',
  pencil: '<path d="M4 20l1-5L16 4l4 4L9 19zM14 6l4 4"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.6 1 2.5h6c0-.9.2-1.7 1-2.5A6 6 0 0 0 12 3z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
  people: '<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20c.5-3.5 2.7-5.5 5.5-5.5s5 2 5.5 5.5M14 15.2c.9-.5 1.9-.7 3-.7 2.4 0 4 1.7 4.5 5"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>',
  chart: '<path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
} as const;
export type IconName = keyof typeof ICONS;

/** A stable icon for a category name, so the same topic always gets the same picture. */
export function iconFor(category: string, choices: IconName[] = ['book', 'bulb', 'people', 'pencil', 'cap', 'atom']): IconName {
  const known: Record<string, IconName> = { 'exam preparation': 'book', 'study tips': 'bulb', 'parent guidance': 'people' };
  const key = category.trim().toLowerCase();
  if (known[key]) return known[key];
  const hash = [...key].reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return choices[hash % choices.length];
}
