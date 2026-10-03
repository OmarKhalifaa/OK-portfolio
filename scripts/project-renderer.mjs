import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

export const escapeHTML = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const markdown = value => value ? sanitizeHtml(marked.parse(String(value)), {
  allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img'],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ['src', 'alt', 'title', 'width', 'height'],
    a: ['href', 'title']
  },
  allowedSchemes: ['https', 'http', 'mailto', 'tel'],
  allowProtocolRelative: false
}) : '';

const safeMediaUrl = value => {
  const source = String(value ?? '').trim();
  if (!source || /[\x00-\x1f\\]/.test(source)) return '';
  if (/^[a-z][a-z\d+.-]*:/i.test(source)) {
    try {
      const url = new URL(source);
      return ['http:', 'https:'].includes(url.protocol) ? escapeHTML(url.href) : '';
    } catch {
      return '';
    }
  }
  if (source.startsWith('//') || source.startsWith('#')) return '';
  return escapeHTML('/' + source.replace(/^\.?\//, ''));
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

const renderImage = (image, alt, className = '', placeholderLabel = '') => {
  const src = safeMediaUrl(image);
  if (!src && placeholderLabel) return `<div class="cms-media-placeholder cms-media-planned"><span>Image placeholder</span><strong>${escapeHTML(placeholderLabel)}</strong></div>`;
  if (!src) return '<div class="cms-media-placeholder">Add an image in the CMS</div>';
  return `<img class="${escapeHTML(className)}" src="${src}" alt="${escapeHTML(alt || '')}" loading="lazy">`;
};

const renderVideo = (urlValue, options = {}) => {
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
  const autoplay = options.autoplay === true;
  const controls = options.controls !== false && !autoplay;
  return src
    ? `<video src="${src}"${controls ? ' controls' : ''}${autoplay ? ' autoplay muted playsinline' : ''}${options.loop === true ? ' loop' : ''} preload="${autoplay ? 'auto' : 'metadata'}"></video>`
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

    case 'before_after': {
      const label = block.label || 'Design comparison';
      const beforeLabel = block.beforeLabel || 'Before';
      const afterLabel = block.afterLabel || 'After';
      const layer = (side, image, alt, placeholder) => `<div class="cms-compare-layer cms-compare-${side}">${renderImage(image, alt, '', placeholder || `${label} · ${side}`)}</div>`;
      return `<figure class="content-block media-block cms-comparison-block" id="${id}">${heading}<div class="cms-compare cms-compare-${option(block.aspectRatio, ['landscape', 'standard', 'square', 'portrait', 'full_page'], 'landscape')} cms-fit-${option(block.fit, ['contain', 'cover'], 'contain')} cms-focal-${option(block.focalPoint, ['center', 'top', 'bottom'], 'top')}" data-before-after style="--compare-position:50%">${layer('after', block.afterImage, block.afterAlt, block.afterPlaceholder)}${layer('before', block.beforeImage, block.beforeAlt, block.beforePlaceholder)}<span class="cms-compare-label cms-compare-label-before" data-compare-label-before>${escapeHTML(beforeLabel)}</span><span class="cms-compare-label cms-compare-label-after" data-compare-label-after>${escapeHTML(afterLabel)}</span><div class="cms-compare-divider" aria-hidden="true"><span>↔</span></div><input class="cms-compare-input" type="range" min="0" max="100" step="1" value="50" aria-label="${escapeHTML(label)}: before and after" aria-describedby="${id}-hint" aria-valuetext="${escapeHTML(beforeLabel)} 50%, ${escapeHTML(afterLabel)} 50%" data-before-label="${escapeHTML(beforeLabel)}" data-after-label="${escapeHTML(afterLabel)}"></div><figcaption class="cms-compare-caption" id="${id}-hint">${escapeHTML(block.caption || 'Drag to compare the two designs.')}<span>Drag the handle · or use arrow keys</span></figcaption></figure>`;
    }

    case 'image_full':
      {
        const isScrollable = block.displayMode === 'scroll';
        const frame = `<div class="cms-media-frame ${mediaClasses(block)}"${isScrollable ? ` tabindex="0" role="region" aria-label="Scrollable preview: ${escapeHTML(block.alt || block.heading || 'project screen')}"` : ''}>${renderImage(block.image, block.alt, '', block.placeholderLabel)}</div>`;
        const media = isScrollable ? `<div class="cms-scroll-shell">${frame}<span class="cms-scroll-hint" aria-hidden="true">Scroll to explore <span>↓</span></span></div>` : frame;
        return `<figure class="content-block media-block cms-image-block" id="${id}">${heading}${media}${block.caption ? `<figcaption class="cms-caption-${option(block.captionAlignment, ['left', 'center', 'right'], 'left')}">${escapeHTML(block.caption)}</figcaption>` : ''}</figure>`;
      }

    case 'motion_showcase': {
      const renderMotionCards = items => (items || []).map(item => {
        const iconSource = safeMediaUrl(item.icon);
        return `<button type="button" class="cms-motion-card" data-motion-feature aria-pressed="false" aria-label="${escapeHTML(item.label)}, off"><span class="cms-motion-card-top"><span class="cms-motion-card-icon" aria-hidden="true">${iconSource ? `<img src="${iconSource}" alt="" loading="lazy">` : ''}</span><span class="cms-motion-switch" aria-hidden="true"><i></i></span></span><strong>${escapeHTML(item.label)}</strong><span>${escapeHTML(item.description)}</span></button>`;
      }).join('');
      return `<section class="content-block cms-motion-showcase-block" id="${id}">${heading}<div class="cms-motion-showcase" data-motion-showcase><div class="cms-motion-stage"><div class="cms-motion-rail cms-motion-rail-top">${renderMotionCards(block.topItems)}</div><div class="cms-motion-rail cms-motion-rail-bottom">${renderMotionCards(block.bottomItems)}</div></div><button type="button" class="cms-motion-toggle" data-motion-toggle aria-pressed="false"><span>Pause motion</span><i aria-hidden="true"></i></button><p class="cms-visually-hidden" aria-live="polite" data-motion-status></p></div></section>`;
    }

    case 'widget_showcase': {
      const assetRoot = '/images/accessibility-widget/icons/';
      const renderWidgetGroup = group => {
        const isProfiles = group.variant === 'profiles';
        const isAI = group.title?.trim().toLowerCase() === 'ai features';
        const isCollapsed = !isAI;
        const columns = option(group.columns, ['two', 'three'], isProfiles ? 'two' : 'three');
        const titleIcon = safeMediaUrl(group.titleIcon);
        const items = (group.items || []).map(item => {
          const iconSource = safeMediaUrl(item.icon);
          const maximumLevel = isProfiles ? 1 : Math.max(1, Math.min(3, Number(item.levels) || 3));
          const icon = iconSource ? `<img src="${iconSource}" alt="" loading="lazy">` : '';
          if (isProfiles) {
            return `<button type="button" class="cms-widget-profile" data-widget-control data-level="0" data-max-level="1" aria-pressed="false" aria-label="${escapeHTML(item.label)}, off"><span class="cms-widget-profile-top"><span class="cms-widget-icon" aria-hidden="true">${icon}</span><span class="cms-widget-switch" aria-hidden="true"><i></i></span></span><strong>${escapeHTML(item.label)}</strong><span>${escapeHTML(item.description || '')}</span></button>`;
          }
          const pips = maximumLevel > 1 ? `<span class="cms-widget-pips" aria-hidden="true">${Array.from({ length: maximumLevel }, () => '<i></i>').join('')}</span>` : '';
          return `<button type="button" class="cms-widget-control" data-widget-control data-level="0" data-max-level="${maximumLevel}" aria-pressed="false" aria-label="${escapeHTML(item.label)}, off"><span class="cms-widget-icon" aria-hidden="true">${icon}</span><strong>${escapeHTML(item.label)}</strong>${pips}</button>`;
        }).join('');
        return `<section class="cms-widget-category cms-widget-category-${isProfiles ? 'profiles' : 'controls'}${isAI ? ' cms-widget-category-ai' : ''}"><button type="button" class="cms-widget-category-toggle" data-widget-accordion aria-expanded="true" data-initially-collapsed="${isCollapsed}">${titleIcon ? `<img src="${titleIcon}" alt="" aria-hidden="true">` : ''}<span>${escapeHTML(group.title)}</span><img class="cms-widget-chevron" src="${assetRoot}chevron-up.svg" alt="" aria-hidden="true"></button><div class="cms-widget-category-body cms-widget-columns-${columns}">${items}</div></section>`;
      };
      const groups = (block.groups || []).map(renderWidgetGroup).join('');
      const intro = block.body ? `<div class="cms-richtext cms-widget-showcase-intro">${markdown(block.body)}</div>` : '';
      return `<section class="content-block cms-live-widget-block" id="${id}">${heading}${intro}<div class="cms-widget-stage" data-widget-showcase><div class="cms-widget-product" data-widget-product><header class="cms-widget-header"><strong>Accessibility Options</strong><div class="cms-widget-header-actions"><button type="button" class="cms-widget-language" data-widget-language aria-label="Change language"><img src="${assetRoot}egypt-flag.svg" alt=""><span>AR</span><img src="${assetRoot}chevron-down.svg" alt="" aria-hidden="true"></button><button type="button" class="cms-widget-round-action" data-widget-reset aria-label="Reset settings"><img src="${assetRoot}reset.svg" alt=""></button></div></header><div class="cms-widget-scroll">${groups}<section class="cms-widget-reset-panel"><button type="button" data-widget-reset>Reset Settings</button></section><footer class="cms-widget-footer"><img src="${assetRoot}vodafone-logo.svg" alt="Vodafone"><span>Accessibility Statement</span></footer></div></div><p class="cms-visually-hidden" aria-live="polite" data-widget-status></p></div></section>`;
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

    case 'gallery': {
      if (block.displayMode === 'page_preview') {
        const items = block.images || [];
        const tabs = items.map((item, i) => `<button type="button" role="tab" id="${id}-tab-${i}" aria-controls="${id}-page-${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-page-tab="${i}">${escapeHTML(item.label || item.caption || `Page ${i + 1}`)}</button>`).join('');
        const panels = items.map((item, i) => `<div class="cms-page-preview-panel" role="tabpanel" id="${id}-page-${i}" aria-labelledby="${id}-tab-${i}" tabindex="0" data-page-panel="${i}">${renderImage(item.image, item.alt, '', item.placeholderLabel)}</div>`).join('');
        return `<section class="content-block media-block cms-page-preview-block" id="${id}">${heading}<div class="cms-page-preview" data-page-preview><div class="cms-page-preview-tabs" role="tablist" aria-label="${escapeHTML(block.label || 'Full page previews')}">${tabs}<span aria-hidden="true">Scroll to explore ↓</span></div>${panels}</div><p class="cms-caption">${escapeHTML(block.caption || 'Choose a version, then scroll inside the preview.')}</p></section>`;
      }
      return `<section class="content-block cms-gallery-block" id="${id}">${heading}<div class="cms-gallery cms-gallery-${option(block.columns, ['two', 'three'], 'two')} cms-ratio-${option(block.aspectRatio, ['auto', 'landscape', 'standard', 'square', 'portrait'], 'auto')} cms-fit-${option(block.fit, ['cover', 'contain'], 'cover')} cms-focal-${option(block.focalPoint, ['center', 'top', 'bottom', 'left', 'right'], 'center')}">${(block.images || []).map(item => `<figure class="cms-item-focal-${option(item.focalPoint, ['center', 'top', 'bottom', 'left', 'right', 'upper', 'lower'], block.focalPoint || 'center')}">${renderImage(item.image, item.alt, '', item.placeholderLabel)}${item.caption ? `<figcaption>${escapeHTML(item.caption)}</figcaption>` : ''}</figure>`).join('')}</div></section>`;
    }

    case 'video':
      return `<figure class="content-block media-block cms-video-block" id="${id}">${heading}<div class="cms-video-frame">${renderVideo(block.url, block)}</div>${block.caption ? `<figcaption>${escapeHTML(block.caption)}</figcaption>` : ''}</figure>`;

    case 'screen_slider': {
      const slides = (block.slides || []).filter(slide => slide.image);
      const intro = block.body ? `<div class="cms-screen-slider-intro cms-richtext">${markdown(block.body)}</div>` : '';
      const slideMarkup = slides.map((slide, slideIndex) => `<figure class="cms-screen-slide${slideIndex === 0 ? ' is-active' : ''}">${renderImage(slide.image, slide.alt)}<figcaption class="cms-slide-caption-static">${escapeHTML(slide.caption || slide.label || '')}</figcaption></figure>`).join('');
      const captions = slides.map((slide, slideIndex) => `<span class="cms-slider-caption${slideIndex === 0 ? ' is-active' : ''}">${escapeHTML(slide.caption || slide.label || '')}</span>`).join('');
      const dots = slides.map((slide, slideIndex) => `<button type="button" class="cms-slider-dot${slideIndex === 0 ? ' is-active' : ''}" data-slide-index="${slideIndex}" aria-label="Show ${escapeHTML(slide.label || `screen ${slideIndex + 1}`)}" aria-pressed="${slideIndex === 0 ? 'true' : 'false'}"></button>`).join('');
      const orbitCards = slides.map((slide, slideIndex) => `<figure class="cms-slider-orbit-card" data-orbit-index="${slideIndex}" aria-hidden="true">${renderImage(slide.image, '')}</figure>`).join('');
      return `<section class="content-block cms-screen-slider-block" id="${id}">${heading}${intro}<div class="cms-screen-slider" data-screen-slider data-autoplay="${block.autoplay === false ? 'false' : 'true'}" tabindex="0" role="region" aria-roledescription="carousel" aria-label="${escapeHTML(block.heading || 'Service screens')}"><div class="cms-screen-slider-stage"><div class="cms-slider-orbit" aria-hidden="true">${orbitCards}</div><div class="cms-slider-captions">${captions}</div><div class="cms-slider-browser"><div class="cms-slider-viewport">${slideMarkup}</div></div><button type="button" class="cms-slider-arrow cms-slider-arrow-prev" data-slider-prev aria-label="Previous screen">←</button><button type="button" class="cms-slider-arrow cms-slider-arrow-next" data-slider-next aria-label="Next screen">→</button></div><div class="cms-screen-slider-controls"><div class="cms-slider-dots">${dots}</div><button type="button" class="cms-slider-playback" data-slider-playback aria-pressed="false">Pause slideshow</button></div></div></section>`;
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

    case 'feature_catalog':
      return `<section class="content-block cms-feature-catalog-block" id="${id}">${heading}${block.body ? `<div class="cms-richtext cms-feature-catalog-intro">${markdown(block.body)}</div>` : ''}<div class="cms-feature-catalog">${(block.groups || []).map(group => {
        const controlType = option(group.control, ['toggle', 'level'], 'level');
        return `<article class="cms-feature-group cms-feature-group-${controlType}"><header><h3>${escapeHTML(group.title)}</h3>${group.description ? `<p>${escapeHTML(group.description)}</p>` : ''}</header><div class="cms-feature-tiles">${(group.items || []).map(item => {
          const iconSource = safeMediaUrl(item.icon);
          const maximumLevel = controlType === 'toggle' ? 1 : Math.max(1, Math.min(3, Number(item.levels) || 3));
          const initialLevel = item.active === true ? Math.max(1, Math.min(maximumLevel, Number(item.initialLevel) || 1)) : 0;
          const icon = iconSource ? `<img src="${iconSource}" alt="" loading="lazy">` : escapeHTML(item.icon || '•');
          const pips = controlType === 'level' ? `<span class="cms-feature-pips" aria-hidden="true">${Array.from({ length: maximumLevel }, (_, pipIndex) => `<i class="${pipIndex < initialLevel ? 'is-filled' : ''}"></i>`).join('')}</span>` : '<span class="cms-feature-switch" aria-hidden="true"><i></i></span>';
          return `<button type="button" class="cms-feature-tile${initialLevel ? ' is-active' : ''}" data-feature-control data-control-type="${controlType}" data-level="${initialLevel}" data-max-level="${maximumLevel}" aria-pressed="${initialLevel ? 'true' : 'false'}" aria-label="${escapeHTML(item.label)}, ${initialLevel ? controlType === 'level' ? `level ${initialLevel} of ${maximumLevel}` : 'on' : 'off'}"><span class="cms-feature-icon" aria-hidden="true">${icon}</span><span class="cms-feature-label">${escapeHTML(item.label)}</span>${item.description ? `<span class="cms-feature-description">${escapeHTML(item.description)}</span>` : ''}${pips}</button>`;
        }).join('')}</div></article>`;
      }).join('')}</div><p class="cms-visually-hidden" aria-live="polite" data-feature-status></p></section>`;

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


/** Render each case-study block before the page is sent to the browser. */
export function renderBlocks(project, options = {}) {
  const html = (project.blocks || []).map(renderBlock).join('');
  return html.replace(/<img\b([^>]*)>/g, (tag, attributes) => {
    const source = attributes.match(/\bsrc="([^"]+)"/)?.[1];
    if (!source) return '';
    const decodedSource = source.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#039;', "'");
    const normalizedSource = safeMediaUrl(decodedSource);
    if (!normalizedSource) return '';
    const metadata = options.imageAttributes?.(normalizedSource.replaceAll('&amp;', '&').replaceAll('&#039;', "'")) || {};
    let result = attributes.replace(/\bsrc="[^"]*"/, `src="${normalizedSource}"`);
    if (metadata.src) result = result.replace(/\bsrc="[^"]*"/, `src="${safeMediaUrl(metadata.src)}"`);
    for (const name of ['width', 'height']) {
      const dimension = Number(metadata[name]);
      if (Number.isInteger(dimension) && dimension > 0 && !new RegExp(`\\b${name}=`).test(result)) result += ` ${name}="${dimension}"`;
    }
    for (const name of ['srcset', 'sizes']) {
      if (metadata[name]) result += ` ${name}="${escapeHTML(metadata[name])}"`;
    }
    if (!/\bdecoding=/.test(result)) result += ' decoding="async"';
    return `<img${result}>`;
  });
}

export function renderToc(blocks = []) {
  return blocks
    .map((block, index) => ({ ...block, resolvedId: blockId(block, index) }))
    .filter(block => block.navLabel && block.showInNav !== false && block.type !== 'divider')
    .map((block, index) => `<a class="${index === 0 ? 'is-active' : ''}" href="#${block.resolvedId}"${index === 0 ? ' aria-current="location"' : ''}><span class="toc-marker" aria-hidden="true">→</span>${escapeHTML(block.navLabel)}</a>`)
    .join('');
}

export function renderRecommendations(project, publishedProjects = []) {
  const bySlug = new Map(publishedProjects.map(item => [item.slug, item]));
  const orderedSlugs = [...new Set([...(project.recommendations || []), ...bySlug.keys()])];
  return orderedSlugs
    .filter(slug => slug !== project.slug)
    .map(slug => bySlug.get(slug))
    .filter(item => item?.showInRecommendations === true)
    .map(item => {
      const background = /^#[a-f0-9]{3,8}$/i.test(item.thumbnailBackground || '') ? ` style="background:${escapeHTML(item.thumbnailBackground)}"` : '';
      const thumbnail = safeMediaUrl(item.thumbnail)
        ? renderImage(item.thumbnail, item.thumbnailAlt || `${item.title} project preview`, 'next-card-image')
        : `<span class="next-card-monogram" aria-hidden="true">${escapeHTML(item.title.charAt(0))}</span>`;
      return `<a class="next-card" href="/projects/${encodeURIComponent(item.slug)}/" aria-label="${escapeHTML(item.title)} case study"><div class="next-card-thumb next-card-thumb-${option(item.thumbnailFit, ['cover', 'contain'], 'contain')}"${background}>${thumbnail}</div><div class="next-card-copy"><h3>${escapeHTML(item.title)}</h3>${item.deck ? `<p>${escapeHTML(item.deck)}</p>` : ''}</div></a>`;
    })
    .join('');
}
