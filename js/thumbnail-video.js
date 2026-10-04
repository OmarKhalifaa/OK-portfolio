/* Autoplay decorative thumbnails only while their cards are visible. */
(() => {
  const videos = document.querySelectorAll('[data-thumbnail-video]');
  if (!videos.length) return;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const states = new Map();
  const permitted = () => !reducedMotion.matches && !connection?.saveData;
  const pageVisible = () => document.visibilityState !== 'hidden';
  const inViewport = thumb => {
    const rect = thumb.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0
      && rect.top < window.innerHeight && rect.left < window.innerWidth;
  };

  function stop(state) {
    state.request += 1;
    const wasPending = state.pending;
    state.pending = false;
    state.thumb.classList.remove('is-thumbnail-playing');
    if (wasPending || !state.video.paused) state.video.pause();
  }

  function update(state) {
    if (!permitted() || !pageVisible() || !state.visible || state.failed) {
      stop(state);
      return;
    }
    if (state.pending || !state.video.paused) return;

    if (!state.video.getAttribute('src')) state.video.setAttribute('src', state.video.dataset.src);
    state.video.muted = true;
    state.video.playsInline = true;
    state.pending = true;
    const request = ++state.request;
    try {
      const playback = state.video.play();
      Promise.resolve(playback).then(() => {
        if (request !== state.request) return;
        state.pending = false;
        if (!permitted() || !pageVisible() || !state.visible) stop(state);
      }).catch(() => {
        if (request !== state.request) return;
        state.failed = true;
        stop(state);
      });
    } catch {
      state.failed = true;
      stop(state);
    }
  }

  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const state = states.get(entry.target);
      if (!state) return;
      state.visible = entry.isIntersecting && entry.intersectionRatio > 0;
      update(state);
    });
  }, { threshold: [0, .01] }) : null;

  videos.forEach(video => {
    const thumb = video.closest('.has-video-thumbnail');
    if (!thumb || !video.dataset.src) return;
    const state = { video, thumb, visible: observer ? false : inViewport(thumb), failed: false, pending: false, request: 0 };
    states.set(thumb, state);
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = true;
    video.preload = 'none';
    // The controller starts playback after visibility checks, including on mobile.
    video.removeAttribute('autoplay');
    video.addEventListener('playing', () => {
      if (permitted() && pageVisible() && state.visible && !state.failed) {
        state.thumb.classList.add('is-thumbnail-playing');
      } else stop(state);
    });
    video.addEventListener('pause', () => state.thumb.classList.remove('is-thumbnail-playing'));
    video.addEventListener('error', () => { state.failed = true; stop(state); });
    if (observer) observer.observe(thumb);
    else update(state);
  });

  const updateAll = () => states.forEach(update);
  document.addEventListener('visibilitychange', updateAll);
  reducedMotion.addEventListener?.('change', updateAll);
  connection?.addEventListener?.('change', updateAll);
  if (!observer) {
    let scheduled = false;
    const checkViewport = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        states.forEach(state => { state.visible = inViewport(state.thumb); update(state); });
      });
    };
    window.addEventListener('scroll', checkViewport, { passive: true });
    window.addEventListener('resize', checkViewport);
  }
})();
