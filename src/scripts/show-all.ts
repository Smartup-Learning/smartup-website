/**
 * Long groups (data-collapse) show the first rows of their grid until the visitor taps "Show all": two rows on phones,
 * one row once the grid has four or more columns. Rows are counted from the grid's real column count.
 * Without this script all items show.
 */
export function initShowAll() {
  document.querySelectorAll<HTMLElement>('[data-collapse]').forEach(group => {
    const grid = group.querySelector<HTMLElement>('[data-collapse-grid]');
    const button = group.querySelector<HTMLButtonElement>('[data-show-all]');
    if (!grid || !button) return;
    let open = false;
    const apply = () => {
      const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length || 1;
      let used = 0;
      const items = Array.from(grid.children) as HTMLElement[];
      items.forEach(item => {
        if (item.hidden) { item.classList.remove('is-collapsed'); return; }
        used += item.classList.contains('wide') ? 2 : 1;
        item.classList.toggle('is-collapsed', !open && used > columns * (columns >= 4 ? 1 : 2));
      });
      button.hidden = !items.some(item => item.classList.contains('is-collapsed'));
      const count = button.querySelector('[data-show-count]');
      if (count) count.textContent = String(items.filter(item => !item.hidden).length);
    };
    button.addEventListener('click', () => {
      open = true;
      const first = grid.querySelector<HTMLElement>('.is-collapsed a[href]');
      apply();
      first?.focus();
    });
    new ResizeObserver(apply).observe(grid);
    document.addEventListener('smartup:filtered', apply);
    apply();
  });
}
