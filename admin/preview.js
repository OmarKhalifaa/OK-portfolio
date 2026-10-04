(() => {
  const h = window.h;
  const blockPreview = (block, getAsset, index) => {
    const heading = block.heading ? h('h2', {}, block.heading) : null;
    const eyebrow = block.eyebrow ? h('p', { className: 'preview-eyebrow' }, block.eyebrow) : null;
    const text = value => value ? h('p', { className: 'preview-copy' }, value) : null;
    const image = (value, className = '', placeholder = '', alt = '') => value ? h('img', { src: getAsset(value).toString(), alt, className }) : placeholder ? h('div', { className: 'preview-placeholder' }, h('small', {}, 'Image placeholder'), h('span', {}, placeholder)) : null;

    switch (block.type) {
      case 'two_column_text':
        return h('section', { className: 'preview-block', key: index }, eyebrow, heading, h('div', { className: 'preview-columns' }, text(block.left), text(block.right)));
      case 'text_image':
        {
          const copy = h('div', {}, eyebrow, heading, text(block.body));
          const mediaImage = image(block.image, `preview-ratio-${block.aspectRatio || 'auto'} preview-fit-${block.fit || 'cover'} preview-focal-${block.focalPoint || 'center'}`);
          const media = block.displayMode === 'browser' ? h('div', { className: 'preview-display-browser' }, mediaImage) : mediaImage;
          const children = block.layout === 'stacked' || block.imagePosition !== 'left' ? [copy, media] : [media, copy];
          return h('section', { className: `preview-block preview-text-image preview-layout-${block.layout || 'split'} preview-image-${block.imagePosition || 'right'} preview-split-${block.imageWidth || '50'}`, key: index }, ...children);
        }
      case 'image_full':
        return h('section', { className: 'preview-block', key: index }, eyebrow, heading, h('div', { className: `preview-media preview-width-${block.width || 'full'} preview-align-${block.alignment || 'center'} preview-display-${block.displayMode || 'static'}` }, image(block.image, `preview-ratio-${block.aspectRatio || 'auto'} preview-fit-${block.fit || 'cover'} preview-focal-${block.focalPoint || 'center'}`, block.placeholderLabel)), text(block.caption));
      case 'gallery':
        if (block.displayMode === 'page_preview') return h('section', { className: 'preview-block', key: index }, eyebrow, heading,
          h('div', { className: 'preview-full-pages' },
            h('div', { className: 'preview-page-tabs' }, ...(block.images || []).map((item, i) => h('button', { type: 'button', key: i, onClick: event => { const root = event.currentTarget.closest('.preview-full-pages'); root.querySelectorAll('.preview-page-panel').forEach((panel, index) => { panel.hidden = index !== i; }); } }, item.label || item.caption || `Page ${i + 1}`))),
            ...(block.images || []).map((item, i) => h('div', { className: 'preview-page-panel', hidden: i > 0, key: i }, image(item.image, '', item.placeholderLabel)))
          ), text(block.caption));
        return h('section', { className: 'preview-block', key: index }, eyebrow, heading, h('div', { className: `preview-gallery preview-gallery-${block.columns || 'two'}` }, ...(block.images || []).map((item, itemIndex) => h('div', { key: itemIndex }, image(item.image, `preview-ratio-${block.aspectRatio || 'auto'} preview-fit-${block.fit || 'cover'} preview-focal-${item.focalPoint || block.focalPoint || 'center'}`, item.placeholderLabel), text(item.caption)))));
      case 'before_after':
        return h('section', { className: 'preview-block', key: index }, eyebrow, heading,
          h('div', { className: `preview-compare preview-ratio-${block.aspectRatio || 'landscape'} preview-fit-${block.fit || 'contain'} preview-focal-${block.focalPoint || 'top'}`, style: { '--position': '50%' } },
            h('div', { className: 'preview-compare-after' }, image(block.afterImage, '', block.afterPlaceholder || 'After image')),
            h('div', { className: 'preview-compare-before' }, image(block.beforeImage, '', block.beforePlaceholder || 'Before image')),
            h('span', { className: 'preview-compare-label preview-label-before' }, block.beforeLabel || 'Before'),
            h('span', { className: 'preview-compare-label preview-label-after' }, block.afterLabel || 'After'),
            h('span', { className: 'preview-compare-handle', 'aria-hidden': true }, '↔'),
            h('input', { type: 'range', min: 0, max: 100, defaultValue: 50, 'aria-label': `${block.label || 'Design'}: before and after`, onInput: event => event.currentTarget.parentElement.style.setProperty('--position', `${event.currentTarget.value}%`) })
          ), text(block.caption));
      case 'image_pair':
        return h('section', { className: 'preview-block', key: index }, heading,
          h('div', { className: 'preview-image-pair' },
            h('figure', {}, h('div', { className: 'preview-pair-label' }, block.beforeLabel || 'Before'), image(block.beforeImage, '', block.beforePlaceholder || 'Before image', block.beforeAlt || 'Before search screen')),
            h('figure', {}, h('div', { className: 'preview-pair-label' }, block.afterLabel || 'After'), image(block.afterImage, '', block.afterPlaceholder || 'After image', block.afterAlt || 'After search screen'))
          ));
      case 'search_limits':
        return h('section', { className: 'preview-block', key: index }, heading, text(block.body),
          h('div', { className: 'preview-limits' }, ...(block.items || []).map((item, itemIndex) => h('article', { key: itemIndex },
            h('h3', {}, item.stage), h('strong', {}, item.count), text(item.detail)
          ))));
      case 'html_prototype':
        return h('section', { className: 'preview-block', key: index }, heading, text(block.body),
          /^\/prototypes\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(block.url || '')
            ? h('iframe', { className: 'preview-html-prototype', src: block.url, title: block.title || 'Interactive search prototype', loading: 'lazy', sandbox: 'allow-scripts allow-same-origin' })
            : h('div', { className: 'preview-placeholder' }, 'Add a local prototype path'));
      case 'feature_grid':
        return h('section', { className: 'preview-block', key: index }, eyebrow, heading, h('div', { className: 'preview-cards' }, ...(block.items || []).map((item, itemIndex) => h('article', { key: itemIndex }, h('small', {}, item.number), h('h3', {}, item.title), text(item.body)))));
      case 'stats':
        return h('section', { className: 'preview-block', key: index }, eyebrow, heading, h('div', { className: 'preview-stats' }, ...(block.items || []).map((item, itemIndex) => h('div', { key: itemIndex }, h('strong', {}, item.value), h('span', {}, item.label)))));
      case 'process':
        return h('section', { className: 'preview-block', key: index }, eyebrow, heading, h('div', { className: 'preview-cards' }, ...(block.steps || []).map((item, itemIndex) => h('article', { key: itemIndex }, h('small', {}, item.label), h('h3', {}, item.title), text(item.body)))));
      case 'quote':
        return h('section', { className: 'preview-block preview-quote', key: index }, eyebrow, h('blockquote', {}, block.quote), text(block.attribution), text(block.body));
      case 'video':
        return h('section', { className: 'preview-block', key: index }, eyebrow, heading, h('div', { className: 'preview-video' }, block.url || 'Add a video URL'));
      case 'screen_slider':
        return h('section', { className: 'preview-block', key: index }, eyebrow, heading, text(block.body), h('div', { className: 'preview-gallery preview-gallery-two' }, ...(block.slides || []).map((slide, slideIndex) => h('div', { key: slideIndex }, image(slide.image), text(slide.caption || slide.label)))));
      case 'figma_prototype':
        return h('section', { className: 'preview-block', key: index }, eyebrow, heading, text(block.body), block.url ? h('div', { className: 'preview-video' }, 'Interactive Figma prototype') : h('div', { className: 'preview-placeholder' }, h('small', {}, 'Prototype placeholder'), h('span', {}, block.placeholderLabel || 'Original Figma prototype planned')), text(block.caption));
      case 'divider':
        return h('div', { className: 'preview-divider', key: index }, block.label || 'Divider');
      default:
        return h('section', { className: 'preview-block', key: index }, eyebrow, heading, text(block.body));
    }
  };

  const ProjectPreview = window.createClass({
    render() {
      const data = this.props.entry.getIn(['data']).toJS();
      const getAsset = value => {
        const original = this.props.getAsset(value);
        const resolved = original?.toString() || '';
        if (/^(?:blob:|data:)/.test(resolved)) return original;
        return window.PORTFOLIO_ASSETS?.[String(value).replace(/^\//, '')] || original;
      };
      return h('main', { className: 'cms-project-preview' },
        data.thumbnail ? h('section', { className: 'preview-thumbnail' },
          h('p', { className: 'preview-eyebrow' }, 'Project card thumbnail'),
          data.thumbnailVideo
            ? h('video', { src: getAsset(data.thumbnailVideo).toString(), poster: getAsset(data.thumbnail).toString(), controls: true, muted: true, playsInline: true, preload: 'none', 'aria-label': data.thumbnailAlt || 'Project card animation', style: { objectFit: data.thumbnailFit === 'cover' ? 'cover' : 'contain' } })
            : h('img', { src: getAsset(data.thumbnail).toString(), alt: data.thumbnailAlt || '', style: { objectFit: data.thumbnailFit === 'cover' ? 'cover' : 'contain' } })
        ) : null,
        h('header', { className: 'preview-hero' },
          h('h1', {}, data.heroTitle || data.title),
          h('p', { className: 'preview-deck' }, data.deck)
        ),
        h('div', { className: 'preview-meta' },
          h('div', {}, h('small', {}, 'Industry'), h('span', {}, data.industry)),
          h('div', {}, h('small', {}, 'My role'), h('span', {}, data.role)),
          h('div', {}, h('small', {}, 'Team'), h('span', {}, (data.team || []).join(', '))),
          h('div', {}, h('small', {}, 'Timeline'), h('span', {}, data.timeline))
        ),
        ...(data.blocks || []).map((block, index) => blockPreview(block, getAsset, index))
      );
    }
  });

  CMS.registerPreviewStyle('preview.css');
  CMS.registerPreviewTemplate('projects', ProjectPreview);
})();
