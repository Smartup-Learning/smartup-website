import { initMenu } from './menu';
import { initMotion } from './motion';
import { initTimelines } from './timeline';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
initMenu(reduceMotion);
initMotion(reduceMotion);
// Reduced motion keeps the line fully drawn (CSS default) and the owl still.
if (!reduceMotion) initTimelines();
(window as unknown as { __siteReady: boolean }).__siteReady = true;
