import { initMenu } from './menu';
import { initMotion } from './motion';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
initMenu(reduceMotion);
initMotion(reduceMotion);
(window as unknown as { __siteReady: boolean }).__siteReady = true;
