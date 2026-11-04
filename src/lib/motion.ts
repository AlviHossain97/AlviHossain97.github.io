import { animate } from 'motion/mini';
import { inView } from 'motion';

/**
 * One switch for every animation on the page.
 * Off when the visitor prefers reduced motion, has Save-Data on, or pressed "Pause animation".
 * <html data-motion="on|off"> mirrors it so CSS can stop its own animations too.
 */
const KEY = 'motion-paused';
// Safe to import during server rendering: nothing touches the browser until a function is called.
const browser = typeof window !== 'undefined';
const reducedQuery = browser ? matchMedia('(prefers-reduced-motion: reduce)') : null;
const saveData = (): boolean =>
  browser && Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);

const readPaused = (): boolean => {
  if (!browser) return false;
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};

let paused = readPaused();
export const isPaused = (): boolean => paused;
export const reducedMotion = (): boolean => !browser || Boolean(reducedQuery?.matches) || saveData();
export const motionOn = (): boolean => !reducedMotion() && !paused;

export const MOTION_EVENT = 'motionchange';
const publish = () => {
  document.documentElement.dataset.motion = motionOn() ? 'on' : 'off';
  document.dispatchEvent(new CustomEvent(MOTION_EVENT, { detail: { on: motionOn(), paused } }));
};
export const setPaused = (value: boolean): void => {
  paused = value;
  try {
    localStorage.setItem(KEY, value ? '1' : '0');
  } catch {
    /* storage blocked: the choice lasts for this visit */
  }
  publish();
};
reducedQuery?.addEventListener('change', publish);
export const initMotion = publish;

const EASE = [0.16, 1, 0.3, 1] as const; // exponential ease-out

/** Fade and rise elements into view once, staggered within each batch. Nothing is hidden unless motion is on. */
export function reveal(els: Iterable<Element>): void {
  if (!motionOn()) return;
  const list = [...els].filter(
    (el): el is HTMLElement => el instanceof HTMLElement && !el.dataset.revealed && !el.dataset.pending,
  );
  for (const el of list) {
    el.style.opacity = '0';
    el.dataset.pending = '1';
  }
  let batch = 0;
  inView(
    list,
    (el) => {
      const i = batch++ % 4;
      (el as HTMLElement).dataset.revealed = '1';
      const a = animate(
        el,
        { opacity: [0, 1], transform: ['translateY(22px)', 'translateY(0)'] },
        { duration: 0.7, delay: i * 0.07, ease: EASE },
      );
      a.finished.then(() => {
        (el as HTMLElement).style.opacity = '';
        (el as HTMLElement).style.transform = '';
      });
    },
    { amount: 0.15 },
  );
}

/** Count up to the number already in the markup. The server-rendered value stays if motion is off. */
export function counters(els: Iterable<Element>): void {
  if (!motionOn()) return;
  for (const el of els) {
    if (!(el instanceof HTMLElement)) continue;
    const target = Number(el.dataset.count);
    if (!Number.isFinite(target)) continue;
    el.textContent = '0';
    inView(
      el,
      () => {
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / 1100);
          el.textContent = String(Math.round(target * (1 - Math.pow(1 - t, 4))));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { amount: 0.6 },
    );
  }
}

/** Pointer-follow highlight for glass tiles. Pure CSS variables, no layout work. */
export function spotlight(els: Iterable<Element>): void {
  for (const el of els) {
    if (!(el instanceof HTMLElement)) continue;
    el.addEventListener('pointermove', (ev) => {
      if (!motionOn() || ev.pointerType !== 'mouse') return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${ev.clientX - r.left}px`);
      el.style.setProperty('--my', `${ev.clientY - r.top}px`);
    });
  }
}

/** Buttons lean a few pixels towards a mouse pointer. Keyboard and touch are unaffected. */
export function magnetic(els: Iterable<Element>): void {
  for (const el of els) {
    if (!(el instanceof HTMLElement)) continue;
    el.addEventListener('pointermove', (ev) => {
      if (!motionOn() || ev.pointerType !== 'mouse') return;
      const r = el.getBoundingClientRect();
      const dx = (ev.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (ev.clientY - (r.top + r.height / 2)) / r.height;
      el.style.transform = `translate(${(dx * 8).toFixed(1)}px, ${(dy * 6).toFixed(1)}px)`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.transform = '';
    });
  }
}
