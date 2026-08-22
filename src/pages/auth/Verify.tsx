import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { InlineAlert } from '@/components/ui/Feedback';
import { OtpInput } from '@/components/ui/OtpInput';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/providers/ToastProvider';
import { maskEmail } from '@/lib/masking';

const RESEND_SECONDS = 30;

/**
 * Second factor.
 *
 * The code submits itself the moment six digits are in — waiting for a button
 * press after the last digit is a step nobody wants. A failed attempt clears the
 * field and returns focus, so the next try starts clean.
 */
export default function Verify() {
  const { pendingEmail, verifyOtp, cancelOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  // Sign-in forwards the page a guard interrupted; land there instead of the dashboard.
  const destination = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((value) => value - 1), 1_000);
    return () => window.clearInterval(timer);
  }, [seconds]);

  const submit = useCallback(
    async (value: string) => {
      if (busy) return;
      setBusy(true);
      setFailure(null);
      try {
        await verifyOtp(value);
        navigate(destination, { replace: true });
      } catch (error) {
        setCode('');
        setFailure(
          error instanceof Error ? error.message : 'That code did not verify. Try again.',
        );
      } finally {
        setBusy(false);
      }
    },
    [busy, destination, navigate, verifyOtp],
  );

  const resend = () => {
    setSeconds(RESEND_SECONDS);
    setCode('');
    setFailure(null);
    toast.info('Code re-sent', `A fresh six-digit code is on its way to ${pendingEmail ?? 'you'}.`);
  };

  const abandon = () => {
    cancelOtp();
    navigate('/sign-in', { replace: true });
  };

  return (
    <AuthLayout
      eyebrow="Two-factor verification"
      title="Enter your six-digit code"
      description={
        pendingEmail ? (
          <>
            We sent a code to{' '}
            <span className="font-mono text-base-content/80">{maskEmail(pendingEmail)}</span>. It
            expires in ten minutes.
          </>
        ) : (
          'We sent a code to the email on your profile. It expires in ten minutes.'
        )
      }
    >
      <div>
        {failure ? <InlineAlert className="mb-5">{failure}</InlineAlert> : null}

        <OtpInput
          value={code}
          onChange={setCode}
          onComplete={submit}
          invalid={Boolean(failure)}
          disabled={busy}
        />

        <Button
          className="mt-6"
          variant="primary"
          size="lg"
          block
          loading={busy}
          disabled={code.length < 6}
          onClick={() => void submit(code)}
        >
          Verify and sign in
        </Button>

        <div className="mt-5 flex items-center justify-between gap-4 text-sm">
          <button
            type="button"
            onClick={abandon}
            className="inline-flex items-center gap-1.5 text-base-content/55 transition-colors hover:text-base-content"
          >
            <ArrowLeft className="size-3.5" />
            Use another account
          </button>

          {seconds > 0 ? (
            <p className="font-mono text-xs text-base-content/40">
              Resend in <span className="amount">{seconds}</span>s
            </p>
          ) : (
            <button
              type="button"
              onClick={resend}
              className="font-medium text-primary transition-opacity hover:opacity-75"
            >
              Resend code
            </button>
          )}
        </div>

        <div className="mt-8 flex items-start gap-2.5 rounded-[var(--radius-box)] border border-base-300 bg-base-200/50 px-3.5 py-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary/70" />
          <p className="text-xs leading-relaxed text-base-content/55">
            No code will arrive — this build has no mail service. Any six digits verify.
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
