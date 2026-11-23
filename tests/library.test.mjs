import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { QuranLibrary, buildFeedPool, duaSelections, canonicalVerse } from '../dist/library.js';
import { FeedWindow } from '../dist/feed-window.js';
import { posts } from '../dist/content.js';
import { extraHadith } from '../dist/hadith-content.js';
const curated=[...posts,...extraHadith];
const fileFetch=async path=>({ok:true,json:async()=>JSON.parse(await readFile(new URL(`../dist${path}`,import.meta.url),'utf8'))});
async function library(){const l=new QuranLibrary(fileFetch);await l.init();return l;}

test('The corpus contains every ayah once, in order, with attributed unmodified texts',async()=>{
  const l=await library();let next=1;const keys=new Set();
  for(let i=0;i<Math.ceil(l.manifest.total/l.manifest.batchSize);i++){
    const batch=await (await fileFetch(`/data/quran/batch-${i}.json`)).json();assert.ok(batch.licenseNotice.includes('CHANGING IT IS NOT ALLOWED'));
    for(const v of batch.verses){assert.equal(v.number,next++);assert.ok(v.arabic&&v.text);const key=`${v.surah}:${v.ayah}`;assert.ok(!keys.has(key));keys.add(key);}
  }
  assert.equal(keys.size,6236);assert.equal(l.references().length,6236);
  assert.equal(l.reference('q-1-1').number,1);assert.equal(l.reference('q-114-6').number,6236);
  assert.equal(l.reference('q-2-287'),null);assert.equal(l.reference('q-0-1'),null);
  const a=await l.load('q-2-255');assert.equal(a.verse,'2:255');assert.equal(a.translator,'Marmaduke Pickthall · English translation');
  assert.ok(a.audioUrl.endsWith('/262.mp3'));assert.ok(a.source.endsWith('/2/255'));
});

test('New content is unique until the library is exhausted; seen items are deferred',async()=>{
  const l=await library();const pool=buildFeedPool({curated,library:l,seen:['remembrance','ease']});
  assert.ok(pool.length>6236);assert.equal(new Set(pool).size,pool.length);
  assert.deepEqual(pool.slice(-2),['remembrance','ease']);assert.ok(pool.indexOf('q-114-6')>6000);
  const canonical=pool.map(id=>curated.find(p=>p.id===id)).filter(Boolean).map(canonicalVerse).filter(Boolean);
  for(const key of canonical)assert.ok(!pool.includes(`q-${key.replace(':','-')}`));
  const prayers=buildFeedPool({curated,library:l,category:'dua'});assert.equal(prayers.length,27);
  for(const d of duaSelections){const p=await l.load(`dua-${d[0]}-${d[1]}`);assert.equal(p.type,'dua');assert.equal(p.arabic,(await l.load(`q-${d[0]}-${d[1]}`)).arabic);}
});

test('Surah, category and collection filters remain within their selected scope',async()=>{
  const l=await library();
  const chapter=buildFeedPool({curated,library:l,category:'quran',surah:2});assert.equal(chapter.length,286);assert.equal(chapter[0],'q-2-1');assert.equal(chapter.at(-1),'q-2-286');
  const hadith=buildFeedPool({curated,library:l,category:'hadith'});assert.equal(hadith.length,12);assert.ok(hadith.every(id=>curated.find(p=>p.id===id).type==='hadith'));
  const collection=buildFeedPool({curated,library:l,collection:['ease','beauty']});assert.deepEqual(collection,['ease','beauty']);
  assert.deepEqual(buildFeedPool({curated,library:l,category:'story',mood:'gratitude'}),[]);
});

test('Hundreds of forward and backward positions keep a bounded window and correct card identities',()=>{
  for(const size of [1,2,12,6240]){
    const ids=Array.from({length:size},(_,i)=>`item-${i}`);const w=new FeedWindow(ids);
    for(const position of [...Array.from({length:701},(_,i)=>i),...Array.from({length:701},(_,i)=>700-i)]){
      w.active=position;const next=w.desiredWindow();w.setWindow(next.start,next.end);
      assert.equal(w.entries().length,15);assert.equal(w.idAt(position),ids[position%size]);
      const entry=w.entries().find(e=>e.index===position);assert.ok(entry);assert.equal(entry.revisited,position>=size);
    }
  }
  assert.deepEqual(new FeedWindow([]).entries(),[]);
});

test('Concurrent verse loads share a batch, and failed batches can be retried',async()=>{
  const requests=[];let fail=true;
  const l=new QuranLibrary(async path=>{requests.push(path);if(path.includes('batch-0')&&fail){fail=false;throw new Error('offline');}return fileFetch(path);});
  await l.init();await assert.rejects(l.load('q-1-1'),/offline/);
  const [a,b]=await Promise.all([l.load('q-1-1'),l.load('q-1-2')]);assert.equal(a.verse,'1:1');assert.equal(b.verse,'1:2');
  assert.equal(requests.filter(p=>p.includes('batch-0')).length,2);
});

test('Search resolves verse references, Arabic without diacritics, and surah names',async()=>{
  const l=await library();const exact=await l.search('2:255');assert.equal(exact.posts[0].id,'q-2-255');
  const ar=await l.search('الحمد لله');assert.ok(ar.posts.some(p=>p.id==='q-1-2'));
  const chapter=await l.search('Al-Faatiha');assert.equal(chapter.total,7);
  assert.equal((await l.search('999:999')).total,0);
});
