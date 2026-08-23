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

    </AuthLayout>
  );
}
