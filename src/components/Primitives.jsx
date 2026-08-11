import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Status-aware badge. `tone` controls color; this is the ONLY place
 * success-green / danger-red are chosen, so the rest of the app never
 * hardcodes those colors — keeping the palette rule (green = success,
 * red = failed, orange = everything else / brand) in one spot.
 */
export function StatusBadge({ status, children }) {
  const toneFromStatus = {
    Success: "success",
    Failed: "danger",
    Started: "accent",
  };
  const tone = toneFromStatus[status] || "muted";
  const map = {
    success: ["var(--success)", "var(--success-dim)"],
    danger: ["var(--danger)", "var(--danger-dim)"],
    accent: ["var(--accent)", "var(--accent-dim)"],
    muted: ["var(--text-muted)", "var(--surface-3)"],
  };
  const [fg, bg] = map[tone];
  const label = children ?? status;
  const pulsing = status === "Started";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
      color: fg, background: bg, fontFamily: "var(--font-mono)", whiteSpace: "nowrap",
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%", background: fg,
        animation: pulsing ? "hb-pulse-dot 1.3s ease-in-out infinite" : "none",
      }} />
      {label}
    </span>
  );
}

export function Button({ children, variant = "primary", onClick, type = "button", disabled, style }) {
  const variants = {
    primary: { background: "var(--accent)", color: "#1A0D05", border: "none" },
    ghost: { background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)" },
    danger: { background: "var(--danger-dim)", color: "var(--danger)", border: "1px solid transparent" },
  };
  return (
    <button
      type={type} onClick={onClick} disabled={disabled}
      style={{
        ...variants[variant], padding: "8px 14px", borderRadius: 8,
        fontSize: 13.5, fontWeight: 600, display: "inline-flex",
        alignItems: "center", gap: 6, opacity: disabled ? .5 : 1,
        transition: "opacity .15s, transform .12s", ...style,
      }}
      onMouseDown={(e) => { e.currentTarget.style.transform = "scale(.97)"; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      {children}
    </button>
  );
}

/** Skeleton block for loading states — used inside cards/rows instead of a spinner. */
export function Skeleton({ width = "100%", height = 14, style }) {
  return (
    <div style={{
      width, height, borderRadius: 6,
      background: "linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 37%, var(--surface-2) 63%)",
      backgroundSize: "400px 100%",
      animation: "hb-skeleton 1.4s ease-in-out infinite",
      ...style,
    }} />
  );
}

export function SkeletonCard({ height = 96 }) {
  return (
    <div style={{
      flex: "1 1 200px", minWidth: 180, background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 16, padding: "18px 20px", height,
    }}>
      <Skeleton width="50%" height={11} style={{ marginBottom: 14 }} />
      <Skeleton width="40%" height={26} />
    </div>
  );
}

export function EmptyState({ message = "No data found.", hint }) {
  return (
    <div style={{ padding: "34px 20px", textAlign: "center" }}>
      <div style={{ color: "var(--text-muted)", fontSize: 13.5, fontWeight: 500 }}>{message}</div>
      {hint && <div style={{ color: "var(--text-dim)", fontSize: 12, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

export function ErrorState({ message = "Unable to load dashboard data.", onRetry }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
      padding: "30px 20px", textAlign: "center",
    }}>
      <AlertTriangle size={18} color="var(--danger)" />
      <div style={{ color: "var(--danger)", fontSize: 13.5, fontWeight: 500 }}>{message}</div>
      {onRetry && (
        <Button variant="ghost" onClick={onRetry} style={{ marginTop: 2 }}>
          <RefreshCw size={13} /> Retry
        </Button>
      )}
    </div>
  );
}

export function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, background: "var(--danger-dim)",
      color: "var(--danger)", padding: "10px 14px", borderRadius: 8, fontSize: 13.5,
      marginBottom: 16, animation: "hb-rise .2s ease both",
    }}>
      <AlertTriangle size={15} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} style={{ background: "none", border: "none", color: "var(--danger)" }}>✕</button>
      )}
    </div>
  );
}