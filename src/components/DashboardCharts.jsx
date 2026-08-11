import React from "react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend,
} from "recharts";
import { CHART_COLORS } from "../theme";      // was ../../theme
import { EmptyState } from "./Primitives";    // was ../common/Primitives

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: "var(--surface-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: 12.5 }}>
      <div style={{ color: "var(--text-muted)", marginBottom: 4, fontFamily: "var(--font-mono)" }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color: p.color, fontWeight: 600 }}>{p.name}: {p.value}</div>)}
    </div>
  );
}

function ChartCard({ title, children, height = 220, totalLabel, totalValue, totalTone = "accent" }) {
  const toneColor = { accent: "var(--accent)", success: "var(--success)", danger: "var(--danger)" }[totalTone] || "var(--text)";
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14 }}>{title}</div>
        {totalValue != null && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 17, fontWeight: 700, color: toneColor, lineHeight: 1 }}>{totalValue}</div>
            <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 2 }}>{totalLabel}</div>
          </div>
        )}
      </div>
      <div style={{ height }}>{children}</div>
    </div>
  );
}

/**
 * Purely presentational — the trend/status data is fetched once, up in
 * Dashboard.jsx (already scoped by the shared clientId/department query),
 * and reused here AND for the "Today's Runs" card derivation. This avoids
 * firing the same /dashboard/run-trend request twice per filter change.
 */
export function DashboardCharts({ runTrendRaw = [], hoursTrendRaw = [], statusSummary }) {
  const runTrend = runTrendRaw.map((d) => ({ date: d.run_date?.slice(5), runs: d.total_runs }));
  const hoursTrend = hoursTrendRaw.map((d) => ({ date: d.run_date?.slice(5), hours: d.hours_saved }));

  const statusData = statusSummary ? [
    { name: "Success", value: statusSummary.success, color: CHART_COLORS.success },
    { name: "Failed", value: statusSummary.failed, color: CHART_COLORS.danger },
    { name: "Running", value: statusSummary.started, color: CHART_COLORS.accent },
  ].filter((d) => d.value > 0) : [];

  const totalRuns = runTrend.reduce((s, d) => s + (d.runs || 0), 0);
  const totalHours = hoursTrend.reduce((s, d) => s + (d.hours || 0), 0);

  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <ChartCard title="Runs over time" totalValue={totalRuns} totalLabel="total runs" totalTone="accent">
          {runTrend.length === 0 ? <EmptyState message="No run data yet." /> : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={runTrend} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="hbRunsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.accent} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={CHART_COLORS.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART_COLORS.border} vertical={false} />
                <XAxis dataKey="date" stroke={CHART_COLORS.muted} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={CHART_COLORS.muted} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="runs" name="Runs" stroke={CHART_COLORS.accent} strokeWidth={2} fill="url(#hbRunsGrad)" isAnimationActive animationDuration={600} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Hours saved over time" totalValue={totalHours ? totalHours.toFixed(1) : 0} totalLabel="hours saved" totalTone="success">
          {hoursTrend.length === 0 ? <EmptyState message="No hours-saved data yet." /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hoursTrend} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke={CHART_COLORS.border} vertical={false} />
                <XAxis dataKey="date" stroke={CHART_COLORS.muted} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={CHART_COLORS.muted} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="hours" name="Hours saved" fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} isAnimationActive animationDuration={600} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Status breakdown">
          {statusData.length === 0 ? <EmptyState message="No runs in this window." /> : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3} stroke="none" isAnimationActive animationDuration={600}>
                  {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend verticalAlign="bottom" height={28} formatter={(v) => <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

export { ChartCard };