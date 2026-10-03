import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const scope='https://example.test/ultra-playground/';
const files=['index.html','game.js','pwa.js','assets/sprites/city.png'];
const source=(await readFile('sw.js','utf8')).replace('__BUILD_VERSION__','test-v2').replace('__PRECACHE_FILES__',JSON.stringify(files));
function worker(fail=false){
 const listeners={},stores=new Map(),deleted=[];let claimed=0;
 const cacheFor=name=>{if(!stores.has(name))stores.set(name,new Map());const map=stores.get(name);return {async addAll(urls){if(fail)throw new Error('network failed');for(const url of urls)map.set(url,'cached:'+url);},async match(url){return map.get(url);}};}; 
 const caches={open:async name=>cacheFor(name),keys:async()=>[...stores.keys()],delete:async key=>{deleted.push(key);return stores.delete(key);}};
 vm.runInNewContext(source,{URL,caches,fetch:async()=>{throw new Error('offline');},self:{registration:{scope},clients:{claim:async()=>claimed++},addEventListener:(name,fn)=>listeners[name]=fn}});
 return {listeners,stores,deleted,get claimed(){return claimed;},async event(name){let done;listeners[name]({waitUntil:p=>done=p});await done;},async fetch(path,mode='cors',method='GET'){let response;listeners.fetch({request:{url:new URL(path,scope).href,mode,method},respondWith:p=>response=p});return response;}};
}
test('offline navigation including home-screen launch resolves to cached index and assets',async()=>{
 const w=worker();await w.event('install');await w.event('activate');
 assert.equal(await w.fetch('./?from=homescreen','navigate'),'cached:'+scope+'index.html');
 assert.equal(await w.fetch('game.js'),'cached:'+scope+'game.js');
 assert.equal(await w.fetch('assets/sprites/city.png'),'cached:'+scope+'assets/sprites/city.png');
 assert.equal(w.claimed,1);
});
test('cache activation only deletes old versions for this app scope',async()=>{
 const w=worker();w.stores.set('ultra-playground:/ultra-playground/:old',new Map());w.stores.set('another-game:old',new Map());w.stores.set('ultra-playground:/other/:old',new Map());
 await w.event('install');await w.event('activate');assert.deepEqual(w.deleted,['ultra-playground:/ultra-playground/:old']);
});
test('failed pre-cache aborts install and does not claim clients',async()=>{
 const w=worker(true);await assert.rejects(w.event('install'),/network failed/);assert.equal(w.claimed,0);
});
test('worker does not intercept external URLs, unrelated pages, or writes',async()=>{
 const w=worker();await w.event('install');assert.equal(await w.fetch('https://other.test/game.js'),undefined);assert.equal(await w.fetch('../another/index.html','navigate'),undefined);assert.equal(await w.fetch('game.js','cors','POST'),undefined);
});
test('install manifest and Apple icons point to valid PNG sizes',async()=>{
 const manifest=JSON.parse(await readFile('manifest.webmanifest','utf8'));assert.equal(manifest.display,'standalone');assert.equal(manifest.scope,'./');assert.equal(manifest.start_url,'./');
 for(const icon of [...manifest.icons,{src:'assets/icons/apple-touch-icon.png',sizes:'180x180'}]){const data=await readFile(icon.src);const [w,h]=icon.sizes.split('x').map(Number);assert.equal(data.readUInt32BE(16),w);assert.equal(data.readUInt32BE(20),h);}
});
