const MELODY=[72,0,76,79,81,79,76,0,74,0,77,81,79,77,74,0,72,76,79,84,83,79,76,0,74,77,79,71,72,0,0,0];
const midi=n=>440*2**((n-69)/12);
export class GameAudio {
  constructor(){this.ctx=null;this.timer=null;this.fxNodes=new Set();this.musicNodes=new Set();this.running=false;this.step=0;this.settings={music:true,effects:true,volume:.45};this.duckUntil=0;this.voiceToken=0;}
  async start(settings){
    this.settings=settings;
    try{if(!this.ctx){this.ctx=new (window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.music=this.ctx.createGain();this.fx=this.ctx.createGain();this.music.connect(this.master);this.fx.connect(this.master);this.master.connect(this.ctx.destination);}
      await this.ctx.resume();this.running=true;this.apply(settings);this.next=this.ctx.currentTime+.08;this.step=0;clearInterval(this.timer);this.timer=setInterval(()=>this.schedule(),80);this.schedule();return true;
    }catch{return false;}
  }
  apply(settings){this.settings=settings;if(!this.ctx)return;this.master.gain.setTargetAtTime(settings.volume,this.ctx.currentTime,.04);this.music.gain.setTargetAtTime(settings.music?.23:0,this.ctx.currentTime,.08);this.fx.gain.setTargetAtTime(settings.effects?.7:0,this.ctx.currentTime,.04);if(!settings.effects)this.stopVoice();}
  note(freq,at,duration,gain,bus,type='sine',endFreq){
    if(!this.ctx)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain();const set=bus===this.music?this.musicNodes:this.fxNodes;o.type=type;o.frequency.setValueAtTime(freq,at);if(endFreq)o.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),at+duration);g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(gain,at+.025);g.gain.exponentialRampToValueAtTime(.0001,at+duration);o.connect(g).connect(bus);set.add(o);o.onended=()=>{set.delete(o);o.disconnect();g.disconnect();};o.start(at);o.stop(at+duration+.03);
  }
  schedule(){
    if(!this.running||this.ctx.state!=='running')return;const now=this.ctx.currentTime;this.music.gain.setTargetAtTime(this.settings.music?(now<this.duckUntil?.07:.23):0,now,.1);
    if(this.next<now-.5)this.next=now+.03;
    while(this.next<now+.22){const i=this.step%MELODY.length,at=this.next;
      if(this.settings.music){if(MELODY[i])this.note(midi(MELODY[i]),at,.48,.22,this.music,'triangle');if(i%4===0){const root=[48,53,48,55][Math.floor(i/8)];this.note(midi(root),at,.9,.19,this.music);this.note(midi(root+7),at,1.1,.07,this.music);}}
      this.step++;this.next+=.32;
    }
  }
  effect(kind){
    if(!this.running||!this.settings.effects||!this.ctx)return;const t=this.ctx.currentTime;
    if(kind==='tap')this.note(740,t,.12,.06,this.fx);
    if(kind==='charge'){this.note(190,t,.7,.15,this.fx,'sine',760);this.note(285,t,.6,.06,this.fx,'triangle',1140);}
    if(kind==='beam'){this.note(720,t,.65,.14,this.fx,'sawtooth',130);this.note(1080,t,.8,.08,this.fx,'triangle',200);}
    if(kind==='hit'){this.note(145,t,.17,.23,this.fx,'triangle',45);this.note(480,t,.13,.08,this.fx,'sine',110);}
    if(kind==='hello'){[523,659,784].forEach((f,i)=>this.note(f,t+i*.12,.35,.13,this.fx,'triangle'));}
    if(kind==='monster'){this.note(220,t,.19,.11,this.fx,'triangle',145);this.note(170,t+.2,.23,.1,this.fx,'triangle',240);}
    if(kind==='success'){[659,784,1047].forEach((f,i)=>this.note(f,t+i*.11,.35,.1,this.fx,'sine'));}
  }
  speak(text){
    if(!this.running||!this.settings.effects||!('speechSynthesis' in globalThis))return;
    this.stopVoice();const token=this.voiceToken,u=new SpeechSynthesisUtterance(text);u.lang='zh-CN';u.rate=.92;u.volume=this.settings.volume*.8;
    const voices=speechSynthesis.getVoices();const voice=voices.find(v=>v.lang==='zh-CN'&&v.localService)||voices.find(v=>v.lang==='zh-CN');if(voice)u.voice=voice;
    this.duckUntil=(this.ctx?.currentTime||0)+4;u.onend=u.onerror=()=>{if(token===this.voiceToken)this.duckUntil=0;};speechSynthesis.speak(u);
  }
  stopVoice(){this.voiceToken++;if('speechSynthesis' in globalThis)speechSynthesis.cancel();this.duckUntil=0;}
  stopEffects(){for(const o of this.fxNodes){try{o.stop();}catch{}}this.fxNodes.clear();this.stopVoice();}
  pause(){this.running=false;clearInterval(this.timer);this.timer=null;this.stopEffects();for(const o of this.musicNodes){try{o.stop();}catch{}}this.musicNodes.clear();if(this.ctx)this.ctx.suspend().catch(()=>{});}
}
