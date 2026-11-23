import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PHOTO_TOPICS, resolvePhotoTopic } from '../dist/photo-topics.js';
import { posts } from '../dist/content.js';
import { extraHadith } from '../dist/hadith-content.js';

test('Concrete subjects are selected from the source passage with whole-word matches', () => {
  for (const [text, expected] of [
    ['Thou seest the rain downpouring from within them.', 'rain'],
    ['He hath loosed the two seas. They meet.', 'ocean'],
    ['Have they not seen the birds obedient in mid-air?', 'birds'],
    ['And the mountains as pegs?', 'mountains'],
    ['By the Dawn', 'dawn'],
    ['The date-palm shall drop ripe dates upon thee.', 'dates'],
    ['Rivers run through the land.', 'river'],
    ['Charity does not decrease wealth.', 'giving'],
    ['My Lord! Increase me in knowledge.', 'books'],
    ['Let a scribe write down the transaction.', 'writing'],
    ['Record your debts in writing.', 'writing'],
  ]) assert.equal(resolvePhotoTopic({type:'quran', text}).topic, expected, text);
});

test('Words inside unrelated words and abstract light do not become scenic matches', () => {
  for (const text of [
    'A delightful outcome after training.',
    'A sincere heart is steadfast.',
    'Kindness is a delight.',
    'He gave them light upon light.',
    'There is strength in restraint.',
    'They perish by their own deserts.',
    'O Children of Israel! Remember My favour.',
  ]) {
    const result = resolvePhotoTopic({type:'quran', text});
    assert.equal(result.confidence, 0.2, text);
    assert.match(result.reason, /No concrete visual subject/);
    assert.ok(['prayer','books','sky','path','river','mountains','dawn','trees'].includes(result.topic));
  }
});

test('Ayah text takes precedence over chapter titles, tags and editorials', () => {
  const post = {id:'q-92-5', type:'quran', title:'The Night', reference:'The Night', tags:['Night','Stars'], text:'But as for him who giveth and is dutiful'};
  assert.equal(resolvePhotoTopic(post).confidence, 0.2);
  assert.equal(resolvePhotoTopic({...post, text:'By the Dawn'}).topic, 'dawn');
  assert.equal(resolvePhotoTopic({type:'story', title:'A night at sea', text:'Birds gathered overhead.'}).topic, 'birds');
  assert.equal(resolvePhotoTopic({type:'dua', title:'A prayer for light', text:'Our Lord! Forgive us.'}).confidence, 0.2);
});

test('Divine attributes and figurative language have deliberate neutral associations', () => {
  for (const verse of ['24:35','2:255']) {
    const result = resolvePhotoTopic({type:'quran', verse, text:'A shining star above a tree and the heavens.'});
    assert.equal(result.topic, 'books');
    assert.equal(result.confidence, 0.3);
    assert.match(result.reason, /not (?:represent|rendered)|not a depiction/);
  }
  assert.equal(resolvePhotoTopic({id:'q-17-24', text:'Lower unto them the wing of submission.'}).topic, 'family');
  assert.equal(resolvePhotoTopic({id:'dua-66-8', type:'dua', text:'Perfect our light for us.'}).topic, 'prayer');
  assert.match(resolvePhotoTopic(posts.find(p=>p.id==='beauty')).reason, /does not represent a divine attribute/);
  assert.equal(resolvePhotoTopic({type:'quran', text:'Allah is the Light of the heavens and the earth. A tree, a star, and a lamp.'}).topic, 'books');
  assert.equal(resolvePhotoTopic({type:'quran', text:'They say they are sons of Allah.'}).topic, 'books');
});

test('The debt-recording ayah is directed to a writing photograph', () => {
  const result = resolvePhotoTopic({id:'q-2-282', type:'quran', verse:'2:282'});
  assert.equal(result.topic, 'writing');
  assert.deepEqual(result.photoIds, ['writing-desk']);
  assert.equal(resolvePhotoTopic({type:'quran', text:'Allah hath prescribed mercy for Himself.'}).confidence, 0.2);
});

test('Afterlife associations explicitly describe present-day illustration', () => {
  const result = resolvePhotoTopic({type:'quran', text:'Gardens beneath which rivers flow, wherein they shall abide for ever.'});
  assert.equal(result.topic, 'river');
  assert.equal(result.confidence, 0.65);
  assert.match(result.reason, /does not depict the unseen or the afterlife/);
});

test('Curated content has valid intentional subjects and honest image descriptions', () => {
  for (const post of [...posts, ...extraHadith]) {
    const result = resolvePhotoTopic(post);
    assert.ok(PHOTO_TOPICS.includes(result.topic), post.id);
    assert.ok(result.confidence > 0.2 && result.confidence <= 1, post.id);
    assert.match(result.reason, /Atmospheric illustration, not a depiction or interpretation of scripture\./);
  }
  assert.equal(resolvePhotoTopic(posts.find(p=>p.id==='yunus-story')).topic, 'ocean');
  assert.equal(resolvePhotoTopic(extraHadith.find(p=>p.id==='hadith-giving')).topic, 'giving');
});

test('Arabic-only concrete terms work without treating a metaphorical wing as a bird', () => {
  assert.equal(resolvePhotoTopic({type:'quran', arabic:'مَرَجَ ٱلْبَحْرَيْنِ يَلْتَقِيَانِ'}).topic, 'ocean');
  assert.equal(resolvePhotoTopic({type:'quran', arabic:'وَٱلْفَجْرِ'}).topic, 'dawn');
  assert.equal(resolvePhotoTopic({type:'quran', arabic:'وَٱخْفِضْ لَهُمَا جَنَاحَ ٱلذُّلِّ'}).confidence, 0.2);
});

test('The complete corpus resolves deterministically without mutating source text', async () => {
  let total = 0;
  for (let batch=0;batch<130;batch++) {
    const data = JSON.parse(await readFile(new URL(`../dist/data/quran/batch-${batch}.json`, import.meta.url), 'utf8'));
    for (const verse of data.verses) {
      const post = Object.freeze({...verse, id:`q-${verse.surah}-${verse.ayah}`, type:'quran'});
      const result = resolvePhotoTopic(post);
      assert.ok(PHOTO_TOPICS.includes(result.topic), post.id);
      assert.ok(Number.isFinite(result.confidence) && result.confidence >= 0 && result.confidence <= 1, post.id);
      assert.deepEqual(resolvePhotoTopic(post), result);
      assert.equal(post.text, verse.text);
      total++;
    }
  }
  assert.equal(total, 6236);
  for (const input of [null, undefined, {}, 'invalid']) assert.ok(PHOTO_TOPICS.includes(resolvePhotoTopic(input).topic));
});
