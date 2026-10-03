import {mkdir,copyFile,rm} from 'node:fs/promises';
// Explicit publish list keeps research photos, local tests, and source history off the website.
export const publishFiles=['index.html','style.css','game.js','heroes.js','renderer.js','audio.js','engine.js','hold-gate.js','assets/sprites/ultra-atlas-v2.png','assets/sprites/city.png','assets/sprites/monster.png'];
await rm('_site',{recursive:true,force:true});
for(const file of publishFiles){await mkdir('_site/'+file.split('/').slice(0,-1).join('/'),{recursive:true});await copyFile(file,'_site/'+file);}
console.log(`Published ${publishFiles.length} files to _site`);
