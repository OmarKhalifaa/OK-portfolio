/* ── THEME TOGGLE ── */
(() => {
  let saved;
  try { saved = localStorage.getItem('theme'); } catch { /* The theme still works without storage. */ }
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
    const nextTheme = isLight ? 'dark' : 'light';
    if (isLight) document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', 'light');
    try { localStorage.setItem('theme', nextTheme); } catch { /* Optional preference persistence. */ }
    btn?.setAttribute('aria-label', isLight ? 'Switch to light theme' : 'Switch to dark theme');
  };

  if (btn) {
    btn.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    btn.addEventListener('click', () => {
      if (isTransitioning) return;
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';

      if (!document.startViewTransition || reduceMotion.matches) {
        applyTheme(isLight);
        return;
      }

      isTransitioning = true;
      const transition = document.startViewTransition(() => applyTheme(isLight));
      transition.finished.then(
        () => { isTransitioning = false; },
        () => { isTransitioning = false; }
      );
    });
  }
})();

/* ── MOBILE MENU ── */
(() => {
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('mobileMenuToggle');
  const links = document.getElementById('primaryLinks');
  if (!nav || !toggle || !links) return;
  nav.classList.add('has-mobile-menu');

  const setOpen = open => {
    nav.classList.toggle('mobile-menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };

  toggle.addEventListener('click', () => {
    setOpen(!nav.classList.contains('mobile-menu-open'));
  });

  links.addEventListener('click', event => {
    if (event.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && nav.classList.contains('mobile-menu-open')) {
      setOpen(false);
      toggle.focus();
    }
  });

  window.matchMedia('(min-width: 621px)').addEventListener('change', event => {
    if (event.matches) setOpen(false);
  });
})();

/* ── CUSTOM CURSOR ── */
(() => {
  const cursor = document.getElementById('cursor');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  if (!cursor || !pointer.matches || reduceMotion.matches) return;
  cursor.setAttribute('aria-hidden', 'true');
  let tx = 0, ty = 0, cx = 0, cy = 0;
  let animationFrame = null;

  const stop = () => {
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    animationFrame = null;
    cursor.classList.remove('is-active', 'hover-state');
  };
  const animate = () => {
    cx += (tx - cx) * 0.15;
    cy += (ty - cy) * 0.15;
    const moving = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.1;
    if (!moving) { cx = tx; cy = ty; }
    cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`;
    animationFrame = moving ? requestAnimationFrame(animate) : null;
  };

  document.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || reduceMotion.matches || !pointer.matches) return;
    tx = event.clientX;
    ty = event.clientY;
    if (!cursor.classList.contains('is-active')) {
      cx = tx;
      cy = ty;
      cursor.classList.add('is-active');
    }
    cursor.classList.toggle('hover-state', Boolean(event.target.closest('a, button')));
    if (animationFrame === null) animationFrame = requestAnimationFrame(animate);
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', stop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  reduceMotion.addEventListener('change', stop);
  pointer.addEventListener('change', stop);
})();

/* ── HERO DOT GLINTS ── */
(() => {
  const field = document.getElementById('heroDotGlints');
  if (!field || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const glints = document.createDocumentFragment();
  for (let i = 0; i < 12; i += 1) {
    const glint = document.createElement('span');
    glint.style.setProperty('--x', `${4 + Math.random() * 92}%`);
    glint.style.setProperty('--y', `${4 + Math.random() * 82}%`);
    glint.style.setProperty('--delay', `${-Math.random() * 7}s`);
    glint.style.setProperty('--speed', `${3.5 + Math.random() * 4}s`);
    glints.appendChild(glint);
  }
  field.appendChild(glints);
})();

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
  if (!ctx || !dotCtx || !patternCtx) return;
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
  let previousFrame = 0;
  let pendingPointer = null;
  let inView = true;

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
    const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
    if (nextWidth === width && nextHeight === height && nextDpr === dpr) return;

    width = nextWidth;
    height = nextHeight;
    dpr = nextDpr;
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
    const steps = Math.min(MAX_POINTS, Math.max(1, Math.ceil(distance / 10)));
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
    const elapsed = previousFrame ? Math.min(now - previousFrame, 50) : 1000 / 60;
    const frameRatio = elapsed / (1000 / 60);
    previousFrame = now;
    if (pendingPointer) {
      const rect = section.getBoundingClientRect();
      targetPoint = { x: pendingPointer.x - rect.left, y: pendingPointer.y - rect.top };
      pendingPointer = null;
    }
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
          const inertia = 1 - (1 - TRAIL_INERTIA) ** frameRatio;
          renderedPoint.x += dx * inertia;
          renderedPoint.y += dy * inertia;
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
      previousFrame = 0;
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
      const drag = 0.94 ** frameRatio;
      fragment.vx *= drag;
      fragment.vy = fragment.vy * drag + 0.012 * frameRatio;
      fragment.x += fragment.vx * frameRatio;
      fragment.y += fragment.vy * frameRatio;
      fragment.life -= elapsed / 1000;

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
    if (event.pointerType === 'touch' || document.hidden || !inView || reduceMotion.matches || !canHover.matches) return;
    const events = event.getCoalescedEvents ? event.getCoalescedEvents() : [event];
    const pointerEvent = events[events.length - 1] || event;
    pendingPointer = { x: pointerEvent.clientX, y: pointerEvent.clientY };

    if (animationFrame === null) animationFrame = requestAnimationFrame(draw);
  }, { passive: true });

  section.addEventListener('pointerleave', () => {
    targetPoint = null;
    pendingPointer = null;
  });
  const stop = () => {
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    animationFrame = null;
    previousFrame = 0;
    points.length = 0;
    fragments.length = 0;
    lastPoint = null;
    targetPoint = null;
    renderedPoint = null;
    pendingPointer = null;
    ctx.clearRect(0, 0, width, height);
    dotCtx.clearRect(0, 0, width, height);
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  reduceMotion.addEventListener('change', stop);
  canHover.addEventListener('change', stop);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (!inView) stop();
    }).observe(section);
  }
  window.addEventListener('resize', resize, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(section);
  new MutationObserver(() => { accent = accentRgb(); }).observe(
    document.documentElement,
    { attributes: true, attributeFilter: ['data-theme'] }
  );
  resize();
})();

/* ── PRERENDERED THUMBNAILS ── */
(() => {
  const thumbnails = document.querySelectorAll('[data-project-card] .card-thumb');
  if (!thumbnails.length) {
    window.homepageAssetsReady = Promise.resolve();
    return;
  }
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const reveals = new Map();
  const observer = !reduceMotion.matches && 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      const reveal = reveals.get(entry.target);
      reveals.delete(entry.target);
      reveal?.();
      if (!reveals.size) observer.disconnect();
    });
  }, { threshold: .12 }) : null;
  const entranceReady = document.documentElement.classList.contains('home-enter-pending')
    ? new Promise(resolve => document.addEventListener('portfolio:ready', resolve, { once: true }))
    : Promise.resolve();

  // Progressive enhancement: content and thumbnails already exist in the HTML.
  async function prepareThumbnailReveal(thumb, image) {
    let blurLayer;
    let pixelLayer;
    if (!reduceMotion.matches && !thumb.classList.contains('has-video-thumbnail')) {
      blurLayer = image.cloneNode();
      blurLayer.className = 'cms-card-thumb-image thumb-blur-layer';
      blurLayer.alt = '';
      blurLayer.setAttribute('aria-hidden', 'true');
      thumb.classList.add('has-thumbnail-reveal');
      thumb.append(blurLayer);
      pixelLayer = document.createElement('canvas');
      pixelLayer.className = 'thumb-pixel-layer';
      pixelLayer.width = 8;
      pixelLayer.height = 5;
      pixelLayer.setAttribute('aria-hidden', 'true');
      const context = pixelLayer.getContext('2d');
      const rgb = hex => [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
      const isHex = value => /^#[0-9a-f]{6}$/i.test(value || '');
      const base = rgb(isHex(thumb.dataset.pixelBase) ? thumb.dataset.pixelBase : '#230707');
      const accent = rgb(isHex(thumb.dataset.pixelAccent) ? thumb.dataset.pixelAccent : '#8f1717');
      if (context) {
        for (let x = 0; x < 8; x++) {
          for (let y = 0; y < 5; y++) {
            const mix = Math.random() < .35 ? .6 + Math.random() * .4 : Math.random() * .4;
            const color = base.map((channel, i) => Math.round(channel + (accent[i] - channel) * mix));
            context.fillStyle = `rgb(${color.join(',')})`;
            context.fillRect(x, y, 1, 1);
          }
        }
        thumb.append(pixelLayer);
      }
    }
    try {
      if (image.decode) await image.decode();
      else if (!image.complete) await new Promise((resolve, reject) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', reject, { once: true });
      });
      if (!image.naturalWidth) throw new Error('Thumbnail unavailable');
    } catch {
      blurLayer?.remove();
      pixelLayer?.remove();
      image.remove();
      thumb.classList.remove('has-thumbnail-reveal', 'has-cms-thumbnail');
      return;
    }
    if (reduceMotion.matches || thumb.classList.contains('has-video-thumbnail')) {
      blurLayer?.remove();
      pixelLayer?.remove();
      thumb.classList.remove('has-thumbnail-reveal');
      return;
    }
    thumb.classList.add('thumbnail-loaded');
    entranceReady.then(() => {
      const reveal = () => {
        // Give the blurred layer a painted frame even on a warm-cache return.
        requestAnimationFrame(() => requestAnimationFrame(() => {
          thumb.classList.add('thumbnail-revealing');
          setTimeout(() => {
            blurLayer?.remove();
            pixelLayer?.remove();
            thumb.classList.remove('has-thumbnail-reveal', 'thumbnail-loaded', 'thumbnail-revealing');
          }, 1900);
        }));
      };
      if (observer) {
        reveals.set(thumb, reveal);
        observer.observe(thumb);
      } else {
        reveal();
      }
    });
  }

  const visibleThumbnails = [];
  thumbnails.forEach(thumb => {
    const image = thumb.querySelector('.cms-card-thumb-image');
    if (!image) return;
    const rect = thumb.getBoundingClientRect();
    const ready = prepareThumbnailReveal(thumb, image);
    if (rect.top < innerHeight && rect.bottom > 0) visibleThumbnails.push(ready);
  });
  window.homepageAssetsReady = Promise.allSettled(visibleThumbnails);
})();

/* ── COUNTER ANIMATION ── */
(() => {
  const counters = document.querySelectorAll('.about-stat-num[data-count]');
  if (!counters.length) return;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  reduceMotion.addEventListener('change', event => {
    if (!event.matches) return;
    counters.forEach(el => {
      el.getAnimations?.({ subtree: true }).forEach(animation => animation.cancel());
      animateCounter(el);
    });
  });
  function animateCounter(el) {
    const target = +el.dataset.count;
    const suffix = el.dataset.suffix || '';
    const duration = 6500;
    const targetText = String(target);
    if (!Number.isSafeInteger(target) || target < 0) return;
    if (reduceMotion.matches || !el.animate) {
      el.textContent = `${target}${suffix}`;
      return;
    }

    el.textContent = '';
    el.setAttribute('aria-label', `${target}${suffix}`);

    const number = document.createElement('span');
    number.className = 'counter-number';
    number.setAttribute('aria-hidden', 'true');

    [...targetText].forEach((digit, index) => {
      const place = 10 ** (targetText.length - index - 1);
      const turns = Math.min(Math.floor(target / place), 20 + Number(digit));
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

      if (turns > 0) {
        requestAnimationFrame(() => {
          const animation = reel.animate(
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
          animation.finished.then(() => {
            reel.style.transform = `translateY(-${turns}em)`;
            animation.cancel();
          }, () => {});
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

  const observeCounters = () => {
    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      counters.forEach(animateCounter);
      return;
    }
    const counterObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        counterObserver.unobserve(entry.target);
        animateCounter(entry.target);
      });
    }, { threshold: 0.5 });
    counters.forEach(el => counterObserver.observe(el));
  };
  if (document.documentElement.classList.contains('home-enter-pending')) {
    document.addEventListener('portfolio:ready', observeCounters, { once: true });
  } else {
    observeCounters();
  }
})();
