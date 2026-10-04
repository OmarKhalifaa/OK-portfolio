import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source = await fs.readFile(new URL('../js/card-pointer.js', import.meta.url), 'utf8');

function fixture() {
  const frames = [];
  const cards = ['halo-card', 'projects-card'].map(type => {
    const listeners = new Map();
    const styles = new Map();
    const classes = new Set([type]);
    const activations = [];
    return {
      classes, styles, activations,
      classList: {
        add(name) {
          if (name === 'card-pointer-active') activations.push([styles.get('--cta-x'), styles.get('--cta-y')]);
          classes.add(name);
        },
        remove: name => classes.delete(name),
      },
      style: { setProperty: (name, value) => styles.set(name, value) },
      getBoundingClientRect: () => ({ left: 100, top: 100, width: 300, height: 240 }),
      querySelector: () => ({ offsetWidth: 120, offsetHeight: 32 }),
      addEventListener: (name, listener) => listeners.set(name, listener),
      fire(name, clientX = 160, clientY = 140) {
        listeners.get(name)?.({ pointerType: 'mouse', clientX, clientY });
      },
    };
  });
  vm.runInNewContext(source, {
    document: { querySelectorAll: () => cards },
    matchMedia: query => ({ matches: !query.includes('reduced-motion') }),
    requestAnimationFrame: callback => frames.push(callback),
  });
  return { cards, frames, flush: () => { while (frames.length) frames.shift()(); } };
}

test('both card types position the pill before revealing it on pointer entry', () => {
  const { cards, frames } = fixture();
  for (const card of cards) {
    card.fire('pointerenter');
    assert.deepEqual(card.activations[0], ['72px', '52px']);
    assert.equal(card.classes.has('card-pointer-active'), true);
    assert.equal(frames.length, 0, 'entry must not wait for a later animation frame');
    card.fire('pointerleave');
  }
});

test('leaving preserves the fade-out position and prevents a queued move from revealing the pill again', () => {
  const { cards: [card], flush } = fixture();
  card.fire('pointerenter');
  card.fire('pointermove', 300, 250);
  card.fire('pointerleave');
  flush();
  assert.equal(card.classes.has('card-pointer-active'), false);
  assert.equal(card.classes.has('card-pointer-enabled'), true);
  assert.equal(card.styles.get('--cta-x'), '72px');
  assert.equal(card.styles.get('--cta-y'), '52px');
  assert.equal(card.activations.length, 1);
});
