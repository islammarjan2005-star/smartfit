// Global positions are independent of the small set of mounted cards.
export class FeedWindow {
  constructor(ids, active=0) {
    this.ids=ids; this.active=Math.max(0,active); this.start=Math.max(0,this.active-5); this.end=this.start+15;
  }
  idAt(index) { return this.ids.length&&index>=0?this.ids[index%this.ids.length]:null; }
  entries(start=this.start,end=this.end) { return this.ids.length?Array.from({length:Math.max(0,end-start)},(_,i)=>({index:start+i,id:this.idAt(start+i),revisited:start+i>=this.ids.length})):[]; }
  desiredWindow(index=this.active) { const start=Math.max(0,index-5); return {start,end:start+15}; }
  needsRebase(index=this.active) { return (index<this.start+3&&this.start>0)||index>=this.end-4; }
  setWindow(start,end) { this.start=start;this.end=end; }
}
