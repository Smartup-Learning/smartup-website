import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';

const password='smartup-sites-test-password-only';
const profile={name:'Sites QA',phone:'9999999999',grade:5,subject:'mathematics',consent:true};

test('Sites diagnostic persists runs, protects answers and supports safe concurrent edits',async t=>{
 const compiled=await build({entryPoints:['sites/worker.mjs'],bundle:true,format:'esm',write:false});
 const mf=new Miniflare({name:'smartup',modules:true,script:compiled.outputFiles[0].text,compatibilityDate:'2026-08-01',d1Databases:['DB'],bindings:{ADMIN_PASSWORD:password},assets:{workerName:'smartup',directory:'dist/client',binding:'ASSETS',routerConfig:{has_user_worker:true,invoke_user_worker_ahead_of_assets:true}}});
 t.after(()=>mf.dispose());
 const home=await mf.dispatchFetch('https://smartup.test/');assert.equal(home.status,200,await home.clone().text());
 assert.equal((await home.text()).match(/Take the diagnostic test/g)?.length,1);
 const page=await mf.dispatchFetch('https://smartup.test/assessment/');assert.equal(page.status,200);assert.match(await page.text(),/Smartup Quest/);
 for(const path of ['/server/index.js','/.openai/hosting.json','/.openai/drizzle/0000_assessment.sql','/data-seed/questions.json'])assert.equal((await mf.dispatchFetch('https://smartup.test'+path)).status,404);
 const db=await mf.getD1Database('DB');
 for(const sql of (await readFile('sites/drizzle/0000_assessment.sql','utf8')).split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql).run();
 const call=async(path,method='GET',body,headers={})=>{
  const response=await mf.dispatchFetch('https://smartup.test'+path,{method,headers:{'Content-Type':'application/json','X-Smartup-Request':'1',...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
  return {status:response.status,headers:response.headers,data:await response.json()};
 };
 const create=()=>call('/api/assessment/runs','POST',profile);
 const action=(run,step,body)=>call(`/api/assessment/runs/${run.id}/${step}`,'POST',body,{Authorization:`Bearer ${run.token}`});
 const load=run=>call(`/api/assessment/runs/${run.id}`,'GET',undefined,{Authorization:`Bearer ${run.token}`});
 assert.equal((await call('/api/assessment/config')).data.savedResults,true);
 assert.equal((await call('/api/assessment/runs','POST',{...profile,consent:false})).status,400);
 const login=await call('/api/admin/login','POST',{password});
 assert.equal(login.status,200);
 const cookie=login.headers.get('set-cookie');
 assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);assert.match(cookie,/SameSite=Strict/);
 const auth={Cookie:cookie.split(';')[0]};
 assert.equal((await call('/api/admin/questions')).status,401);
 const bank=(await call('/api/admin/questions','GET',undefined,auth)).data;
 assert.equal(bank.questions.length,280);
 const created=await create();assert.equal(created.status,201);
 const run=created.data;
 assert.equal(run.profile.phone,undefined);assert.equal(run.queues,undefined);assert.equal(run.question.answer,undefined);
 assert.equal((await call(`/api/assessment/runs/${run.id}`)).status,404);
 const correct=bank.questions.find(q=>q.id===run.question.id).answer;
 const wrong=(correct+1)%4;
 const responses=await Promise.all(Array.from({length:8},()=>action(run,'answer',{questionId:run.question.id,answer:wrong})));
 for(const response of responses){assert.equal(response.status,200);assert.equal(response.data.lives,4);assert.equal(response.data.history.length,1);}
 const resumed=(await load(run)).data;
 assert.equal(resumed.history[0].prompt,run.question.prompt);
 assert.equal(resumed.history[0].selected,wrong);
 const advanced=await Promise.all([action(run,'next',{questionId:run.question.id}),action(run,'next',{questionId:run.question.id})]);
 assert.deepEqual(advanced.map(x=>x.status).sort(),[200,409]);
 let state=(await load(run)).data;
 assert.notEqual(state.question.id,run.question.id);assert.equal(state.history.length,1);
 // Edits to the bank are atomic and never change questions in existing runs.
 const updated=bank.questions.map(q=>({...q,prompt:q.prompt+' [reviewed]'}));
 const edits=await Promise.all([call('/api/admin/questions','PUT',{questions:updated,revision:bank.revision},auth),call('/api/admin/questions','PUT',{questions:bank.questions,revision:bank.revision},auth)]);
 assert.deepEqual(edits.map(x=>x.status).sort(),[200,409]);
 assert.equal(state.question.prompt.includes('[reviewed]'),false);
 const savedBank=(await call('/api/admin/questions','GET',undefined,auth)).data;
 assert.equal(savedBank.questions.some(q=>q.prompt.includes('[reviewed]')),savedBank.questions.every(q=>q.prompt.includes('[reviewed]')));
 // Finish a run and verify its result and personal details are stored only for admins.
 while(state.status==='playing'){
  if(state.feedback)state=(await action(run,'next',{questionId:state.question.id})).data;
  const answer=bank.questions.find(q=>q.id===state.question.id).answer;
  const replies=await Promise.all([action(run,'answer',{questionId:state.question.id,answer:(answer+1)%4}),action(run,'answer',{questionId:state.question.id,answer:(answer+1)%4})]);
  assert.equal(replies[0].status,200);assert.equal(replies[1].status,200);state=replies[0].data;
 }
 assert.equal(state.lives,0);assert.equal(state.history.length,5);
 assert.equal(state.result.label,'Pre-Foundation Intervention Needed');
 const rows=(await call('/api/admin/results','GET',undefined,auth)).data.results;
 assert.equal(rows.length,1);assert.equal(rows[0].phone,profile.phone);assert.deepEqual(rows[0].result,state.result);
 const noticed=await call('/api/assessment/runs','POST',{...profile,consent:undefined,dataNoticeVersion:'assessment-data-notice-v2'});
 assert.equal(noticed.status,201);
 assert.equal((await db.prepare('SELECT consent_version FROM runs WHERE id=?').bind(noticed.data.id).first()).consent_version,'assessment-data-notice-v2');
 assert.equal((await db.prepare('SELECT consent_version FROM runs WHERE id=?').bind(run.id).first()).consent_version,'assessment-v1');
 assert.equal((await call('/api/assessment/runs','POST',{...profile,dataNoticeVersion:'unknown'})).status,400);
 assert.equal((await call('/api/admin/questions','PUT',{questions:updated,revision:savedBank.revision},{...auth,Origin:'https://evil.test'})).status,403);
 assert.equal((await call('/api/admin/logout','POST',{},auth)).status,200);
 assert.equal((await call('/api/admin/results','GET',undefined,auth)).status,401);
 // Sign-in limits use shared D1 storage rather than an in-memory counter.
 for(let i=0;i<10;i++)await call('/api/admin/login','POST',{password:'bad'});
 assert.equal((await call('/api/admin/login','POST',{password})).status,429);
});
