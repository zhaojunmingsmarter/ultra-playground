import { HEROES, ASSETS, assetPath } from './heroes.js';
import { GameEngine } from './engine.js';
import { GameAudio } from './audio.js';
import { HoldGate } from './hold-gate.js';
import { StageRenderer, drawPortrait } from './renderer.js';

const $ = selector => document.querySelector(selector);
const engine = new GameEngine();
const audio = new GameAudio();
const settings = readSettings();
engine.follow = settings.follow;
const renderer = new StageRenderer($('#stage'), HEROES);
const cache = new Map();
let frame = 0, ready = false, lastPhase = '', lastCount = 0, loadingGeneration = 0;
const holdGate = new HoldGate(openSettings);

function readSettings() {
  const defaults = { music:true, effects:true, volume:.45, follow:false };
  try {
    const saved = JSON.parse(localStorage.getItem('ultra-settings-v1') || '{}');
    return {
      music:typeof saved.music === 'boolean' ? saved.music : defaults.music,
      effects:typeof saved.effects === 'boolean' ? saved.effects : defaults.effects,
      follow:typeof saved.follow === 'boolean' ? saved.follow : defaults.follow,
      volume:Number.isFinite(saved.volume) ? Math.min(1, Math.max(0, saved.volume)) : defaults.volume
    };
  } catch { return defaults; }
}
function saveSettings() {
  try { localStorage.setItem('ultra-settings-v1', JSON.stringify(settings)); } catch { /* Private browsing remains playable. */ }
  audio.apply(settings);
  engine.follow = settings.follow;
  $('#music-status').textContent = settings.music ? '音乐开' : '音乐关';
  $('#follow-hint').hidden = !settings.follow;
}
function message(text, spoken = true) {
  $('#speech').textContent = text;
  if (spoken) audio.speak(text);
}
function clearActionUI() {
  lastPhase = ''; lastCount = 0;
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
  $('#fight-label').textContent = hero.fightName;
  $('#special-label').textContent = hero.specialLabel;
  $('#stage').setAttribute('aria-label', `${hero.name}在光之舞台上准备出招`);
  $('#stage').dataset.hero = hero.id;
  message(`${hero.name}，和你一起玩！`);
  audio.effect('hello');
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
  const text = engine.action === 'special' ? hero.power : engine.action === 'fight' ? hero.fightName : `${hero.name}，登场！`;
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
$('#monster').addEventListener('click', () => {
  if (!engine.active) return;
  engine.monster = !engine.monster;
  $('#monster').setAttribute('aria-pressed', String(engine.monster));
  $('#monster strong').textContent = engine.monster ? '再见怪兽' : '叫怪兽';
  audio.effect('monster');
  message(engine.monster ? '小怪兽，一起来练招！' : '小怪兽，下次见！');
});

function draw(now) {
  const state = engine.tick(now);
  if (state.justStarted) beginAction();
  if (state.count) {
    $('#countdown').hidden = false;
    $('#countdown').textContent = state.count;
    if (lastCount !== state.count) {
      lastCount = state.count;
      // Let the short instruction finish before the last two spoken beats.
      if (state.count < 3) audio.speak(state.count === 2 ? '二' : '一');
      audio.effect('tap');
    }
  } else $('#countdown').hidden = true;
  if (state.phase !== lastPhase) {
    lastPhase = state.phase;
    if (state.phase === 'prepare') { $('#phase').textContent = '准备！'; audio.effect('charge'); }
    if (state.phase === 'release') {
      $('#phase').textContent = '出招！';
      audio.effect(engine.action === 'special' ? 'beam' : engine.action === 'fight' ? 'hit' : 'hello');
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
  $('#loading').textContent = '准备好了，点一下继续';
  $('#start').disabled = !ready;
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) cancelHold();
  if (document.hidden && engine.active) {
    if ($('#settings').open) $('#settings').close();
    showResume();
  }
});
window.addEventListener('pagehide', () => { if(engine.active) showResume(); });

function cancelHold() {
  holdGate.cancel();
  $('#parents').classList.remove('holding');
}
function openSettings() {
  cancelHold(); pauseGame();
  $('#settings').showModal();
}
function beginHold() {
  if(holdGate.timer !== null || !engine.active) return;
  $('#parents').classList.add('holding');
  holdGate.start();
}
$('#parents').addEventListener('pointerdown', event => {
  if(!event.isPrimary) return;
  event.preventDefault();
  beginHold(event.pointerId);
});
for(const name of ['pointerup','pointercancel','pointerleave']) $('#parents').addEventListener(name, cancelHold);
$('#parents').addEventListener('contextmenu', event => event.preventDefault());
$('#parents').addEventListener('keydown', event => {
  if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if(!event.repeat) beginHold(); }
});
$('#parents').addEventListener('keyup', cancelHold);
$('#parents').addEventListener('blur', cancelHold);
$('#music-toggle').checked = settings.music;
$('#effects-toggle').checked = settings.effects;
$('#follow-toggle').checked = settings.follow;
$('#volume').value = Math.round(settings.volume*100);
$('#volume-value').textContent = `${Math.round(settings.volume*100)}%`;
for(const [id,key] of [['music-toggle','music'],['effects-toggle','effects'],['follow-toggle','follow']]) {
  $(`#${id}`).addEventListener('change', event => { settings[key] = event.target.checked; saveSettings(); });
}
$('#volume').addEventListener('input', event => {
  settings.volume = Number(event.target.value)/100;
  $('#volume-value').textContent = `${event.target.value}%`;
  saveSettings();
});
async function closeSettings() {
  $('#settings').close();
  await startGame();
}
$('#close-settings').addEventListener('click', closeSettings);
$('#settings').addEventListener('cancel', event => {event.preventDefault();closeSettings();});
saveSettings();

function loadImage(name) {
  if(cache.has(name)) return Promise.resolve();
  return new Promise((resolve,reject) => {
    const img = new Image();
    const timer = setTimeout(() => { img.onload = img.onerror = null; reject(new Error(name)); }, 20000);
    img.onload = () => { clearTimeout(timer); cache.set(name,img); resolve(); };
    img.onerror = () => { clearTimeout(timer); reject(new Error(name)); };
    img.src = assetPath(name);
  });
}
async function preload() {
  const generation = ++loadingGeneration;
  ready = false; $('#start').disabled = true; $('#retry').hidden = true;
  const files = ASSETS;
  let completed = 0;
  const results = await Promise.allSettled(files.map(async name => {
    await loadImage(name);
    completed++;
    if(generation === loadingGeneration) $('#loading').textContent = `奥特曼正在集合 ${completed} / ${files.length}`;
  }));
  if(generation !== loadingGeneration) return;
  if(results.some(r => r.status === 'rejected')) {
    $('#loading').textContent = '有图片还没到，再试一次吧';
    $('#retry').hidden = false;
    return;
  }
  ready = true;
  document.querySelectorAll('.portrait canvas').forEach((el,i)=>drawPortrait(el,HEROES[i],cache.get('ultra-atlas-v2.png')));
  document.querySelectorAll('.squad canvas').forEach((el,i)=>drawPortrait(el,HEROES[[2,0,1,3][i]],cache.get('ultra-atlas-v2.png'),true));
  $('#start').disabled = false;
  $('#start strong').textContent = '开始玩';
  $('#loading').textContent = '轻轻一点，音乐和冒险一起开始';
  renderer.draw(performance.now(),engine,{phase:'idle',progress:0},cache);
}
$('#retry').addEventListener('click',preload);
preload();
