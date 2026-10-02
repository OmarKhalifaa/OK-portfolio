import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { onRequest as auth } from '../functions/auth.js';
import { onRequest as callback } from '../functions/callback.js';

const origin = 'https://portfolio.example';
const env = { GITHUB_CLIENT_SECRET: 'test-secret' };
const request = state => new Request(`${origin}/callback?code=test-code&state=${state}`, { headers: { Cookie: 'decap_oauth_state=valid-state' } });

test('OAuth uses random state and secure, private, expiring cookies', async () => {
  const first = await auth({ request: new Request(`${origin}/auth`), env });
  const second = await auth({ request: new Request(`${origin}/auth`), env });
  const firstURL = new URL(first.headers.get('Location'));
  assert.equal(first.status, 302);
  assert.notEqual(firstURL.searchParams.get('state'), new URL(second.headers.get('Location')).searchParams.get('state'));
  assert.equal(firstURL.searchParams.get('redirect_uri'), `${origin}/callback`);
  assert.match(first.headers.get('Set-Cookie'), /HttpOnly; Secure; SameSite=Lax; Max-Age=600/);
  assert.equal(first.headers.get('Cache-Control'), 'no-store');
});

test('mismatched OAuth state is rejected before exchanging a code', async t => {
  const exchange = t.mock.method(globalThis, 'fetch', () => { throw new Error('Must not exchange a code'); });
  const response = await callback({ request: request('wrong-state'), env });
  assert.equal(response.status, 400);
  assert.equal(exchange.mock.callCount(), 0);
});

test('OAuth token can only be delivered to the same-origin opener', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ access_token: 'test-token' }));
  const response = await callback({ request: request('valid-state'), env });
  const html = await response.text();
  const [, nonce, script] = html.match(/<script nonce="([^"]+)">([\s\S]*?)<\/script>/);
  assert.ok(response.headers.get('Content-Security-Policy').includes(`'nonce-${nonce}'`));
  assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
  assert.match(response.headers.get('Set-Cookie'), /Max-Age=0/);
  const messages = [];
  const opener = { postMessage: (message, target) => messages.push({ message, target }) };
  let listener;
  vm.runInNewContext(script, { window: { opener, addEventListener: (_, handler) => { listener = handler; }, removeEventListener() {} } });
  assert.deepEqual(messages, [{ message: 'authorizing:github', target: origin }]);
  listener({ source: opener, origin: 'https://untrusted.example' });
  listener({ source: {}, origin });
  assert.equal(messages.length, 1);
  listener({ source: opener, origin });
  assert.equal(messages.length, 2);
  assert.equal(messages[1].target, origin);
  assert.match(messages[1].message, /authorization:github:success/);
});

test('upstream OAuth errors produce a safe retryable response', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('internal upstream detail'); });
  const response = await callback({ request: request('valid-state'), env });
  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), /internal upstream detail|test-secret/);
});
