import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';

/**
 * Six-box verification code entry.
 *
 * One string of state, six views of it. Typing advances, backspace retreats,
 * arrows move, and pasting a code from an SMS fills every box at once — which is
 * how people actually enter these.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  invalid = false,
  disabled = false,
  label = 'Verification code',
}: {
  value: string;
  onChange: (next: string) => void;
  onComplete?: (code: string) => void;
  length?: number;
  invalid?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const focusAt = (index: number) => {
    const target = inputs.current[Math.max(0, Math.min(index, length - 1))];
    target?.focus();
    target?.select();
  };

  const commit = (next: string) => {
    const clean = next.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
    return clean;
  };

  const handleChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return;

    // Typing over a filled box replaces that digit; a multi-digit value means
    // the field received a paste or an autofill, so spread it forward.
    const chars = value.padEnd(length, ' ').split('');
    for (let offset = 0; offset < digits.length && index + offset < length; offset += 1) {
      chars[index + offset] = digits[offset];
    }

    const next = commit(chars.join('').replace(/ /g, ''));
    focusAt(index + digits.length);
    if (next.length === length) inputs.current[length - 1]?.blur();
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      const chars = value.split('');
      if (chars[index]) {
        chars[index] = '';
        commit(chars.join(''));
      } else if (index > 0) {
        chars[index - 1] = '';
        commit(chars.join(''));
        focusAt(index - 1);
      }
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusAt(index - 1);
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusAt(index + 1);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text');
    const next = commit(pasted);
    focusAt(next.length);
  };

  return (
    <div
      className="flex items-center gap-2 sm:gap-2.5"
      role="group"
      aria-label={label}
      aria-invalid={invalid || undefined}
    >
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(element) => {
            inputs.current[index] = element;
          }}
          value={value[index] ?? ''}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          onFocus={(event) => event.currentTarget.select()}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${index + 1} of ${length}`}
          className={cn(
            'amount h-14 w-full min-w-0 rounded-[var(--radius-field)] border bg-base-100 text-center font-mono text-2xl transition-colors disabled:opacity-55',
            invalid
              ? 'border-error/70'
              : value[index]
                ? 'border-base-content/30'
                : 'border-base-300',
            'focus:border-primary',
          )}
        />
      ))}
    </div>
  );
}
