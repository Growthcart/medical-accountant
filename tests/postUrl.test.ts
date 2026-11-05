import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normaliseStructure, postPath, RESERVED_POST_SLUGS } from '../lib/blog/postUrl';
import { slugify } from '../lib/blog/slug';

test('every post lives at /{slug}/ (WordPress-style root address), whatever its category or the stored setting', () => {
  assert.equal(postPath('my-post', 'news', 'category'), '/my-post/');
  assert.equal(postPath('my-post', null, 'category'), '/my-post/');
  assert.equal(postPath('my-post', 'news', 'flat'), '/my-post/');
  assert.equal(postPath('my-post'), '/my-post/');
});

test('the stored URL setting still normalises (it no longer changes the address)', () => {
  assert.equal(normaliseStructure('flat'), 'flat');
  assert.equal(normaliseStructure('category'), 'category');
  assert.equal(normaliseStructure(null), 'flat');
  assert.equal(normaliseStructure('weird'), 'flat');
});

test('a post slug cannot take a root address the site or the CMS already uses', () => {
  for (const reserved of ['admin', 'api', 'news', 'contact', 'terms', 'gp-accountants', 'ihca', 'company-formation']) {
    assert.ok(RESERVED_POST_SLUGS.includes(reserved), `${reserved} is reserved`);
    assert.equal(slugify(reserved), `${reserved}-post`);
  }
  assert.equal(slugify('Capital Gains Tax: When Is the Deadline?'), 'capital-gains-tax-when-is-the-deadline');
});
