import React, { useCallback, useEffect, useState } from "react";
import { Activity, CheckCircle2, XCircle, Clock, TrendingUp } from "lucide-react";

import { buildDashboardQuery } from "../service/api";       // was ../services/api
import { todayKey, yesterdayKey } from "../utils";

import { DashboardHeader } from "../components/LiveStatus";
import { DashboardFilters } from "../components/DashboardFilters";
import { ClientSummary } from "../components/ClientSummary";
import { SummaryCard, deriveTodayRuns } from "../components/SummaryCard";
import { BotRunsPerClient } from "../components/BotRunsPerClient";
import { DashboardCharts } from "../components/DashboardCharts";
import { RecentRuns } from "../components/RecentRuns";
import { ErrorState, SkeletonCard } from "../components/Primitives";

/**
 * Single owner of `clientId` + `department`. Every widget below receives
 * the same two values and includes them via buildDashboardQuery, which is
 * the actual fix for "client summary / charts / recent runs don't update
 * together when a client is selected" — previously each widget decided its
 * own scoping independently (and DashboardView never read clientId at all).
 */
export default function Dashboard({ api, wsStatus, liveEvents, role, session }) {
    const isAdmin = role === "admin";

    const [clientId, setClientId] = useState(isAdmin ? null : session.clientId || null);
    const [department, setDepartment] = useState(null);

    const [summary, setSummary] = useState(null);
    const [recent, setRecent] = useState([]);
    const [runTrendRaw, setRunTrendRaw] = useState([]);
    const [hoursTrendRaw, setHoursTrendRaw] = useState([]);
    const [statusSummary, setStatusSummary] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const effectiveClientId = isAdmin ? clientId : session.clientId || null;

    const load = useCallback(async () => {
        setError("");
        try {
            const qs = buildDashboardQuery({ department, clientId: effectiveClientId });
            const [s, r, rt, ht, ss] = await Promise.all([
                api(`/dashboard/summary${qs}`),
                api(`/dashboard/recent-runs${qs}`),
                api(`/dashboard/run-trend${qs}`),
                api(`/dashboard/hours-saved-trend${qs}`),
                api(`/dashboard/status-summary${qs}`),
            ]);
            setSummary(s);
            setRecent(r || []);
            setRunTrendRaw(rt || []);
            setHoursTrendRaw(ht || []);
            setStatusSummary(ss);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [api, department, effectiveClientId]);

    useEffect(() => { setLoading(true); load(); }, [load]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { load(); }, [liveEvents.length]);

    const { today, delta, deltaTone } = deriveTodayRuns(runTrendRaw, todayKey(), yesterdayKey());

    if (error && !summary) {
        return (
            <div>
                <DashboardHeader status={wsStatus} />
                <ErrorState message="Unable to load dashboard data." onRetry={() => { setLoading(true); load(); }} />
            </div>
        );
    }

    return (
        <div>
            <DashboardHeader
                status={wsStatus}
                subtitle={isAdmin ? "Fleet overview" : `Welcome back${session?.email ? `, ${session.email.split("@")[0]}` : ""}`}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                <DashboardFilters
                    api={api} isAdmin={isAdmin}
                    clientId={clientId} onClientChange={setClientId}
                    department={department} onDepartmentChange={setDepartment}
                />
            </div>

            <ClientSummary api={api} isAdmin={isAdmin} clientId={effectiveClientId} summary={summary} />

            {isAdmin && <BotRunsPerClient api={api} isAdmin={isAdmin} clientId={effectiveClientId} />}

            <div className="hb-eyebrow" style={{ marginBottom: 10 }}>Run summary</div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
                {loading ? (
                    <>
                        <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
                    </>
                ) : (
                    <>
                        <SummaryCard icon={Activity} label="Today's runs" value={today ?? "—"} delta={delta} deltaTone={deltaTone} tone="accent" index={0} />
                        <SummaryCard icon={CheckCircle2} label="Successful runs" value={summary?.successful_runs ?? "—"} tone="success" index={1} />
                        <SummaryCard icon={XCircle} label="Failed runs" value={summary?.failed_runs ?? "—"} tone="danger" index={2} />
                        <SummaryCard icon={Clock} label="Running bots" value={summary?.running_bots ?? "—"} tone="accent" pulse={(summary?.running_bots ?? 0) > 0} index={3} />
                        <SummaryCard icon={TrendingUp} label="Hours saved" value={summary?.hours_saved_today ?? "—"} delta={`Lifetime runs: ${summary?.total_runs ?? "—"}`} tone="success" index={4} />
                    </>
                )}
            </div>

            <DashboardCharts runTrendRaw={runTrendRaw} hoursTrendRaw={hoursTrendRaw} statusSummary={statusSummary} />

            <div style={{ marginTop: 18 }}>
                <RecentRuns runs={recent} loading={loading} isAdmin={isAdmin} />
            </div>
        </div>
    );
}