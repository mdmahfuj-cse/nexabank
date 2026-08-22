import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Mail, MailCheck } from 'lucide-react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button, ButtonLink } from '@/components/ui/Button';
import { InlineAlert } from '@/components/ui/Feedback';
import { Field, Input } from '@/components/ui/Form';
import { api } from '@/mocks/api';

const schema = z.object({
  email: z
    .string()
    .min(1, 'Enter the email on your profile')
    .email('That does not look like an email address'),
});

type Values = z.infer<typeof schema>;

/**
 * Password reset request.
 *
 * On success the form is replaced rather than annotated — once the mail is away
 * there is nothing left to type, and leaving the field there invites people to
 * send it again.
 */
export default function ForgotPassword() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  // `watch` rather than `getValues` — the line under the button names the
  // address as it is typed, and getValues would not re-render.
  const typed = watch('email');

  const onSubmit = handleSubmit(async (values) => {
    setFailure(null);
    try {
      await api.requestPasswordReset(values.email);
      setSentTo(values.email);
    } catch (error) {
      setFailure(
        error instanceof Error ? error.message : 'We could not send the reset link just now.',
      );
    }
  });

  if (sentTo) {
    return (
      <AuthLayout
        eyebrow="Reset requested"
        title="Check your inbox"
        description={
          <>
            If <span className="font-mono text-base-content/80">{sentTo}</span> belongs to a
            NexaBank profile, a reset link is on its way. It stays valid for one hour.
          </>
        }
      >
        <div>
          <div className="flex items-start gap-3 rounded-[var(--radius-box)] border border-success/25 bg-success/[0.07] px-4 py-3.5">
            <MailCheck className="mt-0.5 size-4 shrink-0 text-success" />
            <p className="text-sm leading-relaxed text-base-content/70">
              Nothing was actually sent — this build has no mail service. Sign back in with the demo
              password <span className="font-mono">nexa1234</span>.
            </p>
          </div>

          <ButtonLink className="mt-6" to="/sign-in" variant="primary" size="lg" block>
            Back to sign-in
          </ButtonLink>

          <button
            type="button"
            onClick={() => setSentTo(null)}
            className="mt-4 w-full text-center text-sm text-base-content/55 transition-colors hover:text-base-content"
          >
            Use a different email
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Account recovery"
      title="Reset your password"
      description="Tell us the email on the profile and we will send a single-use link to set a new password."
      footer={
        <ButtonLink to="/sign-in" variant="ghost" size="sm" icon={<ArrowLeft className="size-3.5" />}>
          Back to sign-in
        </ButtonLink>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        {failure ? <InlineAlert className="mb-5">{failure}</InlineAlert> : null}

        <Field
          label="Work email"
          htmlFor="email"
          error={errors.email?.message}
          hint="The address you sign in with"
        >
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            leading={<Mail className="size-4" />}
            invalid={Boolean(errors.email)}
            {...register('email')}
          />
        </Field>

        <Button type="submit" variant="primary" size="lg" block loading={isSubmitting}>
          Send reset link
        </Button>

        <p className="mt-4 text-center text-xs leading-relaxed text-base-content/45">
          We will send the link to {typed || 'the address above'} and nowhere else.
        </p>
      </form>
    </AuthLayout>
  );
}
