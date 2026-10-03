// Code-native lightning app icon, matching the game's existing favicon.
import { mkdir, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function chunk(name,data){const kind=Buffer.from(name),len=Buffer.alloc(4),crc=Buffer.alloc(4);len.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([kind,data])));return Buffer.concat([len,kind,data,crc]);}
function inside(x,y,poly){let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [a,b]=poly[i],[u,v]=poly[j];if((b>y)!==(v>y)&&x<(u-a)*(y-b)/(v-b)+a)hit=!hit;}return hit;}
function png(size){
 const raw=Buffer.alloc((size*3+1)*size),poly=[[.56,.21],[.31,.54],[.47,.54],[.42,.79],[.71,.43],[.55,.43]];
 for(let y=0;y<size;y++){for(let x=0;x<size;x++){const px=x/size,py=y/size;let color=[16,39,73];if(Math.hypot(px-.5,py-.5)<.37)color=[28,63,102];if(inside(px,py,poly))color=[255,218,117];const i=y*(size*3+1)+1+x*3;raw.set(color,i);}}
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=2;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
await mkdir('assets/icons',{recursive:true});
for(const [name,size] of [['icon-192',192],['icon-512',512],['icon-maskable-512',512],['apple-touch-icon',180]])await writeFile(`assets/icons/${name}.png`,png(size));
