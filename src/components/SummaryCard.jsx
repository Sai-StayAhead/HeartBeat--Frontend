import React from "react";
import { useCountUp } from "../utils";

const TONE_COLOR = {
  accent: "var(--accent)", success: "var(--success)", danger: "var(--danger)",
};
const TONE_DIM = {
  accent: "var(--accent-dim)", success: "var(--success-dim)", danger: "var(--danger-dim)",
};

/**
 * One dashboard KPI card. `value` may be a number (animates with count-up)
 * or a placeholder string like "—" while loading.
 * `delta` is optional supporting text under the number, e.g. "+18% vs yesterday".
 */
export function SummaryCard({ icon: Icon, label, value, tone = "accent", delta, deltaTone, pulse = false, index = 0 }) {
  const color = TONE_COLOR[tone] || "var(--accent)";
  const dim = TONE_DIM[tone] || "var(--accent-dim)";
  const animated = useCountUp(typeof value === "number" ? value : NaN);
  const shown = typeof value === "number" ? animated : value;
  const deltaColor = deltaTone === "danger" ? "var(--danger)" : deltaTone === "success" ? "var(--success)" : "var(--text-muted)";

  return (
    <div
      className="hb-card"
      style={{
        flex: "1 1 200px", minWidth: 190, background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 16, padding: "20px 22px", position: "relative", overflow: "hidden",
        animation: `hb-rise .45s ease ${index * 0.05}s both`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
          background: dim, color, flexShrink: 0,
          animation: pulse ? "hb-pulse-dot 1.3s ease-in-out infinite" : "none",
        }}>
          <Icon size={17} />
        </div>
        <div className="hb-eyebrow">{label}</div>
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 32, fontWeight: 700, color, lineHeight: 1 }}>
        {shown}
      </div>
      {delta && (
        <div style={{ fontSize: 12, color: deltaColor, marginTop: 8, fontWeight: 500 }}>{delta}</div>
      )}
    </div>
  );
}

/**
 * Derives "today's runs" (and yesterday, for the comparison) from the
 * existing /dashboard/run-trend series instead of requiring a new backend
 * endpoint — run-trend already groups by day, so today's entry IS today's
 * run count. `summary.total_runs` (the old dashboard's "Total Runs") is
 * kept separately and relabeled as lifetime.
 */
export function deriveTodayRuns(runTrend, todayKey, yesterdayKey) {
  if (!Array.isArray(runTrend)) return { today: null, delta: null, deltaTone: "muted" };
  const todayRow = runTrend.find((d) => d.run_date === todayKey);
  const yesterdayRow = runTrend.find((d) => d.run_date === yesterdayKey);
  const today = todayRow ? todayRow.total_runs : 0;
  if (!yesterdayRow || !yesterdayRow.total_runs) {
    return { today, delta: null, deltaTone: "muted" };
  }
  const pct = Math.round(((today - yesterdayRow.total_runs) / yesterdayRow.total_runs) * 100);
  const sign = pct >= 0 ? "+" : "";
  return {
    today,
    delta: `${sign}${pct}% vs yesterday`,
    deltaTone: pct >= 0 ? "success" : "danger",
  };
}