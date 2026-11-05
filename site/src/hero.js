import { mountDots } from './dots.js';
import { mountSpotlight } from './spotlight.js';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import strings from './strings/en.js';
document.title = strings.title;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const hero = document.querySelector('.hero');
mountSpotlight(document.querySelector('.sl'));
document.querySelector('.story-arrow').addEventListener('click', (event) => {
  event.preventDefault();
  const story = document.querySelector('#the-details');
  story.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  story.focus({ preventScroll: true });
});
mountDots(document.querySelector('#dots'), { reduced: reducedMotion.matches });
hero.classList.add('is-ready');
const APP_URL = import.meta.env.VITE_APP_URL ?? '';
const SLOTS = {
  'live-view-url': `${APP_URL}/login.html`,
  'login-url': `${APP_URL}/login.html`,
};
for (const a of document.querySelectorAll('[data-deploy-slot]')) {
  const target = SLOTS[a.dataset.deploySlot];
  if (target) a.setAttribute('href', target);
}
