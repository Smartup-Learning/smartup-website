/** Swaps a YouTube link for a privacy-enhanced player only after the visitor taps it. */
export function initYouTube() {
  document.querySelectorAll<HTMLElement>('[data-yt]').forEach(figure => {
    const link = figure.querySelector<HTMLAnchorElement>('a.yt-frame');
    const id = figure.dataset.yt;
    if (!link || !id || !/^[\w-]{11}$/.test(id)) return;
    link.addEventListener('click', event => {
      event.preventDefault();
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
      iframe.title = link.dataset.ytTitle ?? 'YouTube video';
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      iframe.allowFullscreen = true;
      const frame = document.createElement('div');
      frame.className = link.className;
      frame.append(iframe);
      link.replaceWith(frame);
    });
  });
}
