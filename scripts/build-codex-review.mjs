// Static review snapshot. This command never publishes or changes the game's server.
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const out=resolve(process.argv[2] || join(root,'dist'));
if(out===root || root.startsWith(out+'/'))throw new Error('Review output must not overwrite source');
mkdirSync(out,{recursive:true});
for(const dir of ['images','css','js','fighters'])cpSync(join(root,dir),join(out,dir),{recursive:true});
for(const name of ['archive.html','codex-profile.html','combat-guide.html','test.html','tournament.html','waft-arena.html'])cpSync(join(root,name),join(out,name));
const entry='<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WAFT · revisión del archivo</title><meta http-equiv="refresh" content="0;url=archive.html"><p><a href="archive.html">Abrir revisión del archivo WAFT</a></p></html>';
writeFileSync(join(out,'index.html'),entry);
for(const path of ['archive.html','codex-profile.html',...['mammals','birds','reptiles','amphibians','fish-and-marine-invertebrates','arthropods-and-other-invertebrates'].map(c=>`fighters/${c}/index.html`)]){
 const target=join(out,path);const text=readFileSync(target,'utf8');
 writeFileSync(target,text.replace('<header class="codex-header">','<div style="background:#25351f;color:#e0e3c6;font:10px/1.6 system-ui;padding:7px 5%;letter-spacing:.07em;text-align:center">WAFT · VERSIÓN DE REVISIÓN DEL ARCHIVO</div><header class="codex-header">'));
}
if(!existsSync(join(out,'images/codex/matamata-960.webp')))throw new Error('Encode Codex images before packaging');
console.log(`Review snapshot ready: ${out}`);
