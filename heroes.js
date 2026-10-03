export const ASSETS = ['ultra-atlas-v2.webp','city.webp','monster.webp','combat.webp','space.webp','canyon.webp'];
export const assetPath = name => `./assets/sprites/${name}`;
// Rectangles isolate the real generated poses within the shared atlas (1254 square).
export const HEROES = [
  {id:'tiga',name:'迪迦',subtitle:'光之巨人',color:'#c4adff',fightName:'飞踢',power:'哉佩利敖光线',specialLabel:'发射光线',origin:[.68,.42],poses:[[140,37,201,271],[500,40,278,233],[900,37,244,271]]},
  {id:'zero',name:'赛罗',subtitle:'勇敢向前',color:'#79e6ff',fightName:'飞踢',power:'赛罗集束光线',specialLabel:'发射光线',origin:[.73,.41],poses:[[139,335,204,279],[500,336,280,243],[899,337,251,277]]},
  {id:'taro',name:'泰罗',subtitle:'燃烧的勇气',color:'#ffce7e',fightName:'冲拳',power:'斯特利姆光线',specialLabel:'发射光线',origin:[.72,.42],poses:[[139,636,204,290],[486,636,295,283],[896,636,256,283]]},
  {id:'original',name:'初代',subtitle:'来自光之国',color:'#a4eaff',fightName:'冲拳',power:'斯派修姆光线',specialLabel:'发射光线',origin:[.73,.42],poses:[[136,939,206,281],[506,939,267,257],[904,938,242,280]]}
];
