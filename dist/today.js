// The "Today" home: Hijri date, live prayer times and countdown, a sun-path
// of the day, verse of the day, tasbih, Qibla compass and a gentle streak.
import { PRAYERS, methods, cities, prayerSchedule, qibla, distanceToKaaba, compassPoint, hijriDate, sacredSeason, formatTime, formatCountdown, zonedDate } from './prayer.js';

// Well-known, self-contained ayahs for the verse of the day.
const DAILY_VERSES = ['2:152', '2:186', '2:255', '2:286', '3:8', '3:139', '3:159', '3:190', '6:162', '7:56', '8:46', '9:51', '11:88', '12:87', '13:11', '13:28', '14:7', '15:49', '16:97', '16:128', '17:80', '18:10', '18:46', '20:25', '20:46', '21:83', '21:87', '23:1', '24:35', '25:63', '28:24', '29:69', '31:17', '33:41', '33:56', '35:34', '39:10', '39:53', '40:60', '42:36', '49:10', '49:13', '50:16', '51:56', '55:13', '57:4', '57:20', '59:22', '64:11', '65:2', '65:3', '67:2', '73:8', '87:14', '89:27', '93:3', '93:5', '94:5', '94:6', '103:1', '112:1'];

const DHIKR = [
  { arabic: 'سُبْحَانَ ٱللَّٰهِ', latin: 'SubḥānAllāh', meaning: 'Glory be to Allah', target: 33 },
  { arabic: 'ٱلْحَمْدُ لِلَّٰهِ', latin: 'Alḥamdulillāh', meaning: 'All praise is for Allah', target: 33 },
  { arabic: 'ٱللَّٰهُ أَكْبَرُ', latin: 'Allāhu akbar', meaning: 'Allah is the Greatest', target: 34 },
];

const REGION_METHOD = [
  [/^America\//, 'isna', 'standard'], [/^Asia\/(Riyadh|Aden)/, 'makkah', 'standard'], [/^Asia\/(Dubai|Muscat)/, 'dubai', 'standard'],
  [/^Asia\/(Qatar|Kuwait|Bahrain)/, 'gulf', 'standard'], [/^Asia\/(Karachi|Kolkata|Calcutta|Dhaka|Kabul)/, 'karachi', 'hanafi'],
  [/^Europe\/Istanbul/, 'turkey', 'hanafi'], [/^Africa\/(Cairo|Khartoum|Tripoli)/, 'egypt', 'standard'],
  [/^Asia\/(Singapore|Kuala_Lumpur|Jakarta|Makassar|Brunei)/, 'singapore', 'standard'],
];

const dayKey = date => { const d = zonedDate(date); return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`; };

export function defaultPrayerSettings(timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const city = cities.find(c => c.timeZone === timeZone) || cities[0];
  const [, method = 'mwl', asr = 'standard'] = REGION_METHOD.find(([pattern]) => pattern.test(timeZone)) || [];
  return { place: { ...city, source: city.timeZone === timeZone ? 'timezone' : 'default' }, method, asr, hour12: null };
}

export class TodayView {
  constructor({ quran, read, write, icon, escape, toast, personal, getRead, openReader, shareImage }) {
    Object.assign(this, { quran, read, write, icon, escape, toast, personal, getRead, openReader, shareImage });
    this.settings = { ...defaultPrayerSettings(), ...(read('prayer', null) || {}) };
    this.tasbih = this.loadTasbih();
    this.verse = null;
    this.heading = null;
    this.timer = null;
  }

  loadTasbih() {
    const stored = this.read('tasbih', null) || {};
    const fresh = { date: dayKey(new Date()), phase: 0, count: 0, today: 0, lifetime: Number(stored.lifetime) || 0, days: Array.isArray(stored.days) ? stored.days : [] };
    return stored.date === fresh.date ? { ...fresh, ...stored } : fresh;
  }

  saveSettings() { this.write('prayer', this.settings); }

  place() { return this.settings.place; }
  options() { return { method: this.settings.method, asr: this.settings.asr }; }

  /* ---------- verse of the day ---------- */
  dailyKey(date = new Date()) {
    const d = zonedDate(date);
    const n = Math.floor(Date.UTC(d.year, d.month - 1, d.day) / 86400000);
    return DAILY_VERSES[((n * 7919) % DAILY_VERSES.length + DAILY_VERSES.length) % DAILY_VERSES.length];
  }
  async loadVerse() {
    const key = this.dailyKey();
    if (this.verse?.verse === key) return this.verse;
    try {
      await this.quran.init();
      const [s, a] = key.split(':');
      this.verse = await this.quran.load(`q-${s}-${a}`);
    } catch { this.verse = null; }
    return this.verse;
  }

  /* ---------- streak ---------- */
  activeDays() {
    const days = new Set();
    for (const entry of this.personal.history || []) if (entry?.at) days.add(dayKey(new Date(entry.at)));
    for (const [day, ids] of Object.entries(this.getRead() || {})) if (Array.isArray(ids) && ids.length) days.add(day);
    for (const day of this.tasbih.days || []) days.add(day);
    return days;
  }
  streak() {
    const days = this.activeDays();
    let current = 0, cursor = new Date();
    if (!days.has(dayKey(cursor))) cursor = new Date(cursor.getTime() - 86400000);
    while (days.has(dayKey(cursor))) { current++; cursor = new Date(cursor.getTime() - 86400000); }
    const week = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(Date.now() - (6 - i) * 86400000);
      return { label: new Intl.DateTimeFormat(undefined, { weekday: 'narrow' }).format(date), active: days.has(dayKey(date)), today: i === 6 };
    });
    return { current, total: days.size, week };
  }

  /* ---------- rendering ---------- */
  scene(schedule, now) {
    const t = schedule.today;
    if (!t.fajr || now < t.fajr || (t.isha && now > t.isha)) return { photo: 'stars', mood: 'night' };
    if (t.sunrise && now < t.sunrise) return { photo: 'birds-dawn', mood: 'dawn' };
    if (t.asr && now < t.asr) return { photo: 'clouds', mood: 'day' };
    if (t.maghrib && now < t.maghrib) return { photo: 'mountain-light', mood: 'afternoon' };
    return { photo: 'ocean-sunset', mood: 'dusk' };
  }

  sunPath(schedule, now) {
    const t = schedule.today, W = 600, H = 150, horizon = 112;
    if (!t.fajr || !t.isha || !t.sunrise || !t.maghrib) return '';
    const start = t.fajr.getTime() - 40 * 60000, end = t.isha.getTime() + 40 * 60000;
    const x = time => ((time - start) / (end - start)) * W;
    const y = time => {
      const rise = t.sunrise.getTime(), set = t.maghrib.getTime();
      if (time >= rise && time <= set) return horizon - Math.sin(Math.PI * (time - rise) / (set - rise)) * 92;
      const edge = time < rise ? (rise - time) / (rise - start) : (time - set) / (end - set);
      return horizon + Math.sin(Math.min(1, edge) * Math.PI / 2) * 16;
    };
    const points = Array.from({ length: 81 }, (_, i) => { const time = start + (end - start) * i / 80; return `${x(time).toFixed(1)},${y(time).toFixed(1)}`; });
    const marks = PRAYERS.map(p => t[p.id] && `<g class="sun-mark ${schedule.next.id === p.id && now < schedule.nextAt ? 'next' : ''}"><circle cx="${x(+t[p.id]).toFixed(1)}" cy="${y(+t[p.id]).toFixed(1)}" r="3.2"/><text x="${x(+t[p.id]).toFixed(1)}" y="${horizon + 36}" text-anchor="middle">${p.label}</text></g>`).join('');
    const nowTime = Math.min(end, Math.max(start, now.getTime()));
    const isDay = now >= t.sunrise && now <= t.maghrib;
    const inRange = true;
    return `<svg class="sun-path" viewBox="0 -8 ${W} ${H + 8}" role="img" aria-label="The path of the sun today, from Fajr to Isha"><defs><linearGradient id="sun-glow" x1="0" x2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".15"/><stop offset=".5" stop-color="currentColor" stop-opacity=".9"/><stop offset="1" stop-color="currentColor" stop-opacity=".15"/></linearGradient></defs><line class="horizon" x1="0" x2="${W}" y1="${horizon}" y2="${horizon}"/><polyline class="sun-track" points="${points.join(' ')}"/>${marks}${inRange ? `<g class="sun-now ${isDay ? 'day' : 'night'}" style="transform:translate(${x(nowTime).toFixed(1)}px,${y(nowTime).toFixed(1)}px)"><circle class="halo" r="15"/><circle class="core" r="7"/></g>` : ''}</svg>`;
  }

  hero(now = new Date()) {
    const place = this.place(), schedule = prayerSchedule(now, place, this.options());
    const hijri = hijriDate(now, place.timeZone), season = sacredSeason(hijri);
    const scene = this.scene(schedule, now);
    const greg = new Intl.DateTimeFormat(undefined, { timeZone: place.timeZone, weekday: 'long', day: 'numeric', month: 'long' }).format(now);
    const friday = new Intl.DateTimeFormat('en-US', { timeZone: place.timeZone, weekday: 'long' }).format(now) === 'Friday';
    const greeting = { night: 'A quiet night', dawn: 'The dawn is here', day: 'Good day', afternoon: 'The afternoon light', dusk: 'Evening falls' }[scene.mood];
    return `<section class="today-hero mood-${scene.mood}" aria-labelledby="today-title">
      <img class="today-hero-bg" src="/assets/photos/${scene.photo}-1400.webp" alt="" decoding="async"/>
      <div class="today-hero-shade"></div>
      <div class="today-hero-top">
        <div><p class="today-eyebrow">${this.escape(greeting)} · ${this.escape(greg)}</p>
        <h1 id="today-title" class="today-hijri">${hijri ? `${hijri.day} ${this.escape(hijri.month)} <span>${this.escape(hijri.year)}</span>` : this.escape(greg)}</h1>
        ${hijri ? `<p class="today-hijri-ar" lang="ar" dir="rtl">${this.escape(hijri.arabic)}</p>` : ''}</div>
        <button class="today-place" data-action="today-location">${this.icon('compass')}<span>${this.escape(place.name)}</span>${place.source !== 'gps' ? '<small>Set</small>' : ''}</button>
      </div>
      ${season || friday ? `<div class="today-season">${this.icon('spark')}<span>${this.escape([friday ? 'Jumuʿah Mubārak' : null, season].filter(Boolean).join(' · '))}</span>${friday ? `<button data-action="today-kahf">Read al-Kahf ${this.icon('arrow')}</button>` : ''}</div>` : ''}
      <div class="today-next" aria-live="off">
        <p class="today-next-label">${schedule.nextAt - now < 15 * 60000 ? 'Almost time for' : 'Next prayer'}</p>
        <p class="today-next-name"><span>${schedule.next.label}</span><span class="today-next-ar" lang="ar" dir="rtl">${schedule.next.arabic}</span></p>
        <p class="today-countdown" data-countdown="${schedule.nextAt.getTime()}">in <strong>${formatCountdown(schedule.nextAt - now)}</strong> · ${formatTime(schedule.nextAt, place.timeZone, this.settings.hour12 ?? undefined)}</p>
      </div>
      ${this.sunPath(schedule, now)}
      <ol class="today-prayers" aria-label="Prayer times today">${PRAYERS.map(p => {
        const at = schedule.today[p.id];
        const state = schedule.current?.id === p.id && !p.marker ? 'current' : schedule.next.id === p.id && schedule.nextAt === at ? 'next' : at && at < now ? 'past' : '';
        return `<li class="${state} ${p.marker ? 'marker' : ''}"><span class="prayer-name">${p.label}</span><span class="prayer-ar" lang="ar" dir="rtl">${p.arabic}</span><time datetime="${at?.toISOString() || ''}">${formatTime(at, place.timeZone, this.settings.hour12 ?? undefined)}</time></li>`;
      }).join('')}</ol>
      <p class="today-method">${this.escape(methods[this.settings.method]?.label || '')} · Asr ${this.settings.asr === 'hanafi' ? 'Ḥanafī' : 'standard'}${schedule.today.highLatitude ? ' · high-latitude adjustment' : ''} · <button data-action="today-location">Adjust</button></p>
    </section>`;
  }

  verseCard() {
    const v = this.verse;
    if (!v) return `<article class="today-card today-verse loading"><p class="today-card-label">${this.icon('book')} Verse of the day</p><div class="today-skeleton"></div><div class="today-skeleton short"></div></article>`;
    return `<article class="today-card today-verse"><img src="/assets/photos/${this.versePhoto()}-960.webp" alt="" class="today-verse-bg" loading="lazy"/><div class="today-verse-inner">
      <p class="today-card-label">${this.icon('book')} Verse of the day</p>
      <p class="today-verse-ar" lang="ar" dir="rtl">${this.escape(v.arabic)}</p>
      <p class="today-verse-en">${this.escape(v.text)}</p>
      <p class="today-verse-ref">${this.escape(v.reference)} · ${this.escape(v.verse)}</p>
      <div class="today-verse-actions"><button class="today-pill" data-action="today-read" data-id="${this.escape(v.id)}">${this.icon('book')} Read in context</button><button class="today-pill" data-action="share-image" data-id="${this.escape(v.id)}">${this.icon('share')} Share as image</button></div>
    </div></article>`;
  }
  versePhoto() {
    const pool = ['dawn-mountains', 'river', 'forest-path', 'garden', 'sand-dunes', 'ocean-waves', 'autumn-path', 'mountain-light'];
    const key = this.dailyKey(); let hash = 0; for (const c of key) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
    return pool[hash % pool.length];
  }

  tasbihCard() {
    const t = this.tasbih, done = t.phase >= DHIKR.length, d = DHIKR[Math.min(t.phase, DHIKR.length - 1)];
    const progress = done ? 1 : t.count / d.target, C = 2 * Math.PI * 88;
    return `<article class="today-card today-tasbih ${done ? 'done' : ''}" aria-labelledby="tasbih-title">
      <div class="today-card-head"><p class="today-card-label" id="tasbih-title">${this.icon('spark')} Tasbīḥ</p><button class="today-mini" data-action="tasbih-reset" aria-label="Reset tasbih">${this.icon('reset')}</button></div>
      <button class="tasbih-orb" data-action="tasbih-tap" aria-label="${done ? 'Tasbih complete. Tap to begin again' : `${d.latin}, ${t.count} of ${d.target}`}">
        <svg viewBox="0 0 200 200" aria-hidden="true"><circle class="tasbih-track" cx="100" cy="100" r="88"/><circle class="tasbih-ring" cx="100" cy="100" r="88" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - progress)).toFixed(1)}"/>${Array.from({ length: 33 }, (_, i) => { const a = (i / 33) * Math.PI * 2 - Math.PI / 2; return `<circle class="tasbih-bead ${!done && i < Math.round(progress * 33) ? 'on' : done ? 'on' : ''}" cx="${(100 + Math.cos(a) * 88).toFixed(1)}" cy="${(100 + Math.sin(a) * 88).toFixed(1)}" r="2.4"/>`; }).join('')}</svg>
        <span class="tasbih-inner">${done ? `<span class="tasbih-done">${this.icon('check')}</span><span class="tasbih-latin">Complete</span>` : `<span class="tasbih-ar" lang="ar" dir="rtl">${d.arabic}</span><span class="tasbih-count">${t.count}</span><span class="tasbih-latin">${d.latin} · ${d.target}</span>`}</span>
      </button>
      <ol class="tasbih-steps" aria-label="After-prayer dhikr">${DHIKR.map((x, i) => `<li class="${i < t.phase ? 'done' : i === t.phase ? 'active' : ''}">${x.latin}<small>${x.meaning}</small></li>`).join('')}</ol>
      <p class="today-card-foot">${t.today} today · ${t.lifetime.toLocaleString()} in all</p>
    </article>`;
  }

  qiblaCard() {
    const place = this.place(), bearing = qibla(place), dist = distanceToKaaba(place);
    const ticks = Array.from({ length: 72 }, (_, i) => `<line x1="100" y1="${i % 18 === 0 ? 10 : i % 6 === 0 ? 13 : 15}" x2="100" y2="19" transform="rotate(${i * 5} 100 100)"/>`).join('');
    return `<article class="today-card today-qibla" aria-labelledby="qibla-title">
      <div class="today-card-head"><p class="today-card-label" id="qibla-title">${this.icon('compass')} Qibla</p><button class="today-mini text" data-action="qibla-live">${this.heading === null ? 'Live compass' : 'Compass on'}</button></div>
      <div class="qibla-dial-wrap"><svg class="qibla-dial" viewBox="0 0 200 200" role="img" aria-label="Qibla is ${Math.round(bearing)} degrees from north, ${compassPoint(bearing)}">
        <g class="qibla-rose" style="transform:rotate(${this.heading === null ? 0 : -this.heading}deg)"><circle cx="100" cy="100" r="92" class="qibla-face"/><g class="qibla-ticks">${ticks}</g>
          ${['N', 'E', 'S', 'W'].map((l, i) => `<text x="100" y="38" text-anchor="middle" transform="rotate(${i * 90} 100 100)" class="${l === 'N' ? 'north' : ''}">${l}</text>`).join('')}
          <g transform="rotate(${bearing.toFixed(1)} 100 100)"><path class="qibla-needle" d="M100 30 L108 100 L100 110 L92 100Z"/><rect class="qibla-kaaba" x="93" y="17" width="14" height="14" rx="1.5"/><rect class="qibla-kaaba-band" x="93" y="21" width="14" height="2.5"/></g>
          <circle cx="100" cy="100" r="5" class="qibla-pin"/></g></svg></div>
      <p class="qibla-reading"><strong>${Math.round(bearing)}°</strong> ${compassPoint(bearing)} from true north</p>
      <p class="today-card-foot">${Math.round(dist).toLocaleString()} km to the Kaʿbah from ${this.escape(place.name)}${this.heading === null ? '' : ` · facing ${Math.round(this.heading)}°`}</p>
    </article>`;
  }

  streakCard() {
    const s = this.streak(), goal = this.read('preferences', {})?.goal || 5;
    const todayReads = (this.getRead() || {})[dayKey(new Date())]?.length || 0;
    return `<article class="today-card today-streak" aria-labelledby="streak-title">
      <p class="today-card-label" id="streak-title">${this.icon('leaf')} Your rhythm</p>
      <p class="streak-number"><strong>${s.current}</strong> day${s.current === 1 ? '' : 's'}</p>
      <p class="streak-caption">${s.current ? 'Consistency, however small, is beloved to Allah.' : 'Begin today. The most beloved deeds are the consistent ones, even if small.'}</p>
      <ol class="streak-week" aria-label="Last seven days">${s.week.map(d => `<li class="${d.active ? 'on' : ''} ${d.today ? 'today' : ''}"><span></span>${d.label}</li>`).join('')}</ol>
      <div class="streak-goal"><span>Today’s reading</span><span>${Math.min(todayReads, goal)} / ${goal}</span></div>
      <div class="streak-bar"><span style="width:${Math.min(100, (todayReads / goal) * 100)}%"></span></div>
      <button class="today-pill solid" data-action="navigate" data-view="feed">${this.icon('home')} Continue your feed</button>
    </article>`;
  }

  render() {
    return `<div class="today" data-today>${this.hero()}<div class="today-grid">${this.verseCard()}${this.tasbihCard()}${this.qiblaCard()}${this.streakCard()}</div><p class="today-disclaimer">Prayer times are calculated on your device from your location and chosen method. Your local mosque’s timetable takes precedence.</p></div>`;
  }

  /* ---------- lifecycle ---------- */
  mount(root) {
    this.root = root;
    this.loadVerse().then(() => { const card = root.querySelector('.today-verse'); if (card && this.root === root) card.outerHTML = this.verseCard(); });
    let lastMinute = new Date().getMinutes();
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (!this.root?.isConnected) return this.unmount();
      const now = new Date(), countdown = this.root.querySelector('[data-countdown]');
      if (countdown) {
        const at = Number(countdown.dataset.countdown);
        if (at <= now.getTime()) { this.refreshHero(); this.toast(`It’s time for ${prayerSchedule(new Date(now.getTime() - 1000), this.place(), this.options()).next.label}.`); return; }
        countdown.querySelector('strong').textContent = formatCountdown(at - now);
      }
      if (now.getMinutes() !== lastMinute) { lastMinute = now.getMinutes(); this.refreshHero(); }
    }, 1000);
  }
  unmount() { clearInterval(this.timer); this.timer = null; this.stopCompass(); this.root = null; }
  refreshHero() { const hero = this.root?.querySelector('.today-hero'); if (hero) hero.outerHTML = this.hero(); }
  refreshCard(selector, html) { const el = this.root?.querySelector(selector); if (el) el.outerHTML = html; }

  /* ---------- tasbih ---------- */
  tap() {
    const t = this.tasbih;
    if (t.phase >= DHIKR.length) { Object.assign(t, { phase: 0, count: 0 }); }
    else {
      t.count++; t.today++; t.lifetime++;
      const today = dayKey(new Date());
      if (!t.days.includes(today)) t.days = [...t.days.slice(-120), today];
      if (t.count >= DHIKR[t.phase].target) { t.phase++; t.count = 0; navigator.vibrate?.([25, 40, 25]); if (t.phase >= DHIKR.length) this.toast('Tasbīḥ complete. May it be accepted.'); }
      else navigator.vibrate?.(8);
    }
    this.write('tasbih', t);
    const focused = document.activeElement?.classList.contains('tasbih-orb');
    this.refreshCard('.today-tasbih', this.tasbihCard());
    if (focused) this.root?.querySelector('.tasbih-orb')?.focus({ preventScroll: true });
  }
  resetTasbih() { Object.assign(this.tasbih, { phase: 0, count: 0 }); this.write('tasbih', this.tasbih); this.refreshCard('.today-tasbih', this.tasbihCard()); }

  /* ---------- compass ---------- */
  async startCompass() {
    if (this.heading !== null) { this.stopCompass(); this.refreshCard('.today-qibla', this.qiblaCard()); return; }
    const Orientation = window.DeviceOrientationEvent;
    if (!Orientation) { this.toast('This device doesn’t offer a compass. Use the bearing shown instead.'); return; }
    try { if (typeof Orientation.requestPermission === 'function' && await Orientation.requestPermission() !== 'granted') { this.toast('Compass access was not allowed.'); return; } }
    catch { this.toast('Compass access was not allowed.'); return; }
    let received = false, frame = 0;
    this.orientationHandler = event => {
      const heading = typeof event.webkitCompassHeading === 'number' ? event.webkitCompassHeading : event.absolute && event.alpha !== null ? 360 - event.alpha : null;
      if (heading === null) return;
      received = true; this.heading = heading;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rose = this.root?.querySelector('.qibla-rose');
        if (rose) rose.style.transform = `rotate(${-heading}deg)`;
        const diff = Math.abs(((qibla(this.place()) - heading + 540) % 360) - 180);
        this.root?.querySelector('.today-qibla')?.classList.toggle('aligned', diff < 5);
      });
    };
    const type = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
    window.addEventListener(type, this.orientationHandler);
    this.orientationType = type;
    this.heading = 0;
    this.refreshCard('.today-qibla', this.qiblaCard());
    setTimeout(() => { if (!received && this.orientationHandler) { this.stopCompass(); this.refreshCard('.today-qibla', this.qiblaCard()); this.toast('No compass reading came through. Use the bearing shown instead.'); } }, 2500);
  }
  stopCompass() { if (this.orientationHandler) window.removeEventListener(this.orientationType, this.orientationHandler); this.orientationHandler = null; this.heading = null; }

  /* ---------- location & method ---------- */
  locationBody() {
    const s = this.settings;
    return `<p class="dialog-description">Prayer times are calculated on this device. Your location is never sent anywhere.</p>
      <button class="primary-button today-locate" data-action="today-gps">${this.icon('compass')} Use my precise location</button>
      <label class="personal-input-label" for="today-city">Or choose a city</label>
      <select id="today-city" class="today-select">${cities.map((c, i) => `<option value="${i}" ${c.name === s.place.name && s.place.source !== 'gps' ? 'selected' : ''}>${c.name}</option>`).join('')}${s.place.source === 'gps' ? `<option value="gps" selected>${this.escape(s.place.name)}</option>` : ''}</select>
      <label class="personal-input-label" for="today-method">Calculation method</label>
      <select id="today-method" class="today-select">${Object.entries(methods).map(([id, m]) => `<option value="${id}" ${id === s.method ? 'selected' : ''}>${m.label}</option>`).join('')}</select>
      <div class="today-seg" role="radiogroup" aria-label="Asr calculation">${[['standard', 'Asr · Standard (Shāfiʿī, Mālikī, Ḥanbalī)'], ['hanafi', 'Asr · Ḥanafī']].map(([id, label]) => `<button role="radio" aria-checked="${s.asr === id}" class="${s.asr === id ? 'on' : ''}" data-action="today-asr" data-id="${id}">${label}</button>`).join('')}</div>
      <div class="today-seg" role="radiogroup" aria-label="Clock format">${[[null, 'Device clock'], [false, '24-hour'], [true, '12-hour']].map(([v, label]) => `<button role="radio" aria-checked="${s.hour12 === v}" class="${s.hour12 === v ? 'on' : ''}" data-action="today-clock" data-id="${v}">${label}</button>`).join('')}</div>`;
  }
  async locate() {
    if (!navigator.geolocation) { this.toast('Location isn’t available in this browser.'); return false; }
    return new Promise(resolve => navigator.geolocation.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const nearest = cities.map(c => ({ c, d: Math.hypot(c.lat - lat, (c.lng - lng) * Math.cos(lat * Math.PI / 180)) })).sort((a, b) => a.d - b.d)[0];
      const name = nearest && nearest.d < 0.6 ? nearest.c.name : `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(2)}°${lng >= 0 ? 'E' : 'W'}`;
      this.settings.place = { name, lat, lng, timeZone, source: 'gps' };
      this.saveSettings(); resolve(true);
    }, () => { this.toast('Location permission was not given. Choose a city instead.'); resolve(false); }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 3600000 }));
  }
  setCity(index) {
    if (index === 'gps') return;
    const city = cities[Number(index)]; if (!city) return;
    this.settings.place = { ...city, source: 'manual' };
    const [, method, asr] = REGION_METHOD.find(([p]) => p.test(city.timeZone)) || [null, 'mwl', 'standard'];
    this.settings.method = method; this.settings.asr = asr;
    this.saveSettings();
  }
}
