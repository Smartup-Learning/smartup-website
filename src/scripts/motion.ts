import { animate, inView, stagger } from 'motion';
import { formatCount } from '../lib/count';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function blink(svg: Element) {
  animate(svg.querySelectorAll('.owl-eye'), { scaleY: [1, 0.1, 1, 0.1, 1] }, { duration: 0.55, times: [0, 0.2, 0.45, 0.65, 1] });
}

export function glance(svg: Element, direction: -1 | 1) {
  const pupils = svg.querySelector('.owl-pupils');
  if (pupils) animate(pupils, { x: [0, 6 * direction, 6 * direction, 0] }, { duration: 1.4, times: [0, 0.2, 0.75, 1], ease: EASE });
}

export function rollHead(svg: Element) {
  animate(svg, { rotate: [0, 360] }, { duration: 1.2, ease: EASE });
}

/** The owl's smile from the animation guide: eyes curve up into happy arcs, then open again. */
export function smile(svg: Element) {
  animate(svg.querySelectorAll('.owl-eye'), { scaleY: [1, 0.35, 0.35, 1], y: [0, -3, -3, 0] }, { duration: 1.6, times: [0, 0.15, 0.8, 1], ease: EASE });
}

function initReveals() {
  // On a slow connection the page's backup timer has already shown everything (Base.astro removes the
  // "js" class); fading it in again would hide content the reader is looking at.
  if (!document.documentElement.classList.contains('js')) return;
  // Group items are watched one by one: a long grid can be many screens tall, so 15% of the
  // whole group may never fit on a phone. Items entering together still animate in sequence.
  let batch: HTMLElement[] = [];
  const reveal = (element: Element) => {
    batch.push(element as HTMLElement);
    if (batch.length > 1) return;
    requestAnimationFrame(() => {
      const items = batch;
      batch = [];
      // The CSS keeps each item hidden until the fade has taken over; marking it revealed any earlier shows it
      // at full strength for a frame or two before the fade starts from zero, a visible flicker. Motion keeps
      // the final opacity on each item as it finishes, and the class then keeps it shown.
      animate(items, { opacity: [0, 1], y: [24, 0] }, { duration: 0.6, delay: stagger(0.07), ease: EASE })
        .then(() => items.forEach(item => item.classList.add('is-revealed')));
    });
  };
  inView('[data-reveal]:not([data-reveal="group"]), [data-reveal="group"] [data-reveal-item]', reveal, { amount: 0.15 });
}

function initCounters() {
  inView('[data-count-to]', element => {
    const el = element as HTMLElement;
    const to = Number(el.dataset.countTo);
    const suffix = el.dataset.countSuffix ?? '';
    const grouped = el.dataset.countGroup !== undefined;
    if (!Number.isFinite(to)) return;
    animate(0, to, { duration: 1.4, ease: EASE, onUpdate: v => { el.textContent = formatCount(Math.round(v), grouped) + suffix; } });
  }, { amount: 0.6 });
}

// Owls marked happy smile and roll their head once when they come into view, as on the thanks page.
function initHappyOwls() {
  inView('svg[data-owl="happy"]', svg => {
    const timer = window.setTimeout(() => { smile(svg); window.setTimeout(() => rollHead(svg), 1800); }, 400);
    return () => window.clearTimeout(timer);
  }, { amount: 0.6 });
}

function initIdleOwls() {
  inView('svg[data-owl="idle"]', svg => {
    let timer = 0;
    const loop = () => {
      if (Math.random() < 0.6) blink(svg); else glance(svg, Math.random() < 0.5 ? -1 : 1);
      timer = window.setTimeout(loop, 3500 + Math.random() * 2500);
    };
    timer = window.setTimeout(loop, 1200);
    return () => window.clearTimeout(timer);
  });
}

export function initMotion(reduceMotion: boolean) {
  // Reduced motion: server-rendered final values stay, and CSS never hides reveal targets.
  if (reduceMotion) return;
  initReveals();
  initCounters();
  initIdleOwls();
  initHappyOwls();
}
