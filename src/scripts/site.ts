import { initMenu } from './menu';
import { initMotion } from './motion';
import { initTimelines } from './timeline';
import { initTabs } from './tabs';
import { initFilters } from './filters';
import { initVideos } from './video';
import { initYouTube } from './youtube';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
initMenu(reduceMotion);
initTabs();
initFilters();
initVideos();
initYouTube();
initMotion(reduceMotion);
initTimelines(reduceMotion);
(window as unknown as { __siteReady: boolean }).__siteReady = true;
