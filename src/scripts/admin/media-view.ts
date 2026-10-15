import { api, ApiError } from './api';
import { h, toast, isShowing } from './dom';
import { uploadMedia, type MediaItem } from './media';

/** Every uploaded photo: upload new ones, delete unused ones. */
export async function mediaView(main: HTMLElement) {
  let items = (await api<{ items: MediaItem[] }>('media')).items;
  const draw = () => {
    if (!isShowing('media')) return;
    const file = h('input', { type: 'file', id: 'media-file', accept: 'image/jpeg,image/png,image/webp' });
    const alt = h('input', { type: 'text', id: 'media-alt', maxlength: 200 });
    const error = h('p', { class: 'error', role: 'alert' });
    const upload = async (event: Event) => {
      event.preventDefault();
      error.textContent = '';
      const chosen = file.files?.[0];
      if (!chosen) { error.textContent = 'Choose a photo first.'; return; }
      try {
        items = [await uploadMedia(chosen, alt.value), ...items];
        toast('Photo uploaded.');
        draw();
      } catch (failure) {
        if (!(failure instanceof ApiError)) throw failure;
        error.textContent = failure.message;
      }
    };
    const remove = async (item: MediaItem) => {
      if (!confirm('Delete this photo for good?')) return;
      try {
        await api(`media/${item.id}`, { method: 'DELETE' });
        items = items.filter(other => other !== item);
        toast('Photo deleted.');
        draw();
      } catch (failure) {
        if (!(failure instanceof ApiError)) throw failure;
        toast(failure.message);
      }
    };
    main.replaceChildren(
      h('div', { class: 'view-head' }, h('h1', {}, 'Media library')),
      h('form', { class: 'editor', onsubmit: upload },
        h('div', { class: 'field' }, h('label', { for: 'media-file' }, 'Photo (JPEG, PNG or WebP, up to 10 MB)'), file),
        h('div', { class: 'field' }, h('label', { for: 'media-alt' }, 'Describe the photo'), h('p', { class: 'hint' }, 'For people who cannot see it, e.g. “Students receiving awards at Talent Eve 2026”.'), alt),
        error,
        h('div', { class: 'actions' }, h('button', { type: 'submit', class: 'primary' }, 'Upload'))),
      items.length
        ? h('ul', { class: 'media-grid' }, ...items.map(item => h('li', {},
          h('img', { src: `${item.base}-480.webp`, alt: item.alt, loading: 'lazy' }),
          h('span', { class: 'sub' }, item.alt),
          h('code', {}, item.base),
          h('button', { type: 'button', class: 'danger', onclick: () => remove(item) }, 'Delete'))))
        : h('p', {}, 'No photos uploaded yet.'));
  };
  draw();
}
