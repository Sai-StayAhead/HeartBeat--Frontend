import React, { useEffect, useState } from "react";
import { Users, Building2 } from "lucide-react";
import { initialsOf } from "../utils";        // was ../../utils
import { StatusBadge } from "./Primitives";   // was ../common/Primitives

/**
 * Fix for the "Client Summary doesn't update on filter change" bug.
 *
 * Root cause: the old DashboardView never read a `clientId` at all — only
 * `department` was wired into the dashboard query string, so switching the
 * (separately-rendered) client selector had no effect on any dashboard
 * fetch. This component, and every other dashboard widget, now takes the
 * SAME `clientId` prop and includes it via buildDashboardQuery, so summary,
 * recent runs, charts, and this panel all move together.
 *
 * - Admin + no client selected → fleet-wide banner ("All clients").
 * - Admin + client selected → that client's identity + live summary numbers.
 * - Client-role session → always their own client, no selector shown.
 */
export function ClientSummary({ api, isAdmin, clientId, summary }) {
  const [client, setClient] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!clientId) { setClient(null); return; }
    (async () => {
      try {
        const res = await api("/clients/");
        const list = res?.data || [];
        setClient(list.find((c) => c.client_id === clientId) || null);
      } catch (_) {
        setError(true);
      }
    })();
  }, [api, clientId]);

  if (isAdmin && !clientId) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 10, background: "var(--surface-2)",
        border: "1px solid var(--border)", borderRadius: 12, padding: "12px 16px", marginBottom: 18,
        color: "var(--text-muted)", fontSize: 13,
      }}>
        <Users size={15} color="var(--text-dim)" />
        Showing fleet-wide data across all clients. Select a client above to narrow every widget to just their data.
      </div>
    );
  }

  if (!client && !error) return null; // loading — parent cards already show skeletons

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
      background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
      padding: "16px 20px", marginBottom: 18, animation: "hb-rise .3s ease both",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
          background: "var(--accent-dim)", color: "var(--accent)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700,
        }}>
          {initialsOf(client?.client_name)}
        </div>
        <div>
          <div className="hb-eyebrow">Client summary</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 16.5, fontWeight: 600 }}>
            {client?.client_name || "—"}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
        {client?.status && <StatusBadge status={client.status === "Active" ? "Success" : "Failed"}>{client.status}</StatusBadge>}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-muted)" }}>
          <Building2 size={13} color="var(--text-dim)" />
          {summary?.total_bots ?? "—"} bots
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
          {summary?.total_runs ?? "—"} runs (lifetime)
        </div>
      </div>
    </div>
  );
}