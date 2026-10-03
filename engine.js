export const DURATION = { entrance:2600, fight:2400, special:3600 };
// One action at a time. There is deliberately no queue for a child's repeated taps.
export class GameEngine {
  constructor(){this.hero=0;this.action=null;this.started=0;this.follow=false;this.waiting=null;this.monster=false;this.active=false;this.lastRequest=-Infinity;}
  select(index){this.hero=index;this.cancel();}
  cancel(){this.action=null;this.waiting=null;this.started=0;this.lastRequest=-Infinity;}
  request(move, now){
    if(!this.active || !(move in DURATION)) return 'ignored';
    if(this.action===move || this.waiting?.move===move) return 'repeat';
    if(now-this.lastRequest<220) return 'ignored';
    this.lastRequest=now;
    if(this.action && now-this.started<600) return 'busy';
    this.action=null;
    if(this.follow){this.waiting={move,at:now};return 'countdown';}
    this.waiting=null;this.action=move;this.started=now;return 'started';
  }
  tick(now){
    if(!this.active)return {phase:'paused',progress:0,count:0};
    if(this.waiting){const count=3-Math.floor((now-this.waiting.at)/1000);if(count>0)return {phase:'countdown',count,progress:0};this.action=this.waiting.move;this.waiting=null;this.started=now;return {phase:'prepare',count:0,progress:0,justStarted:true};}
    if(!this.action)return {phase:'idle',progress:0,count:0};
    const progress=Math.min(1,Math.max(0,(now-this.started)/DURATION[this.action]));
    if(progress===1){this.action=null;return {phase:'idle',progress:0,count:0,finished:true};}
    return {progress,count:0,phase:progress<.28?'prepare':progress<.76?'release':'recover'};
  }
  pause(){this.active=false;this.cancel();}
}
