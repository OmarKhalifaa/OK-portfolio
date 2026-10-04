import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { localPrototypePath, validateContent } from '../scripts/validate-content.mjs';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

test('HTML prototype paths stay within one local bundle', () => {
  assert.equal(localPrototypePath('/prototypes/in-app-search/'), 'prototypes/in-app-search/');
  for (const url of ['/prototypes/../admin/', '/prototypes/%2e%2e/', '/prototypes/search/child/', '//prototypes/search/', 'https://example.com/', '/prototypes/search/?query=1', '/prototypes/search/#view', '/prototypes/search/\n', undefined]) {
    assert.throws(() => localPrototypePath(url), /HTML prototype URL/);
  }
});

test('content validation requires an existing local prototype entry point', async t => {
  const fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-prototype-'));
  t.after(() => fs.rm(fixture, { recursive: true, force: true }));
  await fs.mkdir(path.join(fixture, 'content/projects'), { recursive: true });
  await fs.mkdir(path.join(fixture, 'admin'), { recursive: true });
  await fs.copyFile(path.join(root, 'admin/config.yml'), path.join(fixture, 'admin/config.yml'));
  const project = { slug: 'search', title: 'Search', deck: 'Search prototype', industry: 'Mobile', role: 'Designer', blocks: [{ type: 'html_prototype', url: '/prototypes/search/' }] };
  const contentFile = path.join(fixture, 'content/projects/search.json');
  await fs.writeFile(contentFile, JSON.stringify(project));
  assert.throws(() => validateContent(fixture), /missing or invalid prototype directory/);
  await fs.mkdir(path.join(fixture, 'prototypes/search'), { recursive: true });
  assert.throws(() => validateContent(fixture), /missing prototype index.html/);
  await fs.writeFile(path.join(fixture, 'prototypes/search/index.html'), '<!doctype html><title>Search prototype</title>');
  assert.equal(validateContent(fixture)[0].slug, 'search');
  project.blocks[0].url = '/prototypes/../admin/';
  await fs.writeFile(contentFile, JSON.stringify(project));
  assert.throws(() => validateContent(fixture), /HTML prototype URL/);
});
