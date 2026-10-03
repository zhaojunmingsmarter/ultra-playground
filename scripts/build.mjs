import {createHash} from 'node:crypto';
import {mkdir,copyFile,rm,readFile,writeFile} from 'node:fs/promises';
// Explicit publish list keeps research photos, local tests, and source history off the website.
export const publishFiles=['image-loader.js','pwa.js','manifest.webmanifest','assets/icons/icon-192.png','assets/icons/icon-512.png','assets/icons/icon-maskable-512.png','assets/icons/apple-touch-icon.png','index.html','style.css','game.js','heroes.js','renderer.js','audio.js','engine.js','assets/sprites/ultra-atlas-v2.webp','assets/sprites/city.webp','assets/sprites/monster.webp','assets/sprites/combat.webp','assets/sprites/space.webp','assets/sprites/canyon.webp'];
await rm('_site',{recursive:true,force:true});
for(const file of publishFiles){await mkdir('_site/'+file.split('/').slice(0,-1).join('/'),{recursive:true});await copyFile(file,'_site/'+file);}
console.log(`Published ${publishFiles.length} files to _site`);

const hash=createHash('sha256');
for(const file of publishFiles){hash.update(file);hash.update(await readFile(file));}
const template=await readFile('sw.js','utf8');hash.update(template);
const version=hash.digest('hex').slice(0,16);
const worker=template.replace('__BUILD_VERSION__',version).replace('__PRECACHE_FILES__',JSON.stringify(publishFiles));
await writeFile('_site/sw.js',worker);
console.log(`Offline cache version: ${version}`);

// A fresh scope lets devices stuck on an older worker open the repaired game directly.
for(const file of [...publishFiles,'sw.js']) {
  await mkdir('_site/play/'+file.split('/').slice(0,-1).join('/'),{recursive:true});
  await copyFile('_site/'+file,'_site/play/'+file);
}
