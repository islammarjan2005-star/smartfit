import test from 'node:test';
import assert from 'node:assert/strict';
import {RecitationSession,recitationURL,getReciter} from '../dist/recitation.js';

class FakeAudio extends EventTarget {
  constructor(){super();this.paused=true;this.currentTime=0;this.duration=6;this.playCalls=0;this.src='';}
  load(){this.currentTime=0;}
  async play(){this.playCalls++;this.paused=false;this.dispatchEvent(new Event('play'));if(!this.paused)this.dispatchEvent(new Event('playing'));}
  pause(){const changed=!this.paused;this.paused=true;if(changed)this.dispatchEvent(new Event('pause'));}
  end(){this.paused=true;this.dispatchEvent(new Event('ended'));}
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const post=id=>{const [,surah,ayah]=id.split('-').map(Number);return {id,surah,ayah,number:ayah};};
function fixture(load=async id=>post(id)){
  const audio=new FakeAudio(),prefs={reciter:'ar.alafasy',speed:1};
  const session=new RecitationSession({audio,load,preferences:()=>prefs});session.activate(1,7,1);
  return {audio,session,prefs};
}

test('Reciter URLs use the verified edition and bitrate, without accepting arbitrary editions',()=>{
  assert.match(recitationURL(262,'ar.husary'),/128\/ar.husary\/262.mp3$/);
  assert.match(recitationURL(1,'ar.abdulbasitmurattal'),/192\/ar.abdulbasitmurattal\/1.mp3$/);
  assert.equal(getReciter('unknown').id,'ar.alafasy');assert.throws(()=>recitationURL(0,'ar.alafasy'));
});

test('Three repeats play each selected ayah exactly three times, then stop at the range end',async()=>{
  const loaded=[],{audio,session}=fixture(async id=>{loaded.push(id);return post(id);});
  session.setRange(1,2);session.setRepeat(3);await session.select(1,true);
  for(let i=0;i<5;i++){audio.end();await tick();assert.equal(session.wantsPlay,true);}
  assert.equal(session.current,2);assert.equal(audio.playCalls,6);audio.end();await tick();
  assert.equal(session.status,'finished');assert.equal(session.wantsPlay,false);assert.equal(audio.playCalls,6);
  assert.deepEqual(loaded,['q-1-1','q-1-2']);
});

test('Infinite repeat stays on one ayah and manual selection resets its repeat counter',async()=>{
  const {audio,session}=fixture();session.setRepeat('forever');await session.select(2,true);
  for(let i=0;i<9;i++){audio.end();await tick();}
  assert.equal(session.current,2);assert.equal(audio.playCalls,10);await session.select(3,true);assert.equal(session.completed,0);
  session.pause();audio.end();await tick();assert.equal(session.current,3);assert.equal(session.wantsPlay,false);
});

test('Leaving the reader cancels late loads and prevents ended events from taking over feed audio',async()=>{
  let resolve;const {audio,session}=fixture(()=>new Promise(r=>resolve=r));
  const pending=session.select(4,true);session.deactivate();audio.src='feed.mp3';resolve(post('q-1-4'));await pending;
  assert.equal(audio.src,'feed.mp3');assert.equal(audio.playCalls,0);audio.end();await tick();assert.equal(audio.src,'feed.mp3');
});

test('A newer ayah selection wins when an older request resolves later',async()=>{
  const resolvers=new Map(),{audio,session}=fixture(id=>new Promise(r=>resolvers.set(id,r)));
  const first=session.select(1,true),second=session.select(2,true);
  resolvers.get('q-1-2')(post('q-1-2'));await second;resolvers.get('q-1-1')(post('q-1-1'));await first;
  assert.equal(session.current,2);assert.ok(audio.src.endsWith('/2.mp3'));assert.equal(audio.playCalls,1);
});

test('Changing reciters restarts the same ayah and preserves playback speed and play intent',async()=>{
  const {audio,session,prefs}=fixture();await session.select(3,true);prefs.reciter='ar.abdulbasitmurattal';prefs.speed=.75;
  await session.changeReciter();assert.equal(session.current,3);assert.equal(session.wantsPlay,true);
  assert.match(audio.src,/192\/ar.abdulbasitmurattal\/3.mp3$/);assert.equal(audio.playbackRate,.75);
  session.pause();prefs.reciter='ar.husary';await session.changeReciter();assert.equal(audio.paused,true);
});

test('Load failures are recoverable and invalid ranges cannot escape the selected surah',async()=>{
  let fail=true;const {session}=fixture(async id=>{if(fail){fail=false;throw new Error('offline');}return post(id);});
  await session.select(2,true);assert.equal(session.status,'error');await session.play();assert.equal(session.status,'playing');
  assert.throws(()=>session.setRange(5,3));assert.throws(()=>session.setRange(1,8));assert.throws(()=>session.setRepeat(0));
  session.setRange(5,6);assert.equal(session.current,5);await session.select(7,true);assert.equal(session.current,5);
});

test('Pausing while a verse loads does not start playback when the request finishes',async()=>{
  let resolve;const {audio,session}=fixture(()=>new Promise(r=>resolve=r));
  const pending=session.select(1,true);session.pause();resolve(post('q-1-1'));await pending;assert.equal(audio.playCalls,0);assert.equal(audio.paused,true);
});
