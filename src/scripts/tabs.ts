export function initTabs() {
  document.querySelectorAll<HTMLElement>('[data-tabs]').forEach(root => {
    const list = root.querySelector<HTMLElement>('[role="tablist"]');
    const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls') ?? ''));
    if (!list || tabs.length === 0 || panels.some(p => !p)) return;
    list.hidden = false;
    const select = (index: number, focus = false) => tabs.forEach((tab, i) => {
      const on = i === index;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      panels[i]!.hidden = !on;
      if (on && focus) tab.focus();
    });
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(i));
      tab.addEventListener('keydown', event => {
        const next = ({ ArrowRight: (i + 1) % tabs.length, ArrowLeft: (i - 1 + tabs.length) % tabs.length, Home: 0, End: tabs.length - 1 } as Record<string, number>)[event.key];
        if (next === undefined) return;
        event.preventDefault();
        select(next, true);
      });
    });
    select(0);
  });
}
