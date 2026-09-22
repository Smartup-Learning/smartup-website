import {levelName,validateProfile,DATA_NOTICE_VERSION} from './engine.js?v=quest-refined-20260922c';
import {subjectName,competencyName,learningInsight} from './snapshot.js?v=snapshot-20260922c';
const $=id=>document.getElementById(id);
const titleCase=value=>value.charAt(0).toUpperCase()+value.slice(1);
const reduced=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
let profileContext=null;
let run=null,access=null,selected=null,busy=false,companion=null,sound=false,audioContext=null,motionPaused=false,stopScroll=null;
const sessionKey='smartup-quest-run';
function remember(){try{if(access)sessionStorage.setItem(sessionKey,JSON.stringify(access));else sessionStorage.removeItem(sessionKey);}catch{}}
async function request(path,method='GET',data){
 // Saved progress must be fresh even in previews or proxies that reuse GET responses.
 const url=method==='GET'?`${path}${path.includes('?')?'&':'?'}fresh=${crypto.randomUUID()}`:path;
 const response=await fetch(url,{method,cache:'no-store',headers:{'Content-Type':'application/json','X-Smartup-Request':'1',...(access?.token?{Authorization:`Bearer ${access.token}`}:{})},...(data?{body:JSON.stringify(data)}:{})});
 let result;try{result=await response.json();}catch{throw new Error('The challenge service is unavailable. Please try again.');}
 if(!response.ok){const error=new Error(result.error||'Please try again.');error.fields=result.fields;error.state=result.state;error.status=response.status;throw error;}return result;
}
function element(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}
function setBusy(value){busy=value;for(const id of ['restart-button','continue-button','next-level-button','rules-start'])$(id).disabled=value;}
function showError(message){$('action-error').textContent=message;$('action-error').hidden=!message;}
function setMood(mood){$('owl-companion').dataset.mood=mood;companion?.setMood(mood);}
function moveOwl(dockId,travel=false){
 const owl=$('owl-companion'),dock=dockId?$(dockId):null;owl.hidden=!dock;
 companion?.setPaused(motionPaused||!dock);
 if(!dock)return;
 if(owl.parentElement!==dock)dock.append(owl);
 if(travel&&!reduced()&&!motionPaused)owl.animate([{transform:'translateY(18px) scale(.94)',opacity:.5},{transform:'translateY(0) scale(1)',opacity:1}],{duration:520,easing:'cubic-bezier(.22,1,.36,1)'});
}
function setView(view){
 for(const name of ['welcome','setup','rules','play','result','profile'])$(`${name}-view`).hidden=name!==view;
 document.body.dataset.state=view==='play'?'playing':view;$('play-hud').hidden=view!=='play';
 moveOwl(({welcome:'welcome-dock',setup:'setup-dock',result:'result-dock'})[view]||null);
}
function smoothScrollTo(target){
 stopScroll?.();
 const start=window.scrollY,end=Math.max(0,Math.min(target,document.documentElement.scrollHeight-innerHeight));
 if(reduced()||motionPaused||Math.abs(end-start)<3){window.scrollTo({top:end,behavior:'instant'});return Promise.resolve();}
 return new Promise(resolve=>{
  const began=performance.now(),duration=Math.min(780,Math.max(480,Math.abs(end-start)*.45));let frame;
  const finish=()=>{cancelAnimationFrame(frame);for(const event of ['wheel','touchstart','pointerdown','keydown'])window.removeEventListener(event,finish);stopScroll=null;resolve();};
  stopScroll=finish;for(const event of ['wheel','touchstart','pointerdown','keydown'])window.addEventListener(event,finish,{once:true,passive:true});
  const tick=now=>{const t=Math.min(1,(now-began)/duration),ease=1-Math.pow(1-t,4);window.scrollTo({top:start+(end-start)*ease,behavior:'instant'});if(t<1)frame=requestAnimationFrame(tick);else finish();};
  frame=requestAnimationFrame(tick);
 });
}
async function scrollToQuestion(){
 await new Promise(requestAnimationFrame);
 const cleared=run?.feedback?.kind==='level-cleared';
 const target=$(cleared?'answer-feedback':'active-question').getBoundingClientRect().top+scrollY-$('play-hud').offsetHeight-20;
 $(cleared?'feedback-title':'question-title').focus({preventScroll:true});
 if(!run.feedback&&!reduced()&&!motionPaused)$('active-question').animate([{opacity:.35,transform:'translateY(24px)'},{opacity:1,transform:'translateY(0)'}],{duration:560,easing:'cubic-bezier(.22,1,.36,1)'});
 await smoothScrollTo(target);
}
function sceneState(previous){if(!run)return;const levels=run.levels,index=run.levelIndex;
 $('journey-nodes').replaceChildren();
 levels.forEach((level,i)=>{const item=element('li'),button=element('button','',levelName(level));button.type='button';button.dataset.marker=run.cleared.includes(level)?'✓':i===0?'F':level;
 const ready=run.feedback?.kind==='level-cleared'&&i===index+1;if(run.cleared.includes(level))button.className='cleared';else if(i>index&&!ready)button.className='locked';if(i===index)button.setAttribute('aria-current','step');button.setAttribute('aria-label',`${levelName(level)}: ${run.cleared.includes(level)?'cleared':i===index?'current level':ready?'unlocked':'locked'}`);button.addEventListener('click',()=>inspectNode(i));item.append(button);$('journey-nodes').append(item);});
 $('hearts').replaceChildren();for(let i=0;i<5;i++){const heart=element('span',`heart${i>=run.lives?' heart-spent':''}${previous&&i>=run.lives&&i<previous.lives?' just-lost':''}`,'♥');$('hearts').append(heart);}
 const lost=Boolean(previous&&run.lives<previous.lives);$('life-change').hidden=!lost;if(lost){$('life-change').classList.remove('life-change-show');void $('life-change').offsetWidth;$('life-change').classList.add('life-change-show');}
 document.querySelector('.lives').setAttribute('aria-label',`${run.lives} of 5 lives remaining`);$('hud-level').textContent=levelName(run.level);$('hud-streak').textContent=`${run.streak} in a row`;$('hud-subject').textContent=`${titleCase(run.profile.subject)} · Current level`;$('hud-stage-number').textContent=`${run.levelIndex+1} / ${run.levels.length}`;$('progress-count').textContent=`${run.correct} / 5 correct`;$('level-progress').value=run.correct;
 $('journey-subject').textContent=`${run.profile.name} · ${titleCase(run.profile.subject)} · Class ${run.profile.grade}`;
 for(const [selector,animate] of [['.hud-progress',previous&&run.correct>previous.correct],['.hud-stage',previous&&run.level!==previous.level]]){const el=document.querySelector(selector);el.classList.remove('earned','unlocked');if(animate){void el.offsetWidth;el.classList.add(selector==='.hud-progress'?'earned':'unlocked');}}
 if(previous)$('hud-announcement').textContent=run.level!==previous.level?`${levelName(run.level)} unlocked. ${run.lives} lives remaining.`:`${run.lives} lives remaining. ${run.correct} of 5 correct in ${levelName(run.level)}.`;
 inspectNode(index);
}
function inspectNode(index){const level=run?.levels[index];if(!level)return;$('node-inspect').textContent=run.cleared.includes(level)?`${levelName(level)} cleared · Five discoveries made`:index===run.levelIndex?`${levelName(level)} · Five correct answers unlock the next step`:run.feedback?.kind==='level-cleared'&&index===run.levelIndex+1?`${levelName(level)} unlocked · Continue below to enter`:`${levelName(level)} unlocks after ${levelName(run.levels[index-1])}`;}
function soundCue(kind){if(!sound)return;try{audioContext??=new AudioContext();audioContext.resume();const time=audioContext.currentTime;const notes=kind==='incorrect'||kind==='finished'?[330,294]:kind==='level-cleared'||kind==='proficient'?[523,659,784]:[523,659];notes.forEach((note,i)=>{const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();oscillator.type='sine';oscillator.frequency.value=note;gain.gain.setValueAtTime(0,time+i*.1);gain.gain.linearRampToValueAtTime(.06,time+i*.1+.02);gain.gain.exponentialRampToValueAtTime(.001,time+i*.1+.25);oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start(time+i*.1);oscillator.stop(time+i*.1+.27);});}catch{}}
function gate(level,first=false){const el=element('div','level-gate'),copy=element('div','',first?'Foundation · Your starting point':`${levelName(level)} unlocked`);copy.append(element('small','',first?'Every adventure begins with the basics':'A new level. The same five-heart journey.'));el.append(copy);return el;}
function renderHistory(){
 const history=(run.history||[]).filter(q=>q.id!==run.question.id),host=$('question-history');
 const existing=new Map([...host.children].map(el=>[el.dataset.questionId,el]));let lastLevel=null;
 history.forEach((q,i)=>{
  let entry=existing.get(q.id);
  if(!entry){
   entry=element('div','history-entry');entry.dataset.questionId=q.id;
   if(q.level!==lastLevel)entry.append(gate(q.level,i===0));
   const card=element('article','history-card');card.dataset.correct=String(q.correct);
   const meta=element('div','history-meta');meta.append(element('span','',`QUESTION ${String(i+1).padStart(2,'0')} · ${levelName(q.level)}`),element('span','',q.correct?'✓ Correct':'↗ Keep learning'));
   card.append(meta,element('h2','',q.prompt||q.topic));
   if(q.options&&q.selected!==undefined)card.append(element('p','history-result',`${q.correct?'✓':'Your answer:'} ${q.options[q.selected]}`));
   if(q.explanation){const details=element('details'),summary=element('summary','','Revisit the explanation');details.append(summary,element('p','',`${q.correct?'':`Correct answer: ${q.answer}. `}${q.explanation}`));card.append(details);}
   entry.append(card);
  }
  if(host.children[i]!==entry)host.append(entry);existing.delete(q.id);lastLevel=q.level;
 });
 for(const entry of existing.values())entry.remove();
 $('active-gate').hidden=lastLevel===run.level;const g=gate(run.level,history.length===0);$('active-gate').replaceChildren(...g.childNodes);
 $('question-number').textContent=String(history.length+1).padStart(2,'0');
}
function renderQuestion({focus=true,previous=null}={}){setView('play');selected=null;renderHistory();$('question-topic').textContent=run.question.topic;$('question-title').textContent=run.question.prompt;$('answer-options').replaceChildren();
 const saved=(run.history||[]).find(q=>q.id===run.question.id);
 run.question.options.forEach((option,i)=>{const label=element('label','answer-choice'),input=element('input');input.type='radio';input.name='answer';input.value=i;input.disabled=Boolean(run.feedback);input.checked=saved?.selected===i;const span=element('span'),letter=element('b','',String.fromCharCode(65+i));letter.setAttribute('aria-hidden','true');span.append(letter,document.createTextNode(option));label.append(input,span);input.addEventListener('change',()=>{selected=i;$('check-button').disabled=false;});if(run.feedback&&option===run.feedback.answer){label.classList.add('correct');span.append(element('small','','Correct'));}else if(saved?.selected===i&&!saved.correct){label.classList.add('incorrect');span.append(element('small','','Your answer'));}$('answer-options').append(label);});
 $('check-button').disabled=true;$('check-button').hidden=Boolean(run.feedback);$('continue-button').hidden=!run.feedback||run.feedback.kind==='level-cleared';$('level-transition').hidden=run.feedback?.kind!=='level-cleared';$('answer-feedback').hidden=!run.feedback;$('active-question').dataset.response=run.feedback?(run.feedback.correct?'correct':'incorrect'):'';
 if(run.feedback)renderFeedback();else setMood('neutral');
 sceneState(previous);if(focus)scrollToQuestion();
}
function renderFeedback(){const f=run.feedback;$('answer-feedback').dataset.correct=String(f.correct);$('feedback-title').textContent=f.kind==='level-cleared'?`${levelName(run.level)} cleared!`:f.kind==='proficient'?'You reached your class level!':f.kind==='finished'?'Your learning snapshot is ready':f.correct?'That’s right!':'A little learning moment';
 $('feedback-copy').textContent=f.explanation;$('continue-button').textContent=run.status==='finished'?'See my result →':f.kind==='level-cleared'?`Unlock ${levelName(run.levels[run.levelIndex+1])} →`:'Next question →';
 $('feedback-life').hidden=f.correct;$('feedback-life').textContent=`−1 life · ${run.lives} ${run.lives===1?'life':'lives'} left`;
 moveOwl('feedback-dock',true);setMood(f.correct?(f.kind==='level-cleared'||f.kind==='proficient'?'celebrate':'happy'):'sad');
 if(f.kind==='level-cleared'){
  const next=run.levels[run.levelIndex+1];$('transition-from').textContent=levelName(run.level);$('transition-to').textContent=levelName(next);$('transition-number').textContent=next;
  $('transition-lives').textContent=`${run.lives} ${run.lives===1?'life travels':'lives travel'} with you`;
  $('next-level-button').textContent=`Enter ${levelName(next)} →`;
 }
}

function renderSubjectRows(hostId){
 const host=$(hostId);host.replaceChildren();
 if(!profileContext)return;
 for(const entry of profileContext.subjects){
  const row=element('article','subject-result-row'),identity=element('div','subject-identity'),icon=element('img');icon.src=`/assessment/icons/${entry.subject}.svg`;icon.alt='';icon.width=46;icon.height=46;
  const title=element('h3','',subjectName(entry.subject));identity.append(icon,title);row.append(identity);
  const comparison=element('dl','subject-levels'),current=element('div'),expected=element('div');
  current.append(element('dt','','Current level'),element('dd','',entry.status==='completed'?competencyName(entry.currentLevel):entry.status==='in_progress'?'In progress':entry.status==='unavailable'?'Saved elsewhere':'Not taken yet'));
  expected.append(element('dt','','Expected level'),element('dd','',levelName(entry.expectedLevel)));comparison.append(current,expected);row.append(comparison);
  if(entry.status==='unavailable'){const link=element('a','subject-action','Contact our team ↗');link.href='tel:+918891910919';row.append(link);}
  else{const button=element('button','subject-action',entry.status==='completed'?'View snapshot ↗':entry.status==='in_progress'?'Continue quiz →':`Try ${subjectName(entry.subject)} →`);button.type='button';button.addEventListener('click',()=>openSubject(entry));row.append(button);}
  host.append(row);
 }
}
async function refreshOverview(){
 $('retry-overview').hidden=true;$('snapshot-save-status').textContent='Loading your saved subjects…';
 try{profileContext=await request('/api/assessment/profile/claim','POST',{runId:access.id});renderSubjectRows('snapshot-subjects');$('snapshot-save-status').textContent=`Saved to your number ending ${profileContext.profile.phone.slice(-4)} · Available in this browser`;}
 catch(error){$('snapshot-save-status').textContent='This result is saved. Your other subjects could not be loaded.';$('retry-overview').hidden=false;}
}
function renderResult(){
 setView('result');const result=run.result,insight=learningInsight(result,run.profile.grade,run.profile.subject);
 $('result-heading').textContent=`Assessed competency in ${subjectName(run.profile.subject)}`;$('result-person').textContent=`${run.profile.name} · Selected Class ${run.profile.grade}`;
 $('snapshot-icon').src=`/assessment/icons/${run.profile.subject}.svg`;$('snapshot-current').textContent=competencyName(result.lastCleared);document.querySelector('.level-comparison').classList.toggle('foundation-result',result.lastCleared===null||result.lastCleared==='foundation');$('snapshot-expected').textContent=levelName(String(run.profile.grade));
 $('snapshot-message-title').textContent=insight.title;$('snapshot-message').textContent=insight.message;$('result-view').dataset.tone=insight.tone;
 $('snapshot-correct').textContent=`${result.correct} / ${result.answered}`;$('snapshot-cleared').textContent=`${run.cleared.length} / ${run.levels.length}`;$('snapshot-streak').textContent=`${result.bestStreak} in a row`;
 $('quiz-breakdown').replaceChildren();for(const level of run.levels){const answers=(run.history||[]).filter(q=>q.level===level);if(!answers.length)continue;const row=element('div','quiz-level-row');row.append(element('span','',levelName(level)),element('span','',`${answers.filter(q=>q.correct).length} / ${answers.length} correct`),element('span','level-status',run.cleared.includes(level)?'✓ Cleared':'Keep practising'));$('quiz-breakdown').append(row);}
 $('snapshot-practice').hidden=!result.topicsToPractise.length;$('snapshot-topics').textContent=result.topicsToPractise.slice(0,3).join(' · ');
 $('snapshot-subjects').replaceChildren();setMood(result.proficient?'celebrate':'happy');window.scrollTo({top:0,behavior:reduced()?'instant':'smooth'});$('result-heading').focus({preventScroll:true});refreshOverview();
}
function showProfile(){
 if(!profileContext){showSetup();return;}
 setView('profile');showError('');$('profile-person').textContent=`${profileContext.profile.name} · Class ${profileContext.profile.grade} · Number ending ${profileContext.profile.phone.slice(-4)}`;renderSubjectRows('profile-subjects');window.scrollTo({top:0,behavior:'instant'});$('profile-heading').focus({preventScroll:true});
}
async function openSubject(entry){
 if(busy)return;setBusy(true);showError('');
 try{
  let next;if(entry.runId){next=await request(`/api/assessment/runs/${entry.runId}`);next={...next,id:entry.runId,token:null,resumed:true};}
  else next=await request('/api/assessment/runs','POST',{...profileContext.profile,subject:entry.subject,dataNoticeVersion:DATA_NOTICE_VERSION});
  acceptRun(next);
 }catch(error){showError(error.message);}finally{setBusy(false);}
}
function acceptRun(created){access={id:created.id,token:created.token,rulesSeen:Boolean(created.resumed)};remember();run=created;$('question-history').replaceChildren();if(run.status==='finished')renderResult();else if(created.resumed)renderQuestion();else showRules();}
$('retry-overview').addEventListener('click',refreshOverview);
$('different-profile').addEventListener('click',()=>{access=null;run=null;remember();$('setup-form').reset();showSetup();});
function showSetup(){setView('setup');setMood('neutral');showError('');window.scrollTo({top:0,behavior:'instant'});$('setup-title').focus({preventScroll:true});}
async function clearRun(){
 if(busy)return;setBusy(true);stopScroll?.();$('restart-confirm').close();
 try{profileContext=await request('/api/assessment/profile/claim','POST',{runId:access.id});showProfile();}catch(error){showError(error.message);}finally{setBusy(false);}
}
async function init(){try{await request('/api/assessment/config');$('start-button').disabled=false;$('start-button').textContent='Begin my journey ↗';$('load-status').textContent='';$('retry-load').hidden=true;try{profileContext=await request('/api/assessment/profile');$('welcome-start').textContent='Choose a subject →';}catch(error){if(error.status!==404)throw error;}try{access=JSON.parse(sessionStorage.getItem(sessionKey)||'null');}catch{access=null;}if(access){try{run=await request(`/api/assessment/runs/${access.id}`);$('resume-button').hidden=false;$('resume-button').textContent=run.status==='finished'?'View my saved result →':'Continue my journey →';$('welcome-start').textContent='Choose a subject →';}catch(error){if(error.status===404){access=null;remember();}else throw error;}}}catch(error){$('load-status').textContent=error.message;$('retry-load').hidden=false;$('start-button').disabled=true;$('start-button').textContent='Challenge unavailable';}}
$('welcome-start').addEventListener('click',()=>profileContext?showProfile():showSetup());$('back-welcome').addEventListener('click',()=>{setView('welcome');setMood('neutral');window.scrollTo({top:0,behavior:'instant'});$('welcome-start').focus({preventScroll:true});});$('resume-button').addEventListener('click',()=>run.status==='finished'?renderResult():access.rulesSeen===false?showRules():renderQuestion());
function showRules(){
 setView('rules');$('rules-intro').textContent=`${titleCase(run.profile.subject)} · Foundation to Class ${run.profile.grade}`;
 window.scrollTo({top:0,behavior:'instant'});$('rules-title').focus({preventScroll:true});
}
$('rules-start').addEventListener('click',()=>{if(busy)return;access.rulesSeen=true;remember();renderQuestion();});
$('setup-form').addEventListener('submit',async event=>{
 event.preventDefault();if(busy)return;
 const data={...Object.fromEntries(new FormData(event.currentTarget)),dataNoticeVersion:DATA_NOTICE_VERSION},errors=validateProfile(data);
 for(const field of ['name','phone','grade','subject']){const el=$(`student-${field}`);$(`${field}-error`).textContent=errors[field]||'';el?.setAttribute('aria-invalid',String(Boolean(errors[field])));}
 if(Object.keys(errors).length){$(`student-${Object.keys(errors)[0]}`)?.focus();return;}
 setBusy(true);$('start-button').disabled=true;$('start-button').textContent='Starting…';showError('');
 try{const created=await request('/api/assessment/runs','POST',data);acceptRun(created);}
 catch(error){showError(error.message);}
 finally{setBusy(false);$('start-button').disabled=false;$('start-button').textContent='Begin my journey ↗';}
});
$('check-button').addEventListener('click',async()=>{if(busy||selected===null||run.feedback)return;setBusy(true);$('check-button').disabled=true;showError('');const chosen=selected,previous=run;try{run=await request(`/api/assessment/runs/${access.id}/answer`,'POST',{questionId:run.question.id,answer:chosen});renderQuestion({focus:false,previous});soundCue(run.feedback.kind);$('feedback-title').focus({preventScroll:true});if(run.feedback.kind==='level-cleared'||matchMedia('(max-width:800px)').matches){const feedback=$('answer-feedback').getBoundingClientRect();if(run.feedback.kind==='level-cleared'||feedback.bottom>innerHeight-30)await smoothScrollTo(feedback.top+scrollY-$('play-hud').offsetHeight-24);}}catch(error){if(error.state){run=error.state;renderQuestion({focus:false});}showError(error.message);$('check-button').disabled=false;}finally{setBusy(false);}});
async function advanceQuestion(){
 if(busy)return;if(run.status==='finished'){renderResult();return;}
 setBusy(true);showError('');const previous=run;
 try{run=await request(`/api/assessment/runs/${access.id}/next`,'POST',{questionId:run.question.id});renderQuestion({previous,focus:false});await scrollToQuestion();if(run.level!==previous.level)soundCue('level-cleared');}
 catch(error){if(error.state){run=error.state;renderQuestion({focus:false});}showError(error.message);}
 finally{setBusy(false);}
}
$('continue-button').addEventListener('click',advanceQuestion);$('next-level-button').addEventListener('click',advanceQuestion);
$('retry-load').addEventListener('click',init);
$('sound-toggle').addEventListener('click',()=>{sound=!sound;$('sound-toggle').textContent=sound?'Sound on':'Sound off';$('sound-toggle').setAttribute('aria-pressed',String(sound));if(sound)soundCue('correct');});
$('motion-toggle').addEventListener('click',()=>{motionPaused=!motionPaused;document.body.dataset.motion=motionPaused?'paused':'playing';companion?.setPaused(motionPaused||$('owl-companion').hidden);if(motionPaused)stopScroll?.();$('motion-toggle').textContent=motionPaused?'Resume motion':'Pause motion';$('motion-toggle').setAttribute('aria-pressed',String(motionPaused));$('motion-toggle').setAttribute('aria-label',motionPaused?'Resume scene animation':'Pause scene animation');});
$('restart-button').addEventListener('click',()=>{if(busy)return;$('restart-confirm').showModal();$('keep-playing').focus();});$('keep-playing').addEventListener('click',()=>{$('restart-confirm').close();$('restart-button').focus();});$('confirm-restart').addEventListener('click',clearRun);
setView('welcome');init();
import('./companion.js?v=quest-flow-1').then(async module=>{companion=await module.createCompanion($('companion-canvas'));$('owl-companion').classList.add('has-companion');companion.setPaused(motionPaused||$('owl-companion').hidden);companion.setMood($('owl-companion').dataset.mood);}).catch(()=>{$('companion-canvas').replaceChildren();$('motion-toggle').hidden=true;});
