// Static, versioned batches are served from the same origin as the app.
// No third-party content request is needed at reading time.
export const duaSelections = [
  [3,8,'A prayer for a steadfast heart','growth'],[3,38,'A prayer for good offspring','hope'],
  [7,23,'Returning with humility','hope'],[7,126,'A prayer for steadfastness','growth'],
  [14,40,'A prayer to establish worship','growth'],[14,41,'Remembering our parents','gratitude'],
  [17,24,'Mercy for those who raised us','gratitude'],[18,10,'A prayer for mercy and guidance','hope'],
  [20,25,'A prayer for an open heart','peace'],[21,83,'Turning to Allah in hardship','hope'],
  [23,29,'A prayer for a blessed arrival','hope'],[23,97,'Seeking refuge in Allah','peace'],
  [23,109,'A prayer for forgiveness and mercy','hope'],[23,118,'Calling on His mercy','peace'],
  [25,74,'A prayer for our families','gratitude'],[26,83,'A prayer for wisdom','growth'],
  [27,19,'A prayer of gratitude','gratitude'],[28,16,'A prayer for forgiveness','hope'],
  [28,24,'In need of His goodness','hope'],[37,100,'A prayer for righteous offspring','growth'],
  [59,10,'A heart free of resentment','peace'],[60,5,'A prayer for protection','peace'],
  [66,8,'A prayer for light and forgiveness','hope'],[66,11,'A prayer for a home in Paradise','hope'],
];

// Normalize only the search index; the displayed and saved scripture is unchanged.
export const normalizeSearch = text => String(text).normalize('NFD').replace(/\p{M}/gu, '').replace(/[ٱأإآ]/g, 'ا').replace(/ـ/g, '').replace(/[’‘]/g, "'").toLowerCase();

export class QuranLibrary {
  constructor(fetcher = (...args) => fetch(...args)) {
    this.fetcher = fetcher; this.manifest = null; this.loaded = new Map(); this.pending = new Map(); this.batches = new Set(); this.searchIndex = null;
  }
  async request(path) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await this.fetcher(`/data/quran/${path}`, { signal: controller.signal });
      if (!response.ok) throw new Error('The reading library could not load.');
      return await response.json();
    } finally { clearTimeout(timer); }
  }
  async init() {
    if (this.manifest) return this.manifest;
    const data = await this.request('manifest.json');
    if (data.total !== 6236 || data.surahs?.length !== 114 || !data.batchSize) throw new Error('The reading library could not be verified.');
    this.manifest = data; return data;
  }
  reference(id) {
    const match = /^(?:q|dua)-(\d+)-(\d+)$/.exec(id);
    if (!match || !this.manifest) return null;
    const surah = this.manifest.surahs[Number(match[1]) - 1], ayah = Number(match[2]);
    if (!surah || ayah < 1 || ayah > surah.count) return null;
    return { surah, ayah, number: surah.start + ayah - 1 };
  }
  references(surahNumber) {
    if (!this.manifest) return [];
    return this.manifest.surahs.filter(s => !surahNumber || s.number === Number(surahNumber)).flatMap(s => Array.from({ length:s.count }, (_,i) => `q-${s.number}-${i+1}`));
  }
  fromNumber(number) {
    const surah = this.manifest?.surahs.find(s => number >= s.start && number < s.start + s.count);
    return surah ? `q-${surah.number}-${number-surah.start+1}` : null;
  }
  peek(id) { return this.loaded.get(id); }
  placeholder(id) {
    const ref = this.reference(id);
    return ref ? { id, title:`Surah ${ref.surah.englishName} · ${ref.ayah}`, reference:`Surah ${ref.surah.englishName}`, verse:`${ref.surah.number}:${ref.ayah}`, type:id.startsWith('dua-')?'dua':'quran', pending:true } : null;
  }
  makePost(verse, isDua = false) {
    const surah = this.manifest.surahs[verse.surah-1];
    const selection = duaSelections.find(d => d[0] === verse.surah && d[1] === verse.ayah);
    const themes = [['emerald-valley.jpg','forest'],['desert.jpg','sand'],['ocean.jpg','ocean']];
    const [image,theme] = themes[Math.floor((verse.surah-1)/3)%themes.length];
    return {
      id:`${isDua?'dua':'q'}-${verse.surah}-${verse.ayah}`, type:isDua?'dua':'quran', title:isDua&&selection?selection[2]:`${surah.englishName} · Ayah ${verse.ayah}`,
      image,theme,arabic:verse.arabic,text:verse.text,reference:`Surah ${surah.englishName}`,verse:`${verse.surah}:${verse.ayah}`,
      source:`https://quran.com/${verse.surah}/${verse.ayah}`,audio:`${String(verse.surah).padStart(3,'0')}${String(verse.ayah).padStart(3,'0')}`,
      audioUrl:`https://cdn.islamic.network/quran/audio/128/ar.alafasy/${verse.number}.mp3`,
      translator:'Marmaduke Pickthall · English translation',edition:'en.pickthall',arabicSource:'Tanzil / Al Quran Cloud',surah:verse.surah,ayah:verse.ayah,number:verse.number,juz:verse.juz,
      moods:isDua&&selection?[selection[3]]:[],tags:isDua?['Qur’anic du’a',surah.englishName]:[surah.englishName,`Juz ${verse.juz}`],
      reflection:isDua?'This card includes the complete ayah containing the supplication. Read the surrounding verses to understand its context.':'Read this complete ayah alongside its surrounding verses. English conveys a translation of the meaning; the Arabic text is preserved as supplied by its source.',
      prompt:'What would you like to reflect on as you read this ayah?',
    };
  }
  async load(id) {
    if (this.loaded.has(id)) return this.loaded.get(id);
    const ref = this.reference(id); if (!ref) return null;
    const batch = Math.floor((ref.number-1)/this.manifest.batchSize);
    if (!this.pending.has(batch)) {
      this.pending.set(batch, this.request(`batch-${batch}.json`).then(data => {
        if (!Array.isArray(data.verses) || !data.verses.length || data.verses.some(v=>!v.arabic||!v.text)) throw new Error('This section could not be verified.');
        for (const verse of data.verses) {
          const post = this.makePost(verse); this.loaded.set(post.id,post);
          if (duaSelections.some(d=>d[0]===verse.surah&&d[1]===verse.ayah)) { const dua=this.makePost(verse,true); this.loaded.set(dua.id,dua); }
        }
        this.batches.add(batch);
      }).finally(() => this.pending.delete(batch)));
    }
    await this.pending.get(batch);
    return this.loaded.get(id) || null;
  }
  async loadMany(ids) {
    // At most four outstanding chapter batches, including saved-item hydration.
    const queue = [...new Set(ids)].filter(id=>this.reference(id));
    await Promise.all(Array.from({length:Math.min(4,queue.length)}, async()=>{while(queue.length) await this.load(queue.shift());}));
  }
  async search(query, limit = 24) {
    const q=normalizeSearch(query.trim()); if (!q || !this.manifest) return {posts:[],total:0};
    const exact=/^(\d{1,3}):(\d{1,3})$/.exec(q);
    if (exact) { const p=await this.load(`q-${Number(exact[1])}-${Number(exact[2])}`); return {posts:p?[p]:[],total:p?1:0}; }
    const surahs=this.manifest.surahs.filter(s=>[s.name,s.englishName,s.meaning,`surah ${s.number}`].some(t=>normalizeSearch(t).includes(q)));
    if (!this.searchIndex) {
      if (!this.searchPromise) this.searchPromise=this.request('search.json').then(data=>{this.searchIndex=data.verses.map(v=>({number:v[0],haystack:normalizeSearch(`${v[1]} ${v[2]}`)}));}).finally(()=>{this.searchPromise=null;});
      await this.searchPromise;
    }
    const chapterNumbers=new Set(surahs.map(s=>s.number));
    const matches=this.searchIndex.filter(v=>v.haystack.includes(q)||chapterNumbers.has(this.reference(this.fromNumber(v.number)).surah.number));
    const ids=matches.slice(0,limit).map(v=>this.fromNumber(v.number));
    await this.loadMany(ids); return {posts:ids.map(id=>this.peek(id)),total:matches.length};
  }
}

export const canonicalVerse = post => {
  if (post.surah && post.ayah) return `${post.surah}:${post.ayah}`;
  if (post.type==='quran'||post.type==='dua') return post.verse?.match(/(\d+):(\d+)/)?.[0] || null;
  return null;
};

export function buildFeedPool({curated,library,category='all',mood=null,collection=null,surah=null,seen=[]}) {
  const selected=curated.filter(p=>(category==='all'||p.type===category)&&(!mood||p.moods.includes(mood))&&(!collection||collection.includes(p.id)));
  if (collection) return selected.map(p=>p.id);
  const duaIds=library.manifest?duaSelections.filter(d=>!mood||d[3]===mood).map(d=>`dua-${d[0]}-${d[1]}`):[];
  if (category==='quran'&&!mood&&library.manifest) return library.references(surah);
  if (category==='dua') return [...selected.map(p=>p.id),...duaIds];
  if (category!=='all'||mood) return [...selected.map(p=>p.id),...(category==='all'?duaIds:[])];
  const covered=new Set(curated.map(canonicalVerse).filter(Boolean));
  const replacements=new Map(duaIds.map(id=>[id.slice(4).replace('-',':'),id]));
  const quran=library.references().filter(id=>!covered.has(id.slice(2).replace('-',':'))).map(id=>replacements.get(id.slice(2).replace('-',':'))||id);
  const first=selected.slice(0,10).map(p=>p.id), remaining=selected.slice(10).map(p=>p.id), pool=[...first];
  quran.forEach((id,i)=>{pool.push(id);if(i%4===3&&remaining.length)pool.push(remaining.shift());});
  pool.push(...remaining);
  const unique=[...new Set(pool)], viewed=new Set(seen);
  return [...unique.filter(id=>!viewed.has(id)),...unique.filter(id=>viewed.has(id))];
}
