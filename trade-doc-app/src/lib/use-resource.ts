"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "./api";
import type { Page } from "./contracts";

export function useResource<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [revision, setRevision] = useState(0);

  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!path) {
      setData(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    api<T>(path, { signal: controller.signal })
      .then(setData)
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof ApiError ? reason : new Error("加载失败"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, revision]);

  return { data, setData, error, loading, refresh };
}

export function usePagedResource<T>(basePath: string, pageSize = 20) {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const path = `${basePath}?page=${page}&pageSize=${pageSize}&q=${encodeURIComponent(appliedQuery)}`;
  const resource = useResource<Page<T>>(path);

  const search = useCallback(() => {
    setPage(1);
    setAppliedQuery(query.trim());
  }, [query]);

  const reset = useCallback(() => {
    setPage(1);
    setQuery("");
    setAppliedQuery("");
  }, []);

  return {
    ...resource,
    page,
    setPage,
    query,
    setQuery,
    appliedQuery,
    search,
    reset,
  };
}

export function useCommand() {
  const [pending, setPending] = useState(false);
  const keyRef = useRef<string | null>(null);
  const fingerprintRef = useRef("");
  const pendingRef = useRef(false);

  const execute = useCallback(async <T,>(path: string, method: "POST" | "PUT", body: unknown) => {
    if (pendingRef.current) throw new Error("操作正在处理中，请勿重复提交。");
    const fingerprint = JSON.stringify({ path, method, body });
    if (!keyRef.current || fingerprintRef.current !== fingerprint) {
      keyRef.current = crypto.randomUUID();
      fingerprintRef.current = fingerprint;
    }
    pendingRef.current = true;
    setPending(true);
    try {
      return await api<T>(path, { method, body, idempotencyKey: keyRef.current });
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }, []);

  return { execute, pending };
}
