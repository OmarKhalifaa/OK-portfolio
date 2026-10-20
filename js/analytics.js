/* Basic consent mode: no Google tag or measurement request before acceptance. */
(() => {
  'use strict';
  const configNode = document.getElementById('portfolio-analytics-config');
  if (!configNode || window.__portfolioAnalytics) return;
  let config;
  try { config = JSON.parse(configNode.textContent); } catch { return; }
  if (!config || typeof config !== 'object') return;
  const publicPath = /^(?:\/|\/index\.html|\/about\/(?:index\.html)?|\/projects\/(?:index\.html|[a-z0-9]+(?:-[a-z0-9]+)*\/(?:index\.html)?)?)$/;
  const location = window.location;
  if (!/^G-[A-Z0-9]+$/.test(config.measurementId || '') || location.protocol !== 'https:'
    || location.hostname !== config.hostname || location.port || !publicPath.test(location.pathname)
    || /^(?:localhost|127\.|0\.|\[)/i.test(location.hostname) || !location.hostname.includes('.')) return;
  window.__portfolioAnalytics = true;

  const measurementId = config.measurementId;
  const consentKey = 'portfolio.analytics-consent.v1';
  const consentLifetime = 180 * 24 * 60 * 60 * 1000;
  const engagementThreshold = 30000;
  const projectMatch = location.pathname.match(/^\/projects\/([a-z0-9]+(?:-[a-z0-9]+)*)\/(?:index\.html)?$/);
  const projectSlug = projectMatch && document.body.dataset.project === projectMatch[1] ? projectMatch[1] : '';
  const pageType = projectSlug ? 'project' : location.pathname.startsWith('/about/') ? 'about'
    : location.pathname.startsWith('/projects/') ? 'projects' : 'home';
  const disableKey = `ga-disable-${measurementId}`;
  const deniedConsent = { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' };
  let choice = null;
  let tagStarted = false;
  let pageSent = false;
  let engagedSent = false;
  let activeSince = null;
  let activeMilliseconds = 0;
  let engagementTimer = null;
  window[disableKey] = true;

  // Keep arbitrary query values and fragments out of analytics. External
  // referrers need only their origin for source reporting, never their paths.
  function safeUrl(value, referrer = false) {
    if (!value) return '';
    try {
      const url = new URL(value);
      if (!/^https?:$/.test(url.protocol)) return '';
      const pathname = !referrer || (url.origin === location.origin && publicPath.test(url.pathname)) ? url.pathname : '/';
      return `${url.origin}${pathname}`;
    } catch { return ''; }
  }
  const pageLocation = safeUrl(location.href);
  const pageReferrer = safeUrl(document.referrer, true);
  const eventContext = () => ({ page_type: pageType, ...(projectSlug ? { project_slug: projectSlug } : {}), page_location: pageLocation, page_referrer: pageReferrer });
  const campaign = {};
  const query = new URL(location.href).searchParams;
  // Campaign attribution has its own narrow fields; arbitrary query values,
  // identifiers, search terms and email/URL-shaped values are never forwarded.
  for (const [parameter, field] of [['utm_source', 'campaign_source'], ['utm_medium', 'campaign_medium'], ['utm_campaign', 'campaign_name']]) {
    const value = query.get(parameter);
    if (value && /^[a-zA-Z0-9_-]{1,80}$/.test(value)) campaign[field] = value;
  }

  function readChoice() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(consentKey));
      if (!saved || !['accepted', 'declined'].includes(saved.choice) || typeof saved.updatedAt !== 'number') return null;
      const age = Date.now() - saved.updatedAt;
      return age >= 0 && age < consentLifetime ? saved.choice : null;
    } catch { return null; }
  }
  function saveChoice(value) {
    try { window.localStorage.setItem(consentKey, JSON.stringify({ choice: value, updatedAt: Date.now() })); } catch { /* Session-only choice when storage is unavailable. */ }
  }
  function clearAnalyticsCookies() {
    const names = document.cookie.split(';').map(cookie => cookie.trim().split('=')[0]).filter(name => /^_ga(?:_|$)|^_gid$|^_gat(?:_|$)/.test(name));
    const hostname = location.hostname.split('.');
    const domains = [null, ...hostname.slice(0, -1).map((_, index) => hostname.slice(index).join('.'))];
    for (const name of names) {
      for (const domain of domains) document.cookie = `${name}=; Max-Age=0; Path=/;${domain ? ` Domain=${domain};` : ''} SameSite=Lax; Secure`;
    }
  }
  function event(name, extra = {}) {
    if (choice !== 'accepted' || !tagStarted || window[disableKey]) return;
    window.gtag('event', name, { ...eventContext(), ...extra, send_to: measurementId });
  }
  function startTag() {
    window[disableKey] = false;
    if (tagStarted) {
      window.gtag('consent', 'update', { ...deniedConsent, analytics_storage: 'granted' });
      return;
    }
    tagStarted = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', deniedConsent);
    window.gtag('consent', 'update', { ...deniedConsent, analytics_storage: 'granted' });
    window.gtag('js', new Date());
    // Automatic GA session/engagement events inherit the same safe context.
    window.gtag('set', eventContext());
    window.gtag('config', measurementId, {
      ...campaign,
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: pageLocation,
      page_referrer: pageReferrer,
      cookie_path: '/',
      cookie_expires: 60 * 60 * 24 * 180,
      cookie_flags: 'SameSite=Lax;Secure',
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.referrerPolicy = 'origin';
    document.head.append(script);
  }

  function syncActivity() {
    if (engagementTimer !== null) clearTimeout(engagementTimer);
    engagementTimer = null;
    if (activeSince !== null) activeMilliseconds += Math.max(0, Date.now() - activeSince);
    activeSince = null;
    if (choice !== 'accepted' || !projectSlug || engagedSent) return;
    if (activeMilliseconds >= engagementThreshold) {
      engagedSent = true;
      event('project_engaged', { active_time_msec: activeMilliseconds });
      return;
    }
    if (document.visibilityState !== 'visible' || (document.hasFocus && !document.hasFocus())) return;
    activeSince = Date.now();
    engagementTimer = setTimeout(syncActivity, engagementThreshold - activeMilliseconds);
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }
  const notice = element('section', 'analytics-notice');
  notice.id = 'analytics-notice';
  notice.setAttribute('aria-labelledby', 'analytics-notice-title');
  notice.setAttribute('aria-describedby', 'analytics-notice-description');
  const title = element('h2', 'analytics-notice-title', 'Optional analytics');
  title.id = 'analytics-notice-title';
  const description = element('p', 'analytics-notice-description', 'Analytics cookies help me understand which projects people explore. Google Analytics receives page visits, engagement and contact clicks. You can decline or change your choice any time.');
  description.id = 'analytics-notice-description';
  const privacy = element('a', 'analytics-notice-privacy', 'Google privacy policy');
  privacy.href = 'https://policies.google.com/privacy';
  privacy.target = '_blank';
  privacy.rel = 'noopener noreferrer';
  const actions = element('div', 'analytics-notice-actions');
  const decline = element('button', 'analytics-choice', 'Decline');
  const accept = element('button', 'analytics-choice', 'Allow analytics');
  const close = element('button', 'analytics-notice-close', '\u00d7');
  decline.type = accept.type = close.type = 'button';
  close.setAttribute('aria-label', 'Decline analytics and close');
  actions.append(decline, accept);
  notice.append(title, description, privacy, actions, close);
  const settingsContainer = element('div', 'analytics-settings');
  const settings = element('button', 'analytics-settings-button', 'Analytics settings');
  settings.type = 'button';
  settings.setAttribute('aria-controls', notice.id);
  settingsContainer.append(settings);
  document.body.append(notice);
  if (pageType === 'about') document.getElementById('about-privacy-settings')?.append(settingsContainer);

  function hideNotice(restoreFocus = false) {
    notice.hidden = true;
    settings.setAttribute('aria-expanded', 'false');
    if (restoreFocus && settingsContainer.parentElement) settings.focus({ preventScroll: true });
  }
  function applyChoice(value, persist = false, restoreFocus = false) {
    choice = value;
    if (persist) saveChoice(value);
    hideNotice(restoreFocus);
    if (value === 'accepted') {
      startTag();
      if (!pageSent) {
        pageSent = true;
        event('page_view');
        if (projectSlug) event('project_view');
      }
    } else {
      window[disableKey] = true;
      if (tagStarted) window.gtag('consent', 'update', deniedConsent);
      clearAnalyticsCookies();
    }
    syncActivity();
  }
  decline.addEventListener('click', () => applyChoice('declined', true, true));
  close.addEventListener('click', () => applyChoice('declined', true, true));
  accept.addEventListener('click', () => applyChoice('accepted', true, true));
  notice.addEventListener('keydown', keyEvent => {
    if (keyEvent.key === 'Escape') applyChoice(choice || 'declined', true, true);
  });
  settings.addEventListener('click', () => {
    notice.hidden = false;
    settings.setAttribute('aria-expanded', 'true');
    decline.focus();
  });
  document.addEventListener('click', clickEvent => {
    if (choice !== 'accepted' || clickEvent.defaultPrevented) return;
    const anchor = clickEvent.target.closest?.('a[href]');
    if (!anchor) return;
    const href = anchor.getAttribute('href') || '';
    const placement = anchor.closest('nav') ? 'navigation' : anchor.closest('footer') ? 'footer'
      : anchor.closest('#hero') ? 'hero' : anchor.closest('#profile') ? 'profile' : 'content';
    if (/^mailto:/i.test(href)) event('contact_click', { contact_method: 'email', link_placement: placement, transport_type: 'beacon' });
    else {
      try {
        const link = new URL(href, location.href);
        if (link.protocol === 'https:' && /^(?:www\.)?linkedin\.com$/i.test(link.hostname)) event('social_click', { social_platform: 'linkedin', link_placement: placement, transport_type: 'beacon' });
      } catch { /* Invalid links do not affect navigation. */ }
    }
  });
  document.addEventListener('visibilitychange', syncActivity);
  window.addEventListener('focus', syncActivity);
  window.addEventListener('blur', syncActivity);
  window.addEventListener('pageshow', syncActivity);
  window.addEventListener('pagehide', () => {
    if (engagementTimer !== null) clearTimeout(engagementTimer);
    engagementTimer = null;
    if (activeSince !== null) activeMilliseconds += Math.max(0, Date.now() - activeSince);
    activeSince = null;
  });
  window.addEventListener('storage', storageEvent => {
    if (storageEvent.key !== consentKey) return;
    applyChoice(readChoice() || 'declined');
  });
  const savedChoice = readChoice();
  if (savedChoice) applyChoice(savedChoice);
  else {
    clearAnalyticsCookies();
    notice.hidden = false;
    settings.setAttribute('aria-expanded', 'true');
  }
})();
