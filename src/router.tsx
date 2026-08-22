import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Shell } from '@/components/layout/Shell';
import { RequireAuth, RequireGuest, RequireOtp } from '@/routes/guards';
import { RouteError } from '@/routes/RouteError';
import SignIn from '@/pages/auth/SignIn';
import SignUp from '@/pages/auth/SignUp';
import Verify from '@/pages/auth/Verify';
import ForgotPassword from '@/pages/auth/ForgotPassword';

/**
 * Routing.
 *
 * Auth screens are bundled eagerly — they are the first paint for anyone who is
 * not signed in, and a spinner on the sign-in form would be absurd. The five
 * application pages are split: each one pulls in Recharts, and there is no
 * reason to ship the analytics bundle to someone reading their card limits.
 */

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Transactions = lazy(() => import('@/pages/Transactions'));
const Cards = lazy(() => import('@/pages/Cards'));
const Transfers = lazy(() => import('@/pages/Transfers'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const NotFound = lazy(() => import('@/pages/NotFound'));

export const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    children: [
      {
        element: <RequireGuest />,
        children: [
          { path: '/sign-in', element: <SignIn /> },
          { path: '/sign-up', element: <SignUp /> },
          { path: '/forgot-password', element: <ForgotPassword /> },
        ],
      },
      {
        element: <RequireOtp />,
        children: [{ path: '/verify', element: <Verify /> }],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <Shell />,
            children: [
              { index: true, element: <Navigate to="/dashboard" replace /> },
              { path: '/dashboard', element: <Dashboard /> },
              { path: '/transactions', element: <Transactions /> },
              { path: '/cards', element: <Cards /> },
              { path: '/transfers', element: <Transfers /> },
              { path: '/analytics', element: <Analytics /> },
              { path: '*', element: <NotFound /> },
            ],
          },
        ],
      },
    ],
  },
]);
