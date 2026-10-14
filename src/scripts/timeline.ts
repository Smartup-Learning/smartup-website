import { inView, scroll } from 'motion';
import { blink, glance, rollHead } from './motion';

export function initTimelines(reduceMotion: boolean) {
  document.querySelectorAll<HTMLElement>('[data-timeline]').forEach(timeline => {
    const rail = timeline.querySelector<HTMLElement>('.timeline-rail');
    const bar = timeline.querySelector<HTMLElement>('[data-timeline-progress]');
    const owl = timeline.querySelector<HTMLElement>('[data-timeline-owl]');
    const owlSvg = reduceMotion ? null : owl?.querySelector('svg');
    const now = timeline.querySelector<HTMLElement>('[data-timeline-now]');
    if (!rail || !bar) return;

    // The phone year strip shows only once it is pinned under the header, so it never repeats the year heading below it.
    if (now) {
      const pin = () => now.classList.toggle('is-stuck', now.getBoundingClientRect().top <= parseFloat(getComputedStyle(now).top) + 1);
      window.addEventListener('scroll', pin, { passive: true });
      pin();
    }

    // Reduced motion keeps the line fully drawn (CSS default) and the owl still; the year strip still updates.
    if (!reduceMotion) {
      let travel = 0;
      const measure = () => { travel = rail.clientHeight - (owl?.offsetHeight ?? 0); };
      measure();
      new ResizeObserver(measure).observe(timeline);
      // Start undrawn; without this script the CSS default keeps the line fully drawn.
      bar.style.transform = 'scaleY(0)';
      scroll((progress: number) => {
        bar.style.transform = `scaleY(${progress})`;
        if (owl) owl.style.transform = `translateY(${progress * travel}px)`;
      }, { target: timeline, offset: ['start 60%', 'end 60%'] });
    }

    const chapters = Array.from(timeline.querySelectorAll<HTMLElement>('li.chapter'));
    chapters.forEach((chapter, index) => {
      inView(chapter, () => {
        if (now) now.textContent = chapter.dataset.year ?? '';
        if (owlSvg) {
          if (index === chapters.length - 1) rollHead(owlSvg);
          else { glance(owlSvg, index % 2 === 0 ? -1 : 1); blink(owlSvg); }
        }
        return () => {};
      // A band across the middle of the screen, so chapters taller than the screen still trigger.
      }, { margin: '-45% 0px -50% 0px' });
    });
  });
}
