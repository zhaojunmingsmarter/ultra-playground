export const DURATION = { entrance:2600, fight:2400, special:3600, punch:2100, uppercut:2300, spin:2500, shield:2200, ultimate:4400 };
// One action at a time. There is deliberately no queue for a child's repeated taps.
export class GameEngine {
  constructor(){this.hero=0;this.action=null;this.started=0;this.follow=false;this.waiting=null;this.monster=true;this.monsterKind=1;this.monsterChanged=0;this.scene=0;this.active=false;this.lastRequest=-Infinity;this.hp=4;this.battleTime=0;this.lastTick=null;this.deadAt=null;this.attackAt=null;this.nextAttack=3500;this.attackSerial=0;this.hitAction=null;}
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
  nextMonster(now){
    this.monsterKind=(this.monsterKind+1)%4;this.monsterChanged=now;this.hp=4;this.deadAt=null;this.attackAt=null;this.nextAttack=this.battleTime+3200;this.hitAction=this.started;
  }
  battle(now){
    if(this.lastTick!==null)this.battleTime+=Math.max(0,now-this.lastTick);
    this.lastTick=now;
    if(this.deadAt!==null){if(this.battleTime-this.deadAt>=1900)this.nextMonster(now);return;}
    const contact={punch:.30,fight:.43,uppercut:.40,spin:.32,special:.40,ultimate:.47}[this.action];
    if(contact && this.hitAction!==this.started && now-this.started>=DURATION[this.action]*contact){
      this.hitAction=this.started;this.hp--;
      if(this.hp===0){this.deadAt=this.battleTime;this.attackAt=null;return;}
    }
    if(this.attackAt!==null && this.battleTime-this.attackAt>=1900){this.attackAt=null;this.nextAttack=this.battleTime+2800;}
    if(this.attackAt===null && this.battleTime>=this.nextAttack){this.attackAt=this.battleTime;this.attackSerial++;}
  }
  tick(now){
    if(!this.active)return {phase:'paused',progress:0,count:0};
    this.battle(now);
    if(this.waiting){const count=3-Math.floor((now-this.waiting.at)/1000);if(count>0)return {phase:'countdown',count,progress:0};this.action=this.waiting.move;this.waiting=null;this.started=now;return {phase:'prepare',count:0,progress:0,justStarted:true};}
    if(!this.action)return {phase:'idle',progress:0,count:0};
    const progress=Math.min(1,Math.max(0,(now-this.started)/DURATION[this.action]));
    if(progress===1){this.action=null;return {phase:'idle',progress:0,count:0,finished:true};}
    return {progress,count:0,phase:progress<.28?'prepare':progress<.76?'release':'recover'};
  }
  pause(){this.active=false;this.lastTick=null;this.cancel();}
}
