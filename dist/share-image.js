// Renders a passage as a shareable 1080×1350 (or 1080×1920 story) image on a
// canvas: credited photograph, Arabic, translation, reference and wordmark.

const loadImage = src => new Promise((resolve, reject) => {
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

function wrap(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean), lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Largest size (stepping down) at which the text fits in maxLines. */
function fit(ctx, text, { font, max, min, width, maxLines }) {
  for (let size = max; size >= min; size -= 2) {
    ctx.font = font(size);
    const lines = wrap(ctx, text, width);
    if (lines.length <= maxLines) return { size, lines };
  }
  ctx.font = font(min);
  const lines = wrap(ctx, text, width);
  if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, ' …'); }
  return { size: min, lines };
}

function cover(ctx, img, W, H, focal = '50% 50%') {
  const [fx, fy] = focal.split(' ').map(v => parseFloat(v) / 100 || 0.5);
  const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
  ctx.drawImage(img, (W - w) * fx, (H - h) * fy, w, h);
}

export const SHARE_FORMATS = { post: { w: 1080, h: 1350, label: 'Post · 4:5' }, story: { w: 1080, h: 1920, label: 'Story · 9:16' }, square: { w: 1080, h: 1080, label: 'Square' } };

export async function renderShareImage(post, { photo, format = 'post' } = {}) {
  const { w: W, h: H } = SHARE_FORMATS[format] || SHARE_FORMATS.post;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  await Promise.all([
    document.fonts.load('500 60px "Noto Naskh Arabic"', post.arabic || 'ا'),
    document.fonts.load('400 48px "Source Serif 4"'),
    document.fonts.load('600 40px "IBM Plex Sans"'),
  ]).catch(() => {});

  // Background photograph, muted for legibility.
  ctx.fillStyle = '#18221f'; ctx.fillRect(0, 0, W, H);
  if (photo?.src) {
    try {
      const img = await loadImage(photo.src.replace(/-(480|960)\.webp$/, '-1400.webp'));
      ctx.filter = 'saturate(0.85) contrast(0.92)';
      cover(ctx, img, W, H, photo.focalPoint);
      ctx.filter = 'none';
    } catch { /* keep the plain field */ }
  }
  const shade = ctx.createLinearGradient(0, 0, 0, H);
  shade.addColorStop(0, 'rgba(10,16,15,0.55)');
  shade.addColorStop(0.45, 'rgba(10,16,15,0.62)');
  shade.addColorStop(1, 'rgba(10,16,15,0.86)');
  ctx.fillStyle = shade; ctx.fillRect(0, 0, W, H);
  const vignette = ctx.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.95);
  vignette.addColorStop(0, 'rgba(0,0,0,0)'); vignette.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H);

  const pad = 96, width = W - pad * 2, cream = '#f4efe2', soft = 'rgba(244,239,226,0.72)';
  ctx.textBaseline = 'alphabetic';

  // Header: content type and reference
  ctx.fillStyle = soft; ctx.font = '500 26px "IBM Plex Sans", sans-serif'; ctx.textAlign = 'left';
  const kind = post.type === 'hadith' ? 'HADITH' : post.type === 'dua' ? 'DUʿĀʾ' : post.type === 'story' ? 'REFLECTION' : 'QURʾĀN';
  ctx.letterSpacing = '4px'; ctx.fillText(kind, pad, pad + 10); ctx.letterSpacing = '0px';
  ctx.textAlign = 'right'; ctx.fillText(post.verse || '', W - pad, pad + 10);
  ctx.fillStyle = 'rgba(244,239,226,0.25)'; ctx.fillRect(pad, pad + 36, width, 1.5);

  // Measure blocks, then centre them vertically in the free space.
  const top = pad + 80, bottom = H - pad - 150;
  const arabic = post.arabic && post.arabic.length < 900
    ? fit(ctx, post.arabic, { font: s => `500 ${s}px "Noto Naskh Arabic", serif`, max: format === 'story' ? 76 : 68, min: 34, width, maxLines: format === 'square' ? 4 : 6 })
    : null;
  const english = fit(ctx, `“${post.text}”`, { font: s => `400 ${s}px "Source Serif 4", Georgia, serif`, max: format === 'story' ? 54 : 48, min: 26, width, maxLines: format === 'story' ? 14 : format === 'square' ? 7 : 10 });
  const arLine = arabic ? arabic.size * 1.95 : 0, enLine = english.size * 1.42, gap = arabic ? 64 : 0;
  const blockHeight = (arabic ? arabic.lines.length * arLine : 0) + gap + english.lines.length * enLine;
  let y = top + Math.max(0, (bottom - top - blockHeight) / 2);

  if (arabic) {
    ctx.font = `500 ${arabic.size}px "Noto Naskh Arabic", serif`; ctx.fillStyle = cream; ctx.textAlign = 'center'; ctx.direction = 'rtl';
    ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 18;
    for (const line of arabic.lines) { y += arLine; ctx.fillText(line, W / 2, y - arLine * 0.28); }
    ctx.direction = 'ltr'; y += gap;
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(244,239,226,0.45)'; ctx.beginPath(); ctx.arc(W / 2, y - gap / 2 - 4, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.font = `400 ${english.size}px "Source Serif 4", Georgia, serif`; ctx.fillStyle = cream; ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 12;
  for (const line of english.lines) { y += enLine; ctx.fillText(line, W / 2, y - enLine * 0.25); }
  ctx.shadowBlur = 0;

  // Footer: source and wordmark
  ctx.fillStyle = 'rgba(244,239,226,0.25)'; ctx.fillRect(pad, H - pad - 96, width, 1.5);
  ctx.textAlign = 'left'; ctx.fillStyle = cream; ctx.font = '600 30px "IBM Plex Sans", sans-serif';
  ctx.fillText(post.reference || '', pad, H - pad - 40);
  ctx.fillStyle = soft; ctx.font = '400 23px "IBM Plex Sans", sans-serif';
  const credit = post.type === 'story' ? 'Editorial reflection' : post.narrator || post.translator || '';
  ctx.fillText(credit.length > 46 ? `${credit.slice(0, 45)}…` : credit, pad, H - pad + 2);
  ctx.textAlign = 'right'; ctx.fillStyle = cream; ctx.font = '600 52px "IBM Plex Sans", sans-serif';
  ctx.letterSpacing = '-2px'; ctx.fillText('noor', W - pad, H - pad - 22); ctx.letterSpacing = '0px';
  ctx.fillStyle = '#aed7c6'; ctx.font = '500 30px "Noto Naskh Arabic", serif';
  ctx.fillText('نور', W - pad, H - pad + 18);
  if (photo?.photographer) {
    ctx.save(); ctx.translate(W - 34, H / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(244,239,226,0.4)'; ctx.font = '400 17px "IBM Plex Sans", sans-serif';
    ctx.fillText(`Photo: ${photo.photographer} / Unsplash`, 0, 0); ctx.restore();
  }
  return canvas;
}

export const canvasBlob = canvas => new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
