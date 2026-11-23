import { categories, moods, posts as starterPosts, collections } from './content.js';
import { extraHadith } from './hadith-content.js';
import { QuranLibrary, buildFeedPool, normalizeSearch, canonicalVerse } from './library.js';
import { FeedWindow } from './feed-window.js';
import { SurahReader } from './reader.js';
import { reciters, getReciter, recitationURL } from './recitation.js';
import { PersonalLibrary } from './personal-library.js';
import { renderPersonalLibrary, personalPost } from './personal-ui.js';
import { scrollReadingKey } from './reading-keyboard.js';
import { TodayView } from './today.js';
import { renderShareImage, canvasBlob, SHARE_FORMATS } from './share-image.js';
import { registerOffline, promptInstall } from './offline.js';
const posts = [...starterPosts, ...extraHadith];
const quran = new QuranLibrary();
const curatedById = new Map(posts.map(p => [p.id, p]));
const findPost = id => curatedById.get(id) || quran.peek(id) || quran.placeholder(id);
const audioSource = post => {
  if(!post.audioUrl&&getReciter(state.preferences.reciter).id==='ar.alafasy')return `/assets/audio/${post.audio}.mp3`;
  const ref=canonicalVerse(post),number=post.number||(ref?quran.reference(`q-${ref.replace(':','-')}`)?.number:null);
  if(number)return recitationURL(number,state.preferences.reciter);
  return null;
};
import { icon, brand } from './icons.js';
import { photoFor, photoForTheme, photoAttributes, photoTone } from './photography.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const readStore = (key, fallback) => { try { return JSON.parse(localStorage.getItem(`noor:${key}`)) ?? fallback; } catch { return fallback; } };
const writeStore = (key, value) => { try { localStorage.setItem(`noor:${key}`, JSON.stringify(value)); return true; } catch { toast('Your browser could not save this. Please allow local storage.'); return false; } };
const defaultPreferences = { appearance: 'editorial', dark: false, large: false, translation: true, transliteration: true, autoplay: false, speed: 1, goal: 5, reciter:'ar.alafasy' };
const saved = readStore('saved', []);
const liked = readStore('liked', []);
const storedNotes = readStore('notes', {});
const storedRead = readStore('read', {});
const personal=new PersonalLibrary({read:readStore,write:writeStore,legacyRead:storedRead,legacyResume:readStore('last-read',null)});
const state = {
  view: 'today', category: 'all', mood: null, collection: null, surah: null, active: 0, libraryTab: 'saved', personalCollection:null, libraryLimit:60, focus: false, libraryError: false,
  saved: Array.isArray(saved) ? saved : [], liked: Array.isArray(liked) ? liked : [],
  notes: storedNotes && typeof storedNotes === 'object' && !Array.isArray(storedNotes) ? storedNotes : {},
  read: storedRead && typeof storedRead === 'object' && !Array.isArray(storedRead) ? storedRead : {},
  preferences: { ...defaultPreferences, ...readStore('preferences', {}) },
  intention: readStore('intention', null),
};
const today = () => new Date().toLocaleDateString('en-CA');
const todayReads = () => Array.isArray(state.read[today()]) ? state.read[today()] : [];
const activePost = () => findPost(feedWindow?.idAt(state.active));
const audio = new Audio();
audio.preload = 'metadata';
let audioId = null, currentPosts = [], observer, readTimer, toastTimer, lastFocus;
let feedWindow, renderGeneration = 0, scrollTimer, navigationTarget = null, searchGeneration = 0, searchTimer, continueRecitation = false;
const failedCards = new Set();
const dialog = $('#dialog');
const fmtTime = value => Number.isFinite(value) ? `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}` : '0:00';
const categoryFor = type => categories.find(c => c.id === type);
let readerTarget={surah:1,ayah:1},feedReturn=null;
const reader=new SurahReader({library:quran,audio,preferences:()=>state.preferences,
  setPreference:(key,value)=>{state.preferences[key]=value;savePreferences();},
  isSaved:id=>state.saved.includes(id),onSave:post=>toggleSave(post),onSource:sourceDialog,onReflect:reflectionDialog,
  onResume:post=>{writeStore('last-read',{id:post.id,label:`${post.reference} ${post.verse}`});personalChange(()=>personal.setResume(post.id,'reader'));},
  onChangeSurah:openReader,onBack:backFromReader,
  onMarkRead:post=>{if(!post)return;personalChange(()=>personal.record(post.id,'reader'));const items=todayReads();if(!items.includes(post.id)){state.read[today()]=[...items,post.id];writeStore('read',state.read);}},
});

const todayView=new TodayView({quran,read:readStore,write:writeStore,icon,escape,toast:(...a)=>toast(...a),personal,getRead:()=>state.read,openReader:(...a)=>openReader(...a)});
let shareState={id:null,format:'post',blob:null,url:null};
let toastAction=null;
function toast(message,actionLabel,action) {
  toastAction=action||null;
  const el=$('#toast');el.innerHTML=`<span>${escape(message)}</span>${actionLabel?`<button data-action="toast-action">${escape(actionLabel)}</button>`:''}`;el.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>{el.classList.remove('show');el.replaceChildren();toastAction=null;},action?8000:3200);
}

function savePreferences() { writeStore('preferences', state.preferences); applyPreferences(); }
function applyPreferences() {
  state.preferences.dark = state.preferences.appearance === 'immersive';
  document.body.classList.add('photographic');
  document.body.classList.toggle('dark', state.preferences.dark);
  document.body.classList.toggle('editorial', !state.preferences.dark);
  document.body.classList.toggle('large-text', state.preferences.large);
  document.body.classList.toggle('hide-translation', !state.preferences.translation);
  document.body.classList.toggle('hide-transliteration', !state.preferences.transliteration);
  document.body.classList.toggle('reader-open',state.view==='reader');
  document.body.classList.toggle('feed-open',state.view==='feed');
  document.body.classList.toggle('today-open',state.view==='today');
  document.body.classList.toggle('focus-mode', state.focus);
  audio.playbackRate = Number(state.preferences.speed) || 1;
  $('meta[name="theme-color"]').content = state.preferences.dark ? '#101516' : '#f0f0e9';
  resetAutoFlow();
  requestAnimationFrame(fitCards);
}
function setAppearance(value) {
  if(!['editorial','immersive'].includes(value))return;
  state.preferences.appearance=value;
  savePreferences();
  const button=$('.theme-toggle');
  if(button){button.innerHTML=icon(state.preferences.dark?'sun':'moon');button.setAttribute('aria-label',`Switch to ${state.preferences.dark?'Daylight':'Nightfall'} theme`);button.title=state.preferences.dark?'Daylight: light interface':'Nightfall: dark interface';}
  requestAnimationFrame(fitCards);
}
function resetAutoFlow() {
  // Only layout-promoted cards may return to a centred composition. Explicitly
  // long passages retain their reading position and contained scrolling.
  for(const slide of $$('.feed-slide.flowing-verse')){
    const post=findPost(slide.dataset.id);
    if(!post||post.pending||(post.arabic?.length||0)>240||post.text.length>320)continue;
    slide.classList.remove('flowing-verse');$('.long-ayah-hint',slide)?.remove();
    const body=$('.slide-body',slide);body.removeAttribute('tabindex');body.removeAttribute('aria-label');
  }
}

function getPosts() {
  return buildFeedPool({ curated: posts, library: quran, category: state.category, mood: state.mood,
    collection: state.collection ? collections.find(c => c.id === state.collection)?.posts : null,
    surah: state.surah, seen: Object.values(state.read).filter(Array.isArray).flat() });
}
function feedCards() { return feedWindow.entries().map(({ id, index }) => card(findPost(id), index)).join(''); }
function navButton(view, label, glyph, category) {
  const active = state.view === view && (view !== 'feed' || state.category === (category || 'all'));
  return `<button class="nav-button ${active ? 'active' : ''}" data-action="navigate" data-view="${view}" ${category ? `data-category="${category}"` : ''} ${active ? 'aria-current="page"' : ''}>${icon(glyph)}<span class="nav-label">${label}</span>${view === 'library' && state.saved.length ? `<span class="library-count">${state.saved.length}</span>` : ''}</button>`;
}
function sidebar() {
  return `<aside class="sidebar"><button class="brand" data-action="navigate" data-view="today" aria-label="Noor home"><span class="brand-word">noor</span><span class="brand-arabic" lang="ar" dir="rtl">نور</span></button><nav class="nav" aria-label="Main navigation">${navButton('today', 'Today', 'sunrise')}${navButton('feed', 'Your feed', 'home')}${navButton('explore', 'Explore', 'compass')}${navButton('library', 'Library', 'bookmark')}</nav><div class="nav-heading">Library</div><nav class="nav content-nav" aria-label="Content library">${navButton('feed', 'Qur’an', 'book', 'quran')}${navButton('feed', 'Du’a', 'hands', 'dua')}${navButton('feed', 'Hadith', 'hadith', 'hadith')}${navButton('feed', 'Stories', 'stories', 'story')}</nav><div class="sidebar-bottom"><button class="nav-button" data-action="reflections">${icon('pen')}<span class="nav-label">Reflections</span></button><button class="nav-button install-button" data-action="install">${icon('download')}<span class="nav-label">Install Noor</span></button><button class="nav-button" data-action="settings">${icon('settings')}<span class="nav-label">Preferences</span></button><button class="sidebar-footer" data-action="about">About Noor ${icon('external')}</button></div></aside>`;
}
function topbar() {
  return `<header class="topbar"><button class="mobile-brand" data-action="navigate" data-view="today" aria-label="Noor home">noor</button><span class="workspace-title">${state.view === 'reader' ? 'The Qur’an' : state.view === 'explore' ? 'Explore the library' : state.view === 'today' ? 'Today, in remembrance' : state.view === 'library' ? 'Your personal library' : 'A space for remembrance'}</span><div class="topbar-actions"><button class="search-trigger" data-action="search" aria-label="Search Noor">${icon('search')}<span>Search the library</span><kbd>⌘ K</kbd></button><button class="icon-button theme-toggle" data-action="theme" aria-label="Switch to ${state.preferences.dark ? 'Daylight' : 'Nightfall'} theme" title="${state.preferences.dark ? 'Daylight: light interface' : 'Nightfall: dark interface'}">${icon(state.preferences.dark ? 'sun' : 'moon')}</button><button class="icon-button" data-action="settings" aria-label="Reading preferences">${icon('settings')}</button></div></header>`;
}
function dailyProgress() {
  const count = todayReads().length, goal = Number(state.preferences.goal);
  return `<div class="progress-heading">Your daily moment <span>${Math.min(count, goal)} of ${goal} reflections</span></div><div class="progress-bar" role="progressbar" aria-label="Daily reading progress" aria-valuenow="${Math.min(count, goal)}" aria-valuemin="0" aria-valuemax="${goal}">${Array.from({ length: goal }, (_, i) => `<div class="progress-segment ${i < count ? 'filled' : ''}"></div>`).join('')}</div><p class="progress-caption">${count >= goal ? 'A little light, carried into your day. Beautiful.' : 'Small moments. A beautiful difference.'}</p>`;
}
function readingContext() {
  const post=state.view==='feed'?activePost():null;
  if(!post||post.pending)return `<div class="context-label">The Qur’an</div><h2>Read at your pace.</h2><p class="context-description">Explore all 114 surahs, listen to recitation, or practise memorisation.</p><button class="context-primary" data-action="surahs">Open the Qur’an ${icon('book')}</button>`;
  return `<div class="context-label">${post.type==='story'?'Behind the story':'You’re reading'}</div><h2>${escape(post.reference)}</h2><p class="context-reference">${escape(post.verse)}${post.excerpt?' · Excerpt':''}</p><div class="context-source">${icon('book')}<div><strong>${post.type==='hadith'?'Hadith collection':post.type==='story'?'Editorial reflection':'Translation of the meaning'}</strong><span>${escape(post.translator||post.narrator||'Based on the Qur’anic account')}</span></div></div><button class="context-primary" data-action="${canonicalVerse(post)?'continue-surah':'source'}" data-id="${post.id}">${canonicalVerse(post)?'Read in its surah':'Read the full context'} ${icon('arrow')}</button><button class="context-link" data-action="source" data-id="${post.id}">Source & details ${icon('external')}</button>`;
}
function rightSidebar() {
  const last=readStore('last-read',null);
  return `<aside class="right-sidebar" aria-label="Reading context"><section id="reading-context" class="reading-context">${readingContext()}</section><section class="context-library"><div class="context-section-title">Keep reading</div><button class="context-library-row" data-action="surahs">${icon('book')}<span><strong>Browse the Qur’an</strong><small>114 surahs, in full</small></span>${icon('chevron')}</button>${last?.id?`<button class="context-library-row" data-action="open-reader" data-id="${escape(last.id)}">${icon('reset')}<span><strong>Continue reading</strong><small>${escape(last.label)}</small></span>${icon('chevron')}</button>`:''}</section><section class="context-topics"><div class="context-section-title">Explore a theme</div>${moods.map(m=>`<button data-action="mood" data-id="${m.id}">${escape(({peace:'Peace',hope:'Hope',gratitude:'Gratitude',growth:'Faith'})[m.id])}${icon('arrow')}</button>`).join('')}</section></aside>`;
}
function heading(eyebrow, title, subtitle) {
  return `<div class="page-heading"><h1 class="page-title">${title}</h1><p class="page-subtitle">${subtitle}</p></div>`;
}
function readingHint() {
  return `${icon('down')}<span>Scroll to read in full</span>${state.focus?'':`<button data-action="focus" aria-label="Expand reading view">${icon('expand')}<span>Expand</span></button>`}`;
}
function card(post, index) {
  if (!post) return '';
  if (post.pending) return `<article class="feed-slide loading-card" data-id="${post.id}" data-index="${index}" ${index===state.active?'':'inert'} aria-label="${escape(post.title)}"><span class="loading-line"></span><h2>${escape(post.reference)}</h2><p>${post.verse}</p><p class="load-message" role="status">${failedCards.has(post.id) ? 'This ayah couldn’t load. Your place is saved.' : 'Loading ayah…'}</p>${failedCards.has(post.id) ? `<button class="primary-button" data-action="retry-card" data-id="${post.id}">Try again ${icon('reset')}</button>` : ''}</article>`;
  const flowing = (post.arabic?.length || 0) > 240 || post.text.length > 320;
  const category = categoryFor(post.type);
  const photo = photoFor(post);
  const isLong = (post.arabic?.length || 0) >= 120 || post.text.length >= 160;
  const credit = post.type === 'story' ? 'Editorial reflection' : post.type === 'hadith' ? post.narrator : post.translator;
  return `<article class="feed-slide type-${post.type} ${isLong ? 'long-verse' : ''} ${post.type === 'story' ? 'story-card' : ''} ${flowing ? 'flowing-verse' : ''}" data-id="${post.id}" data-index="${index}" ${index===state.active?'':'inert'} data-photo="${photo.id}" data-photo-topic="${photo.topic}" style="${photoTone(photo)}" aria-label="${escape(post.title)}" aria-roledescription="slide"><img class="slide-bg" ${photoAttributes(photo)} style="object-position:${escape(photo.focalPoint||'50% 50%')}" alt="" ${index===state.active?'fetchpriority="high"':'loading="lazy"'} decoding="async" draggable="false"/><div class="slide-shade"></div><div class="slide-top"><span class="content-type">${icon(category.icon)}${category.label}</span><button class="slide-source" data-action="source" data-id="${post.id}" aria-label="View source and context">${escape(post.verse)}${post.excerpt?' · Excerpt':''} ${icon('info')}</button></div>${index >= currentPosts.length ? `<span class="revisit-label">${icon('reset')} Revisiting</span>` : ''}${flowing ? `<div class="long-ayah-hint">${readingHint()}</div>` : ''}<div class="slide-body" ${flowing ? 'tabindex="0" aria-label="Complete reminder and translation"' : ''}>${post.type==='story'?`<h2 class="story-title">${escape(post.title)}</h2>`:''}${post.arabic ? `<p class="arabic" lang="ar" dir="rtl">${escape(post.arabic)}</p>` : ''}${post.transliteration ? `<p class="transliteration">${escape(post.transliteration)}</p>` : ''}<p class="translation">${escape(post.text)}</p><p class="translation-credit">${escape(credit)}${post.excerpt ? ' · Excerpt' : ''}</p>${post.type==='story'?`<button class="read-story" data-action="source" data-id="${post.id}">Read the story ${icon('arrow')}</button>`:''}</div><div class="slide-footer"><button class="source-row" data-action="source" data-id="${post.id}"><span><span class="source-title">${escape(post.reference)}</span><span class="source-subtitle">${post.type==='story'?'Read the Qur’anic account':'Source & context'}</span></span>${icon('chevron')}</button>${post.audio ? `<div class="audio-player"><button class="play-button" data-action="audio" data-id="${post.id}" aria-label="Play recitation">${icon('play')}</button><div class="audio-main"><div class="reciter">${getReciter(state.preferences.reciter).name}${post.excerpt ? ' · Full ayah' : ''}</div><input class="audio-slider" type="range" min="0" max="100" value="0" step=".1" aria-label="Recitation position" data-id="${post.id}"/></div><span class="audio-time">0:00</span><button class="audio-volume" data-action="mute" aria-label="Mute recitation">${icon('volume')}</button></div>` : `<div class="read-footer"><span>${post.type==='hadith'?'A teaching to reflect on':'An editorial reflection'}</span><button data-action="reflect" data-id="${post.id}" aria-label="Write a reflection">${icon('pen')}</button></div>`}</div></article>`;
}
function rail() {
  const post = activePost(); if (!post || post.pending) return '<div class="feed-rail"><span class="feed-progress">•••</span></div>';
  return `<div class="feed-rail" aria-label="Actions for current reflection"><button class="rail-action ${state.liked.includes(post.id) ? 'selected' : ''}" data-action="like" aria-pressed="${state.liked.includes(post.id)}"><span class="rail-circle">${icon('heart')}</span><span>Like</span></button><button class="rail-action ${state.saved.includes(post.id) ? 'selected' : ''}" data-action="save" aria-pressed="${state.saved.includes(post.id)}"><span class="rail-circle">${icon('bookmark')}</span><span>${state.saved.includes(post.id) ? 'Saved' : 'Save'}</span></button><button class="rail-action" data-action="reflect"><span class="rail-circle">${icon('pen')}</span><span>Reflect</span></button><button class="rail-action" data-action="share"><span class="rail-circle">${icon('share')}</span><span>Share</span></button><div class="rail-divider"></div><button class="rail-action rail-focus" data-action="focus"><span class="rail-circle">${icon('expand')}</span><span>Focus</span></button><div class="feed-arrows" aria-label="Feed navigation"><button class="feed-arrow" data-action="previous" aria-label="Previous reflection" ${state.active === 0 ? 'disabled' : ''}>${icon('up')}</button><button class="feed-arrow" data-action="next" aria-label="Next reflection" >${icon('down')}</button></div><span class="feed-progress" aria-live="off">${String(state.active + 1).padStart(2, '0')} <span aria-label="Continuous feed">∞</span></span></div>`;
}
function feedView() {
  const filter = state.surah ? quran.manifest?.surahs[Number(state.surah)-1]?.englishName : state.mood ? moods.find(m => m.id === state.mood)?.label : state.collection ? collections.find(c => c.id === state.collection)?.title : null;
  return `<h1 class="sr-only">Your reading feed</h1><div class="category-tabs" role="tablist" aria-label="Content categories">${categories.map(c => `<button class="category-tab ${state.category === c.id ? 'active' : ''}" role="tab" aria-selected="${state.category === c.id}" data-action="category" data-id="${c.id}">${c.label}</button>`).join('')}</div>${state.libraryError ? `<div class="library-error" role="status">The full library couldn’t load. Starter reminders are available. <button data-action="retry-library">Try again</button></div>` : ''}${filter ? `<div class="filter-banner"><span>${escape(filter)} · ${currentPosts.length} moments</span><button data-action="clear-filter">Clear ${icon('close')}</button></div>` : ''}${currentPosts.length ? `<div class="feed-container" data-type="${activePost()?.type||'quran'}" style="${photoTone(photoFor(activePost()))}"><div class="feed-scroll" id="feed-scroll" aria-label="Scroll through Islamic reflections" tabindex="0">${feedCards()}</div>${rail()}</div><div class="feed-hint"><span>Scroll to continue</span><span class="hint-shortcuts">↑ ↓</span></div>` : emptyState('A different kind of moment', 'There aren’t any moments in this combination yet. Explore all reminders to find something for your heart.', 'clear-filter', 'Explore reminders')}`;
}
function emptyState(title, description, action, label) { return `<div class="empty-state">${icon('bookmark')}<h2>${title}</h2><p>${description}</p><button class="primary-button" data-action="${action}" data-view="feed">${label} ${icon('arrow')}</button></div>`; }
function exploreView() {
  return `${heading('', 'Explore', 'The Qur’an, teachings, and themes to spend time with.')}<div class="explore-hero" style="${photoTone(photoForTheme('river'))}"><img src="${photoForTheme('river').src}" alt="${escape(photoForTheme('river').alt)}"/><h2>Make time<br>for stillness.</h2><button data-action="collection" data-id="quiet">Explore the collection ${icon('arrow')}</button></div><button class="quran-entry" data-action="surahs"><span class="quran-entry-icon">${icon('book')}</span><span><strong>The complete Qur’an</strong><small>114 surahs · 6,236 ayahs · Read at your pace</small></span>${icon('arrow')}</button>${readStore('last-read', null)?.id ? `<button class="continue-reading" data-action="open-reader" data-id="${escape(readStore('last-read', null).id)}">${icon('book')} Continue ${escape(readStore('last-read', null).label)} ${icon('arrow')}</button>` : ''}<div class="section-label">Explore by theme</div><div class="mood-grid">${moods.map(m => `<button class="mood-tile ${m.color}" style="${photoTone(photoForTheme(({peace:'ocean',hope:'dawn',gratitude:'harvest',growth:'trees'})[m.id],({gratitude:2,growth:1})[m.id]||0))}" data-action="mood" data-id="${m.id}"><img src="${photoForTheme(({peace:'ocean',hope:'dawn',gratitude:'harvest',growth:'trees'})[m.id],({gratitude:2,growth:1})[m.id]||0).src}" alt="" loading="lazy"/><span class="mood-tile-content">${icon(m.icon)}<h3>${m.label}</h3><p>${m.description}</p></span></button>`).join('')}</div><div class="section-label">Collections <span>Made for your everyday</span></div><div class="explore-collections">${collections.map(c => `<button class="collection-card" data-action="collection" data-id="${c.id}"><img src="${photoForTheme(({quiet:'river',morning:'dawn',hopeful:'path'})[c.id]).src}" alt="" loading="lazy"/><h3>${c.title}</h3><p>${c.posts.length} moments · ${c.subtitle}</p></button>`).join('')}</div><div class="section-label">Something on your mind?</div><button class="secondary-button" style="width:100%;justify-content:center" data-action="search">${icon('search')} Search by verse, topic, or feeling</button>`;
}
function libraryView() {return renderPersonalLibrary({state,personal,findPost,legacyResume:readStore('last-read',null)});}

function mobileNav() {
  return `<nav class="mobile-nav" aria-label="Mobile navigation">${[['today', 'sunrise', 'Today'], ['feed', 'home', 'For you'], ['quran', 'book', 'Qur’an'], ['explore', 'compass', 'Explore'], ['library', 'bookmark', 'Library']].map(([view, glyph, label]) => `<button class="${view === state.view && (view !== 'feed' || state.category === 'all') || view === 'quran' && (state.view === 'reader' || state.view === 'feed' && state.category === 'quran') ? 'active' : ''}" data-action="${view === 'settings' ? 'settings' : view === 'quran' ? 'surahs' : 'navigate'}" data-view="${view}" data-id="quran">${icon(glyph)}${label}</button>`).join('')}</nav>`;
}
function renderApp(targetId, preserve = false) {
  reader.unmount();todayView.unmount();audioId=null;
  observer?.disconnect(); clearTimeout(readTimer); clearTimeout(scrollTimer); pauseAudio(); navigationTarget = null;
  renderGeneration++;
  if (state.view!=='reader'&&(!preserve || !currentPosts.length)) {
    currentPosts = getPosts();
    state.active = targetId ? Math.max(0, currentPosts.indexOf(targetId)) : 0;
  }
  feedWindow = new FeedWindow(currentPosts, state.active);
  $('#app').innerHTML = `<div class="app-shell">${sidebar()}<div class="workspace">${topbar()}<div class="page-layout"><main class="main-column" id="main">${state.view === 'reader' ? reader.shell() : state.view === 'feed' ? feedView() : state.view === 'explore' ? exploreView() : state.view === 'today' ? todayView.render() : libraryView()}</main>${rightSidebar()}</div></div>${mobileNav()}</div>${state.focus ? `<button class="focus-exit" data-action="focus">${icon('close')} Exit focus</button>` : ''}`;
  applyPreferences();
  if (state.view === 'feed' && currentPosts.length) requestAnimationFrame(() => setupFeed());
  if(state.view==='library')requestAnimationFrame(hydratePersonalView);
  if(state.view==='today')todayView.mount($('#main'));
  if(state.view==='reader'){const generation=renderGeneration;requestAnimationFrame(()=>{if(generation===renderGeneration&&state.view==='reader')reader.mount($('#main'),readerTarget.surah,readerTarget.ayah);});}
}
function setupFeed() {
  const container = $('#feed-scroll'); if (!container) return;
  sizeFeed(container);
  fitCards();
  const generation = renderGeneration;
  container.scrollTo({ top: (state.active - feedWindow.start) * container.clientHeight, behavior: 'instant' });
  observer = new IntersectionObserver(entries => {
    if (generation !== renderGeneration) return;
    for (const entry of entries) {
      if (entry.isIntersecting && entry.intersectionRatio > .6 && entry.target.isConnected) setActive(Number(entry.target.dataset.index));
    }
  }, { root: container, threshold: [.65] });
  $$('.feed-slide', container).forEach(el => observer.observe(el));
  container.addEventListener('scroll', () => { clearTimeout(scrollTimer); scrollTimer = setTimeout(settleFeed, 200); }, { passive: true });
  container.addEventListener('scrollend', settleFeed);
  for (const event of ['wheel', 'touchstart']) container.addEventListener(event, () => { navigationTarget = null; }, {passive:true});
  setActive(state.active); hydrateWindow();
}
function sizeFeed(container) {
  if(innerWidth<=600&&!state.focus){
    const navigation=$('.mobile-nav')?.offsetHeight||65;
    const top=container.getBoundingClientRect().top+window.scrollY;
    const hint=$('.feed-hint')?.offsetHeight||0;
    container.style.height=`${Math.max(120,innerHeight-top-navigation-hint)}px`;
  }else container.style.height='';
}
function fitCards() {
  for(const slide of $$('.feed-slide:not(.flowing-verse):not(.loading-card)')){
    const body=$('.slide-body',slide),bounds=body.getBoundingClientRect();
    const clipped=[...body.children].some(child=>{if(!child.getClientRects().length)return false;const r=child.getBoundingClientRect();return r.top<bounds.top-2||r.bottom>bounds.bottom+2;});
    if(!clipped)continue;
    slide.classList.add('flowing-verse');body.tabIndex=0;body.setAttribute('aria-label','Complete reminder and translation');
    const hint=document.createElement('div');hint.className='long-ayah-hint';hint.innerHTML=readingHint();
    body.before(hint);
  }

}
async function hydrateWindow() {
  const container = $('#feed-scroll'), generation = renderGeneration;
  if (!container) return;
  const ids = [...new Set(feedWindow.entries().map(e=>e.id))].filter(id=>quran.reference(id)&&!quran.peek(id));
  const results = await Promise.allSettled(ids.map(id=>quran.load(id)));
  if (generation !== renderGeneration || !container.isConnected) return;
  results.forEach((result,i)=>{if(result.status==='rejected')failedCards.add(ids[i]);else failedCards.delete(ids[i]);});
  for (const old of $$('.loading-card', container)) {
    const post = findPost(old.dataset.id); if (!post) continue;
    const template = document.createElement('template'); template.innerHTML = card(post, Number(old.dataset.index));
    const next = template.content.firstElementChild;
    observer?.unobserve(old); old.replaceWith(next); observer?.observe(next);
  }
  fitCards();setActive(state.active);
}
function changeWindow(start, end) {
  const container = $('#feed-scroll'); if (!container || start === feedWindow.start && end === feedWindow.end) return;
  const oldStart = feedWindow.start, top = container.scrollTop, height = container.clientHeight;
  const shiftsLayout = start !== oldStart || end < feedWindow.end;
  observer?.disconnect();
  if(shiftsLayout){container.style.scrollSnapType='none'; container.style.scrollBehavior='auto';}
  const old = new Map($$('.feed-slide',container).map(el=>[Number(el.dataset.index),el]));
  feedWindow.setWindow(start,end);
  // Keep existing card nodes, including the current verse's own scroll position.
  for (const {id,index} of feedWindow.entries()) {
    if (!old.has(index)) {
      const template=document.createElement('template'); template.innerHTML=card(findPost(id),index); old.set(index,template.content.firstElementChild);
    }
  }
  for (const [index,el] of old) if (index<start||index>=end) el.remove();
  let previous = null;
  for (let index=start; index<end; index++) {
    const el=old.get(index); if (!el) continue;
    if (!previous) { if (container.firstElementChild!==el) container.prepend(el); }
    else if (previous.nextElementSibling!==el) previous.after(el);
    previous=el;
  }
  if(shiftsLayout)container.scrollTo({top:top+(oldStart-start)*height,behavior:'instant'});
  container.dataset.windowStart=String(start); container.dataset.windowEnd=String(end);
  const generation=renderGeneration;
  requestAnimationFrame(()=>{
    if(generation!==renderGeneration||!container.isConnected)return;
    container.style.scrollSnapType='';container.style.scrollBehavior='';
    fitCards();
    $$('.feed-slide',container).forEach(el=>observer?.observe(el));
  });
  hydrateWindow();
}
function settleFeed() {
  const container=$('#feed-scroll'); if(!container||!currentPosts.length)return;
  clearTimeout(scrollTimer); navigationTarget=null;
  const nearest=feedWindow.start+Math.round(container.scrollTop/container.clientHeight);
  if(nearest!==state.active)setActive(nearest);
  if(feedWindow.needsRebase()||feedWindow.end-feedWindow.start>25){const desired=feedWindow.desiredWindow();changeWindow(desired.start,desired.end);}
}
function setActive(index) {
  if (!Number.isInteger(index) || index<0 || !currentPosts.length) return;
  const changed=state.active!==index, wasPlaying=!audio.paused || continueRecitation;
  // Off-screen passages remain in the bounded scroll window, but should not
  // capture Tab focus and pull the feed away from the active reading position.
  $$('.feed-slide').forEach(slide=>{slide.inert=Number(slide.dataset.index)!==index;});
  if(changed){
    pauseAudio();state.active=index;
    // Wheel/touch navigation must not leave keyboard focus on an off-screen
    // passage, where a subsequent native key could pull the feed back to it.
    if(document.activeElement?.matches('.feed-slide .slide-body')) {
      const next=$(`.feed-slide[data-index="${index}"].flowing-verse .slide-body`) || $('#feed-scroll');
      next?.focus({preventScroll:true});
    }
  }
  feedWindow.active=index;
  if(navigationTarget===index)navigationTarget=null;
  const p=activePost();if(!p)return;
  if(p.audio&&audioId!==p.id&&audioSource(p)){
    audioId=p.id;audio.src=audioSource(p);audio.load();audio.playbackRate=Number(state.preferences.speed)||1;
    if(state.preferences.autoplay&&wasPlaying){continueRecitation=true;audio.play().catch(()=>{});}
  }else if(!p.audio){pauseAudio();audioId=null;if(wasPlaying&&state.preferences.autoplay)continueRecitation=true;}
  updateRail();updateAudio();
  const context=$('#reading-context');if(context&&context.dataset.post!==p.id){context.innerHTML=readingContext();context.dataset.post=p.id;}
  const feed=$('.feed-container');if(feed){feed.dataset.type=p.type||'quran';feed.style.cssText=photoTone(photoFor(p));feed.dataset.flowing=String(Boolean($(`.feed-slide[data-index="${state.active}"]`)?.classList.contains('flowing-verse')));}
  if(index>=feedWindow.end-4)changeWindow(feedWindow.start,feedWindow.end+10);
  else if(index<feedWindow.start+2&&feedWindow.start>0)changeWindow(Math.max(0,feedWindow.start-10),feedWindow.end);
  clearTimeout(readTimer);
  if(p.pending)return;
  readTimer=setTimeout(()=>{
    if(document.hidden||state.view!=='feed'||activePost()?.id!==p.id)return;
    personalChange(()=>personal.record(p.id,'feed',$(`.feed-slide[data-index="${state.active}"] .slide-body`)?.scrollTop||0));
    const items=todayReads();
    if(!items.includes(p.id)){state.read[today()]=[...items,p.id];writeStore('read',state.read);if($('#daily-progress'))$('#daily-progress').innerHTML=dailyProgress();}
    if(p.surah)writeStore('last-read',{id:`q-${p.surah}-${p.ayah}`,label:`${p.reference} ${p.verse}`});
  },4500);
}
function updateRail(){
  const el=$('.feed-rail');if(!el)return;
  const action=el.contains(document.activeElement)?document.activeElement.dataset.action:null;
  el.outerHTML=rail();
  if(action)$(`.feed-rail [data-action="${action}"]`)?.focus({preventScroll:true});
}
function toggleFocus(){
  const id=activePost()?.id;
  const position=$(`.feed-slide[data-index="${state.active}"] .slide-body`)?.scrollTop||0;
  state.focus=!state.focus;renderApp(id,true);
  requestAnimationFrame(()=>{
    const body=$(`.feed-slide[data-index="${state.active}"] .slide-body`);
    if(body){body.scrollTop=position;if(body.hasAttribute('tabindex'))body.focus({preventScroll:true});}
  });
}
function moveFeed(delta){
  const container=$('#feed-scroll');if(!container)return;
  const index=Math.max(0,(navigationTarget??state.active)+delta);navigationTarget=index;
  if(index>=feedWindow.end)changeWindow(feedWindow.start,index+8);
  if(index<feedWindow.start)changeWindow(Math.max(0,index-5),feedWindow.end);
  container.scrollTo({top:(index-feedWindow.start)*container.clientHeight,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}
function pauseAudio(clearIntent = false) { if(clearIntent)continueRecitation=false;if(state.view==='reader'&&reader.session.enabled)reader.pause();else audio.pause(); updateAudio(); }
function updateAudio() {
  $$('.play-button').forEach(button => {
    const playing = Number(button.closest('.feed-slide').dataset.index) === state.active && button.dataset.id === audioId && !audio.paused;
    button.classList.toggle('is-playing', playing); button.innerHTML = icon(playing ? 'pause' : 'play'); button.setAttribute('aria-label', playing ? 'Pause recitation' : 'Play recitation');
  });
  const slide = $(`.feed-slide[data-index="${state.active}"]`);
  if (slide) {
    const slider = $('.audio-slider', slide), time = $('.audio-time', slide);
    if (slider) { slider.value = audio.duration ? audio.currentTime / audio.duration * 100 : 0; slider.setAttribute('aria-valuetext', `${fmtTime(audio.currentTime)} of ${fmtTime(audio.duration)}`); }
    if (time) time.textContent = audio.currentTime > 0 ? `${fmtTime(audio.currentTime)} / ${fmtTime(audio.duration)}` : fmtTime(audio.duration);
  }
  $$('.audio-volume').forEach(b => { b.innerHTML = icon(audio.muted ? 'muted' : 'volume'); b.setAttribute('aria-label', audio.muted ? 'Unmute recitation' : 'Mute recitation'); });
}
['play', 'pause', 'timeupdate', 'loadedmetadata', 'ended'].forEach(event => audio.addEventListener(event, updateAudio));
audio.addEventListener('error', () => { if (audio.src && audioId) { pauseAudio(); toast('This recitation could not load. Try again, or open the original source.'); } });

function showDialog(title, body) {
  if (!dialog.open) lastFocus = document.activeElement;
  dialog.innerHTML = `<div class="dialog-inner"><div class="dialog-top"><h2 id="dialog-title">${title}</h2><button class="icon-button" data-action="close-dialog" aria-label="Close dialog">${icon('close')}</button></div>${body}</div>`;
  if (!dialog.open) { pauseAudio(true); dialog.showModal(); }
}
function closeDialog() { dialog.close(); lastFocus?.focus?.(); }
dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(); } });

function sourceDialog(post) {
  if (!post) return;
  showDialog(post.title, `${post.type === 'story' ? `<img src="${photoFor(post).src}" class="collection-dialog-cover" alt="${escape(photoFor(post).alt)}"/><p class="detail-label">An editorial retelling & reflection</p>${post.story.map(paragraph => `<p class="detail-text">${paragraph}</p>`).join('')}` : `${post.arabic ? `<p class="dialog-arabic" lang="ar" dir="rtl">${escape(post.arabic)}</p>` : ''}<p class="dialog-quote">“${escape(post.text)}”</p><p class="detail-text">${post.translator || post.narrator}${post.excerpt ? ' · This card contains an excerpt.' : ''}${post.arabicSource ? ' · Arabic: Tanzil / Al Quran Cloud.' : ''}</p><p class="detail-label">A moment to reflect</p><p class="detail-text">${post.reflection}</p>`}<a class="source-detail" href="${post.source}" target="_blank" rel="noopener noreferrer">${icon('shield')}<div><strong>${post.reference} · ${post.verse}</strong><span>Read the full text and context at ${post.type === 'hadith' ? 'Sunnah.com' : 'Quran.com'}</span></div>${icon('external')}</a><p class="privacy-note">${post.type === 'story' ? 'The story and takeaway are editorial summaries, not quotations from the Qur’an.' : post.type === 'hadith' ? 'The excerpt is drawn from a Sahih collection. Open the source to read the complete narration.' : 'English is a translation of the meaning. Where an excerpt is shown, audio plays the complete ayah.'}</p>${canonicalVerse(post) ? `<button class="text-button" data-action="continue-surah" data-id="${post.id}">${icon('book')} Read this ayah in its surah ${icon('arrow')}</button>` : ''}<button class="text-button" data-action="organise" data-id="${post.id}">${icon('folder')} Add to a collection</button><button class="photo-attribution" data-action="photo-details" data-id="${post.id}">${icon('info')} Photograph & visual connection</button><div class="dialog-actions"><button class="primary-button" data-action="reflect" data-id="${post.id}">${icon('pen')} Add a reflection</button><button class="secondary-button" data-action="save" data-id="${post.id}">${icon('bookmark')} ${state.saved.includes(post.id) ? 'Unsave' : 'Save'}</button></div>`);
}
function photoDialog(post) {
  if(!post)return;
  const photo=photoFor(post);
  showDialog('Behind the photograph',`<img class="photo-detail-image" src="${photo.src}" alt="${escape(photo.alt)}"/><p class="detail-text">${escape(photo.reason)}</p><a class="photo-credit-link" href="${escape(photo.source)}" target="_blank" rel="noopener noreferrer">Photography by ${escape(photo.photographer)} ${icon('external')}</a><p class="privacy-note">The photograph accompanies the reading. It is not a historical record or a scholarly interpretation of this passage.</p>`);
}
function reflectionDialog(post) {
  if (!post) return;
  showDialog('What stays with you?', `<p class="dialog-description">${post.prompt}</p><p class="detail-label">${post.reference} · ${post.verse}</p><textarea id="reflection-text" class="reflection-input" maxlength="4000" placeholder="There’s no right way to reflect. Begin with what’s on your heart…" aria-label="Your reflection">${escape(state.notes[post.id]?.text || '')}</textarea><p class="privacy-note">Just for you. Saved in this browser, on this device.</p><div class="dialog-actions"><button class="primary-button" data-action="save-reflection" data-id="${post.id}">Save reflection ${icon('check')}</button>${state.notes[post.id]?.text ? `<button class="secondary-button" data-action="delete-reflection" data-id="${post.id}">Delete</button>` : ''}</div>`);
  $('#reflection-text').focus();
}
function settingsDialog() {
  const p = state.preferences;
  showDialog('Reading preferences', `<p class="dialog-description">Adjust the way you read and listen.</p><div class="appearance-picker" role="group" aria-label="Reading theme">${[['editorial','Daylight','Light interface · Matte photography'],['immersive','Nightfall','Dark interface · Matte photography']].map(([id,title,detail])=>`<button data-action="appearance" data-id="${id}" aria-pressed="${p.appearance===id}"><span class="appearance-swatch swatch-${id}" aria-hidden="true">Aa</span><strong>${title}</strong><small>${detail}</small></button>`).join('')}</div>${[['large', 'Larger type', 'A little more room for every word.'], ['translation', 'English translation', 'Show the meaning alongside the Arabic.'], ['transliteration', 'Du’a transliteration', 'Show pronunciation on the original curated du’a cards.'], ['autoplay', 'Continue recitation', 'After you press play, continue audio when you scroll.']].map(([id, title, description]) => `<div class="settings-row"><div><h3>${title}</h3><p>${description}</p></div><button class="toggle ${p[id] ? 'active' : ''}" role="switch" aria-checked="${p[id]}" aria-label="${title}" data-action="preference" data-id="${id}"></button></div>`).join('')}<div class="settings-row"><div><h3>Your daily intention</h3><p>Moments to spend with a reminder.</p></div><div class="goal-options">${[3, 5, 7].map(n => `<button class="goal-option ${Number(p.goal) === n ? 'active' : ''}" data-action="goal" data-id="${n}">${n}</button>`).join('')}</div></div><div class="settings-row"><div><h3>Reciter</h3><p>For the feed and surah reader.</p></div><select id="audio-reciter" aria-label="Choose reciter">${reciters.map(r=>`<option value="${r.id}" ${state.preferences.reciter===r.id?'selected':''}>${r.short}</option>`).join('')}</select></div><div class="settings-row"><div><h3>Recitation speed</h3><p>Your preferred listening pace.</p></div><select id="audio-speed" aria-label="Recitation speed">${[.75, 1, 1.25].map(n => `<option value="${n}" ${Number(p.speed) === n ? 'selected' : ''}>${n}×</option>`).join('')}</select></div><p class="privacy-note">Your saved moments, reflections, and preferences stay in this browser. No account needed.</p><button class="text-button" data-action="about">About Noor ${icon('arrow')}</button>`);
}
function searchDialog() {
  showDialog('Search the library', `<div class="search-box">${icon('search')}<input id="search-input" class="search-input" type="search" placeholder="Try “patience”, “peace”, or “94:5”…" aria-label="Search reminders" autocomplete="off"/></div><div id="search-results" class="search-results"></div>`);
  searchResults(''); $('#search-input').focus();
}
async function searchResults(query) {
  const generation=++searchGeneration,q=normalizeSearch(query.trim());
  const local=posts.filter(p=>normalizeSearch(`${p.title} ${p.text} ${p.arabic||''} ${p.reference} ${p.verse} ${p.tags.join(' ')} ${p.moods.join(' ')} ${p.reflection}`).includes(q));
  const target=$('#search-results');if(!target)return;
  const render=(results,total,loading=false,error=false)=>{
    if(generation!==searchGeneration||!target.isConnected)return;
    target.innerHTML=`<p class="detail-label">${q?`${total.toLocaleString()} matches${total>results.length?' · Showing '+results.length:''}`:'A few places to begin'}</p>${results.map(p=>`<button class="search-result" data-action="open-post" data-id="${p.id}"><img src="${photoFor(p).thumb}" alt="" loading="lazy"/><div><h3>${escape(p.title)}</h3><p>${categoryFor(p.type).label} · ${escape(p.reference)} ${p.verse}</p></div>${icon('chevron')}</button>`).join('')}${loading?'<p class="search-empty" role="status">Searching the complete Qur’an…</p>':error?'<p class="search-empty">The full Qur’an search could not load. <button class="text-button" data-action="retry-search">Try again</button></p>':!results.length?'<p class="search-empty">No matches. Try a topic, surah name, or reference such as 2:255.</p>':''}`;
  };
  if(!q){render(local.slice(0,5),5);return;}
  render(local.slice(0,8),local.length,true);
  try{
    const found=await quran.search(query);
    const results=[...local.slice(0,8),...found.posts];
    render(results,local.length+found.total);
  }catch{render(local.slice(0,8),local.length,false,true);}
}
function surahDialog(){
  if(!quran.manifest){toast('The Qur’an library is unavailable. Please try loading it again.');return;}
  showDialog('The complete Qur’an.',`<p class="dialog-description">114 surahs. Read, listen, or memorize at your own pace.</p><div class="search-box">${icon('search')}<input id="surah-search" class="search-input" type="search" placeholder="Find a surah by name or number…" aria-label="Find a surah"/></div><div id="surah-list" class="surah-list"></div>`);
  renderSurahs('');$('#surah-search').focus();
}
function renderSurahs(query){
  const q=normalizeSearch(query.trim());
  const matches=quran.manifest.surahs.filter(s=>!q||String(s.number)===q||normalizeSearch(`${s.name} ${s.englishName} ${s.meaning}`).includes(q));
  $('#surah-list').innerHTML=matches.length?matches.map(s=>`<button class="surah-item" data-action="read-surah" data-id="${s.number}"><span class="surah-number">${s.number}</span><span class="surah-copy"><strong>${escape(s.englishName)}</strong><small>${escape(s.meaning)} · ${s.count} ayahs</small></span><span class="surah-arabic" lang="ar" dir="rtl">${escape(s.name)}</span></button>`).join(''):'<p class="search-empty">No matching surah. Try its number or English name.</p>';
}
function collectionDialog(id) {
  const c = collections.find(c => c.id === id); if (!c) return;
  showDialog(c.title, `<img class="collection-dialog-cover" src="${photoForTheme(({quiet:'river',morning:'dawn',hopeful:'path'})[c.id]).src}" alt=""/><p class="dialog-description">${c.subtitle}. ${c.posts.length} thoughtfully chosen moments to read at your own pace.</p>${c.posts.map(id => { const p = posts.find(x => x.id === id); return `<button class="search-result" data-action="open-post" data-id="${p.id}"><div><h3>${p.title}</h3><p>${p.reference} · ${p.verse}</p></div>${icon('chevron')}</button>`; }).join('')}<div class="dialog-actions"><button class="primary-button" data-action="start-collection" data-id="${id}">Begin the collection ${icon('arrow')}</button><button class="secondary-button" data-action="save-collection" data-id="${id}">${icon('bookmark')} Save all</button></div>`);
}
function intentionDialog() {
  const current = state.intention?.date === today() ? state.intention.text : '';
  showDialog('Begin with intention.', `<p class="dialog-description">What would you like to bring into your day?<br>Keep it simple. Keep it sincere.</p><input id="intention-text" class="intention-input" maxlength="90" placeholder="Today, I intend to…" value="${escape(current)}" aria-label="Today’s intention"/><div class="preset-intentions">${['Make room for gratitude.', 'Be a little more patient.', 'Speak with kindness.', 'Remember Allah more.'].map(text => `<button data-action="preset-intention" data-text="${text}">${text}</button>`).join('')}</div><button class="primary-button" data-action="save-intention">Carry this with me ${icon('check')}</button>`);
}
function shareDialog(post) {
  if (!post) return;
  showDialog('Share this passage', `<p class="dialog-description">A meaningful reminder can make someone’s day.</p><div class="share-quote">“${escape(post.text)}”<small>${post.type === 'story' ? 'An editorial reflection on ' : ''}${post.reference} · ${post.verse}${post.excerpt ? ' · Excerpt' : ''}</small></div><div class="dialog-actions"><button class="primary-button" data-action="share-image" data-id="${post.id}">${icon('image')} Create an image</button><button class="secondary-button" data-action="copy-quote" data-id="${post.id}">Copy reminder ${icon('check')}</button><button class="secondary-button" data-action="copy-link" data-id="${post.id}">${icon('share')} Copy source link</button></div><p class="privacy-note">Shares include the original source, so the reminder can be read in context.</p>`);
}
async function shareImageDialog(post){
  if(!post||post.pending)return;
  if(shareState.id!==post.id)shareState.format='post';
  shareState.id=post.id;
  const formats=Object.entries(SHARE_FORMATS).map(([id,f])=>`<button role="radio" aria-checked="${shareState.format===id}" class="${shareState.format===id?'on':''}" data-action="share-format" data-format="${id}">${f.label}</button>`).join('');
  showDialog('Share as an image',`<div class="share-image-stage format-${shareState.format}"><div class="share-image-loading" role="status">${icon('image')} Composing…</div></div><div class="today-seg share-formats" role="radiogroup" aria-label="Image shape">${formats}</div><div class="dialog-actions"><button class="primary-button" data-action="share-native" disabled>${icon('share')} Share</button><button class="secondary-button" data-action="share-download" disabled>${icon('download')} Save image</button></div><p class="privacy-note">Made on your device. The source reference and photographer credit are included on the image.</p>`);
  const format=shareState.format,id=post.id;
  try{
    const canvas=await renderShareImage(post,{photo:photoFor(post),format});
    if(shareState.id!==id||shareState.format!==format||!dialog.open)return;
    shareState.blob=await canvasBlob(canvas);
    if(shareState.url)URL.revokeObjectURL(shareState.url);
    shareState.url=URL.createObjectURL(shareState.blob);
    const stage=$('.share-image-stage');if(!stage)return;
    stage.innerHTML=`<img src="${shareState.url}" alt="Preview: ${escape(post.reference)} ${escape(post.verse)} as a shareable image"/>`;
    for(const b of $$('[data-action="share-native"],[data-action="share-download"]',dialog))b.disabled=false;
    const file=new File([shareState.blob],'noor.jpg',{type:'image/jpeg'});
    if(!(navigator.canShare&&navigator.canShare({files:[file]}))){const native=$('[data-action="share-native"]',dialog);if(native)native.hidden=true;}
  }catch{const stage=$('.share-image-stage');if(stage)stage.innerHTML='<p class="share-image-loading">This image couldn’t be composed. Try copying the text instead.</p>';}
}
function shareFileName(){const post=findPost(shareState.id);return `noor-${String(post?.verse||'reminder').replace(/[^a-z0-9]+/gi,'-')}-${shareState.format}.jpg`;}
function downloadShareImage(){
  if(!shareState.url)return;
  const link=document.createElement('a');link.href=shareState.url;link.download=shareFileName();
  document.body.append(link);link.click();link.parentNode.removeChild(link);toast('Image saved.');
}
async function nativeShareImage(){
  if(!shareState.blob)return;const post=findPost(shareState.id);
  const file=new File([shareState.blob],shareFileName(),{type:'image/jpeg'});
  try{await navigator.share({files:[file],title:`${post.reference} · ${post.verse}`,text:post.source||''});}catch(error){if(error?.name!=='AbortError')downloadShareImage();}
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Copied with the source reference.'); }
  catch { showDialog('Your reminder, ready to share', `<p class="dialog-description">Copy the text below to share it.</p><textarea class="reflection-input" id="copy-fallback" readonly>${escape(text)}</textarea>`); $('#copy-fallback').select(); }
}
function navigate(view, category = 'all') { state.personalCollection=null;state.libraryLimit=60;state.view = view; state.category = category; state.surah = null; state.mood = null; state.collection = null; state.focus = false; closeDialog(); renderApp(); window.scrollTo({ top: 0, behavior: 'instant' }); }
async function openReader(surah=1,ayah=1){
  try{await quran.init();}catch{toast('The reading library could not load. Please try again.');return;}
  if(!quran.reference(`q-${surah}-${ayah}`))return;
  if(state.view==='feed')feedReturn={category:state.category,surah:state.surah,mood:state.mood,collection:state.collection,active:state.active,ids:[...currentPosts]};
  closeDialog();readerTarget={surah:Number(surah),ayah:Number(ayah)};state.view='reader';state.focus=false;continueRecitation=false;
  window.scrollTo({top:0,behavior:'instant'});renderApp();
}
function backFromReader(){
  state.view='feed';state.focus=false;
  if(feedReturn){const {ids,...previous}=feedReturn;Object.assign(state,previous);currentPosts=ids;renderApp(undefined,true);}
  else navigate('feed');
  window.scrollTo({top:0,behavior:'instant'});
}
function toggleSave(post){
  if(!post)return;
  const existed=state.saved.includes(post.id),next=existed?state.saved.filter(x=>x!==post.id):[...state.saved,post.id];
  if(!writeStore('saved',next))return existed;
  state.saved=next;updateRail();if(state.view==='reader')reader.syncSaves(post);
  toast(existed?(personal.memberships(post.id).length?'Bookmark removed. Kept in your collections.':'Removed from your saved passages.'):'Saved to your library.',existed?'Undo':'Organise',()=>{
    if(existed){if(writeStore('saved',[...new Set([...state.saved,post.id])]))state.saved=[...new Set([...state.saved,post.id])];updateRail();if(state.view==='reader')reader.syncSaves(post);refreshPersonalView();}
    else organiseDialog(post.id);
  });return existed;
}

async function openPost(id) {
  if(/^(q|dua)-\d+-\d+$/.test(id)&&!quran.manifest){try{await quran.init();state.libraryError=false;}catch{toast('The library could not load. Your save is still here; please try again.');return;}}
  if(quran.reference(id)&&!quran.peek(id)){try{await quran.load(id);}catch{toast('This ayah could not load. Please try again.');return;}}
  const post=findPost(id);if(!post||post.pending)return;
  closeDialog();state.view='feed';state.category=id.startsWith('q-')?'quran':id.startsWith('dua-')?'dua':'all';
  state.surah=id.startsWith('q-')?post.surah:null;state.mood=null;state.collection=null;
  renderApp(id);window.scrollTo({top:0,behavior:'instant'});
}

function personalChange(fn){try{return fn();}catch(error){toast(error.message);return null;}}
function refreshPersonalView(){if(state.view==='library')renderApp();}
async function hydratePersonalView(){
  const generation=renderGeneration;
  const ids=[...new Set($$('[data-post-id]').map(el=>el.dataset.postId))].filter(id=>quran.reference(id)&&!quran.peek(id));
  if(!ids.length)return;
  const results=await Promise.allSettled(ids.map(id=>quran.load(id)));
  if(generation!==renderGeneration||state.view!=='library')return;
  // One refresh after loading; failed records retain an openable placeholder.
  if(results.some(r=>r.status==='fulfilled')){
    const position=window.scrollY;
    $('#main').innerHTML=libraryView();window.scrollTo({top:position,behavior:'instant'});
  }
}
function organiseDialog(id){
  const post=personalPost(id,findPost);if(!post)return;
  showDialog('Add to a collection',`<p class="dialog-description">${escape(post.title)} · ${escape(post.verse)}</p><p class="personal-dialog-note">Choose as many as you like. Changes save immediately.</p><div class="collection-picker">${personal.collections.map(c=>`<button class="collection-choice" role="checkbox" aria-checked="${c.ids.includes(id)}" data-action="toggle-member" data-id="${id}" data-folder="${c.id}">${icon('folder')}<span><strong>${escape(c.name)}</strong><small>${c.ids.length} passages</small></span><span class="choice-check">${c.ids.includes(id)?icon('check'):''}</span></button>`).join('')||'<p class="personal-dialog-note">Create your first collection below.</p>'}</div><button class="personal-new-folder" data-action="new-folder" data-post="${id}">${icon('plus')} New collection</button><div class="dialog-actions"><button class="primary-button" data-action="finish-organising">Done ${icon('check')}</button></div>`);
}
function folderNameDialog(postID=null,folderID=null){
  const folder=personal.collection(folderID);
  showDialog(folder?'Rename collection':'A collection of your own',`<form id="collection-form" data-folder="${folderID||''}" data-post="${postID||''}"><label class="personal-input-label" for="collection-name">Collection name</label><input id="collection-name" class="intention-input" name="name" maxlength="48" required autocomplete="off" placeholder="e.g. For a quiet morning" value="${escape(folder?.name||'')}"/><p class="personal-dialog-note">${folder?'Choose a name that feels right.':'Give meaningful passages a place to belong.'} Up to 48 characters.</p><p id="collection-error" class="personal-form-error" role="alert"></p><div class="dialog-actions"><button type="submit" class="primary-button">${folder?'Save name':'Create collection'} ${icon('check')}</button><button type="button" class="secondary-button" data-action="${postID?'organise':'close-dialog'}" ${postID?`data-id="${postID}"`:''}>Cancel</button></div></form>`);
  $('#collection-name').focus();
}
function addPassagesDialog(folderID){
  const folder=personal.collection(folderID||state.personalCollection);if(!folder)return;
  showDialog(`Add to ${escape(folder.name)}`,`<p class="dialog-description">Choose from your saved passages. Tap again to remove.</p><div class="search-box">${icon('search')}<input id="collection-search" class="search-input" type="search" placeholder="Find a saved passage…" aria-label="Find a saved passage" data-folder="${folder.id}"/></div><div class="collection-picker" id="collection-candidates"></div><div class="dialog-actions"><button class="primary-button" data-action="finish-organising">Done ${icon('check')}</button></div>`);
  renderCollectionCandidates(folder.id,'');
}
function renderCollectionCandidates(folderID,query){
  const folder=personal.collection(folderID),target=$('#collection-candidates');if(!folder||!target)return;
  const q=normalizeSearch(query);
  const matches=state.saved.map(id=>personalPost(id,findPost)).filter(Boolean).filter(p=>normalizeSearch(`${p.title} ${p.reference} ${p.verse} ${p.text||''} ${p.arabic||''}`).includes(q));
  target.innerHTML=matches.slice(0,80).map(p=>`<button class="collection-choice" role="checkbox" aria-checked="${folder.ids.includes(p.id)}" data-action="toggle-member" data-id="${p.id}" data-folder="${folder.id}"><span><strong>${escape(p.title)}</strong><small>${escape(p.verse)}</small></span><span class="choice-check">${folder.ids.includes(p.id)?icon('check'):''}</span></button>`).join('')||'<p class="personal-dialog-note">No saved passages here yet. Save something from the feed, then add it to your collection.</p>';
  if(matches.length>80)target.insertAdjacentHTML('beforeend','<p class="personal-dialog-note">Showing the first 80. Search to find a specific passage.</p>');
}
function historySettings(){
  showDialog('Your reading history',`<p class="dialog-description">A private trail back to passages you have visited. Noor keeps your 300 most recent passages in this browser.</p><div class="settings-row personal-history-setting"><div><h3>Keep reading history</h3><p>Pause to stop adding visits. Your resume point and daily reading counter are kept separately.</p></div><button class="toggle ${personal.enabled?'active':''}" role="switch" aria-label="Keep reading history" aria-checked="${personal.enabled}" data-action="toggle-history"></button></div><p class="personal-dialog-note">Clearing history keeps your saved passages, collections, notes and resume point.</p><button class="text-button" data-action="confirm-clear-history" ${personal.history.length?'':'disabled'}>Clear history</button><div class="dialog-actions"><button class="primary-button" data-action="finish-organising">Done ${icon('check')}</button></div>`);
}
async function resumePassage(id){
  const visit=personal.resume?.id===id?personal.resume:personal.history.find(e=>e.id===id);
  if(visit?.surface==='reader'){
    const ref=quran.reference(id);if(ref){await openReader(ref.surah.number,ref.ayah);return;}
  }
  await openPost(id);
  requestAnimationFrame(()=>{const body=$(`.feed-slide[data-index="${state.active}"] .slide-body`);if(body&&activePost()?.id===id)body.scrollTop=visit?.offset||0;});
}
const personalActions=new Set(['new-folder','organise','finish-organising','open-folder','rename-folder','delete-folder','confirm-delete-folder','add-passages','toggle-member','remove-member','history-settings','toggle-history','confirm-clear-history','clear-history','resume-passage','library-more','toast-action']);
async function handlePersonalAction(action,button){
  const {id,folder}=button.dataset;
  switch(action){
    case 'new-folder':folderNameDialog(button.dataset.post);break;
    case 'organise':organiseDialog(id);break;
    case 'finish-organising':closeDialog();refreshPersonalView();break;
    case 'open-folder':state.libraryTab='collections';state.personalCollection=id;state.libraryLimit=60;renderApp();window.scrollTo({top:0,behavior:'instant'});break;
    case 'rename-folder':folderNameDialog(null,id);break;
    case 'delete-folder':{const c=personal.collection(id);if(!c)break;showDialog('Delete this collection?',`<p class="dialog-description">${escape(c.name)} will be removed. Your saved passages and notes will stay.</p><div class="dialog-actions"><button class="primary-button" data-action="confirm-delete-folder" data-id="${id}">Delete collection</button><button class="secondary-button" data-action="close-dialog">Keep it</button></div>`);break;}
    case 'confirm-delete-folder':{const c=personal.remove(id);closeDialog();state.personalCollection=null;refreshPersonalView();toast('Collection deleted.','Undo',()=>{personalChange(()=>personal.restore(c));refreshPersonalView();});break;}
    case 'add-passages':addPassagesDialog(id);break;
    case 'toggle-member':{const included=personal.collection(folder)?.ids.includes(id);personal.setMembership(folder,id,!included);button.setAttribute('aria-checked',String(!included));$('.choice-check',button).innerHTML=included?'':icon('check');if(!$('#collection-search'))$('small',button).textContent=`${personal.collection(folder).ids.length} passages`;break;}
    case 'remove-member':personal.setMembership(folder,id,false);refreshPersonalView();toast('Removed from this collection.','Undo',()=>{personalChange(()=>personal.setMembership(folder,id,true));refreshPersonalView();});break;
    case 'history-settings':historySettings();break;
    case 'toggle-history':personal.pause(personal.enabled);button.classList.toggle('active',personal.enabled);button.setAttribute('aria-checked',String(personal.enabled));break;
    case 'confirm-clear-history':showDialog('Clear reading history?',`<p class="dialog-description">Remove the ${personal.history.length} recent visits from your history. Your saved reading and resume point will stay.</p><div class="dialog-actions"><button class="primary-button" data-action="clear-history">Clear history</button><button class="secondary-button" data-action="history-settings">Keep it</button></div>`);break;
    case 'clear-history':{const previous=personal.clearHistory();closeDialog();refreshPersonalView();toast('Reading history cleared.','Undo',()=>{personalChange(()=>personal.restoreHistory(previous));refreshPersonalView();});break;}
    case 'resume-passage':await resumePassage(id);break;
    case 'library-more':state.libraryLimit+=60;{const y=window.scrollY;renderApp();window.scrollTo({top:y,behavior:'instant'});}break;
    case 'toast-action':{const fn=toastAction;toastAction=null;$('#toast').classList.remove('show');$('#toast').replaceChildren();fn?.();break;}
  }
}

document.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]'); if (!button) return;
  const { action, id, view, category } = button.dataset;
  if(personalActions.has(action)){try{await handlePersonalAction(action,button);}catch(error){toast(error.message);}return;}
  const post = id ? findPost(id) : activePost();
  switch (action) {
    case 'navigate': navigate(view || 'feed', category || 'all'); break;
    case 'category': state.view='feed';state.category=id;state.surah=null;state.mood=null;state.collection=null;renderApp();break;
    case 'clear-filter': state.surah = null; state.mood = null; state.collection = null; state.category = 'all'; renderApp(); break;
    case 'mood': state.surah = null; state.mood = state.mood === id ? null : id; state.view = 'feed'; state.category = 'all'; state.collection = null; renderApp(); break;
    case 'next': moveFeed(1); break;
    case 'previous': moveFeed(-1); break;
    case 'like': if (post) { state.liked = state.liked.includes(post.id) ? state.liked.filter(x => x !== post.id) : [...state.liked, post.id]; writeStore('liked', state.liked); updateRail(); } break;
    case 'save': if(post){const existed=toggleSave(post);if(dialog.open)button.innerHTML=`${icon('bookmark')} ${existed?'Save':'Unsave'}`;if(state.view==='reader')reader.update();}break;
    case 'audio': if(!post?.audio)break;if(!audioSource(post)){try{await quran.init();}catch{toast('This reciter needs the library to load. Please try again.');break;}}if(!audioSource(post))break;if(audioId!==post.id){audioId=post.id;audio.src=audioSource(post);audio.playbackRate=Number(state.preferences.speed)||1;}if(audio.paused){try{await audio.play();continueRecitation=state.preferences.autoplay;}catch{toast('Recitation could not load. Try again, or open the source.');}}else pauseAudio(true);break;
    case 'mute': audio.muted = !audio.muted; updateAudio(); break;
    case 'source': sourceDialog(post); break;
    case 'photo-details': photoDialog(post); break;
    case 'reflect': if(post?.pending){try{reflectionDialog(await quran.load(post.id));}catch{toast('This passage could not load. Your reflection is still saved.');}}else reflectionDialog(post);break;
    case 'share': shareDialog(post); break;
    case 'copy-quote': await copyText(`${post.arabic ? post.arabic + '\n\n' : ''}“${post.text}”\n\n${post.type === 'story' ? 'Editorial reflection on ' : ''}${post.reference} · ${post.verse}${post.excerpt ? ' (excerpt)' : ''}\n${post.translator || post.narrator || ''}\n${post.source}\n\nShared with Noor`); break;
    case 'copy-link': await copyText(post.source); break;
    case 'share-image': await shareImageDialog(post); break;
    case 'share-format': shareState.format=button.dataset.format; await shareImageDialog(findPost(shareState.id)); break;
    case 'share-download': downloadShareImage(); break;
    case 'share-native': await nativeShareImage(); break;
    case 'today-location': showDialog('Your prayer times', todayView.locationBody()); break;
    case 'today-gps': button.disabled=true;button.textContent='Finding you…';if(await todayView.locate()){closeDialog();toast(`Prayer times set for ${todayView.place().name}.`);renderApp();}else button.disabled=false;break;
    case 'today-asr': todayView.settings.asr=id;todayView.saveSettings();showDialog('Your prayer times', todayView.locationBody());todayView.refreshHero();break;
    case 'today-clock': todayView.settings.hour12=id==='null'?null:id==='true';todayView.saveSettings();showDialog('Your prayer times', todayView.locationBody());todayView.refreshHero();break;
    case 'today-kahf': await openReader(18,1); break;
    case 'today-read': {const ref=canonicalVerse(post);if(ref){const [s,a]=ref.split(':').map(Number);await openReader(s,a);}break;}
    case 'tasbih-tap': todayView.tap(); break;
    case 'tasbih-reset': todayView.resetTasbih(); toast('Tasbīḥ reset.'); break;
    case 'qibla-live': await todayView.startCompass(); break;
    case 'install': if(!await promptInstall())toast('Use your browser’s “Add to Home Screen” to install Noor.'); break;
    case 'focus': toggleFocus(); break;
    case 'settings': settingsDialog(); break;
    case 'theme': setAppearance(state.preferences.dark ? 'editorial' : 'immersive'); break;
    case 'appearance': setAppearance(id); $$('.appearance-picker button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.id===state.preferences.appearance)); break;
    case 'preference': state.preferences[id] = !state.preferences[id]; savePreferences(); if(state.view==='reader'&&id==='translation'){reader.showTranslation=state.preferences.translation;reader.render();reader.observeReading();} if(state.view==='reader'&&id==='large'){reader.textSize=state.preferences.large?'large':'comfortable';reader.render();reader.observeReading();} button.classList.toggle('active', state.preferences[id]); button.setAttribute('aria-checked', state.preferences[id]); break;
    case 'goal': state.preferences.goal = Number(id); savePreferences(); $$('.goal-option').forEach(b => b.classList.toggle('active', b.dataset.id === id)); if ($('#daily-progress')) $('#daily-progress').innerHTML = dailyProgress(); break;
    case 'close-dialog': closeDialog(); break;
    case 'search': searchDialog(); break;
    case 'surahs': surahDialog();break;
    case 'read-surah': await openReader(Number(id));break;
    case 'open-reader': {const ref=quran.reference(id||readStore('last-read',null)?.id);await openReader(ref?.surah.number||1,ref?.ayah||1);break;}
    case 'continue-surah': {const reference=canonicalVerse(post);if(reference){const [s,a]=reference.split(':').map(Number);await openReader(s,a);}break;}
    case 'retry-card': failedCards.delete(id);await hydrateWindow();break;
    case 'retry-search': searchResults($('#search-input')?.value||'');break;
    case 'retry-library': await initializeLibrary(true);break;
    case 'open-post': openPost(id); break;
    case 'collection': collectionDialog(id); break;
    case 'start-collection': state.surah=null;closeDialog(); state.view = 'feed'; state.category = 'all'; state.mood = null; state.collection = id; renderApp(); break;
    case 'save-collection': state.saved = [...new Set([...state.saved, ...collections.find(c => c.id === id).posts])]; writeStore('saved', state.saved); updateRail(); toast('Collection saved to your library.'); button.innerHTML = `${icon('check')} Saved`; break;
    case 'library-tab': state.libraryTab=id;state.personalCollection=null;state.libraryLimit=60;renderApp();window.scrollTo({top:0,behavior:'instant'});$(`.personal-tabs [data-id="${id}"]`)?.focus({preventScroll:true});break;
    case 'reflections': state.libraryTab = 'notes'; navigate('library'); break;
    case 'save-reflection': { const value = $('#reflection-text').value.trim(); if (!value) { toast('Add a thought before saving your reflection.'); $('#reflection-text').focus(); break; } state.notes[id] = { text: value, updated: new Date().toISOString() }; writeStore('notes', state.notes); closeDialog(); toast('Your reflection is saved. Just for you.'); if (state.view === 'library') renderApp(); break; }
    case 'delete-reflection': delete state.notes[id]; writeStore('notes', state.notes); closeDialog(); toast('Reflection deleted.'); if (state.view === 'library') renderApp(); break;
    case 'intention': intentionDialog(); break;
    case 'preset-intention': $('#intention-text').value = button.dataset.text; break;
    case 'save-intention': { const text = $('#intention-text').value.trim(); if (!text) { $('#intention-text').focus(); toast('Write a small intention, or choose one below.'); break; } state.intention = { date: today(), text }; writeStore('intention', state.intention); closeDialog(); const activeId = activePost()?.id; renderApp(activeId, state.view === 'feed'); toast('A beautiful intention to carry with you.'); break; }
    case 'about': showDialog('A little light. A little closer.', `<p class="dialog-description">Noor is a quiet corner of the internet for your heart: Qur’anic verses, du’as, hadith, and thoughtful stories, one moment at a time.</p><p class="detail-label">Rooted in the source</p><p class="detail-text">The complete Qur’an includes 6,236 ayahs with Marmaduke Pickthall’s English translation. Arabic is preserved from <a href="https://tanzil.net" target="_blank" rel="noopener noreferrer">Tanzil</a> via <a href="https://alquran.cloud" target="_blank" rel="noopener noreferrer">Al Quran Cloud</a>. <a href="/data/quran/NOTICE.txt" target="_blank" rel="noopener noreferrer">Text attribution and license</a>. The original curated cards use Dr. Mustafa Khattab, The Clear Quran, via <a href="https://quran.com" target="_blank" rel="noopener noreferrer">Quran.com</a>. Hadith excerpts link to their complete narrations on <a href="https://sunnah.com" target="_blank" rel="noopener noreferrer">Sunnah.com</a>. Recitation choices include Mishary Rashid Alafasy, Mahmoud Khalil Al-Husary, and Abdul Basit Abdus Samad. Audio is provided via <a href="https://everyayah.com" target="_blank" rel="noopener noreferrer">EveryAyah</a> and the Al Quran Cloud audio CDN. Full-library audio needs a connection.</p><p class="detail-text">The feed loads unseen reminders first. After the available collection is exhausted, repeats are marked “You’re revisiting.” Repeated cards share the same saves and reflections.</p><p class="detail-text">Story takeaways and reflection prompts are editorial writing. They are labelled separately from scripture and are an invitation to reflect, not a scholarly interpretation or religious ruling.</p><p class="detail-label">Your own quiet space</p><p class="detail-text">Saved reminders, intentions, and notes are stored only in this browser. Clearing your browser data removes them. The daily goal measures time spent with different reminders; it is not a measure of faith.</p><p class="detail-label">Made with care</p><p class="detail-text">The photographs are by independent photographers on Unsplash. Open “Photograph & visual connection” in a passage’s source details for the photographer and the reason for the selection. Some images are thematic companions, not literal depictions. <a href="/assets/photos/credits.json" target="_blank" rel="noopener noreferrer">All photo credits and licenses</a>. No social metrics. No account required. Just a moment to reconnect.</p>`); break;
  }
});
document.addEventListener('input', event => {
  if(event.target.id==='search-input'){clearTimeout(searchTimer);searchGeneration++;searchTimer=setTimeout(()=>searchResults(event.target.value),180);}
  if(event.target.id==='surah-search')renderSurahs(event.target.value);
  if (event.target.matches('.audio-slider') && Number(event.target.closest('.feed-slide').dataset.index)===state.active && audioId === event.target.dataset.id && Number.isFinite(audio.duration)) audio.currentTime = Number(event.target.value) / 100 * audio.duration;
});
document.addEventListener('change', async event => { if(event.target.id==='today-city'){todayView.setCity(event.target.value);showDialog('Your prayer times', todayView.locationBody());todayView.refreshHero();todayView.refreshCard('.today-qibla',todayView.qiblaCard());return;} if(event.target.id==='today-method'){todayView.settings.method=event.target.value;todayView.saveSettings();todayView.refreshHero();return;} if(event.target.id==='audio-reciter'){state.preferences.reciter=event.target.value;savePreferences();audioId=null;if(state.view==='reader'){await reader.session.changeReciter();reader.render();reader.observeReading();}else {const current=activePost();if(current?.audio){audio.src=audioSource(current);audio.load();audioId=current.id;}$$('.reciter').forEach(el=>{const post=findPost(el.closest('.feed-slide').dataset.id);el.textContent=`${getReciter(state.preferences.reciter).name}${post?.excerpt?' · Full ayah':''}`;});}} if (event.target.id === 'audio-speed') { state.preferences.speed = Number(event.target.value); savePreferences(); } });
document.addEventListener('pointerdown', event => {
  if(dialog.open || event.target.closest('button,a,input,textarea,select,[contenteditable="true"]'))return;
  const surface=event.target.closest('.flowing-verse .slide-body');
  // Clicking text should establish the same reading focus as tabbing to it.
  surface?.focus({preventScroll:true});
});
document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchDialog(); return; }
  if (dialog.open || event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
  if (state.focus && event.key === 'Escape') { toggleFocus(); return; }
  if (state.view !== 'feed') return;
  const control=event.target.closest('button,a');
  const surface=event.target.closest('.flowing-verse .slide-body');
  if(surface && !control && scrollReadingKey(event,surface))return;
  // Home/End refer to this passage, never the end of the current virtual feed
  // window. Page keys also read the active long verse when the feed has focus.
  if(['Home','End','PageUp','PageDown'].includes(event.key) && (!control || control.closest('.feed-container'))){
    const current=$(`.feed-slide[data-index="${state.active}"].flowing-verse .slide-body`);
    if(current){if(!control)current.focus({preventScroll:true});scrollReadingKey(event,current);}
    else {event.preventDefault();if(event.key==='PageDown'||event.key==='PageUp')moveFeed(event.key==='PageDown'?1:-1);}
    return;
  }
  // Preserve a focused control's native keyboard operation.
  if(control)return;
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); moveFeed(event.key === 'ArrowDown' ? 1 : -1); }
  if (event.code === 'Space' && event.target.tagName !== 'BUTTON') { event.preventDefault(); $(`.feed-slide[data-index="${state.active}"] .play-button`)?.click(); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { pauseAudio(true); clearTimeout(readTimer); } else if (state.view === 'feed') setActive(state.active); });
let resizeTimer;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { const container = $('#feed-scroll'); if (container) {sizeFeed(container);resetAutoFlow();fitCards();container.scrollTo({ top: (state.active - feedWindow.start) * container.clientHeight, behavior: 'instant' });} }, 150); });
window.addEventListener('hashchange', () => { const id = location.hash.slice(1); if (findPost(id)) openPost(id); });
async function initializeLibrary(retry=false){
  const generation=renderGeneration;
  try{await quran.init();state.libraryError=false;}
  catch{state.libraryError=true;if(generation===renderGeneration)renderApp(activePost()?.id);return;}
  // Publish the catalogue before background hydration. A slow saved-content
  // request must never reset a passage the visitor has already opened.
  if(generation===renderGeneration){
    const hash=location.hash.slice(1);
    if(findPost(hash))await openPost(hash);else renderApp(activePost()?.id);
  }else if(state.view==='feed')hydrateWindow();
  else if(state.view==='library')hydratePersonalView();
  const savedIds=[...state.saved,...state.liked,...Object.keys(state.notes),...personal.collections.map(c=>c.ids[0]),...personal.history.slice(0,60).map(e=>e.id),personal.resume?.id].filter(Boolean);
  const viewGeneration=renderGeneration;
  await quran.loadMany(savedIds).catch(()=>toast('Some saved ayahs are temporarily unavailable. Your saves are still here.'));
  if(state.view==='library'&&viewGeneration===renderGeneration&&!dialog.open){
    const y=window.scrollY;$('#main').innerHTML=libraryView();window.scrollTo({top:y,behavior:'instant'});
  }
}

applyPreferences();
renderApp();
initializeLibrary();
registerOffline({toast:(...a)=>toast(...a)});
document.fonts.ready.then(fitCards);

let positionTimer;
document.addEventListener('scroll',event=>{
  const body=event.target;if(!(body instanceof Element)||!body.matches('.feed-slide:not([inert]) .slide-body'))return;
  const id=body.closest('.feed-slide').dataset.id,position=body.scrollTop;
  clearTimeout(positionTimer);positionTimer=setTimeout(()=>personalChange(()=>personal.setOffset(id,position)),100);
},true);
document.addEventListener('submit',event=>{
  if(event.target.id!=='collection-form')return;event.preventDefault();
  const form=event.target,{folder,post}=form.dataset;
  try{
    if(folder)personal.rename(folder,$('#collection-name').value);
    else {const c=personal.create($('#collection-name').value,post);state.personalCollection=c.id;}
    closeDialog();
    if(post){organiseDialog(post);}
    else {state.libraryTab='collections';state.view='library';state.focus=false;renderApp();}
  }catch(error){$('#collection-error').textContent=error.message;$('#collection-name').focus();}
});
document.addEventListener('input',event=>{if(event.target.id==='collection-search')renderCollectionCandidates(event.target.dataset.folder,event.target.value);});
document.addEventListener('keydown',event=>{
  const tab=event.target.closest('.personal-tabs [role="tab"]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();const tabs=$$('.personal-tabs [role="tab"]'),i=tabs.indexOf(tab),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next].click();
});

window.addEventListener('storage',event=>{
  if(!['noor:personal-library','noor:saved','noor:liked','noor:notes'].includes(event.key))return;
  personal.refresh();
  for(const key of ['saved','liked']){const value=readStore(key,[]);if(Array.isArray(value))state[key]=value;}
  const notes=readStore('notes',{});if(notes&&typeof notes==='object'&&!Array.isArray(notes))state.notes=notes;
  if(state.view==='library'&&!dialog.open){const y=window.scrollY;renderApp();window.scrollTo({top:y,behavior:'instant'});}
  else if(state.view==='feed')updateRail();
});
