import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestionsFor, resultsFor, countsFor } from './model.js';

test('Recharge suggestions and result counts match the services journey', () => {
  assert.equal(suggestionsFor('Recharge').length, 5);
  const result = resultsFor(' Recharge ');
  assert.deepEqual(countsFor(result), { All: 7, Services: 7, Entertainment: 0, Shop: 0, Gaming: 0, Merchants: 0 });
  assert.equal(new Set(result.services.map(item => item.id)).size, 7);
});
test('Mobile mixes services, shop and promotions without counting merchants twice', () => {
  assert.equal(suggestionsFor('mob').length, 3);
  assert.deepEqual(countsFor(resultsFor('Mobile')), { All: 8, Services: 2, Entertainment: 2, Shop: 4, Gaming: 0, Merchants: 3 });
});
test('Selecting a suggestion narrows results instead of always returning a preset family', () => {
  assert.equal(resultsFor('Recharge DSL').services.length, 2);
  assert.equal(resultsFor('Recharge my number').services[0].id, 'balance');
  assert.equal(resultsFor('Mobile internet').services.length, 1);
  assert.equal(resultsFor('Mobile internet').products.length, 0);
});
test('Unknown and markup-containing queries return zero local results', () => {
  assert.equal(countsFor(resultsFor('purple elephants')).All, 0);
  assert.equal(countsFor(resultsFor('<script>alert(1)</script>')).All, 0);
  assert.equal(suggestionsFor('').length, 0);
});
test('Every product merchant has a corresponding available seller', () => {
  const r = resultsFor('Mobile');
  for (const product of r.products) {
    assert.equal(product.stores, product.merchants.length);
    for (const id of product.merchants) assert.ok(r.merchants.some(merchant => merchant.id === id));
  }
});
