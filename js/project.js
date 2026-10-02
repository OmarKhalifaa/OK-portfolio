(() => {
  const root = document.documentElement;
  const themeButton = document.getElementById('themeToggle');
  let savedTheme = 'dark';
  try { savedTheme = localStorage.getItem('theme') || 'dark'; } catch { /* Storage may be disabled. */ }
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let isThemeTransitioning = false;

  const applyTheme = theme => {
    if (theme === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
    try { localStorage.setItem('theme', theme); } catch { /* Keep the theme usable without storage. */ }
    themeButton?.setAttribute('aria-label', theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
    themeButton?.setAttribute('aria-pressed', String(theme === 'light'));
  };

  applyTheme(savedTheme === 'light' ? 'light' : 'dark');

  themeButton?.addEventListener('click', () => {
    if (isThemeTransitioning) return;
    const isLight = root.getAttribute('data-theme') === 'light';
    const nextTheme = isLight ? 'dark' : 'light';

    if (!document.startViewTransition || reduceMotion.matches) {
      applyTheme(nextTheme);
      return;
    }

    isThemeTransitioning = true;
    const transition = document.startViewTransition(() => applyTheme(nextTheme));
    transition.finished.finally(() => { isThemeTransitioning = false; });
  });

  const nav = document.getElementById('nav');
  const menuToggle = document.getElementById('mobileMenuToggle');
  const primaryLinks = document.getElementById('primaryLinks');
  const setMenuOpen = open => {
    nav?.classList.toggle('mobile-menu-open', open);
    menuToggle?.setAttribute('aria-expanded', String(open));
    menuToggle?.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };

  menuToggle?.addEventListener('click', () => setMenuOpen(!nav?.classList.contains('mobile-menu-open')));
  primaryLinks?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenuOpen(false)));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') setMenuOpen(false); });
  window.matchMedia('(min-width: 621px)').addEventListener('change', event => { if (event.matches) setMenuOpen(false); });
  nav?.classList.add('is-enhanced');

  const setupScrollReveals = scope => {
    const blocks = [...(scope?.querySelectorAll('.content-block') || [])];
    if (!blocks.length) return;

    blocks.forEach(block => block.classList.add('scroll-reveal'));
    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      blocks.forEach(block => block.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: .08 });

    blocks.forEach(block => observer.observe(block));
  };

  const activateToc = links => {
    const sections = links.map(link => document.getElementById(link.hash.slice(1))).filter(Boolean);
    const setActive = id => links.forEach(link => {
      const active = link.getAttribute('href') === `#${id}`;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });

    const activateHash = () => {
      const id = window.location.hash.slice(1);
      if (id && sections.some(section => section.id === id)) setActive(id);
    };

    links.forEach(link => link.addEventListener('click', () => {
      const id = link.getAttribute('href')?.slice(1);
      if (id) setActive(id);
    }));

    window.addEventListener('hashchange', activateHash);
    window.addEventListener('scroll', () => {
      const atPageEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8;
      if (atPageEnd && sections.length) setActive(sections.at(-1).id);
    }, { passive: true });

    activateHash();
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id);
    }, { rootMargin: '-18% 0px -68% 0px', threshold: 0 });

    sections.forEach(section => observer.observe(section));
  };


  const content = document.getElementById('projectContent');
  content?.querySelectorAll('[data-page-preview]').forEach(preview => {
    const tabs = [...preview.querySelectorAll('[data-page-tab]')];
    const panels = [...preview.querySelectorAll('[data-page-panel]')];
    const scrollPositions = panels.map(() => 0);
    const select = index => {
      panels.forEach((panel, i) => {
        if (!panel.hidden) scrollPositions[i] = panel.scrollTop;
      });
      tabs.forEach((tab, i) => {
        tab.setAttribute('aria-selected', String(i === index));
        tab.tabIndex = i === index ? 0 : -1;
        panels[i].hidden = i !== index;
      });
      panels[index].scrollTop = scrollPositions[index];
    };
    if (!tabs.length || tabs.length !== panels.length) return;
    preview.classList.add('is-enhanced');
    select(0);
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(i));
      tab.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = (i + 1) % tabs.length;
        if (event.key === 'ArrowLeft') next = (i + tabs.length - 1) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (next === undefined) return;
        event.preventDefault();
        select(next);
        tabs[next].focus();
      });
    });
  });
  content?.querySelectorAll('[data-before-after]').forEach(comparison => {
    const input = comparison.querySelector('input');
    if (!input) return;
    comparison.classList.add('is-enhanced');
    if (comparison.classList.contains('cms-compare-full_page')) {
      const images = [...comparison.querySelectorAll('img')];
      const resize = () => {
        const ratios = images.filter(image => image.naturalHeight).map(image => image.naturalWidth / image.naturalHeight);
        if (ratios.length) comparison.style.setProperty('--compare-page-ratio', Math.min(...ratios));
      };
      images.forEach(image => image.addEventListener('load', resize));
      resize();
    }
    const update = value => {
      const percent = Math.max(0, Math.min(100, Number(value) || 0));
      input.value = String(percent);
      comparison.style.setProperty('--compare-position', `${percent}%`);
      input.setAttribute('aria-valuetext', `${input.dataset.beforeLabel} ${Math.round(percent)}%, ${input.dataset.afterLabel} ${Math.round(100 - percent)}%`);
      comparison.querySelector('[data-compare-label-before]').style.opacity = percent < 12 ? '0' : '1';
      comparison.querySelector('[data-compare-label-after]').style.opacity = percent > 88 ? '0' : '1';
    };
    const updateFromPointer = event => {
      const bounds = comparison.getBoundingClientRect();
      update(Math.round((event.clientX - bounds.left) / bounds.width * 100));
    };
    input.addEventListener('input', () => update(input.value));
    let activePointer = null;
    input.addEventListener('pointerdown', event => {
      if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
      event.preventDefault();
      input.focus({ preventScroll: true });
      activePointer = event.pointerId;
      input.setPointerCapture(event.pointerId);
      updateFromPointer(event);
    });
    input.addEventListener('pointermove', event => {
      if (event.pointerId === activePointer) updateFromPointer(event);
    });
    const endDrag = () => { activePointer = null; };
    input.addEventListener('pointerup', endDrag);
    input.addEventListener('pointercancel', endDrag);
    input.addEventListener('lostpointercapture', endDrag);
    update(input.value);
  });
  setupScrollReveals(content);
  document.querySelectorAll('.cms-scroll-shell').forEach(shell => {
    const frame = shell.querySelector('.cms-display-scroll');
    if (!frame) return;
    frame.addEventListener('scroll', () => shell.classList.toggle('has-scrolled', frame.scrollTop > 12), { passive: true });
  });
  document.querySelectorAll('.cms-feature-catalog-block').forEach(catalog => {
    const status = catalog.querySelector('[data-feature-status]');
    catalog.querySelectorAll('[data-feature-control]').forEach(control => {
      control.addEventListener('click', () => {
        const maximumLevel = Number(control.dataset.maxLevel || 1);
        const nextLevel = (Number(control.dataset.level || 0) + 1) % (maximumLevel + 1);
        const label = control.querySelector('.cms-feature-label')?.textContent?.trim() || 'Feature';
        const isActive = nextLevel > 0;
        control.dataset.level = String(nextLevel);
        control.classList.toggle('is-active', isActive);
        control.setAttribute('aria-pressed', String(isActive));
        const state = control.dataset.controlType === 'level' && isActive ? `level ${nextLevel} of ${maximumLevel}` : isActive ? 'on' : 'off';
        control.setAttribute('aria-label', `${label}, ${state}`);
        control.querySelectorAll('.cms-feature-pips i').forEach((pip, pipIndex) => pip.classList.toggle('is-filled', pipIndex < nextLevel));
        if (status) status.textContent = `${label}: ${state}`;
      });
    });
  });
  document.querySelectorAll('[data-motion-showcase]').forEach(showcase => {
    showcase.classList.add('is-enhanced');
    const motionToggle = showcase.querySelector('[data-motion-toggle]');
    const motionStatus = showcase.querySelector('[data-motion-status]');
    motionToggle?.addEventListener('click', () => {
      const paused = !showcase.classList.contains('is-paused');
      showcase.classList.toggle('is-paused', paused);
      motionToggle.setAttribute('aria-pressed', String(paused));
      const label = paused ? 'Resume motion' : 'Pause motion';
      const labelElement = motionToggle.querySelector('span');
      if (labelElement) labelElement.textContent = label;
      if (motionStatus) motionStatus.textContent = paused ? 'Feature animation paused.' : 'Feature animation playing.';
    });
    showcase.querySelectorAll('[data-motion-feature]').forEach(control => {
      control.addEventListener('click', () => {
        const active = !control.classList.contains('is-active');
        const label = control.querySelector('strong')?.textContent?.trim() || 'Feature';
        control.classList.toggle('is-active', active);
        control.setAttribute('aria-pressed', String(active));
        control.setAttribute('aria-label', `${label}, ${active ? 'on' : 'off'}`);
        if (motionStatus) motionStatus.textContent = `${label}: ${active ? 'on' : 'off'}.`;
      });
    });
  });
  document.querySelectorAll('[data-widget-showcase]').forEach(showcase => {
    showcase.classList.add('is-enhanced');
    const product = showcase.querySelector('[data-widget-product]');
    const status = showcase.querySelector('[data-widget-status]');
    const setWidgetOpen = open => {
      if (product) product.hidden = !open;
      if (status) status.textContent = open ? 'Accessibility widget opened.' : 'Accessibility widget closed.';
    };
    const resetWidget = () => {
      showcase.querySelectorAll('[data-widget-control]').forEach(control => {
        control.dataset.level = '0';
        control.classList.remove('is-active');
        control.setAttribute('aria-pressed', 'false');
        const label = control.querySelector('strong')?.textContent?.trim() || 'Feature';
        control.setAttribute('aria-label', `${label}, off`);
        control.querySelectorAll('.cms-widget-pips i').forEach(pip => pip.classList.remove('is-filled'));
      });
      if (status) status.textContent = 'All visual settings reset.';
    };
    showcase.querySelectorAll('[data-widget-accordion]').forEach(toggle => {
      const collapsed = toggle.dataset.initiallyCollapsed === 'true';
      toggle.setAttribute('aria-expanded', String(!collapsed));
      toggle.closest('.cms-widget-category')?.classList.toggle('is-collapsed', collapsed);
      toggle.addEventListener('click', () => {
        const category = toggle.closest('.cms-widget-category');
        const expanded = toggle.getAttribute('aria-expanded') !== 'false';
        toggle.setAttribute('aria-expanded', String(!expanded));
        category?.classList.toggle('is-collapsed', expanded);
      });
    });
    showcase.querySelectorAll('[data-widget-control]').forEach(control => control.addEventListener('click', () => {
      const maximumLevel = Number(control.dataset.maxLevel || 1);
      const nextLevel = (Number(control.dataset.level || 0) + 1) % (maximumLevel + 1);
      const label = control.querySelector('strong')?.textContent?.trim() || 'Feature';
      const active = nextLevel > 0;
      control.dataset.level = String(nextLevel);
      control.classList.toggle('is-active', active);
      control.setAttribute('aria-pressed', String(active));
      const state = active ? maximumLevel > 1 ? `level ${nextLevel} of ${maximumLevel}` : 'on' : 'off';
      control.setAttribute('aria-label', `${label}, ${state}`);
      control.querySelectorAll('.cms-widget-pips i').forEach((pip, index) => pip.classList.toggle('is-filled', index < nextLevel));
      if (status) status.textContent = `${label}: ${state}.`;
    }));
    showcase.querySelectorAll('[data-widget-reset]').forEach(button => button.addEventListener('click', resetWidget));
    showcase.querySelector('[data-widget-language]')?.addEventListener('click', event => {
      const label = event.currentTarget.querySelector('span');
      if (!label) return;
      label.textContent = label.textContent === 'AR' ? 'EN' : 'AR';
      if (status) status.textContent = `Widget language changed to ${label.textContent}.`;
    });
    document.addEventListener('keydown', event => {
      if (!event.shiftKey || event.key.toLowerCase() !== 'c') return;
      event.preventDefault();
      setWidgetOpen(Boolean(product?.hidden));
    });
  });
  document.querySelectorAll('[data-screen-slider]').forEach(slider => {
    const slides = [...slider.querySelectorAll('.cms-screen-slide')];
    const dots = [...slider.querySelectorAll('.cms-slider-dot')];
    const captions = [...slider.querySelectorAll('.cms-slider-caption')];
    const orbitCards = [...slider.querySelectorAll('[data-orbit-index]')];
    const stage = slider.querySelector('.cms-screen-slider-stage');
    const browserFrame = slider.querySelector('.cms-slider-browser');
    const playback = slider.querySelector('[data-slider-playback]');
    let activeIndex = 0;
    let timer;
    let manuallyPaused = slider.dataset.autoplay === 'false';
    let hovered = false;
    let inViewport = false;

    if (!slides.length) return;
    slider.classList.add('is-enhanced');
    slides.forEach((slide, index) => slide.setAttribute('aria-hidden', String(index !== 0)));
    captions.forEach((caption, index) => caption.setAttribute('aria-hidden', String(index !== 0)));

    const sizeFrameToImage = slide => {
      const image = slide?.querySelector('img');
      if (!stage || !browserFrame || !image) return;
      const applySize = () => {
        if (!slide.classList.contains('is-active')) return;
        const imageWidth = image.naturalWidth || Number(image.getAttribute('width'));
        const imageHeight = image.naturalHeight || Number(image.getAttribute('height'));
        if (!imageWidth || !imageHeight) return;
        const maxWidthRatio = window.matchMedia('(max-width: 720px)').matches ? .94 : .72;
        const frameWidth = Math.min(stage.clientWidth * maxWidthRatio, 920);
        const frameHeight = frameWidth * (imageHeight / imageWidth) + 34;
        browserFrame.style.width = `${frameWidth}px`;
        browserFrame.style.height = `${frameHeight}px`;
        stage.style.height = `${frameHeight + 46}px`;
      };
      applySize();
      if (!image.complete) image.addEventListener('load', applySize, { once: true });
    };

    sizeFrameToImage(slides[activeIndex]);
    const resizeFrames = () => sizeFrameToImage(slides[activeIndex]);
    window.addEventListener('resize', resizeFrames, { passive: true });
    if (slides.length < 2) {
      slider.querySelector('.cms-screen-slider-controls')?.setAttribute('hidden', '');
      slider.querySelectorAll('.cms-slider-arrow').forEach(arrow => { arrow.hidden = true; });
      return;
    }

    const updateOrbit = centerIndex => {
      orbitCards.forEach(card => {
        const cardIndex = Number(card.dataset.orbitIndex || 0);
        let offset = (cardIndex - centerIndex + slides.length) % slides.length;
        if (offset > slides.length / 2) offset -= slides.length;
        card.classList.remove('is-prev', 'is-next', 'is-far-prev', 'is-far-next');
        if (offset === -1) card.classList.add('is-prev');
        if (offset === 1) card.classList.add('is-next');
        if (offset === -2) card.classList.add('is-far-prev');
        if (offset === 2) card.classList.add('is-far-next');
      });
    };

    updateOrbit(activeIndex);

    const showSlide = nextIndex => {
      const normalizedIndex = (nextIndex + slides.length) % slides.length;
      if (normalizedIndex === activeIndex) return;
      const current = slides[activeIndex];
      const next = slides[normalizedIndex];
      current.classList.remove('is-active');
      current.classList.add('is-leaving');
      current.setAttribute('aria-hidden', 'true');
      next.classList.remove('is-leaving');
      next.classList.add('is-active');
      next.setAttribute('aria-hidden', 'false');
      sizeFrameToImage(next);
      updateOrbit(normalizedIndex);
      captions.forEach((caption, captionIndex) => {
        const isActive = captionIndex === normalizedIndex;
        caption.classList.toggle('is-active', isActive);
        caption.setAttribute('aria-hidden', String(!isActive));
      });
      dots.forEach((dot, dotIndex) => {
        const isActive = dotIndex === normalizedIndex;
        dot.classList.toggle('is-active', isActive);
        dot.setAttribute('aria-pressed', String(isActive));
      });
      window.setTimeout(() => current.classList.remove('is-leaving'), reduceMotion.matches ? 0 : 650);
      activeIndex = normalizedIndex;
    };

    const stop = () => window.clearInterval(timer);
    const start = () => {
      stop();
      if (!reduceMotion.matches && !manuallyPaused && !hovered && inViewport && !document.hidden && !slider.contains(document.activeElement)) {
        timer = window.setInterval(() => showSlide(activeIndex + 1), 4400);
      }
    };
    const step = direction => { showSlide(activeIndex + direction); start(); };
    const updatePlayback = () => {
      if (!playback) return;
      playback.textContent = manuallyPaused ? 'Play slideshow' : 'Pause slideshow';
      playback.setAttribute('aria-pressed', String(manuallyPaused));
      playback.hidden = reduceMotion.matches;
    };

    playback?.addEventListener('click', () => {
      manuallyPaused = !manuallyPaused;
      updatePlayback();
      start();
    });
    updatePlayback();

    slider.querySelector('[data-slider-prev]')?.addEventListener('click', () => step(-1));
    slider.querySelector('[data-slider-next]')?.addEventListener('click', () => step(1));
    dots.forEach((dot, dotIndex) => dot.addEventListener('click', () => { showSlide(dotIndex); start(); }));
    slider.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
    });
    slider.addEventListener('pointerenter', () => { hovered = true; stop(); });
    slider.addEventListener('pointerleave', () => { hovered = false; start(); });
    slider.addEventListener('focusin', stop);
    slider.addEventListener('focusout', event => { if (!slider.contains(event.relatedTarget)) start(); });
    document.addEventListener('visibilitychange', start);
    reduceMotion.addEventListener('change', () => { updatePlayback(); start(); });
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        inViewport = entries.some(entry => entry.isIntersecting);
        start();
      });
      observer.observe(slider);
    } else {
      inViewport = true;
      start();
    }
  });

  const animatedPanels = [...document.querySelectorAll('.cms-motion-showcase, .cms-widget-stage')];
  if ('IntersectionObserver' in window && animatedPanels.length) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.classList.toggle('is-offscreen', !entry.isIntersecting));
    });
    animatedPanels.forEach(panel => { panel.classList.add('is-offscreen'); observer.observe(panel); });
  }

  activateToc([...document.querySelectorAll('#projectTocLinks a')]);
  window.requestAnimationFrame(() => document.body.classList.add('project-motion-ready'));
})();
