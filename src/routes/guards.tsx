import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Splash } from '@/components/layout/Splash';
import { useAuth } from '@/providers/AuthProvider';

/**
 * Route guards.
 *
 * All three wait on `status === 'checking'` instead of assuming signed-out. A
 * guard that redirects while the session is still being read would bounce a
 * returning visitor to the sign-in screen for a frame, which looks like the app
 * forgot them.
 */

/** Private area. Sends the half-authenticated to the code screen, not to login. */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'checking') return <Splash />;
  if (status === 'otp-required') return <Navigate to="/verify" replace />;
  if (status !== 'signed-in') {
    // Remember where they were headed so sign-in can finish the journey.
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

/** Sign-in, sign-up, recovery — pointless once you are already in. */
export function RequireGuest() {
  const { status } = useAuth();

  if (status === 'checking') return <Splash />;
  if (status === 'signed-in') return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}

/** The code screen only exists between the password and the session. */
export function RequireOtp() {
  const { status } = useAuth();

  if (status === 'checking') return <Splash />;
  if (status === 'signed-in') return <Navigate to="/dashboard" replace />;
  if (status !== 'otp-required') return <Navigate to="/sign-in" replace />;

  return <Outlet />;
}
