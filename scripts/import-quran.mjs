import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const inputs = await Promise.all(['quran-uthmani', 'en.pickthall'].map(async edition => {
  const raw = await readFile(new URL(`../data-source/${edition}.json`, import.meta.url));
  const parsed = JSON.parse(raw);
  assert.equal(parsed.code, 200); assert.equal(parsed.data.surahs.length, 114);
  return { raw, parsed: parsed.data, sha256: createHash('sha256').update(raw).digest('hex') };
}));
const [arabic, english] = inputs;
const notice = 'Tanzil Quran Text\nCopyright (C) 2007-2021 Tanzil Project\nLicense: Creative Commons Attribution 3.0\n\nThis copy of the Quran text is carefully produced, highly verified and continuously monitored by a group of specialists in Tanzil Project.\n\nTERMS OF USE:\n\n- Permission is granted to copy and distribute verbatim copies of this text, but CHANGING IT IS NOT ALLOWED.\n- This Quran text can be used in any website or application, provided that its source (Tanzil Project) is clearly indicated, and a link is made to tanzil.net to enable users to keep track of changes.\n- This copyright notice shall be included in all verbatim copies of the text, and shall be reproduced appropriately in all files derived from or containing substantial portion of this text.\n\nPlease check updates at: http://tanzil.net/updates/';
const provenance = {
  importedAt: new Date().toISOString(),
  arabic: { edition: 'quran-uthmani', source: 'https://api.alquran.cloud/v1/quran/quran-uthmani', attribution: 'Al Quran Cloud / Tanzil Project', url: 'https://tanzil.net', sha256: arabic.sha256 },
  translation: { edition: 'en.pickthall', translator: 'Marmaduke Pickthall', source: 'https://api.alquran.cloud/v1/quran/en.pickthall', sha256: english.sha256 },
  licenseNotice: notice,
};
const verses = [], surahs = [];
for (let s = 0; s < 114; s++) {
  const ar = arabic.parsed.surahs[s], en = english.parsed.surahs[s];
  assert.equal(ar.number, s + 1); assert.equal(en.number, ar.number); assert.equal(ar.ayahs.length, en.ayahs.length);
  surahs.push({ number: ar.number, name: ar.name, englishName: ar.englishName, meaning: ar.englishNameTranslation, revelation: ar.revelationType, count: ar.ayahs.length, start: ar.ayahs[0].number });
  ar.ayahs.forEach((a, v) => {
    const e = en.ayahs[v];
    assert.equal(a.number, verses.length + 1); assert.equal(a.number, e.number); assert.equal(a.numberInSurah, v + 1); assert.equal(e.numberInSurah, v + 1);
    assert.ok(a.text.length && e.text.length);
    // Preserve the original text byte for byte, including diacritics and BOMs.
    verses.push({ number: a.number, surah: ar.number, ayah: a.numberInSurah, arabic: a.text, text: e.text, juz: a.juz });
  });
}
assert.equal(verses.length, 6236);
const output = new URL('../dist/data/quran/', import.meta.url);
await mkdir(output, { recursive: true });
const batchSize = 48;
for (let offset = 0; offset < verses.length; offset += batchSize) {
  await writeFile(new URL(`batch-${Math.floor(offset / batchSize)}.json`, output), JSON.stringify({ licenseNotice: notice, verses: verses.slice(offset, offset + batchSize) }));
}
await writeFile(new URL('manifest.json', output), JSON.stringify({ ...provenance, total: verses.length, batchSize, surahs }));
await writeFile(new URL('search.json', output), JSON.stringify({ licenseNotice: notice, verses: verses.map(v => [v.number, v.arabic, v.text]) }));
await writeFile(new URL('NOTICE.txt', output), `${notice}\n\nArabic distribution: Al Quran Cloud. English translation: Marmaduke Pickthall (en.pickthall). Original source URLs and SHA-256 hashes are recorded in manifest.json.\n`);
console.log(`Validated and imported ${verses.length} verses across ${surahs.length} surahs into ${Math.ceil(verses.length / batchSize)} batches. Arabic and English preserved exactly.`);
