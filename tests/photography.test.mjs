import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { photos } from '../dist/photo-library.js';
import { photoFor, photoForTheme } from '../dist/photography.js';
import { posts } from '../dist/content.js';
import { extraHadith } from '../dist/hadith-content.js';

test('Opening editorial cards have ten distinct, deliberately selected photographs', () => {
  const expected = {
    remembrance:'prayer-hall', ease:'clouds', knowledge:'books', intentions:'forest-path',
    'yunus-story':'ocean-waves', beauty:'garden', 'yunus-dua':'ocean-sunset', giving:'dawn-mountains',
    'yusuf-story':'sand-dunes', goodness:'river',
  };
  for (const post of posts) assert.equal(photoFor(post).id, expected[post.id], post.id);
  assert.equal(new Set(posts.map(post => photoFor(post).id)).size, 10);
  for (const post of [...posts, ...extraHadith]) {
    const photo = photoFor(post);
    assert.ok(photo.tags.includes(photo.topic), post.id);
    assert.match(photo.reason, /illustration, not a depiction or interpretation/);
  }
});

test('Concrete subsubjects select the photograph that actually shows them', () => {
  for (const [text, id] of [
    ['Olives and their leaves.', 'olives'],
    ['Grain grows in the field.', 'wheat'],
    ['They share bread.', 'bread'],
    ['Rain falls from the sky.', 'rain'],
    ['My Lord! Increase me in knowledge.', 'books'],
    ['They prostrate in worship.', 'prayer-hall'],
    ['When you contract a debt, record it in writing. Let a scribe write.', 'writing-desk'],
  ]) {
    const photo = photoFor({id:'example', type:'quran', text});
    assert.equal(photo.id, id, text);
  }
});

test('Selection survives revisits and canonical record forms', () => {
  const verse = {type:'quran', id:'q-16-14', surah:16, ayah:14, text:'The sea and ships upon it.'};
  const first = photoFor(verse);
  for (let i=0;i<400;i++) photoFor({id:`sample-${i}`, text:'A setting for reflection.'});
  assert.deepEqual(photoFor(verse), first);
  assert.equal(photoFor({id:'q-16-14', type:'quran', text:verse.text}).id, first.id);
  assert.equal(photoFor({id:'another', type:'quran', verse:'Qur’an 16:14', text:verse.text}).id, first.id);
});

test('A hydrated or changed post cannot keep a stale image under the same ID', () => {
  const initial = {id:'changing', type:'quran', pending:true};
  photoFor(initial);
  assert.equal(photoFor({...initial, pending:false, text:'The olives on the tree.'}).id, 'olives');
  assert.equal(photoFor({...initial, pending:false, text:'Rain falling from the sky.'}).id, 'rain');
});

test('Every photograph has a local file and traceable source attribution', async () => {
  for (const photo of photos) {
    await access(new URL(`../dist/assets/photos/${photo.file}`, import.meta.url));
    for (const width of [480,960,1400]) await access(new URL(`../dist/assets/photos/${photo.id}-${width}.webp`, import.meta.url));
    assert.match(photo.source, /^https:\/\/unsplash.com\/photos\//);
    assert.ok(photo.photographer && photo.alt && photo.licenseUrl);
    assert.ok(photo.width > 0 && photo.height > 0);
  }
  assert.equal(photoFor({id:'q-2-282',type:'quran',verse:'2:282'}).id,'writing-desk');
  assert.equal(photoForTheme('river', -1).id, photoForTheme('river', 1).id);
  assert.equal(photoForTheme('river', Infinity).id, photoForTheme('river', 0).id);
});
