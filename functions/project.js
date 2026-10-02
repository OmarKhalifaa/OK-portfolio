// Preserve shared links to the previous query-based case study pages.
export function onRequest({ request }) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('project') || 'login-revamp';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return new Response('Project not found', {
      status: 404,
      headers: { 'X-Robots-Tag': 'noindex', 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  return new Response(null, {
    status: 301,
    headers: { Location: new URL(`/projects/${slug}/`, url.origin).href },
  });
}
