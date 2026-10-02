import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from 'cheerio';
import { renderBlocks, renderToc, renderRecommendations } from '../scripts/project-renderer.mjs';
import { onRequest as redirect } from '../functions/project.js';

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

test('legacy project links permanently redirect and reject unsafe slugs', () => {
  const response = redirect({ request: new Request('https://portfolio.example/project.html?project=digital-store') });
  assert.equal(response.status, 301);
  assert.equal(response.headers.get('Location'), 'https://portfolio.example/projects/digital-store/');
  assert.equal(redirect({ request: new Request('https://portfolio.example/project?project=../../admin') }).status, 404);
  assert.equal(redirect({ request: new Request('https://portfolio.example/project') }).headers.get('Location'), 'https://portfolio.example/projects/login-revamp/');
});
