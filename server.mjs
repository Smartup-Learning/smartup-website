import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createAssessmentHandler } from './server/assessment.mjs';
const root = path.resolve('dist');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8','.ico':'image/x-icon','.mp4':'video/mp4','.webm':'video/webm','.vtt':'text/vtt; charset=utf-8'};
export function createSiteServer(options={}){
 const assessment=createAssessmentHandler(options);
 return http.createServer(async (req,res)=>{
  const send=(status,body,headers={})=>{res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8',...headers});res.end(req.method==='HEAD'?undefined:body);};
  if(req.url.startsWith('/api/'))return assessment(req,res,new URL(req.url,'http://localhost'));
  if(!['GET','HEAD'].includes(req.method))return send(405,'Method not allowed',{'Allow':'GET, HEAD'});
  try {
   const url=new URL(req.url,'http://localhost');
   if(url.pathname==='/health')return send(200,'ok');
   let requested;
   try{requested=decodeURIComponent(url.pathname);}catch{return send(400,'Invalid URL');}
   if(requested.split('/').some(part=>part.startsWith('.'))||/^\/(server|client)(\/|$)/.test(requested))return send(404,'Page not found');
   let file=path.resolve(root,'.'+requested);
   if(!file.startsWith(root+path.sep)&&file!==root)return send(403,'Forbidden');
   let info=await stat(file);
   if(info.isDirectory()){file=path.join(file,'index.html');info=await stat(file);}
   if(!info.isFile())return send(404,'Not found');
   const headers={'Content-Type':types[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Cache-Control':file.includes('/assets/')?'public, max-age=86400':'no-cache','Accept-Ranges':'bytes','Content-Length':info.size};
   let start=0,end=info.size-1,status=200;
   // A single byte range is enough for browser video playback and seeking.
   if(req.headers.range&&req.method==='GET'){
    const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    const invalid=()=>send(416,'Range not satisfiable',{'Content-Range':`bytes */${info.size}`,'Accept-Ranges':'bytes'});
    if(!match||(!match[1]&&!match[2])||info.size===0)return invalid();
    if(!match[1]){const length=Number(match[2]);if(!Number.isSafeInteger(length)||length<=0)return invalid();start=Math.max(0,info.size-length);}
    else{start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),end):end;}
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=info.size||end<start)return invalid();
    status=206;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;headers['Content-Length']=end-start+1;
   }
   res.writeHead(status,headers);
   if(req.method==='HEAD'||info.size===0)return res.end();
   const stream=createReadStream(file,{start,end});
   stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
  }catch(error){if(error.code==='ENOENT'||error.code==='ENOTDIR')return send(404,'Page not found');send(500,'Unable to serve this page');}
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{process.loadEnvFile('.env');}catch(error){if(error.code!=='ENOENT')throw error;}
 const port=Number(process.env.PORT)||3000;
 createSiteServer().listen(port,'0.0.0.0',()=>console.log(`Smartup ready at http://localhost:${port}`));
}
