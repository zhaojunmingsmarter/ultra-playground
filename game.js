import {MONSTERS,drawMonsterPortrait} from './world.js';
import { HEROES, ASSETS, assetPath } from './heroes.js';
import { createImageLoader } from './image-loader.js';
import { GameEngine } from './engine.js';
import { GameAudio } from './audio.js';
import { StageRenderer, drawPortrait } from './renderer.js';

const $ = selector => document.querySelector(selector);
const engine = new GameEngine();
const audio = new GameAudio();
const settings = { music:true, effects:true, volume:.45, follow:false };
engine.follow = settings.follow;
const renderer = new StageRenderer($('#stage'), HEROES);
const cache = new Map();
const loadImage = createImageLoader(cache, assetPath);
let frame = 0, ready = false, lastPhase = '', lastCount = 0, loadingGeneration = 0;
function message(text, spoken = true) {
  $('#speech').textContent = text;
  $('#speech').hidden = !engine.action;

}
function clearActionUI() {
  lastPhase = ''; lastCount = 0;
  $('#speech').hidden = true;
  $('#countdown').hidden = true;
  $('#move-progress').style.width = '0%';
  document.querySelectorAll('[data-move]').forEach(button => button.classList.remove('active'));
  $('#phase').textContent = '准备好啦';
  $('#stage').dataset.action = 'idle';
}
function selectHero(index) {
  engine.select(index);
  audio.stopEffects();
  clearActionUI();
  const hero = HEROES[index];
  document.querySelectorAll('.hero').forEach((button, i) => button.setAttribute('aria-pressed', String(index === i)));
  $('#hero-name').textContent = hero.name;
  $('#hero-subtitle').textContent = hero.subtitle;
  $('#fight-label').textContent = '飞踢';
  $('#special-label').textContent = '光线';
  $('#stage').setAttribute('aria-label', `${hero.name}在光之舞台上准备出招`);
  $('#stage').dataset.hero = hero.id;
  message(`${hero.name}，和你一起玩！`);
  audio.voice(hero.id,true);
}
HEROES.forEach((hero,index) => {
  const button = document.createElement('button');
  button.className = 'hero';
  button.setAttribute('aria-label', hero.name);
  button.setAttribute('aria-pressed', String(index === 0));
  const portrait = document.createElement('span'); portrait.className = 'portrait';
  const icon = document.createElement('canvas'); icon.setAttribute('aria-hidden','true');
  portrait.append(icon);
  const label = document.createElement('span'); label.textContent = hero.name;
  button.append(portrait,label);
  button.addEventListener('click', () => selectHero(index));
  $('#heroes').append(button);
});

function beginAction() {
  lastPhase = ''; lastCount = 0;
  const hero = HEROES[engine.hero];
  const text = engine.action === 'special' ? hero.power : ({fight:'飞踢',punch:'连环拳',uppercut:'升龙拳',spin:'旋风踢',shield:'光之盾',ultimate:'超级必杀'})[engine.action] || `${hero.name}，登场！`;
  message(text);
  $('#stage').setAttribute('aria-label', `${hero.name}正在展示${text}`);
  $('#stage').dataset.action = engine.action;
  document.querySelectorAll('[data-move]').forEach(button => button.classList.toggle('active', button.dataset.move === engine.action));
}
document.querySelectorAll('[data-move]').forEach(button => {
  button.addEventListener('click', () => {
    const result = engine.request(button.dataset.move, performance.now());
    if (result === 'repeat' || result === 'busy') {
      button.classList.remove('bump'); void button.offsetWidth; button.classList.add('bump');
      return;
    }
    if (result === 'ignored') return;
    audio.stopEffects();
    audio.effect('tap');
    clearActionUI();
    if (result === 'started') beginAction();
    else { message('准备，一起做！'); $('#phase').textContent = '跟我做'; }
  });
});
function updateMonsterButton(){
  const monster=MONSTERS[engine.monsterKind];
  $('#monster').setAttribute('aria-label',`${monster.name}，点击换怪兽`);
  $('#monster strong').textContent=monster.name;
  drawMonsterPortrait($('#monster canvas'),engine.monsterKind,cache.get('kaiju-atlas.webp'),cache.get('monster.webp'));
  $('#stage').dataset.monster=String(engine.monsterKind);
}
$('#monster').addEventListener('click', () => {
  if(!engine.active)return;
  engine.monsterKind=(engine.monsterKind+1)%MONSTERS.length;
  engine.monsterChanged=performance.now();
  updateMonsterButton();audio.monster(engine.monsterKind);
  loadImage(engine.monsterKind?'kaiju-atlas.webp':'monster.webp').then(updateMonsterButton).catch(()=>{});
});
$('#stage').addEventListener('pointerdown',event=>{
  if(!engine.active)return;
  const rect=event.currentTarget.getBoundingClientRect();
  renderer.world.interact((event.clientX-rect.left)/rect.width,(event.clientY-rect.top)/rect.height,performance.now());
  audio.effect('tap');
});
audio.onVoice=hero=>{$('#stage').dataset.voice=hero;};

document.querySelectorAll('[data-scene]').forEach(button=>button.addEventListener('click',()=>{
  engine.scene=Number(button.dataset.scene);
  $('#stage').dataset.scene=String(engine.scene);
  loadImage(['city.webp','space.webp','canyon.webp'][engine.scene]).catch(()=>{});
  document.querySelectorAll('[data-scene]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  audio.effect('tap');
}));
let lastImpactKey='',lastMonsterCue='';
function draw(now) {
  const state = engine.tick(now);
  if (state.justStarted) beginAction();
  if (state.count) {
    $('#countdown').hidden = false;
    $('#countdown').textContent = state.count;
    if (lastCount !== state.count) {
      lastCount = state.count;
      audio.effect('tap');
    }
  } else $('#countdown').hidden = true;
  if (state.phase !== lastPhase) {
    lastPhase = state.phase;
    if (state.phase === 'prepare') { $('#phase').textContent = '准备！'; audio.move(engine.action,HEROES[engine.hero].id,'prepare'); }
    if (state.phase === 'release') {
      $('#phase').textContent = '出招！';
      audio.move(engine.action,HEROES[engine.hero].id,'release');
    }
    if (state.phase === 'recover') $('#phase').textContent = '好帅的招式！';
  }
  if (state.finished) {
    clearActionUI();
    $('#phase').textContent = '太棒啦！';
    message('好帅！再试一个招式吧！', false);
    audio.effect('success');
  }
  $('#move-progress').style.width = `${state.progress * 100}%`;
  $('#stage').dataset.phase = state.phase;
  renderer.draw(now, engine, state, cache);
  if(renderer.monsterCue && renderer.monsterCue!==lastMonsterCue){lastMonsterCue=renderer.monsterCue;audio.monster(engine.monsterKind);}
  const impactKey=`${engine.started}:${renderer.hitIndex}`;
  if(renderer.hitIndex>=0 && impactKey!==lastImpactKey){lastImpactKey=impactKey;audio.impact(engine.action,renderer.hitIndex);}
  if (engine.active) frame = requestAnimationFrame(draw);
}
async function startGame() {
  if (!ready) return;
  $('#start').disabled = true;
  const soundReady = await audio.start(settings);
  // A user may background the tab while AudioContext.resume() is pending.
  if (document.hidden) { audio.pause(); $('#start').disabled = false; return; }
  engine.active = true;
  $('#welcome').hidden = true;
  $('#game').inert = false;
  $('#start').disabled = false;
  clearActionUI();
  message(soundReady ? '选个招式，和我一起做！' : '选个招式，一起玩吧！');
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(draw);
  document.querySelector('[data-move]').focus({preventScroll:true});
}
$('#start').addEventListener('click', startGame);
function pauseGame() {
  engine.pause(); audio.pause(); cancelAnimationFrame(frame); clearActionUI();
}
function showResume() {
  pauseGame();
  $('#game').inert = true;
  $('#welcome').hidden = false;
  $('#start strong').textContent = '继续玩';
  $('#loading').textContent = '';
  $('#start').disabled = !ready;
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden && engine.active) {
    showResume();
  }
});
window.addEventListener('pagehide', () => { if(engine.active) showResume(); });

async function preload() {
  const generation = ++loadingGeneration;
  ready = false; $('#start').disabled = true; $('#retry').hidden = true;
  $('#loading').textContent = '加载中…';
  try { await loadImage('ultra-atlas-v2.webp'); }
  catch {
    if(generation !== loadingGeneration) return;
    $('#loading').textContent = '暂时没连上网络';
    $('#retry').hidden = false;
    return;
  }
  if(generation !== loadingGeneration) return;
  ready = true;
  audio.preloadVoices();
  document.querySelectorAll('.portrait canvas').forEach((el,i)=>drawPortrait(el,HEROES[i],cache.get('ultra-atlas-v2.webp')));
  document.querySelectorAll('.squad canvas').forEach((el,i)=>drawPortrait(el,HEROES[[2,0,1,3][i]],cache.get('ultra-atlas-v2.webp'),true));
  $('#start').disabled = false;
  $('#start strong').textContent = '开始玩';
  $('#loading').textContent = '';
  renderer.draw(performance.now(),engine,{phase:'idle',progress:0},cache);
  loadExtras();
}
async function loadExtras() {
  // Limit background concurrency so the foreground hero has network priority.
  const remaining = ASSETS.filter(name => name !== 'ultra-atlas-v2.webp');
  async function worker() {
    while(remaining.length) {
      const name = remaining.shift();
      try { await loadImage(name); if(name==='kaiju-atlas.webp'||name==='monster.webp')updateMonsterButton();
        const sceneIndex=['city.webp','space.webp','canyon.webp'].indexOf(name);
        if(sceneIndex>=0){const button=document.querySelector(`[data-scene="${sceneIndex}"]`);button.style.backgroundImage=`url(${assetPath(name)})`;button.classList.add('scene-loaded');} } catch { /* Retry on the next online event or selection. */ }
    }
  }
  await Promise.all([worker(), worker()]);
}
window.addEventListener('online', () => { if(!ready) preload(); else loadExtras(); });
updateMonsterButton();
$('#retry').addEventListener('click',preload);
preload();
