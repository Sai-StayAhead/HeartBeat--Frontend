import React, { useMemo, useState } from "react";
import { StatusBadge, EmptyState, SkeletonCard } from "./Primitives";  // was ../common/Primitives
import { RunStatusFilter } from "./DashboardFilters";                  // unchanged
import { timeAgo } from "../utils";                                    // was ../../utils
/**
 * Recent runs list with the four-way segmented status filter. Filtering is
 * done client-side over the already-fetched `runs` — the list is small and
 * re-fetching per click would just add latency to a pure UI toggle.
 */
export function RecentRuns({ runs, loading, isAdmin }) {
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    if (statusFilter === "all") return runs;
    return runs.filter((r) => r.status === statusFilter);
  }, [runs, statusFilter]);

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
      <div style={{
        padding: "14px 18px", borderBottom: "1px solid var(--border)",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10,
      }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14.5 }}>Recent runs</div>
        <RunStatusFilter value={statusFilter} onChange={setStatusFilter} />
      </div>

      <div className="hb-scroll" style={{ maxHeight: 380, overflowY: "auto" }}>
        {loading && <div style={{ padding: 16 }}><SkeletonCard height={60} /></div>}

        {!loading && filtered.length === 0 && (
          <EmptyState
            message={statusFilter === "all" ? "No runs found." : `No ${statusFilter.toLowerCase()} runs in this window.`}
          />
        )}

        {!loading && filtered.map((r, i) => (
          <div key={r.run_id} className="hb-row-hover" style={{
            padding: "12px 18px", borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: 12,
            animation: i === 0 ? "hb-flash 1.1s ease-out" : "none",
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.bot_name}
              </div>
              {isAdmin && r.client_name && (
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.client_name}</div>
              )}
            </div>
            <StatusBadge status={r.status} />
            <div style={{ fontSize: 11.5, color: "var(--text-dim)", fontFamily: "var(--font-mono)", flexShrink: 0, width: 64, textAlign: "right" }}>
              {timeAgo(r.start_time)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}