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

async function registerOffline() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('./sw.js', { scope:'./', updateViaCache:'none' });
  } catch { /* The online game remains usable when offline storage is unavailable. */ }
}
if (document.readyState === 'complete') registerOffline();
else window.addEventListener('load', registerOffline, { once:true });
