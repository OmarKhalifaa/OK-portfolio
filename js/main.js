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

/* ── SCROLL REVEAL ── */
const io = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => io.observe(el));
