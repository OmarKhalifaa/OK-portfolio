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

  const option = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;
  const mediaClasses = block => [
    `cms-width-${option(block.width, ['full', 'wide', 'medium', 'narrow'], 'full')}`,
    `cms-align-${option(block.alignment, ['left', 'center', 'right'], 'center')}`,
    `cms-ratio-${option(block.aspectRatio, ['auto', 'landscape', 'standard', 'square', 'portrait'], 'auto')}`,
    `cms-fit-${option(block.fit, ['cover', 'contain'], 'cover')}`,
    `cms-focal-${option(block.focalPoint, ['center', 'top', 'bottom', 'left', 'right'], 'center')}`
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
        return `<figure class="content-block media-block cms-image-block" id="${id}">${heading}<div class="cms-media-frame ${mediaClasses(block)}">${renderImage(block.image, block.alt)}</div>${block.caption ? `<figcaption class="cms-caption-${option(block.captionAlignment, ['left', 'center', 'right'], 'left')}">${escapeHTML(block.caption)}</figcaption>` : ''}</figure>`;

      case 'text_image': {
        const ratio = option(block.aspectRatio, ['auto', 'landscape', 'standard', 'square', 'portrait'], 'auto');
        const fit = option(block.fit, ['cover', 'contain'], 'cover');
        const focal = option(block.focalPoint, ['center', 'top', 'bottom', 'left', 'right'], 'center');
        const image = `<div class="cms-text-image-media cms-ratio-${ratio} cms-fit-${fit} cms-focal-${focal}">${renderImage(block.image, block.alt)}</div>`;
        const copy = `<div class="cms-text-image-copy">${heading}<div class="cms-richtext">${markdown(block.body)}</div>${block.caption ? `<p class="cms-caption">${escapeHTML(block.caption)}</p>` : ''}</div>`;
        const imagePosition = option(block.imagePosition, ['left', 'right'], 'right');
        const imageWidth = option(block.imageWidth, ['40', '50', '60'], '50');
        const verticalAlignment = option(block.verticalAlignment, ['top', 'center', 'bottom'], 'center');
        return `<section class="content-block cms-text-image image-${imagePosition} cms-split-${imageWidth} cms-vertical-${verticalAlignment}" id="${id}">${imagePosition === 'left' ? image + copy : copy + image}</section>`;
      }

      case 'gallery':
        return `<section class="content-block cms-gallery-block" id="${id}">${heading}<div class="cms-gallery cms-gallery-${option(block.columns, ['two', 'three'], 'two')} cms-ratio-${option(block.aspectRatio, ['auto', 'landscape', 'standard', 'square', 'portrait'], 'auto')} cms-fit-${option(block.fit, ['cover', 'contain'], 'cover')} cms-focal-${option(block.focalPoint, ['center', 'top', 'bottom', 'left', 'right'], 'center')}">${(block.images || []).map(item => `<figure>${renderImage(item.image, item.alt)}${item.caption ? `<figcaption>${escapeHTML(item.caption)}</figcaption>` : ''}</figure>`).join('')}</div></section>`;

      case 'video':
        return `<figure class="content-block media-block cms-video-block" id="${id}">${heading}<div class="cms-video-frame">${renderVideo(block.url)}</div>${block.caption ? `<figcaption>${escapeHTML(block.caption)}</figcaption>` : ''}</figure>`;

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

  const renderRecommendations = async recommendations => {
    const rail = document.querySelector('.next-projects-inner');
    if (!rail) return;
    const recommendationsPanel = rail.closest('.next-projects');

    const existing = rail.querySelectorAll('.next-card');
    existing.forEach(card => card.remove());
    const themes = ['green', 'orange', 'purple'];
    const projects = await Promise.all((recommendations || []).slice(0, 3).map(async slug => {
      try { return await fetchProject(slug); }
      catch { return null; }
    }));

    const availableProjects = projects.filter(Boolean);
    const hasRecommendations = availableProjects.length > 0;
    if (recommendationsPanel) recommendationsPanel.hidden = !hasRecommendations;
    document.body.classList.toggle('has-no-recommendations', !hasRecommendations);

    availableProjects.forEach((project, index) => {
      rail.insertAdjacentHTML('beforeend', `
        <a class="next-card next-card-${themes[index % themes.length]}" href="project.html?project=${encodeURIComponent(project.slug)}" aria-label="${escapeHTML(project.title)} case study">
          <span class="next-index">${String(index + 1).padStart(2, '0')}</span>
          <div><p>${escapeHTML([project.client, project.category].filter(Boolean).join(' · '))}</p><h2>${escapeHTML(project.title)}</h2></div>
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
    activateToc(renderToc(blocks));
    renderRecommendations(project.recommendations);
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
