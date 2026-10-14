const measurementIdPattern = /^G-[A-Z0-9]+$/;
const publicPathPattern = /^(?:\/|\/index\.html|\/about\/(?:index\.html)?|\/projects\/(?:index\.html|[a-z0-9]+(?:-[a-z0-9]+)*\/(?:index\.html)?)?)$/;

/** Add first-party consent and tracking only to deployable portfolio pages. */
export function injectAnalytics($, { measurementId, canonicalUrl, preview = false } = {}) {
  $('#portfolio-analytics-config, [data-portfolio-analytics]').remove();
  if (preview || typeof measurementId !== 'string' || !measurementIdPattern.test(measurementId)) return false;
  let production;
  let page;
  try {
    production = new URL(canonicalUrl);
    page = new URL($('link[rel="canonical"]').attr('href'));
  } catch {
    return false;
  }
  if (production.protocol !== 'https:' || production.port || production.username || production.password
    || !production.hostname.includes('.') || /^(?:localhost|127\.|0\.|\[)/i.test(production.hostname)
    || page.origin !== production.origin || !publicPathPattern.test(page.pathname)) return false;

  const config = JSON.stringify({ measurementId, hostname: production.hostname })
    .replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026');
  $('head').append(`<script id="portfolio-analytics-config" type="application/json">${config}</script>`);
  $('head').append('<link rel="stylesheet" href="/css/analytics.css" data-portfolio-analytics="stylesheet">');
  $('head').append('<script src="/js/analytics.js" defer data-portfolio-analytics="script"></script>');
  return true;
}
