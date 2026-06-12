import { useEffect, useState } from "react";

/* Module-level cache — each JSON path fetched once per session. */
const cache = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();

const BASE = import.meta.env.BASE_URL; // "/mano-tracker/" in prod, "/" in dev — both serve public/

function fetchJson(path: string): Promise<unknown> {
  if (cache.has(path)) return Promise.resolve(cache.get(path));
  const existing = inflight.get(path);
  if (existing) return existing;
  const p = fetch(`${BASE}data/${path}`)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status} pre ${path}`);
      return r.json();
    })
    .then((json) => {
      cache.set(path, json);
      inflight.delete(path);
      return json;
    })
    .catch((err) => {
      inflight.delete(path);
      throw err;
    });
  inflight.set(path, p);
  return p;
}

export interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useFetch<T>(path: string): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({
    data: (cache.get(path) as T) ?? null,
    loading: !cache.has(path),
    error: null,
  });

  useEffect(() => {
    let alive = true;
    if (cache.has(path)) {
      setState({ data: cache.get(path) as T, loading: false, error: null });
      return;
    }
    setState({ data: null, loading: true, error: null });
    fetchJson(path)
      .then((json) => {
        if (alive) setState({ data: json as T, loading: false, error: null });
      })
      .catch((err: Error) => {
        if (alive) setState({ data: null, loading: false, error: err.message });
      });
    return () => {
      alive = false;
    };
  }, [path]);

  return state;
}
