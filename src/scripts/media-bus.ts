/** One video plays at a time: whatever starts announces itself, and every other player stops. */
export const MEDIA_PLAY = 'smartup:media-play';
export const announcePlay = (source: Element) => document.dispatchEvent(new CustomEvent(MEDIA_PLAY, { detail: source }));
export const playedBy = (event: Event) => (event as CustomEvent<Element>).detail;
