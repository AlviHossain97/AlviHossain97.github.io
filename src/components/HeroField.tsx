import { lazy, Suspense, useEffect, useRef, useState } from 'react';

/**
 * Animated flowing ribbons behind the hero (ThreeUI Community "Stream Convergence Background", MIT).
 * Verified self-contained: one WebGL canvas, no iframe, no CDN, no remote request (tests/e2e enforces it).
 * It is a progressive enhancement over a static CSS poster:
 *  - the effect's code is a separate chunk, requested only after first paint;
 *  - nothing renders under reduced motion, Save-Data, a missing WebGL context, or after "Pause animation";
 *  - it is unmounted (so the GPU stops) while the hero is offscreen or the tab is hidden;
 *  - phones with little CPU or memory keep the poster.
 */
const Field = lazy(() =>
  import('@designcodeio/threeui/components/StreamConvergenceBackground').then((m) => ({
    default: m.StreamConvergenceBackground,
  })),
);

type Nav = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };

const hasWebGL = (): boolean => {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl') ?? c.getContext('experimental-webgl'));
  } catch {
    return false;
  }
};

// Touch devices (phones, tablets) with little CPU or memory keep the poster. Narrow desktop windows still get the field.
const lowPower = (): boolean => {
  const n = navigator as Nav;
  return matchMedia('(pointer: coarse)').matches && ((n.hardwareConcurrency ?? 8) <= 4 || (n.deviceMemory ?? 8) <= 4);
};

export default function HeroField() {
  const host = useRef<HTMLDivElement>(null);
  const [allowed, setAllowed] = useState(false); // device and preference gate
  const [visible, setVisible] = useState(true); // hero on screen and tab visible
  const [ready, setReady] = useState(false); // first frame can fade in

  useEffect(() => {
    const decide = () => {
      const on = document.documentElement.dataset.motion === 'on';
      setAllowed(on && hasWebGL() && !lowPower());
    };
    // Wait for first paint and an idle moment before asking for the chunk.
    const start = () => {
      if ('requestIdleCallback' in window) window.requestIdleCallback(decide, { timeout: 1500 });
      else setTimeout(decide, 200);
    };
    if (document.readyState === 'complete') start();
    else addEventListener('load', start, { once: true });
    document.addEventListener('motionchange', decide);
    return () => document.removeEventListener('motionchange', decide);
  }, []);

  useEffect(() => {
    const el = host.current?.closest('.hero'); // the island wrapper is display: contents, so observe the section
    if (!el) return;
    let inView = true;
    const update = () => setVisible(inView && !document.hidden);
    const io = new IntersectionObserver((entries) => {
      inView = entries.at(-1)?.isIntersecting ?? true;
      update();
    });
    io.observe(el);
    document.addEventListener('visibilitychange', update);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  const small = typeof matchMedia === 'function' && matchMedia('(max-width: 40rem)').matches;
  const run = allowed && visible;
  useEffect(() => {
    if (!run) setReady(false);
  }, [run]);

  return (
    <div ref={host} className="hero-field" data-ready={ready} aria-hidden="true">
      {run && (
        <Suspense fallback={null}>
          <div className="hero-field-canvas" ref={(n) => void (n && requestAnimationFrame(() => setReady(true)))}>
            <Field
              hue={280}
              saturation={0.7}
              brightness={0.85}
              opacity={0.85}
              fidelity={small ? 0.3 : 0.5}
              speed={small ? 0.6 : 1}
            />
          </div>
        </Suspense>
      )}
    </div>
  );
}
