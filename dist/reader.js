import {icon} from './icons.js';
import {photoFor,photoForTheme,photoAttributes,photoTone} from './photography.js';
import {RecitationSession,reciters,getReciter} from './recitation.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time=n=>Number.isFinite(n)?`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`:'0:00';

export class SurahReader {
  constructor({library,audio,preferences,setPreference,isSaved,onSave,onSource,onReflect,onResume,onChangeSurah,onBack,onMarkRead}){
    Object.assign(this,{library,audio,preferences,setPreference,isSaved,onSave,onSource,onReflect,onResume,onChangeSurah,onBack,onMarkRead});
    this.session=new RecitationSession({audio,load:id=>library.load(id),preferences,onChange:()=>this.update()});
    this.mode='read';this.revealed=false;this.mountVersion=0;this.posts=[];this.lastAyah=null;this.showTranslation=true;this.textSize='comfortable';
  }
  shell(){return `<section class="reader" aria-label="Surah reader"><div class="reader-loading" role="status">${icon('book')} Opening your reading space…</div></section>`;}
  async mount(root,surahNumber,ayah=1){
    this.root=root;const token=++this.mountVersion;this.loading=true;this.error=false;this.lastAyah=null;this.lastFollow=null;this.posts=[];
    this.surah=this.library.manifest.surahs[Number(surahNumber)-1];if(!this.surah)return;
    this.session.activate(this.surah.number,this.surah.count,ayah);this.mode='read';this.revealed=false;
    this.showTranslation=this.preferences().translation;this.textSize=this.preferences().large?'large':'comfortable';this.render();
    try{
      const ids=this.library.references(this.surah.number);await this.library.loadMany(ids);
      if(token!==this.mountVersion||!root.isConnected)return;
      this.posts=ids.map(id=>this.library.peek(id));this.loading=false;this.render();
      await this.session.select(this.session.current);this.remember(this.session.current);this.observeReading();
      if(ayah>1)this.scrollToAyah(ayah);
    }catch{if(token===this.mountVersion&&root.isConnected){this.loading=false;this.error=true;this.render();}}
  }
  unmount(){this.mountVersion++;this.session.deactivate();this.observer?.disconnect();clearTimeout(this.readTimer);this.root=null;}
  pause(){if(this.session.enabled)this.session.pause();}
  options(){return this.posts.map(p=>`<option value="${p.ayah}">${p.ayah}</option>`).join('');}
  render(){
    if(!this.root?.isConnected)return;
    const optionsOpen=this.root.querySelector('.reader-options')?.open??innerWidth>760;
    const s=this.surah,c=this.session,opts=this.options(),saved=this.isSaved(`q-${s.number}-${c.current}`);
    const cover=this.posts[c.current-1]?photoFor(this.posts[c.current-1]):photoForTheme('prayer',s.number);
    this.root.innerHTML=`<section class="reader ${this.mode==='practice'?'is-practicing':''} reader-type-${this.textSize}" aria-label="Surah reader">
      <div class="reader-navigation"><button class="reader-back" data-reader-action="back">${icon('arrow')} Back to your feed</button><button class="reader-browse" data-action="surahs">${icon('book')} All surahs</button></div>
      <header class="reader-cover" style="${photoTone(cover)}"><img class="reader-cover-photo" ${photoAttributes(cover, "(max-width:600px) 100vw, 900px")} alt=""/><span class="reader-kicker">Surah ${s.number}</span><h1>${esc(s.englishName)}</h1><p>${esc(s.meaning)} <span>·</span> ${s.count} ayahs <span>·</span> ${esc(s.revelation)}</p><div class="reader-surah-arabic" dir="rtl" lang="ar">${esc(s.name)}</div><div class="reader-cover-bottom"><span>${icon('book')} Read the complete surah</span><button data-reader-action="play-from-here" ${this.loading||this.error?'disabled':''}>${icon('play')} Listen from ayah <b data-reader-current>${c.current}</b></button></div></header>
      <div class="reader-mode-row"><div class="reader-modes" role="tablist" aria-label="Reading mode"><button role="tab" aria-selected="${this.mode==='read'}" data-reader-action="mode" data-mode="read">${icon('book')} Read</button><button role="tab" aria-selected="${this.mode==='practice'}" data-reader-action="mode" data-mode="practice">${icon('headphones')} Memorize</button></div><label class="reader-jump">Go to ayah <select aria-label="Go to ayah" data-reader-setting="jump" ${this.loading?'disabled':''}>${opts||`<option>${c.current}</option>`}</select></label></div>
      ${this.loading?`<div class="reader-loading" role="status">${icon('book')} Preparing ${s.count} ayahs…</div>`:this.error?`<div class="reader-load-error" role="alert"><h2>Your place is still here.</h2><p>This surah couldn’t load. Check your connection and try again.</p><button class="primary-button" data-reader-action="retry">Try again</button></div>`:`<div class="reader-layout"><div class="reader-pages">${this.mode==='read'?`<div class="reader-reading-note">Arabic text with ${this.showTranslation?'Marmaduke Pickthall’s English translation.':'translation hidden.'} <button data-action="about">About the sources ${icon('external')}</button></div><div class="reader-verses">${this.posts.map(p=>this.verse(p)).join('')}</div><div class="reader-chapter-end">${icon('leaf')}<h2>A moment to let it settle.</h2><p>You’ve reached the end of ${esc(s.englishName)}.</p>${s.number<114?`<button class="primary-button" data-reader-action="next-surah">Read ${esc(this.library.manifest.surahs[s.number].englishName)} ${icon('arrow')}</button>`:`<button class="primary-button" data-action="surahs">Choose another surah ${icon('book')}</button>`}</div>`:`<div class="practice-intro"><span class="reader-kicker">LISTEN. RECALL. RETURN.</span><h2>One ayah at a time.</h2><p>Listen closely, try reciting from memory, then reveal the text when you’re ready.</p></div><div id="practice-card">${this.practiceCard()}</div><div class="practice-navigation"><button data-reader-action="previous">${icon('arrow')} Previous ayah</button><span data-practice-position></span><button data-reader-action="next">Next ayah ${icon('arrow')}</button></div>`}</div><aside class="reader-tools" aria-label="Reading and listening options"><details class="reader-options" ${optionsOpen?'open':''}><summary>${icon('settings')} Your reading space ${icon('down')}</summary><div class="reader-options-body"><label class="reader-option-label" for="reader-reciter">RECITER</label><select id="reader-reciter" data-reader-setting="reciter">${reciters.map(r=>`<option value="${r.id}" ${this.preferences().reciter===r.id?'selected':''}>${r.name}</option>`).join('')}</select><div class="reader-two-options"><label>Speed<select aria-label="Recitation speed" data-reader-setting="speed">${[.75,1,1.25].map(n=>`<option value="${n}" ${Number(this.preferences().speed)===n?'selected':''}>${n}×</option>`).join('')}</select></label><label>Repeat each ayah<select aria-label="Repeat each ayah" data-reader-setting="repeat">${[[1,'Once'],[3,'3 times'],[5,'5 times'],['forever','Until I move on']].map(([n,label])=>`<option value="${n}" ${(n==='forever'?c.repeat===Infinity:c.repeat===n)?'selected':''}>${label}</option>`).join('')}</select></label></div>${this.mode==='practice'?`<div class="practice-range"><span class="reader-option-label">PRACTICE RANGE</span><div class="reader-two-options"><label>From ayah<select aria-label="Practice from ayah" data-reader-setting="from">${opts}</select></label><label>To ayah<select aria-label="Practice to ayah" data-reader-setting="to">${opts}</select></label></div><p>Each ayah repeats before the next begins. Playback stops at the end of your range.</p></div>`:''}<div class="reader-display-options"><label><span>English translation</span><input type="checkbox" data-reader-setting="translation" ${this.showTranslation?'checked':''}/></label><label><span>Larger Arabic</span><input type="checkbox" data-reader-setting="size" ${this.textSize==='large'?'checked':''}/></label></div><div class="reader-place"><span class="reader-option-label">SELECTED AYAH</span><strong>${esc(s.englishName)} <span data-reader-place>${s.number}:${c.current}</span></strong><p>Your reading position is saved on this device.</p><button data-reader-action="save-current" aria-pressed="${saved}">${icon('bookmark')} <span>${saved?'Saved ayah':'Save this ayah'}</span></button></div><p class="reader-audio-note">${icon('headphones')} Audio needs a connection. Choose a reciter, press play, and take your time.</p></div></details></aside></div>`}
      <div class="reader-player" aria-label="Surah audio player"><div class="reader-player-info"><span class="reader-player-art">${icon('book')}</span><div><strong>${esc(s.englishName)} <span>· Ayah <b data-reader-current>${c.current}</b></span></strong><small id="reader-player-reciter">${getReciter(this.preferences().reciter).name}</small></div></div><div class="reader-play-controls"><button data-reader-action="previous" aria-label="Previous ayah">${icon('chevron')}</button><button class="reader-play-main" data-reader-action="play" aria-label="Play recitation" ${this.loading||this.error?'disabled':''}>${icon('play')}</button><button data-reader-action="next" aria-label="Next ayah">${icon('chevron')}</button></div><div class="reader-player-timeline"><input type="range" aria-label="Ayah recitation position" data-reader-setting="seek" min="0" max="100" step=".1" value="0"/><div><span id="reader-time">0:00 / 0:00</span><span id="reader-play-status" role="status">Ready when you are</span></div></div></div>
    </section>`;
    this.root.querySelector('[data-reader-setting="jump"]').value=c.current;
    for(const [name,value]of [['from',c.start],['to',c.end]]){const select=this.root.querySelector(`[data-reader-setting="${name}"]`);if(select)select.value=value;}
    this.root.onclick=e=>this.click(e);this.root.onchange=e=>this.change(e);this.root.oninput=e=>{if(e.target.dataset.readerSetting==='seek'&&Number.isFinite(this.audio.duration))this.audio.currentTime=Number(e.target.value)/100*this.audio.duration;};
    this.update();
  }
  verse(p){return `<article class="reader-ayah ${p.ayah===this.session.current?'is-current':''}" data-ayah="${p.ayah}" id="reader-ayah-${p.ayah}" aria-current="${p.ayah===this.session.current}" tabindex="-1"><div class="reader-ayah-top"><button class="ayah-number" data-reader-action="select" data-ayah="${p.ayah}" aria-label="Select ayah ${p.ayah}">${this.surah.number}:${p.ayah}</button><div class="ayah-actions"><button data-reader-action="play-ayah" data-ayah="${p.ayah}" aria-label="Play ayah ${p.ayah}">${icon('play')}</button><button data-reader-action="save" data-ayah="${p.ayah}" aria-label="Save ayah ${p.ayah}" aria-pressed="${this.isSaved(p.id)}">${icon('bookmark')}</button><button data-reader-action="reflect" data-ayah="${p.ayah}" aria-label="Reflect on ayah ${p.ayah}">${icon('pen')}</button><button data-reader-action="source" data-ayah="${p.ayah}" aria-label="Source for ayah ${p.ayah}">${icon('info')}</button></div></div><p class="reader-arabic" lang="ar" dir="rtl">${esc(p.arabic)}</p><p class="reader-translation" ${this.showTranslation?'':'hidden'}>${esc(p.text)}</p></article>`;}
  practiceCard(){
    const p=this.posts[this.session.current-1];if(!p)return '';
    return `<article class="practice-card ${this.revealed?'is-revealed':''}"><div class="practice-card-top"><span>${esc(this.surah.englishName)} · ${p.verse}</span><span>${icon('headphones')} Listen & recall</span></div>${this.revealed?`<p class="reader-arabic" lang="ar" dir="rtl">${esc(p.arabic)}</p>${this.showTranslation?`<p class="reader-translation">${esc(p.text)}</p>`:''}`:`<div class="practice-hidden"><h3>Recite from memory.</h3><p>Play this ayah. Pause and recite what you remember.</p></div>`}<button class="practice-reveal" data-reader-action="reveal">${icon(this.revealed?'reset':'book')} ${this.revealed?'Hide text and try again':'Reveal the ayah'}</button></article>`;
  }
  update(){
    if(!this.root?.isConnected||!this.session.enabled)return;
    const c=this.session,changed=this.lastAyah!==c.current;
    if(c.wantsPlay&&this.mode==='read'&&this.lastFollow!==c.current){this.lastFollow=c.current;this.scrollToAyah(c.current);}
    if(changed){
      this.lastAyah=c.current;this.revealed=false;
      this.root.querySelectorAll('.reader-ayah').forEach(el=>{el.classList.toggle('is-current',Number(el.dataset.ayah)===c.current);el.setAttribute('aria-current',Number(el.dataset.ayah)===c.current?'true':'false');});
      if(this.mode==='practice'&&this.root.querySelector('#practice-card'))this.root.querySelector('#practice-card').innerHTML=this.practiceCard();
      if(!this.loading&&!this.error){this.remember(c.current);if(c.wantsPlay&&this.mode==='read')this.scrollToAyah(c.current);}
    }
    this.root.querySelectorAll('[data-reader-current]').forEach(el=>el.textContent=c.current);
    const place=this.root.querySelector('[data-reader-place]');if(place)place.textContent=`${this.surah.number}:${c.current}`;
    const jump=this.root.querySelector('[data-reader-setting="jump"]');if(jump)jump.value=c.current;
    const position=this.root.querySelector('[data-practice-position]');if(position)position.textContent=`${c.current-c.start+1} of ${c.end-c.start+1}`;
    this.root.querySelectorAll('[data-reader-action="previous"]').forEach(b=>b.disabled=c.current<=c.start||this.loading);
    this.root.querySelectorAll('[data-reader-action="next"]').forEach(b=>b.disabled=c.current>=c.end||this.loading);
    const play=this.root.querySelector('.reader-play-main');if(play){play.innerHTML=icon(c.wantsPlay?'pause':'play');play.setAttribute('aria-label',c.wantsPlay?'Pause recitation':c.status==='error'?'Retry recitation':'Play recitation');}
    const slider=this.root.querySelector('[data-reader-setting="seek"]');if(slider){slider.value=this.audio.duration?this.audio.currentTime/this.audio.duration*100:0;slider.setAttribute('aria-valuetext',`${time(this.audio.currentTime)} of ${time(this.audio.duration)}`);}
    const clock=this.root.querySelector('#reader-time');if(clock)clock.textContent=`${time(this.audio.currentTime)} / ${time(this.audio.duration)}`;
    const status=this.root.querySelector('#reader-play-status');if(status){const text=c.status==='error'?'Audio unavailable · tap play to retry':c.status==='finished'?'Reading complete':c.status==='loading'?'Loading recitation…':c.repeat!==1?`Repeat ${Math.min(c.completed+1,c.repeat)} of ${c.repeat===Infinity?'∞':c.repeat}`:c.wantsPlay?'Listening':'Ready when you are';if(status.textContent!==text)status.textContent=text;}
    const reciter=this.root.querySelector('#reader-player-reciter');if(reciter)reciter.textContent=getReciter(this.preferences().reciter).name;
    const save=this.root.querySelector('[data-reader-action="save-current"]');if(save){const saved=this.isSaved(`q-${this.surah.number}-${c.current}`);save.setAttribute('aria-pressed',saved);save.querySelector('span').textContent=saved?'Saved ayah':'Save this ayah';}
  }
  remember(ayah){const p=this.posts[ayah-1];if(p)this.onResume(p);}
  syncSaves(post){if(!this.root)return;this.root.querySelectorAll(`[data-reader-action="save"][data-ayah="${post.ayah}"]`).forEach(button=>button.setAttribute('aria-pressed',this.isSaved(post.id)));this.update();}
  observeReading(){
    this.observer?.disconnect();if(this.mode!=='read'||!this.root)return;
    this.observer=new IntersectionObserver(entries=>{
      if(this.session.wantsPlay)return;
      const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>Math.abs(a.boundingClientRect.top-120)-Math.abs(b.boundingClientRect.top-120));
      if(!visible.length)return;const ayah=Number(visible[0].target.dataset.ayah);clearTimeout(this.readTimer);
      this.readTimer=setTimeout(()=>{if(this.root?.isConnected&&!document.hidden&&!this.session.wantsPlay){this.remember(ayah);this.onMarkRead(this.posts[ayah-1]);}},1800);
    },{rootMargin:'-100px 0px -45% 0px',threshold:0});
    this.root.querySelectorAll('.reader-ayah').forEach(el=>this.observer.observe(el));
  }
  scrollToAyah(ayah){requestAnimationFrame(()=>this.root?.querySelector(`#reader-ayah-${ayah}`)?.scrollIntoView({behavior:'instant',block:'start'}));}
  async click(event){
    const button=event.target.closest('[data-reader-action]');if(!button)return;
    const action=button.dataset.readerAction,ayah=Number(button.dataset.ayah)||this.session.current,p=this.posts[ayah-1],c=this.session;
    if(action==='back')return this.onBack();
    if(action==='retry')return this.mount(this.root,this.surah.number,c.current);
    if(action==='mode'){
      if(button.dataset.mode===this.mode)return;
      c.pause();this.mode=button.dataset.mode;this.revealed=false;
      c.setRange(this.mode==='practice'?c.current:1,this.mode==='practice'?Math.min(c.current+4,this.surah.count):this.surah.count);
      c.setRepeat(this.mode==='practice'?3:1);this.render();this.observeReading();return;
    }
    if(action==='reveal'){this.revealed=!this.revealed;this.root.querySelector('#practice-card').innerHTML=this.practiceCard();this.root.querySelector('.practice-reveal').focus({preventScroll:true});return;}
    if(action==='play'||action==='play-from-here'){c.toggle();return;}
    if(action==='previous'||action==='next'){const target=c.current+(action==='next'?1:-1);await c.select(target,c.wantsPlay);if(this.mode==='read')this.scrollToAyah(c.current);return;}
    if(action==='select'||action==='play-ayah'){await c.select(ayah,action==='play-ayah');return;}
    if(action==='save'||action==='save-current'){this.onSave(p);this.root.querySelectorAll(`[data-reader-action="save"][data-ayah="${ayah}"]`).forEach(b=>b.setAttribute('aria-pressed',this.isSaved(p.id)));this.update();return;}
    if(action==='source')return this.onSource(p);
    if(action==='reflect')return this.onReflect(p);
    if(action==='next-surah')return this.onChangeSurah(this.surah.number+1,1);
  }
  async change(event){
    const key=event.target.dataset.readerSetting,value=event.target.value,c=this.session;if(!key)return;
    if(key==='reciter'){this.setPreference('reciter',value);await c.changeReciter();}
    if(key==='speed'){this.setPreference('speed',Number(value));this.audio.playbackRate=Number(value);}
    if(key==='repeat')c.setRepeat(value);
    if(key==='translation'){this.showTranslation=event.target.checked;this.setPreference('translation',this.showTranslation);this.render();this.observeReading();}
    if(key==='size'){this.textSize=event.target.checked?'large':'comfortable';this.setPreference('large',event.target.checked);this.root.querySelector('.reader').classList.toggle('reader-type-large',event.target.checked);}
    if(key==='jump'){
      const ayah=Number(value);if(ayah<c.start||ayah>c.end){c.setRange(1,this.surah.count);this.render();this.observeReading();}
      await c.select(ayah);if(this.mode==='read')this.scrollToAyah(ayah);
    }
    if(key==='from'||key==='to'){
      let start=Number(this.root.querySelector('[data-reader-setting="from"]').value),end=Number(this.root.querySelector('[data-reader-setting="to"]').value);
      if(start>end){if(key==='from')end=start;else start=end;}
      c.setRange(start,end);await c.select(c.current);this.revealed=false;this.render();
    }
  }
}
