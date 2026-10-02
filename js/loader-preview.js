/* Run in the head so the page and thumbnail entrances wait for the intro. */
(() => {
  const root = document.documentElement;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  // Every homepage entry uses the same readiness gate, including logo navigation.
  let homepageEntered = false;
  window.startHomepageEntrance = () => {
    if (homepageEntered) return;
    homepageEntered = true;
    root.classList.remove('home-enter-pending');
    document.dispatchEvent(new Event('portfolio:ready'));
  };
  if (!reducedMotion.matches) root.classList.add('home-enter-pending');
  document.addEventListener('DOMContentLoaded', async () => {
    await Promise.race([
      Promise.allSettled([window.homepageAssetsReady, document.fonts?.ready]),
      new Promise(resolve => setTimeout(resolve, 1800))
    ]);
    if (!root.classList.contains('intro-pending')) window.startHomepageEntrance();
  }, { once: true });
  setTimeout(() => {
    if (!root.classList.contains('intro-pending')) window.startHomepageEntrance();
  }, 3000);
  const forceIntro = new URLSearchParams(location.search).get('intro') === '1';
  const sessionKey = 'omar-intro-seen';
  let seen = false;
  try { seen = sessionStorage.getItem(sessionKey) === '1'; } catch { /* Storage may be unavailable. */ }
  if (reducedMotion.matches || (!forceIntro && (seen || location.hash))) return;

  root.classList.add('intro-pending');
  let intro;
  let finished = false;
  let pageContent = [];
  let previousFocus;
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const pageReady = new Promise(resolve => {
    if (document.readyState === 'complete') resolve();
    else window.addEventListener('load', resolve, { once: true });
  });

  function reveal(immediate = false) {
    if (finished) {
      if (immediate) {
        root.classList.remove('intro-pending');
        intro?.remove();
        pageContent.forEach(node => { node.inert = false; });
        window.startHomepageEntrance();
      }
      return;
    }
    finished = true;
    const restoreFocus = intro?.contains(document.activeElement);
    clearTimeout(failsafe);
    try { sessionStorage.setItem(sessionKey, '1'); } catch { /* Optional session memory. */ }
    // Let the sticker leave first, then bring in the already-decoded portfolio.
    if (intro) {
      intro.inert = true;
      intro.classList.add('is-leaving');
      if (immediate) intro.remove();
      else setTimeout(() => intro.remove(), 550);
    }
    document.removeEventListener('keydown', onKeyDown);
    const enterPortfolio = () => {
      root.classList.remove('intro-pending');
      pageContent.forEach(node => { node.inert = false; });
      window.startHomepageEntrance();
      if (restoreFocus) {
        const target = previousFocus?.isConnected && previousFocus !== document.body
          ? previousFocus : document.querySelector('.nav-logo');
        target?.focus({ preventScroll: true });
      }
    };
    if (immediate) enterPortfolio();
    else setTimeout(enterPortfolio, 250);
  }
  function onKeyDown(event) { if (event.key === 'Escape') reveal(); }
  const failsafe = setTimeout(() => reveal(true), 9000);
  window.addEventListener('pagehide', () => reveal(true), { once: true });
  reducedMotion.addEventListener('change', event => { if (event.matches) reveal(true); });

  document.addEventListener('DOMContentLoaded', async () => {
    if (finished) return;
    intro = document.createElement('section');
    intro.id = 'portfolioIntro';
    intro.className = 'portfolio-intro';
    intro.setAttribute('aria-label', 'Portfolio introduction');
    intro.setAttribute('role', 'dialog');
    intro.setAttribute('aria-modal', 'true');
    intro.innerHTML = `
      <header class="intro-header">
        <div class="intro-wordmark">OMAR KHALIFA<span>PRODUCT DESIGNER</span></div>
        <button class="intro-skip" type="button">Skip intro ↗</button>
      </header>
      <div class="intro-center">
        <div class="intro-stage" aria-hidden="true">
          <div class="intro-orbit"></div><div class="intro-orbit intro-orbit-inner"></div>
          <span class="intro-plus intro-plus-one">+</span><span class="intro-plus intro-plus-two">+</span>
          <div class="intro-sticker-slot"><div class="intro-sticker intro-sticker-design"></div></div>
          <div class="intro-sticker-slot" hidden><div class="intro-sticker intro-sticker-think"></div></div>
          <div class="intro-sticker-slot" hidden><div class="intro-sticker intro-sticker-ship"></div></div>
          <div class="intro-shadow"></div>
        </div>
        <div class="intro-copy">
          <p class="intro-eyebrow">A GOOD IDEA STARTS SOMEWHERE</p>
          <p class="intro-caption">Opening Figma<span class="intro-dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></p>
          <p class="intro-subtitle">Making a little room for good ideas.</p>
        </div>
        <p class="intro-sr-only" role="status">Omar’s portfolio is opening. Press Escape to skip the introduction.</p>
      </div>
      <footer class="intro-footer"><p>A few pixels.<br><span>A lot of personality.</span></p></footer>`;
    document.body.append(intro);
    previousFocus = document.activeElement;
    pageContent = [...document.querySelectorAll('body > nav, body > main')];
    pageContent.forEach(node => { node.inert = true; });
    document.addEventListener('keydown', onKeyDown);
    const skip = intro.querySelector('.intro-skip');
    skip.addEventListener('click', () => reveal());
    skip.focus({ preventScroll: true });

    const stickers = [...intro.querySelectorAll('.intro-sticker-slot')];
    const caption = intro.querySelector('.intro-caption');
    const eyebrow = intro.querySelector('.intro-eyebrow');
    const subtitle = intro.querySelector('.intro-subtitle');
    const states = [
      { caption: 'Opening Figma', eyebrow: 'A GOOD IDEA STARTS SOMEWHERE', subtitle: 'Making a little room for good ideas.', duration: 1750 },
      { caption: 'One pixel to the left', eyebrow: 'IT’S ALWAYS THE LITTLE THINGS', subtitle: 'Yep. That’s the one.', duration: 1750 },
      { caption: 'Okay, let’s go!', eyebrow: 'MADE WITH CARE. READY TO SHARE.', subtitle: 'Welcome to my little corner of the internet.', duration: 1500 }
    ];
    const artwork = new Image();
    artwork.src = 'images/stickers/omar-moods.png';
    // Bound asset readiness so a failed download cannot trap the visitor.
    await Promise.race([artwork.decode().catch(() => {}), wait(1000)]);
    for (const [index, state] of states.entries()) {
      if (finished) return;
      stickers.forEach((sticker, i) => { sticker.hidden = i !== index; });
      caption.textContent = state.caption;
      if (index < 2) {
        const dots = document.createElement('span');
        dots.className = 'intro-dots';
        dots.setAttribute('aria-hidden', 'true');
        dots.innerHTML = '<i>.</i><i>.</i><i>.</i>';
        caption.append(dots);
      }
      eyebrow.textContent = state.eyebrow;
      subtitle.textContent = state.subtitle;
      await wait(state.duration);
    }
    await Promise.race([Promise.allSettled([pageReady, document.fonts?.ready, window.homepageAssetsReady]), wait(1200)]);
    reveal();
  }, { once: true });
})();
