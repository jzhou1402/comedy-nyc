"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export function useSessionCache<T>(key: string, fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    const cached = sessionStorage.getItem(key);
    if (cached) {
      setData(JSON.parse(cached));
      setLoading(false);
      return;
    }
    fetcherRef.current()
      .then((result) => {
        setData(result);
        sessionStorage.setItem(key, JSON.stringify(result));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [key]);

  const update = useCallback(
    (updater: (prev: T | null) => T) => {
      setData((prev) => {
        const next = updater(prev);
        sessionStorage.setItem(key, JSON.stringify(next));
        return next;
      });
    },
    [key]
  );

  const invalidate = useCallback(() => {
    sessionStorage.removeItem(key);
    setData(null);
    setLoading(true);
    fetcherRef.current()
      .then((result) => {
        setData(result);
        sessionStorage.setItem(key, JSON.stringify(result));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [key]);

  return { data, loading, update, invalidate };
}
