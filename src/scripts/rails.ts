/**
 * Adds previous and next buttons to sideways-scrolling rows. They show from 900px wide, and only when the row
 * actually overflows; phones swipe instead. Without this script rows still scroll.
 */
export function initRails(reduceMotion: boolean) {
  document.querySelectorAll<HTMLElement>('.rail').forEach(rail => {
    const wrap = document.createElement('div');
    wrap.className = 'rail-wrap';
    rail.before(wrap);
    wrap.append(rail);
    const button = (label: string, direction: 1 | -1, path: string) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `rail-btn rail-btn--${direction > 0 ? 'next' : 'prev'}`;
      b.setAttribute('aria-label', label);
      b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
      b.addEventListener('click', () => { if (b.getAttribute('aria-disabled') !== 'true') rail.scrollBy({ left: direction * rail.clientWidth * 0.8, behavior: reduceMotion ? 'auto' : 'smooth' }); });
      wrap.append(b);
      return b;
    };
    const prev = button('Previous', -1, 'M15 5l-7 7 7 7');
    const next = button('Next', 1, 'M9 5l7 7-7 7');
    const update = () => {
      const room = rail.scrollWidth - rail.clientWidth;
      // A few pixels of slack: a classic scrollbar can shift the first card's resting place slightly.
      wrap.toggleAttribute('data-overflow', room > 12);
      // aria-disabled rather than disabled, so a keyboard user's focus stays on the arrow at the end of a row.
      prev.setAttribute('aria-disabled', String(rail.scrollLeft <= 12));
      next.setAttribute('aria-disabled', String(rail.scrollLeft >= room - 12));
    };
    rail.addEventListener('scroll', update, { passive: true });
    new ResizeObserver(update).observe(rail);
    update();
  });
}
