export const SUBJECTS = ['mathematics', 'physics', 'chemistry', 'biology'];
export const LEVELS = ['foundation', '5', '6', '7', '8', '9', '10'];
export const REQUIRED_CORRECT = 5;
export const STARTING_LIVES = 5;
export const DATA_NOTICE_VERSION = 'assessment-data-notice-v2';
export function acceptedDataNotice(input) {
 if ('dataNoticeVersion' in input) return input.dataNoticeVersion === DATA_NOTICE_VERSION ? DATA_NOTICE_VERSION : null;
 return input.consent === true ? 'assessment-v1' : null;
}
export const levelName = level => level === 'foundation' ? 'Foundation' : `Class ${level}`;
export function validateProfile({name, phone, grade, subject}) {
 const errors = {};
 if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 60) errors.name = 'Enter a name between 2 and 60 characters.';
 if (typeof phone !== 'string' || !/^\d{10}$/.test(phone.trim())) errors.phone = 'Enter a 10-digit phone number using numbers only.';
 if (!Number.isInteger(Number(grade)) || Number(grade) < 5 || Number(grade) > 10) errors.grade = 'Choose a class from 5 to 10.';
 if (!SUBJECTS.includes(subject)) errors.subject = 'Choose one challenge subject.';
 return errors;
}
export function validateBank(questions) {
 if (!Array.isArray(questions)) throw new Error('Question bank must be an array.');
 const ids = new Set(), prompts = new Set(), counts = new Map();
 for (const q of questions) {
  const text=(value,max)=>typeof value==='string'&&value.trim().length>0&&value.length<=max;
  if (!q || !text(q.id,100) || ids.has(q.id) || !SUBJECTS.includes(q.subject) || !LEVELS.includes(q.level) || !text(q.prompt,1000) || !text(q.topic,100) || !text(q.explanation,1200) || !Array.isArray(q.options) || q.options.length !== 4 || q.options.some(o=>!text(o,300)) || new Set(q.options.map(o=>o.trim().toLowerCase())).size !== 4 || !Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) throw new Error(`Invalid question: ${q?.id || 'unknown'}`);
  const key = `${q.subject}:${q.level}`;
  const promptKey = `${q.subject}:${q.prompt.trim().toLowerCase()}`;
  if (prompts.has(promptKey)) throw new Error(`Repeated question: ${q.id}`);
  ids.add(q.id); prompts.add(promptKey); counts.set(key, (counts.get(key) || 0) + 1);
 }
 // Four wrong answers followed by five correct answers can require nine prompts.
 for (const subject of SUBJECTS) for (const level of LEVELS) if ((counts.get(`${subject}:${level}`)||0)<9) throw new Error(`Too few questions for ${subject} / ${level}.`);
 return true;
}
export function shuffled(items, random = Math.random) {
 const result = [...items];
 for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i+1)); [result[i], result[j]] = [result[j], result[i]]; }
 return result;
}
export class DiagnosticRun {
 constructor(profile, questions, random = Math.random) {
  if (Object.keys(validateProfile(profile)).length) throw new Error('Invalid student details.');
  this.profile = {name:profile.name.trim(),phone:profile.phone.trim(),grade:Number(profile.grade),subject:profile.subject};
  this.levels = LEVELS.slice(0, Number(profile.grade)-3);
  this.queues = Object.fromEntries(this.levels.map(level => [level, shuffled(questions.filter(q=>q.subject===profile.subject&&q.level===level), random)]));
  if (Object.values(this.queues).some(q=>q.length<9)) throw new Error('This challenge is missing questions.');
  this.levelIndex = 0; this.lives = STARTING_LIVES; this.correct = 0; this.streak = 0; this.bestStreak = 0;
  this.cleared = []; this.history = []; this.status = 'playing'; this.feedback = null;
  this.question = this.queues[this.level].shift();
 }
 get level() { return this.levels[this.levelIndex]; }
 answer(optionIndex) {
  if (this.status !== 'playing' || this.feedback || !Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex > 3) return null;
  const question = this.question, correct = optionIndex === question.answer;
  if (correct) {this.correct++; this.streak++; this.bestStreak = Math.max(this.streak, this.bestStreak);} else {this.lives--; this.streak = 0;}
  this.history.push({id:question.id,level:this.level,topic:question.topic,correct,prompt:question.prompt,options:[...question.options],selected:optionIndex,answer:question.options[question.answer],explanation:question.explanation});
  let kind = correct ? 'correct' : 'incorrect';
  if (this.lives === 0) { this.status = 'finished'; kind = 'finished'; }
  else if (this.correct === REQUIRED_CORRECT) {
   this.cleared.push(this.level);
   if (this.levelIndex === this.levels.length - 1) {this.status = 'finished'; kind = 'proficient';}
   else kind = 'level-cleared';
  }
  this.feedback = {correct,kind,explanation:question.explanation,answer:question.options[question.answer]};
  return this.feedback;
 }
 next() {
  if (!this.feedback || this.status !== 'playing') return false;
  if (this.feedback.kind === 'level-cleared') { this.levelIndex++; this.correct = 0; this.streak = 0; }
  this.feedback = null; this.question = this.queues[this.level].shift();
  if (!this.question) throw new Error('Question bank exhausted before this level was completed.');
  return true;
 }
 result() {
  if (this.status !== 'finished') return null;
  const proficient = this.cleared.length === this.levels.length;
  const lastCleared = this.cleared.at(-1) ?? null;
  const label = proficient ? 'At Grade Level (Proficient)' : lastCleared === null ? 'Pre-Foundation Intervention Needed' : `${levelName(lastCleared)} Level`;
  return {proficient,lastCleared,label,failedLevel:proficient?null:this.level,answered:this.history.length,correct:this.history.filter(q=>q.correct).length,lives:this.lives,bestStreak:this.bestStreak,topicsToPractise:[...new Set(this.history.filter(q=>!q.correct).map(q=>q.topic))]};
 }
}
