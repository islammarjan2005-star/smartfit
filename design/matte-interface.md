# Noor: matte photographic reading

## Intent

A photograph should lend a passage its atmosphere, not sit underneath it like a stock-photo quote template. Preserve recognisable, relevant subject matter and distinct colour families while reducing local image contrast. The words remain crisp; the photograph becomes quiet.

## Implemented decisions

- Each of the 28 credited photographs receives a tint sampled by visual family: sea blue, forest green, warm earth, dusk mauve. Selection remains deterministic and tied to the passage; no scripture or source attribution changes.
- Image layers use 0.5 contrast, 0.82 brightness, 0.72 saturation and 0.7 opacity. A matte colour wash covers the whole reading surface, strengthening toward the controls. Text has no drop shadow and stays outside those filters.
- Warm cream foreground text replaces stark white. Labels are plain text; pill backgrounds, blur, and the nested long-text panel are removed. Arabic, translation, attribution and source have clear, distinct roles.
- Phone actions form a quiet horizontal strip below the reading. The text gets the full available width. Previous/next buttons remain visible, including for passages with contained scrolling.
- A long passage can expand into a full-height reading view. Expanding or leaving focus retains the text's scroll position. Home, End, page, arrow and Space keys stay inside the reading surface, including at its boundaries.
- Off-screen feed articles are inert, so Tab cannot pull the feed to an unseen card. A refreshed action strip restores the focused action. Layout-promoted short passages are remeasured when type settings or viewport size change.
- The same matte treatment carries into discovery tiles, saved reading and surah covers. Daylight and Nightfall change the surrounding interface without changing the reading material's identity.

## References consulted

- [Impeccable](https://github.com/pbakaus/impeccable): deliberate visual identity and avoiding generic AI UI patterns. Its [typography reference](https://github.com/pbakaus/impeccable/blob/main/skill/reference/typeset.md) informed role-based type, readable measure, preservation of established fonts, and checks with long text and narrow viewports.
- [Vercel Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines): keyboard operation, visible focus, touch targets, intentional overscroll and image loading. Used as interaction guidance, not a copied visual template.
- [WCAG 2.2 Understanding Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html): maintain foreground contrast when toning down photographic backgrounds.

## Verification in this pass

- Browser review at desktop 1363×936, tablet 842×837, phones 390×844, 360×640 and 320×568, and landscape 568×320.
- All three feed content compositions reviewed: Qur'an, hadith and editorial story. The final comparison is in `matte-review.jpg`.
- Full 2:282 uses `writing-desk`, preserves its complete Arabic and English, and holds its active ID under repeated boundary keys. On 320px width the reading body is 276px wide; expanded reading provides 237px of reading height even at a total viewport height of 568px. Normal short-screen reading remains scrollable.
- Source and photo details, the 286-ayah Al-Baqara reader, return to 2:282, narrow reader controls, larger type, translation visibility, Nightfall, recitation playback and saving checked. No app console errors during these checks.
- A conservative white-pixel calculation through the image filter, opacity and minimum tint produces a worst supporting-text contrast of 4.65:1 across the 28 tint families. This is a CSS colour bound, not a claim of comprehensive accessibility certification.
- Existing automated corpus, selection, feed-window, keyboard and recitation checks remain in place. The photographs are thematic accompaniment, not tafsir or historical reconstruction, and not a unique photograph per ayah.
