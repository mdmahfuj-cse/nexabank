import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api } from '@/mocks/api';
import type { User } from '@/types/domain';

/**
 * Mock authentication.
 *
 * There is no server, but the shape is the real one: credentials are checked,
 * a second factor is required, the session is persisted, and every screen that
 * needs a user waits for the session check rather than flashing a login form.
 */

export type AuthStatus = 'checking' | 'signed-out' | 'otp-required' | 'signed-in';

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  /** Set between password and OTP steps. */
  pendingEmail: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  verifyOtp: (code: string) => Promise<void>;
  cancelOtp: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const SESSION_KEY = 'nexabank.session';

function readSession(): User | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function writeSession(user: User | null) {
  try {
    if (user) window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable — the session lives for this tab only */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const pendingUser = useRef<User | null>(null);

  // Restore an existing session before anything renders behind the guard.
  useEffect(() => {
    const timer = setTimeout(() => {
      const stored = readSession();
      setUser(stored);
      setStatus(stored ? 'signed-in' : 'signed-out');
    }, 320);
    return () => clearTimeout(timer);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const account = await api.signIn(email, password);
    pendingUser.current = account;
    setPendingEmail(email);
    setStatus('otp-required');
  }, []);

  const signUp = useCallback(async (name: string, email: string, _password: string) => {
    const account = await api.signUp(name, email);
    pendingUser.current = account;
    setPendingEmail(email);
    setStatus('otp-required');
  }, []);

  const verifyOtp = useCallback(async (code: string) => {
    await api.verifyOtp(code);
    const account = pendingUser.current;
    if (!account) {
      setStatus('signed-out');
      throw new Error('That sign-in attempt expired. Start again.');
    }
    const signedIn: User = { ...account, lastSignInAt: new Date().toISOString() };
    writeSession(signedIn);
    pendingUser.current = null;
    setPendingEmail(null);
    setUser(signedIn);
    setStatus('signed-in');
  }, []);

  const cancelOtp = useCallback(() => {
    pendingUser.current = null;
    setPendingEmail(null);
    setStatus('signed-out');
  }, []);

  const signOut = useCallback(() => {
    writeSession(null);
    pendingUser.current = null;
    setPendingEmail(null);
    setUser(null);
    setStatus('signed-out');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, pendingEmail, signIn, signUp, verifyOtp, cancelOtp, signOut }),
    [user, status, pendingEmail, signIn, signUp, verifyOtp, cancelOtp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
