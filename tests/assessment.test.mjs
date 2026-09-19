import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {setImmediate as nextTurn} from 'node:timers/promises';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {DiagnosticRun,validateProfile,validateBank,SUBJECTS,LEVELS} from '../dist/assessment/engine.js';
import {AssessmentStore} from '../server/assessment.mjs';
import {createSiteServer} from '../server.mjs';

const ADMIN_PASSWORD='synthetic-admin-password-for-tests';
const profile=(overrides={})=>({name:'Test Student',phone:'9000000001',grade:7,subject:'mathematics',...overrides});
function fixtureBank(count=10){
 return SUBJECTS.flatMap(subject=>LEVELS.flatMap(level=>Array.from({length:count},(_,i)=>({
  id:`test-${subject}-${level}-${i}`,subject,level,topic:`${subject} ${level} topic ${i%3}`,
  prompt:`Synthetic ${subject} ${level} question ${i}?`,options:['Option zero','Option one','Option two','Option three'],answer:i%4,
  explanation:`Synthetic explanation for ${subject} ${level} ${i}.`
 }))));
}
const bank=fixtureBank();
const answers=new Map(bank.map(q=>[q.id,q.answer]));
const makeRun=overrides=>new DiagnosticRun(profile(overrides),bank,()=>0.42);
const answerRun=(run,correct)=>run.answer(correct?run.question.answer:(run.question.answer+1)%4);
function finishBucket(run,correct=true){
 const level=run.level;
 do {answerRun(run,correct);if(run.status==='finished'||run.feedback.kind==='level-cleared')break;run.next();}while(run.level===level);
}
async function fixture(t,options={}){
 const store=new AssessmentStore(':memory:');store.replaceBank(fixtureBank());
 const server=createSiteServer({store,adminPassword:ADMIN_PASSWORD,secureCookies:false,...options});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));store.close();});
 const base=`http://127.0.0.1:${server.address().port}`;
 async function call(route,method='GET',data,{token,cookie,headers={}}={}){
  const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json','X-Smartup-Request':'1',...(token?{Authorization:`Bearer ${token}`} : {}),...(cookie?{Cookie:cookie}:{}),...headers},...(data!==undefined?{body:JSON.stringify(data)}:{})});
  return {status:response.status,data:await response.json(),headers:response.headers};
 }
 async function start(overrides={}){const response=await call('/api/assessment/runs','POST',{...profile(),consent:true,...overrides});assert.equal(response.status,201,JSON.stringify(response.data));return response.data;}
 async function login(){const result=await call('/api/admin/login','POST',{password:ADMIN_PASSWORD});assert.equal(result.status,200);return result.headers.get('set-cookie').split(';')[0];}
 async function action(run,operation,payload={}){return call(`/api/assessment/runs/${run.id}/${operation}`,'POST',{questionId:run.question.id,...payload},{token:run.token});}
 return {store,server,base,call,start,login,action};
}
async function partialRequest(f,route,payload,split,{token,cookie}={}){
 const bytes=Buffer.isBuffer(payload)?payload:Buffer.from(JSON.stringify(payload));
 const marker=`partial-${Math.random()}`;
 let seenResolve;const seen=new Promise(resolve=>{seenResolve=resolve;});
 const listener=req=>{if(req.headers['x-test-marker']===marker){f.server.off('request',listener);req.once('data',()=>seenResolve());}};
 f.server.on('request',listener);
 let request;
 const response=new Promise((resolve,reject)=>{
  request=http.request(f.base+route,{method:'POST',agent:false,headers:{'Content-Type':'application/json','Content-Length':bytes.length,'X-Smartup-Request':'1','X-Test-Marker':marker,...(token?{Authorization:`Bearer ${token}`} : {}),...(cookie?{Cookie:cookie}:{})}},res=>{
   const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>{try{resolve({status:res.statusCode,data:JSON.parse(Buffer.concat(chunks).toString('utf8'))});}catch(e){reject(e);}});
  });
  request.on('error',reject);request.write(bytes.subarray(0,split));
 });
 await seen;await nextTurn();
 return {response,finish:()=>request.end(bytes.subarray(split)),request};
}

// Engine rules are tested independently of transport, storage and real curriculum material.
test('engine validates profile fields and the 28 minimum-size buckets',()=>{
 assert.deepEqual(validateProfile(profile()),{});assert.equal(validateBank(fixtureBank(9)),true);
 for(const invalid of [{name:'A'},{phone:'123'},{phone:'90000abcde'},{grade:4},{grade:11},{grade:7.5},{subject:'history'}])assert.ok(Object.keys(validateProfile(profile(invalid))).length);
 assert.throws(()=>validateBank(fixtureBank(8)),/Too few/);
 for(const mutate of [q=>{q[1].id=q[0].id;},q=>{q[1].prompt=q[0].prompt;},q=>{q[0].options[1]=q[0].options[0];},q=>{q[0].answer=4;},q=>{q[0].level='11';}]){const draft=fixtureBank();mutate(draft);assert.throws(()=>validateBank(draft));}
});

test('engine requires five cumulative correct answers, not a five-answer streak',()=>{
 const run=makeRun();const sequence=[true,false,true,false,true,true,true];
 for(let i=0;i<sequence.length;i++){
  answerRun(run,sequence[i]);
  assert.equal(run.correct,sequence.slice(0,i+1).filter(Boolean).length);
  if(i<sequence.length-1){assert.equal(run.feedback.kind,sequence[i]?'correct':'incorrect');run.next();}
 }
 assert.equal(run.feedback.kind,'level-cleared');assert.equal(run.streak,3);assert.equal(run.lives,3);assert.deepEqual(run.cleared,['foundation']);
 assert.equal(run.next(),true);assert.equal(run.level,'5');assert.equal(run.correct,0);assert.equal(run.lives,3);assert.equal(run.streak,0);
});

test('engine lives carry forward and never reset when a bucket is cleared',()=>{
 const run=makeRun();answerRun(run,false);run.next();finishBucket(run);assert.equal(run.lives,4);run.next();
 answerRun(run,false);assert.equal(run.lives,3);run.next();finishBucket(run);run.next();
 assert.equal(run.level,'6');assert.equal(run.lives,3);assert.equal(run.correct,0);
});

test('engine starts at Foundation and respects every enrolled-grade ceiling for every subject',async t=>{
 for(const subject of SUBJECTS)for(let grade=5;grade<=10;grade++)await t.test(`${subject}, enrolled Class ${grade}`,()=>{
  const run=makeRun({subject,grade});assert.equal(run.level,'foundation');
  let safety=0;while(run.status==='playing'){assert.ok(++safety<=35);assert.equal(run.question.subject,subject);assert.equal(run.question.level,run.level);answerRun(run,true);if(run.status==='playing')run.next();}
  assert.deepEqual(run.levels,LEVELS.slice(0,grade-3));assert.deepEqual(run.cleared,run.levels);assert.equal(run.level,String(grade));assert.equal(run.lives,5);
  const result=run.result();assert.equal(result.label,'At Grade Level (Proficient)');assert.equal(result.proficient,true);assert.equal(result.failedLevel,null);assert.equal(result.answered,(grade-3)*5);
 });
});

for(const [failedLevel,lastCleared,label] of [['foundation',null,'Pre-Foundation Intervention Needed'],['5','foundation','Foundation Level'],['7','6','Class 6 Level']])test(`engine failure at ${failedLevel} reports the last cleared bucket`,()=>{
 const run=makeRun({grade:8});while(run.level!==failedLevel){finishBucket(run);run.next();}
 finishBucket(run,false);assert.equal(run.status,'finished');assert.equal(run.lives,0);
 const result=run.result();assert.equal(result.lastCleared,lastCleared);assert.equal(result.label,label);assert.equal(result.failedLevel,failedLevel);assert.equal(result.proficient,false);
 assert.ok(result.topicsToPractise.length>0);assert.equal(new Set(result.topicsToPractise).size,result.topicsToPractise.length);
 const frozen=JSON.stringify(run);assert.equal(run.next(),false);assert.equal(answerRun(run,true),null);assert.equal(JSON.stringify(run),frozen);
});

test('engine never repeats a question, including the nine-question worst-case bucket',()=>{
 const run=new DiagnosticRun(profile({grade:10}),fixtureBank(9),()=>0.63),seen=new Set();let foundationQuestions=0;
 while(run.status==='playing'){
  assert.ok(!seen.has(run.question.id));seen.add(run.question.id);
  const correct=run.level!=='foundation'||foundationQuestions++>=4;answerRun(run,correct);if(run.status==='playing')run.next();
 }
 assert.equal(foundationQuestions,9);assert.equal(run.lives,1);assert.equal(run.result().proficient,true);assert.equal(run.history.length,39);
});

test('engine ignores invalid answers, duplicates and next before an answer',()=>{
 const run=makeRun();const before=JSON.stringify(run);assert.equal(run.next(),false);
 for(const value of [-1,4,1.5,'1',undefined])assert.equal(run.answer(value),null);assert.equal(JSON.stringify(run),before);
 answerRun(run,false);const answered=JSON.stringify(run);assert.equal(answerRun(run,true),null);assert.equal(JSON.stringify(run),answered);
});

test('API enforces profile validation and explicit consent without saving rejected starts',async t=>{
 const f=await fixture(t);
 for(const consent of [undefined,false,'true']){const r=await f.call('/api/assessment/runs','POST',{...profile(),consent});assert.equal(r.status,400);assert.ok(r.data.fields.consent);}
 const invalid=await f.call('/api/assessment/runs','POST',{...profile({phone:'not-a-phone',grade:11,subject:'history'}),consent:true});assert.equal(invalid.status,400);assert.ok(invalid.data.fields.phone&&invalid.data.fields.grade&&invalid.data.fields.subject);
 assert.equal(f.store.db.prepare('SELECT COUNT(*) n FROM runs').get().n,0);
 const blocked=await f.call('/api/assessment/runs','POST',{...profile(),consent:true},{headers:{'X-Smartup-Request':'0'}});assert.equal(blocked.status,403);
 const foreign=await f.call('/api/assessment/runs','POST',{...profile(),consent:true},{headers:{Origin:'https://unrelated.invalid'}});assert.equal(foreign.status,403);
});

test('API serves only the active question, without answers, queues or student phone',async t=>{
 const f=await fixture(t),run=await f.start();
 assert.deepEqual(Object.keys(run.question).sort(),['id','options','prompt','topic']);assert.equal(run.feedback,null);assert.equal(run.result,null);
 assert.ok(!('queues'in run));assert.ok(!('history'in run));assert.ok(!('phone'in run.profile));assert.ok(!('answer'in run.question));assert.ok(!('explanation'in run.question));
 const read=await f.call(`/api/assessment/runs/${run.id}`,'GET',undefined,{token:run.token});assert.equal(read.status,200);assert.ok(!('token'in read.data));assert.ok(!('queues'in read.data));
 const answered=await f.action(run,'answer',{answer:answers.get(run.question.id)});assert.equal(answered.status,200);assert.equal(answered.data.feedback.correct,true);assert.equal(typeof answered.data.feedback.explanation,'string');
});

test('API run access requires that run’s bearer token',async t=>{
 const f=await fixture(t),a=await f.start(),b=await f.start();
 for(const token of [undefined,'invalid',b.token]){
  assert.equal((await f.call(`/api/assessment/runs/${a.id}`,'GET',undefined,{token})).status,404);
  assert.equal((await f.call(`/api/assessment/runs/${a.id}/answer`,'POST',{questionId:a.question.id,answer:0},{token})).status,404);
 }
 assert.equal(f.store.load(a.id,a.token).run.history.length,0);
});

test('API duplicates are idempotent and stale question IDs cannot change the current question',async t=>{
 const f=await fixture(t),run=await f.start(),wrong=(answers.get(run.question.id)+1)%4;
 const first=await f.action(run,'answer',{answer:wrong});assert.equal(first.status,200);assert.equal(first.data.lives,4);
 const duplicate=await f.action(run,'answer',{answer:answers.get(run.question.id)});assert.equal(duplicate.status,200);assert.equal(duplicate.data.lives,4);assert.equal(duplicate.data.correct,0);assert.equal(duplicate.data.feedback.correct,false);
 const next=await f.action(run,'next');assert.equal(next.status,200);assert.notEqual(next.data.question.id,run.question.id);
 const stale=await f.action(run,'answer',{answer:wrong});assert.equal(stale.status,409);assert.equal(stale.data.state.question.id,next.data.question.id);
 assert.equal(f.store.load(run.id,run.token).run.history.length,1);
});

test('API saves completed results, exposes them only to admin and supports deletion',async t=>{
 const f=await fixture(t);let run=await f.start();const access={id:run.id,token:run.token};
 for(let i=0;i<5;i++){
  const r=await f.action({...run,...access},'answer',{answer:(answers.get(run.question.id)+1)%4});assert.equal(r.status,200);run=r.data;
  if(i<4)run=(await f.action({...run,...access},'next')).data;
 }
 assert.equal(run.status,'finished');assert.equal(run.result.label,'Pre-Foundation Intervention Needed');
 const saved=f.store.load(access.id,access.token);assert.equal(saved.row.status,'finished');assert.deepEqual(JSON.parse(saved.row.result),run.result);assert.equal(saved.row.consent_version,'assessment-v1');
 assert.equal((await f.call('/api/admin/results')).status,401);
 const cookie=await f.login(),list=await f.call('/api/admin/results','GET',undefined,{cookie});assert.equal(list.status,200);const row=list.data.results.find(r=>r.id===access.id);assert.equal(row.phone,'9000000001');assert.deepEqual(row.result,run.result);
 assert.equal((await f.call(`/api/admin/results/${access.id}`,'DELETE',{}, {cookie})).status,200);assert.equal(f.store.load(access.id,access.token),null);
});

test('stored progress and finished results survive closing and reopening SQLite',async t=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'smartup-store-test-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 const file=path.join(directory,'assessment.sqlite');let store=new AssessmentStore(file);store.replaceBank(fixtureBank());const created=store.create(profile());answerRun(created.run,false);store.save(created.id,created.run);store.close();
 store=new AssessmentStore(file);let loaded=store.load(created.id,created.secret);assert.equal(loaded.run.lives,4);assert.equal(loaded.run.feedback.correct,false);loaded.run.next();finishBucket(loaded.run,false);store.save(created.id,loaded.run);store.close();
 store=new AssessmentStore(file);try{loaded=store.load(created.id,created.secret);assert.equal(loaded.row.status,'finished');assert.equal(loaded.run.result().lives,0);assert.equal(JSON.parse(loaded.row.result).label,'Pre-Foundation Intervention Needed');}finally{store.close();}
});

test('admin sessions are authenticated, HTTP-only, expiring and revoked on logout',async t=>{
 const f=await fixture(t,{secureCookies:true});assert.equal((await f.call('/api/admin/questions')).status,401);
 assert.equal((await f.call('/api/admin/login','POST',{password:'wrong'})).status,401);
 const login=await f.call('/api/admin/login','POST',{password:ADMIN_PASSWORD});assert.equal(login.status,200);const header=login.headers.get('set-cookie');for(const flag of ['HttpOnly','SameSite=Strict','Path=/api/admin','Secure'])assert.ok(header.includes(flag));
 const cookie=header.split(';')[0];assert.equal((await f.call('/api/admin/questions','GET',undefined,{cookie})).status,200);
 const stored=f.store.db.prepare('SELECT token_hash FROM sessions').get();assert.ok(!stored.token_hash.includes(cookie.split('=')[1]));
 assert.equal((await f.call('/api/admin/logout','POST',{}, {cookie})).status,200);assert.equal((await f.call('/api/admin/results','GET',undefined,{cookie})).status,401);
 const expiredCookie=await f.login();f.store.db.prepare('UPDATE sessions SET expires=?').run(Date.now()-1);assert.equal((await f.call('/api/admin/questions','GET',undefined,{cookie:expiredCookie})).status,401);
});

test('admin question updates use revisions and reject invalid banks atomically',async t=>{
 const f=await fixture(t),cookie=await f.login(),original=(await f.call('/api/admin/questions','GET',undefined,{cookie})).data;
 const edited=structuredClone(original.questions);edited[0].prompt+=' Edited';
 const saved=await f.call('/api/admin/questions','PUT',{questions:edited,revision:original.revision},{cookie});assert.equal(saved.status,200);assert.notEqual(saved.data.revision,original.revision);
 const stale=await f.call('/api/admin/questions','PUT',{questions:original.questions,revision:original.revision},{cookie});assert.equal(stale.status,409);
 const short=edited.filter(q=>!(q.subject===edited[0].subject&&q.level===edited[0].level)).concat(edited.filter(q=>q.subject===edited[0].subject&&q.level===edited[0].level).slice(0,8));
 const rejected=await f.call('/api/admin/questions','PUT',{questions:short,revision:saved.data.revision},{cookie});assert.equal(rejected.status,400);
 const after=(await f.call('/api/admin/questions','GET',undefined,{cookie})).data;assert.equal(after.revision,saved.data.revision);assert.equal(after.questions.length,original.questions.length);assert.equal(after.questions.find(q=>q.id===edited[0].id).prompt,edited[0].prompt);
});

test('admin edits apply to new journeys while active journeys keep their question snapshot',async t=>{
 const f=await fixture(t),active=await f.start(),cookie=await f.login();const current=(await f.call('/api/admin/questions','GET',undefined,{cookie})).data;
 const changed=current.questions.map(q=>({...q,prompt:'UPDATED '+q.prompt}));assert.equal((await f.call('/api/admin/questions','PUT',{questions:changed,revision:current.revision},{cookie})).status,200);
 const resume=await f.call(`/api/assessment/runs/${active.id}`,'GET',undefined,{token:active.token});assert.equal(resume.data.question.prompt,active.question.prompt);
 const later=await f.start();assert.ok(later.question.prompt.startsWith('UPDATED '));
});

test('a delayed answer body cannot rewind a run after another request advances it',{timeout:10000},async t=>{
 const f=await fixture(t),run=await f.start();const payload=Buffer.from(JSON.stringify({questionId:run.question.id,answer:(answers.get(run.question.id)+1)%4}));
 const delayed=await partialRequest(f,`/api/assessment/runs/${run.id}/answer`,payload,payload.length-1,{token:run.token});
 t.after(()=>delayed.request.destroy());
 assert.equal((await f.action(run,'answer',{answer:answers.get(run.question.id)})).status,200);
 const next=await f.action(run,'next');assert.equal(next.status,200);
 const second=await f.action({...next.data,id:run.id,token:run.token},'answer',{answer:answers.get(next.data.question.id)});assert.equal(second.status,200);assert.equal(second.data.correct,2);
 delayed.finish();const late=await delayed.response;assert.equal(late.status,409);
 const final=(await f.call(`/api/assessment/runs/${run.id}`,'GET',undefined,{token:run.token})).data;
 assert.equal(final.question.id,next.data.question.id);assert.equal(final.correct,2);assert.equal(final.lives,5);assert.equal(f.store.load(run.id,run.token).run.history.length,2);
});

test('JSON decoder preserves UTF-8 characters split between request chunks',{timeout:10000},async t=>{
 const f=await fixture(t);const name='Test छात्र ₹ λ';const payload=Buffer.from(JSON.stringify({...profile({name}),consent:true}));const split=payload.indexOf(Buffer.from('छ'))+1;assert.ok(split>0);
 const delayed=await partialRequest(f,'/api/assessment/runs',payload,split);t.after(()=>delayed.request.destroy());delayed.finish();const created=await delayed.response;
 assert.equal(created.status,201);assert.equal(created.data.profile.name,name);assert.equal(f.store.load(created.data.id,created.data.token).row.name,name);
});

test('admin pagination makes more than 1,000 saved journeys available without omissions',async t=>{
 const f=await fixture(t),created=f.store.create(profile());
 const copy=f.store.db.prepare('INSERT INTO runs SELECT ?,access_hash,name,phone,grade,subject,created_at,updated_at,status,state,result,consent_version FROM runs WHERE id=?');
 for(let i=0;i<1004;i++)copy.run(i.toString(16).padStart(24,'0'),created.id);
 const cookie=await f.login(),ids=new Set();let offset=0,pages=0;
 do {
  const response=await f.call(`/api/admin/results?offset=${offset}`,'GET',undefined,{cookie});assert.equal(response.status,200);assert.equal(response.data.total,1005);assert.ok(response.data.results.length>0&&response.data.results.length<=100);
  for(const row of response.data.results){assert.ok(!ids.has(row.id),'pagination repeated an ID');ids.add(row.id);}
  offset=response.data.nextOffset;assert.ok(++pages<=11);
 }while(offset!==null);
 assert.equal(ids.size,1005);assert.ok(ids.has(created.id));
});

test('unconfigured proxy trust ignores spoofed X-Forwarded-For rate-limit keys',async t=>{
 const f=await fixture(t,{trustedProxyHops:0});
 for(let i=0;i<60;i++){const response=await f.call('/api/assessment/runs','POST',{consent:true},{headers:{'X-Forwarded-For':`198.51.100.${i+1}`}});assert.equal(response.status,400);}
 assert.equal((await f.call('/api/assessment/runs','POST',{consent:true},{headers:{'X-Forwarded-For':'203.0.113.9'}})).status,429);
});

test('configured proxy hop count uses the rightmost trusted position, not a spoofable leftmost value',async t=>{
 const f=await fixture(t,{trustedProxyHops:1});
 for(let i=0;i<60;i++){const response=await f.call('/api/assessment/runs','POST',{consent:true},{headers:{'X-Forwarded-For':`198.51.100.${i+1}, 203.0.113.8`}});assert.equal(response.status,400);}
 assert.equal((await f.call('/api/assessment/runs','POST',{consent:true},{headers:{'X-Forwarded-For':'198.51.100.200, 203.0.113.8'}})).status,429);
 assert.equal((await f.call('/api/assessment/runs','POST',{consent:true},{headers:{'X-Forwarded-For':'198.51.100.200, 203.0.113.9'}})).status,400);
});

test('shipped draft bank has 280 valid questions and every grade can complete',async()=>{
 const actual=JSON.parse(await readFile(new URL('../data-seed/questions.json',import.meta.url),'utf8')).questions;assert.equal(actual.length,280);assert.equal(validateBank(actual),true);
 for(const subject of SUBJECTS){const run=new DiagnosticRun(profile({subject,grade:10}),actual);const seen=new Set();while(run.status==='playing'){assert.ok(!seen.has(run.question.id));seen.add(run.question.id);run.answer(run.question.answer);if(run.status==='playing')run.next();}assert.equal(run.result().proficient,true);assert.equal(run.result().answered,35);}
});
