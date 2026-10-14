export type Programme = { eyebrow: string; ratio: string; name: string; points: string[]; features: string[]; ask: string };
export type Board = { id: string; label: string; heading: string; programmes: Programme[] };

export const courseBoards: Board[] = [
  {
    id: 'cbse', label: 'CBSE', heading: 'CBSE online programmes',
    programmes: [
      {
        eyebrow: 'Personal attention', ratio: '1:1', name: 'Smartup Pro',
        points: ['Student diagnosis & learning plan', 'Mentorship and counselling', 'Monthly parent meetings'],
        features: ['Student diagnosis', 'Personalised learning plan', 'AI-integrated learning app and LMS', 'Strictly follows your school syllabus', 'Competency-based learning', 'Experienced in-house teaching panel', 'Daily, weekly and monthly evaluations', 'Academic counselling panel', 'Mentorship and support', 'Monthly parent meeting', 'WhatsApp learning groups and resources'],
        ask: 'Ask about Pro',
      },
      {
        eyebrow: 'Learn together', ratio: '1:3', name: 'Smartup Trio',
        points: ['Three-student learning format', 'Mentorship and regular evaluations', 'Parent meetings every two months'],
        features: ['AI-integrated learning app and LMS', 'Strictly follows your school syllabus', 'Competency-based learning', 'Experienced teaching panel', 'Daily, weekly and monthly evaluations', 'Mentorship and support', 'Parent meeting every two months', 'WhatsApp learning groups and resources'],
        ask: 'Ask about Trio',
      },
      {
        eyebrow: 'Shared momentum', ratio: 'Micro batch', name: 'Smartup Power',
        points: ['Competency-based learning', 'Daily, weekly & monthly evaluations', 'Quarterly parent meetings'],
        features: ['AI-integrated learning app and LMS', 'Competency-based learning', 'Experienced teaching panel', 'Daily, weekly and monthly evaluations', 'Quarterly parent meeting', 'WhatsApp learning groups and resources'],
        ask: 'Ask about Power',
      },
    ],
  },
  {
    id: 'state', label: 'State Board', heading: 'State Board programme',
    programmes: [
      {
        eyebrow: 'State Board', ratio: 'Online', name: 'State Board programme',
        points: ['Concepts taught through board-style questions', 'Daily practice, SCERT exercises and doubt support', 'Regular assessments and focused exam revision'],
        features: ['Question-oriented teaching by experienced Smartup teachers', 'Concepts taught through exam-style questions', 'Competency-based learning', 'Familiarity with the board exam pattern'],
        ask: 'Ask about State Board',
      },
    ],
  },
];

export const classDurations = [
  { level: 'Class 8', minutes: 90 },
  { level: 'Classes 9 and 10', minutes: 105 },
  { level: 'Plus One and Plus Two', minutes: 120 },
];

export const sessionPlan = [
  { step: 'Teaching and concept delivery', minutes: 60 },
  { step: 'Daily quiz or poll (DCC)', minutes: 10 },
  { step: 'Correction', minutes: 5 },
  { step: 'Doubts and discussion', minutes: 15 },
];

export const mentorRatios = [
  { programme: 'Smartup Pro', ratio: '1 mentor : 10 students' },
  { programme: 'Smartup Trio', ratio: '1 mentor : 20 students' },
];

export const parentUpdates = [
  { name: 'Weekly update', who: 'Smartup Pro and Trio', covers: ['Attendance', 'Topics completed', 'Homework status', 'Test performance and improvement'] },
  { name: 'Monthly report', who: 'Every programme', covers: ['Marks', 'Improvement', 'Strengths', 'Weak areas', 'Teacher remarks', "Next month's target"] },
];

export const stateProgramme = {
  method: ['Concept delivery through exam-based questions', 'Chapter-wise explanation of SCERT texts', 'Previous Year Questions in every class', 'Board-exam-oriented teaching'],
  session: [
    { step: 'Teaching session', minutes: 90 },
    { step: 'Break', minutes: 5 },
    { step: 'Daily quiz (DCC)', minutes: 10 },
    { step: 'Doubt clearance', minutes: 15 },
  ],
  practice: ['A daily workout of PYQs, expected board questions and SCERT exercises, due the next day', 'Step-by-step solutions for every workout', 'WhatsApp learning groups with notes, MCQs and exam tips', 'A quarterly grand test with rank analysis and a performance report'],
  examPrep: ['Sure-shot questions, live on YouTube', 'Most-expected questions and important derivations, live', 'PYQ marathon sessions', 'Rapid revision classes, recorded', 'Late Night Express revision on the app'],
};

export const formatMinutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} hr${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);

/** The CBSE programmes side by side, taken from each programme's own feature list above. */
export type Cell = boolean | string;
export const cbseComparison: { feature: string; pro: Cell; trio: Cell; power: Cell }[] = [
  { feature: 'Group size', pro: 'One student', trio: 'Three students', power: 'Micro batch' },
  { feature: 'Student diagnosis and personalised learning plan', pro: true, trio: false, power: false },
  { feature: 'Strictly follows your school syllabus', pro: true, trio: true, power: false },
  { feature: 'Competency-based learning', pro: true, trio: true, power: true },
  { feature: 'Experienced teaching panel', pro: 'In-house panel', trio: true, power: true },
  { feature: 'AI-integrated learning app and LMS', pro: true, trio: true, power: true },
  { feature: 'Daily, weekly and monthly evaluations', pro: true, trio: true, power: true },
  { feature: 'Academic counselling panel', pro: true, trio: false, power: false },
  { feature: 'Mentorship and support', pro: true, trio: true, power: false },
  { feature: 'Mentor ratio', pro: '1 mentor : 10', trio: '1 mentor : 20', power: false },
  { feature: 'Parent meetings', pro: 'Monthly', trio: 'Every two months', power: 'Quarterly' },
  { feature: 'WhatsApp learning groups and resources', pro: true, trio: true, power: true },
];
