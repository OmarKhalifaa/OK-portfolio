import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { load } from 'cheerio';
import { injectAnalytics } from '../scripts/analytics.mjs';

const source = await fs.readFile(new URL('../js/analytics.js', import.meta.url), 'utf8');
const production = 'https://omarkhalifaa.com';
const productionHostname = new URL(production).hostname;
const measurementId = 'G-TEST12345';
const consentKey = 'portfolio.analytics-consent.v1';

function fixture({ url = `${production}/projects/login-revamp/?email=private@example.com#private`, project = 'login-revamp', config = { measurementId, hostname: productionHostname }, stored = null, referrer = '', storageFails = false, visible = true, focused = true, cookie = '' } = {}) {
  let time = 1800000000000;
  let sequence = 0;
  let currentCookie = cookie;
  const timers = new Map();
  const nodes = [];
  const documentListeners = new Map();
  const windowListeners = new Map();
  const cookieWrites = [];
  const storage = new Map(stored ? [[consentKey, typeof stored === 'string' ? stored : JSON.stringify(stored)]] : []);
  class Element {
    constructor(tag) {
      this.tagName = tag.toUpperCase();
      this.children = [];
      this.attrs = new Map();
      this.listeners = new Map();
      this.parentElement = null;
      this.dataset = {};
      this.hidden = false;
      nodes.push(this);
    }
    setAttribute(name, value) { this.attrs.set(name, String(value)); }
    getAttribute(name) { return this.attrs.get(name) ?? null; }
    append(...children) { children.forEach(child => { child.parentElement = this; this.children.push(child); }); }
    addEventListener(name, callback) { this.listeners.set(name, callback); }
    focus() { this.focused = true; }
    closest(selector) {
      if ((selector === 'a[href]' && this.tagName === 'A' && this.attrs.has('href'))
        || this.tagName.toLowerCase() === selector || (selector.startsWith('#') && this.id === selector.slice(1))) return this;
      return this.parentElement?.closest(selector) || null;
    }
    click() { this.listeners.get('click')?.({ target: this, defaultPrevented: false }); }
  }
  const head = new Element('head');
  const body = new Element('body');
  body.dataset.project = project;
  const configNode = config === null ? null : { textContent: typeof config === 'string' ? config : JSON.stringify(config) };
  const document = {
    head, body,
    referrer,
    visibilityState: visible ? 'visible' : 'hidden',
    hasFocus: () => focused,
    getElementById: id => id === 'portfolio-analytics-config' ? configNode : nodes.find(node => node.id === id),
    createElement: tag => new Element(tag),
    addEventListener: (name, callback) => documentListeners.set(name, callback),
    get cookie() { return currentCookie; },
    set cookie(value) { cookieWrites.push(value); currentCookie = currentCookie.split(';').filter(part => !part.trim().startsWith(`${value.split('=')[0]}=`)).join(';'); },
  };
  const window = {
    location: new URL(url),
    localStorage: {
      getItem(key) { if (storageFails) throw new Error('storage blocked'); return storage.get(key) || null; },
      setItem(key, value) { if (storageFails) throw new Error('storage blocked'); storage.set(key, value); },
    },
    addEventListener: (name, callback) => windowListeners.set(name, callback),
  };
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [time])); }
    static now() { return time; }
  }
  const context = {
    window, document, URL, Date: ClockDate,
    setTimeout(callback, duration) { const id = ++sequence; timers.set(id, { callback, at: time + duration }); return id; },
    clearTimeout: id => timers.delete(id),
  };
  vm.runInNewContext(source, context);
  const commands = () => Array.from(window.dataLayer || [], command => Array.from(command));
  return {
    window, document, nodes, head, body, storage, cookieWrites, context,
    notice: () => nodes.find(node => node.id === 'analytics-notice'),
    button: text => nodes.find(node => node.tagName === 'BUTTON' && node.textContent === text),
    scripts: () => head.children.filter(node => node.tagName === 'SCRIPT'),
    commands,
    events: () => commands().filter(command => command[0] === 'event'),
    advance(duration) {
      const end = time + duration;
      while (true) {
        const next = [...timers.entries()].sort((a, b) => a[1].at - b[1].at)[0];
        if (!next || next[1].at > end) break;
        time = next[1].at;
        timers.delete(next[0]);
        next[1].callback();
      }
      time = end;
    },
    visibility(value) { document.visibilityState = value ? 'visible' : 'hidden'; documentListeners.get('visibilitychange')?.(); },
    focus(value) { focused = value; windowListeners.get(value ? 'focus' : 'blur')?.(); },
    clickLink(href, placement = 'div') {
      const parent = new Element(placement);
      const anchor = new Element('a');
      anchor.setAttribute('href', href);
      const child = new Element('span');
      parent.append(anchor);
      anchor.append(child);
      documentListeners.get('click')?.({ target: child, defaultPrevented: false });
    },
    crossTabConsent(value) { storage.set(consentKey, JSON.stringify({ choice: value, updatedAt: time })); windowListeners.get('storage')?.({ key: consentKey }); },
  };
}

test('build helper injects deferred first-party assets and JSON only on configured public pages', () => {
  const $ = load(`<html><head><link rel="canonical" href="${production}/projects/login-revamp/"></head><body></body></html>`);
  assert.equal(injectAnalytics($, { measurementId, canonicalUrl: production }), true);
  assert.equal($('script[src="/js/analytics.js"][defer]').length, 1);
  assert.equal($('link[href="/css/analytics.css"]').length, 1);
  assert.deepEqual(JSON.parse($('#portfolio-analytics-config').text()), { measurementId, hostname: productionHostname });
  injectAnalytics($, { measurementId, canonicalUrl: production });
  assert.equal($('#portfolio-analytics-config').length, 1);
  assert.equal(injectAnalytics($, { measurementId, canonicalUrl: production, preview: true }), false);
  assert.equal($('[data-portfolio-analytics]').length, 0);
});

test('build helper excludes admin, prototypes, unknown hosts and invalid configuration', () => {
  for (const pathname of ['/admin/', '/prototypes/in-app-search/', '/callback', '/analytics/', '/project.html']) {
    const $ = load(`<link rel="canonical" href="${production}${pathname}">`);
    assert.equal(injectAnalytics($, { measurementId, canonicalUrl: production }), false, pathname);
  }
  const $ = load(`<link rel="canonical" href="${production}/">`);
  for (const id of ['', 'UA-123', 'G-lowercase', 'G-TEST<script>', null]) assert.equal(injectAnalytics($, { measurementId: id, canonicalUrl: production }), false);
  for (const canonicalUrl of ['http://omarkhalifaa.com', 'https://localhost', 'https://127.0.0.1', 'invalid', 'https://example.com']) assert.equal(injectAnalytics($, { measurementId, canonicalUrl }), false);
});

test('runtime never loads tracking or consent UI on local, preview, admin or prototype routes', () => {
  for (const url of ['http://localhost:4173/', 'https://ok-portfolio.pages.dev/', 'https://ok-portfolio.pages.dev/projects/login-revamp/', 'https://preview.ok-portfolio.pages.dev/', `${production}:4173/`, `${production}/admin/`, `${production}/prototypes/in-app-search/`, `${production}/callback`, 'https://example.com/']) {
    const page = fixture({ url });
    assert.equal(page.scripts().length, 0, url);
    assert.equal(page.notice(), undefined, url);
  }
  for (const config of [null, 'null', '42', '{broken', { measurementId: 'G-invalid', hostname: productionHostname }]) {
    assert.equal(fixture({ config }).notice(), undefined);
  }
});

test('no Google commands or script until consent; decline and close persist rejection', () => {
  const page = fixture();
  assert.equal(page.notice().hidden, false);
  assert.equal(page.scripts().length, 0);
  assert.equal(page.commands().length, 0);
  page.clickLink('mailto:private@example.com');
  page.advance(60000);
  assert.equal(page.events().length, 0);
  page.button('Decline').click();
  assert.equal(page.notice().hidden, true);
  assert.equal(JSON.parse(page.storage.get(consentKey)).choice, 'declined');
  assert.equal(page.scripts().length, 0);
  page.button('Analytics settings').click();
  assert.equal(page.notice().hidden, false);
  assert.equal(page.button('Decline').focused, true);
  page.button('\u00d7').click();
  assert.equal(page.notice().hidden, true);
  assert.equal(page.scripts().length, 0);
});

test('accept configures GA without advertising and sends one clean page/project view', () => {
  const page = fixture({ referrer: 'https://www.google.com/search?q=private@example.com#secret' });
  page.button('Allow analytics').click();
  assert.equal(page.scripts().length, 1);
  assert.equal(page.scripts()[0].src, `https://www.googletagmanager.com/gtag/js?id=${measurementId}`);
  assert.equal(page.scripts()[0].async, true);
  assert.equal(page.scripts()[0].referrerPolicy, 'origin');
  const commands = page.commands();
  assert.deepEqual(Array.from(commands[0].slice(0, 2)), ['consent', 'default']);
  assert.equal(commands[0][2].analytics_storage, 'denied');
  assert.equal(commands[1][2].analytics_storage, 'granted');
  assert.equal(commands[1][2].ad_storage, 'denied');
  const config = commands.find(command => command[0] === 'config')[2];
  assert.equal(config.send_page_view, false);
  assert.equal(config.allow_google_signals, false);
  assert.equal(config.allow_ad_personalization_signals, false);
  assert.equal(config.page_location, `${production}/projects/login-revamp/`);
  assert.equal(config.page_referrer, 'https://www.google.com/');
  const context = commands.find(command => command[0] === 'set')[1];
  assert.equal(context.page_type, 'project');
  assert.equal(context.project_slug, 'login-revamp');
  assert.equal(context.page_location, `${production}/projects/login-revamp/`);
  assert.equal(context.page_referrer, 'https://www.google.com/');
  assert.deepEqual(page.events().map(command => command[1]), ['page_view', 'project_view']);
  assert.equal(page.events()[1][2].project_slug, 'login-revamp');
  assert.equal(page.events()[1][2].page_type, 'project');
  page.button('Analytics settings').click();
  page.button('Allow analytics').click();
  assert.equal(page.scripts().length, 1);
  assert.equal(page.events().length, 2);
});

test('project engagement counts only accepted, visible, focused time and fires once', () => {
  const page = fixture();
  page.advance(120000);
  page.button('Allow analytics').click();
  page.advance(10000);
  page.visibility(false);
  page.advance(60000);
  assert.equal(page.events().filter(command => command[1] === 'project_engaged').length, 0);
  page.visibility(true);
  page.advance(10000);
  page.focus(false);
  page.advance(60000);
  page.focus(true);
  page.advance(9999);
  assert.equal(page.events().filter(command => command[1] === 'project_engaged').length, 0);
  page.advance(1);
  const events = page.events().filter(command => command[1] === 'project_engaged');
  assert.equal(events.length, 1);
  assert.equal(events[0][2].active_time_msec, 30000);
  assert.equal(events[0][2].engagement_time_msec, undefined);
  page.advance(120000);
  assert.equal(page.events().filter(command => command[1] === 'project_engaged').length, 1);
});

test('contact and LinkedIn events contain placement/context without href, email or personal query content', () => {
  const page = fixture();
  page.button('Allow analytics').click();
  page.clickLink('mailto:private@example.com?subject=secret', 'footer');
  page.clickLink('https://www.linkedin.com/in/private-person/?private=secret', 'nav');
  page.clickLink('https://linkedin.com.evil.test/in/private-person/');
  page.clickLink('https://drive.google.com/private-resume');
  const interactions = page.events().filter(command => ['contact_click', 'social_click'].includes(command[1]));
  assert.equal(interactions.length, 2);
  assert.equal(interactions[0][2].contact_method, 'email');
  assert.equal(interactions[0][2].link_placement, 'footer');
  assert.equal(interactions[1][2].social_platform, 'linkedin');
  assert.equal(interactions[1][2].link_placement, 'navigation');
  assert.equal(interactions[0][2].project_slug, 'login-revamp');
  assert.doesNotMatch(JSON.stringify(page.commands()), /private|secret|subject|href|link_url/);
});

test('revocation disables future events, clears GA cookies, and synchronizes rejection from another tab', () => {
  const page = fixture({ cookie: '_ga=123; _ga_TEST12345=456; theme=dark' });
  page.button('Allow analytics').click();
  page.advance(10000);
  page.button('Analytics settings').click();
  page.button('Decline').click();
  assert.equal(page.window[`ga-disable-${measurementId}`], true);
  assert.ok(page.cookieWrites.some(value => value.startsWith('_ga=; Max-Age=0;')));
  assert.ok(page.cookieWrites.some(value => value.startsWith('_ga_TEST12345=; Max-Age=0;')));
  assert.ok(page.cookieWrites.every(value => !value.startsWith('theme=')));
  const count = page.events().length;
  page.clickLink('mailto:private@example.com');
  page.advance(60000);
  assert.equal(page.events().length, count);
  page.button('Analytics settings').click();
  page.button('Allow analytics').click();
  assert.equal(page.window[`ga-disable-${measurementId}`], false);
  assert.equal(page.scripts().length, 1);
  page.crossTabConsent('declined');
  page.clickLink('https://linkedin.com/in/person');
  assert.equal(page.window[`ga-disable-${measurementId}`], true);
  assert.equal(page.events().length, count);
});

test('saved consent is validated; storage failure keeps a usable session choice', () => {
  const updatedAt = 1800000000000;
  const saved = fixture({ stored: { choice: 'accepted', updatedAt } });
  assert.equal(saved.notice().hidden, true);
  assert.equal(saved.scripts().length, 1);
  const declined = fixture({ stored: { choice: 'declined', updatedAt } });
  assert.equal(declined.notice().hidden, true);
  assert.equal(declined.scripts().length, 0);
  for (const stored of ['broken', { choice: 'accepted', updatedAt: 'now' }, { choice: 'accepted', updatedAt: updatedAt + 10000 }, { choice: 'accepted', updatedAt: updatedAt - 181 * 86400000 }]) {
    const page = fixture({ stored });
    assert.equal(page.notice().hidden, false);
    assert.equal(page.scripts().length, 0);
  }
  const blocked = fixture({ storageFails: true });
  blocked.button('Allow analytics').click();
  assert.equal(blocked.scripts().length, 1);
  blocked.button('Analytics settings').click();
  blocked.button('Decline').click();
  assert.equal(blocked.window[`ga-disable-${measurementId}`], true);
});

test('non-project pages send page type without project events; safe internal referrer and invalid referrer handling', () => {
  const page = fixture({ url: `${production}/about/?private=secret#secret`, project: undefined, referrer: `${production}/projects/login-revamp/?private=secret#secret` });
  page.button('Allow analytics').click();
  page.advance(60000);
  assert.deepEqual(page.events().map(command => command[1]), ['page_view']);
  assert.equal(page.events()[0][2].page_type, 'about');
  assert.equal(page.events()[0][2].project_slug, undefined);
  const context = page.commands().find(command => command[0] === 'set')[1];
  assert.equal(context.page_type, 'about');
  assert.equal(context.project_slug, undefined);
  assert.equal(page.events()[0][2].page_referrer, `${production}/projects/login-revamp/`);
  for (const referrer of ['invalid', 'mailto:private@example.com', 'javascript:secret']) {
    const invalid = fixture({ referrer });
    invalid.button('Allow analytics').click();
    assert.equal(invalid.events()[0][2].page_referrer, '');
  }
});

test('campaign attribution preserves only safe allowlisted source/medium/name fields after consent', () => {
  const url = `${production}/?utm_source=LinkedIn&utm_medium=social&utm_campaign=portfolio_2026-fall&utm_content=private@example.com&utm_term=secret&gclid=private-id&email=private@example.com#secret`;
  const page = fixture({ url });
  assert.equal(page.commands().length, 0);
  page.button('Allow analytics').click();
  const config = page.commands().find(command => command[0] === 'config')[2];
  assert.equal(config.campaign_source, 'LinkedIn');
  assert.equal(config.campaign_medium, 'social');
  assert.equal(config.campaign_name, 'portfolio_2026-fall');
  assert.equal(config.page_location, `${production}/`);
  assert.doesNotMatch(JSON.stringify(page.commands()), /private|secret|gclid|utm_content|utm_term|email=/);
});

test('campaign fields reject email, URL, whitespace, encoded delimiters and excessive values', () => {
  for (const value of ['private@example.com', 'https://private.example.com/', 'private person', 'private%40example.com', 'a'.repeat(81), 'cairo+person', '<private>', 'person\nprivate']) {
    const query = new URLSearchParams({ utm_source: value, utm_medium: value, utm_campaign: value });
    const page = fixture({ url: `${production}/?${query}` });
    page.button('Allow analytics').click();
    const config = page.commands().find(command => command[0] === 'config')[2];
    assert.equal(config.campaign_source, undefined, value);
    assert.equal(config.campaign_medium, undefined, value);
    assert.equal(config.campaign_name, undefined, value);
    assert.equal(config.page_location, `${production}/`);
    assert.doesNotMatch(JSON.stringify(page.commands()), /private|utm_source|utm_medium|utm_campaign/);
  }
});
