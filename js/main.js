/* ── THEME TOGGLE ── */
(() => {
  const saved = localStorage.getItem('theme');
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const theme = saved || (prefersLight ? 'light' : 'dark');
  if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      if (isLight) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
      }
    });
  }
})();

/* ── CUSTOM CURSOR ── */
const cursor = document.getElementById('cursor');
let tx = -100, ty = -100, cx = -100, cy = -100;

document.addEventListener('mousemove', e => {
  tx = e.clientX; ty = e.clientY;
});

(function animateCursor() {
  cx += (tx - cx) * 0.15;
  cy += (ty - cy) * 0.15;
  cursor.style.left = cx + 'px';
  cursor.style.top  = cy + 'px';
  requestAnimationFrame(animateCursor);
})();

document.querySelectorAll('a, button').forEach(el => {
  el.addEventListener('mouseenter', () => cursor.classList.add('hover-state'));
  el.addEventListener('mouseleave', () => cursor.classList.remove('hover-state'));
});

/* ── HALO CARDS ── */
document.querySelectorAll('.halo-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    card.style.setProperty('--my', (e.clientY - r.top)  + 'px');
  });
});

/* ── NAV AUTO COLLAPSE ON SCROLL (mobile) ── */
(() => {
  const navEl = document.getElementById('nav');
  if (!navEl) return;
  const mq = window.matchMedia('(max-width: 900px)');
  let lastY = window.scrollY;
  const update = () => {
    if (!mq.matches) { navEl.classList.remove('nav-collapsed'); return; }
    const y = window.scrollY;
    if (y < 40) navEl.classList.remove('nav-collapsed');
    else if (y > lastY + 4) navEl.classList.add('nav-collapsed');
    else if (y < lastY - 4) navEl.classList.remove('nav-collapsed');
    lastY = y;
  };
  window.addEventListener('scroll', update, { passive: true });
  mq.addEventListener('change', update);
})();

/* ── HERO HALO ── */
const hero = document.getElementById('hero');
if (hero) {
  hero.addEventListener('mousemove', e => {
    const r = hero.getBoundingClientRect();
    hero.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    hero.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });
}

/* ── SMOOTH LERP SCROLL (desktop only) ── */
if (window.matchMedia('(hover: hover)').matches) {
  let targetY = window.scrollY;
  let currentY = window.scrollY;
  const EASE = 0.12;

  window.addEventListener('wheel', e => {
    if (e.ctrlKey || e.metaKey) return; // allow pinch-zoom
    e.preventDefault();
    targetY = Math.max(0, Math.min(
      targetY + e.deltaY,
      document.documentElement.scrollHeight - window.innerHeight
    ));
  }, { passive: false });

  // Intercept anchor nav so lerp follows
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) { e.preventDefault(); targetY = target.offsetTop; }
    });
  });

  (function tick() {
    const diff = targetY - currentY;
    if (Math.abs(diff) > 0.3) {
      currentY += diff * EASE;
      window.scrollTo(0, currentY);
    }
    requestAnimationFrame(tick);
  })();
}

/* ── PIXEL REVEAL ON CARD THUMBS ── */
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return [r,g,b];
}
function lerpColor(hex1, hex2, t) {
  t = Math.max(0, Math.min(1, t));
  const [r1,g1,b1] = hexToRgb(hex1);
  const [r2,g2,b2] = hexToRgb(hex2);
  return `rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`;
}

const THUMB_COLORS = {
  t1: ['#111624','#4a4f7a'],
  t2: ['#0f1a17','#3a6b58'],
  t3: ['#1a1412','#6b4a3a'],
  t4: ['#181318','#5a3a5a'],
};

// Delay setup so page-load visible cards still show the pixel effect
setTimeout(() => document.querySelectorAll('.card-thumb').forEach(thumb => {
  const cls = [...thumb.classList].find(c => THUMB_COLORS[c]);
  if (!cls) return;
  const [c1, c2] = THUMB_COLORS[cls];

  const COLS = 8, ROWS = 5;
  const canvas = document.createElement('canvas');
  canvas.width = COLS; canvas.height = ROWS;
  Object.assign(canvas.style, {
    position: 'absolute', top: '0', left: '0', right: '0', bottom: '0',
    width: '100%', height: '100%',
    imageRendering: 'pixelated', zIndex: '3', pointerEvents: 'none',
    opacity: '1', transition: 'opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
  });

  const ctx = canvas.getContext('2d');
  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < ROWS; y++) {
      // Mix dark base with lighter accent pixels for visible contrast
      const rand = Math.random();
      const t = rand < 0.35 ? Math.random() * 0.4 + 0.6 : Math.random() * 0.4;
      ctx.fillStyle = lerpColor(c1, c2, t);
      ctx.fillRect(x, y, 1, 1);
    }
  }

  thumb.appendChild(canvas);

  // Fade out 900ms after card enters viewport (independent of scroll-reveal)
  let faded = false;
  const pixelObs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && !faded) {
      faded = true;
      setTimeout(() => { canvas.style.opacity = '0'; }, 900);
      pixelObs.disconnect();
    }
  }, { threshold: 0.2, rootMargin: '0px 0px -40px 0px' });
  pixelObs.observe(thumb);
}), 50);

/* ── COUNTER ANIMATION ── */
function animateCounter(el) {
  const target = +el.dataset.count;
  const suffix = el.dataset.suffix || '';
  const duration = 1400;
  const start = performance.now();

  const easeOutExpo = t => 1 - Math.pow(1 - t, 4);

  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const value = Math.floor(easeOutExpo(progress) * target);
    el.textContent = value + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

const counterObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !entry.target.dataset.counted) {
      entry.target.dataset.counted = 'true';
      animateCounter(entry.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.about-stat-num[data-count]').forEach(el => counterObserver.observe(el));

/* ── SCROLL REVEAL ── */
const io = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => io.observe(el));
