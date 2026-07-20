(() => {
  const h = window.h;
  const blockPreview = (block, getAsset, index) => {
    const heading = block.heading ? h('h2', {}, block.heading) : null;
    const eyebrow = block.eyebrow ? h('p', { className: 'preview-eyebrow' }, block.eyebrow) : null;
    const text = value => value ? h('p', { className: 'preview-copy' }, value) : null;
    const image = (value, className = '') => value ? h('img', { src: getAsset(value).toString(), alt: '', className }) : null;

    switch (block.type) {
      case 'two_column_text':
        return h('section', { className: 'preview-block', key: index }, eyebrow, heading, h('div', { className: 'preview-columns' }, text(block.left), text(block.right)));
      case 'text_image':
        {
          const copy = h('div', {}, eyebrow, heading, text(block.body));
          const media = image(block.image, `preview-ratio-${block.aspectRatio || 'auto'} preview-fit-${block.fit || 'cover'} preview-focal-${block.focalPoint || 'center'}`);
          const children = block.imagePosition === 'left' ? [media, copy] : [copy, media];
          return h('section', { className: `preview-block preview-text-image preview-image-${block.imagePosition || 'right'} preview-split-${block.imageWidth || '50'}`, key: index }, ...children);
        }
      case 'image_full':
        return h('section', { className: 'preview-block', key: index }, eyebrow, heading, h('div', { className: `preview-media preview-width-${block.width || 'full'} preview-align-${block.alignment || 'center'}` }, image(block.image, `preview-ratio-${block.aspectRatio || 'auto'} preview-fit-${block.fit || 'cover'} preview-focal-${block.focalPoint || 'center'}`)), text(block.caption));
      case 'gallery':
        return h('section', { className: 'preview-block', key: index }, eyebrow, heading, h('div', { className: `preview-gallery preview-gallery-${block.columns || 'two'}` }, ...(block.images || []).map((item, itemIndex) => h('div', { key: itemIndex }, image(item.image, `preview-ratio-${block.aspectRatio || 'auto'} preview-fit-${block.fit || 'cover'} preview-focal-${block.focalPoint || 'center'}`), text(item.caption)))));
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
      case 'divider':
        return h('div', { className: 'preview-divider', key: index }, block.label || 'Divider');
      default:
        return h('section', { className: 'preview-block', key: index }, eyebrow, heading, text(block.body));
    }
  };

  const ProjectPreview = window.createClass({
    render() {
      const data = this.props.entry.getIn(['data']).toJS();
      const getAsset = this.props.getAsset;
      return h('main', { className: 'cms-project-preview' },
        data.thumbnail ? h('section', { className: 'preview-thumbnail' },
          h('p', { className: 'preview-eyebrow' }, 'Project card thumbnail'),
          h('img', { src: getAsset(data.thumbnail).toString(), alt: data.thumbnailAlt || '' })
        ) : null,
        h('header', { className: 'preview-hero' },
          h('p', { className: 'preview-eyebrow' }, [data.client, data.category, data.year].filter(Boolean).join(' · ')),
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
