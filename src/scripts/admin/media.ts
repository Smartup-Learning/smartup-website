import { api } from './api';
import { h } from './dom';

export type MediaItem = { id: number; base: string; alt: string; width: number; height: number; createdAt: string };

export const uploadMedia = (file: File, alt: string) => api<MediaItem>(`media?alt=${encodeURIComponent(alt.trim())}`, { method: 'POST', raw: file });

/** Opens a dialog of uploaded photos; resolves with the chosen photo's path, or null. */
export async function pickMedia(): Promise<string | null> {
  const { items } = await api<{ items: MediaItem[] }>('media');
  return new Promise(resolve => {
    const dialog = h('dialog', { 'aria-label': 'Choose a photo' });
    const close = (value: string | null) => { dialog.close(); dialog.remove(); resolve(value); };
    dialog.append(
      h('div', { class: 'view-head' }, h('h2', {}, 'Choose a photo'), h('button', { type: 'button', onclick: () => close(null) }, 'Cancel')),
      items.length === 0
        ? h('p', {}, 'No photos uploaded yet. Upload one with the form instead.')
        : h('ul', { class: 'media-grid' }, ...items.map(item => h('li', {},
          h('button', { type: 'button', class: 'pick', 'aria-label': `Choose: ${item.alt}`, onclick: () => close(item.base) }, h('img', { src: `${item.base}-480.webp`, alt: '' })),
          h('span', { class: 'sub' }, item.alt)))));
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(null); });
    document.body.append(dialog);
    dialog.showModal();
  });
}
