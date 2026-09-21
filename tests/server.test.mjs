import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { stat } from 'node:fs/promises';
import { createSiteServer } from '../server.mjs';
import {AssessmentStore} from '../server/assessment.mjs';
const store=new AssessmentStore(':memory:');
const server=createSiteServer({store});let base;
before(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`;});
after(()=>new Promise(r=>server.close(()=>{store.close();r();})));
test('HTML, health, unknown paths and unsupported methods',async()=>{
 assert.equal((await fetch(base)).status,200);assert.equal(await (await fetch(base+'/health')).text(),'ok');assert.equal((await fetch(base+'/not-found')).status,404);assert.equal((await fetch(base,{method:'POST'})).status,405);
});
test('HEAD provides length and no body',async()=>{const r=await fetch(base+'/assets/logo.svg',{method:'HEAD'});assert.equal(r.status,200);assert.equal(Number(r.headers.get('content-length')),(await stat('dist/assets/logo.svg')).size);assert.equal(await r.text(),'');});
test('valid byte range returns only requested bytes',async()=>{const r=await fetch(base+'/assets/logo.svg',{headers:{range:'bytes=0-9'}});assert.equal(r.status,206);assert.match(r.headers.get('content-range'),/^bytes 0-9\//);assert.equal((await r.arrayBuffer()).byteLength,10);});
test('suffix and open-ended ranges work',async()=>{const size=(await stat('dist/assets/logo.svg')).size;for(const range of ['bytes=-20',`bytes=${size-20}-`]){const r=await fetch(base+'/assets/logo.svg',{headers:{range}});assert.equal(r.status,206);assert.equal((await r.arrayBuffer()).byteLength,20);}});
test('invalid and out-of-bounds ranges return 416',async()=>{for(const range of ['bytes=99999999-','bytes=10-5','bytes=-0','bytes=-','bytes=0-1,4-5'])assert.equal((await fetch(base+'/assets/logo.svg',{headers:{range}})).status,416);});
test('malformed URLs do not leak filesystem errors',async()=>{assert.equal((await fetch(base+'/%ZZ')).status,400);});
test('Sites server bundles and metadata are never public on Railway',async()=>{for(const path of ['/server/index.js','/.openai/hosting.json','/client/index.html'])assert.equal((await fetch(base+path)).status,404);});
