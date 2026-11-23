// Browser-local organisation, separate from the immutable content catalogue.
export const HISTORY_LIMIT = 300;
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const validID = id => typeof id === 'string' && /^[a-z0-9][a-z0-9-]{0,99}$/i.test(id);
const ids = list => [...new Set(Array.isArray(list) ? list.filter(validID) : [])];
const date = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const offset = value => Number.isFinite(value) ? Math.max(0, Math.min(1000000, value)) : 0;
const nameKey = name => name.normalize('NFKC').toLocaleLowerCase();
export function collectionName(value) {
  const name = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (!name || [...name].length > 48) throw new Error('Use a collection name between 1 and 48 characters.');
  return name;
}
const entry = value => object(value) && validID(value.id) && date(value.at) ? {
  id:value.id,at:value.at,surface:value.surface==='reader'?'reader':'feed',offset:offset(value.offset),dayOnly:value.dayOnly===true,
} : null;
export function normalizePersonal(value, legacyRead={}) {
  const data=object(value)?value:{};
  const folders=[], usedIDs=new Set(), usedNames=new Set();
  for(const item of Array.isArray(data.collections)?data.collections:[]){
    if(!object(item)||!validID(item.id)||usedIDs.has(item.id))continue;
    let name;try{name=collectionName(item.name);}catch{continue;}
    if(usedNames.has(nameKey(name)))continue;
    usedIDs.add(item.id);usedNames.add(nameKey(name));
    folders.push({id:item.id,name,ids:ids(item.ids),created:date(item.created)?item.created:'1970-01-01T00:00:00.000Z'});
  }
  // Only migrate when the new history key is absent. An intentionally cleared
  // history must not reappear from the old daily-read counters on reload.
  let raw=Array.isArray(data.history)?data.history:[];
  if(!Object.hasOwn(data,'history')&&object(legacyRead)){
    raw=Object.entries(legacyRead).filter(([day])=>/^\d{4}-\d{2}-\d{2}$/.test(day)&&date(day)).flatMap(([day,list])=>ids(list).map(id=>({id,at:`${day}T12:00:00`,surface:'feed',offset:0,dayOnly:true})));
  }
  const seen=new Set();
  const history=raw.map(entry).filter(Boolean).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)).filter(e=>{if(seen.has(e.id))return false;seen.add(e.id);return true;}).slice(0,HISTORY_LIMIT);
  return {version:1,collections:folders,history,historyEnabled:data.historyEnabled!==false,resume:entry(data.resume)||history[0]||null};
}
export class PersonalLibrary {
  constructor({read,write,legacyRead={},legacyResume=null,now=()=>new Date().toISOString(),makeID=()=>`c-${[...crypto.getRandomValues(new Uint8Array(16))].map(byte=>byte.toString(16).padStart(2,'0')).join('')}`}={}){
    this.read=read;this.write=write;this.now=now;this.makeID=makeID;const stored=read?.('personal-library',null);this.data=normalizePersonal(stored,legacyRead);
    if(!object(stored)&&validID(legacyResume?.id))this.data.resume={id:legacyResume.id,at:this.now(),surface:'reader',offset:0,dayOnly:false};
  }
  refresh(){const latest=this.read?.('personal-library',null);if(object(latest)&&latest.version===1)this.data=normalizePersonal(latest);}
  commit(data){
    if(this.write?.('personal-library',data)===false)throw new Error('Your browser could not save this change. Please allow local storage.');
    this.data=data;
  }
  get collections(){return this.data.collections;}
  get history(){return this.data.history;}
  get resume(){return this.data.resume;}
  get enabled(){return this.data.historyEnabled;}
  collection(id){return this.collections.find(c=>c.id===id);}
  memberships(id){return this.collections.filter(c=>c.ids.includes(id));}
  create(name,postID){this.refresh();
    name=collectionName(name);this.unique(name);
    const collection={id:this.makeID(),name,ids:validID(postID)?[postID]:[],created:this.now()};
    this.commit({...this.data,collections:[collection,...this.collections]});return collection;
  }
  unique(name,except){if(this.collections.some(c=>c.id!==except&&nameKey(c.name)===nameKey(name)))throw new Error('You already have a collection with that name.');}
  rename(id,name){this.refresh();
    name=collectionName(name);this.unique(name,id);if(!this.collection(id))return;
    this.commit({...this.data,collections:this.collections.map(c=>c.id===id?{...c,name}:c)});
  }
  remove(id){this.refresh();
    const collection=this.collection(id);if(!collection)return null;
    this.commit({...this.data,collections:this.collections.filter(c=>c.id!==id)});return collection;
  }
  restore(collection){this.refresh();
    if(!collection||this.collection(collection.id))return;
    this.unique(collection.name);this.commit({...this.data,collections:[collection,...this.collections]});
  }
  setMembership(collectionID,postID,included){this.refresh();
    if(!validID(postID)||!this.collection(collectionID))return;
    this.commit({...this.data,collections:this.collections.map(c=>c.id!==collectionID?c:{...c,ids:included?ids([...c.ids,postID]):c.ids.filter(id=>id!==postID)})});
  }
  record(id,surface='feed',position=0){this.refresh();
    if(!validID(id))return;
    const visit={id,at:this.now(),surface:surface==='reader'?'reader':'feed',offset:offset(position),dayOnly:false};
    this.commit({...this.data,resume:visit,history:this.enabled?[visit,...this.history.filter(e=>e.id!==id)].slice(0,HISTORY_LIMIT):this.history});
  }
  setResume(id,surface='reader',position=0){this.refresh();
    if(!validID(id))return;
    this.commit({...this.data,resume:{id,at:this.now(),surface,offset:offset(position),dayOnly:false}});
  }
  setOffset(id,position){this.refresh();
    const change=e=>e?.id===id&&e.surface==='feed'?{...e,offset:offset(position)}:e;
    this.commit({...this.data,history:this.history.map(change),resume:change(this.resume)});
  }
  pause(paused){this.refresh();this.commit({...this.data,historyEnabled:!paused});}
  clearHistory(){this.refresh();const previous=this.history;this.commit({...this.data,history:[]});return previous;}
  restoreHistory(previous){this.refresh();this.commit(normalizePersonal({...this.data,history:[...this.history,...previous]}));}
}
