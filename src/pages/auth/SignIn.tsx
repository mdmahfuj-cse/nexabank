import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { AuthLayout, AuthSwitch } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { InlineAlert } from '@/components/ui/Feedback';
import { Field, Input, Toggle } from '@/components/ui/Form';
import { useAuth } from '@/providers/AuthProvider';
import { useLocalStorage } from '@/hooks/useLocalStorage';

const schema = z.object({
  email: z
    .string()
    .min(1, 'Enter the email on your NexaBank profile')
    .email('That does not look like an email address'),
  password: z.string().min(8, 'Passwords are at least 8 characters'),
});

type Values = z.infer<typeof schema>;

const DEMO = { email: 'ada@nexabank.io', password: 'nexa1234' };

export default function SignIn() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [revealed, setRevealed] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  // Where the guard turned them away from, so the code screen can finish the trip.
  const from = (location.state as { from?: string } | null)?.from;

  const [savedEmail, setSavedEmail] = useLocalStorage<string>('nexabank.last-email', '');
  const [remember, setRemember] = useState(savedEmail !== '');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: savedEmail, password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFailure(null);
    try {
      await signIn(values.email, values.password);
      setSavedEmail(remember ? values.email : '');
      navigate('/verify', { state: from ? { from } : undefined });
    } catch (error) {
      setFailure(
        error instanceof Error
          ? error.message
          : 'We could not reach the authentication service.',
      );
    }
  });

  const fillDemo = () => {
    setValue('email', DEMO.email, { shouldValidate: true });
    setValue('password', DEMO.password, { shouldValidate: true });
    setFailure(null);
  };

  return (
    <AuthLayout
      eyebrow="Secure sign-in"
      title="Sign in to NexaBank"
      description="Two steps: your password, then a one-time code. Nothing is stored on a server — this build runs entirely in your browser."
      footer={<AuthSwitch to="/sign-up" label="No profile yet?" action="Create one" />}
    >
      <form onSubmit={onSubmit} noValidate>
        {failure ? (
          <InlineAlert className="mb-5">{failure}</InlineAlert>
        ) : null}

        <Field label="Work email" htmlFor="email" error={errors.email?.message} hint="ada@nexabank.io">
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
<br />
        <Field
          label="Password"
          htmlFor="password"
          error={errors.password?.message}
          hint="Demo password is nexa1234"
        >
          <Input
            id="password"
            type={revealed ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            leading={<Lock className="size-4" />}
            invalid={Boolean(errors.password)}
            trailing={
              <button
                type="button"
                onClick={() => setRevealed((value) => !value)}
                aria-label={revealed ? 'Hide password' : 'Show password'}
                className="rounded p-1.5 text-base-content/40 transition-colors hover:text-base-content"
              >
                {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            }
            {...register('password')}
          />
        </Field>

        <div className="-mt-1 mb-5 flex items-center justify-between gap-4">
          <Toggle
            checked={remember}
            onChange={setRemember}
            label="Remember this email"
            description="Fills it in next time, on this device only"
          />
        </div>

        <Button type="submit" variant="primary" size="lg" block loading={isSubmitting}>
          Continue
          {!isSubmitting ? <ArrowRight className="size-4" /> : null}
        </Button>

        <div className="mt-4 flex items-center justify-between gap-4 text-sm">
          <Link
            to="/forgot-password"
            className="text-base-content/55 transition-colors hover:text-base-content"
          >
            Forgot your password?
          </Link>
          <button
            type="button"
            onClick={fillDemo}
            className="font-medium text-primary transition-opacity hover:opacity-75"
          >
            Use demo credentials
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
