import fs from 'node:fs/promises';
import { watch } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { load } from 'cheerio';
import sharp from 'sharp';
import { transform } from 'esbuild';
import site from '../site.config.mjs';
import { validateContent } from './validate-content.mjs';
import { renderBlocks, renderToc, renderRecommendations, escapeHTML } from './project-renderer.mjs';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const output = path.join(root, 'dist');
const cache = path.join(root, '.cache/images');
sharp.cache({ memory: 64 });
sharp.concurrency(2);
// These are trusted design exports; some full-page screenshots exceed Sharp's default pixel limit.
const image = data => sharp(data, { limitInputPixels: false, sequentialRead: true });
const digest = value => createHash('sha256').update(value).digest('hex').slice(0, 12);
const read = file => fs.readFile(path.join(root, file), 'utf8');
const localPath = value => {
  if (!value || /^(?:[a-z]+:|\/\/|#)/i.test(value)) return null;
  return decodeURIComponent(value.split(/[?#]/)[0]).replace(/^\//, '');
};
const sourceFile = relative => {
  const file = path.resolve(root, relative);
  if (!file.startsWith(`${root}${path.sep}`)) throw new Error(`Invalid source path: ${relative}`);
  return file;
};
const write = async (file, value) => {
  const destination = path.resolve(output, file);
  if (!destination.startsWith(`${output}${path.sep}`)) throw new Error(`Invalid output path: ${file}`);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, value);
};
const imageReferences = $ => $('img[src], video[src], audio[src], source[src], [poster]').toArray().flatMap(element => ['src', 'poster'].map(attr => localPath($(element).attr(attr))).filter(Boolean));
const jsonScript = value => JSON.stringify(value).replaceAll('<', '\\u003c');

function metadata($, { title, description, pathname, image = '/images/omar-khalifa-preview.jpg', type = 'website', schema, square = false }) {
  $('title').text(title);
  $('meta[name="description"], meta[property^="og:"], meta[name^="twitter:"], link[rel="canonical"], script[type="application/ld+json"]').remove();
  const canonical = new URL(pathname, site.url).href;
  const tags = {
    'name:description': description,
    'property:og:type': type,
    'property:og:site_name': site.name,
    'property:og:locale': 'en_US',
    'property:og:title': title,
    'property:og:description': description,
    'property:og:url': canonical,
    'property:og:image': new URL(image, site.url).href,
    'property:og:image:width': square ? '1024' : '1200',
    'property:og:image:height': square ? '1024' : '630',
    'property:og:image:alt': title,
    'name:twitter:card': square ? 'summary' : 'summary_large_image',
    'name:twitter:title': title,
    'name:twitter:description': description,
    'name:twitter:image': new URL(image, site.url).href,
    'name:twitter:image:alt': title,
  };
  for (const [key, content] of Object.entries(tags)) {
    const separator = key.indexOf(':');
    const attribute = key.slice(0, separator);
    const value = key.slice(separator + 1);
    $('head').append($('<meta>').attr({ [attribute]: value, content }));
  }
  $('head').append($('<link>').attr({ rel: 'canonical', href: canonical }));
  $('head').append(`<script type="application/ld+json">${jsonScript(schema)}</script>`);
}

export async function build() {
  const projects = validateContent(root);
  const published = projects.filter(project => project.showInRecommendations === true);
  if (!published.length) throw new Error('At least one published case study is required');
  // Only the fixed build directory can be cleared; source and CMS files are never touched.
  if (output !== path.join(root, 'dist')) throw new Error('Unsafe output directory');
  await fs.rm(output, { recursive: true, force: true });
  await fs.mkdir(cache, { recursive: true });
  const home = load(await read('index.html'));
  const about = load(await read('about.html'));
  const template = await read('templates/project.html');
  const assets = new Set([
    'favicon.ico', 'favicon-16x16.png', 'favicon-32x32.png', 'apple-touch-icon.png',
    'android-chrome-192x192.png', 'android-chrome-512x512.png', 'images/omar-khalifa-preview.jpg', 'images/stickers/omar-moods.png',
    ...imageReferences(home), ...imageReferences(about),
  ]);
  for (const project of published) {
    imageReferences(load(renderBlocks(project))).forEach(asset => assets.add(asset));
    if (project.thumbnail) assets.add(localPath(project.thumbnail));
    if (project.thumbnailIcon) assets.add(localPath(project.thumbnailIcon));
  }
  const imageMap = new Map();
  let originalBytes = 0;
  let optimizedBytes = 0;
  for (const relative of [...assets].filter(Boolean).sort()) {
    const file = sourceFile(relative);
    const data = await fs.readFile(file);
    if (/^images\/.*\.(?:png|jpe?g)$/i.test(relative) && !['images/omar-khalifa-preview.jpg', 'images/stickers/omar-moods.png'].includes(relative)) {
      originalBytes += data.length;
      const info = await image(data).metadata();
      const widths = [...new Set([640, 1280, 1920].map(width => Math.min(width, info.width)))];
      const variants = [];
      for (const width of widths) {
        const hash = digest(Buffer.concat([data, Buffer.from(`webp-88-v1-${width}`)]));
        const name = `${path.basename(relative, path.extname(relative)).replace(/[^a-z0-9-]/gi, '-').toLowerCase()}-${hash}.webp`;
        const cacheFile = path.join(cache, name);
        let encoded;
        try { encoded = await fs.readFile(cacheFile); }
        catch (error) {
          if (error.code !== 'ENOENT') throw error;
          encoded = await image(data).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 88, effort: 4 }).toBuffer();
          await fs.writeFile(cacheFile, encoded);
        }
        await write(`assets/images/${name}`, encoded);
        optimizedBytes += encoded.length;
        variants.push({ src: `/assets/images/${name}`, width });
      }
      const preferred = variants.find(variant => variant.width >= 1280) || variants.at(-1);
      imageMap.set(`/${relative}`, {
        src: preferred.src,
        srcset: variants.map(variant => `${variant.src} ${variant.width}w`).join(', '),
        sizes: '(max-width: 720px) calc(100vw - 40px), (max-width: 1400px) 70vw, 1100px',
        width: info.width,
        height: info.height,
      });
    } else {
      await write(relative, data);
      if (/\.(?:png|jpe?g|svg)$/i.test(relative)) {
        const info = await image(data).metadata();
        imageMap.set(`/${relative}`, { src: `/${relative}`, width: info.width, height: info.height });
      }
    }
  }
  const imageAttributes = src => imageMap.get(src) || {};
  const staticAssets = new Map();
  for (const folder of ['css', 'js']) {
    for (const filename of await fs.readdir(path.join(root, folder))) {
      if (!filename.endsWith(`.${folder === 'css' ? 'css' : 'js'}`)) continue;
      const relative = `${folder}/${filename}`;
      const source = await read(relative);
      const { code } = await transform(source, { loader: folder === 'css' ? 'css' : 'js', minify: true, legalComments: 'none', target: folder === 'css' ? undefined : 'es2020' });
      const name = `${path.basename(filename, path.extname(filename))}.${digest(code)}${path.extname(filename)}`;
      await write(`assets/${name}`, code);
      staticAssets.set(relative, `/assets/${name}`);
    }
  }
  const finalize = $ => {
    $('link[rel="stylesheet"], script[src]').each((_, element) => {
      const attribute = element.name === 'link' ? 'href' : 'src';
      const relative = localPath($(element).attr(attribute));
      if (staticAssets.has(relative)) $(element).attr(attribute, staticAssets.get(relative));
    });
    $('img').each((_, element) => {
      const relative = localPath($(element).attr('src'));
      if (relative && imageMap.has(`/${relative}`)) $(element).attr(imageMap.get(`/${relative}`));
      if ($(element).hasClass('next-card-image')) $(element).attr('sizes', '(max-width: 720px) calc(100vw - 22px), (max-width: 960px) calc(33.333vw - 85px), (max-width: 1180px) calc(33.333vw - 171px), calc(16vw - 22px)');
      $(element).attr('decoding', 'async');
    });
    $('link[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (href && !href.startsWith('/') && localPath(href)) $(element).attr('href', `/${href}`);
    });
    $('a').each((_, element) => {
      const href = $(element).attr('href') || '';
      if (/^index\.html(?:#.*)?$/.test(href)) $(element).attr('href', href.replace('index.html', '/'));
      if (href === 'about.html') $(element).attr('href', '/about/');
    });
    if (!$('link[href="https://fonts.gstatic.com"]').length) $('head').append('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
    return $.html();
  };
  const person = { '@type': 'Person', '@id': `${site.url}/#person`, name: site.name, jobTitle: site.role, url: `${site.url}/`, sameAs: site.social, email: `mailto:${site.email}`, homeLocation: { '@type': 'Place', name: 'Cairo, Egypt' } };
  const existingCards = new Map(home('[data-project-card]').toArray().map(card => [home(card).attr('data-project-card'), home(card).toString()]));
  const order = [...existingCards.keys(), ...published.map(project => project.slug)].filter((slug, index, all) => all.indexOf(slug) === index);
  home('.concept-card-stack').empty();
  for (const slug of order) {
    const project = published.find(candidate => candidate.slug === slug);
    if (!project) continue;
    const card = home(existingCards.get(slug) || existingCards.values().next().value);
    card.attr({ href: `/projects/${slug}/`, 'data-project-card': slug });
    card.find('.card-title').text(project.title);
    card.find('.card-desc').text(project.deck);
    if (project.thumbnail) {
      const thumb = card.find('.card-thumb').addClass('has-cms-thumbnail');
      const thumbnailPath = localPath(project.thumbnail);
      thumb.empty().append(home('<img>').attr({ class: 'cms-card-thumb-image', src: thumbnailPath ? `/${thumbnailPath}` : project.thumbnail, alt: project.thumbnailAlt || `${project.title} project preview`, loading: 'lazy', style: `object-fit:${project.thumbnailFit === 'cover' ? 'cover' : 'contain'}` }));
      if (/^#[a-f0-9]{3,8}$/i.test(project.thumbnailBackground || '')) thumb.css('background', project.thumbnailBackground);
      for (const [field, attribute] of [['thumbnailPixelBase', 'data-pixel-base'], ['thumbnailPixelAccent', 'data-pixel-accent']]) {
        if (/^#[a-f0-9]{3,8}$/i.test(project[field] || '')) thumb.attr(attribute, project[field]);
      }
    } else {
      const icon = card.find('.thumb-icon').empty();
      if (project.thumbnailIcon) {
        const iconPath = localPath(project.thumbnailIcon);
        icon.append(home('<img>').attr({ src: iconPath ? `/${iconPath}` : project.thumbnailIcon, alt: '' }));
      } else icon.text(project.title.charAt(0));
    }
    home('.concept-card-stack').append(card);
  }
  metadata(home, { title: `${site.name} — ${site.role}`, description: site.description, pathname: '/', square: true, schema: { '@context': 'https://schema.org', '@graph': [person, { '@type': 'WebSite', '@id': `${site.url}/#website`, url: `${site.url}/`, name: `${site.name} Portfolio`, author: { '@id': person['@id'] } }] } });
  await write('index.html', finalize(home));
  metadata(about, { title: `About ${site.name} — ${site.role}`, description: about('meta[name="description"]').attr('content'), pathname: '/about/', square: true, type: 'profile', schema: { '@context': 'https://schema.org', '@type': 'AboutPage', url: `${site.url}/about/`, name: `About ${site.name}`, mainEntity: person } });
  await write('about/index.html', finalize(about));
  for (const project of published) {
    const $ = load(template);
    $('body').attr('data-project', project.slug);
    $('#projectTitle').html(escapeHTML(project.heroTitle || project.title).replaceAll('\n', '<br>'));
    for (const [selector, value] of [['#projectKicker', [project.client, project.category, project.year].filter(Boolean).join(' · ')], ['#projectDeck', project.deck], ['#projectIndustry', project.industry], ['#projectRole', project.role], ['#projectTimeline', project.timeline || '']]) $(selector).text(value);
    $('#projectTeam').html((project.team || []).map(name => {
      const link = (project.teamLinks || []).find(item => item.name === name && /^https?:\/\//i.test(item.url || ''));
      return link ? `<a href="${escapeHTML(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(name)}</a>` : escapeHTML(name);
    }).join('<br>'));
    if (!project.timeline) { $('#projectTimeline').parent().remove(); $('.project-meta').addClass('has-no-timeline'); }
    $('#projectContent').html(renderBlocks(project, { imageAttributes }));
    $('#projectTocLinks').html(renderToc(project.blocks));
    $('.next-projects-inner').append(renderRecommendations(project, published));
    if (published.length < 2) { $('.next-projects').attr('hidden', ''); $('body').addClass('has-no-recommendations'); }
    let socialImage = '/images/omar-khalifa-preview.jpg';
    if (project.thumbnail && localPath(project.thumbnail)) {
      const source = await fs.readFile(sourceFile(localPath(project.thumbnail)));
      const jpeg = await image(source).rotate().resize(1200, 630, { fit: 'contain', background: '#0c0c0b' }).jpeg({ quality: 85 }).toBuffer();
      socialImage = `/assets/images/${project.slug}-social-${digest(jpeg)}.jpg`;
      await write(socialImage.slice(1), jpeg);
    }
    const pathname = `/projects/${project.slug}/`;
    const description = project.seoDescription || project.deck;
    metadata($, { title: `${project.title} — ${site.name}`, description, pathname, image: socialImage, square: socialImage === '/images/omar-khalifa-preview.jpg', type: 'article', schema: { '@context': 'https://schema.org', '@graph': [{ '@type': 'CreativeWork', '@id': `${site.url}${pathname}#case-study`, url: `${site.url}${pathname}`, name: project.title, description, image: new URL(socialImage, site.url).href, creator: { '@id': person['@id'] }, inLanguage: 'en' }, person, { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${site.url}/` }, { '@type': 'ListItem', position: 2, name: project.title, item: `${site.url}${pathname}` }] }] } });
    await write(`projects/${project.slug}/index.html`, finalize($));
  }
  for (const file of ['config.yml', 'preview.css']) await write(`admin/${file}`, await read(`admin/${file}`));
  const preview = await transform(await read('admin/preview.js'), { minify: true, target: 'es2020', legalComments: 'none' });
  await write('admin/preview.js', preview.code);
  await write('admin/media.js', `window.PORTFOLIO_ASSETS=${jsonScript(Object.fromEntries([...imageMap].map(([key, value]) => [key.slice(1), value.src])))};`);
  await write('admin/index.html', (await read('admin/index.html')).replace('<script src="preview.js">', '<script src="media.js"></script>\n  <script src="preview.js">'));
  await write('site.webmanifest', await read('site.webmanifest'));
  await write('_headers', await read('_headers'));
  await write('_routes.json', JSON.stringify({ version: 1, include: ['/auth', '/auth/', '/callback', '/callback/', '/project', '/project/', '/project.html', '/project.html/'], exclude: [] }, null, 2) + '\n');
  await write('_redirects', '/about.html /about/ 301\n/about /about/ 301\n/loader-preview.html /?intro=1 301\n');
  await write('404.html', '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Page not found — Omar Khalifa</title></head><body><main><h1>Page not found</h1><p>The page may have moved.</p><a href="/">Return to the portfolio</a></main></body></html>');
  const urls = ['/', '/about/', ...published.map(project => `/projects/${project.slug}/`)];
  await write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url => `<url><loc>${escapeHTML(new URL(url, site.url).href)}</loc></url>`).join('')}</urlset>\n`);
  await write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /auth\nDisallow: /callback\n\nSitemap: ${site.url}/sitemap.xml\n`);
  console.log(`Built ${urls.length} public pages. Image variants: ${(originalBytes / 1048576).toFixed(1)} MiB source → ${(optimizedBytes / 1048576).toFixed(1)} MiB WebP, including all responsive sizes.`);
}

await build();
if (process.argv.includes('--watch')) {
  let timer;
  let building = false;
  let pending = false;
  const rebuild = async () => {
    if (building) { pending = true; return; }
    building = true;
    try {
      // A fresh process also reloads the renderer and site config after edits.
      await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [fileURLToPath(import.meta.url)], { cwd: root, stdio: 'inherit' });
        child.once('error', reject);
        child.once('close', code => code === 0 ? resolve() : reject(new Error(`Build exited with code ${code}`)));
      });
    } catch (error) { console.error(error); }
    finally { building = false; if (pending) { pending = false; await rebuild(); } }
  };
  watch(root, { recursive: true }, (_, filename) => {
    if (!filename || /^(?:node_modules|dist|\.cache|\.git|\.claude)(?:[\\/]|$)/.test(filename)) return;
    clearTimeout(timer);
    timer = setTimeout(rebuild, 300);
  });
  console.log('Watching source and CMS content for changes.');
}
