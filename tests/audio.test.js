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
