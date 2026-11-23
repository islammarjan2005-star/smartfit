import { photos } from './photo-library.js';
import { resolvePhotoTopic } from './photo-topics.js';

const stableNumber = value => [...String(value)].reduce((n,c)=>(Math.imul(n,31)+c.codePointAt(0))>>>0,7);
const cache = new Map();
const CACHE_LIMIT = 256;
// Tints are chosen from each photograph's visual family. They keep the matte
// treatment varied without using random colours or altering the source images.
const tones = {
  rain:'43, 57, 62', olives:'52, 61, 39', dates:'73, 49, 35',
  'prayer-hall':'73, 56, 36', stars:'36, 43, 61',
  'dawn-mountains':'67, 53, 61', 'mountain-light':'58, 61, 52',
  'ocean-waves':'35, 57, 65', 'ocean-sunset':'73, 54, 56', books:'66, 49, 39',
  'forest-path':'36, 57, 43', 'autumn-path':'69, 53, 36', river:'31, 58, 55',
  'birds-flight':'43, 62, 76', 'birds-dawn':'63, 59, 66', 'sand-dunes':'77, 57, 37',
  clouds:'43, 62, 79', 'quran-page':'58, 54, 37', 'quran-reading':'64, 48, 37',
  garden:'45, 61, 50', care:'67, 49, 43', family:'67, 54, 46',
  'dates-pot':'44, 55, 65', 'river-stones':'36, 55, 58', wheat:'76, 59, 33',
  bread:'73, 49, 34', 'writing-desk':'50, 56, 57', notebook:'65, 56, 43',
};
export const photoTone = photo => `--scene-rgb:${tones[photo.id] || '39, 57, 53'}`;
const imagePaths = photo => ({
  src:`/assets/photos/${photo.id}-960.webp`,
  thumb:`/assets/photos/${photo.id}-480.webp`,
  srcset:[480,960,1400].map(width=>`/assets/photos/${photo.id}-${width}.webp ${width}w`).join(', '),
});

// These paths and sizes are local, curated metadata, never visitor input.
export function photoAttributes(photo, sizes) {
  // A landscape photo is cropped to a portrait feed: choose for the covered
  // height, not just the element width, to avoid enlarged low-resolution crops.
  sizes ||= photo.width > photo.height ? '(max-width:600px) 100vh, 1000px' : '(max-width:600px) 100vw, 620px';
  return `src="${photo.src}" srcset="${photo.srcset}" sizes="${sizes}" width="${photo.width}" height="${photo.height}"`;
}

export function photoFor(input) {
  const post = input && typeof input === 'object' ? input : {};
  const identity = post.id || post.title || 'reading';
  // Include the source, so a placeholder or refreshed post cannot keep a stale
  // assignment merely because its stable feed ID has not changed.
  const key = JSON.stringify([identity, post.type, post.verse, post.surah, post.ayah, post.text, post.arabic]);
  if (cache.has(key)) return cache.get(key);
  const connection = resolvePhotoTopic(post);
  const relevant = photos.filter(photo => photo.tags.includes(connection.topic) && photo.id !== 'quran-page');
  const directed = connection.photoIds?.map(id => relevant.find(photo => photo.id === id)).filter(Boolean) || [];
  const pool = directed.length ? directed : relevant.length ? relevant : photos.filter(photo => (photo.tags.includes('prayer') || photo.tags.includes('books')) && photo.id !== 'quran-page');
  const reference = post.surah && post.ayah ? [null, post.surah, post.ayah]
    : String(post.verse || '').match(/(\d+):(\d+)/) || String(post.id || '').match(/^(?:q|dua)-(\d+)-(\d+)$/);
  const sequence = reference ? Number(reference[2])-1+stableNumber(reference[1]) : stableNumber(identity);
  const chosen = pool[sequence % pool.length] || photos[0];
  const result = {...chosen, ...imagePaths(chosen), topic:connection.topic,
    reason:relevant.length ? connection.reason : 'A quiet setting for reading and reflection. This photograph is illustrative, not a depiction of the passage.',
    confidence:relevant.length ? connection.confidence : 0.2};
  if (!post.pending) {
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
    cache.set(key, result);
  }
  return result;
}

export function photoForTheme(topic, variant=0) {
  const pool = photos.filter(photo => photo.tags.includes(topic) && photo.id !== 'quran-page');
  const index = Number.isFinite(Number(variant)) ? Math.abs(Math.trunc(Number(variant))) : 0;
  const chosen = pool[index % pool.length] || photos[0];
  return {...chosen, ...imagePaths(chosen)};
}
