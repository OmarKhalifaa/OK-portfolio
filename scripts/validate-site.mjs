import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import site from '../site.config.mjs';
import { validateContent } from './validate-content.mjs';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const output = path.join(root, 'dist');
const origin = 'https://validation.example';
const allProjects = validateContent(root);
const projects = allProjects.filter(project => project.showInRecommendations === true);
const hiddenProjects = allProjects.filter(project => project.showInRecommendations !== true);
const publicPages = ['index.html', 'about/index.html', 'projects/index.html', ...projects.map(project => `projects/${project.slug}/index.html`)];
const pageData = new Map();
const titles = new Set();
for (const file of [...publicPages, 'admin/index.html', '404.html']) {
  const html = await fs.readFile(path.join(output, file), 'utf8');
  const $ = load(html);
  pageData.set(file, $);
  const ids = $('[id]').toArray().map(element => $(element).attr('id'));
  assert.equal(new Set(ids).size, ids.length, `${file}: duplicate HTML IDs`);
  if (!publicPages.includes(file)) {
    assert.match($('meta[name="robots"]').attr('content') || '', /noindex/, `${file}: utility pages must not be indexed`);
    continue;
  }
  assert.equal($('h1').length, 1, `${file}: expected exactly one H1`);
  const title = $('title').text();
  assert.ok(title && !titles.has(title), `${file}: missing or duplicate title`);
  titles.add(title);
  const description = $('meta[name="description"]').attr('content');
  assert.ok(description, `${file}: missing description`);
  assert.equal($('meta[property="og:title"]').attr('content'), title, `${file}: social title mismatch`);
  assert.equal($('meta[property="og:description"]').attr('content'), description, `${file}: social description mismatch`);
  const pathname = file === 'index.html' ? '/' : '/' + file.replace(/index\.html$/, '');
  const canonical = new URL(pathname, site.url).href;
  assert.equal($('link[rel="canonical"]').attr('href'), canonical, `${file}: wrong canonical`);
  assert.equal($('meta[property="og:url"]').attr('content'), canonical, `${file}: social URL mismatch`);
  assert.equal($('script[type="application/ld+json"]').length, 1, `${file}: missing structured data`);
  const schema = JSON.parse($('script[type="application/ld+json"]').text());
  assert.equal($('script[src*="loader-preview"], link[href*="loader-preview"], #portfolioIntro').length, 0, `${file}: removed loading intro must not return`);
  if (file === 'projects/index.html') {
    const cards = $('#projectsGrid [data-project-card]').toArray();
    assert.equal(cards.length, projects.length, `${file}: must list each public project once`);
    assert.deepEqual(cards.map(element => $(element).attr('data-project-card')).sort(), projects.map(project => project.slug).sort(), `${file}: directory includes hidden or duplicate projects`);
    const filters = $('#projectsFilters button[data-project-filter]').toArray();
    assert.equal($('#projectsFilters').attr('aria-label'), 'Filter projects', `${file}: filters need an accessible label`);
    assert.equal(filters.filter(element => $(element).attr('aria-pressed') === 'true').length, 1, `${file}: one filter must be selected`);
    assert.equal($('#projectsFilters [data-project-filter="all"]').attr('aria-pressed'), 'true', `${file}: all projects must be the default filter`);
    assert.equal($('.projects-card-cta').length, 0, `${file}: project cards should use a single card link`);
    for (const element of filters) {
      const value = $(element).attr('data-project-filter');
      const matchingCards = cards.filter(card => value === 'all' || $(card).attr('data-project-category') === value);
      assert.ok(matchingCards.length, `${file}: empty project filter`);
      assert.equal(Number($(element).find('.filter-count').text()), matchingCards.length, `${file}: filter count mismatch`);
      assert.equal($(element).attr('aria-controls'), 'projectsGrid', `${file}: incorrect filter target`);
    }
    for (const project of projects) {
      const card = cards.find(element => $(element).attr('data-project-card') === project.slug);
      assert.equal($(card).attr('href'), `/projects/${project.slug}/`, `${file}: incorrect project link`);
      assert.equal($(card).find('h2').text(), project.title, `${file}: incorrect project title`);
      assert.equal($(card).find('p').text(), project.deck, `${file}: incorrect project description`);
      assert.ok($(card).find('.projects-card-image').length, `${file}: missing project thumbnail`);
      assert.ok(['mobile', 'web', 'systems', 'other'].includes($(card).attr('data-project-category')), `${file}: missing project filter category`);
    }
    const collection = schema['@graph']?.find(item => item['@type'] === 'CollectionPage');
    assert.ok(collection, `${file}: missing CollectionPage metadata`);
    assert.equal(collection.url, `${site.url}/projects/`, `${file}: incorrect collection URL`);
    assert.equal(collection.mainEntity?.numberOfItems, projects.length, `${file}: incorrect collection item count`);
    assert.deepEqual(collection.mainEntity.itemListElement.map(item => item.item.url).sort(), projects.map(project => `${site.url}/projects/${project.slug}/`).sort(), `${file}: structured data exposes hidden or missing projects`);
    assert.equal($('script[src*="loader-preview"], #projectTocLinks').length, 0, `${file}: directory should not load the intro or case study navigation`);
  } else if (file.startsWith('projects/')) {
    const project = projects.find(candidate => file.includes(`/${candidate.slug}/`));
    assert.equal($('#projectTitle').text().replace(/\s+/g, ' ').trim(), (project.heroTitle || project.title).replace(/\n/g, '').replace(/\s+/g, ' ').trim());
    assert.equal($('#projectContent .content-block').length + $('#projectContent .cms-divider').length, project.blocks.length, `${file}: missing static blocks`);
    assert.equal($('script[src*="marked"], script[src*="purify"], script[src*="lenis"]').length, 0, `${file}: obsolete browser dependencies`);
  }
  for (const project of hiddenProjects) {
    assert.equal($(`[data-project-card="${project.slug}"], a[href="/projects/${project.slug}/"]`).length, 0, `${file}: hidden project exposed in public navigation`);
  }
  $('img').each((_, element) => {
    assert.ok($(element).attr('alt') !== undefined, `${file}: missing image alternative text`);
    if ($(element).attr('src')?.startsWith('/')) assert.ok(Number($(element).attr('width')) > 0 && Number($(element).attr('height')) > 0, `${file}: image dimensions missing`);
  });
  $('[data-thumbnail-video]').each((_, element) => {
    const video = $(element);
    assert.ok(video.is('[autoplay][loop][muted][playsinline]'), `${file}: thumbnail needs muted inline autoplay`);
    assert.equal(video.attr('src'), undefined, `${file}: thumbnail video must load only when visible`);
    assert.ok(video.attr('data-src') && video.attr('poster'), `${file}: thumbnail video needs a source and still cover`);
    assert.equal(video.attr('aria-hidden'), 'true', `${file}: decorative thumbnail video should not duplicate the image label`);
    assert.ok(video.parent().hasClass('has-video-thumbnail'), `${file}: missing thumbnail enhancement container`);
  });
}
for (const project of hiddenProjects) assert.equal(await fs.stat(path.join(output, 'projects', project.slug)).catch(() => null), null, `${project.slug}: hidden case study leaked into public output`);
for (const [file, $] of pageData) {
  const base = new URL('/' + file.replace(/index\.html$/, ''), origin);
  const references = [];
  $('[href], [src], [poster], [data-thumbnail-video][data-src]').each((_, element) => {
    for (const attribute of ['href', 'src', 'poster', 'data-src']) if ($(element).attr(attribute)) references.push($(element).attr(attribute));
    const srcset = $(element).attr('srcset');
    if (srcset) references.push(...srcset.split(',').map(value => value.trim().split(/\s+/)[0]));
  });
  // Social images are absolute, but are still shipped by this build.
  $('meta[property="og:image"]').each((_, element) => references.push($(element).attr('content').replace(site.url, '')));
  for (const reference of references) {
    const url = new URL(reference, base);
    if (url.origin !== origin) continue;
    let target = decodeURIComponent(url.pathname).replace(/^\//, '');
    if (!target || target.endsWith('/')) target += 'index.html';
    const absolute = path.resolve(output, target);
    assert.ok(absolute.startsWith(`${output}${path.sep}`), `${file}: unsafe link ${reference}`);
    assert.ok(await fs.stat(absolute).catch(() => null), `${file}: broken local reference ${reference}`);
    if (url.hash && target.endsWith('.html')) {
      let destination = pageData.get(target);
      if (!destination) destination = load(await fs.readFile(absolute, 'utf8'));
      const anchor = decodeURIComponent(url.hash.slice(1));
      assert.ok(destination('[id]').toArray().some(element => destination(element).attr('id') === anchor), `${file}: missing anchor ${reference}`);
    }
  }
}
const sitemap = load(await fs.readFile(path.join(output, 'sitemap.xml'), 'utf8'), { xml: true });
assert.equal(sitemap('loc').length, publicPages.length, 'Sitemap must include each public page once');
assert.deepEqual(sitemap('loc').toArray().map(element => sitemap(element).text()).sort(), publicPages.map(file => new URL(file === 'index.html' ? '/' : '/' + file.replace(/index\.html$/, ''), site.url).href).sort());
const robots = await fs.readFile(path.join(output, 'robots.txt'), 'utf8');
assert.ok(robots.includes(`Sitemap: ${site.url}/sitemap.xml`), 'Robots must link the canonical sitemap');
for (const file of ['node_modules', '.git', 'scripts', 'tests', 'content', 'templates', 'js', 'css', 'package.json', 'CMS_SETUP.md']) assert.equal(await fs.stat(path.join(output, file)).catch(() => null), null, `${file}: source file leaked into public output`);
console.log(`Verified ${publicPages.length} SEO pages, static case study content, metadata, image dimensions, sitemap, local links and deployment exclusions.`);
