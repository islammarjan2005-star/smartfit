// A long passage is a reading surface inside a paged feed. Handle its scrolling
// explicitly, including at the boundaries, so native keys never reach the feed.
export function scrollReadingKey(event, surface) {
  const key = event.code === 'Space' ? ' ' : event.key;
  const maximum = Math.max(0, surface.scrollHeight - surface.clientHeight);
  const page = Math.max(48, surface.clientHeight * .85);
  let top;
  switch (key) {
    case 'Home': top = 0; break;
    case 'End': top = maximum; break;
    case 'PageUp': top = surface.scrollTop - page; break;
    case 'PageDown': top = surface.scrollTop + page; break;
    case 'ArrowUp': top = surface.scrollTop - 44; break;
    case 'ArrowDown': top = surface.scrollTop + 44; break;
    case ' ': top = surface.scrollTop + (event.shiftKey ? -page : page); break;
    default: return false;
  }
  event.preventDefault();
  event.stopPropagation();
  surface.scrollTo({ top: Math.max(0, Math.min(maximum, top)), behavior: 'instant' });
  return true;
}
