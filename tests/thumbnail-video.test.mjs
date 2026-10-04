import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source = await fs.readFile(new URL('../js/thumbnail-video.js', import.meta.url), 'utf8');

function eventTarget(properties = {}) {
  const listeners = new Map();
  return {
    ...properties,
    addEventListener(name, callback) {
      const callbacks = listeners.get(name) || [];
      callbacks.push(callback);
      listeners.set(name, callbacks);
    },
    fire(name, detail = {}) { listeners.get(name)?.forEach(callback => callback(detail)); },
  };
}

function fixture({ reduced = false, saveData = false, mobile = false, visible = true, hidden = false, reject = false, observer = true } = {}) {
  const classes = new Set(['has-video-thumbnail']);
  const attributes = new Map([['autoplay', ''], ['loop', '']]);
  const thumb = {
    classList: { add: name => classes.add(name), remove: name => classes.delete(name) },
    getBoundingClientRect: () => ({ width: 300, height: 225, top: 100, left: 100, right: 400, bottom: 325 }),
  };
  const video = eventTarget({
    dataset: { src: '/images/thumbnails/sample.mp4' },
    paused: true, currentTime: 0, playCount: 0, pauseCount: 0, reject,
    closest: () => thumb,
    getAttribute: name => attributes.get(name),
    setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: name => attributes.delete(name),
    play() {
      this.playCount += 1;
      this.paused = false;
      return this.reject ? Promise.reject(new Error('Playback unavailable')) : Promise.resolve();
    },
    pause() {
      this.pauseCount += 1;
      this.paused = true;
      this.fire('pause');
    },
  });
  const motion = eventTarget({ matches: reduced });
  const pointer = eventTarget({ matches: !mobile });
  const connection = eventTarget({ saveData });
  const document = eventTarget({ visibilityState: hidden ? 'hidden' : 'visible', querySelectorAll: () => [video] });
  let notifyIntersection;
  class IntersectionObserver {
    constructor(callback) { notifyIntersection = callback; }
    observe() {}
  }
  const window = eventTarget({ innerWidth: 1200, innerHeight: 900 });
  if (observer) window.IntersectionObserver = IntersectionObserver;
  const frames = [];
  vm.runInNewContext(source, {
    document, window, navigator: { connection }, IntersectionObserver,
    matchMedia: query => query.includes('reduced-motion') ? motion : pointer,
    requestAnimationFrame: callback => frames.push(callback),
  });
  const intersect = shown => notifyIntersection?.([{ target: thumb, isIntersecting: shown, intersectionRatio: shown ? 1 : 0 }]);
  if (observer) intersect(visible);
  return {
    thumb, video, classes, attributes, document, motion, connection, window, intersect,
    playing() { video.paused = false; video.fire('playing'); },
    visibility(value) { document.visibilityState = value; document.fire('visibilitychange'); },
    flushFrames() { while (frames.length) frames.shift()(); },
  };
}

const settle = async () => { for (let i = 0; i < 4; i += 1) await Promise.resolve(); };

test('lazy-loads visible cards and autoplays muted inline looping without interaction', () => {
  const page = fixture({ visible: false });
  assert.equal(page.attributes.has('src'), false);
  assert.equal(page.video.playCount, 0);
  page.intersect(true);
  assert.equal(page.attributes.get('src'), '/images/thumbnails/sample.mp4');
  assert.equal(page.video.playCount, 1);
  assert.equal(page.video.muted, true);
  assert.equal(page.video.defaultMuted, true);
  assert.equal(page.video.playsInline, true);
  assert.equal(page.video.loop, true);
  assert.equal(page.video.preload, 'none');
  assert.equal(page.classes.has('is-thumbnail-playing'), false, 'poster remains until actual playback');
  page.playing();
  assert.equal(page.classes.has('is-thumbnail-playing'), true);
});

test('mobile cards autoplay without requiring pointer hover or a touch gesture', () => {
  const page = fixture({ mobile: true });
  assert.equal(page.video.playCount, 1);
  assert.equal(page.attributes.get('src'), '/images/thumbnails/sample.mp4');
  page.playing();
  assert.equal(page.classes.has('is-thumbnail-playing'), true);
});

test('offscreen and hidden tabs pause with the poster and resume at the existing time', async () => {
  const page = fixture();
  page.playing();
  await settle();
  page.video.currentTime = 1.25;
  page.intersect(false);
  assert.equal(page.video.paused, true);
  assert.equal(page.classes.has('is-thumbnail-playing'), false);
  assert.equal(page.video.currentTime, 1.25);
  page.intersect(true);
  assert.equal(page.video.playCount, 2);
  page.playing();
  await settle();
  page.visibility('hidden');
  assert.equal(page.video.paused, true);
  assert.equal(page.classes.has('is-thumbnail-playing'), false);
  page.visibility('visible');
  assert.equal(page.video.playCount, 3);
  assert.equal(page.video.currentTime, 1.25);
});

test('an initially hidden page does not attach the source until the tab is visible', () => {
  const page = fixture({ hidden: true });
  assert.equal(page.attributes.has('src'), false);
  assert.equal(page.video.playCount, 0);
  page.visibility('visible');
  assert.equal(page.video.playCount, 1);
});

test('reduced motion and save-data avoid loading; live preference changes pause and resume', async () => {
  for (const options of [{ reduced: true }, { saveData: true }]) {
    const page = fixture(options);
    assert.equal(page.attributes.has('src'), false);
    assert.equal(page.video.playCount, 0);
  }
  const page = fixture();
  page.playing();
  await settle();
  page.motion.matches = true;
  page.motion.fire('change');
  assert.equal(page.video.paused, true);
  assert.equal(page.classes.has('is-thumbnail-playing'), false);
  page.motion.matches = false;
  page.connection.saveData = true;
  page.motion.fire('change');
  assert.equal(page.video.playCount, 1);
  page.connection.saveData = false;
  page.connection.fire('change');
  assert.equal(page.video.playCount, 2);
});

test('blocked autoplay and media errors leave a persistent still fallback without retry churn', async () => {
  const blocked = fixture({ reject: true });
  await settle();
  assert.equal(blocked.video.paused, true);
  assert.equal(blocked.classes.has('is-thumbnail-playing'), false);
  blocked.intersect(false);
  blocked.intersect(true);
  blocked.visibility('hidden');
  blocked.visibility('visible');
  assert.equal(blocked.video.playCount, 1);
  const errored = fixture();
  errored.playing();
  errored.video.fire('error');
  assert.equal(errored.video.paused, true);
  assert.equal(errored.classes.has('is-thumbnail-playing'), false);
  errored.intersect(false);
  errored.intersect(true);
  assert.equal(errored.video.playCount, 1);
});

test('a canceled play request cannot poison a later visible playback attempt', async () => {
  const page = fixture({ visible: false });
  let rejectFirst;
  page.video.play = function () {
    this.playCount += 1;
    this.paused = false;
    return this.playCount === 1 ? new Promise((resolve, reject) => { rejectFirst = reject; }) : Promise.resolve();
  };
  page.intersect(true);
  page.intersect(false);
  page.intersect(true);
  rejectFirst(new Error('Old request canceled'));
  await settle();
  page.playing();
  assert.equal(page.classes.has('is-thumbnail-playing'), true);
  page.intersect(false);
  page.intersect(true);
  assert.equal(page.video.playCount, 3);
});

test('the no-observer fallback autoplays visible cards and stops filtered or scrolled-away cards', async () => {
  const page = fixture({ observer: false });
  assert.equal(page.video.playCount, 1);
  page.playing();
  await settle();
  page.thumb.getBoundingClientRect = () => ({ width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 });
  page.window.fire('scroll');
  page.flushFrames();
  assert.equal(page.video.paused, true);
  assert.equal(page.classes.has('is-thumbnail-playing'), false);
  page.thumb.getBoundingClientRect = () => ({ width: 300, height: 225, top: 10, left: 10, right: 310, bottom: 235 });
  page.window.fire('resize');
  page.flushFrames();
  assert.equal(page.video.playCount, 2);
});
