(() => {
  const root = document.documentElement;
  const themeButton = document.getElementById('themeToggle');
  const savedTheme = localStorage.getItem('theme');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let isThemeTransitioning = false;

  const applyTheme = theme => {
    if (theme === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
    localStorage.setItem('theme', theme);
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

  const escapeHTML = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const markdown = value => {
    if (!value) return '';
    if (!window.marked || !window.DOMPurify) {
      return `<p>${escapeHTML(value).replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;
    }
    return window.DOMPurify.sanitize(window.marked.parse(String(value)));
  };

  const safeMediaUrl = value => {
    const url = String(value ?? '').trim();
    if (!url || url.startsWith('javascript:') || url.startsWith('data:text/html')) return '';
    return escapeHTML(url);
  };

  const safeFigmaPrototypeUrl = value => {
    try {
      const url = new URL(String(value ?? '').trim());
      const host = url.hostname.toLowerCase();
      if (url.protocol !== 'https:' || !['figma.com', 'www.figma.com', 'embed.figma.com'].includes(host) || !url.pathname.startsWith('/proto/')) return '';
      url.hostname = 'embed.figma.com';
      url.searchParams.set('embed-host', 'omar-khalifa-portfolio');
      url.searchParams.delete('t');
      url.searchParams.delete('viewport');
      return escapeHTML(url.toString());
    } catch {
      return '';
    }
  };

  const option = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;
  const mediaClasses = block => [
    `cms-width-${option(block.width, ['full', 'wide', 'medium', 'narrow'], 'full')}`,
    `cms-align-${option(block.alignment, ['left', 'center', 'right'], 'center')}`,
    `cms-ratio-${option(block.aspectRatio, ['auto', 'landscape', 'standard', 'square', 'portrait'], 'auto')}`,
    `cms-fit-${option(block.fit, ['cover', 'contain'], 'cover')}`,
    `cms-focal-${option(block.focalPoint, ['center', 'top', 'bottom', 'left', 'right'], 'center')}`,
    `cms-display-${option(block.displayMode, ['static', 'browser', 'scroll'], 'static')}`
  ].join(' ');

  const blockId = (block, index) => {
    const candidate = String(block.sectionId || block.navLabel || `section-${index + 1}`)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return candidate || `section-${index + 1}`;
  };

  const blockHeading = block => {
    if (!block.eyebrow && !block.heading) return '';
    return `
      <div class="section-heading ${block.compactHeading ? 'compact-heading' : ''}">
        ${block.eyebrow ? `<p class="block-eyebrow">${escapeHTML(block.eyebrow)}</p>` : ''}
        ${block.heading ? `<h2>${escapeHTML(block.heading)}</h2>` : ''}
      </div>`;
  };

  const isHex = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

  const renderImage = (image, alt, className = '') => {
    const src = safeMediaUrl(image);
    if (!src) return '<div class="cms-media-placeholder">Add an image in the CMS</div>';
    return `<img class="${escapeHTML(className)}" src="${src}" alt="${escapeHTML(alt || '')}" loading="lazy">`;
  };

  const renderVideo = urlValue => {
    const value = String(urlValue ?? '').trim();
    const youtube = value.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    const vimeo = value.match(/vimeo\.com\/(?:video\/)?(\d+)/);

    if (youtube) {
      return `<iframe src="https://www.youtube-nocookie.com/embed/${escapeHTML(youtube[1])}" title="Project video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    }
    if (vimeo) {
      return `<iframe src="https://player.vimeo.com/video/${escapeHTML(vimeo[1])}" title="Project video" loading="lazy" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    }

    const src = safeMediaUrl(value);
    return src
      ? `<video src="${src}" controls preload="metadata"></video>`
      : '<div class="cms-media-placeholder">Add a video URL in the CMS</div>';
  };

  const renderBlock = (block, index) => {
    const id = blockId(block, index);
    const heading = blockHeading(block);

    switch (block.type) {
      case 'rich_text':
        return `<section class="content-block content-copy" id="${id}">${heading}<div class="cms-richtext cms-richtext-${escapeHTML(block.contentWidth || 'wide')}">${markdown(block.body)}</div></section>`;

      case 'two_column_text':
        return `<section class="content-block content-copy" id="${id}">${heading}<div class="copy-columns"><div class="cms-richtext">${markdown(block.left)}</div><div class="cms-richtext">${markdown(block.right)}</div></div></section>`;

      case 'image_full':
        {
          const isScrollable = block.displayMode === 'scroll';
          const frame = `<div class="cms-media-frame ${mediaClasses(block)}"${isScrollable ? ` tabindex="0" role="region" aria-label="Scrollable preview: ${escapeHTML(block.alt || block.heading || 'project screen')}"` : ''}>${renderImage(block.image, block.alt)}</div>`;
          const media = isScrollable ? `<div class="cms-scroll-shell">${frame}<span class="cms-scroll-hint" aria-hidden="true">Scroll to explore <span>↓</span></span></div>` : frame;
          return `<figure class="content-block media-block cms-image-block" id="${id}">${heading}${media}${block.caption ? `<figcaption class="cms-caption-${option(block.captionAlignment, ['left', 'center', 'right'], 'left')}">${escapeHTML(block.caption)}</figcaption>` : ''}</figure>`;
        }

      case 'text_image': {
        const ratio = option(block.aspectRatio, ['auto', 'landscape', 'standard', 'square', 'portrait'], 'auto');
        const fit = option(block.fit, ['cover', 'contain'], 'cover');
        const focal = option(block.focalPoint, ['center', 'top', 'bottom', 'left', 'right'], 'center');
        const displayMode = option(block.displayMode, ['static', 'browser'], 'static');
        const image = `<div class="cms-text-image-media cms-display-${displayMode} cms-ratio-${ratio} cms-fit-${fit} cms-focal-${focal}">${renderImage(block.image, block.alt)}</div>`;
        const caption = block.caption ? `<p class="cms-caption">${escapeHTML(block.caption)}</p>` : '';
        const layout = option(block.layout, ['split', 'stacked'], 'split');
        const copy = `<div class="cms-text-image-copy">${heading}<div class="cms-richtext">${markdown(block.body)}</div>${layout === 'split' ? caption : ''}</div>`;
        const media = layout === 'stacked' ? `<div class="cms-text-image-media-group">${image}${caption}</div>` : image;
        const imagePosition = option(block.imagePosition, ['left', 'right'], 'right');
        const imageWidth = option(block.imageWidth, ['40', '50', '60'], '50');
        const verticalAlignment = option(block.verticalAlignment, ['top', 'center', 'bottom'], 'center');
        return `<section class="content-block cms-text-image cms-layout-${layout} image-${imagePosition} cms-split-${imageWidth} cms-vertical-${verticalAlignment}" id="${id}">${layout === 'stacked' || imagePosition === 'right' ? copy + media : media + copy}</section>`;
      }

      case 'gallery':
        return `<section class="content-block cms-gallery-block" id="${id}">${heading}<div class="cms-gallery cms-gallery-${option(block.columns, ['two', 'three'], 'two')} cms-ratio-${option(block.aspectRatio, ['auto', 'landscape', 'standard', 'square', 'portrait'], 'auto')} cms-fit-${option(block.fit, ['cover', 'contain'], 'cover')} cms-focal-${option(block.focalPoint, ['center', 'top', 'bottom', 'left', 'right'], 'center')}">${(block.images || []).map(item => `<figure class="cms-item-focal-${option(item.focalPoint, ['center', 'top', 'bottom', 'left', 'right', 'upper', 'lower'], block.focalPoint || 'center')}">${renderImage(item.image, item.alt)}${item.caption ? `<figcaption>${escapeHTML(item.caption)}</figcaption>` : ''}</figure>`).join('')}</div></section>`;

      case 'video':
        return `<figure class="content-block media-block cms-video-block" id="${id}">${heading}<div class="cms-video-frame">${renderVideo(block.url)}</div>${block.caption ? `<figcaption>${escapeHTML(block.caption)}</figcaption>` : ''}</figure>`;

      case 'screen_slider': {
        const slides = (block.slides || []).filter(slide => slide.image);
        const intro = block.body ? `<div class="cms-screen-slider-intro cms-richtext">${markdown(block.body)}</div>` : '';
        const slideMarkup = slides.map((slide, slideIndex) => `<figure class="cms-screen-slide${slideIndex === 0 ? ' is-active' : ''}" aria-hidden="${slideIndex === 0 ? 'false' : 'true'}">${renderImage(slide.image, slide.alt)}</figure>`).join('');
        const captions = slides.map((slide, slideIndex) => `<span class="cms-slider-caption${slideIndex === 0 ? ' is-active' : ''}" aria-hidden="${slideIndex === 0 ? 'false' : 'true'}">${escapeHTML(slide.caption || slide.label || '')}</span>`).join('');
        const dots = slides.map((slide, slideIndex) => `<button type="button" class="cms-slider-dot${slideIndex === 0 ? ' is-active' : ''}" data-slide-index="${slideIndex}" aria-label="Show ${escapeHTML(slide.label || `screen ${slideIndex + 1}`)}" aria-pressed="${slideIndex === 0 ? 'true' : 'false'}"></button>`).join('');
        const orbitCards = slides.map((slide, slideIndex) => `<figure class="cms-slider-orbit-card" data-orbit-index="${slideIndex}" aria-hidden="true">${renderImage(slide.image, '')}</figure>`).join('');
        return `<section class="content-block cms-screen-slider-block" id="${id}">${heading}${intro}<div class="cms-screen-slider" data-screen-slider data-autoplay="${block.autoplay === false ? 'false' : 'true'}" tabindex="0" role="region" aria-roledescription="carousel" aria-label="${escapeHTML(block.heading || 'Service screens')}"><div class="cms-screen-slider-stage"><div class="cms-slider-orbit" aria-hidden="true">${orbitCards}</div><div class="cms-slider-captions">${captions}</div><div class="cms-slider-browser"><div class="cms-slider-viewport">${slideMarkup}</div></div><button type="button" class="cms-slider-arrow cms-slider-arrow-prev" data-slider-prev aria-label="Previous screen">←</button><button type="button" class="cms-slider-arrow cms-slider-arrow-next" data-slider-next aria-label="Next screen">→</button></div><div class="cms-screen-slider-controls"><div class="cms-slider-dots">${dots}</div></div></div></section>`;
      }

      case 'figma_prototype': {
        const source = safeFigmaPrototypeUrl(block.url);
        const title = escapeHTML(block.title || block.heading || 'Interactive Figma prototype');
        const height = option(block.height, ['standard', 'tall'], 'tall');
        const topCrop = option(block.topCrop, ['none', 'small', 'medium', 'large'], 'none');
        const prototype = source
          ? `<iframe src="${source}" title="${title}" loading="lazy" allowfullscreen allow="fullscreen" referrerpolicy="strict-origin-when-cross-origin"></iframe>`
          : '<div class="cms-media-placeholder">Add a Figma prototype URL in the CMS</div>';
        return `<figure class="content-block media-block cms-prototype-block" id="${id}">${heading}<div class="cms-prototype-frame cms-prototype-${height} cms-prototype-crop-${topCrop}">${prototype}</div><figcaption>${block.caption ? escapeHTML(block.caption) : 'Interactive prototype'}</figcaption></figure>`;
      }

      case 'feature_grid':
        return `<section class="content-block" id="${id}">${heading}<div class="insight-grid">${(block.items || []).map((item, itemIndex) => `<article><span>${escapeHTML(item.number || String(itemIndex + 1).padStart(2, '0'))}</span><h3>${escapeHTML(item.title)}</h3><div class="cms-richtext">${markdown(item.body)}</div></article>`).join('')}</div></section>`;

      case 'stats':
        return `<section class="content-block results-block" id="${id}">${heading}<div class="results-grid">${(block.items || []).map(item => `<div><strong>${escapeHTML(item.value)}</strong><span>${escapeHTML(item.label)}</span></div>`).join('')}</div></section>`;

      case 'quote':
        return `<section class="content-block learning-block" id="${id}">${block.eyebrow ? `<p class="block-eyebrow">${escapeHTML(block.eyebrow)}</p>` : ''}<blockquote>${escapeHTML(block.quote)}</blockquote>${block.attribution ? `<p class="cms-quote-attribution">${escapeHTML(block.attribution)}</p>` : ''}${block.body ? `<div class="cms-richtext">${markdown(block.body)}</div>` : ''}</section>`;

      case 'process':
        return `<section class="content-block cms-process-block" id="${id}">${heading}<div class="cms-process">${(block.steps || []).map((step, stepIndex) => `<article><span>${escapeHTML(step.label || `Step ${stepIndex + 1}`)}</span><h3>${escapeHTML(step.title)}</h3><div class="cms-richtext">${markdown(step.body)}</div></article>`).join('')}</div></section>`;

      case 'divider':
        return `<div class="cms-divider" id="${id}" aria-hidden="true"><span>${escapeHTML(block.label || '')}</span></div>`;

      default:
        return '';
    }
  };

  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value || '';
  };

  const renderToc = blocks => {
    const toc = document.getElementById('projectTocLinks');
    if (!toc) return [];

    const navigable = blocks
      .map((block, index) => ({ ...block, resolvedId: blockId(block, index) }))
      .filter(block => block.navLabel && block.showInNav !== false && block.type !== 'divider');

    toc.innerHTML = navigable.map((block, index) => `
      <a class="${index === 0 ? 'is-active' : ''}" href="#${block.resolvedId}" ${index === 0 ? 'aria-current="location"' : ''}>
        <span class="toc-marker" aria-hidden="true">→</span>${escapeHTML(block.navLabel)}
      </a>`).join('');

    return [...toc.querySelectorAll('a')];
  };

  const activateToc = links => {
    const sections = links.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
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

    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id);
    }, { rootMargin: '-18% 0px -68% 0px', threshold: 0 });

    sections.forEach(section => observer.observe(section));
    activateHash();
  };

  const fetchProject = async slug => {
    const response = await fetch(`content/projects/${encodeURIComponent(slug)}.json`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Project ${slug} could not be loaded`);
    return response.json();
  };

  const fetchProjectIndex = async () => {
    const response = await fetch('content/project-index.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Project index could not be loaded');
    const index = await response.json();
    return Array.isArray(index.projects) ? index.projects : [];
  };

  const renderRecommendations = async (currentSlug, recommendations) => {
    const rail = document.querySelector('.next-projects-inner');
    if (!rail) return;
    const recommendationsPanel = rail.closest('.next-projects');

    const existing = rail.querySelectorAll('.next-card');
    existing.forEach(card => card.remove());
    const themes = ['green', 'orange', 'purple'];
    let indexedProjects = [];
    try { indexedProjects = await fetchProjectIndex(); }
    catch { indexedProjects = recommendations || []; }
    const projectSlugs = [...new Set([...(recommendations || []), ...indexedProjects])]
      .filter(slug => slug && slug !== currentSlug);
    const projects = await Promise.all(projectSlugs.map(async slug => {
      try { return await fetchProject(slug); }
      catch { return null; }
    }));

    const availableProjects = projects.filter(project => project?.showInRecommendations === true);
    const hasRecommendations = availableProjects.length > 0;
    if (recommendationsPanel) recommendationsPanel.hidden = !hasRecommendations;
    document.body.classList.toggle('has-no-recommendations', !hasRecommendations);

    availableProjects.forEach((project, index) => {
      const thumbnail = safeMediaUrl(project.thumbnail);
      const thumbnailFit = project.thumbnailFit === 'cover' ? 'cover' : 'contain';
      const thumbnailBackground = isHex(project.thumbnailBackground) ? project.thumbnailBackground : '';
      rail.insertAdjacentHTML('beforeend', `
        <a class="next-card next-card-${themes[index % themes.length]}" href="project.html?project=${encodeURIComponent(project.slug)}" aria-label="${escapeHTML(project.title)} case study">
          ${thumbnail ? `<span class="next-card-thumb"${thumbnailBackground ? ` style="background:${thumbnailBackground}"` : ''}><img src="${thumbnail}" alt="" style="object-fit:${thumbnailFit}" loading="lazy"><span class="next-index">${String(index + 1).padStart(2, '0')}</span></span>` : `<span class="next-index">${String(index + 1).padStart(2, '0')}</span>`}
          <div class="next-card-copy"><p>${escapeHTML([project.client, project.category].filter(Boolean).join(' · '))}</p><h2>${escapeHTML(project.title)}</h2></div>
          <span class="next-arrow" aria-hidden="true">↗</span>
        </a>`);
    });
  };

  const renderProject = project => {
    document.title = `${project.title} — Omar Khalifa`;
    document.body.dataset.project = project.slug || '';
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute('content', project.seoDescription || project.deck || project.title);

    const title = document.getElementById('projectTitle');
    if (title) title.innerHTML = escapeHTML(project.heroTitle || project.title).replace(/\n/g, '<br>');
    setText('projectKicker', [project.client, project.category, project.year].filter(Boolean).join(' · '));
    setText('projectDeck', project.deck);
    setText('projectIndustry', project.industry);
    setText('projectRole', project.role);
    const timeline = document.getElementById('projectTimeline');
    const timelineValue = String(project.timeline || '').trim();
    const timelineItem = timeline?.closest('div');
    if (timeline) timeline.textContent = timelineValue;
    if (timelineItem) timelineItem.hidden = !timelineValue;
    document.querySelector('.project-meta')?.classList.toggle('has-no-timeline', !timelineValue);

    const team = document.getElementById('projectTeam');
    if (team) team.innerHTML = (project.team || []).map(escapeHTML).join('<br>');

    const content = document.getElementById('projectContent');
    const blocks = project.blocks || [];
    if (content) content.innerHTML = blocks.map(renderBlock).join('');
    document.querySelectorAll('.cms-scroll-shell').forEach(shell => {
      const frame = shell.querySelector('.cms-display-scroll');
      if (!frame) return;
      frame.addEventListener('scroll', () => shell.classList.toggle('has-scrolled', frame.scrollTop > 12), { passive: true });
    });
    document.querySelectorAll('[data-screen-slider]').forEach(slider => {
      const slides = [...slider.querySelectorAll('.cms-screen-slide')];
      const dots = [...slider.querySelectorAll('.cms-slider-dot')];
      const captions = [...slider.querySelectorAll('.cms-slider-caption')];
      const orbitCards = [...slider.querySelectorAll('[data-orbit-index]')];
      const stage = slider.querySelector('.cms-screen-slider-stage');
      const browserFrame = slider.querySelector('.cms-slider-browser');
      let activeIndex = 0;
      let timer;

      const sizeFrameToImage = slide => {
        const image = slide?.querySelector('img');
        if (!stage || !browserFrame || !image) return;
        const applySize = () => {
          if (!slide.classList.contains('is-active') || !image.naturalWidth || !image.naturalHeight) return;
          const maxWidthRatio = window.matchMedia('(max-width: 720px)').matches ? .94 : .72;
          const frameWidth = Math.min(stage.clientWidth * maxWidthRatio, 920);
          const imageHeight = frameWidth * (image.naturalHeight / image.naturalWidth);
          const frameHeight = imageHeight + 34;
          browserFrame.style.width = `${frameWidth}px`;
          browserFrame.style.height = `${frameHeight}px`;
          stage.style.height = `${frameHeight + 46}px`;
        };
        if (image.complete) applySize();
        else image.addEventListener('load', applySize, { once: true });
      };

      sizeFrameToImage(slides[activeIndex]);
      const resizeFrames = () => sizeFrameToImage(slides[activeIndex]);
      window.addEventListener('resize', resizeFrames, { passive: true });
      if (slides.length < 2) return;

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
        if (!reduceMotion.matches && slider.dataset.autoplay !== 'false') timer = window.setInterval(() => showSlide(activeIndex + 1), 4400);
      };
      const step = direction => { showSlide(activeIndex + direction); start(); };

      slider.querySelector('[data-slider-prev]')?.addEventListener('click', () => step(-1));
      slider.querySelector('[data-slider-next]')?.addEventListener('click', () => step(1));
      dots.forEach((dot, dotIndex) => dot.addEventListener('click', () => { showSlide(dotIndex); start(); }));
      slider.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
        if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
      });
      slider.addEventListener('pointerenter', stop);
      slider.addEventListener('pointerleave', start);
      slider.addEventListener('focusin', stop);
      slider.addEventListener('focusout', event => { if (!slider.contains(event.relatedTarget)) start(); });
      start();
    });
    activateToc(renderToc(blocks));
    renderRecommendations(project.slug, project.recommendations);
  };

  const requestedSlug = new URLSearchParams(window.location.search).get('project') || 'login-revamp';
  const slug = /^[a-z0-9-]+$/.test(requestedSlug) ? requestedSlug : 'login-revamp';

  fetchProject(slug)
    .then(renderProject)
    .catch(error => {
      console.warn(error.message);
      activateToc([...document.querySelectorAll('.toc-links a')]);
    });
})();
