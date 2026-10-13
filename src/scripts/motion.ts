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

function initReveals() {
  inView('[data-reveal]', element => {
    const items = element.getAttribute('data-reveal') === 'group'
      ? Array.from(element.querySelectorAll<HTMLElement>('[data-reveal-item]'))
      : [element as HTMLElement];
    element.classList.add('is-revealed');
    animate(items, { opacity: [0, 1], y: [24, 0] }, { duration: 0.6, delay: stagger(0.07), ease: EASE });
  }, { amount: 0.15 });
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
}
