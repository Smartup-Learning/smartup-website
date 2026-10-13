/** Ask Smartup: topic chips and the search box together narrow the FAQ list. */
export function initFaqSearch() {
  const items = Array.from(document.querySelectorAll<HTMLElement>('[data-faq]'));
  // With no questions there is nothing to search, so the box and chips stay hidden.
  if (items.length === 0) return;
  const input = document.getElementById('faq-search') as HTMLInputElement | null;
  const chips = document.querySelector<HTMLElement>('[data-faq-chips]');
  const none = document.getElementById('faq-none');
  const buttons = Array.from(chips?.querySelectorAll<HTMLButtonElement>('button[data-filter]') ?? []);
  let category = 'all';
  const apply = () => {
    const terms = (input?.value ?? '').toLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    items.forEach(item => {
      const text = item.textContent?.toLowerCase() ?? '';
      const match = (category === 'all' || item.dataset.category === category) && terms.every(t => text.includes(t));
      item.hidden = !match;
      if (match) shown++;
    });
    document.querySelectorAll<HTMLElement>('[data-faq-group]').forEach(group => { group.hidden = !group.querySelector('[data-faq]:not([hidden])'); });
    if (none) none.hidden = shown > 0;
  };
  input?.closest('form')?.removeAttribute('hidden');
  input?.addEventListener('input', apply);
  if (chips) chips.hidden = false;
  buttons.forEach(button => button.addEventListener('click', () => {
    category = button.dataset.filter ?? 'all';
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    apply();
  }));
}
