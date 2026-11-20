import {SUBJECTS,LEVELS,levelName} from './engine.js';
export const subjectName=subject=>subject[0].toUpperCase()+subject.slice(1);
export const competencyName=level=>level===null?'Pre-Foundation':levelName(level);
export function learningInsight(result,grade,subject){
 const current=result.lastCleared,expected=String(grade),gap=Math.max(0,LEVELS.indexOf(expected)-(current===null?-1:LEVELS.indexOf(current)));
 const name=subjectName(subject);
 if(gap===0)return {gap,tone:'on-track',title:'You’re right on track',message:`You’ve cleared ${name} through Class ${grade}. Be proud of the understanding you’ve shown—and keep that curiosity going.`};
 if(gap===1)return {gap,tone:'close',title:'You’re close. Keep going',message:`You’re just one step from Class ${grade}. A little focused practice can help you build on what you already know.`};
 return {gap,tone:'growing',title:'You can build from here',message:`Small steps and the right support can make a real difference. Let’s strengthen your foundations and work towards Class ${grade}, together.`};
}
export function subjectOverview(profile,rows,browserHash){
 return {profile:{name:profile.name,phone:profile.phone,grade:profile.grade},subjects:SUBJECTS.map(subject=>{
  const row=rows.find(r=>r.subject===subject);
  if(!row)return {subject,status:'available',expectedLevel:String(profile.grade)};
  if(!browserHash||row.browser_hash!==browserHash)return {subject,status:'unavailable',expectedLevel:String(profile.grade)};
  const result=typeof row.result==='string'?JSON.parse(row.result):row.result;
  return {subject,status:row.status==='finished'?'completed':'in_progress',runId:row.id,currentLevel:result?.lastCleared??null,expectedLevel:String(row.grade),completedAt:row.status==='finished'?row.updated_at:null};
 })};
}
