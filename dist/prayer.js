// Prayer times, Qibla and Hijri dates, computed entirely on the device.
// The solar model follows the widely used PrayTimes.org approach: solar
// declination and the equation of time give solar noon; each prayer is the
// moment the sun reaches a given depression angle (or shadow length for Asr).

const rad = d => d * Math.PI / 180;
const deg = r => r * 180 / Math.PI;
const fix = (a, b) => a - b * Math.floor(a / b);
const sin = d => Math.sin(rad(d)), cos = d => Math.cos(rad(d)), tan = d => Math.tan(rad(d));

export const KAABA = { lat: 21.422487, lng: 39.826206 };

export const methods = {
  mwl:      { label: 'Muslim World League', fajr: 18, isha: 17 },
  isna:     { label: 'ISNA (North America)', fajr: 15, isha: 15 },
  egypt:    { label: 'Egyptian General Authority', fajr: 19.5, isha: 17.5 },
  makkah:   { label: 'Umm al-Qura, Makkah', fajr: 18.5, ishaMinutes: 90 },
  karachi:  { label: 'University of Islamic Sciences, Karachi', fajr: 18, isha: 18 },
  gulf:     { label: 'Gulf region', fajr: 19.5, ishaMinutes: 90 },
  dubai:    { label: 'Dubai', fajr: 18.2, isha: 18.2 },
  turkey:   { label: 'Diyanet, Türkiye', fajr: 18, isha: 17 },
  singapore:{ label: 'MUIS, Singapore', fajr: 20, isha: 18 },
  moonsighting: { label: 'Moonsighting Committee (18°)', fajr: 18, isha: 18 },
};

export const PRAYERS = [
  { id: 'fajr', label: 'Fajr', arabic: 'الفجر' },
  { id: 'sunrise', label: 'Sunrise', arabic: 'الشروق', marker: true },
  { id: 'dhuhr', label: 'Dhuhr', arabic: 'الظهر' },
  { id: 'asr', label: 'Asr', arabic: 'العصر' },
  { id: 'maghrib', label: 'Maghrib', arabic: 'المغرب' },
  { id: 'isha', label: 'Isha', arabic: 'العشاء' },
];

export const cities = [
  ['London', 51.5074, -0.1278, 'Europe/London'], ['Birmingham', 52.4862, -1.8904, 'Europe/London'], ['Manchester', 53.4808, -2.2426, 'Europe/London'],
  ['Bradford', 53.7960, -1.7594, 'Europe/London'], ['Glasgow', 55.8642, -4.2518, 'Europe/London'], ['Dublin', 53.3498, -6.2603, 'Europe/Dublin'],
  ['Paris', 48.8566, 2.3522, 'Europe/Paris'], ['Berlin', 52.52, 13.405, 'Europe/Berlin'], ['Amsterdam', 52.3676, 4.9041, 'Europe/Amsterdam'],
  ['Istanbul', 41.0082, 28.9784, 'Europe/Istanbul'], ['Makkah', 21.3891, 39.8579, 'Asia/Riyadh'], ['Madinah', 24.4672, 39.6111, 'Asia/Riyadh'],
  ['Riyadh', 24.7136, 46.6753, 'Asia/Riyadh'], ['Dubai', 25.2048, 55.2708, 'Asia/Dubai'], ['Doha', 25.2854, 51.531, 'Asia/Qatar'],
  ['Kuwait City', 29.3759, 47.9774, 'Asia/Kuwait'], ['Amman', 31.9539, 35.9106, 'Asia/Amman'], ['Jerusalem', 31.7683, 35.2137, 'Asia/Jerusalem'],
  ['Cairo', 30.0444, 31.2357, 'Africa/Cairo'], ['Casablanca', 33.5731, -7.5898, 'Africa/Casablanca'], ['Lagos', 6.5244, 3.3792, 'Africa/Lagos'],
  ['Nairobi', -1.2921, 36.8219, 'Africa/Nairobi'], ['Johannesburg', -26.2041, 28.0473, 'Africa/Johannesburg'], ['Karachi', 24.8607, 67.0011, 'Asia/Karachi'],
  ['Lahore', 31.5204, 74.3587, 'Asia/Karachi'], ['Delhi', 28.6139, 77.209, 'Asia/Kolkata'], ['Dhaka', 23.8103, 90.4125, 'Asia/Dhaka'],
  ['Sylhet', 24.8949, 91.8687, 'Asia/Dhaka'], ['Kuala Lumpur', 3.139, 101.6869, 'Asia/Kuala_Lumpur'], ['Singapore', 1.3521, 103.8198, 'Asia/Singapore'],
  ['Jakarta', -6.2088, 106.8456, 'Asia/Jakarta'], ['Sydney', -33.8688, 151.2093, 'Australia/Sydney'], ['Toronto', 43.6532, -79.3832, 'America/Toronto'],
  ['New York', 40.7128, -74.006, 'America/New_York'], ['Chicago', 41.8781, -87.6298, 'America/Chicago'], ['Los Angeles', 34.0522, -118.2437, 'America/Los_Angeles'],
].map(([name, lat, lng, timeZone]) => ({ name, lat, lng, timeZone }));

function julian(year, month, day) {
  if (month <= 2) { year -= 1; month += 12; }
  const A = Math.floor(year / 100), B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
}

function sun(jd) {
  const D = jd - 2451545.0;
  const g = fix(357.529 + 0.98560028 * D, 360);
  const q = fix(280.459 + 0.98564736 * D, 360);
  const L = fix(q + 1.915 * sin(g) + 0.020 * sin(2 * g), 360);
  const e = 23.439 - 0.00000036 * D;
  const RA = fix(deg(Math.atan2(cos(e) * sin(L), cos(L))) / 15, 24);
  const decl = deg(Math.asin(sin(e) * sin(L)));
  const eqt = fix(q / 15 - RA + 12, 24) - 12;
  return { decl, eqt };
}

/** Calendar date (y, m, d) as it is right now in a time zone. */
export function zonedDate(date = new Date(), timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = type => Number(parts.find(p => p.type === type).value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

/**
 * Prayer times for a calendar day at a location. Returns Date instants.
 * @param {{year:number,month:number,day:number}} day
 * @param {{lat:number,lng:number}} place
 * @param {{method?:string, asr?:'standard'|'hanafi'}} options
 */
export function prayerTimes(day, { lat, lng }, { method = 'mwl', asr = 'standard' } = {}) {
  const m = methods[method] || methods.mwl;
  const base = julian(day.year, day.month, day.day) - lng / (15 * 24);
  const noonUTC = t => { const { eqt } = sun(base + t); return 12 - eqt - lng / 15; };
  const angleTime = (angle, t, before) => {
    const { decl } = sun(base + t);
    const ratio = (-sin(angle) - sin(decl) * sin(lat)) / (cos(decl) * cos(lat));
    if (ratio < -1 || ratio > 1) return NaN;
    const T = deg(Math.acos(ratio)) / 15;
    return noonUTC(t) + (before ? -T : T);
  };
  const asrTime = t => {
    const { decl } = sun(base + t);
    const factor = asr === 'hanafi' ? 2 : 1;
    const angle = -deg(Math.atan(1 / (factor + tan(Math.abs(lat - decl)))));
    return angleTime(angle, t, false);
  };
  const compute = guess => ({
    fajr: angleTime(m.fajr, guess.fajr / 24, true),
    sunrise: angleTime(0.833, guess.sunrise / 24, true),
    dhuhr: noonUTC(guess.dhuhr / 24),
    asr: asrTime(guess.asr / 24),
    maghrib: angleTime(0.833, guess.maghrib / 24, false),
    isha: m.ishaMinutes ? NaN : angleTime(m.isha, guess.isha / 24, false),
  });
  // Two passes: the first uses rough hours, the second refines with the sun's
  // position at the approximate moment of each prayer.
  let times = compute({ fajr: 5, sunrise: 6, dhuhr: 12, asr: 13, maghrib: 18, isha: 18 });
  const local = h => (Number.isFinite(h) ? h + lng / 15 : null);
  times = compute({ fajr: local(times.fajr) ?? 5, sunrise: local(times.sunrise) ?? 6, dhuhr: local(times.dhuhr) ?? 12, asr: local(times.asr) ?? 13, maghrib: local(times.maghrib) ?? 18, isha: local(times.isha) ?? 18 });
  if (m.ishaMinutes) times.isha = times.maghrib + m.ishaMinutes / 60;

  // High latitudes: when twilight never reaches the angle (or arrives absurdly
  // late), use the "angle-based" share of the night, as PrayTimes.org does.
  let highLatitude = false;
  if (Number.isFinite(times.sunrise) && Number.isFinite(times.maghrib)) {
    const night = 24 - (times.maghrib - times.sunrise);
    const fajrLimit = times.sunrise - (m.fajr / 60) * night;
    if (!Number.isFinite(times.fajr) || times.fajr < fajrLimit) { times.fajr = fajrLimit; highLatitude = true; }
    if (!m.ishaMinutes) {
      const ishaLimit = times.maghrib + (m.isha / 60) * night;
      if (!Number.isFinite(times.isha) || times.isha > ishaLimit) { times.isha = ishaLimit; highLatitude = true; }
    }
  }
  const midnight = Date.UTC(day.year, day.month - 1, day.day);
  const result = { highLatitude };
  for (const { id } of PRAYERS) result[id] = Number.isFinite(times[id]) ? new Date(midnight + Math.round(times[id] * 3600) * 1000) : null;
  return result;
}

/** Initial great-circle bearing from a place to the Kaaba, degrees from true north. */
export function qibla({ lat, lng }) {
  const dLng = rad(KAABA.lng - lng), p1 = rad(lat), p2 = rad(KAABA.lat);
  const y = Math.sin(dLng), x = Math.cos(p1) * Math.tan(p2) - Math.sin(p1) * Math.cos(dLng);
  return fix(deg(Math.atan2(y, x)), 360);
}

/** Great-circle distance to the Kaaba in kilometres. */
export function distanceToKaaba({ lat, lng }) {
  const dLat = rad(KAABA.lat - lat), dLng = rad(KAABA.lng - lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(KAABA.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function compassPoint(bearing) {
  return ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'][Math.round(fix(bearing, 360) / 22.5) % 16];
}

/** The current and next prayer around an instant, with tomorrow's Fajr as fallback. */
export function prayerSchedule(now, place, options) {
  const today = prayerTimes(zonedDate(now, place.timeZone), place, options);
  const tomorrowDay = zonedDate(new Date(now.getTime() + 86400000), place.timeZone);
  const tomorrow = prayerTimes(tomorrowDay, place, options);
  const sequence = PRAYERS.filter(p => !p.marker && today[p.id]);
  let next = sequence.find(p => today[p.id] > now);
  const nextAt = next ? today[next.id] : tomorrow.fajr;
  if (!next) next = PRAYERS[0];
  const passed = sequence.filter(p => today[p.id] <= now);
  const current = passed.at(-1) || null;
  return { today, tomorrow, next, nextAt, current, currentAt: current ? today[current.id] : null };
}

export function hijriDate(date = new Date(), timeZone) {
  try {
    const english = new Intl.DateTimeFormat('en-GB-u-ca-islamic-umalqura', { timeZone, day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(date);
    const arabic = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-arab', { timeZone, day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    const get = type => english.find(p => p.type === type)?.value || '';
    const day = Number(get('day'));
    const month = get('month');
    const year = get('year').replace(/\D/g, '') || get('relatedYear');
    return { day, month, year, label: `${day} ${month} ${year} AH`, arabic: arabic.replace(/\s?هـ$/, ' هـ') };
  } catch {
    return null;
  }
}

/** A few sacred times of year, keyed by Umm al-Qura month name. */
export function sacredSeason(hijri) {
  if (!hijri) return null;
  const { month, day } = hijri;
  if (/^Ramadan/.test(month)) return day >= 21 ? 'The last ten nights of Ramadan' : 'The blessed month of Ramadan';
  if (/^Dhuʻl-Hijjah|^Dhu.?l.?Hijjah/i.test(month) && day <= 10) return day === 9 ? 'The Day of ʿArafah' : day === 10 ? 'ʿEid al-Adha' : 'The first ten days of Dhul-Hijjah';
  if (/^Shawwal/.test(month) && day === 1) return 'ʿEid al-Fitr';
  if (/^Muharram/.test(month) && (day === 9 || day === 10)) return 'The Day of ʿAshura';
  if ([13, 14, 15].includes(day)) return 'The White Days — a sunnah to fast';
  return null;
}

export function formatTime(date, timeZone, hour12) {
  if (!date) return '—';
  return new Intl.DateTimeFormat(undefined, { timeZone, hour: 'numeric', minute: '2-digit', hour12 }).format(date);
}

export function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}
