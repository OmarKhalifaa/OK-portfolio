import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { load } from 'cheerio';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const run = promisify(execFile);
const buildScript = path.join(root, 'scripts/build.mjs');

test('preview lists only the active unpublished project in the directory and stays isolated from deployable output', async () => {
  const deployableHome = path.join(root, 'dist/index.html');
  const before = await fs.readFile(deployableHome).catch(() => null);
  await run(process.execPath, [buildScript, '--preview-project', 'bikeopolis'], { cwd: root, timeout: 120000 });
  const output = path.join(root, '.cache/project-previews/bikeopolis');
  const preview = load(await fs.readFile(path.join(output, 'projects/bikeopolis/index.html'), 'utf8'));
  assert.equal(preview('body').attr('data-draft-preview'), 'true');
  assert.equal(preview('.draft-preview-notice, .card-status, .projects-card-status').length, 0);
  assert.equal(preview('meta[name="robots"]').attr('content'), 'noindex, nofollow');
  assert.equal(preview('link[rel="canonical"], script[type="application/ld+json"]').length, 0);
  assert.equal(preview('#projectTitle').text(), 'Bikeopolis');
  const home = load(await fs.readFile(path.join(output, 'index.html'), 'utf8'));
  assert.equal(home('[data-project-card="bikeopolis"], a[href="/projects/bikeopolis/"]').length, 0);
  const directory = load(await fs.readFile(path.join(output, 'projects/index.html'), 'utf8'));
  const draftDirectoryCard = directory('[data-project-card="bikeopolis"]');
  assert.equal(draftDirectoryCard.length, 1);
  assert.equal(draftDirectoryCard.attr('href'), '/projects/bikeopolis/');
  for (const $ of [home, directory]) {
    assert.equal($('.draft-preview-notice, .card-status, .projects-card-status, [data-project-filter="draft"]').length, 0);
  }
  assert.doesNotMatch(await fs.readFile(path.join(output, 'sitemap.xml'), 'utf8'), /bikeopolis/);
  const published = load(await fs.readFile(path.join(output, 'projects/login-revamp/index.html'), 'utf8'));
  assert.equal(published('a[href="/projects/bikeopolis/"]').length, 0);
  assert.equal(await fs.readFile(path.join(output, 'robots.txt'), 'utf8'), 'User-agent: *\nDisallow: /\n');
  const contentFiles = (await fs.readdir(path.join(root, 'content/projects'))).filter(file => file.endsWith('.json'));
  const projects = await Promise.all(contentFiles.map(async file => JSON.parse(await fs.readFile(path.join(root, 'content/projects', file), 'utf8'))));
  for (const project of projects.filter(project => project.showInRecommendations !== true && project.slug !== 'bikeopolis')) {
    for (const $ of [home, directory]) assert.equal($(`[data-project-card="${project.slug}"], a[href="/projects/${project.slug}/"]`).length, 0);
  }
  const referencedPrototypes = [...new Set(projects.filter(project => project.showInRecommendations === true || project.slug === 'bikeopolis').flatMap(project => project.blocks.filter(block => block.type === 'html_prototype').map(block => block.url.split('/')[2])))].sort();
  const copiedPrototypes = await fs.readdir(path.join(output, 'prototypes')).catch(error => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  assert.deepEqual(copiedPrototypes.sort(), referencedPrototypes);
  assert.deepEqual(await fs.readFile(deployableHome).catch(() => null), before);
});

test('draft preview rejects missing, unsafe, and unknown slugs before writing output', async () => {
  for (const args of [[], ['../dist'], ['unknown-case-study-for-test']]) {
    await assert.rejects(run(process.execPath, [buildScript, '--preview-project', ...args], { cwd: root, timeout: 30000 }), error => /requires a valid project slug|Unknown preview project/.test(error.stderr));
  }
});

test('search preview copies the published prototype and animated thumbnail without changing its files', async () => {
  await run(process.execPath, [buildScript, '--preview-project', 'in-app-search'], { cwd: root, timeout: 120000 });
  const source = path.join(root, 'prototypes/in-app-search');
  const copied = path.join(root, '.cache/project-previews/in-app-search/prototypes/in-app-search');
  const checkDirectory = async (sourceDirectory, copiedDirectory) => {
    const entries = (await fs.readdir(sourceDirectory, { withFileTypes: true })).filter(entry => !/\.(?:test|spec)\.[cm]?[jt]sx?$/i.test(entry.name) && !['tests', '__tests__'].includes(entry.name));
    assert.deepEqual((await fs.readdir(copiedDirectory)).sort(), entries.map(entry => entry.name).sort());
    for (const entry of entries) {
      if (entry.isDirectory()) await checkDirectory(path.join(sourceDirectory, entry.name), path.join(copiedDirectory, entry.name));
      else assert.deepEqual(await fs.readFile(path.join(copiedDirectory, entry.name)), await fs.readFile(path.join(sourceDirectory, entry.name)));
    }
  };
  await checkDirectory(source, copied);
  const preview = load(await fs.readFile(path.join(root, '.cache/project-previews/in-app-search/projects/in-app-search/index.html'), 'utf8'));
  assert.equal(preview('iframe[src="/prototypes/in-app-search/"]').length, 1);
  const heroTitle = preview('#projectTitle').clone();
  heroTitle.find('br').replaceWith(' ');
  assert.equal(heroTitle.text().replace(/\s+/g, ' ').trim(), 'Vodafone Search');
  assert.match(preview('title').text(), /^Vodafone Search — /);
  assert.equal(preview('body').attr('data-draft-preview'), 'true');
  assert.equal(preview('meta[name="robots"]').attr('content'), 'noindex, nofollow');
  const home = load(await fs.readFile(path.join(root, '.cache/project-previews/in-app-search/index.html'), 'utf8'));
  const homeCard = home('[data-project-card="in-app-search"]');
  assert.equal(homeCard.length, 1);
  assert.equal(homeCard.find('video[data-thumbnail-video]').attr('data-src'), '/images/thumbnails/in-app-search-motion-intro-v6.mp4');
  assert.equal(homeCard.find('.has-video-thumbnail').length, 1);
  const directory = load(await fs.readFile(path.join(root, '.cache/project-previews/in-app-search/projects/index.html'), 'utf8'));
  const card = directory('[data-project-card="in-app-search"]');
  assert.equal(card.length, 1);
  assert.equal(card.attr('href'), '/projects/in-app-search/');
  assert.equal(card.find('.projects-card-title').text(), 'Vodafone Search');
  assert.match(card.find('img').attr('src'), /^\/assets\/images\//);
  assert.match(card.find('img').attr('alt'), /search/i);
  assert.equal(card.find('.has-video-thumbnail').length, 1);
  const video = card.find('video[data-thumbnail-video]');
  assert.equal(video.length, 1);
  assert.equal(video.attr('data-src'), '/images/thumbnails/in-app-search-motion-intro-v6.mp4');
  assert.equal(video.attr('src'), undefined);
  assert.equal(video.attr('poster'), card.find('img').attr('src'));
  assert.equal(video.attr('preload'), 'none');
  assert.equal(video.attr('aria-hidden'), 'true');
  assert.ok(video.is('[autoplay][loop][muted][playsinline]'));
  assert.equal(directory('script[src*="thumbnail-video."]').length, 1);
  assert.equal(directory('link[href*="thumbnail-video."]').length, 1);
  assert.deepEqual(
    await fs.readFile(path.join(root, '.cache/project-previews/in-app-search/images/thumbnails/in-app-search-motion-intro-v6.mp4')),
    await fs.readFile(path.join(root, 'images/thumbnails/in-app-search-motion-intro-v6.mp4'))
  );
  for (const $ of [home, directory, preview]) {
    assert.equal($('.draft-preview-notice, .card-status, .projects-card-status, [data-project-filter="draft"]').length, 0);
  }
});
