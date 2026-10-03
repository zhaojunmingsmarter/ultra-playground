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
  beam(rect,hero,p,now){
    const c=this.c,x=rect.x+rect.w*hero.origin[0],y=rect.y+rect.h*hero.origin[1],w=this.w;
    const ramp=clamp((p-.28)/.12)*clamp((.76-p)/.13);
    if(ramp<=0)return;
    const end=x+(w*.98-x)*ease(clamp((p-.28)/.13));
    const thickness=Math.max(8,this.h*.055)*ramp;
    c.save();c.globalAlpha=.9;c.shadowColor=hero.color;c.shadowBlur=18;
    const gradient=c.createLinearGradient(x,y,end,y);gradient.addColorStop(0,'#ffffff');gradient.addColorStop(.2,hero.color);gradient.addColorStop(1,hero.color+'99');
    c.fillStyle=gradient;c.beginPath();c.moveTo(x,y-thickness*.25);c.lineTo(end,y-thickness);c.quadraticCurveTo(end+10,y,end,y+thickness);c.lineTo(x,y+thickness*.25);c.closePath();c.fill();
    c.strokeStyle='#fffcea';c.lineWidth=thickness*.28;c.lineCap='round';c.beginPath();c.moveTo(x,y);c.lineTo(end,y);c.stroke();c.restore();
    this.aura(x,y,35,hero.color,ramp);
    for(let i=0;i<8;i++){const travel=((now/700+i/8)%1);star(c,x+(end-x)*travel,y+Math.sin(i*5+now/300)*thickness,2+i%3,'#fff2ac',now/400);}
  }
  draw(now,engine,state,cache){
    const c=this.c,w=this.w,h=this.h,hero=this.heroes[engine.hero],atlas=cache.get('ultra-atlas-v2.png');
    this.background(cache.get('city.png'));
    if(!atlas)return;
    const p=state.progress||0,move=engine.action,ground=h*.91;
    const bh=Math.min(h*.72,w*.62,470),baseX=w*(engine.monster?.40:.52);
    let x=baseX,feet=ground,pose=0,blend=0;
    const idleBob=this.reduced?0:Math.sin(now/550)*1.8;
    if(move==='fight'){
      blend=clamp((p-.20)/.09)*clamp((.85-p)/.09);pose=1;
      if(!this.reduced){x+=Math.sin(p*Math.PI)*Math.min(w*.12,100);feet-=Math.sin(p*Math.PI)*bh*.12;}
    }
    if(move==='special'){blend=clamp((p-.17)/.1)*clamp((.90-p)/.14);pose=2;}
    if(move==='entrance'){
      if(!this.reduced)feet-=Math.sin(p*Math.PI)*bh*.06;
      this.aura(x,feet-bh*.5,bh*.7,hero.color,Math.sin(p*Math.PI));
      c.save();c.globalAlpha=Math.sin(p*Math.PI)*.7;c.strokeStyle=hero.color;c.lineWidth=3;
      c.beginPath();c.ellipse(x,ground-8,bh*(.25+p*.3),bh*.085,0,0,Math.PI*2);c.stroke();c.restore();
      for(let i=0;i<10;i++){const a=i*Math.PI/5+p*2;star(c,x+Math.cos(a)*bh*.5,feet-bh*.5+Math.sin(a)*bh*.5,5*Math.sin(p*Math.PI),'#fff0bb',a);}
    }
    ellipse(c,baseX,ground-3,bh*.25,bh*.045,'#12355333');
    let rect;
    if(blend<1)this.sprite(atlas,hero,0,x,feet+idleBob,bh,1-blend);
    if(blend>0)rect=this.sprite(atlas,hero,pose,x,feet,bh,blend);
    else rect={x:x-bh*.4,y:feet-bh,w:bh*.8,h:bh};
    if(move==='special' && p<.35){const ox=rect.x+rect.w*hero.origin[0],oy=rect.y+rect.h*hero.origin[1];this.aura(ox,oy,40,hero.color,Math.sin(clamp(p/.35)*Math.PI));}
    const reaction=(move==='special'||move==='fight')&&p>.40&&p<.91?Math.sin((p-.40)/.51*Math.PI):0;
    if(engine.monster)this.monster(cache.get('monster.png'),w*.78,ground,bh*.62,reaction,now);
    if(move==='special')this.beam(rect,hero,p,now);
    if(move==='fight'&&p>.30&&p<.65){
      const impact=Math.sin((p-.30)/.35*Math.PI);
      star(c,rect.x+rect.w*.91,rect.y+rect.h*.43,bh*.085*impact,'#ffdf8b',p*2);
      if(!this.reduced){c.save();c.globalAlpha=impact*.5;c.strokeStyle='#fff4cf';c.lineWidth=3;for(let i=0;i<3;i++){c.beginPath();c.moveTo(rect.x-20,rect.y+rect.h*(.45+i*.12));c.lineTo(rect.x-60,rect.y+rect.h*(.45+i*.12));c.stroke();}c.restore();}
    }
    if(state.phase==='recover'){
      const a=Math.sin((p-.76)/.24*Math.PI);
      for(let i=0;i<5;i++)star(c,x+Math.cos(i*1.8)*bh*.4,feet-bh*.8-i*8,Math.max(0,a)*6,'#ffe69a',i+now/600);
    }
  }
}
