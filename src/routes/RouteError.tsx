import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { ErrorState } from '@/components/ui/Feedback';
import { ButtonLink } from '@/components/ui/Button';
import { Wordmark } from '@/components/brand/Wordmark';

/**
 * Last line of defence. If a route throws before its own error handling can
 * catch it, the visitor still gets the brand, an explanation and a way out
 * rather than a white screen.
 */
export function RouteError() {
  const error = useRouteError();

  const message = isRouteErrorResponse(error)
    ? `${error.status} — ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Something in this screen failed before it could render.';

  return (
    <div className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center">
          <Wordmark size="sm" />
        </div>
        <ErrorState
          className="mt-4"
          title="This screen stopped short"
          error={message}
          onRetry={() => window.location.reload()}
        />
        <ButtonLink to="/dashboard" variant="ghost" size="sm">
          Back to dashboard
        </ButtonLink>
      </div>
    </div>
  );
}
