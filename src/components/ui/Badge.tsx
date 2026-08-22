import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { TRANSACTION_STATUSES, type StatusTone } from '@/lib/taxonomy';
import type { TransactionStatus, TransferStatus } from '@/types/domain';

const TONES: Record<StatusTone, string> = {
  success: 'text-success border-success/30 bg-success/10',
  warning: 'text-warning border-warning/30 bg-warning/10',
  error: 'text-error border-error/30 bg-error/10',
  info: 'text-info border-info/30 bg-info/10',
  neutral: 'text-base-content/70 border-base-300 bg-base-200',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: StatusTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.6875rem] font-semibold tracking-wide uppercase',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Status of a transaction, with the same wording everywhere it appears. */
export function StatusPill({
  status,
  className,
}: {
  status: TransactionStatus;
  className?: string;
}) {
  const meta = TRANSACTION_STATUSES[status];
  return (
    <Badge tone={meta.tone} className={className}>
      <span
        aria-hidden="true"
        className={cn(
          'size-1.5 rounded-full bg-current',
          status === 'pending' && 'animate-shimmer',
        )}
      />
      {meta.label}
    </Badge>
  );
}

const TRANSFER_TONES: Record<TransferStatus, { tone: StatusTone; label: string }> = {
  completed: { tone: 'success', label: 'Completed' },
  pending: { tone: 'warning', label: 'In flight' },
  scheduled: { tone: 'info', label: 'Scheduled' },
  failed: { tone: 'error', label: 'Failed' },
};

export function TransferStatusPill({ status }: { status: TransferStatus }) {
  const meta = TRANSFER_TONES[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

/** Percentage change against a previous period. Green up, red down, always signed. */
export function Delta({
  value,
  className,
  suffix = 'vs previous period',
  invert = false,
}: {
  value: number;
  className?: string;
  suffix?: string;
  invert?: boolean;
}) {
  const flat = Math.abs(value) < 0.05;
  const good = invert ? value < 0 : value > 0;
  return (
    <p
      className={cn(
        'flex items-center gap-1.5 font-mono text-xs',
        flat ? 'text-base-content/45' : good ? 'text-success' : 'text-error',
        className,
      )}
    >
      <span aria-hidden="true">{flat ? '→' : value > 0 ? '↑' : '↓'}</span>
      <span className="amount">{Math.abs(value).toFixed(1)}%</span>
      {suffix ? <span className="text-base-content/40">{suffix}</span> : null}
    </p>
  );
}
