import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source = await fs.readFile(new URL('../js/homepage-entrance.js', import.meta.url), 'utf8');
function fixture({ reduced = false, stalled = false } = {}) {
  const classes = new Set();
  const listeners = new Map();
  const timers = new Map();
  const frames = new Map();
  const content = [{ inert: false }, { inert: true }];
  const counter = { textContent: '0%' };
  const loader = { removed: false, leaving: false, classList: { add() { loader.leaving = true; } }, remove() { loader.removed = true; } };
  const media = { matches: reduced, addEventListener: (name, callback) => listeners.set(`media:${name}`, callback) };
  let time = 0;
  let sequence = 0;
  let ready = 0;
  vm.runInNewContext(source, {
    document: {
      documentElement: { classList: { add: (...names) => names.forEach(name => classes.add(name)), remove: (...names) => names.forEach(name => classes.delete(name)) } },
      fonts: { ready: stalled ? new Promise(() => {}) : Promise.resolve() },
      getElementById: id => id === 'portfolioLoader' ? loader : counter,
      querySelectorAll: selector => selector.startsWith('body') ? content : [],
      addEventListener: (name, callback) => listeners.set(name, callback),
      dispatchEvent: () => { ready += 1; },
    },
    window: { homepageAssetsReady: Promise.resolve() },
    matchMedia: () => media,
    performance: { now: () => time },
    Event: class {},
    setTimeout: (callback, duration) => { const id = ++sequence; timers.set(id, { callback, duration }); return id; },
    clearTimeout: id => timers.delete(id),
    requestAnimationFrame: callback => { const id = ++sequence; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id),
  });
  return {
    classes, content, loader, counter,
    ready: () => ready,
    boot: () => listeners.get('DOMContentLoaded')(),
    frame(now) { time = now; const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(now)); },
    timer(duration) { [...timers.values()].find(timer => timer.duration === duration)?.callback(); },
  };
}
const settle = async () => { for (let i = 0; i < 4; i++) await Promise.resolve(); };

test('loader finishes once, restores prior inert states, and removes itself after the reveal', async () => {
  const page = fixture();
  page.boot();
  assert.ok(page.content.every(element => element.inert));
  await settle();
  page.frame(500);
  assert.equal(page.counter.textContent, '75%');
  page.frame(1120);
  assert.equal(page.counter.textContent, '100%');
  assert.equal(page.loader.leaving, true);
  assert.deepEqual(page.content.map(element => element.inert), [false, true]);
  assert.equal(page.classes.size, 0);
  assert.equal(page.ready(), 1);
  page.timer(700);
  assert.equal(page.loader.removed, true);
});

test('stalled assets cannot leave the homepage blocked', async () => {
  const page = fixture({ stalled: true });
  page.boot();
  await settle();
  page.frame(2000);
  assert.equal(page.ready(), 0);
  page.timer(3000);
  assert.equal(page.ready(), 1);
  assert.equal(page.content[0].inert, false);
  assert.equal(page.classes.size, 0);
});

test('reduced motion skips the loading screen and releases the page immediately', () => {
  const page = fixture({ reduced: true });
  assert.equal(page.classes.size, 0);
  page.boot();
  assert.equal(page.loader.removed, true);
  assert.equal(page.ready(), 1);
  assert.equal(page.content[0].inert, false);
});
