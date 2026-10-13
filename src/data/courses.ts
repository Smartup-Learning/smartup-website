export type Programme = { eyebrow: string; ratio: string; name: string; points: string[]; ask: string };
export type Board = { id: string; label: string; heading: string; programmes: Programme[] };

export const courseBoards: Board[] = [
  {
    id: 'cbse', label: 'CBSE', heading: 'CBSE online programmes',
    programmes: [
      { eyebrow: 'Personal attention', ratio: '1:1', name: 'Smartup Pro', points: ['Student diagnosis & learning plan', 'Mentorship and counselling', 'Monthly parent meetings'], ask: 'Ask about Pro' },
      { eyebrow: 'Learn together', ratio: '1:3', name: 'Smartup Trio', points: ['Three-student learning format', 'Mentorship and regular evaluations', 'Parent meetings every two months'], ask: 'Ask about Trio' },
      { eyebrow: 'Shared momentum', ratio: 'Micro', name: 'Smartup Power', points: ['Competency-based learning', 'Daily, weekly & monthly evaluations', 'Quarterly parent meetings'], ask: 'Ask about Power' },
    ],
  },
  {
    id: 'state', label: 'State Board', heading: 'State Board programme',
    programmes: [
      { eyebrow: 'State Board', ratio: 'Online', name: 'State Board programme', points: ['Concepts taught through board-style questions', 'Daily practice, SCERT exercises and doubt support', 'Regular assessments and focused exam revision'], ask: 'Ask about State Board' },
    ],
  },
];
