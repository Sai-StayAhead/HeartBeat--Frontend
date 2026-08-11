import React, { useEffect, useState } from "react";
import { ChevronDown, Building2, Users } from "lucide-react";

function PillSelect({ icon: Icon, value, onChange, options, allLabel }) {
  return (
    <div style={{ position: "relative" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 7,
        background: "var(--surface-2)", border: "1px solid var(--border)",
        borderRadius: 10, padding: "7px 30px 7px 12px", fontSize: 13,
      }}>
        <Icon size={13} color="var(--text-dim)" />
        <select
          value={value || ""}
          onChange={(e) => onChange(e.target.value || null)}
          style={{
            appearance: "none", background: "none", border: "none", color: "var(--text)",
            fontSize: 13, fontWeight: 500, outline: "none", cursor: "pointer",
            fontFamily: "inherit", paddingRight: 4,
          }}
        >
          <option value="">{allLabel}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown size={13} color="var(--text-dim)" style={{ position: "absolute", right: 10, pointerEvents: "none" }} />
      </div>
    </div>
  );
}

/**
 * Admin-only client selector. Client-role sessions never render this —
 * they're already scoped server-side to their own client, matching the
 * existing AccountView pattern.
 */
export function ClientSelect({ api, value, onChange }) {
  const [clients, setClients] = useState([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api("/clients/");
        setClients(res?.data || []);
      } catch (_) {
        setError(true);
      }
    })();
  }, [api]);

  if (error || clients.length === 0) return null;

  return (
    <PillSelect
      icon={Users}
      value={value}
      onChange={onChange}
      allLabel="All clients"
      options={clients.map((c) => ({ value: c.client_id, label: c.client_name }))}
    />
  );
}

export function DepartmentSelect({ api, value, onChange }) {
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api("/bots/departments/list");
        setDepartments(res?.data || []);
      } catch (_) { /* non-critical */ }
    })();
  }, [api]);

  if (departments.length === 0) return null;

  return (
    <PillSelect
      icon={Building2}
      value={value}
      onChange={onChange}
      allLabel="All departments"
      options={departments.map((d) => ({ value: d, label: d }))}
    />
  );
}

/** Groups both selects; renders the client select only for admins. */
export function DashboardFilters({ api, isAdmin, clientId, onClientChange, department, onDepartmentChange }) {
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {isAdmin && <ClientSelect api={api} value={clientId} onChange={onClientChange} />}
      <DepartmentSelect api={api} value={department} onChange={onDepartmentChange} />
    </div>
  );
}

/** Segmented pill filter for Recent Runs: All / Success / Failed / Started. */
export function RunStatusFilter({ value, onChange }) {
  const options = [
    { value: "all", label: "All" },
    { value: "Success", label: "Success" },
    { value: "Failed", label: "Failed" },
    { value: "Started", label: "Started" },
  ];
  return (
    <div style={{
      display: "inline-flex", background: "var(--surface-2)", border: "1px solid var(--border)",
      borderRadius: 10, padding: 3, gap: 2,
    }}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              border: "none", borderRadius: 7, padding: "6px 12px", fontSize: 12.5, fontWeight: 600,
              background: active ? "var(--accent)" : "transparent",
              color: active ? "#1A0D05" : "var(--text-muted)",
              transition: "background .15s ease, color .15s ease",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}