import {cp,mkdir,readdir,rm} from 'node:fs/promises';
import {build} from 'esbuild';

// Keep the authored static site and Railway runtime intact. These ignored
// directories are only the publication bundle used by Sites.
const generated=new Set(['client','server','.openai']);
const publicEntries=(await readdir('dist')).filter(name=>!generated.has(name));
for(const name of generated)await rm(`dist/${name}`,{recursive:true,force:true});
await mkdir('dist/client',{recursive:true});
await mkdir('dist/server',{recursive:true});
await mkdir('dist/.openai',{recursive:true});
for(const name of publicEntries)await cp(`dist/${name}`,`dist/client/${name}`,{recursive:true});
await build({entryPoints:['sites/worker.mjs'],bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,outfile:'dist/server/index.js'});
await cp('.openai/hosting.json','dist/.openai/hosting.json');
await cp('sites/drizzle','dist/.openai/drizzle',{recursive:true});
console.log('Sites publication bundle ready; Railway runtime preserved.');
