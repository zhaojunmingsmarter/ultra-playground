// Permit one-finger scrolling and all button taps, but suppress page zoom gestures.
for (const type of ['gesturestart', 'gesturechange']) {
  document.addEventListener(type, event => event.preventDefault(), { passive:false });
}
document.addEventListener('touchmove', event => {
  if (event.touches.length > 1) event.preventDefault();
}, { passive:false });
document.addEventListener('dblclick', event => event.preventDefault(), { passive:false });
// Trackpad pinch arrives as a control-wheel gesture in Chromium.
document.addEventListener('wheel', event => {
  if (event.ctrlKey) event.preventDefault();
}, { passive:false });

const status = document.querySelector('#offline-status');
function report(text) { if (status) status.textContent = text; }
async function registerOffline() {
  if (!('serviceWorker' in navigator)) {
    report('此浏览器暂不支持离线保存，请联网游玩。');
    return;
  }
  try {
    const registration = await navigator.serviceWorker.register('./sw.js', { scope:'./', updateViaCache:'none' });
    const showState = () => {
      if (registration.waiting) report('更新已保存，关闭所有游戏窗口后重新打开即可使用。');
      else if (registration.active) report('已保存到此设备，可离线游玩。');
    };
    showState();
    const watch = worker => {
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' || worker.state === 'activated') showState();
        if (worker.state === 'redundant' && !registration.active) report('离线保存未完成，请保持联网后重新打开游戏。');
      });
    };
    watch(registration.installing);
    registration.addEventListener('updatefound', () => watch(registration.installing));
    navigator.serviceWorker.ready.then(showState);
  } catch {
    report('离线保存未完成，联网仍可正常游玩。');
  }
}
if (document.readyState === 'complete') registerOffline();
else window.addEventListener('load', registerOffline, { once:true });
