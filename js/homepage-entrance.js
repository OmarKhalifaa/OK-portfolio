/* A brief loading counter, followed by the homepage's normal entrance. */
(() => {
  const root = document.documentElement;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const minimumDuration = 1000;
  let entered = false;
  let frame;
  let loader;
  let counter;
  let target = 0;
  let started;
  const contentState = new Map();
  const reveal = (immediate = false) => {
    if (entered) return;
    entered = true;
    cancelAnimationFrame(frame);
    clearTimeout(deadline);
    if (counter) counter.textContent = '100%';
    if (loader && !immediate) loader.classList.add('is-leaving');
    root.classList.remove('home-enter-pending', 'portfolio-loading');
    contentState.forEach((inert, element) => { element.inert = inert; });
    document.dispatchEvent(new Event('portfolio:ready'));
    if (immediate) loader?.remove();
    else setTimeout(() => loader?.remove(), 700);
  };

  // Always release the page if an image, font, or readiness promise stalls.
  const deadline = setTimeout(() => reveal(reducedMotion.matches), 3000);
  if (!reducedMotion.matches) root.classList.add('home-enter-pending', 'portfolio-loading');
  reducedMotion.addEventListener('change', event => {
    if (event.matches) reveal(true);
  });
  document.addEventListener('DOMContentLoaded', () => {
    loader = document.getElementById('portfolioLoader');
    counter = document.getElementById('loaderCounter');
    if (entered) { loader?.remove(); return; }
    if (reducedMotion.matches || !loader || !counter) { reveal(true); return; }
    document.querySelectorAll('body > nav, body > main').forEach(element => {
      contentState.set(element, element.inert);
      element.inert = true;
    });
    const assets = [
      document.fonts?.ready,
      window.homepageAssetsReady,
      ...[...document.querySelectorAll('#work .cms-card-thumb-image')].map(image => {
        if (image.decode) return image.decode();
        if (image.complete) return Promise.resolve();
        return new Promise(resolve => {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', resolve, { once: true });
        });
      })
    ];
    let completed = 0;
    assets.forEach(asset => Promise.resolve(asset).catch(() => {}).then(() => {
      completed += 1;
      target = completed / assets.length * 100;
    }));
    started = performance.now();
    const tick = now => {
      if (entered) return;
      const elapsed = now - started;
      const timeProgress = Math.min(1, elapsed / minimumDuration);
      const displayProgress = Math.min(target, 100 * (1 - (1 - timeProgress) ** 2));
      counter.textContent = `${Math.floor(displayProgress)}%`;
      if (target === 100 && elapsed >= minimumDuration + 120) {
        reveal();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  }, { once: true });
})();
