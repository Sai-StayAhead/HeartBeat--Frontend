import React from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

/**
 * The HeartBeat signature: a thin animated ECG trace that runs continuously
 * next to the page title, plus a status word that reflects the real socket
 * state (never decorative-only). Speed is fixed and gentle — this is meant
 * to read as "the platform is alive", not to compete with real data viz.
 */
export function EcgTrace({ tone = "accent", width = 120, height = 26 }) {
  const color = tone === "danger" ? "var(--danger)" : "var(--accent)";
  return (
    <div style={{ position: "relative", width, height, overflow: "hidden" }}>
      <svg width="200%" height={height} viewBox="0 0 900 26" style={{ animation: "hb-flow 2.2s linear infinite" }}>
        <defs>
          <linearGradient id="hbEcgGrad" x1="0" x2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0" />
            <stop offset="50%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 450].map((o) => (
          <path key={o}
            d={`M${o},13 L${o + 130},13 L${o + 148},3 L${o + 168},23 L${o + 186},13 L${o + 450},13`}
            fill="none" stroke="url(#hbEcgGrad)" strokeWidth="2.2" strokeLinecap="round" />
        ))}
      </svg>
    </div>
  );
}

/**
 * LIVE / RECONNECTING… / OFFLINE — driven by the socket `status` value from
 * useHeartbeatSocket, never faked. Used in the topbar and in the vitals strip.
 */
export function LiveStatusBadge({ status, compact = false }) {
  if (status === "live") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {!compact && <EcgTrace tone="accent" width={72} height={20} />}
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px",
          borderRadius: 20, fontSize: 11.5, fontWeight: 700, letterSpacing: 0.4,
          color: "var(--accent)", background: "var(--accent-dim)", fontFamily: "var(--font-mono)",
        }}>
          <Wifi size={11} /> LIVE
        </span>
      </div>
    );
  }
  if (status === "reconnecting" || status === "connecting") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px",
        borderRadius: 20, fontSize: 11.5, fontWeight: 700, letterSpacing: 0.4,
        color: "var(--text-muted)", background: "var(--surface-3)", fontFamily: "var(--font-mono)",
      }}>
        <RefreshCw size={11} style={{ animation: "hb-spin 1.1s linear infinite" }} /> RECONNECTING…
      </span>
    );
  }
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px",
      borderRadius: 20, fontSize: 11.5, fontWeight: 700, letterSpacing: 0.4,
      color: "var(--text-dim)", background: "var(--surface-3)", fontFamily: "var(--font-mono)",
    }}>
      <WifiOff size={11} /> OFFLINE
    </span>
  );
}

/** Page-title header used at the top of the Dashboard page. */
export function DashboardHeader({ status, subtitle }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: -0.3 }}>
            HeartBeat
          </h1>
          <span style={{ color: "var(--text-dim)", fontSize: 13 }}>Live Automation Monitoring</span>
        </div>
        {subtitle && <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>{subtitle}</div>}
      </div>
      <LiveStatusBadge status={status} />
    </div>
  );
}