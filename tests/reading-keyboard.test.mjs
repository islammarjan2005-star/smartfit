import test from 'node:test';
import assert from 'node:assert/strict';
import { scrollReadingKey } from '../dist/reading-keyboard.js';

function readingSurface(scrollTop=0,clientHeight=316,scrollHeight=3852){
  return {scrollTop,clientHeight,scrollHeight,scrollTo({top}){this.scrollTop=top;}};
}
function key(key,options={}){
  return {key,...options,defaultPrevented:false,propagationStopped:false,
    preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.propagationStopped=true;}};
}

test('long-verse Home and End stay within the text surface and consume native scrolling',()=>{
  const surface=readingSurface();
  for(const [name,expected] of [['End',3536],['End',3536],['Home',0],['Home',0]]){
    const event=key(name);
    assert.equal(scrollReadingKey(event,surface),true);
    assert.equal(surface.scrollTop,expected);
    assert.equal(event.defaultPrevented,true);
    assert.equal(event.propagationStopped,true);
  }
});

test('page, arrow and space keys cannot chain at either reading boundary',()=>{
  for(const [name,options,position] of [
    ['PageDown',{},3536],['ArrowDown',{},3536],[' ',{code:'Space'},3536],
    ['PageUp',{},0],['ArrowUp',{},0],[' ',{code:'Space',shiftKey:true},0],
  ]){
    const surface=readingSurface(position),event=key(name,options);
    assert.equal(scrollReadingKey(event,surface),true);
    assert.equal(surface.scrollTop,position);
    assert.equal(event.defaultPrevented,true);
    assert.equal(event.propagationStopped,true);
  }
});

test('reading progresses by overlapping pages and keeps unrelated keys available',()=>{
  const surface=readingSurface();
  scrollReadingKey(key('PageDown'),surface);
  assert.ok(surface.scrollTop>0 && surface.scrollTop<surface.clientHeight);
  scrollReadingKey(key('PageUp'),surface);
  assert.equal(surface.scrollTop,0);
  const event=key('Tab');
  assert.equal(scrollReadingKey(event,surface),false);
  assert.equal(event.defaultPrevented,false);
});

test('a fitted reading surface still consumes navigation keys without moving the feed',()=>{
  const surface=readingSurface(0,316,250),event=key('End');
  assert.equal(scrollReadingKey(event,surface),true);
  assert.equal(surface.scrollTop,0);
  assert.equal(event.defaultPrevented,true);
});
