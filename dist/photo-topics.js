// These are photographic subjects, not theological categories or tafsir.
// Keep this module pure: identical content produces identical art direction.
export const PHOTO_TOPICS = Object.freeze([
  'rain', 'ocean', 'night', 'dawn', 'mountains', 'trees', 'gardens', 'dates',
  'books', 'path', 'prayer', 'family', 'giving', 'river', 'birds', 'desert',
  'harvest', 'sky', 'writing',
]);

const illustrationNotice = 'Atmospheric illustration, not a depiction or interpretation of scripture.';
const choice = (topic, detail, confidence, photoIds = []) => ({
  topic, reason: `${detail} ${illustrationNotice}`, confidence,
  ...(photoIds.length ? { photoIds } : {}),
});

// Explicit editorial associations for the selected excerpts. These also prevent
// figurative phrases (a cheerful countenance, making a burden lighter) from
// being mistaken for literal scenery. No prophet or divine attribute is pictured.
const curated = Object.freeze({
  remembrance: ['prayer', 'An empty prayer hall makes space for remembrance.', 0.88, ['prayer-hall']],
  ease: ['sky', 'An open blue sky offers a quiet visual pause beside this reassurance.', 0.3, ['clouds']],
  knowledge: ['books', 'Books accompany the supplication for knowledge.', 0.94, ['books']],
  intentions: ['path', 'A forest path accompanies the editorial invitation to pause before the next step; it is a visual metaphor, not a scene from the narration.', 0.4, ['forest-path']],
  'yunus-story': ['ocean', 'A present-day seascape evokes the setting associated with the account of Yunus; it does not reconstruct the event.', 0.84, ['ocean-waves']],
  beauty: ['gardens', 'A present-day garden accompanies the editorial invitation to notice beauty around us; it does not represent a divine attribute.', 0.4, ['garden']],
  'yunus-dua': ['ocean', 'A present-day seascape accompanies the supplication of Yunus; it does not reconstruct the event.', 0.8, ['ocean-sunset']],
  giving: ['sky', 'An open dawn sky provides a quiet pause beside this reassurance, without illustrating divine giving.', 0.3, ['dawn-mountains']],
  'yusuf-story': ['desert', 'A present-day desert landscape accompanies this historical reflection; it does not portray Yusuf or reconstruct an event.', 0.6, ['sand-dunes']],
  goodness: ['river', 'A present-day river offers a quiet setting beside this supplication for goodness; it does not depict the Hereafter.', 0.3, ['river']],
  'hadith-good-speech': ['family', 'Hands coming together accompany the editorial invitation to speak with care toward others.', 0.5, ['family']],
  'hadith-steady-deeds': ['path', 'A woodland path accompanies the editorial idea of small, repeated steps; it is a visual metaphor for practice.', 0.4, ['autumn-path']],
  'hadith-kind-word': ['giving', 'Hands held with care accompany the teaching that a good word is charity.', 0.65, ['care']],
  'hadith-mercy': ['family', 'Hands of different generations accompany this teaching on mercy toward others.', 0.88, ['family']],
  'hadith-wish-good': ['giving', 'Dates set out for sharing accompany the editorial invitation to wish good for another person.', 0.55, ['dates-pot']],
  'hadith-kindness': ['giving', 'An everyday gesture of human care accompanies the teaching on kindness; it does not represent a divine attribute.', 0.6, ['care']],
  'hadith-cheerful-meeting': ['family', 'Everyday human connection accompanies the teaching on a warm greeting.', 0.72, ['family']],
  'hadith-helping': ['giving', 'A supporting hand accompanies the teaching on helping others.', 0.86, ['care']],
  'hadith-giving': ['giving', 'Bread that could be shared accompanies the editorial invitation to practice generosity.', 0.65, ['bread']],
  'hadith-restraint': ['river', 'A quiet river offers space for reflection beside this teaching on restraint; it is not a depiction of the narration.', 0.3, ['river-stones']],
});

// Specific safeguards where literal keyword matching would misread a metaphor.
// Match canonical references so the safeguards also apply in the full library.
const verseChoices = Object.freeze({
  '2:282': ['writing', 'A contemporary writing desk accompanies the ayah’s instructions to record debts and transactions in writing.', 0.96, ['writing-desk']],
  '2:255': ['books', 'A setting for reading accompanies this ayah; the photograph does not represent Allah, His throne, or His attributes.', 0.3, ['books']],
  '17:24': ['family', 'Everyday care for parents accompanies this supplication; the figurative wing is not treated as a bird.', 0.93],
  '24:35': ['books', 'A setting for reading accompanies this ayah; its divine light and allegory are not rendered as a physical scene.', 0.3, ['books']],
  '66:8': ['prayer', 'A place of prayer accompanies the supplication for repentance and forgiveness; its light is not treated as a literal landscape.', 0.8],
  '66:11': ['prayer', 'A place of prayer accompanies this supplication; the photograph does not depict Paradise.', 0.8],
});

const normalize = value => typeof value === 'string'
  ? value.normalize('NFKD').replace(/\p{M}/gu, '').replace(/[ٱأإآ]/g, 'ا').replace(/ـ/g, '').replace(/[’‘]/g, "'").toLowerCase()
  : '';
const ar = words => new RegExp(`(?:^|[^\\p{L}])(?:${words})(?=$|[^\\p{L}])`, 'u');

// All English expressions use word boundaries: "delight" is not "light",
// "knowledge" is not "ledge", and "training" is not "rain". More specific
// physical subjects win over generic sky, reading, or devotional vocabulary.
const rules = [
  { topic:'writing', weight:102, en:/\b(?:scribes?|writing|writers?|pens?|ink|contracts?|record[- ]keeping)\b|\b(?:write|written|record)\b[^.!?;]{0,80}\b(?:debts?|transactions?|agreements?|contracts?)\b/g, ar:ar('كاتب|كاتبا|الكاتب|القلم|قلم|اقلام'), label:'writing or keeping a written record' },
  { topic:'dates', weight:100, en:/\b(?:date[- ]palms?|palm[- ]trees?|dates|ripe dates)\b/g, ar:ar('النخل|نخل|نخيل|النخيل|رطبا'), label:'date palms or dates' },
  { topic:'birds', weight:98, en:/\b(?:birds?|fowls?|sparrows?|hoopoes?|ravens?|crows?)\b/g, ar:ar('الطير|طير|طيرا|والطير'), label:'birds' },
  { topic:'rain', weight:96, en:/\b(?:rain|rainfall|rains|raining|rain[- ]?drops?|downpour(?:ing|s)?|showers?|hail|thunder|lightning)\b|\bwater\b[^.!?;]{0,45}\b(?:from|down from) the (?:sky|heaven)\b/g, ar:ar('المطر|مطر|مطرا|الغيث|غيث|الودق|ودق|الرعد|رعد|البرق|برق'), label:'rain or weather' },
  { topic:'ocean', weight:94, en:/\b(?:seas?|oceans?|waves?|ships?|boats?|sail(?:s|ing)?|whales?|fish|fishes|pearls?)\b/g, ar:ar('البحر|والبحر|بحر|بحرا|البحرين|بحرين|البحار|الامواج|الحوت'), label:'the sea or its surroundings' },
  { topic:'river', weight:92, en:/\b(?:rivers?|streams?|springs? of water|flowing water|waterfalls?)\b/g, ar:ar('نهر|نهرا|الانهار|انهار|انهارا'), label:'rivers or flowing water' },
  { topic:'mountains', weight:90, en:/\b(?:mountains?|hills?|cliffs?|peaks?)\b/g, ar:ar('الجبال|جبال|جبلا|جبل|رواسي'), label:'mountains or hills' },
  { topic:'dawn', weight:88, en:/\b(?:dawn|daybreak|sunrise|mornings?|early morn|forenoon)\b/g, ar:ar('الفجر|فجر|والفجر|الصبح|صبح|والصبح|الضحى|والضحى'), label:'dawn or morning' },
  // Singular "desert" avoids the archaic "their deserts" (what they deserve).
  { topic:'desert', weight:86, en:/\b(?:desert|sand[- ]?dunes?|dunes?|barren (?:land|valley)|waterless valley)\b/g, ar:ar('الصحراء|صحراء|كثيبا|كثيب'), label:'a desert or dry landscape' },
  { topic:'trees', weight:84, en:/\b(?:trees?|forests?|woodlands?|leaves|leaf|olives?|olive[- ]trees?)\b/g, ar:ar('الشجر|شجر|شجرة|شجرا|الزيتون|زيتون|زيتونة'), label:'trees or leaves' },
  { topic:'gardens', weight:82, en:/\b(?:gardens?|orchards?|vineyards?|grapes?|pomegranates?|flowers?)\b/g, ar:ar('جنات|الجنات|جنتان|جنتين|اعناب|رمان'), label:'gardens or fruit' },
  { topic:'harvest', weight:80, en:/\b(?:harvests?|crops?|grains?|wheat|corn|barley|bread|seeds?|sow(?:ing|eth)?|reap(?:ing|eth)?|fruits?|vegetation)\b/g, ar:ar('الزرع|زرع|زرعا|حب|حبا|حبة|سنابل'), label:'crops, fruit, or growing things' },
  { topic:'night', weight:78, en:/\b(?:nights?|midnight|moons?|stars?|constellations?|sunset|twilight)\b/g, ar:ar('الليل|والليل|ليلا|ليل|ليلة|ليال|القمر|والقمر|النجوم|نجوم'), label:'night or the night sky' },
  { topic:'family', weight:76, en:/\b(?:parents?|mothers?|fathers?|children|child|offspring|famil(?:y|ies)|wives|husbands?|spouses?|sons?|daughters?)\b/g, ar:ar('الوالدين|والدي|والديه|والدينا|ذرية|ازواجنا|ذرياتنا|ابنائنا'), label:'family or caring for one another' },
  { topic:'giving', weight:74, en:/\b(?:charit(?:y|ies|able)|alms|sadaqa(?:h)?|zakat|feed(?:ing)? the (?:poor|hungry|needy)|give to the (?:poor|needy)|spend[^.!?;]{0,30}\b(?:poor|needy))\b/g, ar:ar('صدقة|صدقات|الصدقات|الزكاة|زكاة'), label:'charity or care for people in need' },
  { topic:'prayer', weight:55, en:/\b(?:prayers?|pray(?:ing|eth)?|worship|prostrat(?:e|ion|ions)|mosques?|remembrance|supplicat(?:e|ion|ions))\b/g, ar:ar('الصلاة|صلاة|صلاتهم|صلوتهم|المساجد|مساجد'), label:'prayer, remembrance, or worship' },
  { topic:'books', weight:52, en:/\b(?:read(?:ing)?|books?|scriptures?|learning|study|knowledge|wisdom|pen|ink)\b/g, ar:ar('الكتاب|كتاب|كتابا|اقرا|القلم|قلم'), label:'reading, knowledge, or scripture' },
  { topic:'path', weight:50, en:/\b(?:paths?|roads?|journeys?|travell?ing|travellers?|wayfarers?)\b/g, ar:ar('صراط|الصراط|سبيل|السبيل|سبيلا'), label:'a path or a journey' },
  // "Heavens" alone is often theological language, not a claim about scenery.
  // "Light", "darkness", and "beauty" alone deliberately have no visual rule.
  { topic:'sky', weight:40, en:/\b(?:sk(?:y|ies)|clouds?|winds?|sun|horizon)\b/g, ar:ar('السماء|والسماء|السحاب|سحاب|الرياح|رياح|الشمس|والشمس'), label:'the sky or weather' },
];

function canonicalReference(post) {
  if (post.surah && post.ayah) return `${Number(post.surah)}:${Number(post.ayah)}`;
  const explicit = String(post.verse || '').match(/\b(\d{1,3}):(\d{1,3})\b/);
  if (explicit) return `${Number(explicit[1])}:${Number(explicit[2])}`;
  const id = String(post.id || '').match(/^(?:q|dua)-(\d+)-(\d+)$/);
  return id ? `${Number(id[1])}:${Number(id[2])}` : null;
}

function strongestMatch(text, arabic = '') {
  let best = null;
  for (const rule of rules) {
    // matchAll avoids shared mutable RegExp.lastIndex across card renders.
    const searchable = rule.topic === 'family' ? text.replace(/\b(?:children|sons) of (?:israel|adam)\b/g, '') : text;
    const mentions = [...searchable.matchAll(rule.en)].length;
    const arabicMatch = !text && rule.ar.test(arabic);
    if (!mentions && !arabicMatch) continue;
    const score = rule.weight + Math.min(mentions - 1, 3) * 3;
    if (!best || score > best.score) best = { ...rule, score, arabicMatch };
  }
  return best;
}

// Refine a broad subject only when the source itself names a more specific
// object. This avoids using a whole forest for an olive branch or a river for
// falling rain. An empty list leaves selection to the broader subject pool.
function specificPhotos(topic, text) {
  if (topic === 'writing') return ['writing-desk'];
  if (topic === 'trees' && /\bolives?\b|\bolive[- ]trees?\b/.test(text)) return ['olives'];
  if (topic === 'harvest' && /\b(?:wheat|corn|barley|grains?|ears? of corn|seeds?|sow(?:ing|eth)?|reap(?:ing|eth)?)\b/.test(text)) return ['wheat'];
  if (topic === 'harvest' && /\bbread\b/.test(text)) return ['bread'];
  if (topic === 'rain') return ['rain'];
  if (topic === 'sky' && /\bclouds?\b/.test(text)) return ['clouds', 'dawn-mountains'];
  if (topic === 'giving' && /\b(?:feed(?:ing)?|food|hungry)\b/.test(text)) return ['bread', 'dates'];
  if (topic === 'giving' && /\b(?:help|care|support|assist)\b/.test(text)) return ['care'];
  if (topic === 'family' && /\b(?:parents?|mothers?|fathers?)\b/.test(text)) return ['care', 'family'];
  if (topic === 'prayer' && /\b(?:mosques?|prostrat(?:e|ion|ions)|worship)\b/.test(text)) return ['prayer-hall'];
  if (topic === 'books' && /\b(?:qur.?an|scriptures?)\b/.test(text)) return ['quran-reading'];
  if (topic === 'books' && /\b(?:knowledge|learning|study|wisdom)\b/.test(text)) return ['books'];
  return [];
}

function neutralTopic(post) {
  // Stable, restrained variety for abstract passages, never presented as a
  // semantic match. The photographic layer can vary images within each topic.
  const identity = String(post.id || post.verse || post.text || 'noor');
  let hash = 0;
  for (const character of identity) hash = ((hash * 31) + character.codePointAt(0)) >>> 0;
  const settings = ['books', 'prayer', 'sky', 'path', 'river', 'mountains', 'dawn', 'trees'];
  return settings[hash % settings.length];
}

/**
 * Select an editorial photographic subject for a post.
 * confidence is association strength (0–1), never a claim of religious certainty.
 * Arabic is used only if no English source text is available. Reference titles
 * and surah tags are excluded from Qur'an/du'a matching, including placeholders.
 */
export function resolvePhotoTopic(input = {}) {
  const post = input && typeof input === 'object' ? input : {};
  if (Object.hasOwn(curated, post.id)) return choice(...curated[post.id]);
  const scripture = post.type === 'quran' || post.type === 'dua' || /^(?:q|dua)-\d+-\d+$/.test(String(post.id || ''));
  const reference = scripture ? canonicalReference(post) : null;
  if (reference && Object.hasOwn(verseChoices, reference)) return choice(...verseChoices[reference]);

  const text = normalize(post.text), arabic = normalize(post.arabic);
  if (/\b(?:allah|god) is (?:the )?light\b/.test(text) || /\b(?:sons?|daughters?|children) of (?:allah|god)\b|\b(?:allah|god) (?:hath|has) (?:taken|begotten)\b/.test(text)) {
    return choice('books', 'A setting for reading accompanies this passage; its language about Allah is not rendered as a physical scene.', 0.3);
  }
  let match = strongestMatch(text, arabic), editorial = false;
  // A source passage wins over an editorial title. For scripture, a chapter's
  // name (e.g. The Night) must not determine the imagery for every ayah.
  if (!match && !scripture) {
    const tags = Array.isArray(post.tags) ? post.tags.filter(tag => typeof tag === 'string').join(' ') : '';
    match = strongestMatch(normalize(`${post.title || ''} ${tags}`));
    editorial = Boolean(match);
  }
  if (match) {
    const afterlife = /\b(?:paradise|hereafter|resurrection|hell|gardens? (?:of|beneath|underneath)|immortal|eternal|abide|abiding|for ever)\b/.test(text);
    const detail = afterlife
      ? `A present-day photograph associated with ${match.label}; it does not depict the unseen or the afterlife.`
      : `A present-day photograph associated with ${match.label} mentioned in the ${editorial ? 'editorial title or tags' : 'passage'}.`;
    return choice(match.topic, detail, afterlife ? 0.65 : editorial ? 0.7 : match.arabicMatch ? 0.82 : 0.94, specificPhotos(match.topic, text));
  }
  const topic = neutralTopic(post);
  return choice(topic, 'No concrete visual subject was identified. A neutral photographic setting provides space for reading.', 0.2, topic === 'books' ? ['books'] : topic === 'prayer' ? ['prayer-hall'] : []);
}
