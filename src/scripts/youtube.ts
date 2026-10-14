import { announcePlay, playedBy, MEDIA_PLAY } from './media-bus';

/**
 * Swaps a YouTube link for a privacy-enhanced player only after the visitor taps it. Only one video plays at a time.
 * On phones the player opens large in a dialog; the phone's back button closes it.
 */
export function initYouTube() {
  const phone = window.matchMedia('(max-width: 599px)');
  const dialog = document.querySelector<HTMLDialogElement>('dialog.video-player');
  const stage = dialog?.querySelector<HTMLElement>('[data-player-stage]');
  const title = dialog?.querySelector<HTMLElement>('[data-player-title]');
  let active: { frame: HTMLElement; link: HTMLAnchorElement } | null = null;
  let opener: HTMLAnchorElement | null = null;

  const player = (id: string, label: string) => {
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
    iframe.title = label;
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    return iframe;
  };
  const stopInline = () => { if (active) { active.frame.replaceWith(active.link); active = null; } };

  document.addEventListener(MEDIA_PLAY, event => {
    const source = playedBy(event);
    if (active && source !== active.frame) stopInline();
    if (dialog?.open && source !== dialog) dialog.close();
  });

  if (dialog && stage && typeof dialog.showModal === 'function') {
    dialog.addEventListener('close', () => {
      stage.replaceChildren();
      if (history.state?.videoPlayer) history.back();
      opener?.focus();
    });
    window.addEventListener('popstate', () => { if (dialog.open) dialog.close(); });
    dialog.querySelector('[data-player-close]')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  }

  document.querySelectorAll<HTMLElement>('[data-yt]').forEach(figure => {
    const link = figure.querySelector<HTMLAnchorElement>('a.yt-frame');
    const id = figure.dataset.yt;
    if (!link || !id || !/^[\w-]{11}$/.test(id)) return;
    link.addEventListener('click', event => {
      event.preventDefault();
      const label = link.dataset.ytTitle ?? 'YouTube video';
      stopInline();
      if (phone.matches && dialog && stage && typeof dialog.showModal === 'function') {
        opener = link;
        dialog.dataset.format = figure.dataset.format ?? 'landscape';
        if (title) title.textContent = label;
        stage.replaceChildren(player(id, label));
        dialog.showModal();
        history.pushState({ videoPlayer: true }, '');
        announcePlay(dialog);
        return;
      }
      const frame = document.createElement('div');
      frame.className = link.className;
      const iframe = player(id, label);
      frame.append(iframe);
      link.replaceWith(frame);
      active = { frame, link };
      announcePlay(frame);
      iframe.focus();
    });
  });
}
