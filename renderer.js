import {LivingWorld,drawKaiju,MONSTERS} from './world.js';
const clamp = (v,min=0,max=1) => Math.max(min,Math.min(max,v));
const ease = t => t*t*(3-2*t);
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function star(c,x,y,r,color,rotation=0){
  c.save();c.translate(x,y);c.rotate(rotation);c.fillStyle=color;c.beginPath();
  for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,rr=r*(i%2?.43:1);if(i)c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);else c.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}
  c.closePath();c.fill();c.restore();
}
export function drawPortrait(canvas,hero,atlas,full=false){
  const c=canvas.getContext('2d');canvas.width=full?300:180;canvas.height=full?400:150;
  const [sx,sy,sw,sh]=hero.poses[0];
  if(full){const scale=Math.min(canvas.width/sw,canvas.height/sh);c.drawImage(atlas,sx,sy,sw,sh,(canvas.width-sw*scale)/2,canvas.height-sh*scale,sw*scale,sh*scale);}
  else {const cropH=sh*.5;const scale=Math.min(canvas.width/sw,canvas.height/cropH);c.drawImage(atlas,sx,sy,sw,cropH,(canvas.width-sw*scale)/2,0,sw*scale,cropH*scale);}
}
export class StageRenderer {
  constructor(canvas,heroes){
    this.canvas=canvas;this.c=canvas.getContext('2d');this.heroes=heroes;
    this.world=new LivingWorld();this.w=1000;this.h=450;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);this.resize();
  }
  resize(){const r=this.canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);this.w=r.width;this.h=r.height;this.canvas.width=Math.round(r.width*d);this.canvas.height=Math.round(r.height*d);this.c.setTransform(d,0,0,d,0,0);}
  background(image){
    const c=this.c,w=this.w,h=this.h;c.fillStyle='#153655';c.fillRect(0,0,w,h);
    if(image){const scale=Math.max(w/image.width,h/image.height);c.drawImage(image,(w-image.width*scale)/2,(h-image.height*scale)/2,image.width*scale,image.height*scale);}
    const shade=c.createLinearGradient(0,0,0,h);shade.addColorStop(0,'#06295c77');shade.addColorStop(.4,'#0c2c4300');shade.addColorStop(1,'#113b6138');c.fillStyle=shade;c.fillRect(0,0,w,h);
  }
  sprite(atlas,hero,pose,x,feet,bodyHeight,alpha=1){
    const c=this.c,rect=hero.poses[pose];
    // Preserve head size between standing and airborne poses rather than stretching.
    const scale=bodyHeight/hero.poses[0][3],dw=rect[2]*scale,dh=rect[3]*scale;
    c.save();c.globalAlpha=clamp(alpha);c.drawImage(atlas,...rect,x-dw/2,feet-dh,dw,dh);c.restore();
    return {x:x-dw/2,y:feet-dh,w:dw,h:dh};
  }
  aura(x,y,r,color,amount){
    if(amount<=0)return;const c=this.c;c.save();c.globalAlpha=clamp(amount)*.65;
    const g=c.createRadialGradient(x,y,1,x,y,r);g.addColorStop(0,color+'bb');g.addColorStop(.55,color+'55');g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore();
  }
  monster(image,x,ground,size,reaction,now){
    if(!image)return;const c=this.c,half=image.width/2;
    const pose=reaction>.1?1:0,scale=size/image.height;
    c.save();c.translate(x+reaction*size*.13,ground);c.rotate(reaction*.14);
    const bounce=this.reduced?0:Math.sin(now/400)*2;
    c.drawImage(image,pose*half+15,0,half-30,image.height,-half*scale/2,-size+bounce,half*scale,size);c.restore();
    if(reaction>.1){star(c,x-size*.2,ground-size,10,'#ffe39b',now/650);star(c,x+size*.2,ground-size*1.1,7,'#fff5c9',-now/700);}
  }
  ring(x,y,r,color,alpha=1,tilt=0){
    const c=this.c;c.save();c.globalAlpha=clamp(alpha);c.strokeStyle=color;c.shadowColor=color;c.shadowBlur=12;c.lineWidth=2.5;
    c.beginPath();c.ellipse(x,y,r*.36,r,tilt,0,Math.PI*2);c.stroke();c.restore();
  }
  burst(x,y,r,color,p){
    if(p<=0||p>=1)return;const c=this.c,amount=Math.sin(p*Math.PI);
    this.aura(x,y,r*1.6,color,amount);
    c.save();c.globalAlpha=1-p;c.strokeStyle=color;c.lineWidth=3;c.beginPath();c.arc(x,y,r*p,0,Math.PI*2);c.stroke();
    const count=this.reduced?8:22;
    for(let i=0;i<count;i++){const a=i*Math.PI*2/count,dist=r*(.25+p)*( .7+(i%3)*.12);star(c,x+Math.cos(a)*dist,y+Math.sin(a)*dist,(3+i%4)*(1-p),i%3===0?'#ffffff':color,a+p);}
    c.restore();
  }
  charge(rect,hero,p,now){
    const x=rect.x+rect.w*hero.origin[0],y=rect.y+rect.h*hero.origin[1],size=this.h*.16;
    const amount=clamp(p/.27);this.aura(x,y,size,hero.color,amount);
    for(let i=0;i<3;i++)this.ring(x,y,size*(1-amount*.65)+i*8,hero.color,amount*.8,now/900+i*Math.PI/3);
    const count=this.reduced?8:20;
    for(let i=0;i<count;i++){const a=i*2.4+now/1500,r=size*(1-((p*3+i/count)%1));star(this.c,x+Math.cos(a)*r,y+Math.sin(a)*r,(2+i%3)*amount,'#fff7ce',a);}
  }
  beam(rect,hero,p,now){
    const c=this.c,x=rect.x+rect.w*hero.origin[0],y=rect.y+rect.h*hero.origin[1],w=this.w;
    const ramp=clamp((p-.28)/.1)*clamp((.78-p)/.12);if(ramp<=0)return;
    const end=x+(w*.99-x)*ease(clamp((p-.28)/.1)),thickness=Math.max(16,this.h*.082)*ramp;
    const palette=hero.id==='taro'?['#ffc760','#ff96aa','#bca8ff','#8ffff0']:[hero.color,'#d9f8ff','#fff9dc'];
    c.save();c.globalCompositeOperation='screen';
    // Soft outer envelope, saturated inner energy, and a luminous central core.
    for(let layer=3;layer>0;layer--){const width=thickness*(.45+layer*.48);c.globalAlpha=layer===3?.13:layer===2?.35:.85;c.fillStyle=palette[(layer-1)%palette.length];c.shadowColor=hero.color;c.shadowBlur=layer*8;
      c.beginPath();c.moveTo(x,y-width*.12);c.lineTo(end,y-width);c.quadraticCurveTo(end+12,y,end,y+width);c.lineTo(x,y+width*.12);c.closePath();c.fill();}
    c.globalAlpha=.92;c.shadowBlur=15;c.strokeStyle='#fffef2';c.lineWidth=thickness*.33;c.lineCap='round';c.beginPath();c.moveTo(x,y);c.lineTo(end,y);c.stroke();
    c.shadowBlur=0;
    // Traveling spiral ribbons give each hero a different energy signature.
    for(let j=0;j<(hero.id==='taro'?4:2);j++){c.strokeStyle=palette[j%palette.length];c.lineWidth=2;c.globalAlpha=.8;c.beginPath();for(let n=0;n<=44;n++){const u=n/44,xx=x+(end-x)*u,yy=y+Math.sin(u*15-now/130+j*Math.PI/2)*thickness*.72*u;if(n)c.lineTo(xx,yy);else c.moveTo(xx,yy);}c.stroke();}
    c.restore();
    this.aura(x,y,thickness*2.4,hero.color,ramp);
    for(let i=0;i<4;i++){const u=(now/1000+i/4)%1;this.ring(x+(end-x)*u,y,thickness*(.65+u*.7),palette[i%palette.length],ramp*(1-u)*.65);}
    if(hero.id==='zero')for(let i=0;i<2;i++){const u=(now/900+i*.5)%1;c.save();c.translate(x+(end-x)*u,y+(i?1:-1)*thickness*1.5);c.rotate(now/140);c.strokeStyle='#d6ffff';c.lineWidth=5;c.shadowBlur=12;c.shadowColor='#6eeaff';c.beginPath();c.arc(0,0,16,0,Math.PI*1.35);c.stroke();c.restore();}
    for(let i=0;i<(this.reduced?8:24);i++){const u=((now/650+i/24)%1);star(c,x+(end-x)*u,y+Math.sin(i*5+now/320)*thickness*(1.2+u),2+i%3,palette[i%palette.length],now/500);}
  }
  combat(atlas,row,col,x,feet,bh,alpha=1){
    const c=this.c,cell=atlas.width/4;
    // Each cell retains its full silhouette; identical cell scale keeps poses consistent.
    const [sx,sw]=[[35,310],[430,200],[665,235],[930,324]][col],scale=bh*1.1/cell;
    c.save();c.globalAlpha=alpha;c.drawImage(atlas,sx,row*cell,sw,cell,x-sw*scale/2,feet-bh*1.1,sw*scale,bh*1.1);c.restore();
  }
  environment(now,scene){
    const c=this.c,w=this.w,h=this.h,t=this.reduced?0:now/1000;
    c.save();c.globalCompositeOperation='screen';
    for(let i=0;i<32;i++){
      const x=((i*137.7+t*(scene===1?8:20))%w),y=((i*71.3-t*(scene===2?14:7))%h+h)%h;
      c.globalAlpha=.15+.3*(.5+.5*Math.sin(t+i));
      if(scene===1)star(c,x,y,2+i%3,'#c2eaff',t*.2);
      else {c.fillStyle=scene===2?'#ffda87':'#c4faff';c.fillRect(x,y,scene===2?4:2,2);}
    }
    if(scene===1){for(let i=0;i<3;i++)this.ring(w*.25,h*.28,h*(.16+i*.04),'#91caff',.18,t*.12+i*.8);}
    c.restore();
  }
  slash(x,y,r,color,angle,amount){
    const c=this.c;c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha=clamp(amount);c.shadowColor=color;c.shadowBlur=22;
    for(let i=0;i<3;i++){c.strokeStyle=i===2?'#fffbe6':color;c.lineWidth=(17-i*6);c.beginPath();c.ellipse(0,0,r,r*.45,0,-2.3,.85);c.stroke();}c.restore();
  }
  draw(now,engine,state,cache){
    const c=this.c,w=this.w,h=this.h,hero=this.heroes[engine.hero],atlas=cache.get('ultra-atlas-v2.webp'),combat=cache.get('combat.webp');
    const move=engine.action,p=state.progress||0,scene=engine.scene||0;
    this.background(cache.get(['city.webp','space.webp','canyon.webp'][scene]));
    this.world.draw(c,w,h,now,scene,cache.get('world-props.webp'),move==='ultimate'?Math.sin(p*Math.PI):0,this.reduced);this.environment(now,scene);
    this.hitIndex=-1;this.monsterCue=null;if(!atlas)return;
    const timings={punch:[.30,.43,.57],fight:[.43],uppercut:[.40],spin:[.32,.48,.64],special:[.40,.51,.62],ultimate:[.47,.55,.63,.71,.79]};
    const hits=timings[move]||[];
    let impact=0,hit=-1,age=1;
    hits.forEach((at,i)=>{if(p>=at){hit=i;age=p-at;}});
    this.hitIndex=hit;
    if(hit>=0)impact=clamp(1-age/.09);
    // Quantize only the initial impact frames for a brief arcade hit-stop.
    let q=p;if(hit>=0&&age<.022)q=hits[hit];
    const ground=h*.92,bh=Math.min(h*.67,w*.40,440),baseX=w*.30;
    const ultimate=move==='ultimate';
    if(ultimate||move==='special'){c.fillStyle=`rgba(8,10,42,${Math.sin(p*Math.PI)*(ultimate?.73:.32)})`;c.fillRect(0,0,w,h);}
    c.save();if(!this.reduced&&impact>0)c.translate(Math.sin(now*.12)*impact*(ultimate?6:3),Math.cos(now*.1)*impact*2);
    let x=baseX,feet=ground,pose=0,col=-1;
    const attack=['punch','fight','uppercut','spin'].includes(move);
    const dash=ease(clamp((q-.15)/.15))*(1-ease(clamp((q-.72)/.23)));
    if(attack){x+=w*.29*dash;pose=1;
      if(move==='punch'){col=0;x+=Math.sin(q*60)*bh*.025*dash;}
      if(move==='fight')feet-=Math.sin(clamp((q-.12)/.8)*Math.PI)*bh*.28;
      if(move==='uppercut'){col=1;feet-=Math.sin(clamp((q-.20)/.62)*Math.PI)*bh*.22;}
      if(move==='spin'){col=3;feet-=Math.sin(clamp((q-.12)/.8)*Math.PI)*bh*.23;}
    }
    if(move==='shield')col=2;
    if(move==='special'||ultimate)pose=2;
    if(move==='entrance'){feet-=Math.sin(p*Math.PI)*bh*.16;this.aura(x,feet-bh*.5,bh,hero.color,Math.sin(p*Math.PI));
      c.save();c.globalCompositeOperation='screen';const g=c.createLinearGradient(0,0,0,ground);g.addColorStop(0,hero.color+'00');g.addColorStop(1,hero.color+'aa');c.fillStyle=g;c.globalAlpha=Math.sin(p*Math.PI);c.fillRect(x-bh*.3,0,bh*.6,ground);c.restore();
      for(let i=0;i<5;i++)this.ring(x,ground-bh*((p+i/5)%1),bh*.42,hero.color,Math.sin(p*Math.PI),Math.PI/2);
    }
    ellipse(c,x,ground,bh*.3,bh*.05,'#0b1d4b55');
    if(engine.monster){
      const kind=engine.monsterKind||0,arrival=clamp((now-engine.monsterChanged)/650),mx=w*.81+impact*w*.025;
      const cycle=(now/1000+kind*1.7)%9,attacking=!move&&cycle>6.3&&cycle<8.2;
      const lift=move==='uppercut'&&p>.4?Math.sin(clamp((p-.4)/.5)*Math.PI)*bh*.25:0;
      const wobble=!move&&!this.reduced?Math.sin(now/1000+kind)*w*.012:0;
      ellipse(c,mx+wobble,ground,bh*.21,bh*.033,'#12264e44');
      if(kind&&cache.get('kaiju-atlas.webp'))drawKaiju(c,cache.get('kaiju-atlas.webp'),kind,mx+wobble,ground-lift,bh*.76,impact,now,arrival,attacking,this.reduced);
      else this.monster(cache.get('monster.webp'),mx+wobble,ground-lift,bh*.70,impact,now);
      if(arrival<1)this.ring(mx,ground-bh*.37,bh*.48,MONSTERS[kind].color,1-arrival);
      if(attacking){
        this.monsterCue=`${kind}:${Math.floor((now/1000+kind*1.7)/9)}`;
        const shot=clamp((cycle-6.3)/1.9),xx=mx-(mx-baseX-bh*.24)*shot,yy=ground-bh*.43-Math.sin(shot*Math.PI)*bh*.15;
        this.aura(xx,yy,bh*.13,MONSTERS[kind].color,.8);
        if(kind===3){c.save();c.strokeStyle='#fff1a2';c.lineWidth=3;c.beginPath();for(let i=0;i<7;i++){const x=xx+i*5-15,y=yy+Math.sin(i*2+now/80)*10;i?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();c.restore();}
        else this.ring(xx,yy,bh*.075,MONSTERS[kind].color,.85,now/300);
        if(shot>.75)this.burst(baseX+bh*.24,ground-bh*.43,bh*.22,'#b4f1ff',(shot-.75)/.25);
      }
      if(impact>.12){star(c,mx-bh*.13,ground-bh*.84,7,'#ffe49e',now/700);star(c,mx+bh*.14,ground-bh*.79,5,'#fff9d2',now/600);}
    }
    const active=move&&p>.15&&p<.88;
    if(attack&&active&&!this.reduced){for(let i=5;i>0;i--){if(col>=0&&combat)this.combat(combat,engine.hero,col,x-i*bh*.08,feet+i*3,bh,.045*(6-i));else this.sprite(atlas,hero,pose,x-i*bh*.08,feet+i*3,bh,.045*(6-i));}}
    let rect;
    if(col>=0&&combat&&active){this.combat(combat,engine.hero,col,x,feet,bh);rect={x:x-bh*.5,y:feet-bh,w:bh,h:bh};}
    else rect=this.sprite(atlas,hero,active?pose:0,x,feet+(move?0:Math.sin(now/550)*2),bh);
    if(move==='shield'){
      const a=Math.sin(p*Math.PI);this.aura(x+bh*.3,feet-bh*.48,bh*.65,'#83eeff',a*.65);
      for(let i=0;i<3;i++)this.ring(x+bh*.28,feet-bh*.46,bh*(.5+i*.04),'#b2faff',a*(1-i*.2),0);
      this.burst(x+bh*.52,feet-bh*.5,bh*.35,'#ffffff',(p*3)%1);
    }
    if(move==='special'||ultimate){
      if(p<.30)this.charge(rect,hero,p,now);
      if(!ultimate||p>=.38)this.beam(rect,hero,ultimate?(.28+clamp((p-.38)/.48)*.48):p,now);
      if(ultimate&&p<.38){
        const a=Math.sin(clamp(p/.38)*Math.PI);c.save();c.globalAlpha=a;c.fillStyle='#111b4fe6';c.beginPath();c.moveTo(0,h*.15);c.lineTo(w,h*.06);c.lineTo(w,h*.49);c.lineTo(0,h*.58);c.fill();
        this.sprite(atlas,hero,2,w*.32,h*.95,bh*1.55,a);c.font=`900 ${Math.max(24,h*.09)}px sans-serif`;c.fillStyle='#fff3b0';c.shadowColor=hero.color;c.shadowBlur=20;c.fillText('超级必杀',w*.55,h*.34);c.restore();
      }
      if(ultimate&&p>.4){for(let i=0;i<6;i++)this.ring(w*(.35+i*.12),ground-bh*.55,bh*(.23+Math.sin(now/160+i)*.05),hero.color,.5);}
    }
    if(attack&&active){
      if(move==='uppercut')this.slash(x,feet-bh*.4,bh*.7,hero.color,-1.3,Math.sin(p*Math.PI));
      else if(move==='spin')this.slash(x,feet-bh*.48,bh*.68,hero.color,now/120,Math.sin(p*Math.PI));
      else this.slash(x+bh*.25,feet-bh*.5,bh*.43,'#ffe3a3',-.3,impact);
      if(!this.reduced){c.save();c.strokeStyle=hero.color;c.globalAlpha=dash*.45;c.lineWidth=3;for(let i=0;i<8;i++){const y=feet-bh*(.15+i*.1);c.beginPath();c.moveTo(x-bh*.5,y);c.lineTo(x-bh*(.8+(i%3)*.18),y);c.stroke();}c.restore();}
    }
    if(hit>=0&&age<.16){
      const ix=engine.monster?w*.79:x+bh*.45,iy=ground-bh*.46;
      this.burst(ix,iy,bh*(ultimate?.85:.52),hero.color,clamp(age/.16));
      this.slash(ix,iy,bh*.38,'#fff0a8',-.7,impact);
      this.slash(ix,iy,bh*.28,'#ffffff',1.2,impact);
      if(impact>.6)this.aura(ix,iy,bh*.4,'#fff3c1',impact);
    }
    if(hit>=0&&hits.length>1){c.save();c.font=`900 ${Math.max(24,h*.10)}px sans-serif`;c.textAlign='right';c.fillStyle='#ffe18b';c.strokeStyle='#513178';c.lineWidth=5;c.strokeText(`${hit+1} 连击`,w*.94,h*.32);c.fillText(`${hit+1} 连击`,w*.94,h*.32);c.restore();}
    c.restore();
  }
}
