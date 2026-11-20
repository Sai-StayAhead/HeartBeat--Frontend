import React, { useState } from "react";
import {
    LayoutDashboard, Users, Bot, LogOut, FileBarChart, UserCircle2,
    Building2, AlertOctagon, TrendingUp, KeyRound,
} from "lucide-react";

import { TOKENS } from "./theme";
import { useApi } from "./service/api";
import { useHeartbeatSocket } from "./service/websocket";
import { Button } from "./components/Primitives";
import Dashboard from "./pages/Dashboard";

/**
 * Everything OUTSIDE the dashboard (Reports, Failures, Analytics, Clients,
 * Bots, Departments, Users, Account) is unchanged from your existing
 * App.jsx — this file only shows the wiring for the parts that changed:
 * the theme import, the socket hook, and swapping the inline
 * DashboardView for the new pages/Dashboard.jsx.
 *
 * Import your existing ReportsView / FailuresView / AnalyticsView /
 * CrudView / UsersView / AccountView / clientConfig / botConfig /
 * departmentConfig exactly as they are today — nothing about their
 * props or behavior needs to change.
 */
const NAV_ADMIN = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "reports", label: "Bot Reports", icon: FileBarChart },
    { key: "failures", label: "Failures", icon: AlertOctagon },
    { key: "analytics", label: "Analytics", icon: TrendingUp },
    { key: "clients", label: "Clients", icon: Users },
    { key: "bots", label: "Bots", icon: Bot },
    { key: "departments", label: "Departments", icon: Building2 },
    { key: "users", label: "Users", icon: KeyRound },
];
const NAV_CLIENT = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "reports", label: "Bot Reports", icon: FileBarChart },
    { key: "failures", label: "Failures", icon: AlertOctagon },
    { key: "analytics", label: "Analytics", icon: TrendingUp },
    { key: "bots", label: "Bots", icon: Bot },
    { key: "account", label: "Account", icon: UserCircle2 },
];

export default function AppShell({
    session, onLogout, onSessionExpired, onTokensRefreshed,
    ReportsView, FailuresView, AnalyticsView, CrudView, UsersView, AccountView,
    clientConfig, botConfig, departmentConfig,
}) {
    const { baseUrl, role, email } = session;
    const api = useApi(baseUrl, session, onTokensRefreshed, onSessionExpired);
    const { status: wsStatus, events: liveEvents } = useHeartbeatSocket(baseUrl, session.token);

    const [view, setView] = useState("dashboard");
    const isAdmin = role === "admin";
    const NAV = isAdmin ? NAV_ADMIN : NAV_CLIENT;
    const canWrite = role === "admin";

    return (
        <div className="hb-root" style={{ display: "flex" }}>
            <style>{TOKENS}</style>

            <div style={{ width: 220, flexShrink: 0, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0 }}>
                <div style={{ padding: "20px 20px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--accent)" }}>●</span>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16 }}>
                        <span className="hb-brand-heart">Heart</span><span className="hb-brand-beat">Beat</span>
                    </span>
                </div>
                <nav style={{ flex: 1, padding: "8px 12px" }}>
                    {NAV.map((n) => {
                        const Icon = n.icon;
                        const active = view === n.key;
                        return (
                            <button key={n.key} onClick={() => setView(n.key)} style={{
                                width: "100%", display: "flex", alignItems: "center", gap: 10,
                                padding: "9px 12px", borderRadius: 8, border: "none",
                                borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
                                background: active ? "var(--accent-dim)" : "transparent",
                                color: active ? "var(--accent)" : "var(--text-muted)",
                                fontSize: 13.5, fontWeight: 500, marginBottom: 2, textAlign: "left",
                            }}>
                                <Icon size={16} /> {n.label}
                            </button>
                        );
                    })}
                </nav>
                <div style={{ padding: 16, borderTop: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</div>
                    <Button variant="ghost" onClick={onLogout} style={{ width: "100%", justifyContent: "center" }}>
                        <LogOut size={13} /> Sign out
                    </Button>
                </div>
            </div>

            <div style={{ flex: 1, minWidth: 0, padding: 28 }}>
                {view === "dashboard" && <Dashboard api={api} wsStatus={wsStatus} liveEvents={liveEvents} role={role} session={session} />}
                {view === "reports" && <ReportsView api={api} />}
                {view === "failures" && <FailuresView api={api} isAdmin={isAdmin} />}
                {view === "analytics" && <AnalyticsView api={api} isAdmin={isAdmin} />}
                {view === "clients" && isAdmin && <CrudView api={api} canWrite={canWrite} config={clientConfig} />}
                {view === "bots" && <CrudView api={api} canWrite={canWrite} config={botConfig} />}
                {view === "departments" && isAdmin && <CrudView api={api} canWrite={canWrite} config={departmentConfig} />}
                {view === "users" && isAdmin && <UsersView api={api} />}
                {view === "account" && !isAdmin && <AccountView api={api} session={session} />}
            </div>
        </div>
    );
}