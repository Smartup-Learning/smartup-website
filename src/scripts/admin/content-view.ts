import { api, ApiError } from './api';
import { h, toast, isShowing } from './dom';
import { renderField, type Control, type Field, type Schema } from './fields';

type Row = Record<string, unknown> & { id: number };

/** A section's list (open, reorder) and its add/edit form. */
export async function contentView(main: HTMLElement, key: string, schema: Schema) {
  const section = schema.sections[key];
  let items = (await api<{ items: Row[] }>(`content/${key}`)).items;
  const titleOf = (item: Row) => String(item[section.title] ?? '') || '(untitled)';
  const showing = () => isShowing('content', key);

  const list = () => {
    const rows = items.map((item, index) => h('li', { class: 'row-item' },
      h('button', { type: 'button', class: 'row-main', onclick: () => edit(item) },
        h('strong', {}, titleOf(item)),
        h('span', { class: 'sub' }, String(item[section.subtitle] ?? ''))),
      item.published === false ? h('span', { class: 'badge' }, 'Hidden') : null,
      item.is_sample === true ? h('span', { class: 'badge' }, 'Sample') : null,
      section.sortable ? h('span', { class: 'move' },
        h('button', { type: 'button', 'aria-label': `Move ${titleOf(item)} up`, disabled: index === 0, onclick: () => move(index, -1) }, '↑'),
        h('button', { type: 'button', 'aria-label': `Move ${titleOf(item)} down`, disabled: index === items.length - 1, onclick: () => move(index, 1) }, '↓')) : null));
    main.replaceChildren(
      h('div', { class: 'view-head' }, h('h1', {}, section.label), h('button', { type: 'button', class: 'primary', onclick: () => edit(null) }, 'Add new')),
      items.length ? h('ul', { class: 'rows' }, ...rows) : h('p', {}, 'Nothing here yet. Use “Add new”.'));
  };

  const move = async (index: number, delta: number) => {
    const next = [...items];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    await api(`content/${key}/order`, { method: 'PUT', body: { ids: next.map(item => item.id) } });
    items = next;
    if (!showing()) return;
    list();
    main.querySelectorAll<HTMLButtonElement>('.row-main')[index + delta]?.focus();
    toast('Order saved.');
  };

  const edit = (item: Row | null) => {
    const controls: [Field, Control][] = section.fields.map(field => [field, renderField(field, item ? item[field.name] : undefined)]);
    const status = h('p', { class: 'status', role: 'alert' });
    const save = async (event: Event) => {
      event.preventDefault();
      status.textContent = '';
      controls.forEach(([, control]) => control.showError());
      const body = Object.fromEntries(controls.map(([field, control]) => [field.name, control.read()]));
      try {
        if (item) await api(`content/${key}/${item.id}`, { method: 'PUT', body });
        else await api(`content/${key}`, { method: 'POST', body });
        items = (await api<{ items: Row[] }>(`content/${key}`)).items;
        if (showing()) list();
        toast('Saved. The website shows the change now.');
      } catch (failure) {
        if (!(failure instanceof ApiError)) throw failure;
        status.textContent = failure.message;
        const failed = controls.filter(([field]) => failure.fields[field.name]);
        failed.forEach(([field, control]) => control.showError(failure.fields[field.name]));
        failed[0]?.[1].focus();
      }
    };
    const remove = async () => {
      if (!item || !confirm('Delete this item? This cannot be undone.')) return;
      await api(`content/${key}/${item.id}`, { method: 'DELETE' });
      items = items.filter(other => other.id !== item.id);
      if (showing()) list();
      toast('Deleted.');
    };
    main.replaceChildren(h('form', { class: 'editor', novalidate: true, onsubmit: save },
      h('div', { class: 'view-head' }, h('h1', {}, item ? `Edit: ${titleOf(item)}` : `Add to ${section.label}`), h('button', { type: 'button', class: 'link', onclick: list }, '← Back to the list')),
      ...controls.map(([, control]) => control.element),
      status,
      h('div', { class: 'actions' }, h('button', { type: 'submit', class: 'primary' }, 'Save'), item ? h('button', { type: 'button', class: 'danger', onclick: remove }, 'Delete') : null)));
    controls[0]?.[1].focus();
  };

  list();
}
