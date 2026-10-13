import { animate } from 'motion';

export function initMenu(reduceMotion: boolean) {
  const toggle = document.querySelector<HTMLAnchorElement>('[data-menu-toggle]');
  const panel = document.getElementById('site-menu');
  const label = toggle?.querySelector('[data-menu-label]');
  if (!toggle || !panel || !label) return;
  toggle.setAttribute('role', 'button');
  toggle.setAttribute('aria-controls', 'site-menu');
  toggle.setAttribute('aria-expanded', 'false');

  // While the full-screen menu is open, the page behind it is inert and Tab cycles between the toggle and the menu links.
  const behind = () => document.querySelectorAll<HTMLElement>('main, footer, .mobile-bar, .skip-link');
  const cycle = () => [toggle as HTMLElement, ...panel.querySelectorAll<HTMLElement>('a')];

  const setOpen = (open: boolean) => {
    panel.hidden = !open;
    behind().forEach(el => { el.inert = open; });
    toggle.setAttribute('aria-expanded', String(open));
    label.textContent = open ? 'Close' : 'Menu';
    document.documentElement.classList.toggle('menu-open', open);
    if (open) {
      if (!reduceMotion) animate(panel, { opacity: [0, 1], y: [-8, 0] }, { duration: 0.42, ease: [0.22, 1, 0.36, 1] });
      panel.querySelector<HTMLElement>('a')?.focus();
    }
  };

  toggle.addEventListener('click', event => { event.preventDefault(); setOpen(panel.hidden); });
  toggle.addEventListener('keydown', event => { if (event.key === ' ') { event.preventDefault(); setOpen(panel.hidden); } });
  document.addEventListener('keydown', event => {
    if (panel.hidden) return;
    if (event.key === 'Escape') { setOpen(false); toggle.focus(); return; }
    if (event.key !== 'Tab') return;
    const items = cycle();
    const first = items[0], last = items[items.length - 1];
    const inCycle = items.includes(document.activeElement as HTMLElement);
    if (event.shiftKey && (document.activeElement === first || !inCycle)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !inCycle)) { event.preventDefault(); first.focus(); }
  });
  panel.addEventListener('click', event => { if ((event.target as Element).closest('a')) setOpen(false); });
}
