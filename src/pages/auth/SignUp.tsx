import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Building2, Lock, Mail, UserRound } from 'lucide-react';
import { AuthLayout, AuthSwitch } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { InlineAlert } from '@/components/ui/Feedback';
import { Field, Input } from '@/components/ui/Form';
import { useAuth } from '@/providers/AuthProvider';

/**
 * Registration.
 *
 * Password rules are checked as the shape of the field rather than as a wall of
 * red text: length, a number, and a letter. Confirmation is compared with
 * `refine` so the error lands on the second field, where the fix is.
 */
const schema = z
  .object({
    name: z.string().min(2, 'Enter your full name'),
    organisation: z.string().min(2, 'Enter the company this profile belongs to'),
    email: z
      .string()
      .min(1, 'Enter a work email')
      .email('That does not look like an email address'),
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[0-9]/, 'Include at least one number')
      .regex(/[a-zA-Z]/, 'Include at least one letter'),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    message: 'Both passwords need to match',
    path: ['confirm'],
  });

type Values = z.infer<typeof schema>;

export default function SignUp() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [failure, setFailure] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', organisation: '', email: '', password: '', confirm: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFailure(null);
    try {
      await signUp(values.name, values.email, values.password);
      navigate('/verify');
    } catch (error) {
      setFailure(
        error instanceof Error ? error.message : 'We could not create the profile just now.',
      );
    }
  });

  return (
    <AuthLayout
      eyebrow="New profile"
      title="Open a NexaBank profile"
      description="This is a demo build, so nothing is sent anywhere — you will land on the same seeded treasury as the sample profile."
      footer={<AuthSwitch to="/sign-in" label="Already registered?" action="Sign in" />}
    >
      <form onSubmit={onSubmit} noValidate>
        {failure ? <InlineAlert className="mb-5">{failure}</InlineAlert> : null}

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="name" error={errors.name?.message}>
            <Input
              id="name"
              autoComplete="name"
              placeholder="Ada Okonkwo"
              leading={<UserRound className="size-4" />}
              invalid={Boolean(errors.name)}
              {...register('name')}
            />
          </Field>

          <Field label="Company" htmlFor="organisation" error={errors.organisation?.message}>
            <Input
              id="organisation"
              autoComplete="organization"
              placeholder="Meridian Robotics"
              leading={<Building2 className="size-4" />}
              invalid={Boolean(errors.organisation)}
              {...register('organisation')}
            />
          </Field>
        </div>

        <Field label="Work email" htmlFor="email" error={errors.email?.message}>
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

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field
            label="Password"
            htmlFor="password"
            error={errors.password?.message}
            hint="8+ characters, one number"
          >
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              leading={<Lock className="size-4" />}
              invalid={Boolean(errors.password)}
              {...register('password')}
            />
          </Field>

          <Field label="Confirm password" htmlFor="confirm" error={errors.confirm?.message}>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              leading={<Lock className="size-4" />}
              invalid={Boolean(errors.confirm)}
              {...register('confirm')}
            />
          </Field>
        </div>

        <Button type="submit" variant="primary" size="lg" block loading={isSubmitting}>
          Create profile
          {!isSubmitting ? <ArrowRight className="size-4" /> : null}
        </Button>

        <p className="mt-4 text-center text-xs leading-relaxed text-base-content/45">
          By continuing you agree to the demo terms, which ask nothing of you.
        </p>
      </form>
    </AuthLayout>
  );
}
