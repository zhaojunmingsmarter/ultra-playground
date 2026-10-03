// Share in-flight requests and retry transient failures without blocking other assets.
export function createImageLoader(cache, pathFor, { ImageClass = Image, timeout = 12000, attempts = 3 } = {}) {
  const pending = new Map();
  function attempt(name) {
    return new Promise((resolve, reject) => {
      const img = new ImageClass();
      const finish = error => {
        clearTimeout(timer); img.onload = img.onerror = null;
        if (error) { img.src = ''; reject(error); }
        else { cache.set(name, img); resolve(img); }
      };
      const timer = setTimeout(() => finish(new Error(`Timeout: ${name}`)), timeout);
      img.onload = () => finish();
      img.onerror = () => finish(new Error(`Failed: ${name}`));
      img.src = pathFor(name);
    });
  }
  return function load(name) {
    if (cache.has(name)) return Promise.resolve(cache.get(name));
    if (pending.has(name)) return pending.get(name);
    const work = (async () => {
      try {
        for (let i = 0; i < attempts; i++) {
          try { return await attempt(name); }
          catch (error) { if (i === attempts - 1) throw error; }
        }
      } finally { pending.delete(name); }
    })();
    pending.set(name, work);
    return work;
  };
}
