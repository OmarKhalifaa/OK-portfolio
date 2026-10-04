import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const source = await fs.readFile(fileURLToPath(new URL('../js/project.js', import.meta.url)), 'utf8');

function navigationFixture({ tops = [500, 1000, 1800, 2600], height = 4000, hash = '', frameSources = [] } = {}) {
  const events = new Map();
  const animations = [];
  const state = { horizontal: true, headerHeight: 58 };
  const element = attrs => ({
    attributes: new Map(Object.entries(attrs || {})),
    listeners: new Map(),
    classList: { add() {}, remove() {}, toggle() {} },
    getAttribute(name) { return this.attributes.get(name) ?? null; },
    setAttribute(name, value) { this.attributes.set(name, value); },
    removeAttribute(name) { this.attributes.delete(name); },
    addEventListener(name, callback) { this.listeners.set(name, callback); },
  });
  const root = element();
  const styles = new Map();
  root.style = { setProperty: (name, value) => styles.set(name, value) };
  root.scrollHeight = height;
  const toc = element();
  Object.assign(toc, { scrollLeft: 0, scrollWidth: tops.length * 130 + 32, clientWidth: 390, getBoundingClientRect: () => ({ left: 0, right: 390, height: 49 }) });
  const list = element();
  const links = tops.map((_, index) => {
    const link = element({ href: `#section-${index}` });
    Object.assign(link, { hash: `#section-${index}`, parentElement: list, closest: () => toc, getBoundingClientRect: () => ({ left: 16 + index * 130 - toc.scrollLeft, right: 146 + index * 130 - toc.scrollLeft }) });
    return link;
  });
  const primaryNav = element();
  primaryNav.getBoundingClientRect = () => ({ bottom: state.headerHeight });
  const themeButton = element();
  const frames = frameSources.map(src => {
    const frame = element({ src });
    frame.messages = [];
    frame.contentWindow = { postMessage: (message, origin) => frame.messages.push({ ...message, origin }) };
    return frame;
  });
  const window = {
    scrollY: 0, innerHeight: 844,
    location: { hash, origin: 'https://portfolio.test' },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    requestAnimationFrame: callback => { animations.push(callback); return animations.length; },
    addEventListener: (name, callback) => events.set(name, callback),
  };
  const sections = tops.map((top, index) => ({
    id: `section-${index}`,
    getBoundingClientRect: () => ({ top: top - window.scrollY }),
    scrollIntoView: () => { window.scrollY = top - Number.parseFloat(styles.get('scroll-padding-top')); },
  }));
  const ids = new Map([['nav', primaryNav], ['themeToggle', themeButton], ...sections.map(section => [section.id, section])]);
  const document = {
    documentElement: root, body: element(), activeElement: links[0],
    getElementById: id => ids.get(id) || null,
    querySelectorAll: selector => selector === '#projectTocLinks a' ? links : selector === 'iframe[data-html-prototype]' ? frames : [],
    addEventListener() {},
  };
  const flush = () => { while (animations.length) animations.shift()(); };
  vm.runInNewContext(source, { document, window, localStorage: { getItem: () => null, setItem() {} }, getComputedStyle: node => node === list ? { flexDirection: state.horizontal ? 'row' : 'column' } : { top: `${state.headerHeight}px` } });
  flush();
  const scroll = y => { window.scrollY = y; events.get('scroll')(); flush(); };
  const active = () => links.findIndex(link => link.getAttribute('aria-current') === 'location');
  return { window, document, links, frames, toc, styles, state, events, themeButton, scroll, active, flush };
}

test('section navigation follows every scroll boundary and reveals only the horizontal tab', () => {
  const page = navigationFixture();
  assert.equal(page.active(), 0);
  page.scroll(867);
  assert.equal(page.active(), 0);
  page.scroll(868);
  assert.equal(page.active(), 1);
  page.scroll(2300);
  assert.equal(page.active(), 2);
  const tab = page.links[2].getBoundingClientRect();
  assert.ok(tab.left >= 12 && tab.right <= 378);
  assert.equal(page.window.scrollY, 2300);
  assert.equal(page.document.activeElement, page.links[0]);
  page.scroll(0);
  assert.equal(page.active(), 0);
  assert.ok(page.links[0].getBoundingClientRect().left >= 12);
});

test('navigation selects the last section at the document bottom even when its heading cannot reach the reading line', () => {
  const page = navigationFixture({ tops: [500, 1000, 3300, 3800], height: 4200 });
  page.scroll(3300);
  assert.equal(page.active(), 2);
  page.scroll(3356);
  assert.equal(page.active(), 3);
});

test('native section anchors clear both mobile sticky bars and update after desktop resize', () => {
  const page = navigationFixture({ hash: '#section-2' });
  assert.equal(page.styles.get('scroll-padding-top'), '131px');
  assert.equal(page.window.scrollY, 1669);
  assert.equal(page.active(), 2);
  let prevented = false;
  page.links[3].listeners.get('click')({ button: 0, preventDefault: () => { prevented = true; } });
  assert.equal(prevented, false);
  assert.equal(page.window.location.hash, '#section-2');
  page.state.horizontal = false;
  page.state.headerHeight = 64;
  page.events.get('resize')();
  assert.equal(page.styles.get('scroll-padding-top'), '88px');
});

test('prototype themes are sent on load and changes only to local HTML bundles', () => {
  const page = navigationFixture({ frameSources: ['/prototypes/in-app-search/', 'https://www.figma.com/embed', '//other.test/prototypes/search/'] });
  assert.equal(page.frames[0].messages.length, 1);
  page.frames[0].listeners.get('load')();
  assert.equal(page.frames[0].messages.at(-1).theme, 'dark');
  page.themeButton.listeners.get('click')();
  assert.deepEqual(page.frames[0].messages.at(-1), { type: 'in-app-search:theme', theme: 'light', origin: 'https://portfolio.test' });
  assert.equal(page.frames[1].messages.length, 0);
  assert.equal(page.frames[2].messages.length, 0);
});
