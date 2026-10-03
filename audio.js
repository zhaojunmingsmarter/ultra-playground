import { VOICES } from './voices.js';
const MELODY=[72,0,76,79,81,79,76,0,74,0,77,81,79,77,74,0,72,76,79,84,83,79,76,0,74,77,79,71,72,0,0,0];
const midi=n=>440*2**((n-69)/12);
export class GameAudio {
  constructor(){this.voiceTurns=new Map();this.moveTurns=0;this.ctx=null;this.timer=null;this.fxNodes=new Set();this.musicNodes=new Set();this.running=false;this.step=0;this.settings={music:true,effects:true,volume:.45};this.duckUntil=0;this.voiceToken=0;this.voiceNodes=new Set();this.voiceBuffers=new Map();this.voiceRequests=new Map();this.rawVoices=new Map();}
  async start(settings){
    this.settings=settings;
    try{if(!this.ctx){this.ctx=new (window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.music=this.ctx.createGain();this.fx=this.ctx.createGain();this.music.connect(this.master);this.fx.connect(this.master);this.limiter=this.ctx.createDynamicsCompressor();this.limiter.threshold.value=-12;this.limiter.knee.value=12;this.limiter.ratio.value=5;this.master.connect(this.limiter);this.limiter.connect(this.ctx.destination);}
      await this.ctx.resume();this.running=true;this.apply(settings);this.next=this.ctx.currentTime+.08;this.step=0;clearInterval(this.timer);this.timer=setInterval(()=>this.schedule(),80);this.schedule();this.preloadVoices();return true;
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
  preloadVoices(){
    return Promise.allSettled(Object.keys(VOICES).map(hero=>this.loadVoice(hero)));
  }
  async loadVoice(hero){
    if(this.voiceBuffers.has(hero))return this.voiceBuffers.get(hero);
    if(this.voiceRequests.has(hero))return this.voiceRequests.get(hero);
    const work=(async()=>{
      let bytes=this.rawVoices.get(hero);
      if(!bytes){
        const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
        try { const response=await fetch(VOICES[hero],{signal:controller.signal});if(!response.ok)throw new Error('Voice unavailable');bytes=await response.arrayBuffer();this.rawVoices.set(hero,bytes); }
        finally {clearTimeout(timer);}
      }
      if(!this.ctx)return null;
      const buffer=await this.ctx.decodeAudioData(bytes.slice(0));this.voiceBuffers.set(hero,buffer);return buffer;
    })().finally(()=>this.voiceRequests.delete(hero));
    this.voiceRequests.set(hero,work);return work;
  }
  async voice(hero,long=false,kind="selection"){
    if(!this.running||!this.settings.effects||!VOICES[hero])return false;
    this.stopVoice();const token=this.voiceToken;
    let buffer;try{buffer=await this.loadVoice(hero);}catch{return false;}
    if(!buffer||token!==this.voiceToken||!this.running||!this.settings.effects)return false;
    const turn=this.voiceTurns.get(hero)||0;this.voiceTurns.set(hero,turn+1);
    // Alternate short, double and sustained calls, with move-specific timing.
    const variant=turn%3;
    const profiles={punch:[.38,2,.25],fight:[.72,1,0],uppercut:[.58,1,0],spin:[.32,3,.23],shield:[.46,1,0],special:[1.25,1,0],ultimate:[1.9,1,0],entrance:[1.5,1,0],selection:[1.2,1,0]};
    const [length,repeats,gap]=profiles[kind]||profiles.selection;
    const rate=[1,.91,1.09][variant],duration=Math.min(buffer.duration,length*[1,.76,1.12][variant]);
    const count=variant===1 && repeats===1 && !long?2:repeats;
    const t=this.ctx.currentTime;
    for(let i=0;i<count;i++){
      const at=t+i*(gap||.29),offset=Math.min(Math.max(0,buffer.duration-duration),variant*.08);
      const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;
      if(source.playbackRate)source.playbackRate.value=rate+i*.035;
      const wall=duration/(rate+i*.035);
      gain.gain.setValueAtTime(.0001,at);gain.gain.linearRampToValueAtTime(.8,at+.012);gain.gain.setValueAtTime(.8,at+Math.max(.02,wall-.08));gain.gain.linearRampToValueAtTime(.0001,at+wall);
      source.connect(gain).connect(this.fx);this.voiceNodes.add(source);
      source.onended=()=>{this.voiceNodes.delete(source);source.disconnect();gain.disconnect();};
      source.start(at,offset,duration);this.duckUntil=at+wall;
    }
    this.onVoice?.(hero,`${kind}-${variant}`);return true;
  }
  stopVoice(){this.voiceToken++;for(const source of this.voiceNodes){try{source.stop();}catch{}}this.voiceNodes.clear();this.duckUntil=0;}
  noise(at,duration,volume,from=900,to=100,type='lowpass'){
    if(!this.ctx?.createBuffer)return;
    if(!this.noiseBuffer){this.noiseBuffer=this.ctx.createBuffer(1,this.ctx.sampleRate*2,this.ctx.sampleRate);const data=this.noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;}
    const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),gain=this.ctx.createGain();source.buffer=this.noiseBuffer;filter.type=type;filter.Q.value=.8;filter.frequency.setValueAtTime(from,at);filter.frequency.exponentialRampToValueAtTime(to,at+duration);
    gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(volume,at+.018);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
    source.connect(filter).connect(gain).connect(this.fx);this.fxNodes.add(source);source.onended=()=>{this.fxNodes.delete(source);source.disconnect();filter.disconnect();gain.disconnect();};source.start(at);source.stop(at+duration+.02);
  }
  move(kind,hero,phase){
    if(!this.running||!this.settings.effects||!this.ctx)return;
    const t=this.ctx.currentTime,tone=({tiga:1,zero:1.18,taro:.86,original:.94}[hero]||1)*[1,.88,1.12][this.moveTurns%3];
    if(phase==='prepare'){
      if(['special','ultimate','entrance','shield'].includes(kind)){this.effect('charge');if(kind==='ultimate')this.note(75,t,1,.18,this.fx,'triangle',210);}
      else this.noise(t,.22,.18,500,2400,'bandpass');
      return;
    }
    this.moveTurns++;
    this.voice(hero,['entrance','special','ultimate'].includes(kind),kind);
    if(kind==='punch'){for(let i=0;i<3;i++)this.noise(t+i*.26,.16,.25,2200,400,'bandpass');}
    if(kind==='fight'||kind==='uppercut'){this.noise(t,.48,.28,500,3500,'bandpass');this.note((kind==='uppercut'?170:230)*tone,t,kind==='uppercut'?.45:.32,.13,this.fx,'triangle',(kind==='uppercut'?1200:780)*tone);}
    if(kind==='spin'){for(let i=0;i<3;i++){this.noise(t+i*.26,.34,.18,1100,3200,'bandpass');this.note(400*tone,t+i*.26,.23,.065,this.fx,'sine',1200);}}
    if(kind==='shield'){[480,720,960].forEach((f,i)=>this.note(f*tone,t+i*.1,.6,.08,this.fx,'sine'));this.noise(t,.4,.09,2800,700,'bandpass');}
    if(kind==='special'||kind==='ultimate'){
      const start=t+(kind==='ultimate'?.42:0),length=kind==='ultimate'?1.55:1.35;
      this.noise(start,length,.27,3600,1200,'bandpass');
      for(let i=0;i<4;i++)this.note((160+i*80)*tone,start+i*.12,length-i*.15,.065,this.fx,i%2?'triangle':'sawtooth',80+i*40);
      this.note(58,start,.45,.22,this.fx,'sine',32);
    }
    if(kind==='entrance'){this.effect('hello');this.noise(t,.8,.14,300,2200,'bandpass');}
  }
  impact(move,index=0){
    if(!this.running||!this.settings.effects||!this.ctx)return;
    const t=this.ctx.currentTime;
    this.effect('hit');this.noise(t,move==='ultimate'?.34:.15,.26,move==='spin'?2300:1300,140);
    if(index>0)this.note(680+index*130,t,.14,.07,this.fx,'sine');
  }
  defeat(){
    if(!this.running||!this.settings.effects||!this.ctx)return;
    const t=this.ctx.currentTime;this.noise(t,.65,.2,800,90);
    [523,659,784,1047].forEach((f,i)=>this.note(f,t+.25+i*.14,.55,.12,this.fx,'sine'));
  }
  monster(kind=0){
    if(!this.running||!this.settings.effects||!this.ctx)return;
    const t=this.ctx.currentTime;
    if(kind===2){for(let i=0;i<4;i++)this.note(240+i*30,t+i*.085,.14,.1,this.fx,'square',170);}
    else if(kind===3){this.note(380,t,.35,.10,this.fx,'sawtooth',90);this.noise(t,.3,.08,1300,500,'bandpass');}
    else {this.note(kind===1?82:170,t,.45,.15,this.fx,'triangle',kind===1?125:240);this.noise(t,.35,.11,450,150);}
  }
  stopEffects(){for(const o of this.fxNodes){try{o.stop();}catch{}}this.fxNodes.clear();this.stopVoice();}
  pause(){this.running=false;clearInterval(this.timer);this.timer=null;this.stopEffects();for(const o of this.musicNodes){try{o.stop();}catch{}}this.musicNodes.clear();if(this.ctx)this.ctx.suspend().catch(()=>{});}
}
