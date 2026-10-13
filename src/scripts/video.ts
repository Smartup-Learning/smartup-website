export function initVideos() {
  const videos = Array.from(document.querySelectorAll<HTMLVideoElement>('video[data-exclusive]'));
  videos.forEach(video => video.addEventListener('play', () => videos.forEach(other => { if (other !== video) other.pause(); })));
}
