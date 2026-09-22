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
 const journal=JSON.parse(await readFile('sites/drizzle/meta/_journal.json','utf8'));
 for(const migration of journal.entries){
  for(const sql of (await readFile(`sites/drizzle/${migration.tag}.sql`,'utf8')).split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql).run();
  if(migration.tag==='0000_assessment'){
   for(const [id,date,status] of [['1','2026-01-01','playing'],['2','2026-01-03','finished'],['3','2026-01-02','finished']])await db.prepare('INSERT INTO runs(id,access_hash,name,phone,grade,subject,created_at,updated_at,status,state,result,consent_version) VALUES(?,?,?,?,?,?,?,?,?,?,NULL,?)').bind(id.padStart(24,'0'),'legacy-hash','Migration QA','9999999980',7,'physics',date,date,status,'{}','assessment-v1').run();
  }
 }
 const migrated=(await db.prepare('SELECT id,attempt_slot FROM runs ORDER BY id').all()).results;
 assert.equal(migrated.length,3);assert.deepEqual(migrated.map(row=>row.attempt_slot),[0,0,1]);
 // An older worker omitting new columns still participates in the unique-attempt rule.
 const legacyInsert=id=>db.prepare('INSERT INTO runs(id,access_hash,name,phone,grade,subject,created_at,updated_at,status,state,result,consent_version) VALUES(?,?,?,?,?,?,?,?,?,?,NULL,?)').bind(id.padStart(24,'0'),'legacy-hash','Migration QA','9999999981',7,'physics','2026-01-04','2026-01-04','playing','{}','assessment-v1').run();
 await legacyInsert('4');assert.equal((await db.prepare('SELECT attempt_slot FROM runs WHERE id=?').bind('4'.padStart(24,'0')).first()).attempt_slot,1);
 await assert.rejects(()=>legacyInsert('5'),/UNIQUE/);
 await db.prepare('DELETE FROM runs').run();
 const call=async(path,method='GET',body,headers={})=>{
  const response=await mf.dispatchFetch('https://smartup.test'+path,{method,headers:{'Content-Type':'application/json','X-Smartup-Request':'1',...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
  return {status:response.status,headers:response.headers,data:await response.json()};
 };
 const create=()=>call('/api/assessment/runs','POST',profile,learnerAuth);
 const action=(run,step,body)=>call(`/api/assessment/runs/${run.id}/${step}`,'POST',body,{Authorization:`Bearer ${run.token}`});
 const load=run=>call(`/api/assessment/runs/${run.id}`,'GET',undefined,{Authorization:`Bearer ${run.token}`});
 const config=await call('/api/assessment/config');assert.equal(config.data.savedResults,true);
 const learnerAuth={Cookie:config.headers.get('set-cookie').split(';')[0]};
 const missingBrowser=await call('/api/assessment/runs','POST',profile);assert.equal(missingBrowser.status,428);assert.equal(missingBrowser.data.code,'BROWSER_REQUIRED');
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM phone_profiles').first()).n,0);assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM runs').first()).n,0);
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
 // Browser-bound history is private, and a completed result is never overwritten.
 assert.match(config.headers.get('set-cookie'),/HttpOnly/);assert.match(config.headers.get('set-cookie'),/SameSite=Strict/);assert.match(config.headers.get('set-cookie'),/Secure/);
 assert.equal((await call('/api/assessment/profile')).status,404);
 assert.equal((await call('/api/assessment/profile','GET',undefined,{Cookie:'smartup_learner=foreign-browser'})).status,404);
 const denied=await call('/api/assessment/runs','POST',profile,{Cookie:'smartup_learner=foreign-browser'});assert.equal(denied.status,409);assert.equal(denied.data.code,'ORIGINAL_BROWSER_REQUIRED');assert.equal(denied.data.result,undefined);
 const reopened=await call('/api/assessment/runs','POST',{...profile,grade:10},learnerAuth);assert.equal(reopened.status,200);assert.equal(reopened.data.id,run.id);assert.equal(reopened.data.token,null);assert.deepEqual(reopened.data.result,state.result);assert.equal(reopened.data.profile.grade,5);
 const overview=(await call('/api/assessment/profile','GET',undefined,learnerAuth)).data;
 const math=overview.subjects.find(s=>s.subject==='mathematics');assert.equal(math.status,'completed');assert.equal(math.expectedLevel,'5');assert.equal(math.currentLevel,null);assert.equal(math.runId,run.id);
 assert.equal(overview.subjects.find(s=>s.subject==='physics').status,'available');
 // Parallel starts converge on the one canonical attempt, even before its first answer.
 const starts=await Promise.all(Array.from({length:8},()=>call('/api/assessment/runs','POST',{...profile,subject:'physics'},learnerAuth)));
 assert.equal(starts.filter(r=>r.status===201).length,1);for(const r of starts)assert.ok([200,201].includes(r.status),JSON.stringify(r));
 assert.equal(new Set(starts.map(r=>r.data.id)).size,1);
 const physics=starts.find(r=>r.status===201).data;
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM runs WHERE phone=? AND subject=?').bind(profile.phone,'physics').first()).n,1);
 const physicsQuestion=bank.questions.find(q=>q.id===physics.question.id);
 const lost=await call(`/api/assessment/runs/${physics.id}/answer`,'POST',{questionId:physics.question.id,answer:(physicsQuestion.answer+1)%4},learnerAuth);assert.equal(lost.status,200);assert.equal(lost.data.lives,4);
 const physicsAgain=await call('/api/assessment/runs','POST',{...profile,subject:'physics'},learnerAuth);assert.equal(physicsAgain.status,200);assert.equal(physicsAgain.data.lives,4);assert.equal(physicsAgain.data.history.length,1);
 assert.equal((await call(`/api/assessment/runs/${physics.id}`,'GET',undefined,learnerAuth)).data.lives,4);
 // Two browsers racing to claim a new phone cannot both gain access to it.
 const competitors=await Promise.all(['first','second'].map(browser=>call('/api/assessment/runs','POST',{...profile,phone:'9999999997'},{Cookie:`smartup_learner=${browser}-browser`})));
 assert.deepEqual(competitors.map(r=>r.status).sort(),[201,409]);
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM runs WHERE phone=?').bind('9999999997').first()).n,1);
 // A legacy bearer token links only its own run, not every record with that number.
 const source=await db.prepare('SELECT * FROM runs WHERE id=?').bind(run.id).first();
 for(const [id,subject] of [['a'.repeat(24),'mathematics'],['b'.repeat(24),'physics']]){
  const savedState=JSON.parse(source.state);savedState.profile={...savedState.profile,phone:'9999999996',subject};
  await db.prepare("INSERT INTO runs(id,access_hash,name,phone,grade,subject,created_at,updated_at,status,state,result,consent_version,revision,browser_hash,attempt_slot) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,0,'',1)").bind(id,source.access_hash,source.name,'9999999996',source.grade,subject,source.created_at,source.updated_at,source.status,JSON.stringify(savedState),source.result,source.consent_version).run();
 }
 const legacyAuth={Cookie:'smartup_learner=legacy-browser',Authorization:`Bearer ${run.token}`};
 const claimed=await call('/api/assessment/profile/claim','POST',{runId:'a'.repeat(24)},legacyAuth);assert.equal(claimed.status,200);
 assert.equal(claimed.data.subjects.find(s=>s.subject==='mathematics').status,'completed');
 assert.deepEqual(claimed.data.subjects.find(s=>s.subject==='physics'),{subject:'physics',status:'unavailable',expectedLevel:'5'});
 assert.equal((await call(`/api/assessment/runs/${'b'.repeat(24)}`,'GET',undefined,{Cookie:legacyAuth.Cookie})).status,404);
 assert.equal((await call('/api/assessment/profile/claim','POST',{runId:'a'.repeat(24)},{Cookie:'smartup_learner=another-browser',Authorization:legacyAuth.Authorization})).status,403);
 const noticed=await call('/api/assessment/runs','POST',{...profile,phone:'9999999998',consent:undefined,dataNoticeVersion:'assessment-data-notice-v2'},learnerAuth);
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
