# Noor

A calm, immersive Islamic content app. Vanilla JavaScript modules and CSS; no build step, dependencies, account, or backend required.

## Run locally

From this directory:

```sh
npm run dev
```

Open http://127.0.0.1:5173. Run `npm run check` for JavaScript syntax validation and `npm test` for library and feed tests. Publish the `dist` directory as a static site.

## Experience

- Vertically snapping feed with touch, mouse-wheel, arrow-key, and button navigation.
- Continuous, paginated feed backed by all 6,236 Qur’anic ayahs across 114 surahs, 27 Qur’anic du’a cards, 12 hadith excerpts, and two editorial stories.
- New-to-you items appear first in the mixed feed. Category and surah feeds preserve their order. Once a collection is exhausted, repeats are explicitly marked.
- A small DOM window keeps scrolling lightweight; previous cards remain reachable, and repeated cards use stable IDs for saves and notes.
- Full surah browser, Arabic/English search, exact ayah lookup, and a continue-reading shortcut.
- A dedicated full-surah reader with flowing Arabic/English text, ayah navigation, source links, saving, and reflections. Return to the same feed position after reading.
- Memorization mode: select an ayah range, listen, recall, reveal the text, then move on. Each new ayah starts hidden; no scripture is changed.
- Choose Alafasy, Al-Husary, or Abdul Basit; repeat each ayah once, three times, five times, or until manually advanced. Sequential playback stops at the selected range or surah end.
- Reader controls for translation visibility, larger Arabic, and playback speed; the original du’a cards also have a transliteration visibility setting. Long text scrolls within its card without truncation.
- Recitation via Al Quran Cloud’s audio CDN, plus six locally served Alafasy starter recitations; seeking, mute, playback speed, and opt-in continuation in the feed. One shared Audio element prevents competing reader/feed audio.
- English translations, Arabic, du’a transliteration, source references, and full-context links.
- Topic and verse search, mood filters, and three curated collections.
- Saved reminders, resonated reminders, private reflection notes, daily intentions, and a configurable daily reading goal.
- Light/dark palettes, larger text, translation visibility, and expanded focus reading on desktop and phone.
- Responsive desktop, tablet, and phone layouts, keyboard controls, semantic controls, modal focus management, and reduced-motion support.

Saved content and settings use localStorage and remain in the current browser. There is no account synchronization or user-generated-content backend. The reading text is versioned static content; full-library audio requires an internet connection. The interface continues scrolling over a finite, sourced library and does not generate new scripture or narrations.

## Files

- `dist/app.js` — interface, state, audio, storage, and interactions.
- `dist/content.js` — original curated content, source URLs, and collections.
- `dist/hadith-content.js` — ten additional sourced hadith excerpts.
- `dist/library.js` — lazy batch loading, Qur’anic du’a selection, search, and feed ordering.
- `dist/feed-window.js` — absolute feed positions and mounted card windows.
- `dist/reader.js` and `dist/reader.css` — full-surah reading and memorization interface.
- `dist/recitation.js` — reciter catalogue, cancellable audio loading, repeat/range playback.
- `tests/recitation.test.mjs` — sequential/repeated audio, late-request cancellation, selection races, reciter changes, and failures.
- `dist/data/quran/` — 130 verse batches, manifest, search index, attribution, and license.
- `scripts/import-quran.mjs` — validated, reproducible corpus import.
- `tests/library.test.mjs` — corpus integrity, filtering, paging, retry, and search checks.
- `dist/styles.css` — responsive visual system.
- `dist/icons.js` — original inline SVG icon set.
- `dist/assets/` — photographs, generated landscape, recitations, and favicon.
- `server.mjs` — dependency-free local preview server.
- `.openai/hosting.json` — Sites deployment configuration (preserves the existing site audience).

## Content sources

The full corpus comes from [Al Quran Cloud](https://alquran.cloud/api), using `quran-uthmani` Arabic and Marmaduke Pickthall’s `en.pickthall` English translation. The import preserves the supplied strings, including diacritics, validates all verse/chapter identifiers, and records source snapshot SHA-256 hashes in the manifest. Arabic text attribution and the Tanzil license notice are included in every data batch and the search index. Search normalizes spelling and diacritics only in a separate index, never in the displayed source text.

To refresh: download the two `/v1/quran/{edition}` responses into `data-source/quran-uthmani.json` and `data-source/en.pickthall.json`, run `npm run import:quran`, review the source/version diff, then run the checks. Raw download files are excluded from Git; validated distribution files are included.

The original curated Qur’anic cards use excerpts from Dr. Mustafa Khattab’s *The Clear Quran*, linked individually to Quran.com. Arabic passages are marked as excerpts where applicable. Audio plays the full verse.

- [Qur’an 13:28](https://quran.com/13/28), [94:5](https://quran.com/94/5), [20:114](https://quran.com/20/114), [21:87](https://quran.com/21/87), [93:5](https://quran.com/93/5), [2:201](https://quran.com/2/201).
- [Sahih al-Bukhari 1](https://sunnah.com/bukhari:1), [Sahih Muslim 91a](https://sunnah.com/muslim:91a).
- Editorial stories refer to [Qur’an 21:87–88](https://quran.com/21/87-88) and [12:90–92](https://quran.com/12/90-92), and are explicitly distinguished from quotations.
- Additional hadith excerpts each link to their full narration in `dist/hadith-content.js`; reflection prompts are labelled editorial. Added Qur’anic du’a cards contain the complete source ayah.
- Full-library recitations: [Al Quran Cloud audio CDN](https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3), mapped by global ayah number. Edition availability and sample URLs were checked against the API on 2026-10-29: `ar.alafasy` at 128 kbps, `ar.husary` at 128 kbps, and `ar.abdulbasitmurattal` at 192 kbps. The original six Alafasy cards retain local audio as a fallback when using that reciter.
- Original recitations: [EveryAyah, Alafasy 128 kbps](https://everyayah.com/data/Alafasy_128kbps/).

## Visual asset provenance

The earlier signature landscape is retained as a legacy source asset and is not selected by the photographic interface. It was created with the built-in ImageGen tool. The original is saved in `design/emerald-valley.png`; the optimized app asset is `dist/assets/emerald-valley.jpg`.

Final generation prompt:

> Use case: photorealistic-natural. Asset type: cinematic portrait background for a refined Islamic mindfulness reading app. Primary request: a breathtaking tranquil valley with a still jade-green lake and layered mountains covered in lush dense evergreen forest, dawn mist among the trees, faint golden sun rays entering from the upper left. View from a shaded hillside down across the lake, mountain ridge silhouettes in the upper half and detailed foliage framing the lower edges. Moody deep emerald, dark teal green and subtle champagne highlights, subtle film grain, exceptional editorial travel photography, natural realistic detail. Tall portrait 2:3 composition, with the middle 60 percent calm and dark enough for white Arabic and English text overlay that will be added separately. Full-bleed photographic scenery. No text, no letters, no calligraphy, no people, no buildings, no interface, no watermark, no border.

Additional nature photographs are from Unsplash image IDs `photo-1509316785289-025f5b846b35` and `photo-1518837695005-2083093ee35b`.

## Verification

JavaScript syntax checks, local HTTP and asset responses, desktop and mobile browser review, audio playback, persistent saved reminders, reflection creation/deletion, search, and mood filters were checked. The expanded release was checked at desktop size, 390 × 844, and 375 × 667, including full ayah 2:282, Arabic search, 114-surah browsing, streamed audio, saved-verse reload, continuous forward/back navigation, and labelled looping at surah completion. Automated checks cover all 6,236 verse IDs, six original covered ayahs excluded from mixed-feed duplicates, 27 du’a cards, 12 hadith cards, batch deduplication and failure retry, search, and hundreds of forward/backward window positions.


## Roadmap status

- Delivered: complete sourced Qur’an corpus, expanded du’a/hadith, continuous feed, mobile sizing and complete long-ayah display.
- Delivered in the reading milestone: full-surah reader, read-in-context and return-to-feed, three reciters, verse repetition, range-based memorization, translation/type controls, and persistent last-read position.
- Delivered in the personal-library milestone: named collections, recent reading history, and resume links for feed passages and full-surah reading.
- Next: explicit feed preferences, then optional accounts and cross-device migration/sync.
- Later: explicit discovery preferences, reviewed content publishing tools, production storage/monitoring, and installable web-app support.

Reader verification includes all 286 Al-Baqara ayahs, complete 2:282 text, desktop and phone layouts, real CDN playback, hidden/revealed memorization text, range completion, save/source integration, exact feed-position restoration, and resume after reload. Fourteen automated tests cover the corpus/feed and playback state transitions.

## Photographic interface

The feed, discovery tiles, saved cards and reader covers use a bank of 28 credited photographs. The opening ten editorial cards have ten directed photo choices; specific subjects such as olives, grain, rain, writing and care are matched within the bank. Qur’an 2:282 uses a writing photograph, and dense Qur’an-page images are excluded from feed backgrounds. Neutral visual companions are clearly described when no concrete scene is identified. This is rule-based photographic accompaniment, not tafsir, historical reconstruction, or one unique photograph per ayah.

Daylight and Nightfall use quiet light and dark shells around the same matte photographic reading surface. Each photograph retains its own colour family, with reduced image contrast and warm, readable typography. Mobile actions sit below the full-width passage. Long passages scroll without an inner panel; Home, End, page keys, arrows and Space cannot chain into the feed. Expand opens a full-height reading view and preserves the text position. Off-screen articles are inert, and focused action controls retain focus when refreshed. See [the design rationale and review](design/matte-interface.md).

Photo sources, photographers and Unsplash license links are recorded in dist/photo-library.js and dist/assets/photos/credits.json. Passage source details expose each photo’s credit and visual connection. Original JPGs remain credited; scripts/prepare-photos.py creates 480/960/1400 px WebP derivatives. Feed image selection accounts for portrait crops of landscape originals. The 960 px set totals about 2.2 MB versus 8.3 MB for the originals; loading remains lazy and the photo cache is bounded.

Current verification: npm run check, npm test (32 tests), and git diff --check. Browser review covered desktop, 842 × 837, 390 × 844, 360 × 640 and 568 × 320 layouts. Repeated Home/End/PageUp/PageDown on full 2:282 held the same active ayah on desktop, tablet and phone. Read-in-context, return to feed, memorisation reveal/hide/ranges/repeats/speed, all three reciters, source/photo details, reference search, saves and private reflection persistence were checked. These checks do not claim a scholarly review of all image associations.


## Personal library

Library now brings together saved passages, named collections, history, likes, and private notes. Collections can be created, renamed, populated from saves or a passage’s source panel, and deleted with undo. Collection covers use the first passage’s existing credited photograph. A bookmark and collection membership are independent: removing a bookmark retains any collection membership, with an explicit message. Deleting a collection leaves bookmarks and notes intact.

History holds the most recent visit to each of up to 300 passages, grouped by the visitor’s local date. Feed visits are recorded after 4.5 seconds of visible reading; the reader uses its existing visibility/dwell detection. This is a visit history, not a claim that a long passage was completed. Previously recorded daily reads migrate once with date-only attribution. Clearing history is persistent across reloads and can be undone; pausing stops new history entries while the separate resume point and daily counter remain available.

Continue reading opens the relevant feed passage or full-surah reader. Long feed passages retain their text scroll offset. The previous last-read ayah migrates to the reader resume point. Slow background hydration no longer rebuilds a newly selected passage. Personal data uses the browser-local `noor:personal-library` record; existing bookmarks, likes, and notes keep their existing keys. Open views refresh the shared record before edits and react to storage updates. There is no account or cross-device sync in this release.

Implementation: `dist/personal-library.js` contains persistence, migration and collection/history operations; `dist/personal-ui.js` renders the library; `dist/personal-library.css` styles the responsive views. Library lists render 60 entries at a time, with Show more. Saved-passage pickers support search. Empty collections use the existing river photograph until populated; no sample collections are shipped.

Verification: 43 automated tests cover the existing corpus/feed/recitation features plus migration, collection membership, rename validation, deletion and undo, bounded deduplicated history, pause/clear/undo, resume offsets, storage failures and edits from multiple open views. Browser review covered desktop and 390×844, 360×640, 320×568 phones. Creation, duplicate-name feedback, membership search, rename, delete/undo, history privacy controls, reload persistence, and resuming 2:282 at its scroll offset and 2:283 in the full reader were checked. The reviewed interface is shown in `design/personal-library-review.jpg` using preview-only test data.
