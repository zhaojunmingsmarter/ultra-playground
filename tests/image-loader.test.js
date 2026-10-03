import test from 'node:test';
import assert from 'node:assert/strict';
import {createImageLoader} from '../image-loader.js';
test('failed image retries, shared requests deduplicate, successful images stay cached', async()=>{
 let requests=0;
 class FakeImage {set src(v){if(!v)return;requests++;queueMicrotask(()=>requests===1?this.onerror?.():this.onload?.());}}
 const cache=new Map(),load=createImageLoader(cache,n=>n,{ImageClass:FakeImage});
 const a=load('hero'),b=load('hero');assert.equal(a,b);await a;assert.equal(requests,2);
 assert.equal(await load('hero'),cache.get('hero'));assert.equal(requests,2);
});
test('a stalled optional background cannot block the hero and can be retried later',async()=>{
 class FakeImage {set src(v){if(v==='hero')queueMicrotask(()=>this.onload?.());}}
 const cache=new Map(),load=createImageLoader(cache,n=>n,{ImageClass:FakeImage,timeout:5,attempts:2});
 const stalled=assert.rejects(load('background'),/Timeout/);
 await load('hero');assert.ok(cache.has('hero'));await stalled;
 await assert.rejects(load('background'),/Timeout/);
});
