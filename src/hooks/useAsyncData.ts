"use client";

import { useCallback, useRef, useState } from "react";

/**
 * useAsyncData — replacement for useEffect-based data fetching.
 * Returns { data, loading, error, refresh } and auto-fetches on mount via ref trick.
 * Widget calls refresh() explicitly when needed — no dependency array cascades.
 */
export function useAsyncData<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const didMount = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  // Auto-fetch on first render (replaces useEffect mount)
  if (!didMount.current) {
    didMount.current = true;
    // Fire and forget — React will re-render when state updates
    void refresh();
  }

  return { data, loading, error, refresh, setData };
}

/**
 * usePolling — calls refresh every intervalMs while component is mounted
 */
export function usePolling(refresh: () => Promise<void>, intervalMs: number, enabled = true) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const started = useRef(false);

  if (enabled && !started.current) {
    started.current = true;
    intervalRef.current = setInterval(() => void refresh(), intervalMs);
  }

  // Cleanup will happen when component unmounts via React lifecycle
  return () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };
}
