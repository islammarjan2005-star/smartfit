import test from 'node:test';
import assert from 'node:assert/strict';
import {PersonalLibrary,normalizePersonal,HISTORY_LIMIT} from '../dist/personal-library.js';
function harness(initial,legacyRead={}){
  const disk={value:initial};let counter=0,tick=0;
  const options={read:()=>disk.value,write:(key,value)=>{disk.value=structuredClone(value);return true;},legacyRead,makeID:()=>`c-${++counter}`,now:()=>new Date(Date.UTC(2026,9,29,10,0,tick++)).toISOString()};
  return {disk,options,library:new PersonalLibrary(options)};
}
test('Existing daily reading migrates once, with dates rather than invented visit times',()=>{
  const h=harness(null,{'2026-10-28':['remembrance','q-2-282'],'2026-10-29':['remembrance'],bad:['ease']});
  assert.deepEqual(h.library.history.map(e=>e.id),['remembrance','q-2-282']);assert.ok(h.library.history.every(e=>e.dayOnly));
  h.library.clearHistory();assert.equal(new PersonalLibrary(h.options).history.length,0);
});
test('Collections persist independent membership and safe names through rename and restart',()=>{
  const h=harness();const a=h.library.create('  Quiet   mornings '),b=h.library.create('Memorisation');
  h.library.setMembership(a.id,'q-2-282',true);h.library.setMembership(a.id,'q-2-282',true);h.library.setMembership(b.id,'q-2-282',true);
  h.library.rename(a.id,'A little peace');const restored=new PersonalLibrary(h.options);
  assert.equal(restored.collection(a.id).name,'A little peace');assert.deepEqual(restored.collection(a.id).ids,['q-2-282']);assert.equal(restored.memberships('q-2-282').length,2);
  restored.setMembership(a.id,'q-2-282',false);assert.equal(restored.memberships('q-2-282').length,1);
});
test('Blank, oversized and duplicate names do not mutate saved collections',()=>{
  const h=harness();h.library.create('Hope');const original=structuredClone(h.disk.value);
  for(const name of ['','   ','x'.repeat(49),' hope ','Ｈｏｐｅ'])assert.throws(()=>h.library.create(name));
  assert.deepEqual(h.disk.value,original);const c=h.library.create('<script>alert(1)</script>');assert.equal(c.name,'<script>alert(1)</script>');
});
test('Deleting and undoing a collection preserves its stable ID and passages',()=>{
  const {library}=harness();const c=library.create('Keep close','remembrance'),removed=library.remove(c.id);assert.equal(library.collections.length,0);
  library.restore(removed);assert.deepEqual(library.collection(c.id),c);library.restore(removed);assert.equal(library.collections.length,1);
});
test('History deduplicates revisits, records their context and stays bounded',()=>{
  const h=harness();for(let i=0;i<350;i++)h.library.record(`p-${i}`,'feed',i);
  assert.equal(h.library.history.length,HISTORY_LIMIT);assert.equal(h.library.history.at(-1).id,'p-50');
  h.library.record('p-55','reader');assert.equal(h.library.history[0].id,'p-55');assert.equal(h.library.history[0].surface,'reader');assert.equal(h.library.history.length,HISTORY_LIMIT);
  assert.deepEqual(new PersonalLibrary(h.options).history,h.library.history);
});
test('Pausing history keeps resume, clearing is persistent, and undo merges newer visits',()=>{
  const h=harness();h.library.record('remembrance');h.library.pause(true);h.library.record('q-2-282','reader');
  assert.equal(h.library.history.length,1);assert.equal(h.library.resume.id,'q-2-282');
  const old=h.library.clearHistory();assert.equal(new PersonalLibrary(h.options).history.length,0);assert.equal(h.library.resume.id,'q-2-282');
  h.library.pause(false);h.library.record('ease');h.library.restoreHistory(old);assert.deepEqual(h.library.history.map(e=>e.id),['ease','remembrance']);
});
test('Scrolling updates an existing visit without reordering history or changing its time',()=>{
  const {library}=harness();library.record('q-2-282','feed',30);const at=library.history[0].at;
  library.setOffset('q-2-282',3500);assert.equal(library.resume.offset,3500);assert.equal(library.history[0].at,at);
  library.record('ease');library.setOffset('q-2-282',3900);assert.equal(library.history[0].id,'ease');assert.equal(library.resume.id,'ease');assert.equal(library.history[1].offset,3900);
});
test('Storage failures leave the in-memory state unchanged and report the failed save',()=>{
  const h=harness();h.library.create('Hope');const original=structuredClone(h.library.data);h.library.write=()=>false;
  assert.throws(()=>h.library.rename('c-1','Changed'),/could not save/);assert.deepEqual(h.library.data,original);
});
test('Malformed persisted records cannot break rendering or reintroduce duplicate IDs',()=>{
  const data=normalizePersonal({collections:[null,{id:'c-1',name:'One',ids:['ease','ease',null,'"><bad>']},{id:'c-1',name:'Two'},{id:'c-2',name:'one'}],history:[{},null,{id:'q-2-282',at:'invalid'},{id:'ease',at:'2026-10-29T10:00:00Z',offset:-20},{id:'ease',at:'2026-10-28T10:00:00Z'}]});
  assert.equal(data.collections.length,1);assert.deepEqual(data.collections[0].ids,['ease']);assert.equal(data.history.length,1);assert.equal(data.history[0].offset,0);
});
test('Two open views preserve each other’s collections when recording or editing later',()=>{
  const h=harness();const other=new PersonalLibrary({...h.options,makeID:()=> 'c-other'});
  const first=h.library.create('One','ease');other.record('q-2-282','feed');
  assert.equal(other.collections[0].id,first.id);
  other.create('Two');h.library.setMembership(first.id,'remembrance',true);
  const fresh=new PersonalLibrary(h.options);assert.equal(fresh.collections.length,2);assert.equal(fresh.history[0].id,'q-2-282');assert.deepEqual(fresh.collection(first.id).ids,['ease','remembrance']);
});
test('The existing last-read ayah becomes the initial reader resume point',()=>{
  const l=new PersonalLibrary({read:()=>null,legacyRead:{'2026-10-29':['remembrance']},legacyResume:{id:'q-2-282'},now:()=> '2026-10-29T10:00:00Z'});
  assert.equal(l.resume.id,'q-2-282');assert.equal(l.resume.surface,'reader');assert.equal(l.history[0].id,'remembrance');
});
