import React, { useCallback, useEffect, useState } from "react";
import { initialsOf, useCountUp } from "../utils";   // was ../../utils
import { EmptyState } from "./Primitives";            // was ../common/Primitives

function ClientChip({ client, index }) {
  const running = useCountUp(client.running_count ?? 0, 500);
  const isRunning = (client.running_count ?? 0) > 0;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
      background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12,
      padding: "10px 14px", minWidth: 160, animation: `hb-rise .4s ease ${index * 0.04}s both`,
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700, fontFamily: "var(--font-display)", flexShrink: 0,
        background: isRunning ? "var(--accent-dim)" : "var(--surface-3)",
        color: isRunning ? "var(--accent)" : "var(--text-dim)",
      }}>
        {initialsOf(client.client_name)}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {client.client_name}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 15.5, fontWeight: 700, color: isRunning ? "var(--accent)" : "var(--text-dim)" }}>
            {running}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-dim)" }}>running · {client.total_bots} bots</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Fix: previously this always fetched and rendered EVERY client's card
 * regardless of the dashboard's client filter. It now filters the
 * client-activity list down to the selected `clientId` — client-side is
 * enough here since the endpoint returns the whole small list in one call.
 */
export function BotRunsPerClient({ api, isAdmin, clientId }) {
  const [clients, setClients] = useState([]);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api("/dashboard/client-activity");
      setClients(res || []);
    } catch (_) {
      setError(true);
    }
  }, [api]);

  useEffect(() => {
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [load]);

  if (!isAdmin || error) return null;

  const visible = clientId ? clients.filter((c) => c.client_id === clientId) : clients;

  return (
    <div style={{ marginBottom: 20 }}>
      <div className="hb-eyebrow" style={{ marginBottom: 10 }}>
        Bots running per client{clientId ? " — filtered to selected client" : ""}
      </div>
      {visible.length === 0 ? (
        <EmptyState message="No bot activity for this selection." />
      ) : (
        <div className="hb-scroll" style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
          {visible.map((c, i) => <ClientChip key={c.client_id} client={c} index={i} />)}
        </div>
      )}
    </div>
  );
}