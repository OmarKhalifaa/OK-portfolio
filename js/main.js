/* ── THEME TOGGLE ── */
(() => {
  const saved = localStorage.getItem('theme');
  const theme = saved || 'dark';
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  const btn = document.getElementById('themeToggle');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let isTransitioning = false;

  const applyTheme = isLight => {
    if (isLight) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  };

  if (btn) {
    btn.addEventListener('click', () => {
      if (isTransitioning) return;
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';

      if (!document.startViewTransition || reduceMotion.matches) {
        applyTheme(isLight);
        return;
      }

      isTransitioning = true;
      const transition = document.startViewTransition(() => applyTheme(isLight));
      transition.finished.finally(() => { isTransitioning = false; });
    });
  }
})();

/* ── MOBILE MENU ── */
(() => {
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('mobileMenuToggle');
  const links = document.getElementById('primaryLinks');
  if (!nav || !toggle || !links) return;

  const setOpen = open => {
    nav.classList.toggle('mobile-menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };

  toggle.addEventListener('click', () => {
    setOpen(!nav.classList.contains('mobile-menu-open'));
  });

  links.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => setOpen(false));
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setOpen(false);
  });

  window.matchMedia('(min-width: 621px)').addEventListener('change', event => {
    if (event.matches) setOpen(false);
  });
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

/* ── HERO DOT GLINTS ── */
(() => {
  const field = document.getElementById('heroDotGlints');
  if (!field) return;

  for (let i = 0; i < 12; i += 1) {
    const glint = document.createElement('span');
    glint.style.setProperty('--x', `${4 + Math.random() * 92}%`);
    glint.style.setProperty('--y', `${4 + Math.random() * 82}%`);
    glint.style.setProperty('--delay', `${-Math.random() * 7}s`);
    glint.style.setProperty('--speed', `${3.5 + Math.random() * 4}s`);
    field.appendChild(glint);
  }
})();

/* ── HALO CARDS ── */
document.querySelectorAll('.halo-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    card.style.setProperty('--my', (e.clientY - r.top)  + 'px');
  });
});

/* ── HERO FLUID TRAIL ── */
(() => {
  const canvas = document.getElementById('heroTrail');
  const section = document.getElementById('hero');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canHover = window.matchMedia('(hover: hover)');
  if (!canvas || !section || reduceMotion.matches || !canHover.matches) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  const dotCanvas = document.createElement('canvas');
  const dotCtx = dotCanvas.getContext('2d', { alpha: true });
  const patternCanvas = document.createElement('canvas');
  const patternCtx = patternCanvas.getContext('2d');
  const points = [];
  const fragments = [];
  let lastPoint = null;
  let targetPoint = null;
  let renderedPoint = null;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let animationFrame = null;
  let dotPattern = null;
  let lastImpact = 0;

  const TRAIL_LIFETIME = 1750;
  const MAX_POINTS = 82;
  const TRAIL_INERTIA = 0.075;

  const accentRgb = () => {
    const value = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    const hex = value.replace('#', '');
    if (/^[0-9a-f]{6}$/i.test(hex)) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16)
      ];
    }
    return [93, 202, 165];
  };
  let accent = accentRgb();

  const resize = () => {
    const rect = section.getBoundingClientRect();
    const nextWidth = Math.round(rect.width);
    const nextHeight = Math.round(rect.height);
    if (nextWidth === width && nextHeight === height) return;

    width = nextWidth;
    height = nextHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    dotCanvas.width = canvas.width;
    dotCanvas.height = canvas.height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dotCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    patternCanvas.width = 12;
    patternCanvas.height = 12;
    patternCtx.clearRect(0, 0, 12, 12);
    patternCtx.fillStyle = '#fff';
    patternCtx.beginPath();
    patternCtx.arc(2, 2, 1.25, 0, Math.PI * 2);
    patternCtx.fill();
    dotPattern = dotCtx.createPattern(patternCanvas, 'repeat');
    points.length = 0;
    fragments.length = 0;
    lastPoint = null;
    targetPoint = null;
    renderedPoint = null;
  };

  const addPoint = (x, y, time) => {
    if (!lastPoint) {
      points.push({ x, y, time });
      lastPoint = { x, y };
      return;
    }

    const dx = x - lastPoint.x;
    const dy = y - lastPoint.y;
    const distance = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(distance / 10));
    for (let step = 1; step <= steps; step++) {
      const progress = step / steps;
      points.push({
        x: lastPoint.x + dx * progress,
        y: lastPoint.y + dy * progress,
        time
      });
    }
    if (points.length > MAX_POINTS) points.splice(0, points.length - MAX_POINTS);
    lastPoint = { x, y };
  };

  const drawSegment = (targetCtx, from, control, to, width, color) => {
    targetCtx.beginPath();
    targetCtx.moveTo(from.x, from.y);
    targetCtx.quadraticCurveTo(control.x, control.y, to.x, to.y);
    targetCtx.lineWidth = width;
    targetCtx.strokeStyle = color;
    targetCtx.stroke();
  };

  const burstAtEdge = (x, y, normalX, normalY, isCorner) => {
    const count = isCorner ? 34 : 20;
    const impactX = Math.max(2, Math.min(width - 2, x));
    const impactY = Math.max(2, Math.min(height - 2, y));

    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * (isCorner ? 5 : 3.5);
      const force = 0.8 + Math.random() * (isCorner ? 2.8 : 2.1);
      const tangentX = normalY;
      const tangentY = -normalX;
      fragments.push({
        x: impactX + (Math.random() - 0.5) * 18,
        y: impactY + (Math.random() - 0.5) * 18,
        vx: normalX * force + tangentX * spread,
        vy: normalY * force + tangentY * spread,
        size: 1.4 + Math.random() * 3.2,
        life: 0.7 + Math.random() * 0.3
      });
    }

    if (fragments.length > 90) fragments.splice(0, fragments.length - 90);
    points.splice(Math.max(0, points.length - (isCorner ? 18 : 10)));
  };

  const draw = now => {
    ctx.clearRect(0, 0, width, height);
    dotCtx.clearRect(0, 0, width, height);
    const [r, g, b] = accent;

    if (targetPoint) {
      if (!renderedPoint) {
        renderedPoint = { x: targetPoint.x, y: targetPoint.y };
        addPoint(renderedPoint.x, renderedPoint.y, now);
      } else {
        const previousX = renderedPoint.x;
        const previousY = renderedPoint.y;
        const dx = targetPoint.x - renderedPoint.x;
        const dy = targetPoint.y - renderedPoint.y;
        const distance = Math.hypot(dx, dy);

        if (distance > 0.2) {
          renderedPoint.x += dx * TRAIL_INERTIA;
          renderedPoint.y += dy * TRAIL_INERTIA;
          const velocityX = renderedPoint.x - previousX;
          const velocityY = renderedPoint.y - previousY;
          addPoint(renderedPoint.x, renderedPoint.y, now);

          const edge = 34;
          const hitLeft = renderedPoint.x <= edge && velocityX < -0.15;
          const hitRight = renderedPoint.x >= width - edge && velocityX > 0.15;
          const hitTop = renderedPoint.y <= edge && velocityY < -0.15;
          const hitBottom = renderedPoint.y >= height - edge && velocityY > 0.15;

          if ((hitLeft || hitRight || hitTop || hitBottom) && now - lastImpact > 180) {
            const normalX = hitLeft ? 1 : hitRight ? -1 : 0;
            const normalY = hitTop ? 1 : hitBottom ? -1 : 0;
            burstAtEdge(
              renderedPoint.x,
              renderedPoint.y,
              normalX,
              normalY,
              normalX !== 0 && normalY !== 0
            );
            lastImpact = now;
          }
        }
      }
    }

    const cutoff = now - TRAIL_LIFETIME;

    while (points.length && points[0].time < cutoff) points.shift();
    if (!points.length && !fragments.length) {
      animationFrame = null;
      return;
    }

    dotCtx.lineCap = 'round';
    dotCtx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.16)`;
    ctx.shadowBlur = 14;

    for (let i = 1; i < points.length; i++) {
      const previous = points[i - 1];
      const current = points[i];
      const next = points[i + 1] || current;
      const from = {
        x: (previous.x + current.x) * 0.5,
        y: (previous.y + current.y) * 0.5
      };
      const to = {
        x: (current.x + next.x) * 0.5,
        y: (current.y + next.y) * 0.5
      };
      const life = Math.max(0, 1 - (now - current.time) / TRAIL_LIFETIME);
      const easedLife = life * life * (3 - 2 * life);

      drawSegment(
        ctx,
        from,
        current,
        to,
        88 * (0.45 + easedLife * 0.55),
        `rgba(${r}, ${g}, ${b}, ${0.045 * easedLife})`
      );
      drawSegment(
        dotCtx,
        from,
        current,
        to,
        82 * (0.5 + easedLife * 0.5),
        `rgba(${r}, ${g}, ${b}, ${0.68 * easedLife})`
      );
    }

    ctx.shadowBlur = 0;
    dotCtx.globalCompositeOperation = 'destination-in';
    dotCtx.fillStyle = dotPattern;
    dotCtx.fillRect(0, 0, width, height);
    dotCtx.globalCompositeOperation = 'source-over';
    ctx.drawImage(dotCanvas, 0, 0, dotCanvas.width, dotCanvas.height, 0, 0, width, height);

    for (let i = fragments.length - 1; i >= 0; i--) {
      const fragment = fragments[i];
      fragment.vx *= 0.94;
      fragment.vy = fragment.vy * 0.94 + 0.012;
      fragment.x += fragment.vx;
      fragment.y += fragment.vy;
      fragment.life -= 0.016;

      if (fragment.x <= 0 || fragment.x >= width) {
        fragment.x = Math.max(0, Math.min(width, fragment.x));
        fragment.vx *= -0.42;
      }
      if (fragment.y <= 0 || fragment.y >= height) {
        fragment.y = Math.max(0, Math.min(height, fragment.y));
        fragment.vy *= -0.42;
      }

      if (fragment.life <= 0) {
        fragments.splice(i, 1);
        continue;
      }

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.72 * fragment.life})`;
      ctx.beginPath();
      ctx.arc(fragment.x, fragment.y, fragment.size * fragment.life, 0, Math.PI * 2);
      ctx.fill();
    }
    animationFrame = requestAnimationFrame(draw);
  };

  section.addEventListener('pointermove', event => {
    const rect = section.getBoundingClientRect();
    const events = event.getCoalescedEvents ? event.getCoalescedEvents() : [event];
    const pointerEvent = events[events.length - 1] || event;
    targetPoint = {
      x: pointerEvent.clientX - rect.left,
      y: pointerEvent.clientY - rect.top
    };

    if (!animationFrame) animationFrame = requestAnimationFrame(draw);
  }, { passive: true });

  section.addEventListener('pointerleave', () => {
    targetPoint = null;
  });
  window.addEventListener('resize', resize, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(section);
  new MutationObserver(() => { accent = accentRgb(); }).observe(
    document.documentElement,
    { attributes: true, attributeFilter: ['data-theme'] }
  );
  resize();
})();

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
      const href = (a.getAttribute('href') || '').trim();
      if (!href || href === '#') return;
      const target = document.querySelector(href);
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
  const duration = 6500;
  const targetText = String(target);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  el.textContent = '';
  el.setAttribute('aria-label', `${target}${suffix}`);

  const number = document.createElement('span');
  number.className = 'counter-number';
  number.setAttribute('aria-hidden', 'true');

  [...targetText].forEach((digit, index) => {
    const place = 10 ** (targetText.length - index - 1);
    const turns = Math.floor(target / place);
    const slot = document.createElement('span');
    const reel = document.createElement('span');
    slot.className = 'counter-slot';
    reel.className = 'counter-reel';

    for (let step = 0; step <= turns; step += 1) {
      const item = document.createElement('span');
      item.className = 'counter-digit';
      item.textContent = String(step % 10);
      reel.appendChild(item);
    }

    slot.appendChild(reel);
    number.appendChild(slot);

    if (!reduceMotion && turns > 0) {
      requestAnimationFrame(() => {
        reel.animate(
          [
            { transform: 'translateY(0)' },
            { transform: `translateY(-${turns}em)` }
          ],
          {
            duration,
            easing: 'cubic-bezier(.45, 0, .25, 1)',
            fill: 'forwards'
          }
        );
      });
    } else {
      reel.style.transform = `translateY(-${turns}em)`;
    }
  });

  el.appendChild(number);

  if (suffix) {
    const suffixEl = document.createElement('span');
    suffixEl.className = 'counter-suffix';
    suffixEl.setAttribute('aria-hidden', 'true');
    suffixEl.textContent = suffix;
    el.appendChild(suffixEl);
  }
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
