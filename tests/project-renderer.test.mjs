import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from 'cheerio';
import { renderBlocks, renderToc, renderRecommendations, renderProjectThumbnail } from '../scripts/project-renderer.mjs';
import { onRequest as redirect } from '../functions/project.js';

test('animated project thumbnail keeps an accessible poster and defers video loading', () => {
  const $ = load(renderProjectThumbnail({ title: 'Search', thumbnail: 'images/poster.jpg', thumbnailVideo: 'images/search.mp4', thumbnailAlt: 'Search "home" & results', thumbnailFit: 'contain' }));
  assert.equal($('img').attr('src'), '/images/poster.jpg');
  assert.equal($('img').attr('alt'), 'Search "home" & results');
  const video = $('video[data-thumbnail-video]');
  assert.equal(video.length, 1);
  assert.equal(video.attr('src'), undefined);
  assert.equal(video.attr('data-src'), '/images/search.mp4');
  assert.equal(video.attr('poster'), '/images/poster.jpg');
  assert.equal(video.attr('preload'), 'none');
  assert.equal(video.attr('aria-hidden'), 'true');
  assert.equal(video.attr('tabindex'), '-1');
  assert.equal(video.attr('style'), 'object-fit:contain');
  assert.ok(video.is('[autoplay][loop][muted][playsinline]'));
});

test('thumbnail renderer preserves the still cover when optional media is absent or unsafe', () => {
  for (const thumbnailVideo of [undefined, 'javascript:alert(1)', '//evil.example/video.mp4']) {
    const $ = load(renderProjectThumbnail({ title: 'Search', thumbnail: 'images/poster.jpg', thumbnailVideo, thumbnailFit: 'invalid' }));
    assert.equal($('video').length, 0);
    assert.equal($('img').attr('alt'), 'Search project preview');
    assert.equal($('img').attr('style'), 'object-fit:contain');
  }
  assert.equal(renderProjectThumbnail({ thumbnail: 'javascript:alert(1)', thumbnailVideo: 'images/search.mp4' }), '');
});

test('recommendation thumbnails share the animation enhancement', () => {
  const $ = load(renderRecommendations({ slug: 'current' }, [{ slug: 'search', title: 'Search', showInRecommendations: true, thumbnail: 'images/poster.jpg', thumbnailVideo: 'images/search.mp4' }]));
  assert.equal($('.next-card-thumb.has-video-thumbnail').length, 1);
  assert.equal($('.next-card-image').attr('src'), '/images/poster.jpg');
  assert.equal($('.next-card video').attr('data-src'), '/images/search.mp4');
});

test('CMS markdown and attributes cannot inject executable HTML', () => {
  const $ = load(renderBlocks({ blocks: [{ type: 'rich_text', heading: '<script>alert(1)</script>', body: '**Readable** <script>alert(1)</script><img src=x onerror="alert(1)"> [bad](javascript:alert(1))' }, { type: 'image_full', image: 'javascript:alert(1)', alt: '" onerror="alert(1)' }] }));
  assert.equal($('script, [onerror], a[href^="javascript:"]').length, 0);
  assert.equal($('strong').text(), 'Readable');
  assert.equal($('h2').text(), '<script>alert(1)</script>');
});

test('case study image variants preserve accessible text and dimensions', () => {
  const $ = load(renderBlocks({ blocks: [{ type: 'image_full', image: "images/project/a & b.png", alt: 'Design comparison' }] }, { imageAttributes: src => {
    assert.equal(src, '/images/project/a & b.png');
    return { src: '/assets/image.webp', srcset: '/assets/small.webp 640w, /assets/image.webp 1280w', sizes: '90vw', width: 1280, height: 720 };
  } }));
  assert.equal($('img').attr('src'), '/assets/image.webp');
  assert.equal($('img').attr('alt'), 'Design comparison');
  assert.equal($('img').attr('width'), '1280');
  assert.equal($('img').attr('height'), '720');
  assert.equal($('img').attr('decoding'), 'async');
});

test('TOC anchors match normalized block IDs and exclude hidden navigation', () => {
  const blocks = [{ type: 'rich_text', sectionId: 'A section!', navLabel: 'Start' }, { type: 'rich_text', sectionId: 'hidden', navLabel: 'Hidden', showInNav: false }];
  const toc = load(renderToc(blocks));
  const content = load(renderBlocks({ blocks }));
  assert.equal(toc('a').length, 1);
  assert.equal(toc('a').attr('href'), '#a-section');
  assert.equal(content('#a-section').length, 1);
});

test('recommendations link only to published projects, without self links', () => {
  const projects = [{ slug: 'first', title: 'First', showInRecommendations: true }, { slug: 'draft', title: 'Draft', showInRecommendations: false }, { slug: 'second', title: 'Second', showInRecommendations: true }];
  const $ = load(renderRecommendations({ slug: 'first', recommendations: ['draft', 'second', 'second'] }, projects));
  assert.equal($('a').length, 1);
  assert.equal($('a').attr('href'), '/projects/second/');
});

test('recommendations start a complete new grid row after three cards', () => {
  const projects = ['first', 'second', 'third', 'fourth'].map(slug => ({ slug, title: slug, showInRecommendations: true }));
  const $ = load(renderRecommendations({ slug: 'current' }, projects));
  assert.equal($('.next-project-row').length, 2);
  assert.equal($('.next-project-row').first().find('a').length, 3);
  assert.equal($('.next-project-row').last().find('a').length, 1);
  assert.equal($('a').last().attr('href'), '/projects/fourth/');
});

test('Figma prototypes preserve the original flow and support task instructions', () => {
  const $ = load(renderBlocks({ blocks: [{
    type: 'figma_prototype',
    title: 'Ana Vodafone search prototype',
    body: '**Try Mobile** [Open in Figma](https://www.figma.com/proto/example)',
    url: 'https://www.figma.com/proto/example/Search?node-id=6373-2089&starting-point-node-id=6373%3A2089&page-id=2%3A6&t=temporary',
    topCrop: 'none',
    caption: 'Original Figma prototype'
  }] }));
  const source = new URL($('iframe').attr('src'));
  assert.equal(source.origin, 'https://embed.figma.com');
  assert.equal(source.pathname, '/proto/example/Search');
  assert.equal(source.searchParams.get('starting-point-node-id'), '6373:2089');
  assert.equal(source.searchParams.get('page-id'), '2:6');
  assert.equal(source.searchParams.has('t'), false);
  assert.equal($('.cms-prototype-intro strong').text(), 'Try Mobile');
  assert.equal($('.cms-prototype-intro a').attr('href'), 'https://www.figma.com/proto/example');
  assert.equal($('iframe').attr('title'), 'Ana Vodafone search prototype');
  assert.equal($('.cms-media-planned').length, 0);
});

test('unwired or invalid Figma embeds remain explicit planned placeholders', () => {
  for (const url of ['', 'https://example.com/proto/other', 'javascript:alert(1)']) {
    const $ = load(renderBlocks({ blocks: [{
      type: 'figma_prototype',
      url,
      body: 'Try a product search. <script>alert(1)</script>',
      placeholderLabel: 'Prototype planned <script>alert(1)</script>',
      caption: 'The original flow will be embedded here.'
    }] }));
    assert.equal($('iframe, script').length, 0);
    assert.equal($('.cms-media-planned span').text(), 'Prototype placeholder');
    assert.equal($('.cms-media-planned strong').text(), 'Prototype planned <script>alert(1)</script>');
    assert.match($('.cms-prototype-intro').text(), /Try a product search/);
    assert.equal($('figcaption').text(), 'The original flow will be embedded here.');
  }
});

test('image pairs show both screens without a slider or captions', () => {
  const $ = load(renderBlocks({ blocks: [{ type: 'image_pair', beforeImage: 'images/search/before.png', afterImage: 'images/search/after.png', beforeAlt: 'Search before', afterAlt: 'Search after' }] }));
  assert.equal($('.cms-image-pair img').length, 2);
  assert.equal($('input, figcaption, [data-before-after]').length, 0);
  assert.equal($('img').first().attr('alt'), 'Search before');
  assert.equal($('.cms-image-pair-label').last().text(), 'After');
});

test('HTML prototypes accept only local prototype bundles', () => {
  const valid = load(renderBlocks({ blocks: [{ type: 'html_prototype', url: '/prototypes/in-app-search/', title: 'Search experience', body: 'Try **Mobile**.' }] }));
  assert.equal(valid('iframe').attr('src'), '/prototypes/in-app-search/');
  assert.equal(valid('iframe').attr('title'), 'Search experience');
  assert.match(valid('iframe').attr('sandbox'), /allow-forms/);
  assert.equal(valid('.cms-prototype-intro strong').text(), 'Mobile');
  for (const url of ['https://example.com/', '/prototypes/../admin/', '/admin/', 'javascript:alert(1)']) {
    assert.equal(load(renderBlocks({ blocks: [{ type: 'html_prototype', url }] }))('iframe').length, 0);
  }
});

test('search limit cards preserve readable counts and escape content', () => {
  const $ = load(renderBlocks({ blocks: [{ type: 'search_limits', body: 'Preview limits', items: [{ stage: 'While typing', count: '7', detail: '<script>alert(1)</script>' }] }] }));
  assert.equal($('[role="listitem"]').length, 1);
  assert.equal($('.cms-search-limit strong').text(), '7');
  assert.equal($('script').length, 0);
  assert.equal($('.cms-search-limit p').text(), '<script>alert(1)</script>');
});

test('legacy project links permanently redirect and reject unsafe slugs', () => {
  const response = redirect({ request: new Request('https://portfolio.example/project.html?project=digital-store') });
  assert.equal(response.status, 301);
  assert.equal(response.headers.get('Location'), 'https://portfolio.example/projects/digital-store/');
  assert.equal(redirect({ request: new Request('https://portfolio.example/project?project=../../admin') }).status, 404);
  assert.equal(redirect({ request: new Request('https://portfolio.example/project') }).headers.get('Location'), 'https://portfolio.example/projects/login-revamp/');
});
