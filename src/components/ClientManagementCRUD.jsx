import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Bot, Building2, CalendarDays, Check, Copy, ExternalLink,
  Eye, EyeOff, FileText, Filter, Folder, HardDrive, KeyRound, Link2,
  Loader2, Monitor, Pencil, Plus, RotateCcw, Search, ShieldAlert,
  StickyNote, Trash2, Users, X, LayoutGrid, ChevronRight,
  Sparkles, Globe, Settings2, Clock, Download, Table2, CheckCheck,
} from "lucide-react";

const BASE = "/client-management";
import "../styles/ClientManagement.css";

/* ================================================================
   CONSTANTS — backend aligned contracts
   ================================================================ */

const CLIENT_MODULES = [
  { key: "overview", label: "Overview", icon: Building2 },
  { key: "projects", label: "Projects", icon: HardDrive },
  { key: "access", label: "App Access", icon: ShieldAlert },
  { key: "credentials", label: "Credentials", icon: KeyRound },
  { key: "machines", label: "Machines", icon: Monitor },
  { key: "contacts", label: "Contacts", icon: Users },
  { key: "notes", label: "Notes", icon: StickyNote },
  { key: "documents", label: "Documents", icon: FileText },
];

const PROJECT_MODULES = [
  { key: "overview", label: "Overview", icon: Building2 },
  { key: "machines", label: "Machines", icon: Monitor },
  { key: "connectivity", label: "Connectivity", icon: Link2 },
  { key: "access", label: "App Access", icon: ShieldAlert },
  { key: "automation", label: "Automation Tools", icon: Bot },
  { key: "credentials", label: "Credentials", icon: KeyRound },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "contacts", label: "Contacts", icon: Users },
  { key: "notes", label: "Notes", icon: StickyNote },
];

const LIST_ENDPOINT = {
  projects: (id) => `/clients/${id}/projects`,
  access: (id) => `/clients/${id}/access`,
  credentials: (id) => `/clients/${id}/credentials`,
  machines: (id) => `/clients/${id}/machines`,
  contacts: (id) => `/clients/${id}/contacts`,
  notes: (id) => `/clients/${id}/notes`,
  documents: (id) => `/clients/${id}/documents`,
};

const DETAIL_ENDPOINT = {
  projects: (id) => `/projects/${id}`,
  access: (id) => `/access/${id}`,
  credentials: (id) => `/credentials/${id}`,
  machines: (id) => `/machines/${id}`,
  contacts: (id) => `/contacts/${id}`,
  notes: (id) => `/notes/${id}`,
  documents: (id) => `/documents/${id}`,
};

const ID_FIELD = {
  projects: "project_id", access: "access_id", credentials: "credential_id",
  machines: "machine_id", contacts: "contact_id", notes: "note_id", documents: "document_id",
};

const MODULE_META = {
  Machine: "machine", Connectivity: "connectivity",
  "Application Access": "access", "Automation Tools": "automation",
  Credential: "credential", Document: "document", Contact: "contact", Note: "note",
};
const MODULE_ORDER = Object.keys(MODULE_META);

const MODULE_STYLE = {
  overview: { icon: Building2, tone: "#3b82f6" },
  projects: { icon: Folder, tone: "#3b82f6" },
  access: { icon: ShieldAlert, tone: "#ef4444" },
  credentials: { icon: KeyRound, tone: "#f97316" },
  machines: { icon: Monitor, tone: "#06b6d4" },
  contacts: { icon: Users, tone: "#6366f1" },
  notes: { icon: StickyNote, tone: "#64748b" },
  documents: { icon: FileText, tone: "#d97706" },
  connectivity: { icon: Link2, tone: "#22c55e" },
  automation: { icon: Bot, tone: "#a855f7" },
};

const TIMEZONE_OPTIONS = [
  ["Asia/Kolkata", "India (Asia/Kolkata)"],
  ["America/New_York", "Eastern Time (America/New_York)"],
  ["America/Chicago", "Central Time (America/Chicago)"],
  ["America/Denver", "Mountain Time (America/Denver)"],
  ["America/Los_Angeles", "Pacific Time (America/Los_Angeles)"],
  ["America/Phoenix", "Arizona (America/Phoenix)"],
  ["Europe/London", "London (Europe/London)"],
  ["Europe/Berlin", "Berlin (Europe/Berlin)"],
  ["Australia/Sydney", "Sydney (Australia/Sydney)"],
  ["Asia/Singapore", "Singapore (Asia/Singapore)"],
  ["Asia/Dubai", "Dubai (Asia/Dubai)"],
];

const FORM_CONFIG = {
  projects: {
    title: "Project",
    fields: [
      ["project_name", "Project Name", "text", true],
      ["automation_developer", "Automation Developer", "text"],
      ["status", "Status", "select", true, ["Active", "LIVE", "NOT LIVE", "Inactive"]],
      ["recent_code_backup_date", "Recent Code Backup Date", "date"],
      ["code_backup_location", "Code Backup Location", "text"],
      ["access_tested_on", "Access Tested On", "date"],
      ["tested_by", "Tested By", "text"],
      ["comments", "Comments", "textarea"],
    ],
  },
  access: {
    title: "Application Access",
    fields: [
      ["project_id", "Project", "project"],
      ["access_type", "Access Type", "text"],
      ["url", "VPN / URL", "text"],
      ["authentication_type", "Authentication Type", "text"],
      ["authentication_to", "Authentication To", "text"],
      ["username", "Username", "text"],
      ["password", "Password", "password"],
      ["status", "Status", "select", true, ["Active", "Inactive"]],
      ["comments", "Comments", "textarea"],
    ],
  },
  credentials: {
    title: "Credential",
    fields: [
      ["project_id", "Project", "project"],
      ["credential_category", "Credential Category", "text"],
      ["credential_type", "Credential Type", "text", true],
      ["name", "Name", "text"],
      ["username", "Username", "text"],
      ["secret", "Secret / Password", "password"],
      ["url", "URL", "text"],
      ["status", "Status", "select", true, ["Active", "Inactive"]],
    ],
  },
  machines: {
    title: "Machine",
    fields: [
      ["project_id", "Project", "project"],
      ["machine_name", "Machine Name", "text", true],
      ["username", "Username", "text"],
      ["password", "Password", "password"],
      ["environment", "Environment", "text"],
      ["screen_resolution", "Screen Resolution", "text"],
      ["status", "Status", "select", true, ["Active", "Inactive"]],
      ["comments", "Comments", "textarea"],
    ],
  },
  contacts: {
    title: "Contact",
    fields: [
      ["name", "Name", "text", true],
      ["role", "Role", "text"],
      ["email", "Email", "email"],
      ["phone", "Phone", "text"],
      ["is_primary", "Primary Contact", "checkbox"],
      ["status", "Status", "select", true, ["Active", "Inactive"]],
    ],
  },
  notes: {
    title: "Note",
    fields: [
      ["project_id", "Project", "project"],
      ["note", "Note", "textarea", true],
    ],
  },
  documents: {
    title: "Document",
    fields: [
      ["project_id", "Project", "project"],
      ["document_type", "Document Type", "text", true],
      ["available", "Available", "select", false, ["Y", "N", "Yes", "No"]],
      ["location", "Location", "text"],
    ],
  },
};

function statusTone(value) {
  const s = String(value || "").toLowerCase();
  if (["active", "live", "success", "ready", "completed"].includes(s)) return "success";
  if (["inactive", "failed", "error", "not live"].includes(s)) return "danger";
  if (["pending", "in progress"].includes(s)) return "warning";
  return "muted";
}

/* ================================================================
   COLUMNS FOR LEDGER
   ================================================================ */

const columnsFor = (tab, helpers) => {
  const copyCell = (value, key) => {
    if (!value) return "—";
    return (
      <span className="cmx-copy-inline">
        <span>{value}</span>
        <button
          type="button"
          className={`cmx-copy-hover${helpers.copiedKey === key ? " copied" : ""}`}
          title={helpers.copiedKey === key ? "Copied" : "Copy"}
          aria-label={helpers.copiedKey === key ? "Copied" : "Copy"}
          onClick={() => helpers.onCopy(String(value), key)}
        >
          {helpers.copiedKey === key ? <Check size={11} /> : <Copy size={11} />}
        </button>
      </span>
    );
  };

  const projectName = helpers?.projectName || (() => "—");
  const linkCell = (url) => url
    ? <a className="cmx-link" href={url} target="_blank" rel="noreferrer">{url.length > 34 ? "Open link" : url} <ExternalLink size={11} /></a>
    : "—";
  const statusCell = (v) => v ? <StatusDot value={v} /> : "—";

  switch (tab) {
    case "projects": return [
      { label: "Project", primary: true, render: r => r.project_name },
      { label: "Developer", render: r => r.automation_developer || "—" },
      { label: "Status", render: r => statusCell(r.status) },
      { label: "Backup Date", render: r => r.recent_code_backup_date || "—" },
      { label: "Backup Location", render: r => r.code_backup_location || "—" },
      { label: "Tested On", render: r => r.access_tested_on || "—" },
      { label: "Tested By", render: r => r.tested_by || "—" },
      { label: "Comments", wrap: true, render: r => r.comments || "—" },
    ];
    case "access": return [
      { label: "Access Type", primary: true, render: r => r.access_type || "—" },
      { label: "URL", render: r => linkCell(r.url) },
      { label: "Auth Type", render: r => r.authentication_type || "—" },
      { label: "Auth To", render: r => r.authentication_to || "—" },
      { label: "Username", render: r => copyCell(r.username, `access-${r.access_id}-username`) },
      { label: "Password", render: r => r.has_password === false ? <span className="cmx-mx-muted">—</span> : <AccessSecretCell accessId={r.access_id} onFetchPassword={helpers.onFetchAccessPassword} onCopy={helpers.onCopy} copyKey={`access-${r.access_id}-password`} copiedKey={helpers.copiedKey} /> },
      { label: "Status", render: r => statusCell(r.status) },
    ];
    case "credentials": return [
      { label: "Name", primary: true, render: r => r.name || r.credential_type || "—" },
      { label: "Category", render: r => r.credential_category || "—" },
      { label: "Type", render: r => r.credential_type || "—" },
      { label: "Username / Email", render: r => copyCell(r.username, `credential-${r.credential_id}-username`) },
      { label: "Password", render: r => r.has_secret === false ? <span className="cmx-mx-muted">—</span> : (r.credential_id ? <SecretCell credentialId={r.credential_id} onFetchSecret={helpers.onFetchSecret} onCopy={helpers.onCopy} copyKey={`credential-${r.credential_id}-secret`} copiedKey={helpers.copiedKey} /> : "—") },
      { label: "URL / Location", render: r => linkCell(r.url) },
    ];
    case "machines": return [
      { label: "Machine", primary: true, render: r => r.machine_name || "—" },
      { label: "Project", render: r => projectName(r.project_id) },
      { label: "Username", render: r => copyCell(r.username, `machine-${r.machine_id}-username`) },
      { label: "Password", render: r => r.has_password === false ? <span className="cmx-mx-muted">—</span> : <MachineSecretCell machineId={r.machine_id} onFetchPassword={helpers.onFetchMachinePassword} onCopy={helpers.onCopy} copyKey={`machine-${r.machine_id}-password`} copiedKey={helpers.copiedKey} /> },
      { label: "Environment", render: r => r.environment || "—" },
      { label: "Resolution", render: r => r.screen_resolution || "—" },
      { label: "Status", render: r => statusCell(r.status) },
    ];
    case "contacts": return [
      { label: "Name", primary: true, render: r => r.name || "—" },
      { label: "Role", render: r => r.role || "—" },
      { label: "Email", render: r => r.email || "—" },
      { label: "Phone", render: r => r.phone || "—" },
      { label: "Primary", render: r => r.is_primary ? <StatusDot value="Active" label="Primary" /> : "—" },
      { label: "Status", render: r => statusCell(r.status) },
    ];
    case "notes": return [
      { label: "Note", primary: true, wrap: true, render: r => r.note },
      { label: "Project", render: r => projectName(r.project_id) },
      { label: "Created", render: r => r.created_at ? new Date(r.created_at).toLocaleString() : "—" },
    ];
    case "documents": return [
      { label: "Type", primary: true, render: r => r.document_type || "—" },
      { label: "Project", render: r => projectName(r.project_id) },
      { label: "Available", render: r => r.available || "—" },
      { label: "Location", render: r => <span className="cmx-mono">{r.location || "—"}</span> },
    ];
    default: return [];
  }
};

/* ================================================================
   PRESENTATIONAL PRIMITIVES
   ================================================================ */

function StatusDot({ value, label }) {
  return <span className={`cmx-status-dot ${statusTone(value)}`}>{label || value}</span>;
}

function Loading({ label = "Loading..." }) {
  return <div className="cmx-detail-loading"><Loader2 size={17} className="cmx-spin" /> {label}</div>;
}

function Empty({ tab, icon: IconOverride, title, message, onAdd, addLabel }) {
  const Icon = IconOverride || MODULE_STYLE[tab]?.icon || FileText;
  const tone = MODULE_STYLE[tab]?.tone;
  return (
    <div className="cmx-empty">
      <div className="cmx-empty-icon" style={tone ? { "--tone": tone } : undefined}><Icon size={19} /></div>
      <strong>{title}</strong>
      <span>{message}</span>
      {onAdd && <button type="button" className="cmx-btn cmx-btn-solid cmx-btn-sm" onClick={onAdd}><Plus size={13} /> {addLabel}</button>}
    </div>
  );
}

function SecretCell({ credentialId, onFetchSecret, onCopy, copyKey, copiedKey }) {
  const [state, setState] = useState({ value: null, visible: false, loading: false, error: false });
  if (!credentialId) return <span className="cmx-mono">—</span>;

  const toggleReveal = async () => {
    if (state.visible) { setState((s) => ({ ...s, visible: false })); return; }
    if (state.value !== null) { setState((s) => ({ ...s, visible: true })); return; }
    setState((s) => ({ ...s, loading: true, error: false }));
    try {
      const secret = await onFetchSecret(credentialId);
      setState({ value: secret || "", visible: true, loading: false, error: false });
    } catch (e) { setState({ value: null, visible: false, loading: false, error: true }); }
  };
  const copySecret = async () => {
    if (state.value !== null) { onCopy(state.value, copyKey); return; }
    try {
      const secret = await onFetchSecret(credentialId);
      setState((s) => ({ ...s, value: secret || "" }));
      onCopy(secret || "", copyKey);
    } catch (e) { /* handled */ }
  };

  return (
    <span className="cmx-secret">
      <span className="cmx-secret-val">{state.loading ? <Loader2 size={12} className="cmx-spin" /> : (state.visible ? state.value : "••••••••")}</span>
      <button type="button" title={state.visible ? "Hide" : "Reveal"} onClick={toggleReveal}>{state.visible ? <EyeOff size={12} /> : <Eye size={12} />}</button>
      <button type="button" className={`cmx-copy-hover${copiedKey === copyKey ? " copied" : ""}`} title="Copy" onClick={copySecret}>{copiedKey === copyKey ? <Check size={12} /> : <Copy size={12} />}</button>
      {state.error && <AlertTriangle size={12} color="var(--danger)" />}
    </span>
  );
}

function AccessSecretCell({ accessId, onFetchPassword, onCopy, copyKey, copiedKey }) {
  const [state, setState] = useState({ value: null, visible: false, loading: false, error: false });

  if (!accessId) return <span className="cmx-mono">—</span>;

  const reveal = async () => {
    if (state.visible) {
      setState((current) => ({ ...current, visible: false }));
      return;
    }
    if (state.value !== null) {
      setState((current) => ({ ...current, visible: true }));
      return;
    }
    setState((current) => ({ ...current, loading: true, error: false }));
    try {
      const password = await onFetchPassword(accessId);
      setState({ value: password || "", visible: true, loading: false, error: false });
    } catch (_) {
      setState({ value: "", visible: true, loading: false, error: false });
    }
  };

  const copyPassword = async () => {
    try {
      const password = state.value !== null ? state.value : await onFetchPassword(accessId);
      setState((current) => ({ ...current, value: password || "" }));
      if (password) onCopy(password, copyKey);
    } catch (_) {}
  };

  return (
    <span className="cmx-secret">
      <span className="cmx-secret-val">
        {state.loading ? <Loader2 size={12} className="cmx-spin" /> : (state.visible ? (state.value || "—") : "••••••••")}
      </span>
      <button type="button" title={state.visible ? "Hide password" : "Reveal password"} onClick={reveal}>
        {state.visible ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
      <button
        type="button"
        className={`cmx-copy-hover${copiedKey === copyKey ? " copied" : ""}`}
        title={copiedKey === copyKey ? "Copied" : "Copy password"}
        onClick={copyPassword}
      >
        {copiedKey === copyKey ? <Check size={12} /> : <Copy size={12} />}
      </button>
      {state.error && <AlertTriangle size={12} color="var(--danger)" />}
    </span>
  );
}

function MachineSecretCell({ machineId, onFetchPassword, onCopy, copyKey, copiedKey }) {
  const [state, setState] = useState({ value: null, visible: false, loading: false, error: false });

  if (!machineId) return <span className="cmx-mono">—</span>;

  const reveal = async () => {
    if (state.visible) {
      setState((current) => ({ ...current, visible: false }));
      return;
    }
    if (state.value !== null) {
      setState((current) => ({ ...current, visible: true }));
      return;
    }
    setState((current) => ({ ...current, loading: true, error: false }));
    try {
      const password = await onFetchPassword(machineId);
      setState({ value: password || "", visible: true, loading: false, error: false });
    } catch (_) {
      setState({ value: "", visible: true, loading: false, error: false });
    }
  };

  const copyPassword = async () => {
    try {
      const password = state.value !== null ? state.value : await onFetchPassword(machineId);
      setState((current) => ({ ...current, value: password || "" }));
      if (password) onCopy(password, copyKey);
    } catch (_) {
      setState((current) => ({ ...current, error: true }));
    }
  };

  return (
    <span className="cmx-secret">
      <span className="cmx-secret-val">
        {state.loading ? <Loader2 size={12} className="cmx-spin" /> : (state.visible ? (state.value || "—") : "••••••••")}
      </span>
      <button type="button" title={state.visible ? "Hide password" : "Reveal password"} onClick={reveal}>
        {state.visible ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
      <button type="button" className={`cmx-copy-hover${copiedKey === copyKey ? " copied" : ""}`} title={copiedKey === copyKey ? "Copied" : "Copy password"} onClick={copyPassword}>
        {copiedKey === copyKey ? <Check size={12} /> : <Copy size={12} />}
      </button>
      {state.error && <AlertTriangle size={12} color="var(--danger)" />}
    </span>
  );
}

function PasswordFormInput({ value, required, onChange }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="cmx-pw-input-wrap">
      <input
        className="cmx-input"
        type={visible ? "text" : "password"}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="new-password"
      />
      <button type="button" className="cmx-pw-toggle" onClick={() => setVisible((v) => !v)} title={visible ? "Hide" : "Reveal"}>
        {visible ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </div>
  );
}

function Ledger({ columns, rows, rowKey, renderActions }) {
  if (!rows.length) return null;
  return (
    <div className="cmx-ledger-wrap">
      <table className="cmx-ledger">
        <thead><tr>{columns.map((c) => <th key={c.label}>{c.label}</th>)}{renderActions && <th>Actions</th>}</tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((c) => (
                <td key={c.label} className={`${c.primary ? "cmx-col-primary" : ""} ${c.wrap ? "cmx-wrap-cell" : ""}`}>
                  {c.render(row) ?? "—"}
                </td>
              ))}
              {renderActions && <td>{renderActions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ModuleRail({ modules, active, counts, onSelect }) {
  return (
    <nav className="cmx-bento-grid">
      {modules.map(({ key, label, icon: Icon }) => {
        const tone = MODULE_STYLE[key]?.tone || "var(--accent)";
        const count = counts ? counts[key] : null;
        const isActive = active === key;
        return (
          <button
            type="button"
            key={key}
            className={`cmx-bento-card${isActive ? " active" : ""}`}
            style={{ "--tone": tone }}
            onClick={() => onSelect(key)}
            aria-pressed={isActive}
          >
            <span className="cmx-bento-icon"><Icon size={16} /></span>
            <span className="cmx-bento-label">{label}</span>
            {count != null && <span className="cmx-bento-count">{count}</span>}
            <ChevronRight size={13} className="cmx-bento-chevron" />
          </button>
        );
      })}
    </nav>
  );
}

function ClientDrawer({ mode, initial, saving, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    client_name: "", email: "", contact_person: "", email_domains: "",
    timezone: "Asia/Kolkata", status: "Active", ...(initial || {}),
  }));
  const [localError, setLocalError] = useState("");
  const update = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const submit = (e) => {
    e.preventDefault();
    const name = String(form.client_name || "").trim();
    const email = String(form.email || "").trim();
    if (!name) return setLocalError("Client name is required.");
    if (!email) return setLocalError("Email is required.");
    if (!form.timezone) return setLocalError("Timezone is required.");
    setLocalError("");
    onSave({
      client_name: name,
      email,
      contact_person: String(form.contact_person || "").trim() || null,
      email_domains: String(form.email_domains || "").trim() || null,
      timezone: form.timezone,
      status: form.status || "Active",
    });
  };

  return (
    <>
      <div className="cmx-scrim" onMouseDown={onClose} />
      <div className="cmx-drawer cmx-client-drawer" role="dialog" aria-modal="true" aria-labelledby="cmx-client-drawer-title">
        <div className="cmx-drawer-head">
          <div><span>Credential Management</span><strong id="cmx-client-drawer-title">{mode === "create" ? "Add New Client" : "Edit Client"}</strong></div>
          <button type="button" className="cmx-drawer-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>

        <form onSubmit={submit} className="cmx-client-form">
          <div className="cmx-drawer-body">
            <div className="cmx-form-intro">
              <div className="cmx-form-step active"><span>1</span><div><strong>Client Information</strong><small>Core identity and contact details</small></div></div>
              <div className="cmx-form-step"><span>2</span><div><strong>Workspace Settings</strong><small>Timezone and lifecycle status</small></div></div>
            </div>

            <div className="cmx-form-section">
              <div className="cmx-form-section-title"><Building2 size={13} /> Client Information</div>
              <div className="cmx-form-grid">
                <div className="cmx-field cmx-field-full"><label>Client Name <b>*</b></label><input className="cmx-input" value={form.client_name ?? ""} autoFocus required onChange={(e) => update("client_name", e.target.value)} placeholder="Enter client name" /></div>
                <div className="cmx-field"><label>Email <b>*</b></label><input className="cmx-input" type="email" value={form.email ?? ""} required onChange={(e) => update("email", e.target.value)} placeholder="client@example.com" /></div>
                <div className="cmx-field"><label>Contact Person</label><input className="cmx-input" value={form.contact_person ?? ""} onChange={(e) => update("contact_person", e.target.value)} placeholder="Primary contact" /></div>
                <div className="cmx-field cmx-field-full"><label>Email Domains</label><input className="cmx-input" value={form.email_domains ?? ""} onChange={(e) => update("email_domains", e.target.value)} placeholder="example.com, client.com" /></div>
              </div>
            </div>

            <div className="cmx-form-section">
              <div className="cmx-form-section-title"><Settings2 size={13} /> Workspace Settings</div>
              <div className="cmx-form-grid">
                <div className="cmx-field"><label><Globe size={11} /> Timezone <b>*</b></label><select className="cmx-select" value={form.timezone ?? "Asia/Kolkata"} required onChange={(e) => update("timezone", e.target.value)}>{TIMEZONE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                <div className="cmx-field"><label>Status <b>*</b></label><select className="cmx-select" value={form.status ?? "Active"} required onChange={(e) => update("status", e.target.value)}><option value="Active">Active</option><option value="Inactive">Inactive</option></select></div>
              </div>
            </div>

            {localError && <div className="cmx-error-bar"><AlertTriangle size={14} /><span>{localError}</span></div>}
          </div>

          <div className="cmx-drawer-foot">
            <button type="button" className="cmx-btn cmx-btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="cmx-btn cmx-btn-solid" disabled={saving}>{saving ? <Loader2 size={13} className="cmx-spin" /> : <Check size={13} />} {saving ? (mode === "create" ? "Creating..." : "Updating...") : (mode === "create" ? "Create Client" : "Update Client")}</button>
          </div>
        </form>
      </div>
    </>
  );
}

function RecordDrawer({ tab, mode, initial, projects, saving, onClose, onSave }) {
  const config = FORM_CONFIG[tab];
  const [form, setForm] = useState(() => ({ status: "Active", is_primary: false, ...(initial || {}) }));
  const update = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const submit = (e) => {
    e.preventDefault();
    const payload = { ...form };
    if (tab === "credentials" && !payload.secret) delete payload.secret;
    if ((tab === "access" || tab === "machines") && mode === "edit" && !payload.password) delete payload.password;
    for (const [key] of config.fields) {
      if (payload[key] === "") payload[key] = null;
    }
    onSave(payload);
  };

  const Icon = MODULE_STYLE[tab]?.icon || FileText;

  return (
    <>
      <div className="cmx-scrim" onMouseDown={onClose} />
      <div className="cmx-drawer" role="dialog" aria-modal="true">
        <div className="cmx-drawer-head">
          <div><span><Icon size={11} /> Credential Management</span><strong>{mode === "create" ? "Add" : "Edit"} {config.title}</strong></div>
          <button type="button" className="cmx-drawer-close" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="cmx-record-form">
          <div className="cmx-drawer-body">
            {config.fields.map(([key, label, type, required, options]) => (
              <div className="cmx-field" key={key}>
                <label>{label}{required ? " *" : ""}</label>
                {type === "textarea" ? (
                  <textarea className="cmx-textarea" value={form[key] ?? ""} required={required} onChange={(e) => update(key, e.target.value)} />
                ) : type === "select" ? (
                  <select className="cmx-select" value={form[key] ?? ""} required={required} onChange={(e) => update(key, e.target.value)}>
                    <option value="">Select...</option>
                    {options.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                ) : type === "project" ? (
                  <select className="cmx-select" value={form[key] ?? ""} onChange={(e) => update(key, e.target.value ? Number(e.target.value) : null)}>
                    <option value="">No project</option>
                    {projects.map((p) => <option key={p.project_id} value={p.project_id}>{p.project_name}</option>)}
                  </select>
                ) : type === "checkbox" ? (
                  <label className="cmx-checkbox-field">
                    <input type="checkbox" checked={Boolean(form[key])} onChange={(e) => update(key, e.target.checked)} /> Primary
                  </label>
                ) : type === "date" ? (
                  <div className="cmx-date-wrap">
                    <CalendarDays size={14} />
                    <input className="cmx-input" type="date" value={form[key] ?? ""} required={required} onChange={(e) => update(key, e.target.value)} onClick={(e) => e.currentTarget.showPicker?.()} />
                  </div>
                ) : type === "password" ? (
                  <PasswordFormInput value={form[key] ?? ""} required={required} onChange={(v) => update(key, v)} />
                ) : (
                  <input className="cmx-input" type={type} value={form[key] ?? ""} required={required} onChange={(e) => update(key, e.target.value)} />
                )}
              </div>
            ))}
            {tab === "credentials" && mode === "edit" && (
              <div className="cmx-banner"><ShieldAlert size={14} /><span>Leave Secret / Password blank to keep the existing encrypted secret unchanged.</span></div>
            )}
            {tab === "access" && mode === "edit" && (
              <div className="cmx-banner"><ShieldAlert size={14} /><span>Leave Password blank to keep the existing encrypted password unchanged.</span></div>
            )}
          </div>
          <div className="cmx-drawer-foot">
            <button type="button" className="cmx-btn cmx-btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="cmx-btn cmx-btn-solid" disabled={saving}>
              {saving ? <Loader2 size={13} className="cmx-spin" /> : <Check size={13} />} {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

function ConfirmDeleteDialog({ record, tab, deleting, onClose, onConfirm }) {
  const label = FORM_CONFIG[tab]?.title || "record";
  const name = record?.name || record?.project_name || record?.machine_name || record?.document_type || record?.note || record?.access_type || "this record";
  return (
    <div className="cmx-dialog-scrim" onMouseDown={onClose}>
      <div className="cmx-dialog" onMouseDown={(e) => e.stopPropagation()}>
        <div className="cmx-dialog-head"><strong><Trash2 size={15} /> Delete {label}</strong><button type="button" onClick={onClose}><X size={16} /></button></div>
        <div className="cmx-dialog-body">Are you sure you want to permanently delete <b>{name}</b>?</div>
        <div className="cmx-banner" style={{ marginTop: 12 }}><AlertTriangle size={14} /><span>This action cannot be undone.</span></div>
        <div className="cmx-dialog-foot">
          <button type="button" className="cmx-btn cmx-btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="cmx-btn cmx-btn-danger" onClick={onConfirm} disabled={deleting}>
            {deleting ? <Loader2 size={13} className="cmx-spin" /> : <Trash2 size={13} />} {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SecretDialog({ reveal, onClose }) {
  return (
    <div className="cmx-dialog-scrim" onMouseDown={onClose}>
      <div className="cmx-dialog" onMouseDown={(e) => e.stopPropagation()}>
        <div className="cmx-dialog-head"><strong><KeyRound size={15} /> Credential Secret</strong><button type="button" onClick={onClose}><X size={16} /></button></div>
        <div className="cmx-banner"><ShieldAlert size={14} /><span>This secret was explicitly revealed. Do not share or store it outside the approved secure channel.</span></div>
        <div className="cmx-secret-kv">
          <div><span>Name</span><strong>{reveal.row.name || "—"}</strong></div>
          <div><span>Username</span><strong>{reveal.value?.username || reveal.row.username || "—"}</strong></div>
          <div><span>Secret / Password</span><code>{reveal.value?.secret || reveal.value?.password || reveal.value?.value || "—"}</code></div>
        </div>
        <div className="cmx-dialog-foot"><button type="button" className="cmx-btn cmx-btn-ghost" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}
const inputStyle = {
  width: "100%",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text)",
  outline: "none",
};
/* ================================================================
   SPREADSHEET EXCEL MATRIX MODAL (WITHOUT PROJECTS)
   ================================================================ */

/* ================================================================
   SPREADSHEET EXCEL MATRIX MODAL — Premium v2
   ================================================================ */

function MxCopyBtn({ value, copyKey, onCopy, copiedKey, className = "cmx-mx-copy" }) {
  if (!value) return null;
  const isCopied = copiedKey === copyKey;
  return (
    <button
      type="button"
      className={`${className}${isCopied ? " copied" : ""}`}
      title={isCopied ? "Copied" : "Copy"}
      aria-label={isCopied ? "Copied" : "Copy"}
      onClick={() => onCopy(String(value), copyKey)}
    >
      {isCopied ? <Check size={11} /> : <Copy size={11} />}
    </button>
  );
}

function MxCell({ value, copyKey, onCopy, copiedKey, mono, muted, sub }) {
  if (!value) return <span className="cmx-mx-muted">—</span>;
  return (
    <span className="cmx-mx-cell">
      <span className={`cmx-mx-val${mono ? " mono" : ""}${muted ? " cmx-mx-muted" : ""}`}>{value}</span>
      <MxCopyBtn value={value} copyKey={copyKey} onCopy={onCopy} copiedKey={copiedKey} />
    </span>
  );
}

function ExcelMatrixViewModal({ title, rows, onClose, onCopy, copiedKey, onFetchSecret, onFetchAccessPassword, onFetchMachinePassword, onReveal }) {
  const [search, setSearch] = useState("");
  const [selectedModule, setSelectedModule] = useState("");

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows || []).filter((r) => {
      if (r.module === "Project") return false;
      const matchMod = !selectedModule || r.module === selectedModule;
      const haystack = `${r.module || ""} ${r.category || ""} ${r.type || ""} ${r.name || ""} ${r.username || ""} ${r.url || ""} ${r.status || ""}`.toLowerCase();
      const matchSearch = !q || haystack.includes(q);
      return matchMod && matchSearch;
    });
  }, [rows, search, selectedModule]);

  const exportCSV = () => {
    const headers = ["Module", "Category", "Type", "Name", "Username / Identifier", "URL / Target", "Status"];
    const csvRows = [headers.join(",")];
    for (const r of filtered) {
      const line = [
        `"${r.module || ""}"`,
        `"${r.category || ""}"`,
        `"${r.type || ""}"`,
        `"${(r.name || "").replace(/"/g, '""')}"`,
        `"${(r.username || "").replace(/"/g, '""')}"`,
        `"${(r.url || "").replace(/"/g, '""')}"`,
        `"${r.status || ""}"`,
      ];
      csvRows.push(line.join(","));
    }
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${title.replace(/\s+/g, "_")}_Matrix.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyRowAsText = (r) => {
    const str = `Module: ${r.module} | Type: ${r.type} | Name: ${r.name || "—"} | Username: ${r.username || "—"} | Target: ${r.url || "—"} | Status: ${r.status || "—"}`;
    onCopy(str, `${r.key}-fullrow`);
  };

  const isUrl = (v) => typeof v === "string" && /^https?:\/\//i.test(v);

  return (
    <div className="cmx-matrix-scrim" onMouseDown={onClose}>
      <div
        className="cmx-matrix-modal"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* ---- Header ---- */}
        <div className="cmx-matrix-head">
          <div className="cmx-matrix-title-row">
            <div className="cmx-matrix-icon"><Table2 size={16} /></div>
            <div className="cmx-matrix-title">
              <strong>{title}</strong>
              <span>Spreadsheet Matrix View · Click cells to copy instantly</span>
            </div>
          </div>

          <div className="cmx-matrix-controls">
            <div className="cmx-matrix-search">
              <Search size={13} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter matrix records…"
              />
            </div>

            <select
              className="cmx-matrix-select"
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
            >
              <option value="">All Modules</option>
              {MODULE_ORDER.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {/* <button type="button" className="cmx-matrix-export" onClick={exportCSV} title="Download CSV">
              <Download size={13} /> Export CSV
            </button> */}

            <button type="button" className="cmx-matrix-close" onClick={onClose} aria-label="Close">
              <X size={17} />
            </button>
          </div>
        </div>

        {/* ---- Body ---- */}
        <div className="cmx-matrix-body">
          <table className="cmx-matrix-table">
            <colgroup>
              <col className="col-idx" />
              <col className="col-module" />
              <col className="col-cat" />
              <col className="col-name" />
              <col className="col-user" />
              <col className="col-pass" />
              <col className="col-url" />
              <col className="col-status" />
              <col className="col-act" />
            </colgroup>
            <thead>
              <tr>
                <th className="center">#</th>
                <th>Module</th>
                <th>Category / Type</th>
                <th>Name / Item</th>
                <th>Username / Email</th>
                <th>Password / Secret</th>
                <th>URL / Destination</th>
                <th className="center">Status</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="cmx-matrix-empty">No matrix records found.</td>
                </tr>
              ) : (
                filtered.map((r, idx) => {
                  const credId = r.credentialId || r.credential_id || null;
                  const accId = r.accessId || r.access_id || null;
                  const machId = r.machineId || r.machine_id || null;
                  const fullRowKey = `${r.key}-fullrow`;

                  return (
                    <tr key={r.key || idx}>
                      <td className="cmx-matrix-idx">{idx + 1}</td>

                      <td>
                        <span className="cmx-chip" data-m={MODULE_META[r.module] || "general"}>{r.module}</span>
                      </td>

                      <td>
                        <span className="cmx-mx-val" style={{ display: "block" }}>
                          {r.category || "General"}
                          <span className="cmx-mx-sub">{r.type || "—"}</span>
                        </span>
                      </td>

                      <td>
                        <span className="cmx-mx-cell">
                          <span className="cmx-mx-val cmx-mx-name-primary">{r.name || "—"}</span>
                          <MxCopyBtn value={r.name} copyKey={`${r.key}-name`} onCopy={onCopy} copiedKey={copiedKey} />
                        </span>
                      </td>

                      <td>
                        <MxCell value={r.username} copyKey={`${r.key}-username`} onCopy={onCopy} copiedKey={copiedKey} mono />
                      </td>

                      <td>
                        {accId ? (
                          r.row?.has_password === false ? <span className="cmx-mx-muted">—</span> : <AccessSecretCell accessId={accId} onFetchPassword={onFetchAccessPassword} onCopy={onCopy} copyKey={`${r.key}-password`} copiedKey={copiedKey} />
                        ) : machId ? (
                          r.row?.has_password === false ? <span className="cmx-mx-muted">—</span> : <MachineSecretCell machineId={machId} onFetchPassword={onFetchMachinePassword} onCopy={onCopy} copyKey={`${r.key}-password`} copiedKey={copiedKey} />
                        ) : credId ? (
                          r.row?.has_secret === false ? <span className="cmx-mx-muted">—</span> : <SecretCell credentialId={credId} onFetchSecret={onFetchSecret} onCopy={onCopy} copyKey={`${r.key}-secret`} copiedKey={copiedKey} />
                        ) : (
                          <span className="cmx-mx-muted">—</span>
                        )}
                      </td>

                      <td>
                        {isUrl(r.url) ? (
                          <a className="cmx-mx-link" href={r.url} target="_blank" rel="noreferrer">
                            <span>{r.url.length > 34 ? `${r.url.slice(0, 34)}…` : r.url}</span>
                            <ExternalLink size={11} />
                          </a>
                        ) : (
                          <span className={`cmx-mx-val${r.url ? "" : " cmx-mx-muted"}`}>{r.url || "—"}</span>
                        )}
                      </td>

                      <td style={{ textAlign: "center" }}>
                        {r.status ? <StatusDot value={r.status} /> : <span className="cmx-mx-muted">—</span>}
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className={`cmx-mx-row-action${copiedKey === fullRowKey ? " copied" : ""}`}
                          title="Copy full row"
                          onClick={() => copyRowAsText(r)}
                        >
                          {copiedKey === fullRowKey ? <CheckCheck size={13} /> : <Copy size={13} />}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ---- Footer ---- */}
        <div className="cmx-matrix-foot">
          <div>Showing <b>{filtered.length}</b> of <b>{rows.length}</b> entries</div>
          <div>Press <kbd>Esc</kbd> or click Close to return</div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   PROJECT CONSOLE
   ================================================================ */

function ProjectConsole({ project, projects, tabRows, tabLoading, onBack, onAdd, onEdit, onDelete, onReveal, onFetchSecret, onFetchAccessPassword, onFetchMachinePassword, onCopy, copiedKey, canWrite }) {
  const [section, setSection] = useState("overview");
  const [view, setView] = useState("sections");
  const [allSearch, setAllSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [hiddenModules, setHiddenModules] = useState(() => new Set());
  const [showExcelMatrix, setShowExcelMatrix] = useState(false);

  const projectName = useCallback(
    (id) => projects.find((p) => Number(p.project_id) === Number(id))?.project_name || (id ? `Project #${id}` : "—"),
    [projects]
  );

  const pid = project.project_id;
  const machines = (tabRows.machines || []).filter((r) => Number(r.project_id) === Number(pid));
  const access = (tabRows.access || []).filter((r) => Number(r.project_id) === Number(pid));
  const credentials = (tabRows.credentials || []).filter((r) => Number(r.project_id) === Number(pid));
  const documents = (tabRows.documents || []).filter((r) => Number(r.project_id) === Number(pid));
  const notes = (tabRows.notes || []).filter((r) => Number(r.project_id) === Number(pid));
  const contacts = tabRows.contacts || [];

  const isVpn = (r) => `${r.credential_category || ""} ${r.credential_type || ""} ${r.name || ""}`.toLowerCase().includes("vpn");
  const isAutomation = (r) => {
    const v = `${r.credential_category || ""} ${r.credential_type || ""} ${r.name || ""}`.toLowerCase();
    return v.includes("uipath") || v.includes("power automate") || v.includes("powerautomation") || v.includes("python");
  };
  const connectivity = credentials.filter(isVpn);
  const automation = credentials.filter(isAutomation);

  const standardCredentials = credentials.filter((r) => !isVpn(r) && !isAutomation(r));
  const rowsFor = { machines, connectivity, access, automation, credentials, documents, contacts, notes };
  const endpointFor = (key) => (key === "connectivity" || key === "automation" ? "credentials" : key);
  const canCrud = (key) => true;

  const counts = { overview: null, machines: machines.length, connectivity: connectivity.length, access: access.length, automation: automation.length, credentials: credentials.length, documents: documents.length, contacts: contacts.length, notes: notes.length };

  const renderRowActions = (sectionKey) => (row) => {
    const endpointTab = endpointFor(sectionKey);
    return (
      <span className="cmx-row-actions">
        {sectionKey === "credentials" && <button type="button" className="cmx-act-reveal" title="Reveal secret" onClick={() => onReveal(row)}><KeyRound size={13} /></button>}
        {canWrite && canCrud(sectionKey) && <button type="button" className="cmx-act-edit" title="Edit" onClick={() => onEdit(endpointTab, row)}><Pencil size={13} /></button>}
        {canWrite && canCrud(sectionKey) && <button type="button" className="cmx-act-delete" title="Delete" onClick={() => onDelete(endpointTab, row)}><Trash2 size={13} /></button>}
      </span>
    );
  };

  const allRows = useMemo(() => {
    const rows = [];
    machines.forEach((r) => rows.push({ key: `machine-${r.machine_id}`, module: "Machine", category: r.environment || "Virtual Machine", type: "VM / Host", name: r.machine_name, username: r.username, url: r.screen_resolution, credentialId: null, machineId: r.machine_id, status: r.status, endpointTab: "machines", row: r, canCrud: true }));
    connectivity.forEach((r) => rows.push({ key: `connectivity-${r.credential_id}`, module: "Connectivity", category: r.credential_category || "VPN", type: r.credential_type || "VPN Access", name: r.name, username: r.username, url: r.url, credentialId: r.credential_id, status: r.status, endpointTab: "credentials", row: r, canCrud: false }));
    access.forEach((r) => rows.push({ key: `access-${r.access_id}`, module: "Application Access", category: r.access_type || "Web App", type: r.authentication_type || "Portal", name: r.authentication_to || r.access_type, username: r.username, url: r.url, credentialId: null, accessId: r.access_id, status: r.status, endpointTab: "access", row: r, canCrud: true }));
    automation.forEach((r) => rows.push({ key: `automation-${r.credential_id}`, module: "Automation Tools", category: r.credential_category || "RPA Platform", type: r.credential_type, name: r.name, username: r.username, url: r.url, credentialId: r.credential_id, status: r.status, endpointTab: "credentials", row: r, canCrud: false }));
    standardCredentials.forEach((r) => rows.push({ key: `credential-${r.credential_id}`, module: "Credential", category: r.credential_category || "Service Account", type: r.credential_type, name: r.name, username: r.username, url: r.url, credentialId: r.credential_id, status: r.status, endpointTab: "credentials", row: r, canCrud: true }));
    documents.forEach((r) => rows.push({ key: `document-${r.document_id}`, module: "Document", category: r.document_type, type: "Doc / Manual", name: r.document_type, username: null, url: r.location, credentialId: null, status: r.available === "Y" || r.available === "Yes" ? "Active" : r.status, endpointTab: "documents", row: r, canCrud: true }));
    contacts.forEach((r) => rows.push({ key: `contact-${r.contact_id}`, module: "Contact", category: r.role || "Stakeholder", type: "Person", name: r.name, username: r.email, url: r.phone, credentialId: null, status: r.status, endpointTab: "contacts", row: r, canCrud: true }));
    notes.forEach((r) => rows.push({ key: `note-${r.note_id}`, module: "Note", category: "General", type: "Note", name: r.note, username: null, url: r.created_at ? `Logged ${new Date(r.created_at).toLocaleDateString()}` : null, credentialId: null, status: r.status, endpointTab: "notes", row: r, canCrud: true }));
    return rows;
  }, [pid, machines, connectivity, access, automation, credentials, standardCredentials, documents, contacts, notes]);

  const visibleAllRows = useMemo(() => {
    const q = allSearch.trim().toLowerCase();
    return allRows.filter((r) => {
      if (hiddenModules.has(r.module)) return false;
      if (!q) return true;
      const hay = `${r.module} ${r.category || ""} ${r.type || ""} ${r.name || ""} ${r.username || ""} ${r.url || ""} ${r.status || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [allRows, allSearch, hiddenModules]);

  const toggleModule = (label) => setHiddenModules((prev) => { const n = new Set(prev); n.has(label) ? n.delete(label) : n.add(label); return n; });
  const isUrl = (v) => typeof v === "string" && /^https?:\/\//i.test(v);

  const allColumns = [
    { label: "Module", render: (r) => <span className="cmx-chip" data-m={MODULE_META[r.module]}>{r.module}</span> },
    { label: "Category", render: (r) => r.category || "—" },
    { label: "Type", render: (r) => r.type || "—" },
    { label: "Name", primary: true, render: (r) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {r.name || "—"}
          {r.name && <button type="button" className="cmx-kv-copy cmx-copy-hover" onClick={() => onCopy(String(r.name), `${r.key}-name`)}>{copiedKey === `${r.key}-name` ? <Check size={11} /> : <Copy size={11} />}</button>}
        </span>
      ) },
    { label: "Username / Email", render: (r) => copyCellStatic(r.username, `${r.key}-username`, onCopy, copiedKey) },
    { label: "Password", render: (r) => r.accessId
        ? (r.row?.has_password === false ? <span className="cmx-mx-muted">—</span> : <AccessSecretCell accessId={r.accessId} onFetchPassword={onFetchAccessPassword} onCopy={onCopy} copyKey={`${r.key}-password`} copiedKey={copiedKey} />)
        : r.machineId
          ? (r.row?.has_password === false ? <span className="cmx-mx-muted">—</span> : <MachineSecretCell machineId={r.machineId} onFetchPassword={onFetchMachinePassword} onCopy={onCopy} copyKey={`${r.key}-password`} copiedKey={copiedKey} />)
          : (r.row?.has_secret === false ? <span className="cmx-mx-muted">—</span> : <SecretCell credentialId={r.credentialId} onFetchSecret={onFetchSecret} onCopy={onCopy} copyKey={`${r.key}-secret`} copiedKey={copiedKey} />) },
    { label: "URL / Location", render: (r) => isUrl(r.url) ? <a className="cmx-link" href={r.url} target="_blank" rel="noreferrer">{r.url}</a> : (r.url || "—") },
    { label: "Status", render: (r) => r.status ? <StatusDot value={r.status} /> : "—" },
  ];

  const renderAllActions = (r) => (
    <span className="cmx-row-actions">
      {r.credentialId && <button type="button" className="cmx-act-reveal" title="Open in vault" onClick={() => onReveal(r.row)}><KeyRound size={13} /></button>}
      {canWrite && r.canCrud && <button type="button" className="cmx-act-edit" title={`Edit ${FORM_CONFIG[r.endpointTab]?.title || "record"}`} onClick={() => onEdit(r.endpointTab, r.row)}><Pencil size={13} /></button>}
      {canWrite && r.canCrud && <button type="button" className="cmx-act-delete" title={`Delete ${FORM_CONFIG[r.endpointTab]?.title || "record"}`} onClick={() => onDelete(r.endpointTab, r.row)}><Trash2 size={13} /></button>}
    </span>
  );

  const overviewPane = (
    <div className="cmx-summary-grid">
      <div className="cmx-summary-card">
        <h3><Folder size={13} /> Project Information</h3>
        {[["Project Name", project.project_name], ["Automation Developer", project.automation_developer], ["Code Backup", project.recent_code_backup_date], ["Backup Location", project.code_backup_location], ["Access Tested On", project.access_tested_on], ["Tested By", project.tested_by]].map(([l, v]) => (
          <div className="cmx-kv-row" key={l}>
            <span>{l}</span>
            <span className="cmx-kv-val"><strong>{v || "—"}</strong>{v && <button type="button" className="cmx-kv-copy" onClick={() => onCopy(String(v), `proj-${l}`)}>{copiedKey === `proj-${l}` ? <Check size={11} /> : <Copy size={11} />}</button>}</span>
          </div>
        ))}
        {project.comments && <div className="cmx-banner" style={{ marginTop: 10 }}><FileText size={14} /><span>{project.comments}</span></div>}
      </div>
      <div className="cmx-summary-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}><Sparkles size={13} /> Quick Module Launcher</h3>
          {/* <button
            type="button"
            className="cmx-btn cmx-btn-solid cmx-btn-sm"
            onClick={() => setShowExcelMatrix(true)}
            style={{ background: "var(--accent)", color: "#06201C", fontWeight: 700 }}
          >
            <Table2 size={13} /> Open Excel Matrix
          </button> */}
        </div>
        <div className="cmx-shortcut-grid">
          {PROJECT_MODULES.slice(1).map(({ key, label, icon: Icon }) => (
            <button type="button" key={key} className="cmx-shortcut" onClick={() => setSection(key)}>
              <Icon size={14} /> <span>{label}</span> <strong>{rowsFor[key]?.length ?? 0}</strong>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const sectionPane = () => {
    const rows = rowsFor[section] || [];
    const endpointTab = endpointFor(section);
    const title = PROJECT_MODULES.find((m) => m.key === section)?.label || "Details";
    const columns = columnsFor(section === "connectivity" || section === "automation" ? "credentials" : section, { projectName, onFetchSecret, onFetchAccessPassword, onFetchMachinePassword, onCopy, copiedKey });
    return (
      <>
        <div className="cmx-content-head">
          <h2>{title}</h2>
          <div className="cmx-content-head-actions">
            <span className="cmx-count-chip">{rows.length}</span>
            {canWrite && canCrud(section) && FORM_CONFIG[endpointTab] && <button type="button" className="cmx-btn cmx-btn-solid cmx-btn-sm" onClick={() => onAdd(endpointTab, pid)}><Plus size={13} /> Add {FORM_CONFIG[endpointTab].title}</button>}
          </div>
        </div>
        {tabLoading ? <Loading /> : rows.length === 0 ? (
          <Empty tab={section} title={`No ${title.toLowerCase()}`} message="No records are mapped to this project yet." onAdd={canWrite && canCrud(section) && FORM_CONFIG[endpointTab] ? () => onAdd(endpointTab, pid) : null} addLabel={`Add ${FORM_CONFIG[endpointTab]?.title || "Record"}`} />
        ) : (
          <Ledger columns={columns} rows={rows} rowKey={(r) => r[ID_FIELD[endpointTab]]} renderActions={renderRowActions(section)} />
        )}
      </>
    );
  };

  return (
    <div>
      <div className="cmx-project-head">
        <div>
          <div className="cmx-project-crumb"><button type="button" onClick={onBack}>Projects</button><ChevronRight size={12} /><span>{project.project_name}</span></div>
          <div className="cmx-project-title"><h2>{project.project_name}</h2><StatusDot value={project.status} /></div>
          <div className="cmx-project-sub"><span>Project ID: {project.project_id}</span>{project.automation_developer && <><i /><span>{project.automation_developer}</span></>}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="cmx-btn cmx-btn-solid" onClick={() => setShowExcelMatrix(true)}>
            <Table2 size={13} /> Full Excel Matrix
          </button>
          {canWrite && <button type="button" className="cmx-btn cmx-btn-ghost" onClick={() => onEdit("projects", project)}><Pencil size={13} /> Edit Project</button>}
        </div>
      </div>

      <div className="cmx-project-toolbar">
        <div className="cmx-segmented">
          <button type="button" className={view !== "all" ? "active" : ""} onClick={() => setView("sections")}>Sections</button>
          {/* <button type="button" className={view === "all" ? "active" : ""} onClick={() => setView("all")}>All Details Table</button> */}
        </div>
        {view === "all" && (
          <div className="cmx-ledger-toolbar" style={{ margin: 0 }}>
            <div className="cmx-ledger-search"><Search size={13} /><input value={allSearch} onChange={(e) => setAllSearch(e.target.value)} placeholder="Search all details..." /></div>
            <div className="cmx-filter-wrap">
              <button type="button" className={`cmx-filter-btn ${filterOpen ? "active" : ""} ${hiddenModules.size ? "filtered" : ""}`} onClick={() => setFilterOpen((o) => !o)}><Filter size={14} /></button>
              {filterOpen && (
                <div className="cmx-filter-menu" onMouseLeave={() => setFilterOpen(false)}>
                  <div className="cmx-filter-menu-head"><span>Show modules</span>{hiddenModules.size > 0 && <button type="button" onClick={() => setHiddenModules(new Set())}>Reset</button>}</div>
                  {MODULE_ORDER.map((m) => (
                    <label className="cmx-filter-opt" key={m}><input type="checkbox" checked={!hiddenModules.has(m)} onChange={() => toggleModule(m)} />{m}</label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {view === "all" ? (
        <div style={{ padding: 16 }}>
          {visibleAllRows.length === 0 ? (
            <Empty title="No matches" message={allRows.length ? "No records match your search or filter." : "No project details available yet."} />
          ) : (
            <Ledger columns={allColumns} rows={visibleAllRows} rowKey={(r) => r.key} renderActions={renderAllActions} />
          )}
          <div className="cmx-footnote">Showing {visibleAllRows.length} of {allRows.length} entries</div>
        </div>
      ) : (
        <div className="cmx-module-shell">
          <ModuleRail modules={PROJECT_MODULES} active={section} counts={counts} onSelect={setSection} />
          <div
            className="cmx-content cmx-hub-panel"
            key={section}
            style={{ "--tone": MODULE_STYLE[section]?.tone || "var(--accent)" }}
          >
            {section === "overview" ? overviewPane : sectionPane()}
          </div>
        </div>
      )}

      {showExcelMatrix && (
        <ExcelMatrixViewModal
          title={`${project.project_name} — Master Credentials & Matrix`}
          rows={allRows}
          onClose={() => setShowExcelMatrix(false)}
          onCopy={onCopy}
          copiedKey={copiedKey}
          onFetchSecret={onFetchSecret}
          onFetchAccessPassword={onFetchAccessPassword}
          onFetchMachinePassword={onFetchMachinePassword}
          onReveal={onReveal}
        />
      )}
    </div>
  );
}

/* ================================================================
   ROOT VIEW
   ================================================================ */

export default function ClientManagementCRUDView({ api, session }) {
  const [cmToken, setCmToken] = useState(null);
  const [accessKey, setAccessKey] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState("");
  const [showAccessKey, setShowAccessKey] = useState(false);
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [client, setClient] = useState(null);
  const [search, setSearch] = useState("");
  const [activeModule, setActiveModule] = useState("overview");
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [tabRows, setTabRows] = useState({});
  const [tabLoading, setTabLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState("");
  const [drawer, setDrawer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [reveal, setReveal] = useState(null);
  const [showGlobalExcelMatrix, setShowGlobalExcelMatrix] = useState(false);
  
  const canWrite = session?.role === "admin";

  const cmRequest = useCallback(async (path, options = {}) => {
    if (!cmToken) throw new Error("Credential Management is locked.");
    const isForm = options.body instanceof FormData;
    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${cmToken}`,
      "ngrok-skip-browser-warning": "true",
    };
    if (!isForm) headers["Content-Type"] = "application/json";
const baseUrl = session?.baseUrl || window.location.origin;

const res = await fetch(`${baseUrl}${BASE}${path}`, {
  ...options,
  headers,
});
    let body = null;
    try { body = await res.json(); } catch (_) {}
    if (res.status === 401 || res.status === 403) { setCmToken(null); throw new Error(body?.detail || "Credetnial Management access expired or invalid."); }
    if (!res.ok) { const detail = body?.detail; throw new Error(typeof detail === "string" ? detail : detail?.message || body?.message || `Request failed (${res.status})`); }
    return body;
  }, [cmToken, session?.baseUrl]);

const unlock = async (e) => {
  e.preventDefault();
  if (!accessKey.trim()) return setUnlockError("Enter the Credential Management access key.");
  setUnlocking(true); setUnlockError("");
  try {
    const result = await api(`${BASE}/unlock`, { method: "POST", body: JSON.stringify({ key: accessKey.trim() }) });
    if (!result?.access_token) throw new Error("Backend did not return a Credential Management access token.");
    setCmToken(result.access_token);
    setAccessKey("");          // ✅ clear from state/memory once unlocked
    setShowAccessKey(false);   // ✅ reset visibility toggle
  } catch (e2) {
    setUnlockError(e2.message || "Unable to unlock Credential Management.");
    setAccessKey("");          // ✅ FIX: clear on failed attempt too — don't
                                //    leave a wrong key sitting visible/in-memory
  }
  finally { setUnlocking(false); }
};

  const loadClients = useCallback(async () => {
    if (!cmToken) return;
    setPageLoading(true); setError("");
    try {
      const rows = await cmRequest("/clients?skip=0&limit=500");
      const list = Array.isArray(rows) ? rows : rows?.data || [];
      setClients(list);
      setSelectedClientId((current) => current && list.some(x => Number(x.client_id) === Number(current)) ? current : (list[0]?.client_id ?? null));
    } catch (e) { setError(e.message); }
    finally { setPageLoading(false); }
  }, [cmToken, cmRequest]);

  const loadClient = useCallback(async (id) => {
    if (!id || !cmToken) return;
    try { setClient(await cmRequest(`/clients/${id}`)); setTabRows({}); }
    catch (e) { setError(e.message); }
  }, [cmToken, cmRequest]);

  const loadTab = useCallback(async (tab, id = selectedClientId) => {
    if (!id || !cmToken || tab === "overview") return;
    setTabLoading(true); setError("");
    try {
      const rows = await cmRequest(LIST_ENDPOINT[tab](id));
      setTabRows(prev => ({ ...prev, [tab]: Array.isArray(rows) ? rows : rows?.data || [] }));
    } catch (e) { setError(e.message); }
    finally { setTabLoading(false); }
  }, [cmToken, cmRequest, selectedClientId]);

  useEffect(() => { if (cmToken) loadClients(); }, [cmToken, loadClients]);
  useEffect(() => { if (selectedClientId) { setSelectedProjectId(null); loadClient(selectedClientId); } }, [selectedClientId, loadClient]);
  useEffect(() => { if (selectedClientId && activeModule !== "overview" && !tabRows[activeModule]) loadTab(activeModule); }, [activeModule, selectedClientId, tabRows, loadTab]);

  const projects = tabRows.projects || [];
  const projectName = useCallback((id) => projects.find((p) => Number(p.project_id) === Number(id))?.project_name || (id ? `Project #${id}` : "—"), [projects]);
  const currentRows = tabRows[activeModule] || [];

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(c =>
      `${c.client_name || ""} ${c.email || ""} ${c.contact_person || ""} ${c.email_domains || ""} ${c.timezone || ""} ${c.status || ""} client #${c.client_id || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [clients, search]);

  const [clientDrawer, setClientDrawer] = useState(null);
  const [clientSaving, setClientSaving] = useState(false);

  const PROJECT_LINKED_TABS = new Set(["access", "credentials", "machines", "notes", "documents", "automation", "accounts"]);

  const openCreate = async (tab, projectId = null) => {
    setError("");
    try {
      if (PROJECT_LINKED_TABS.has(tab) && (!tabRows.projects || tabRows.projects.length === 0)) {
        await loadTab("projects", selectedClientId);
      }
      const selectedProject = projectId ?? selectedProjectId ?? null;
      setDrawer({ tab, mode: "create", data: selectedProject ? { project_id: Number(selectedProject) } : {} });
    } catch (e) { setError(e.message || "Unable to load projects."); }
  };
  const openEdit = (tab, row) => setDrawer({ tab, mode: "edit", data: row });
  const openCreateClient = () => setClientDrawer({ mode: "create", data: { timezone: "Asia/Kolkata", status: "Active" } });
  const openEditClient = () => { if (!client) return; setClientDrawer({ mode: "edit", data: { ...client } }); };

  const saveClient = async (payload) => {
    setClientSaving(true); setError("");
    try {
      const isEdit = clientDrawer?.mode === "edit";
      const id = clientDrawer?.data?.client_id;
      const path = isEdit ? `/clients/${id}` : "/clients";
      const result = await cmRequest(path, { method: isEdit ? "PUT" : "POST", body: JSON.stringify(payload) });
      setClientDrawer(null);
      const updated = result?.data || result;
      await loadClients();
      if (updated?.client_id) { setSelectedClientId(updated.client_id); setClient(updated); }
    } catch (e) { setError(e.message || "Unable to save client."); }
    finally { setClientSaving(false); }
  };

  const saveRecord = async (payload) => {
    const tab = drawer.tab;
    setSaving(true); setError("");
    try {
      const id = drawer.data?.[ID_FIELD[tab]];
      const path = drawer.mode === "create" ? LIST_ENDPOINT[tab](selectedClientId) : DETAIL_ENDPOINT[tab](id);
      const result = await cmRequest(path, { method: drawer.mode === "create" ? "POST" : "PUT", body: JSON.stringify(payload) });
      const savedRecord = result?.data ?? result;
      setDrawer(null);
      setTabRows(prev => ({
        ...prev,
        [tab]: drawer.mode === "create" ? [...(prev[tab] || []), savedRecord] : (prev[tab] || []).map((r) => String(r[ID_FIELD[tab]]) === String(id) ? savedRecord : r),
      }));
      await loadClient(selectedClientId);
      await loadTab(tab, selectedClientId);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const deleteRecord = async () => {
    const { tab, row } = deleteTarget;
    const id = row[ID_FIELD[tab]];
    setDeleting(true); setError("");
    try {
      await cmRequest(DETAIL_ENDPOINT[tab](id), { method: "DELETE" });
      setTabRows(prev => ({ ...prev, [tab]: (prev[tab] || []).filter(r => r[ID_FIELD[tab]] !== id) }));
      setDeleteTarget(null);
      await loadClient(selectedClientId);
      await loadTab(tab, selectedClientId);
    } catch (e) { setError(e.message); }
    finally { setDeleting(false); }
  };

  const revealCredential = async (row) => {
    try { setReveal({ row, value: await cmRequest(`/credentials/${row.credential_id}/reveal`, { method: "POST" }) }); }
    catch (e) { setError(e.message); }
  };

  const fetchSecretValue = useCallback(async (credentialId) => {
    try {
      if (cmToken) {
        const value = await cmRequest(`/credentials/${credentialId}/reveal`, { method: "POST" });
        return value?.secret ?? value?.value ?? "";
      }
      const res = await api(`${BASE}/credentials/${credentialId}/reveal`, { method: "POST" });
      return res?.secret ?? res?.value ?? "";
    } catch (_) {
      return "";
    }
  }, [cmToken, cmRequest, api]);

  const fetchAccessPassword = useCallback(async (accessId) => {
    try {
      if (cmToken) {
        const res = await cmRequest(`/access/${accessId}/reveal-password`, { method: "GET" });
        return res?.password ?? res?.value ?? "";
      }
      const res2 = await api(`${BASE}/access/${accessId}/reveal-password`, { method: "GET" });
      return res2?.password ?? res2?.value ?? "";
    } catch (_) {
      return "";
    }
  }, [cmToken, cmRequest, api]);

  const fetchMachinePassword = useCallback(async (machineId) => {
    try {
      if (cmToken) {
        const res = await cmRequest(`/machines/${machineId}/reveal-password`, { method: "GET" });
        return res?.password ?? res?.value ?? "";
      }
      const res2 = await api(`${BASE}/machines/${machineId}/reveal-password`, { method: "GET" });
      return res2?.password ?? res2?.value ?? "";
    } catch (_) {
      return "";
    }
  }, [cmToken, cmRequest, api]);

  const copyValue = async (value, key) => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((current) => current === key ? null : current), 1400);
    } catch (e) { setError("Unable to copy this value. Please copy it manually."); }
  };

  const openProject = async (project) => {
    setSelectedProjectId(project.project_id);
    setActiveModule("projects");
    setError("");
    const requiredTabs = ["machines", "access", "credentials", "documents", "contacts", "notes"];
    await Promise.all(requiredTabs.filter((tab) => !tabRows[tab]).map((tab) => loadTab(tab, selectedClientId)));
  };

  const openClientMasterMatrix = async () => {
    if (!selectedClientId) return;
    setError("");
    setTabLoading(true);
    try {
      const requiredTabs = ["machines", "access", "credentials", "documents", "contacts", "notes"];
      const results = await Promise.all(
        requiredTabs.map(async (tab) => {
          try {
            const rows = await cmRequest(LIST_ENDPOINT[tab](selectedClientId));
            return [tab, Array.isArray(rows) ? rows : rows?.data || []];
          } catch (_) {
            return [tab, []];
          }
        })
      );
      setTabRows((prev) => ({
        ...prev,
        ...Object.fromEntries(results),
      }));
      setShowGlobalExcelMatrix(true);
    } catch (e) {
      setError(e.message || "Failed to load complete infrastructure matrix.");
    } finally {
      setTabLoading(false);
    }
  };

  // Excluded Project rows completely from clientWideRows as requested
  const clientWideRows = useMemo(() => {
    const rows = [];
    (tabRows.machines || []).forEach((r) => rows.push({ key: `mach-${r.machine_id}`, module: "Machine", category: r.environment || "VM", type: "Host / VM", name: r.machine_name, username: r.username, url: r.screen_resolution, machineId: r.machine_id, status: r.status }));
    (tabRows.access || []).forEach((r) => rows.push({ key: `acc-${r.access_id}`, module: "Application Access", category: r.access_type || "App", type: r.authentication_type || "Portal", name: r.authentication_to || r.access_type, username: r.username, url: r.url, accessId: r.access_id, status: r.status }));
    (tabRows.credentials || []).forEach((r) => rows.push({ key: `cred-${r.credential_id}`, module: "Credential", category: r.credential_category || "Vault", type: r.credential_type, name: r.name, username: r.username, url: r.url, credentialId: r.credential_id, status: r.status }));
    (tabRows.documents || []).forEach((r) => rows.push({ key: `doc-${r.document_id}`, module: "Document", category: r.document_type, type: "Document", name: r.document_type, username: null, url: r.location, status: r.available === "Y" ? "Active" : "Inactive" }));
    (tabRows.contacts || []).forEach((r) => rows.push({ key: `con-${r.contact_id}`, module: "Contact", category: r.role || "Stakeholder", type: "Person", name: r.name, username: r.email, url: r.phone, status: r.status }));
    (tabRows.notes || []).forEach((r) => rows.push({ key: `note-${r.note_id}`, module: "Note", category: "General", type: "Note", name: r.note, username: null, url: r.created_at ? new Date(r.created_at).toLocaleDateString() : null, status: "Active" }));
    return rows;
  }, [tabRows]);

  if (!cmToken) {
    return (
      <div className="cmx-root cmx-gate">
        <div className="cmx-gate-card">
          <div className="cmx-gate-icon"><ShieldAlert size={22} /></div>
          <span className="cmx-gate-kicker"><Sparkles size={11} /> Restricted workspace</span>
          <h1>Credential Management</h1>
          <p>Enter Super Hero Name to unlock access.</p>
          <form onSubmit={unlock} autoComplete="off">
  <label htmlFor="cmx-superhero-key">Super Hero Name</label>
  <div className="cmx-pw-input-wrap">
    <input
      id="cmx-superhero-key"
      className="cmx-input"
      type={showAccessKey ? "text" : "password"}
      value={accessKey}
      onChange={e => setAccessKey(e.target.value)}
      placeholder="Enter Super Hero Name"
      autoFocus
      autoComplete="new-password"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      name="cmx-unlock-key"
    />
    <button
      type="button"
      className="cmx-pw-toggle"
      onClick={() => setShowAccessKey((v) => !v)}
      title={showAccessKey ? "Hide" : "Reveal"}
      tabIndex={-1}
    >
      {showAccessKey ? <EyeOff size={13} /> : <Eye size={13} />}
    </button>
  </div>
  {unlockError && <div className="cmx-error-bar" style={{ marginTop: 10, marginBottom: 0 }}><AlertTriangle size={14} /> {unlockError}</div>}
  <button type="submit" className="cmx-gate-btn" disabled={unlocking}>
    {unlocking ? <Loader2 size={15} className="cmx-spin" /> : <ShieldAlert size={15} />}
    {unlocking ? "Unlocking..." : "Unlock Credential Management"}
  </button>
</form>
        </div>
      </div>
    );
  }

  const kpis = [
    ["projects", HardDrive, client?.project_count ?? 0, "Projects"],
    ["access", ShieldAlert, client?.access_count ?? 0, "App Access"],
    ["credentials", KeyRound, client?.credential_count ?? 0, "Credentials"],
    ["machines", Monitor, client?.machine_count ?? 0, "Machines"],
    ["contacts", Users, client?.contact_count ?? 0, "Contacts"],
    ["notes", StickyNote, client?.note_count ?? 0, "Notes"],
    ["documents", FileText, client?.document_count ?? 0, "Documents"],
  ];

  const selectedProject = selectedProjectId ? projects.find((p) => Number(p.project_id) === Number(selectedProjectId)) : null;

  return (
    <div className="cmx-root cm-page">
      <div className="cmx-topbar">
        <div className="cmx-crumbs"><span>Home</span><ChevronRight size={12} /><em>Credential Management</em><ChevronRight size={12} /><strong>{client?.client_name || "Clients"}</strong></div>
        <div className="cmx-top-actions">
          <button type="button" className="cmx-btn cmx-btn-solid" onClick={openClientMasterMatrix} style={{ background: "var(--accent)", color: "#06201C", fontWeight: 700 }}>
            <Table2 size={13} /> Master Excel View
          </button>
          {canWrite && <button type="button" className="cmx-btn cmx-btn-solid" onClick={openCreateClient}><Plus size={13} /> Add New Client</button>}
          <button type="button" className="cmx-btn" onClick={() => { loadClients(); if (selectedClientId) loadClient(selectedClientId); }} disabled={pageLoading}><RotateCcw size={13} className={pageLoading ? "cmx-spin" : ""} /> Refresh</button>
        </div>
      </div>

      {error && <div className="cmx-error-bar"><AlertTriangle size={14} /> <span style={{ flex: 1 }}>{error}</span><button onClick={() => setError("")}><X size={14} /></button></div>}

      <div className="cmx-header">
        <div>
          <h1>{client?.client_name || "Credential Management"}</h1>
          {client && <div className="cmx-header-meta"><StatusDot value={client.status} /><i /><span>ID: {client.client_id}</span><i /><span>{client.email || "No email"}</span><i /><span><Globe size={11} style={{ verticalAlign: "-2px", marginRight: 3 }} />{client.timezone || "Timezone not configured"}</span></div>}
        </div>
        {client && (
          <div className="cmx-header-actions">
            {canWrite && <button type="button" className="cmx-btn" onClick={openEditClient}><Pencil size={13} /> Edit Client</button>}
            <div className="cmx-header-count">{clients.length} clients</div>
          </div>
        )}
      </div>

      <div className="cmx-kpi-ticker">
        {kpis.map(([key, Icon, value, label]) => (
          <button type="button" key={key} className={`cmx-kpi ${activeModule === key && !selectedProjectId ? "active" : ""}`} style={{ "--k": MODULE_STYLE[key]?.tone || "var(--accent)" }} onClick={() => { setActiveModule(key); setSelectedProjectId(null); }}>
            <div className="cmx-kpi-top"><Icon size={13} /><span>{label}</span></div>
            <strong>{value}</strong>
          </button>
        ))}
      </div>

      <div className="cmx-workspace">
        <aside className="cmx-rail">
          <div className="cmx-rail-head">
            <div className="cmx-rail-head-row"><strong>Clients</strong><span className="cmx-rail-count">{filteredClients.length}</span></div>
            <div className="cmx-rail-search"><Search size={13} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..." /></div>
          </div>
          <div className="cmx-rail-list">
            {pageLoading ? <div className="cmx-rail-state"><Loader2 size={16} className="cmx-spin" /> Loading...</div>
              : filteredClients.length === 0 ? <div className="cmx-rail-state">No clients found.</div>
              : filteredClients.map(c => (
                <button type="button" key={c.client_id} className={`cmx-rail-item ${Number(selectedClientId) === Number(c.client_id) ? "active" : ""}`} onClick={() => { setSelectedClientId(c.client_id); setSelectedProjectId(null); setActiveModule("overview"); }}>
                  <span className="cmx-rail-avatar"><Building2 size={14} /></span>
                  <span className="cmx-rail-copy"><strong>{c.client_name}</strong><small>{c.email || `Client #${c.client_id}`}</small></span>
                  <ChevronRight size={14} color="var(--text-dim)" />
                </button>
              ))}
          </div>
          <div className="cmx-rail-foot">Showing {filteredClients.length} of {clients.length} clients</div>
        </aside>

        <section className="cmx-detail">
          {!client ? <Loading label="Loading client..." /> : selectedProject ? (
            <ProjectConsole
              project={selectedProject}
              projects={projects}
              tabRows={tabRows}
              tabLoading={tabLoading}
              onBack={() => setSelectedProjectId(null)}
              onAdd={openCreate}
              onEdit={openEdit}
              onDelete={(tab, row) => setDeleteTarget({ tab, row })}
              onReveal={revealCredential}
              onFetchSecret={fetchSecretValue}
              onFetchAccessPassword={fetchAccessPassword}
              onFetchMachinePassword={fetchMachinePassword}
              onCopy={copyValue}
              copiedKey={copiedKey}
              canWrite={canWrite}
            />
          ) : (
            <div className="cmx-module-shell">
              <ModuleRail modules={CLIENT_MODULES} active={activeModule} onSelect={(k) => { setActiveModule(k); setSelectedProjectId(null); }} />
              <div
                className="cmx-content cmx-hub-panel"
                key={activeModule}
                style={{ "--tone": MODULE_STYLE[activeModule]?.tone || "var(--accent)" }}
              >
                {activeModule === "overview" ? (
                  <div className="cmx-summary-grid">
                    <div className="cmx-summary-card cmx-summary-card-primary">
                      <div className="cmx-summary-card-head"><h3><Building2 size={13} /> Client Information</h3>{canWrite && <button type="button" className="cmx-icon-btn" title="Edit client" onClick={openEditClient}><Pencil size={13} /></button>}</div>
                      {[["Client Name", client.client_name], ["Status", <StatusDot value={client.status} />], ["Contact Person", client.contact_person], ["Email", client.email], ["Email Domains", client.email_domains], ["Timezone", client.timezone]].map(([l, v]) => (
                        <div className="cmx-kv-row" key={l}><span>{l}</span><span className="cmx-kv-val"><strong>{v || "—"}</strong></span></div>
                      ))}
                    </div>
                    <div className="cmx-summary-card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <h3 style={{ margin: 0 }}><Sparkles size={13} /> Quick Module Hub</h3>
                        <button
                          type="button"
                          className="cmx-btn cmx-btn-solid cmx-btn-sm"
                          onClick={openClientMasterMatrix}
                          style={{ background: "var(--accent)", color: "#06201C", fontWeight: 700 }}
                        >
                          <Table2 size={13} /> View Master Matrix
                        </button>
                      </div>
                      <div className="cmx-shortcut-grid">
                        {CLIENT_MODULES.slice(1).map(({ key, label, icon: Icon }) => (
                          <button type="button" key={key} className="cmx-shortcut" onClick={() => setActiveModule(key)}><Icon size={14} /><span>{label}</span></button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="cmx-content-head">
                      <h2>{CLIENT_MODULES.find(m => m.key === activeModule)?.label}</h2>
                      <div className="cmx-content-head-actions">
                        <span className="cmx-count-chip">{currentRows.length}</span>
                        {canWrite && FORM_CONFIG[activeModule] && <button type="button" className="cmx-btn cmx-btn-solid cmx-btn-sm" onClick={() => openCreate(activeModule)}><Plus size={13} /> Add {FORM_CONFIG[activeModule].title}</button>}
                      </div>
                    </div>
                    {activeModule === "credentials" && <div className="cmx-banner"><ShieldAlert size={14} /><span>Secrets are never returned by the list API. Use Reveal only when explicitly required.</span></div>}
                    {tabLoading ? <Loading /> : currentRows.length === 0 ? (
                      <Empty tab={activeModule} title={`No ${CLIENT_MODULES.find(m => m.key === activeModule)?.label.toLowerCase()}`} message="No records exist for this client yet." onAdd={canWrite && FORM_CONFIG[activeModule] ? () => openCreate(activeModule) : null} addLabel={`Add ${FORM_CONFIG[activeModule]?.title || "Record"}`} />
                    ) : (
                      <Ledger
                        columns={columnsFor(activeModule, { projectName, onFetchSecret: fetchSecretValue, onFetchAccessPassword: fetchAccessPassword, onFetchMachinePassword: fetchMachinePassword, onCopy: copyValue, copiedKey })}
                        rows={currentRows}
                        rowKey={(r) => r[ID_FIELD[activeModule]]}
                        renderActions={(row) => (
                          <span className="cmx-row-actions">
                            {activeModule === "credentials" && <button type="button" className="cmx-act-reveal" title="Reveal secret" onClick={() => revealCredential(row)}><KeyRound size={13} /></button>}
                            {activeModule === "projects" && <button type="button" className="cmx-act-edit" title="Open project" onClick={() => openProject(row)}><LayoutGrid size={13} /></button>}
                            {canWrite && <button type="button" className="cmx-act-edit" title="Edit" onClick={() => openEdit(activeModule, row)}><Pencil size={13} /></button>}
                            {canWrite && <button type="button" className="cmx-act-delete" title="Delete" onClick={() => setDeleteTarget({ tab: activeModule, row })}><Trash2 size={13} /></button>}
                          </span>
                        )}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {showGlobalExcelMatrix && (
        <ExcelMatrixViewModal
          title={`${client?.client_name || "Client"} — Master Infrastructure Matrix`}
          rows={clientWideRows}
          onClose={() => setShowGlobalExcelMatrix(false)}
          onCopy={copyValue}
          copiedKey={copiedKey}
          onFetchSecret={fetchSecretValue}
          onFetchAccessPassword={fetchAccessPassword}
          onFetchMachinePassword={fetchMachinePassword}
          onReveal={revealCredential}
        />
      )}

      {clientDrawer && <ClientDrawer mode={clientDrawer.mode} initial={clientDrawer.data} saving={clientSaving} onClose={() => setClientDrawer(null)} onSave={saveClient} />}
      {drawer && <RecordDrawer tab={drawer.tab} mode={drawer.mode} initial={drawer.data} projects={projects} saving={saving} onClose={() => setDrawer(null)} onSave={saveRecord} />}
      {deleteTarget && <ConfirmDeleteDialog tab={deleteTarget.tab} record={deleteTarget.row} deleting={deleting} onClose={() => setDeleteTarget(null)} onConfirm={deleteRecord} />}
      {reveal && <SecretDialog reveal={reveal} onClose={() => setReveal(null)} />}
    </div>
  );
}