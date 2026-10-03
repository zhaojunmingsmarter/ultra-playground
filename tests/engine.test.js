import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine,DURATION} from '../engine.js';

test('repeated taps never queue or extend an action',()=>{
 const e=new GameEngine();e.active=true;e.request('special',100);
 for(let i=0;i<30;i++)assert.equal(e.request('special',200+i*50),'repeat');
 assert.equal(e.started,100);assert.equal(e.tick(100+DURATION.special).finished,true);
 assert.equal(e.action,null);assert.equal(e.tick(10000).phase,'idle');
});
test('switching hero cancels the current action and countdown',()=>{
 const e=new GameEngine();e.active=true;e.follow=true;e.request('fight',0);e.select(2);
 assert.equal(e.tick(5000).phase,'idle');assert.equal(e.hero,2);assert.equal(e.waiting,null);
});
test('follow mode starts exactly after three seconds',()=>{
 const e=new GameEngine();e.active=true;e.follow=true;e.request('fight',100);
 assert.equal(e.tick(100).count,3);assert.equal(e.tick(1100).count,2);assert.equal(e.tick(2100).count,1);
 assert.equal(e.tick(3099).count,1);assert.equal(e.tick(3100).justStarted,true);assert.equal(e.action,'fight');
});
test('a new move cannot interrupt the initial feedback, but can replace later',()=>{
 const e=new GameEngine();e.active=true;e.request('entrance',0);
 assert.equal(e.request('fight',300),'busy');assert.equal(e.action,'entrance');
 assert.equal(e.request('fight',700),'started');assert.equal(e.action,'fight');
});
test('backgrounding cancels all pending actions and requires deliberate resume',()=>{
 const e=new GameEngine();e.active=true;e.follow=true;e.request('special',0);e.pause();
 assert.equal(e.tick(10000).phase,'paused');assert.equal(e.request('fight',11000),'ignored');
 e.active=true;assert.equal(e.tick(12000).phase,'idle');
});
