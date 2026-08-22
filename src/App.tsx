import { RouterProvider } from 'react-router-dom';
import { router } from '@/router';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { CurrencyProvider } from '@/providers/CurrencyProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import { ToastProvider } from '@/providers/ToastProvider';
import { ConfirmProvider } from '@/providers/ConfirmProvider';

/**
 * Provider composition, outermost first.
 *
 * Theme and currency are display settings and know nothing about a session, so
 * they sit above auth. Toast and confirm sit below it because signing out
 * announces itself through both.
 */
export default function App() {
  return (
    <ThemeProvider>
      <CurrencyProvider>
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              <RouterProvider router={router} />
            </ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </CurrencyProvider>
    </ThemeProvider>
  );
}
