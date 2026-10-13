import { normalizePhone } from './content-store.mjs';
import { line, block, isWebUrl, isEmail } from './validators.mjs';

export const GRADES = [
  { value: '5', label: 'Class 5' }, { value: '6', label: 'Class 6' }, { value: '7', label: 'Class 7' },
  { value: '8', label: 'Class 8' }, { value: '9', label: 'Class 9' }, { value: '10', label: 'Class 10' },
  { value: '11', label: 'Plus One (Class 11)' }, { value: '12', label: 'Plus Two (Class 12)' },
];
export const BOARDS = ['CBSE', 'State Board', 'Other'];
export const MODES = ['Online', 'At a centre'];

function check(errors, key, ok, message) {
  if (!ok && !errors[key]) errors[key] = message;
}

function person(input, errors) {
  const name = line(input.name);
  check(errors, 'name', name.length >= 2 && name.length <= 80, 'Enter a name (2 to 80 characters).');
  let phone = '';
  try { phone = normalizePhone(line(input.phone)); } catch { errors.phone = 'Enter a 10-digit Indian mobile number.'; }
  return { name, phone };
}

export function validateDemo(input, { centres }) {
  const errors = {};
  const { name, phone } = person(input, errors);
  const grade = line(input.grade);
  const board = line(input.board);
  const mode = line(input.mode);
  const preferred_time = line(input.preferred_time);
  let centre = line(input.centre);
  check(errors, 'grade', GRADES.some(g => g.value === grade), 'Choose a class from 5 to 12.');
  check(errors, 'board', BOARDS.includes(board), 'Choose a board.');
  check(errors, 'mode', MODES.includes(mode), 'Choose online or at a centre.');
  if (mode === 'At a centre') check(errors, 'centre', centres.includes(centre), 'Choose a centre.');
  else centre = '';
  check(errors, 'preferred_time', preferred_time.length <= 60, 'Keep this under 60 characters.');
  return { values: { name, phone, grade, board, mode, centre, preferred_time }, errors };
}

export function validateCareers(input, { roles }) {
  const errors = {};
  const { name, phone } = person(input, errors);
  const email = line(input.email);
  const role = line(input.role);
  const experience = line(input.experience);
  const message = block(input.message);
  const cv_url = line(input.cv_url);
  check(errors, 'email', email.length <= 120 && isEmail(email), 'Enter a valid email address.');
  check(errors, 'role', [...roles, 'Other'].includes(role), 'Choose a role.');
  check(errors, 'experience', experience.length <= 200, 'Keep this under 200 characters.');
  check(errors, 'message', message.length <= 1500, 'Keep your message under 1,500 characters.');
  check(errors, 'cv_url', cv_url === '' || (cv_url.length <= 300 && isWebUrl(cv_url)), 'Use a full link starting with https://');
  return { values: { name, phone, email, role, experience, message, cv_url }, errors };
}

export function validateAsk(input) {
  const errors = {};
  const { name, phone } = person(input, errors);
  const email = line(input.email);
  const question = block(input.question);
  check(errors, 'email', email === '' || (email.length <= 120 && isEmail(email)), 'Enter a valid email address, or leave it empty.');
  check(errors, 'question', question.length >= 10 && question.length <= 1500, 'Write your question in 10 to 1,500 characters.');
  return { values: { name, phone, email, question }, errors };
}

/** People never see the "website" field; only bots fill it in. */
export const isBot = input => line(input.website) !== '';
