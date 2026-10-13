import { initMenu } from './menu';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
initMenu(reduceMotion);
(window as unknown as { __siteReady: boolean }).__siteReady = true;
