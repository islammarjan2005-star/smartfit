import test from 'node:test';
import assert from 'node:assert/strict';
import { prayerTimes, prayerSchedule, qibla, distanceToKaaba, compassPoint, cities, hijriDate, sacredSeason, formatCountdown, PRAYERS } from '../dist/prayer.js';
import { defaultPrayerSettings } from '../dist/today.js';

const city = name => cities.find(c => c.name === name);
const hm = (date, timeZone) => new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
const near = (actual, expected, tolerance = 3) => {
  const [ah, am] = actual.split(':').map(Number), [eh, em] = expected.split(':').map(Number);
  assert.ok(Math.abs(ah * 60 + am - (eh * 60 + em)) <= tolerance, `${actual} is not within ${tolerance} min of ${expected}`);
};

test('London winter sunrise, noon and sunset match published solar times', () => {
  const london = city('London'), t = prayerTimes({ year: 2026, month: 11, day: 23 }, london, { method: 'mwl' });
  near(hm(t.sunrise, london.timeZone), '07:31');
  near(hm(t.dhuhr, london.timeZone), '11:46');
  near(hm(t.maghrib, london.timeZone), '16:01');
});

test('Umm al-Qura Isha is 90 minutes after Maghrib', () => {
  const t = prayerTimes({ year: 2026, month: 3, day: 1 }, city('Makkah'), { method: 'makkah' });
  assert.equal((t.isha - t.maghrib) / 60000, 90);
});

test('prayers are in order and Hanafi Asr is later', () => {
  for (const c of cities) {
    const t = prayerTimes({ year: 2026, month: 1, day: 15 }, c, {});
    const order = PRAYERS.map(p => t[p.id].getTime());
    assert.deepEqual([...order].sort((a, b) => a - b), order, c.name);
    const h = prayerTimes({ year: 2026, month: 1, day: 15 }, c, { asr: 'hanafi' });
    assert.ok(h.asr > t.asr, c.name);
  }
});

test('high-latitude summer still yields every time', () => {
  const t = prayerTimes({ year: 2026, month: 6, day: 21 }, city('Glasgow'), { method: 'mwl' });
  for (const p of PRAYERS) assert.ok(t[p.id] instanceof Date, p.id);
  assert.equal(t.highLatitude, true);
});

test('schedule rolls to tomorrow’s Fajr after Isha', () => {
  const london = city('London');
  const late = new Date('2026-11-23T22:30:00Z');
  const s = prayerSchedule(late, london, {});
  assert.equal(s.next.id, 'fajr');
  assert.ok(s.nextAt > late && s.nextAt - late < 12 * 3600000);
  assert.equal(s.current.id, 'isha');
});

test('Qibla bearings and distances', () => {
  assert.ok(Math.abs(qibla(city('London')) - 118.99) < 0.2);
  assert.ok(Math.abs(qibla(city('New York')) - 58.48) < 0.2);
  assert.equal(compassPoint(qibla(city('London'))), 'ESE');
  assert.ok(Math.abs(distanceToKaaba(city('London')) - 4794) < 10);
});

test('Hijri date, sacred seasons and countdown formatting', () => {
  const h = hijriDate(new Date('2026-11-23T12:00:00Z'), 'Europe/London');
  assert.equal(h.year, '1448');
  assert.equal(sacredSeason({ month: 'Ramadan', day: 25 }), 'The last ten nights of Ramadan');
  assert.equal(sacredSeason({ month: 'Shawwal', day: 1 }), 'ʿEid al-Fitr');
  assert.equal(formatCountdown(3723000), '1:02:03');
  assert.equal(formatCountdown(65000), '1:05');
});

test('default method follows the device region', () => {
  assert.equal(defaultPrayerSettings('America/Chicago').method, 'isna');
  assert.equal(defaultPrayerSettings('Asia/Dhaka').asr, 'hanafi');
  assert.equal(defaultPrayerSettings('Europe/London').place.name, 'London');
  assert.equal(defaultPrayerSettings('Pacific/Fiji').place.source, 'default');
});
