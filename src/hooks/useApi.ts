import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';

export interface UseApiResult<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  /** True only for the first load, so lists can skeleton once and then dim. */
  initialLoading: boolean;
  refetch: () => void;
  /** Write straight into the cache after a mutation. */
  setData: (next: T) => void;
}

/**
 * One async read, with the four states every list in this app has to handle.
 *
 * Deliberately small: no cache, no dedupe, no suspense. It exists so components
 * never hand-roll `useEffect` + `setLoading`, and so swapping the mock API for
 * TanStack Query later is a one-file change.
 */
export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: DependencyList = [],
  options: { enabled?: boolean } = {},
): UseApiResult<T> {
  const { enabled = true } = options;

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const loadedOnce = useRef(false);
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<{
    data?: T;
    error?: Error;
    loading: boolean;
  }>({ loading: enabled });

  useEffect(() => {
    if (!enabled) {
      setState({ loading: false });
      return;
    }
    let cancelled = false;
    setState((previous) => ({ data: previous.data, loading: true }));

    fetcherRef
      .current()
      .then((data) => {
        if (cancelled) return;
        loadedOnce.current = true;
        setState({ data, loading: false });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        loadedOnce.current = true;
        setState({
          error: error instanceof Error ? error : new Error('Something went wrong.'),
          loading: false,
        });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, nonce, ...deps]);

  const refetch = useCallback(() => setNonce((value) => value + 1), []);
  const setData = useCallback((next: T) => setState({ data: next, loading: false }), []);

  return {
    data: state.data,
    error: state.error,
    loading: state.loading,
    initialLoading: state.loading && !loadedOnce.current,
    refetch,
    setData,
  };
}
