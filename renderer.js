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
    this.w=1000;this.h=450;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  draw(now,engine,state,cache){
    const c=this.c,w=this.w,h=this.h,hero=this.heroes[engine.hero],atlas=cache.get('ultra-atlas-v2.png');
    this.background(cache.get('city.png'));
    if(engine.action){const shade=Math.sin(clamp(state.progress)*Math.PI)*.2;c.fillStyle=`rgba(6,19,49,${shade})`;c.fillRect(0,0,w,h);}
    if(!atlas)return;
    const p=state.progress||0,move=engine.action,ground=h*.91;
    const bh=Math.min(h*.72,w*.62,470),baseX=w*(engine.monster?.40:.52);
    let x=baseX,feet=ground,pose=0,blend=0;
    const idleBob=this.reduced?0:Math.sin(now/550)*1.8;
    if(move==='fight'){
      blend=clamp((p-.20)/.09)*clamp((.85-p)/.09);pose=1;
      if(!this.reduced){const dash=ease(clamp((p-.20)/.2))*(1-ease(clamp((p-.67)/.28)));x+=dash*Math.min(w*.24,210);feet-=Math.sin(p*Math.PI)*bh*.16;}
    }
    if(move==='special'){blend=clamp((p-.17)/.1)*clamp((.90-p)/.14);pose=2;}
    if(move==='entrance'){
      const strength=Math.sin(p*Math.PI);c.save();c.globalCompositeOperation='screen';
      const pillar=c.createLinearGradient(0,0,0,ground);pillar.addColorStop(0,hero.color+'00');pillar.addColorStop(.6,hero.color+'44');pillar.addColorStop(1,'#ffffffaa');c.globalAlpha=strength;c.fillStyle=pillar;c.fillRect(x-bh*.21,0,bh*.42,ground);
      for(let i=0;i<4;i++){c.strokeStyle=i%2?'#fff3c9':hero.color;c.lineWidth=2;c.beginPath();c.ellipse(x,ground-bh*((p*1.2+i/4)%1),bh*(.36+i*.03),bh*.08,0,0,Math.PI*2);c.stroke();}c.restore();
      if(!this.reduced)feet-=Math.sin(p*Math.PI)*bh*.06;
      this.aura(x,feet-bh*.5,bh*.7,hero.color,Math.sin(p*Math.PI));
      c.save();c.globalAlpha=Math.sin(p*Math.PI)*.7;c.strokeStyle=hero.color;c.lineWidth=3;
      c.beginPath();c.ellipse(x,ground-8,bh*(.25+p*.3),bh*.085,0,0,Math.PI*2);c.stroke();c.restore();
      for(let i=0;i<10;i++){const a=i*Math.PI/5+p*2;star(c,x+Math.cos(a)*bh*.5,feet-bh*.5+Math.sin(a)*bh*.5,5*Math.sin(p*Math.PI),'#fff0bb',a);}
    }
    ellipse(c,baseX,ground-3,bh*.25,bh*.045,'#12355333');
    if(move==='fight'&&blend>.1&&!this.reduced){
      for(let i=4;i>0;i--)this.sprite(atlas,hero,1,x-i*20,feet+i*3,bh,.055*(5-i)*blend);
    }
    let rect;
    if(blend<1)this.sprite(atlas,hero,0,x,feet+idleBob,bh,1-blend);
    if(blend>0)rect=this.sprite(atlas,hero,pose,x,feet,bh,blend);
    else rect={x:x-bh*.4,y:feet-bh,w:bh*.8,h:bh};
    if(move==='special' && p<.30)this.charge(rect,hero,p,now);
    const reaction=(move==='special'||move==='fight')&&p>.40&&p<.91?Math.sin((p-.40)/.51*Math.PI):0;
    if(engine.monster)this.monster(cache.get('monster.png'),w*.78,ground,bh*.62,reaction,now);
    if(move==='special'){this.beam(rect,hero,p,now);if(engine.monster&&p>.40&&p<.84)this.burst(w*.79,ground-bh*.40,bh*.32,hero.color,(p-.40)/.44);}
    if(move==='fight'&&p>.30&&p<.65){
      const impact=Math.sin((p-.30)/.35*Math.PI);
      this.burst(rect.x+rect.w*.91,rect.y+rect.h*.43,bh*.30,'#ffdf8b',(p-.30)/.35);
      c.save();c.globalAlpha=impact*.7;c.strokeStyle='#fff3bb';c.shadowColor=hero.color;c.shadowBlur=12;c.lineWidth=7;c.beginPath();c.ellipse(x,feet-bh*.46,bh*.55,bh*.29,-.3,-1.8,1.2);c.stroke();c.restore();
      if(!this.reduced){c.save();c.globalAlpha=impact*.5;c.strokeStyle='#fff4cf';c.lineWidth=3;for(let i=0;i<3;i++){c.beginPath();c.moveTo(rect.x-20,rect.y+rect.h*(.45+i*.12));c.lineTo(rect.x-60,rect.y+rect.h*(.45+i*.12));c.stroke();}c.restore();}
    }
    if(state.phase==='recover'){
      const a=Math.sin((p-.76)/.24*Math.PI);
      for(let i=0;i<5;i++)star(c,x+Math.cos(i*1.8)*bh*.4,feet-bh*.8-i*8,Math.max(0,a)*6,'#ffe69a',i+now/600);
    }
  }
}
