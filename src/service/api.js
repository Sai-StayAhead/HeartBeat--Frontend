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
export function useApi(baseUrl, session, onTokensRefreshed, onUnauthorized) {
  const refreshingRef = useRef(null);

  const doRefresh = useCallback(async () => {
    if (refreshingRef.current) return refreshingRef.current;
    refreshingRef.current = (async () => {
      const res = await fetch(`${baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: session.refreshToken }),
      });
      if (!res.ok) throw new Error("refresh failed");
      const data = await res.json();
      onTokensRefreshed(data.access_token, data.refresh_token);
      return data.access_token;
    })();
    try {
      return await refreshingRef.current;
    } finally {
      refreshingRef.current = null;
    }
  }, [baseUrl, session.refreshToken, onTokensRefreshed]);

  const request = useCallback(
    async (path, options = {}, token, isRetry = false) => {
      const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${baseUrl}${path}`, { ...options, headers });
      let body = null;
      try { body = await res.json(); } catch (_) { /* no body */ }

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
    [baseUrl, session.refreshToken, doRefresh, onUnauthorized]
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