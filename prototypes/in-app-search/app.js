import { services, products, merchants, suggestionsFor, resultsFor, countsFor, normalize } from './model.js';

const $ = selector => document.querySelector(selector);
const input = $('#searchInput');
const content = $('#screenContent');
const tabs = $('#tabs');
const phone = $('#phone');
const keyboard = $('#keyboard');
const overlay = $('#screenOverlay');
const tabNames = ['All', 'Services', 'Entertainment', 'Shop', 'Gaming', 'Merchants'];
const initialHistory = ['Transfer', 'Bill', 'Deposit', 'Withdrawal', 'Balance Inquiry'];
const state = { mode: 'landing', query: '', tab: 'All', history: [...initialHistory], removed: new Set(), alphabetical: false, instant: false, offers: false, comparison: null, shifted: false };
let sheetReturnFocus;
let previousScreen;
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const asset = (file, extra = '') => `<img src="assets/${escape(file)}" alt="" ${extra}>`;
const announce = message => { $('#announcement').textContent = message; };

function currentResults() {
  const source = resultsFor(state.query);
  const result = { ...source, promotions: [] };
  if (state.instant) result.services = result.services.filter(item => ['balance', 'internet', 'mobile-internet', 'others'].includes(item.id));
  if (state.offers) result.products = result.products.filter(item => item.oldPrice);
  if (state.alphabetical) {
    result.services = [...result.services].sort((a, b) => a.title.localeCompare(b.title));
    result.products = [...result.products].sort((a, b) => a.title.localeCompare(b.title));
  }
  // Seller counts follow the product cards remaining after a filter.
  if (state.offers) {
    const sellerIds = new Set(result.products.flatMap(item => item.merchants));
    result.merchants = source.merchants.filter(item => sellerIds.has(item.id));
  }
  return result;
}

function chip(label, icon, query = label) {
  return `<button class="chip" type="button" data-query="${escape(query)}">${asset(icon)}${escape(label)}</button>`;
}
function landingMarkup() {
  const categories = [
    ['Phones', 'baa50.png', '', 'Mobile'], ['Recharge Balance', 'ae2c0.png', 'wallet', 'Recharge'],
    ['Chargers', 'de7ac.png', 'charger', 'Chargers'], ['Internet', 'dc346.png', '', 'Mobile internet'], ['Routers', '7be09.png', 'router', 'Recharge DSL'],
  ];
  return `<div class="landing">
    <section class="landing-block" aria-labelledby="recentTitle">
      <div class="section-heading"><h2 id="recentTitle">Recent Searches</h2>${state.history.length ? '<button class="clear-recent" type="button" data-action="clear-history">Clear</button>' : ''}</div>
      <div class="chip-group">${state.history.length ? state.history.map(label => chip(label, 'bb66d.svg')).join('') : '<p class="no-history">Your recent searches will appear here.</p>'}</div>
    </section>
    <section class="landing-block" aria-labelledby="categoryTitle">
      <div class="section-heading"><h2 id="categoryTitle">What are you looking for?</h2></div>
      <div class="categories">${categories.map(([label, image, style, query]) => `<button class="category" type="button" data-query="${escape(query)}"><span class="category-art ${style}">${asset(image)}</span><span>${escape(label)}</span></button>`).join('')}</div>
    </section>
    <section class="landing-block" aria-labelledby="trendingTitle">
      <div class="section-heading"><h2 id="trendingTitle">Trending</h2></div>
      <div class="chip-group">${[['Recharge', 'Recharge'], ['DSL', 'Recharge DSL'], ['Money', 'Money'], ['Withdrawal', 'Withdrawal'], ['Cash', 'Cash']].map(([label, query]) => chip(label, 'trending-chart.png', query)).join('')}</div>
    </section>
  </div>`;
}

function boldMatch(label) {
  const at = label.toLowerCase().indexOf(state.query.toLowerCase().trim());
  if (at < 0) return escape(label);
  const end = at + state.query.trim().length;
  return `${escape(label.slice(0, at))}<strong>${escape(label.slice(at, end))}</strong>${escape(label.slice(end))}`;
}
function suggestionsMarkup() {
  const list = suggestionsFor(state.query).filter(label => !state.removed.has(label));
  input.setAttribute('aria-expanded', String(list.length > 0));
  const rows = list.map((label, index) => {
    const recent = normalize(state.query).startsWith('rech') && index < 2;
    return `<li class="suggestion-item"><button class="suggestion-main" type="button" data-submit-query="${escape(label)}">${asset(recent ? 'f5d30.svg' : 'c2a50.svg')}<span>${boldMatch(label)}</span></button><button class="suggestion-side" type="button" ${recent ? `data-remove-suggestion="${escape(label)}" aria-label="Remove ${escape(label)} from suggestions"` : `data-query="${escape(label)}" aria-label="Use ${escape(label)} in search"`}>${asset(recent ? 'c8c7b.svg' : '0afa7.svg')}</button></li>`;
  }).join('');
  return `<p class="suggestion-summary">${list.length} suggestion${list.length === 1 ? '' : 's'}</p><ul class="suggestion-list" aria-label="Search suggestions">${rows}</ul>${list.length ? '' : '<p class="typing-empty">Search to see matching results.</p>'}`;
}

function heading(label, count, target, preview = false) {
  return `<div class="section-heading"><h2>${escape(label)}<span class="heading-count">${count}</span></h2>${preview && target ? `<button class="see-all" type="button" data-tab="${target}" aria-label="See all ${count} ${escape(label.toLowerCase())} results">See all</button>` : ''}</div>`;
}
function serviceMarkup(item) {
  return `<button class="service-card" type="button" data-service="${item.id}"><span class="service-icon">${asset(item.icon)}</span><span class="service-title">${escape(item.title)}${item.description ? `<span class="service-description">${escape(item.description)}</span>` : ''}</span>${asset('580fc.svg')}</button>`;
}
function merchantLogos(ids) {
  return `<span class="merchant-logos">${ids.map(id => asset(merchants.find(item => item.id === id).logo)).join('')}</span>`;
}
function productMarkup(item) {
  return `<button class="product-card" type="button" data-product="${item.id}" aria-label="${escape(item.title)}, from ${escape(item.price)}, ${item.stores} ${item.stores === 1 ? 'store' : 'stores'}">
    <span class="product-image">${item.tag ? `<span class="tag ${item.tagType}">${escape(item.tag)}</span>` : ''}<span class="device-image ${item.crop ? 'crop' : ''}">${asset(item.image)}</span></span>
    <span class="product-title">${escape(item.title)}</span><span class="from">From</span><span class="product-price">${escape(item.price)}${item.oldPrice ? `<span class="old-price">${escape(item.oldPrice)}</span>` : ''}</span>
    <span class="merchant-summary">${merchantLogos(item.merchants)}<span class="${item.storeLabel ? 'store-name' : 'store-count'}">${item.storeLabel || `in ${item.stores} stores`}</span></span>
  </button>`;
}
function merchantMarkup(item) {
  return `<div class="merchant-card">${asset(item.logo)}<span class="merchant-info"><strong>${escape(item.name)}</strong></span></div>`;
}
function filtersMarkup() {
  return `<div class="filters" aria-label="Result filters"><button class="filter-chip ${state.alphabetical ? 'selected' : ''}" type="button" data-action="sort" aria-pressed="${state.alphabetical}">Sort by ${asset('5335a.svg')}</button><button class="filter-chip" type="button" data-action="filters">${state.tab === 'Shop' ? 'Product type' : 'Service type'} ${asset('5d338.svg')}</button>${state.tab !== 'Shop' ? `<button class="filter-chip ${state.instant ? 'selected' : ''}" type="button" data-action="instant" aria-pressed="${state.instant}">Instant Activation</button>` : ''}<button class="filter-chip filter-main" type="button" data-action="filters">${asset('ef467.svg')} Filter${state.offers || state.instant ? ' 1' : ''}</button></div>`;
}
function emptyMarkup() {
  const category = state.tab === 'All' ? '' : ` in ${state.tab.toLowerCase()}`;
  return `<section class="empty-state">${asset('e1339.png')}<h2>No results for “${escape(state.query)}”${category}</h2><p>Try using different keywords or checking another category.</p></section>`;
}
function resultsMarkup() {
  const r = currentResults();
  const count = countsFor(r);
  if (!count[state.tab]) return emptyMarkup();
  let markup = state.tab === 'Services' || state.tab === 'Shop' ? filtersMarkup() : '';
  if ((state.tab === 'All' || state.tab === 'Services') && r.services.length) {
    const list = state.tab === 'All' ? (normalize(state.query) === 'recharge' ? r.services.filter(item => ['dsl', 'balance', 'cash'].includes(item.id)) : r.services.slice(0, 4)) : r.services;
    markup += `<section class="result-section">${heading('Services', r.services.length, 'Services', state.tab === 'All')}<div class="services-list">${list.map(serviceMarkup).join('')}</div></section>`;
  }
  if ((state.tab === 'All' || state.tab === 'Shop') && r.products.length) markup += `<section class="result-section">${heading('Shop', r.products.length, 'Shop', state.tab === 'All')}<div class="products">${r.products.map(productMarkup).join('')}</div></section>`;
  if (state.tab === 'Merchants' && r.merchants.length) markup += `<section class="result-section">${heading('Merchants', r.merchants.length)}<div class="merchant-list">${r.merchants.map(merchantMarkup).join('')}</div></section>`;
  return markup;
}
function comparisonMarkup() {
  const product = products.find(item => item.id === state.comparison);
  const list = merchants.filter(item => product.merchants.includes(item.id));
  return `<section class="result-section">${asset(product.image, 'class="comparison-image"')}<p class="comparison-title">${escape(product.title)}</p><div class="comparison-price"><span class="from">From</span><span class="product-price">${escape(product.price)}</span></div>${heading('Available at', list.length)}<div class="merchant-list">${list.map(merchantMarkup).join('')}</div></section>`;
}

function render() {
  phone.dataset.screen = state.mode;
  if (input.value !== state.query) input.value = state.query;
  $('#clearQuery').hidden = !state.query;
  $('#searchActions').hidden = Boolean(state.query);
  $('#back').setAttribute('aria-label', state.mode === 'comparison' ? 'Back to search results' : 'Back to search home');
  tabs.hidden = state.mode !== 'results';
  keyboard.hidden = state.mode !== 'suggestions';
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-autocomplete', state.mode === 'suggestions' ? 'list' : 'none');
  if (state.mode === 'results') {
    tabs.innerHTML = tabNames.map(name => `<button class="tab" id="tab-${name.toLowerCase()}" type="button" role="tab" aria-selected="${name === state.tab}" aria-controls="screenContent" tabindex="${name === state.tab ? 0 : -1}" data-tab="${name}">${name}</button>`).join('');
    content.setAttribute('role', 'tabpanel');
    content.setAttribute('aria-labelledby', `tab-${state.tab.toLowerCase()}`);
    content.innerHTML = resultsMarkup();
  } else {
    content.removeAttribute('role');
    content.removeAttribute('aria-labelledby');
    content.innerHTML = state.mode === 'landing' ? landingMarkup() : state.mode === 'comparison' ? comparisonMarkup() : suggestionsMarkup();
  }
}

function startQuery(query, submit = false) {
  closeSheet(false);
  state.query = query;
  state.mode = query.trim() ? 'suggestions' : 'landing';
  state.removed.clear();
  state.instant = state.offers = state.alphabetical = false;
  render();
  content.scrollTop = 0;
  if (submit) submitSearch();
  else { input.focus({ preventScroll: true }); input.setSelectionRange(query.length, query.length); }
}
function submitSearch() {
  const query = input.value.trim();
  if (!query) { reset(false); return; }
  state.query = query;
  state.mode = 'results';
  state.tab = 'All';
  state.comparison = null;
  state.history = [query, ...state.history.filter(item => normalize(item) !== normalize(query))].slice(0, 5);
  input.blur();
  render();
  content.scrollTop = 0;
  announce(`${countsFor(currentResults()).All} results for ${query}`);
}
function setTab(name, focus = false) {
  state.tab = name;
  state.mode = 'results';
  state.instant = state.offers = false;
  render();
  content.scrollTop = 0;
  const tab = tabs.querySelector(`[data-tab="${name}"]`);
  if (focus) tab.focus({ preventScroll: true });
  tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  announce(`${countsFor(currentResults())[name]} ${name.toLowerCase()} results`);
}
function reset(restoreHistory = true) {
  closeSheet(false);
  Object.assign(state, { mode: 'landing', query: '', tab: 'All', alphabetical: false, instant: false, offers: false, comparison: null, shifted: false });
  state.removed.clear();
  if (restoreHistory) state.history = [...initialHistory];
  input.blur();
  render();
  renderKeyboard();
  content.scrollTop = 0;
  announce('Search reset');
}
function back() {
  if (!overlay.hidden) { closeSheet(); return; }
  if (state.mode === 'comparison') {
    const returningProduct = state.comparison;
    Object.assign(state, previousScreen || { mode: 'results', tab: 'Shop' });
    state.comparison = null;
    render();
    content.querySelector(`[data-product="${returningProduct}"]`)?.focus({ preventScroll: true });
    return;
  }
  reset(false);
}

function openSheet(title, markup) {
  sheetReturnFocus = document.activeElement;
  overlay.innerHTML = `<section class="detail-sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle"><button class="sheet-close" type="button" data-action="close-sheet" aria-label="Close">${asset('294ba.svg')}</button><h2 id="sheetTitle">${escape(title)}</h2>${markup}</section>`;
  overlay.hidden = false;
  overlay.querySelector('.sheet-close').focus({ preventScroll: true });
}
function closeSheet(restoreFocus = true) {
  if (overlay.hidden) return;
  overlay.hidden = true;
  overlay.innerHTML = '';
  if (restoreFocus && sheetReturnFocus?.isConnected) sheetReturnFocus.focus({ preventScroll: true });
}
function openFilters() {
  openSheet('Filter results', `<div class="filter-options"><label><input id="filterInstant" type="checkbox" ${state.instant ? 'checked' : ''}>Instant activation</label><label><input id="filterOffers" type="checkbox" ${state.offers ? 'checked' : ''}>Products with offers</label></div><button class="primary-action" type="button" data-action="apply-filters">Show results</button>`);
}
function inspectService(id) {
  const item = [...services, ...resultsFor('Mobile').services].find(service => service.id === id);
  if (!item) return;
  openSheet(item.title, `<span class="service-icon">${asset(item.icon)}</span><p>${item.description ? escape(item.description) : 'Your selected service'}</p><button class="primary-action" type="button" data-action="close-sheet">Back to results</button>`);
}
function inspectProduct(id) {
  previousScreen = { mode: state.mode, tab: state.tab };
  state.comparison = id;
  state.mode = 'comparison';
  render();
  content.scrollTop = 0;
  $('#back').focus({ preventScroll: true });
  announce('Compare available stores');
}

function renderKeyboard() {
  const key = letter => `<button class="key" type="button" data-key="${escape(letter)}" aria-label="${escape(letter === 'erase' ? 'Delete last character' : letter === 'shift' ? 'Toggle uppercase' : letter)}">${letter === 'erase' ? '⌫' : letter === 'shift' ? '⇧' : state.shifted ? letter.toUpperCase() : letter}</button>`;
  keyboard.innerHTML = `<div class="predictive" aria-hidden="true"><span>“The”</span><span>the</span><span>to</span></div><div class="key-row">${[...'qwertyuiop'].map(key).join('')}</div><div class="key-row">${[...'asdfghjkl'].map(key).join('')}</div><div class="key-row">${key('shift')}${[...'zxcvbnm'].map(key).join('')}${key('erase')}</div><div class="key-row bottom"><button class="key abc" type="button" data-key="numbers">123</button><button class="key space" type="button" data-key="space">space</button><button class="key search" type="button" data-key="search">Search</button></div><div class="keyboard-symbols" aria-hidden="true">${asset('4151b.svg')}${asset('c0d9c.svg')}</div>`;
  keyboard.querySelector('[data-key="shift"]').classList.add('shift');
  keyboard.querySelector('[data-key="erase"]').classList.add('erase');
}
function typeKey(key) {
  if (key === 'search') { submitSearch(); return; }
  if (key === 'shift') { state.shifted = !state.shifted; renderKeyboard(); return; }
  if (key === 'numbers') {
    keyboard.querySelectorAll('.key-row')[0].innerHTML = [...'1234567890'].map(n => `<button class="key" type="button" data-key="${n}">${n}</button>`).join('');
    const button = keyboard.querySelector('[data-key="numbers"]'); button.dataset.key = 'letters'; button.textContent = 'ABC'; return;
  }
  if (key === 'letters') { renderKeyboard(); return; }
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  const left = input.value.slice(0, start);
  const right = input.value.slice(end);
  const insertion = key === 'space' ? ' ' : state.shifted ? key.toUpperCase() : key;
  const value = key === 'erase' ? (start === end ? left.slice(0, -1) : left) + right : left + insertion + right;
  const caret = key === 'erase' ? Math.max(0, start - (start === end ? 1 : 0)) : start + insertion.length;
  state.query = value;
  state.mode = value ? 'suggestions' : 'landing';
  render();
  input.focus({ preventScroll: true });
  input.setSelectionRange(caret, caret);
}

$('#searchForm').addEventListener('submit', event => { event.preventDefault(); closeSheet(false); submitSearch(); });
input.addEventListener('input', () => {
  state.query = input.value;
  state.mode = state.query.trim() ? 'suggestions' : 'landing';
  state.removed.clear();
  state.instant = state.offers = false;
  render();
});
input.addEventListener('focus', () => { if (state.query && state.mode !== 'suggestions') { state.mode = 'suggestions'; render(); } });
input.addEventListener('keydown', event => {
  if (event.key === 'Escape') { event.preventDefault(); back(); }
  if (event.key === 'ArrowDown' && state.mode === 'suggestions') { const suggestion = content.querySelector('.suggestion-main'); if (suggestion) { event.preventDefault(); suggestion.focus(); } }
});
$('#clearQuery').addEventListener('click', () => startQuery(''));
$('#back').addEventListener('click', back);
document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  const d = button.dataset;
  if (d.query !== undefined) startQuery(d.query);
  else if (d.submitQuery !== undefined) startQuery(d.submitQuery, true);
  else if (d.tab) setTab(d.tab, true);
  else if (d.key) typeKey(d.key);
  else if (d.removeSuggestion) { state.removed.add(d.removeSuggestion); render(); input.focus({ preventScroll: true }); announce('Suggestion removed'); }
  else if (d.service) inspectService(d.service);
  else if (d.product) inspectProduct(d.product);
  else if (d.action === 'clear-history') { state.history = []; render(); announce('Recent searches cleared'); }
  else if (d.action === 'sort') { state.alphabetical = !state.alphabetical; render(); announce(state.alphabetical ? 'Sorted alphabetically' : 'Sorted by relevance'); }
  else if (d.action === 'instant') { state.instant = !state.instant; render(); announce(`${countsFor(currentResults())[state.tab]} results`); }
  else if (d.action === 'filters') openFilters();
  else if (d.action === 'close-sheet') closeSheet();
  else if (d.action === 'apply-filters') {
    state.instant = $('#filterInstant').checked;
    state.offers = $('#filterOffers').checked;
    closeSheet(false);
    render();
    announce(`${countsFor(currentResults())[state.tab]} results after filtering`);
    content.focus({ preventScroll: true });
  }
});
keyboard.addEventListener('pointerdown', event => { if (event.target.closest('button')) event.preventDefault(); });
tabs.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const position = tabNames.indexOf(state.tab);
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabNames.length - 1 : (position + (event.key === 'ArrowRight' ? 1 : -1) + tabNames.length) % tabNames.length;
  setTab(tabNames[next], true);
});
overlay.addEventListener('click', event => { if (event.target === overlay) closeSheet(); });
document.addEventListener('keydown', event => {
  if (overlay.hidden) return;
  if (event.key === 'Escape') { event.preventDefault(); closeSheet(); }
  if (event.key === 'Tab') {
    const controls = [...overlay.querySelectorAll('button, input, [tabindex="0"]')];
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
window.addEventListener('message', event => {
  if (event.source !== window.parent || event.origin !== window.location.origin) return;
  if (event.data?.type === 'in-app-search:reset') reset();
  if (event.data?.type === 'in-app-search:query' && typeof event.data.query === 'string') startQuery(event.data.query.slice(0, 100), Boolean(event.data.submit));
  if (event.data?.type === 'in-app-search:theme' && ['light', 'dark'].includes(event.data.theme)) setStageTheme(event.data.theme);
});
function fitPhone() {
  const stage = $('.stage');
  const style = getComputedStyle(stage);
  const verticalSpace = innerHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  const horizontalSpace = innerWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  document.documentElement.style.setProperty('--scale', Math.max(0, Math.min(1, horizontalSpace / 375, verticalSpace / 812)).toFixed(4));
}
window.addEventListener('resize', fitPhone);
function setStageTheme(theme) { document.documentElement.dataset.theme = theme === 'light' ? 'light' : 'dark'; }
if (window.parent === window) document.documentElement.dataset.standalone = 'true';
const themeParameter = new URLSearchParams(location.search).get('theme');
try {
  const parentRoot = window.parent.document.documentElement;
  setStageTheme(themeParameter || parentRoot.dataset.theme);
  if (!themeParameter && window.parent !== window) new MutationObserver(() => setStageTheme(parentRoot.dataset.theme)).observe(parentRoot, { attributes: true, attributeFilter: ['data-theme'] });
} catch { setStageTheme(themeParameter); }
document.fonts?.ready.then(fitPhone);
renderKeyboard();
render();
fitPhone();
const initialQuery = new URLSearchParams(location.search).get('query');
if (initialQuery) startQuery(initialQuery.slice(0, 100), new URLSearchParams(location.search).get('results') === '1');
