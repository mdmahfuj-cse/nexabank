import { useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { Popover } from '@/components/ui/Popover';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Controls';
import { useToast } from '@/providers/ToastProvider';
import { network } from '@/mocks/api';

type SpeedKey = 'fast' | 'normal' | 'slow';
type FailureKey = 'never' | 'sometimes' | 'often';

const SPEEDS: Record<SpeedKey, { label: string; range: [number, number] }> = {
  fast: { label: 'Fast', range: [40, 140] },
  normal: { label: 'Normal', range: [220, 620] },
  slow: { label: 'Slow', range: [900, 1_800] },
};

const FAILURES: Record<FailureKey, { label: string; rate: number }> = {
  never: { label: 'Never', rate: 0 },
  sometimes: { label: 'Sometimes', rate: 0.2 },
  often: { label: 'Often', rate: 0.6 },
};

const speedOptions = (Object.keys(SPEEDS) as SpeedKey[]).map((key) => ({
  value: key,
  label: SPEEDS[key].label,
}));

const failureOptions = (Object.keys(FAILURES) as FailureKey[]).map((key) => ({
  value: key,
  label: FAILURES[key].label,
}));

/**
 * Demo controls.
 *
 * Every screen in this build handles four states — loading, empty, error and
 * settled — and three of them are invisible on a fast connection that never
 * fails. This dials the mock network so they can actually be seen, which is the
 * whole reason the API pretends to be one.
 */
export function DemoMenu() {
  const toast = useToast();

  const [speed, setSpeed] = useState<SpeedKey>(() => {
    const [min] = network.getLatency();
    return min <= 150 ? 'fast' : min >= 800 ? 'slow' : 'normal';
  });

  const [failure, setFailure] = useState<FailureKey>(() => {
    const rate = network.getFailureRate();
    return rate === 0 ? 'never' : rate <= 0.35 ? 'sometimes' : 'often';
  });

  const tweaked = speed !== 'normal' || failure !== 'never';

  const applySpeed = (next: SpeedKey) => {
    const [min, max] = SPEEDS[next].range;
    network.setLatency(min, max);
    setSpeed(next);
  };

  const applyFailure = (next: FailureKey) => {
    network.setFailureRate(FAILURES[next].rate);
    setFailure(next);
    if (next !== 'never') {
      toast.info(
        'Failures are on',
        'Reload a panel and the error states will show up. Retry always clears them.',
      );
    }
  };

  const reset = () => {
    applySpeed('normal');
    network.setFailureRate(0);
    setFailure('never');
  };

  return (
    <Popover
      label="Demo controls"
      panelClassName="w-[19rem]"
      trigger={
        <span className="relative grid size-9 place-items-center rounded-[var(--radius-field)] border border-base-300 transition-colors hover:border-base-content/25">
          <FlaskConical className="size-4" />
          {tweaked ? (
            <span
              aria-hidden="true"
              className="absolute right-1 top-1 size-1.5 rounded-full bg-warning"
            />
          ) : null}
        </span>
      }
    >
      {() => (
        <div>
          <div className="border-b border-base-300 px-3.5 py-2.5">
            <p className="eyebrow text-base-content/45">Demo controls</p>
            <p className="mt-1.5 text-xs leading-relaxed text-base-content/55">
              There is no backend here. These dial the mock network so the loading
              and error states are visible on purpose.
            </p>
          </div>

          <div className="space-y-4 px-3.5 py-3.5">
            <div>
              <p className="mb-2 text-xs font-medium">Response time</p>
              <Segmented
                label="Response time"
                size="sm"
                value={speed}
                onChange={applySpeed}
                options={speedOptions}
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-medium">Request failures</p>
              <Segmented
                label="Request failures"
                size="sm"
                value={failure}
                onChange={applyFailure}
                options={failureOptions}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-base-300 px-3.5 py-2.5">
            <p className="text-[0.7rem] text-base-content/40">
              {network.getLatency()[0]}–{network.getLatency()[1]} ms ·{' '}
              {Math.round(network.getFailureRate() * 100)}% fail
            </p>
            <Button size="sm" variant="ghost" onClick={reset} disabled={!tweaked}>
              Reset
            </Button>
          </div>
        </div>
      )}
    </Popover>
  );
}
