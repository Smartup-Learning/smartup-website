/** Chip bars filter a list by data-filter-tags; without this script every item stays visible and the bar stays hidden. */
export function initFilters() {
  document.querySelectorAll<HTMLElement>('[data-filter-for]').forEach(bar => {
    const list = document.getElementById(bar.dataset.filterFor ?? '');
    if (!list) return;
    const items = Array.from(list.querySelectorAll<HTMLElement>('[data-filter-tags]'));
    const buttons = Array.from(bar.querySelectorAll<HTMLButtonElement>('button[data-filter]'));
    bar.hidden = false;
    buttons.forEach(button => button.addEventListener('click', () => {
      const value = button.dataset.filter ?? 'all';
      buttons.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      items.forEach(item => { item.hidden = value !== 'all' && !(item.dataset.filterTags ?? '').split(' ').includes(value); });
    }));
  });
}
