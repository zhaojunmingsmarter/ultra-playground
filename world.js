const TAU=Math.PI*2;
const clamp=v=>Math.max(0,Math.min(1,v));
export const MONSTERS=[
  {name:'小恐龙',color:'#8de4ca',row:-1},
  {name:'哥莫拉',color:'#ffb26d',row:0},
  {name:'巴尔坦',color:'#82deff',row:1},
  {name:'艾雷王',color:'#ffe58c',row:2}
];
export function worldState(now,scene){
  const t=now/1000;
  return {t,night:(1-Math.cos(t/24))/2,ship:(t/(scene===1?13:23)+.24)%1,boat:(t/37+.54)%1,animal:(t/29+.04)%1,meteor:(t/8.5)%1};
}
function oval(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();}
export function drawMonsterPortrait(canvas,index,atlas,original){
  const c=canvas.getContext('2d');canvas.width=112;canvas.height=90;
  if(index===0){if(original)c.drawImage(original,0,0,original.width/2,original.height,4,0,104,90);return;}
  if(!atlas)return;
  const y=[0,410,815][index-1],hh=[400,405,439][index-1];
  c.drawImage(atlas,0,y,406,hh,7,0,98,90);
}
export function drawKaiju(c,atlas,index,x,ground,size,reaction,now,arrival=1,attacking=false,reduced=false){
  if(!atlas||index===0)return;
  const row=index-1,col=reaction>.08?2:attacking?1:0;
  const sx=[0,402,852][col],sw=[402,442,402][col],sy=[0,410,815][row],sh=[400,405,439][row];
  const scale=size/sh;
  const breathing=reduced?0:Math.sin(now/420+index)*.014;
  c.save();c.globalAlpha=clamp(arrival);c.translate(x+reaction*size*.09,ground);c.rotate(reaction*.1);
  c.scale(1-breathing,1+breathing);c.drawImage(atlas,sx,sy,sw,sh,-sw*scale/2,-size,sw*scale,size);c.restore();
}
export class LivingWorld {
  constructor(){this.scene=-1;this.switched=0;this.interaction=null;}
  interact(x,y,now){this.interaction={x,y,at:now};}
  prop(c,image,id,x,y,width,angle=0,flip=false){
    if(!image)return;const cw=image.width/3,ch=image.height/2,scale=width/cw;
    c.save();c.translate(x,y);c.rotate(angle);if(flip)c.scale(-1,1);
    c.drawImage(image,(id%3)*cw,Math.floor(id/3)*ch,cw,ch,-width/2,-ch*scale/2,width,ch*scale);c.restore();
  }
  bird(c,x,y,s,t,color='#eefbff'){
    const flap=Math.sin(t*7)*s*.75;c.strokeStyle=color;c.lineWidth=Math.max(1.4,s*.13);c.lineCap='round';
    c.beginPath();c.moveTo(x-s,y+flap);c.quadraticCurveTo(x-s*.35,y-s*.4,x,y);c.quadraticCurveTo(x+s*.35,y-s*.4,x+s,y+flap);c.stroke();
  }
  draw(c,w,h,now,scene,props,energy=0,reduced=false){
    if(this.scene!==scene){this.scene=scene;this.switched=now;}
    const clock=worldState(reduced?0:now,scene),{t,night}=clock;
    // Evolving warm/cool light changes the whole scene, while foreground actors remain legible.
    c.save();const tint=c.createLinearGradient(0,0,0,h);
    tint.addColorStop(0,scene===1?`rgba(60,20,120,${.12+night*.15})`:`rgba(28,36,98,${night*.27})`);
    tint.addColorStop(.78,'rgba(70,110,160,0)');c.fillStyle=tint;c.fillRect(0,0,w,h);
    if(scene!==1){
      const sunX=w*(.72-night*.08),sunY=h*(.12+night*.10),glow=c.createRadialGradient(sunX,sunY,0,sunX,sunY,h*.27);
      glow.addColorStop(0,`rgba(255,221,152,${.20*(1-night)})`);glow.addColorStop(1,'#ffdb9300');c.fillStyle=glow;c.fillRect(0,0,w,h);
      // Long soft clouds and distant drifting birds.
      c.globalAlpha=.11;for(let i=0;i<3;i++){const xx=((t*(8+i*2)+i*w*.38)%(w+180))-90;oval(c,xx,h*(.14+i*.065),w*.14,h*.018,'#e7edff');}c.globalAlpha=1;
      for(let i=0;i<5;i++){const x=((t*17+i*36)%(w+200))-80;this.bird(c,x,h*(.28+i%2*.025)+Math.sin(t+i)*4,5+i%3,t+i,scene===2?'#583746':'#e3f5ff');}
    }
    if(scene===0){
      const shipX=-w*.15+clock.ship*w*1.3,shipY=h*.22+Math.sin(t*.6)*h*.025;
      this.trail(c,shipX-w*.055,shipY,w*.15,'#a8ecff',t);
      this.prop(c,props,0,shipX,shipY,w*.19,Math.sin(t*.45)*.055);
      oval(c,shipX+w*.03,shipY+h*.018,2.5,2.5,Math.sin(t*5)>0?'#fff4a0':'#f96e63');
      const boatX=-w*.1+clock.boat*w*1.2,boatY=h*.68;
      c.strokeStyle='#c8f6ff99';c.lineWidth=1.5;for(let j=0;j<4;j++){c.beginPath();c.ellipse(boatX-w*.025-j*6,boatY+h*.036,w*.03+j*7,h*.005+j*2,0,0,TAU);c.stroke();}
      this.prop(c,props,5,boatX,boatY,w*.12,Math.sin(t*2)*.02);
      // Horizontal reflections catch the moving light on the water.
      c.globalAlpha=.2;for(let i=0;i<20;i++){c.fillStyle='#bfefff';c.fillRect((i*61+t*4)%w,h*(.58+(i%5)*.018),15+Math.sin(t+i)*8,1.3);}c.globalAlpha=1;
    }else if(scene===1){
      // Aurora ribbons, meteor showers, orbiting craft and exhaust are independent layers.
      c.save();c.globalCompositeOperation='screen';
      for(let j=0;j<3;j++){c.strokeStyle=['#80e8ff','#b19bff','#fa9fdb'][j];c.globalAlpha=.13;c.lineWidth=9+j*5;c.beginPath();for(let k=0;k<=32;k++){const x=w*k/32,y=h*(.14+j*.055)+Math.sin(k*.18+t*.22+j)*h*.045;k?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();}c.restore();
      for(let i=0;i<2;i++){const v=(clock.meteor+i*.49)%1;if(v<.23){const x=w*(1.05-v*2.5),y=h*(.07+v*.9+i*.11);this.trail(c,x,y,w*.13,'#e6e8ff',t,-.4);}}
      const x=-w*.17+clock.ship*w*1.34,y=h*.25+Math.sin(t*.75)*h*.055;
      this.prop(c,props,1,x,y,w*.19,Math.sin(t*.7)*.1);
      c.save();c.globalAlpha=.08+.035*Math.sin(t*2);c.fillStyle='#83ffff';c.beginPath();c.moveTo(x-w*.02,y+h*.025);c.lineTo(x-w*.07,y+h*.34);c.lineTo(x+w*.07,y+h*.34);c.lineTo(x+w*.02,y+h*.025);c.fill();c.restore();
      this.prop(c,props,0,w*(1.15-((t/31+.1)%1)*1.3),h*.44,w*.10,-.08,true);
    }else{
      const fly=-w*.2+clock.ship*w*1.4,wing=Math.sin(t*3.5)*.05;
      this.prop(c,props,2,fly,h*.22+Math.sin(t*.7)*h*.035,w*.19,wing);
      const animalX=w*(.06+clock.animal*.88);
      this.prop(c,props,3,animalX,h*.70-Math.abs(Math.sin(t*3))*2,w*.10,Math.sin(t*3)*.018);
      this.prop(c,props,4,w*(.98-((t/19+.12)%1)),h*.765-Math.abs(Math.sin(t*4))*h*.028,w*.082,Math.sin(t*4)*.045,true);
      // Waterfall spray and drifting leaves catch the sunlight.
      c.save();c.globalAlpha=.26;for(let i=0;i<22;i++){const x=w*(.05+(i%3)*.034)+Math.sin(t+i)*4,y=h*(.31+((t*.18+i/22)%1)*.30);oval(c,x,y,1.5,3,'#e5ffff');}c.restore();
      for(let i=0;i<7;i++){const x=((t*23+i*167)%(w+40))-20,y=h*(.22+((t*.025+i/7)%1)*.56);c.save();c.translate(x,y);c.rotate(t+i);oval(c,0,0,5,2.1,i%2?'#e9c55a':'#93b962');c.restore();}
    }
    // Local sparkle response makes tapping the scenery playful without adding UI.
    if(this.interaction){const p=(now-this.interaction.at)/900;if(p<1){const x=this.interaction.x*w,y=this.interaction.y*h;c.save();c.strokeStyle='#fff1b0';c.globalAlpha=1-p;c.lineWidth=2;for(let i=0;i<9;i++){const a=i*TAU/9,rr=12+p*60;c.beginPath();c.moveTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);c.lineTo(x+Math.cos(a)*(rr+7),y+Math.sin(a)*(rr+7));c.stroke();}c.restore();}else this.interaction=null;}
    if(energy>0){c.save();c.globalCompositeOperation='screen';c.globalAlpha=energy*.13;c.fillStyle=scene===2?'#ffb94f':'#95dfff';c.fillRect(0,0,w,h);c.restore();}
    // Soft iris-like color reveal, not a white flash.
    const transition=clamp(1-(now-this.switched)/700);if(transition>0){c.fillStyle=`rgba(13,29,61,${transition*.35})`;c.fillRect(0,0,w,h);}
    c.restore();
  }
  trail(c,x,y,length,color,t,angle=0){
    c.save();c.translate(x,y);c.rotate(angle);const g=c.createLinearGradient(-length,0,0,0);g.addColorStop(0,color+'00');g.addColorStop(1,color+'bb');c.strokeStyle=g;c.lineWidth=3;c.beginPath();c.moveTo(-length,0);c.lineTo(0,0);c.stroke();oval(c,0,0,4+Math.sin(t*10),2,'#fff6cf');c.restore();
  }
}
