import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';

/**
 * Count a number up to its target, the way a teller's counter settles.
 * Anyone who has asked for reduced motion gets the final figure immediately.
 */
export function useCountUp(target: number, duration = 900): number {
  const reduceMotion = usePrefersReducedMotion();
  const [value, setValue] = useState(reduceMotion ? target : 0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (reduceMotion) {
      setValue(target);
      return;
    }

    const from = fromRef.current;
    const start = performance.now();
    let frame = 0;

    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // easeOutExpo — fast out of the gate, settles precisely.
      const eased = progress === 1 ? 1 : 1 - 2 ** (-10 * progress);
      const next = from + (target - from) * eased;
      setValue(next);
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      } else {
        fromRef.current = target;
      }
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, reduceMotion]);

  return value;
}
