/**
 * Opens links marked data-lightbox in the shared picture viewer. Links with the same data-lightbox value form a group
 * the visitor can step through with the arrows, the keyboard or a swipe. The phone's back button closes the viewer.
 */
export function initLightbox() {
  const dialog = document.querySelector<HTMLDialogElement>('dialog.lightbox');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const img = dialog.querySelector<HTMLImageElement>('[data-lightbox-img]')!;
  const caption = dialog.querySelector<HTMLElement>('[data-lightbox-caption]')!;
  const count = dialog.querySelector<HTMLElement>('[data-lightbox-count]')!;
  const prev = dialog.querySelector<HTMLButtonElement>('[data-lightbox-prev]')!;
  const next = dialog.querySelector<HTMLButtonElement>('[data-lightbox-next]')!;
  const stage = dialog.querySelector<HTMLElement>('[data-lightbox-stage]')!;
  let items: HTMLAnchorElement[] = [];
  let index = 0;
  let opener: HTMLAnchorElement | null = null;

  const preload = (i: number) => { const link = items[i]; if (link) new Image().src = link.href; };
  const show = (i: number) => {
    index = (i + items.length) % items.length;
    const link = items[index];
    img.src = link.getAttribute('href')!;
    img.alt = link.querySelector('img')?.alt ?? '';
    caption.textContent = link.dataset.caption ?? img.alt;
    const several = items.length > 1;
    prev.hidden = next.hidden = !several;
    count.textContent = several ? `${index + 1} of ${items.length}` : '';
    if (several) { preload(index + 1); preload(index - 1); }
  };

  const open = (link: HTMLAnchorElement) => {
    const group = link.dataset.lightbox;
    items = Array.from(document.querySelectorAll<HTMLAnchorElement>(`a[data-lightbox="${CSS.escape(group ?? '')}"]`)).filter(a => !a.closest('[hidden]'));
    if (!items.includes(link)) items = [link];
    opener = link;
    show(items.indexOf(link));
    dialog.showModal();
    document.documentElement.classList.add('lightbox-open');
    // A history entry lets the phone's back button close the viewer instead of leaving the page.
    history.pushState({ lightbox: true }, '');
  };

  document.addEventListener('click', event => {
    const link = (event.target as Element).closest?.<HTMLAnchorElement>('a[data-lightbox]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    open(link);
  });

  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('lightbox-open');
    img.removeAttribute('src');
    if (history.state?.lightbox) history.back();
    opener?.focus();
  });
  window.addEventListener('popstate', () => { if (dialog.open) dialog.close(); });
  dialog.querySelector('[data-lightbox-close]')!.addEventListener('click', () => dialog.close());
  prev.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  // A tap on the dark area around the picture closes the viewer.
  dialog.addEventListener('click', event => { if (event.target === dialog || event.target === stage) dialog.close(); });
  dialog.addEventListener('keydown', event => {
    if (items.length < 2) return;
    if (event.key === 'ArrowRight') show(index + 1);
    if (event.key === 'ArrowLeft') show(index - 1);
  });

  let startX = 0, startY = 0, tracking = false;
  stage.addEventListener('pointerdown', event => { tracking = event.isPrimary; startX = event.clientX; startY = event.clientY; });
  stage.addEventListener('pointerup', event => {
    if (!tracking) return;
    tracking = false;
    const dx = event.clientX - startX, dy = event.clientY - startY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) && items.length > 1) show(index + (dx < 0 ? 1 : -1));
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) dialog.close();
  });
  img.addEventListener('dragstart', event => event.preventDefault());
}
