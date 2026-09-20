import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdirSync} from 'node:fs';
import {randomBytes,createHash,timingSafeEqual,scryptSync} from 'node:crypto';
import path from 'node:path';
import {isIP} from 'node:net';
import {DiagnosticRun,validateProfile,validateBank} from '../dist/assessment/engine.js';
const hash=value=>createHash('sha256').update(value).digest('hex');
const token=()=>randomBytes(32).toString('base64url');
export class AssessmentStore {
 constructor(file=path.join(process.env.DATA_DIR||'data','smartup.sqlite')) {
  if(file!==':memory:')mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
  this.db=new DatabaseSync(file);this.db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  this.db.exec(`CREATE TABLE IF NOT EXISTS questions(id TEXT PRIMARY KEY, subject TEXT NOT NULL, level TEXT NOT NULL, content TEXT NOT NULL); CREATE INDEX IF NOT EXISTS questions_bucket ON questions(subject,level);
  CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY, access_hash TEXT NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL, grade INTEGER NOT NULL, subject TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, status TEXT NOT NULL, state TEXT NOT NULL, result TEXT, consent_version TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, expires INTEGER NOT NULL);`);
  if(!this.db.prepare('SELECT COUNT(*) AS n FROM questions').get().n)this.replaceBank(JSON.parse(readFileSync(new URL('../data-seed/questions.json',import.meta.url))).questions);
 }
 questions(){return this.db.prepare('SELECT content FROM questions ORDER BY subject,level,id').all().map(r=>JSON.parse(r.content));}
 replaceBank(questions){validateBank(questions);this.db.exec('BEGIN IMMEDIATE');try{this.db.exec('DELETE FROM questions');const insert=this.db.prepare('INSERT INTO questions VALUES(?,?,?,?)');for(const q of questions)insert.run(q.id,q.subject,q.level,JSON.stringify(q));this.db.exec('COMMIT');}catch(e){this.db.exec('ROLLBACK');throw e;}}
 create(profile){const run=new DiagnosticRun(profile,this.questions());const id=randomBytes(12).toString('hex'),secret=token(),now=new Date().toISOString();this.db.prepare('INSERT INTO runs VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(id,hash(secret),profile.name.trim(),profile.phone.trim(),Number(profile.grade),profile.subject,now,now,'playing',JSON.stringify(run),null,'assessment-v1');return {id,secret,run};}
 load(id,secret){const row=this.db.prepare('SELECT * FROM runs WHERE id=? AND access_hash=?').get(id,hash(secret||''));if(!row)return null;const run=Object.assign(Object.create(DiagnosticRun.prototype),JSON.parse(row.state));return {run,row};}
 save(id,run){this.db.prepare('UPDATE runs SET state=?,result=?,status=?,updated_at=? WHERE id=?').run(JSON.stringify(run),run.result()?JSON.stringify(run.result()):null,run.status,new Date().toISOString(),id);}
 close(){this.db.close();}
}
function view(run){const q=run.question;return {profile:{name:run.profile.name,grade:run.profile.grade,subject:run.profile.subject},levels:run.levels,level:run.level,levelIndex:run.levelIndex,lives:run.lives,correct:run.correct,streak:run.streak,cleared:run.cleared,status:run.status,feedback:run.feedback,result:run.result(),history:run.history,question:q?{id:q.id,topic:q.topic,prompt:q.prompt,options:q.options}:null};}
export function createAssessmentHandler({store=new AssessmentStore(),adminPassword=process.env.ADMIN_PASSWORD||'',secureCookies=process.env.NODE_ENV==='production',trustedProxyHops=Number(process.env.TRUST_PROXY_HOPS)||0}={}) {
 if(process.env.NODE_ENV==='production'&&adminPassword.length<16)throw new Error('Set ADMIN_PASSWORD to at least 16 characters before launching.');
 const salt=randomBytes(16), passwordHash=adminPassword?scryptSync(adminPassword,salt,32):null;
 const attempts=new Map();
 function limited(key,max,windowMs){const now=Date.now();if(attempts.size>10000)for(const [k,v]of attempts)if(v.until<now)attempts.delete(k);let current=attempts.get(key);if(!current||current.until<now){current={count:0,until:now+windowMs};attempts.set(key,current);}return ++current.count>max;}
 function authorized(req){const t=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('smartup_admin='))?.slice(14);return t&&store.db.prepare('SELECT 1 FROM sessions WHERE token_hash=? AND expires>?').get(hash(t),Date.now());}
 async function body(req){const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>1500000){const e=new Error('Request is too large.');e.status=413;throw e;}chunks.push(chunk);}try{const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!input||Array.isArray(input)||typeof input!=='object')throw new Error();return input;}catch{const e=new Error('Send a valid JSON object.');e.status=400;throw e;}}
 function clientAddress(req){const socket=req.socket.remoteAddress||'unknown';if(!Number.isInteger(trustedProxyHops)||trustedProxyHops<1)return socket;const forwarded=String(req.headers['x-forwarded-for']||'').split(',').map(x=>x.trim()).filter(Boolean);const chain=[...forwarded,socket];const candidate=chain[Math.max(0,chain.length-1-trustedProxyHops)];return isIP(candidate)?candidate:socket;}
 return async(req,res,url)=>{
  const respond=(status,data,headers={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(data));};
  try {
   const route=url.pathname.replace(/\/$/,'');
   if(!['GET','POST','PUT','DELETE'].includes(req.method))return respond(405,{error:'Method not allowed.'});
   if(req.method!=='GET'){
    if(req.headers['x-smartup-request']!=='1'||!req.headers['content-type']?.startsWith('application/json'))return respond(403,{error:'This request is not allowed.'});
    if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return respond(403,{error:'This request is not allowed.'});
    if(req.headers['sec-fetch-site']==='cross-site')return respond(403,{error:'This request is not allowed.'});
   }
   const ip=clientAddress(req);
   if(route==='/api/assessment/config'&&req.method==='GET')return respond(200,{ready:true,bankStatus:'draft',savedResults:true});
   if(route==='/api/assessment/runs'&&req.method==='POST'){
    if(limited('run:'+ip,60,3600000))return respond(429,{error:'Too many starts. Please try again later.'});
    const input=await body(req),errors=validateProfile(input);
    if(input.consent!==true)errors.consent='Please confirm permission to save these details.';
    if(Object.keys(errors).length)return respond(400,{error:'Check the highlighted details.',fields:errors});
    const created=store.create(input);return respond(201,{...view(created.run),id:created.id,token:created.secret});
   }
   const runMatch=route.match(/^\/api\/assessment\/runs\/([a-f0-9]{24})(?:\/(answer|next))?$/);
   if(runMatch){
    // Consume the asynchronous body before reading state. The following load/mutate/save
    // is synchronous so concurrent requests cannot overwrite a newer run snapshot.
    const input=req.method==='POST'?await body(req):null;
    const saved=store.load(runMatch[1],req.headers.authorization?.replace(/^Bearer /,''));
    if(!saved)return respond(404,{error:'This journey could not be found. Start a new challenge.'});
    const run=saved.run;
    if(req.method==='GET'&&!runMatch[2])return respond(200,view(run));
    if(req.method!=='POST')return respond(405,{error:'Method not allowed.'});
    // A question id is an idempotency boundary: stale and duplicate submissions never cost a life.
    if(input.questionId!==run.question?.id)return respond(409,{error:'This question has already moved on.',state:view(run)});
    if(runMatch[2]==='answer'){
     if(!Number.isInteger(input.answer)||input.answer<0||input.answer>3)return respond(400,{error:'Choose one answer.'});
     if(!run.feedback)run.answer(input.answer);
    } else if(runMatch[2]==='next')run.next();
    else return respond(404,{error:'Not found.'});
    store.save(runMatch[1],run);return respond(200,view(run));
   }
   if(route==='/api/admin/login'&&req.method==='POST'){
    if(!passwordHash)return respond(503,{error:'Administration has not been configured.'});
    if(limited('login:'+ip,10,900000))return respond(429,{error:'Too many sign-in attempts. Try again in 15 minutes.'});
    const input=await body(req);if(typeof input.password!=='string'||input.password.length>256||!timingSafeEqual(passwordHash,scryptSync(input.password,salt,32)))return respond(401,{error:'The password is incorrect.'});
    const session=token();store.db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());store.db.prepare('INSERT INTO sessions VALUES(?,?)').run(hash(session),Date.now()+8*3600000);
    return respond(200,{ok:true},{'Set-Cookie':`smartup_admin=${session}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=28800${secureCookies?'; Secure':''}`});
   }
   if(route.startsWith('/api/admin/')){
    if(!authorized(req))return respond(401,{error:'Please sign in to continue.'});
    if(route==='/api/admin/logout'&&req.method==='POST'){
     const t=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('smartup_admin='))?.slice(14);if(t)store.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(t));
     return respond(200,{ok:true},{'Set-Cookie':`smartup_admin=; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=0${secureCookies?'; Secure':''}`});
    }
    if(route==='/api/admin/questions'&&req.method==='GET')return respond(200,{questions:store.questions(),revision:hash(JSON.stringify(store.questions()))});
    if(route==='/api/admin/questions'&&req.method==='PUT'){
     const input=await body(req);if(input.revision!==hash(JSON.stringify(store.questions())))return respond(409,{error:'The bank changed in another session. Reload before saving.'});if(!Array.isArray(input.questions)||input.questions.length>10000)return respond(400,{error:'Upload an array of up to 10,000 questions.'});
     try{store.replaceBank(input.questions);}catch(error){return respond(400,{error:error.message});}return respond(200,{ok:true,count:input.questions.length,revision:hash(JSON.stringify(store.questions()))});
    }
    if(route==='/api/admin/results'&&req.method==='GET'){
     const offset=Math.max(0,Number.parseInt(url.searchParams.get('offset'),10)||0),limit=100;
     const total=store.db.prepare('SELECT COUNT(*) AS n FROM runs').get().n;
     const results=store.db.prepare('SELECT id,name,phone,grade,subject,created_at,updated_at,status,result FROM runs ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?').all(limit,offset).map(r=>({...r,result:r.result?JSON.parse(r.result):null}));
     return respond(200,{results,total,offset,nextOffset:offset+results.length<total?offset+results.length:null});
    }
    const deletion=route.match(/^\/api\/admin\/results\/([a-f0-9]{24})$/);
    if(deletion&&req.method==='DELETE'){store.db.prepare('DELETE FROM runs WHERE id=?').run(deletion[1]);return respond(200,{ok:true});}
   }
   return respond(404,{error:'Not found.'});
  } catch(error){return respond(error.status||500,{error:error.status?error.message:'Something went wrong. Please try again.'});}
 };
}
