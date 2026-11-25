import { useCallback, useRef } from "react";

export function decodeJwtExpiryMs(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.exp ? payload.exp * 1000 : null;
  } catch (_) {
    return null;
  }
}

/**
 * Wraps fetch with the bearer token, and transparently handles token
 * expiry: on a 401 it refreshes the access token once and retries the
 * original request before giving up. Concurrent 401s share a single
 * in-flight refresh call.
 *
 * Behavior is unchanged from the original implementation — only moved
 * out of App.jsx so it can be imported by every dashboard component
 * instead of being re-derived per view.
 */
export function useApi(baseUrl, session, onTokensRefreshed, onUnauthorized, onRateLimited) {
  const refreshingRef = useRef(null);
  const refreshTokenRef = useRef(session.refreshToken);
  refreshTokenRef.current = session.refreshToken;

  const doRefresh = useCallback(async () => {
    if (refreshingRef.current) return refreshingRef.current;
    const currentRefreshToken = refreshTokenRef.current;
    if (!currentRefreshToken) throw new Error("no refresh token");
    refreshingRef.current = (async () => {
      const res = await fetch(`${baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: currentRefreshToken }),
      });
      if (!res.ok) throw new Error("refresh failed");
      const data = await res.json();
      refreshTokenRef.current = data.refresh_token;
      onTokensRefreshed(data.access_token, data.refresh_token);
      return data.access_token;
    })();
    try {
      return await refreshingRef.current;
    } finally {
      refreshingRef.current = null;
    }
  }, [baseUrl, onTokensRefreshed]);

  const request = useCallback(
    async (path, options = {}, token, isRetry = false) => {
      const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${baseUrl}${path}`, { ...options, headers });
      let body = null;
      try { body = await res.json(); } catch (_) { /* no body */ }

      // Handle rate limiting (429)
      if (res.status === 429) {
        const retryAfter = res.headers.get("Retry-After");
        const message = body?.message || `Too many requests. Please wait ${retryAfter ? retryAfter + " seconds" : "a moment"} before trying again.`;
        const err = new Error(message);
        err.status = 429;
        err.retryAfter = retryAfter ? parseInt(retryAfter, 10) : undefined;
        onRateLimited?.(err);
        throw err;
      }

      if (res.status === 401 && !isRetry && session.refreshToken) {
        try {
          const newToken = await doRefresh();
          return request(path, options, newToken, true);
        } catch (_) {
          onUnauthorized?.();
        }
      } else if (res.status === 401) {
        onUnauthorized?.();
      }

      if (!res.ok) {
        let message = `Request failed (${res.status})`;
        if (body?.message) message = body.message;
        else if (body?.detail) {
          message = Array.isArray(body.detail) ? body.detail.map((d) => d.msg).join(", ") : String(body.detail);
        }
        const err = new Error(message);
        err.status = res.status;
        throw err;
      }
      return body;
    },
    [baseUrl, session.refreshToken, doRefresh, onUnauthorized, onRateLimited]
  );

  return useCallback((path, options = {}) => request(path, options, session.token), [request, session.token]);
}

/**
 * Builds the query string every dashboard endpoint is filtered by.
 *
 * `clientId` is the one addition required to fix client-scoped data: the
 * backend already accepts `client_id` on /dashboard/failures (used by the
 * existing FailuresView ClientFilter) — this applies the same param
 * consistently across summary, recent-runs, run-trend, hours-saved-trend,
 * status-summary, bot-summary and client-activity so every widget on the
 * dashboard agrees on which client is selected. Omit clientId entirely for
 * client-role sessions; the backend already scopes those by JWT.
 */
export function buildDashboardQuery({ department, clientId, period } = {}) {
  const params = new URLSearchParams();
  if (department) params.set("department", department);
  if (clientId) params.set("client_id", clientId);
  if (period && period !== "all") params.set("period", period);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Health check utilities for backend connectivity
 */
export async function checkBackendHealth(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/health`, { method: "GET" });
    if (!res.ok) return { healthy: false, status: res.status };
    const data = await res.json();
    return { healthy: data.status === "healthy", ...data };
  } catch (err) {
    return { healthy: false, error: err.message };
  }
}

export async function checkBackendReady(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/ready`, { method: "GET" });
    const data = await res.json();
    return { ready: res.ok && data.status === "ready", ...data };
  } catch (err) {
    return { ready: false, error: err.message };
  }
}

/**
 * Hook for periodic backend health checks
 */
import { useState, useEffect } from "react";

export function useBackendHealth(baseUrl, intervalMs = 60000) {
  const [health, setHealth] = useState({ healthy: true, checking: false });
  const [readiness, setReadiness] = useState({ ready: true, checking: false });

  useEffect(() => {
    if (!baseUrl) return;

    let mounted = true;
    let healthTimer, readyTimer;

    const checkHealth = async () => {
      if (!mounted) return;
      setHealth(h => ({ ...h, checking: true }));
      const result = await checkBackendHealth(baseUrl);
      if (mounted) setHealth({ ...result, checking: false });
    };

    const checkReadiness = async () => {
      if (!mounted) return;
      setReadiness(r => ({ ...r, checking: true }));
      const result = await checkBackendReady(baseUrl);
      if (mounted) setReadiness({ ...result, checking: false });
    };

    // Initial checks
    checkHealth();
    checkReadiness();

    // Periodic checks
    healthTimer = setInterval(checkHealth, intervalMs);
    readyTimer = setInterval(checkReadiness, intervalMs * 2); // Less frequent

    return () => {
      mounted = false;
      clearInterval(healthTimer);
      clearInterval(readyTimer);
    };
  }, [baseUrl, intervalMs]);

  return { health, readiness };
}