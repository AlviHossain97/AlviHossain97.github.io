import { counters, initMotion, isPaused, magnetic, motionOn, reveal, setPaused, spotlight } from '../lib/motion';

initMotion();

// "Pause animation" control (also stops the WebGL field via the motionchange event).
const toggle = document.querySelector<HTMLButtonElement>('[data-motion-toggle]');
const sync = () => {
  if (!toggle) return;
  const reduced = document.documentElement.dataset.motion === 'off' && !isPaused();
  toggle.setAttribute('aria-pressed', String(isPaused() || reduced));
  toggle.disabled = reduced;
  toggle.querySelector('[data-label]')!.textContent = reduced
    ? 'Animation off (system setting)'
    : isPaused()
      ? 'Play animation'
      : 'Pause animation';
};
toggle?.addEventListener('click', () => setPaused(!isPaused()));
document.addEventListener('motionchange', sync);
sync();

if (motionOn()) {
  reveal(document.querySelectorAll('[data-reveal]'));
  counters(document.querySelectorAll('[data-count]'));
}
spotlight(document.querySelectorAll('.spot'));
magnetic(document.querySelectorAll('[data-magnetic]'));
