import test from 'node:test';
import assert from 'node:assert/strict';
import {MONSTERS,worldState} from '../world.js';
import {readFile,stat} from 'node:fs/promises';
import {VOICES} from '../voices.js';
test('four distinct monsters are available and scene events change over time',()=>{
 assert.equal(new Set(MONSTERS.map(m=>m.name)).size,4);
 for(let scene=0;scene<3;scene++){
  const a=worldState(0,scene),b=worldState(12000,scene);assert.notEqual(a.ship,b.ship);assert.notEqual(a.night,b.night);
  for(let t=0;t<200000;t+=1000){const s=worldState(t,scene);for(const key of ['night','ship','boat','animal','meteor'])assert.ok(s[key]>=0&&s[key]<=1);}
 }
});
test('all character samples are local, nonempty, small and separately mapped',async()=>{
 assert.equal(new Set(Object.values(VOICES)).size,4);
 for(const path of Object.values(VOICES)){const info=await stat(path);assert.ok(info.size>1000&&info.size<40000);}
 const source=await readFile('audio.js','utf8');assert.ok(!source.includes('speechSynthesis'));assert.ok(!source.includes('SpeechSynthesisUtterance'));
});
