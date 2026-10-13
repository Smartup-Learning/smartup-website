export function initFaqSearch() {
  const input = document.getElementById('faq-search') as HTMLInputElement | null;
  const none = document.getElementById('faq-none');
  if (!input) return;
  const items = Array.from(document.querySelectorAll<HTMLElement>('[data-faq]'));
  input.closest('form')?.removeAttribute('hidden');
  input.addEventListener('input', () => {
    const terms = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    items.forEach(item => {
      const text = item.textContent?.toLowerCase() ?? '';
      const match = terms.every(t => text.includes(t));
      item.hidden = !match;
      if (match) shown++;
    });
    if (none) none.hidden = shown > 0;
  });
}
