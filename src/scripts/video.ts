import { announcePlay, playedBy, MEDIA_PLAY } from './media-bus';

/**
 * Our own videos start with a poster and the brand's play button; the browser's controls appear once playing.
 * Without this script the videos keep their native controls.
 */
export function initVideos() {
  const videos = Array.from(document.querySelectorAll<HTMLVideoElement>('video[data-exclusive]'));
  videos.forEach(video => {
    const button = video.parentElement?.querySelector<HTMLButtonElement>('[data-video-play]');
    if (button) {
      video.controls = false;
      button.hidden = false;
      button.addEventListener('click', () => {
        video.controls = true;
        button.hidden = true;
        video.play().catch(() => {});
        video.focus();
      });
    }
    video.addEventListener('play', () => {
      video.controls = true;
      if (button) button.hidden = true;
      announcePlay(video);
    });
  });
  document.addEventListener(MEDIA_PLAY, event => videos.forEach(video => { if (video !== playedBy(event) && !video.paused) video.pause(); }));
}
