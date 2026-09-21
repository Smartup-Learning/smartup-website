// Sites review deployment. Railway continues to use server.mjs and SQLite.
import {DiagnosticRun,validateProfile,validateBank} from '../dist/assessment/engine.js';
import seed from '../data-seed/questions.json' with {type:'json'};

const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const token=(size=32)=>hex(crypto.getRandomValues(new Uint8Array(size)));
const hash=async value=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))));
const restore=state=>Object.assign(Object.create(DiagnosticRun.prototype),JSON.parse(state));
function view(run){
 const q=run.question;
 return {profile:{name:run.profile.name,grade:run.profile.grade,subject:run.profile.subject},levels:run.levels,level:run.level,levelIndex:run.levelIndex,lives:run.lives,correct:run.correct,streak:run.streak,cleared:run.cleared,status:run.status,feedback:run.feedback,result:run.result(),history:run.history,question:q?{id:q.id,topic:q.topic,prompt:q.prompt,options:q.options}:null};
}
const respond=(status,data,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const fail=(status,message)=>Object.assign(new Error(message),{status});
async function body(request){
 const reader=request.body?.getReader();if(!reader)throw fail(400,'Send a valid JSON object.');
 const chunks=[];let size=0;
 for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>1500000){await reader.cancel();throw fail(413,'Request is too large.');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 try{const input=JSON.parse(new TextDecoder().decode(bytes));if(!input||Array.isArray(input)||typeof input!=='object')throw new Error();return input;}catch{throw fail(400,'Send a valid JSON object.');}
}
async function bank(db){
 let current=await db.prepare('SELECT content,revision FROM question_banks WHERE id=1').first();
 if(!current){
  await db.prepare('INSERT OR IGNORE INTO question_banks(id,content,revision) VALUES(1,?,?)').bind(JSON.stringify(seed.questions),token()).run();
  current=await db.prepare('SELECT content,revision FROM question_banks WHERE id=1').first();
 }
 return {questions:JSON.parse(current.content),revision:current.revision};
}
async function limited(db,key,max,windowMs){
 const now=Date.now();
 await db.prepare('DELETE FROM request_limits WHERE expires<=?').bind(now).run();
 const record=await db.prepare('INSERT INTO request_limits(id,count,expires) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count').bind(await hash(key),now+windowMs).first();
 return record.count>max;
}
function adminToken(request){return (request.headers.get('Cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('smartup_admin='))?.slice(14);}
async function authorized(request,db){const secret=adminToken(request);return secret&&await db.prepare('SELECT 1 FROM sessions WHERE token_hash=? AND expires>?').bind(await hash(secret),Date.now()).first();}
async function samePassword(input,expected){
 // The secret remains in the hosting environment; compare fixed-size digests.
 const [a,b]=await Promise.all([hash(input),hash(expected)]);let different=0;for(let i=0;i<a.length;i++)different|=a.charCodeAt(i)^b.charCodeAt(i);return different===0;
}
const adminCookie=secret=>`smartup_admin=${secret}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${secret?28800:0}; Secure`;

export async function assessment(request,env){
 try{
  const url=new URL(request.url),route=url.pathname.replace(/\/$/,''),method=request.method,db=env.DB;
  if(!db)return respond(503,{error:'The challenge is temporarily unavailable.'});
  if(!['GET','POST','PUT','DELETE'].includes(method))return respond(405,{error:'Method not allowed.'});
  if(method!=='GET'){
   if(request.headers.get('X-Smartup-Request')!=='1'||!request.headers.get('Content-Type')?.startsWith('application/json'))return respond(403,{error:'This request is not allowed.'});
   if(request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin)return respond(403,{error:'This request is not allowed.'});
   if(request.headers.get('Sec-Fetch-Site')==='cross-site')return respond(403,{error:'This request is not allowed.'});
  }
  const ip=request.headers.get('CF-Connecting-IP')||'unknown';
  if(route==='/api/assessment/config'&&method==='GET'){
   await bank(db);return respond(200,{ready:true,bankStatus:'draft',savedResults:true});
  }
  if(route==='/api/assessment/runs'&&method==='POST'){
   if(await limited(db,'run:'+ip,60,3600000))return respond(429,{error:'Too many starts. Please try again later.'});
   const input=await body(request),errors=validateProfile(input);
   if(input.consent!==true)errors.consent='Please confirm permission to save these details.';
   if(Object.keys(errors).length)return respond(400,{error:'Check the highlighted details.',fields:errors});
   const run=new DiagnosticRun(input,(await bank(db)).questions),id=token(12),secret=token(),now=new Date().toISOString();
   await db.prepare('INSERT INTO runs(id,access_hash,name,phone,grade,subject,created_at,updated_at,status,state,result,consent_version,revision) VALUES(?,?,?,?,?,?,?,?,?,?,NULL,?,0)').bind(id,await hash(secret),run.profile.name,run.profile.phone,run.profile.grade,run.profile.subject,now,now,'playing',JSON.stringify(run),'assessment-v1').run();
   return respond(201,{...view(run),id,token:secret});
  }
  const match=route.match(/^\/api\/assessment\/runs\/([a-f0-9]{24})(?:\/(answer|next))?$/);
  if(match){
   const input=method==='POST'?await body(request):null;
   const accessHash=await hash(request.headers.get('Authorization')?.replace(/^Bearer /,'')||'');
   // D1 reads are async. A compare-and-swap revision prevents lost lives,
   // duplicate answers and rewinds when different Worker instances race.
   for(let attempt=0;attempt<5;attempt++){
    const row=await db.prepare('SELECT state,revision FROM runs WHERE id=? AND access_hash=?').bind(match[1],accessHash).first();
    if(!row)return respond(404,{error:'This journey could not be found. Start a new challenge.'});
    const run=restore(row.state);
    if(method==='GET'&&!match[2])return respond(200,view(run));
    if(method!=='POST')return respond(405,{error:'Method not allowed.'});
    if(input.questionId!==run.question?.id)return respond(409,{error:'This question has already moved on.',state:view(run)});
    if(match[2]==='answer'){
     if(!Number.isInteger(input.answer)||input.answer<0||input.answer>3)return respond(400,{error:'Choose one answer.'});
     if(run.feedback||run.status!=='playing')return respond(200,view(run));
     run.answer(input.answer);
    }else if(match[2]==='next'){
     if(!run.next())return respond(200,view(run));
    }else return respond(404,{error:'Not found.'});
    const result=run.result();
    const update=await db.prepare('UPDATE runs SET state=?,result=?,status=?,updated_at=?,revision=revision+1 WHERE id=? AND access_hash=? AND revision=?').bind(JSON.stringify(run),result?JSON.stringify(result):null,run.status,new Date().toISOString(),match[1],accessHash,row.revision).run();
    if(update.meta.changes===1)return respond(200,view(run));
   }
   return respond(409,{error:'Your progress changed in another window. Please resume the challenge.'});
  }
  if(route==='/api/admin/login'&&method==='POST'){
   if(!env.ADMIN_PASSWORD||env.ADMIN_PASSWORD.length<16)return respond(503,{error:'Administration has not been configured.'});
   if(await limited(db,'login:'+ip,10,900000))return respond(429,{error:'Too many sign-in attempts. Try again in 15 minutes.'});
   const input=await body(request);
   if(typeof input.password!=='string'||input.password.length>256||!await samePassword(input.password,env.ADMIN_PASSWORD))return respond(401,{error:'The password is incorrect.'});
   const secret=token();
   await db.batch([db.prepare('DELETE FROM sessions WHERE expires<?').bind(Date.now()),db.prepare('INSERT INTO sessions(token_hash,expires) VALUES(?,?)').bind(await hash(secret),Date.now()+8*3600000)]);
   return respond(200,{ok:true},{'Set-Cookie':adminCookie(secret)});
  }
  if(route.startsWith('/api/admin/')){
   if(!await authorized(request,db))return respond(401,{error:'Please sign in to continue.'});
   if(route==='/api/admin/logout'&&method==='POST'){
    await db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await hash(adminToken(request))).run();
    return respond(200,{ok:true},{'Set-Cookie':adminCookie('')});
   }
   if(route==='/api/admin/questions'&&method==='GET')return respond(200,await bank(db));
   if(route==='/api/admin/questions'&&method==='PUT'){
    const input=await body(request);
    if(!Array.isArray(input.questions)||input.questions.length>10000)return respond(400,{error:'Upload an array of up to 10,000 questions.'});
    try{validateBank(input.questions);}catch(error){return respond(400,{error:error.message});}
    const revision=token();
    const update=await db.prepare('UPDATE question_banks SET content=?,revision=? WHERE id=1 AND revision=?').bind(JSON.stringify(input.questions),revision,typeof input.revision==='string'?input.revision:'').run();
    if(update.meta.changes!==1)return respond(409,{error:'The bank changed in another session. Reload before saving.'});
    return respond(200,{ok:true,count:input.questions.length,revision});
   }
   if(route==='/api/admin/results'&&method==='GET'){
    const offset=Math.max(0,Math.min(Number.MAX_SAFE_INTEGER,Number.parseInt(url.searchParams.get('offset'),10)||0)),limit=100;
    const total=(await db.prepare('SELECT COUNT(*) AS n FROM runs').first()).n;
    const records=await db.prepare('SELECT id,name,phone,grade,subject,created_at,updated_at,status,result FROM runs ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?').bind(limit,offset).all();
    const results=records.results.map(row=>({...row,result:row.result?JSON.parse(row.result):null}));
    return respond(200,{results,total,offset,nextOffset:offset+results.length<total?offset+results.length:null});
   }
   const deletion=route.match(/^\/api\/admin\/results\/([a-f0-9]{24})$/);
   if(deletion&&method==='DELETE'){
    await db.prepare('DELETE FROM runs WHERE id=?').bind(deletion[1]).run();return respond(200,{ok:true});
   }
  }
  return respond(404,{error:'Not found.'});
 }catch(error){return respond(error.status||500,{error:error.status?error.message:'Something went wrong. Please try again.'});}
}

export default {async fetch(request,env){
 const url=new URL(request.url);
 if(url.pathname.startsWith('/api/'))return assessment(request,env);
 if(url.pathname==='/health')return new Response('ok');
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
 if(!env.ASSETS)return new Response('Not found',{status:404});
 const response=await env.ASSETS.fetch(request);
 const headers=new Headers(response.headers);
 headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','strict-origin-when-cross-origin');
 if(!url.pathname.startsWith('/assets/'))headers.set('Cache-Control','no-cache');
 return new Response(response.body,{status:response.status,headers});
}};
