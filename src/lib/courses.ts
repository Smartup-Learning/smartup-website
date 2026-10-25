import { BOARD_NAMES } from '../../server/forms.mjs';

export type Programme = { id: number; board: string; name: string; tagline: string; groupSize: string; keyPoints: string[]; features: string[]; fee: string; mentorRatio: string; parentMeetings: string };
export type Cell = boolean | string;

export const formatMinutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} hr${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);

/** Boards in the order the site shows them, with their headings. */
export const BOARDS = [
  { id: 'cbse', label: BOARD_NAMES.cbse, heading: 'CBSE online programs' },
  { id: 'state', label: BOARD_NAMES.state, heading: 'State Board program' },
];

/** "Smartup Pro" → "Pro", "State Board programme" → "State Board". */
export const shortName = (name: string) => name.replace(/^Smartup\s+/i, '').replace(/\s+program(me)?$/i, '');
export const askLabel = (name: string) => `Ask about ${shortName(name)}`;
export const demoLink = (name: string) => `/demo?programme=${encodeURIComponent(name)}`;
/** Group sizes like 1:1 are shown as large figures; words like "Micro batch" a little smaller. */
export const isRatio = (size: string) => /^\d+:\d+$/.test(size.trim());

const isMentorship = (feature: string) => /mentor/i.test(feature);

/** How a programme's mentorship reads on its card: its ratio ("1:1 Mentorship"), "Mentorship" when included, or none. */
export const mentorship = (p: Programme) => p.mentorRatio || (p.features.some(isMentorship) ? 'Mentorship' : '');

/**
 * The comparison table rows for a board's programmes: the fee (when any is set), every feature in the order it
 * first appears, then mentorship and parent meetings. A feature is ticked for a programme that lists it. Mentorship is
 * one row: the programme's mentor ratio, or a tick when it lists mentorship without a ratio.
 */
export function comparisonRows(programmes: Programme[]): { feature: string; cells: Cell[] }[] {
  const rows: { feature: string; cells: Cell[] }[] = [];
  if (programmes.some(p => p.fee)) rows.push({ feature: 'Fee', cells: programmes.map(p => p.fee || 'Ask us') });
  for (const feature of new Set(programmes.flatMap(p => p.features))) {
    if (!isMentorship(feature)) rows.push({ feature, cells: programmes.map(p => p.features.includes(feature)) });
  }
  if (programmes.some(p => mentorship(p))) rows.push({ feature: 'Mentorship', cells: programmes.map(p => p.mentorRatio || p.features.some(isMentorship)) });
  if (programmes.some(p => p.parentMeetings)) rows.push({ feature: 'Parent meetings', cells: programmes.map(p => p.parentMeetings || false) });
  return rows;
}
