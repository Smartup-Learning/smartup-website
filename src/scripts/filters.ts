/**
 * Chip bars filter a list by data-filter-tags. Several bars on one list combine: an item must match every bar.
 * Containers marked data-filter-group hide when none of their items are visible.
 * Without this script every item stays visible and the bars stay hidden.
 */
export function initFilters() {
  const lists = new Map<HTMLElement, HTMLElement[]>();
  document.querySelectorAll<HTMLElement>('[data-filter-for]').forEach(bar => {
    const list = document.getElementById(bar.dataset.filterFor ?? '');
    if (list) lists.set(list, [...(lists.get(list) ?? []), bar]);
  });
  lists.forEach((bars, list) => {
    const items = Array.from(list.querySelectorAll<HTMLElement>('[data-filter-tags]'));
    const groups = Array.from(list.querySelectorAll<HTMLElement>('[data-filter-group]'));
    const apply = () => {
      const chosen = bars.map(bar => bar.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')?.dataset.filter ?? 'all').filter(value => value !== 'all');
      items.forEach(item => {
        const tags = (item.dataset.filterTags ?? '').split(' ');
        item.hidden = !chosen.every(value => tags.includes(value));
      });
      groups.forEach(group => { group.hidden = !group.querySelector('[data-filter-tags]:not([hidden])'); });
    };
    bars.forEach(bar => {
      bar.hidden = false;
      const buttons = Array.from(bar.querySelectorAll<HTMLButtonElement>('button[data-filter]'));
      buttons.forEach(button => button.addEventListener('click', () => {
        buttons.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
        apply();
      }));
    });
  });
}
