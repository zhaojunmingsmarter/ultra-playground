import test from 'node:test';
import assert from 'node:assert/strict';
import {GameAudio} from '../audio.js';
import {HoldGate} from '../hold-gate.js';

test('parent gate rejects short taps and fires once after two seconds',()=>{
 let callback,delay,opened=0,cancelled=0;
 const gate=new HoldGate(()=>opened++,(fn,ms)=>{callback=fn;delay=ms;return 1;},()=>{callback=null;cancelled++;});
 gate.start();assert.equal(delay,2000);gate.cancel();assert.equal(opened,0);assert.equal(callback,null);assert.equal(cancelled,1);
 gate.start();gate.start();callback();assert.equal(opened,1);assert.equal(gate.timer,null);
});
test('music scheduler stays silent when disabled and never bursts after a stall',()=>{
 const a=new GameAudio();let notes=0;
 a.ctx={currentTime:10,state:'running'};a.music={gain:{setTargetAtTime(){}}};a.running=true;a.next=0;a.note=()=>notes++;
 a.settings.music=false;a.schedule();assert.equal(notes,0);assert.ok(a.next>10);
 a.settings.music=true;a.step=0;a.next=10;a.schedule();assert.ok(notes>0&&notes<5);
});
test('paused or muted effects do not create oscillator nodes',()=>{
 const a=new GameAudio();a.ctx={currentTime:0};let notes=0;a.note=()=>notes++;
 a.effect('beam');assert.equal(notes,0);a.running=true;a.settings.effects=false;a.effect('beam');assert.equal(notes,0);
 a.settings.effects=true;a.effect('beam');assert.equal(notes,2);
});
test('switching actions stops every existing effect',()=>{
 const a=new GameAudio();let stopped=0;a.fxNodes.add({stop(){stopped++;}});a.fxNodes.add({stop(){stopped++;}});
 a.stopEffects();assert.equal(stopped,2);assert.equal(a.fxNodes.size,0);
});

test('each hero plays its own decoded buffer, and selection stops the previous voice',async()=>{
 const a=new GameAudio(),started=[];let stopped=0;
 const param={setValueAtTime(){},linearRampToValueAtTime(){}};
 a.ctx={currentTime:0,createGain:()=>({gain:param,connect(){return this;},disconnect(){}}),createBufferSource:()=>({connect(){return this;},disconnect(){},start(){started.push(this.buffer.hero);},stop(){stopped++;}})};
 a.fx={};a.running=true;
 for(const hero of ['tiga','zero','taro','original'])a.voiceBuffers.set(hero,{hero,duration:.9});
 for(const hero of ['tiga','zero','taro','original'])assert.equal(await a.voice(hero),true);
 assert.deepEqual(started,['tiga','zero','taro','original']);assert.equal(stopped,3);
 a.stopEffects();assert.equal(stopped,4);assert.equal(a.voiceNodes.size,0);
});
test('late audio downloads never speak after cancellation or backgrounding',async()=>{
 const a=new GameAudio();a.running=true;let finish;
 a.loadVoice=()=>new Promise(resolve=>finish=resolve);
 const pending=a.voice('tiga');a.stopVoice();a.running=false;finish({duration:1});
 assert.equal(await pending,false);
});
test('every move has distinct release sound scheduling without system speech',()=>{
 const a=new GameAudio();a.running=true;a.ctx={currentTime:0};const signatures=[];
 let events=[];a.note=(...args)=>events.push(['note',...args]);a.noise=(...args)=>events.push(['noise',...args]);a.voice=(...args)=>events.push(['voice',...args]);
 for(const move of ['entrance','punch','fight','uppercut','spin','shield','special','ultimate']){events=[];a.move(move,'tiga','release');assert.ok(events.some(x=>x[0]==='voice'));assert.ok(events.some(x=>x[0]==='note'||x[0]==='noise'));signatures.push(JSON.stringify(events));}
 assert.ok(new Set(signatures).size>=7);
});

test('repeated use of the same move alternates actual buffer playback duration, rate and rhythm',async()=>{
 const a=new GameAudio(),events=[];a.running=true;a.fx={};
 const param={setValueAtTime(){},linearRampToValueAtTime(){}};
 a.ctx={currentTime:0,createGain:()=>({gain:param,connect(){return this;}}),createBufferSource:()=>({playbackRate:{value:1},connect(){return this;},start(...args){events.push([...args,this.playbackRate.value]);},stop(){}})};
 a.voiceBuffers.set('tiga',{duration:1.73});const signatures=[];
 for(let i=0;i<3;i++){events.length=0;await a.voice('tiga',false,'punch');signatures.push(JSON.stringify(events));}
 assert.equal(new Set(signatures).size,3);
});
