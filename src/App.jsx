/* APPROVED UI BUILD: 2026-08-17 v5 — timezone + messaging UI refinements */
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  LayoutDashboard, Users, Bot, LogOut, Plus, Pencil, Trash2, Activity,
  ExternalLink, CheckCircle2, XCircle, Clock, Wifi, WifiOff, X,
  AlertTriangle, Loader2, KeyRound, Check, FileBarChart, UserCircle2,
  TrendingUp, Building2, AlertOctagon, Unlock, RotateCcw, ShieldAlert,
  Filter, ChevronDown, HardDrive, CalendarClock, Sun, Moon, Search,
  ChevronsLeft, ChevronsRight, FileText, MessageSquare, Send,
  Copy, Link2, ClipboardList, Eye, EyeOff, Lamp, Volume2, VolumeX, Reply, Mail
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from "recharts";

import "./styles/heartbeat.css";
import ClientManagementCRUDView from "./components/ClientManagementCRUD";
import ActionItems from "./components/ActionItems";
import Notifications from "./components/Notifications";
import { handleWebSocketSoundEvent, isSoundEnabled, toggleSound } from "./service/soundService";

/* ------------------------------------------------------------------ */
/* Design tokens — "vitals monitor" system                             */
/* Signature: the fleet is read the way a patient's vitals are read —  */
/* a live waveform + a BPM-style number that actually reacts to real   */
/* run-events, not a decorative pulse line.                            */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* API helper                                                           */
/* ------------------------------------------------------------------ */
function decodeJwtExpiryMs(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.exp ? payload.exp * 1000 : null;
  } catch (_) {
    return null;
  }
}

/* Wraps fetch with the bearer token, and transparently handles token
   expiry: on a 401 it refreshes the access token once (via the stored
   refresh token) and retries the original request before giving up.
   Concurrent 401s share a single in-flight refresh call. */
function useApi(baseUrl, session, onTokensRefreshed, onUnauthorized) {
  const refreshingRef = useRef(null);

  const doRefresh = useCallback(async () => {
    if (refreshingRef.current) return refreshingRef.current;
    refreshingRef.current = (async () => {
      const res = await fetch(`${baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: session.refreshToken }),
      });
      if (!res.ok) throw new Error("refresh failed");
      const data = await res.json();
      onTokensRefreshed(data.access_token, data.refresh_token);
      return data.access_token;
    })();
    try {
      return await refreshingRef.current;
    } finally {
      refreshingRef.current = null;
    }
  }, [baseUrl, session.refreshToken, onTokensRefreshed]);

  const request = useCallback(
    async (path, options = {}, token, isRetry = false) => {
      const { responseType, ...fetchOptions } = options;
      const headers = { "Content-Type": "application/json", ...(fetchOptions.headers || {}) };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${baseUrl}${path}`, { ...fetchOptions, headers });
      let body = null;
      if (responseType === "text") {
        try { body = await res.text(); } catch (_) { /* no body */ }
      } else {
        try { body = await res.json(); } catch (_) { /* no body */ }
      }

      if (res.status === 401 && !isRetry && session.refreshToken) {
        try {
          const newToken = await doRefresh();
          return request(path, options, newToken, true);   // one silent retry
        } catch (_) {
          onUnauthorized?.();
        }
      } else if (res.status === 401) {
        onUnauthorized?.();
      }

      if (!res.ok) {
        let message = `Request failed (${res.status})`;
        if (body?.message) message = body.message;
        else if (body?.detail) {
          message = Array.isArray(body.detail)
            ? body.detail.map((d) => d.msg).join(", ")
            : String(body.detail);
        }
        const err = new Error(message);
        err.status = res.status;
        throw err;
      }
      return body;
    },
    [baseUrl, session.refreshToken, doRefresh, onUnauthorized]
  );

  const boundApi = useCallback((path, options = {}) => request(path, options, session.token), [request, session.token]);
  boundApi.baseUrl = baseUrl;
  return boundApi;
}





/* ------------------------------------------------------------------ */
/* Theme — light/dark, persisted to localStorage. The CSS already      */
/* defines both palettes on `.hb-root` / `.hb-root[data-theme="dark"]` */
/* — this hook is the single source of truth for which one is active,  */
/* shared by the login screen and the authenticated app shell so the   */
/* choice stays consistent across both.                                */
/* ------------------------------------------------------------------ */
const THEME_KEY = "heartbeat_theme";

function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === "light" || stored === "dark") return stored;
    } catch (_) { /* localStorage unavailable */ }
    // No stored preference yet — fall back to the OS/browser preference,
    // defaulting to light to match the CSS file's base palette.
    try {
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "dark";
      }
    } catch (_) { /* matchMedia unavailable */ }
    return "light";
  });

  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, theme); } catch (_) { /* ignore */ }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return { theme, setTheme, toggleTheme };
}

/* Lamp-pull theme toggle for the login screen — click swings the lamp,
   lights the bulb, and casts a soft glow cone while the theme flips. */
function LampThemeToggle({ theme, toggleTheme }) {
  const isLight = theme === "light";
  const [swinging, setSwinging] = useState(false);

  const handleClick = () => {
    setSwinging(true);
    toggleTheme();
    window.setTimeout(() => setSwinging(false), 650);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={isLight ? "Turn the lamp off" : "Turn the lamp on"}
      aria-label="Toggle theme"
      className={`hb-lamp-toggle${isLight ? " is-on" : ""}${swinging ? " is-swinging" : ""}`}
    >
      <span className="hb-lamp-rig">
        <span className="hb-lamp-cord" />
        <span className="hb-lamp-fixture">
          <Lamp size={24} strokeWidth={1.7} />
          <span className="hb-lamp-bulb-glow" />
        </span>
      </span>
      <span className="hb-lamp-light-cone" />
      <span className="hb-lamp-caption">{isLight ? "Lights on" : "Lights off"}</span>
    </button>
  );
}
/* ------------------------------------------------------------------ */
/* Count-up number — used anywhere a metric lands on screen             */
/* ------------------------------------------------------------------ */
function useCountUp(target, duration = 700) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (typeof target !== "number" || isNaN(target)) return;
    let raf; let start;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => raf && cancelAnimationFrame(raf);
  }, [target, duration]);
  return typeof target === "number" ? display : target;
}

/* Same easing as useCountUp but keeps decimal precision — used for hours
   saved, which are meaningful as fractional values (e.g. 18.75 hrs). */
function StatusDot({ status }) {
  const color =
    status === "Success" ? "var(--success)" :
      status === "Failed" ? "var(--danger)" :
        status === "Started" ? "var(--warning)" : "var(--text-dim)";
  return (
    <span style={{
      display: "inline-block", width: 8, height: 8, borderRadius: "50%",
      background: color, color,
      animation: status === "Started" ? "hb-pulse-dot 1.4s ease-in-out infinite" : "none",
      flexShrink: 0,
    }} />
  );
}

function Badge({ children, tone = "muted" }) {
  const map = {
    success: ["var(--success)", "var(--success-dim)"],
    danger: ["var(--danger)", "var(--danger-dim)"],
    warning: ["var(--warning)", "var(--warning-dim)"],
    accent: ["var(--accent-2)", "rgba(124,156,255,0.14)"],
    muted: ["var(--text-muted)", "var(--surface-3)"],
  };
  const [fg, bg] = map[tone] || map.muted;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 20, fontSize: 12, fontWeight: 600,
      color: fg, background: bg, fontFamily: "var(--font-mono)",
      whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

/* Groups related StatCards under one bordered section, so "run outcome"
   numbers and "fleet snapshot" numbers read as two distinct groups
   instead of one flat row of cards. */
function StatCard({ label, value, tone = "accent", index = 0 }) {
  const colorMap = {
    accent: "var(--accent)", success: "var(--success)",
    danger: "var(--danger)", warning: "var(--warning)",
  };
  const animated = useCountUp(typeof value === "number" ? value : NaN);
  const shown = typeof value === "number" ? animated : value;
  return (
    <div
      style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 14, padding: "18px 20px", flex: "1 1 150px", minWidth: 150,
        position: "relative", overflow: "hidden",
        animation: `hb-rise .45s ease ${index * 0.05}s both`,
        transition: "transform .18s ease, border-color .18s ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "var(--border-hover)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "var(--border)"; }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: colorMap[tone] || "var(--accent)", opacity: 0.65 }} />
      <div className="hb-eyebrow" style={{ marginBottom: 8 }}>{label}</div>
      <div style={{
        fontFamily: "var(--font-mono)", fontSize: 27, fontWeight: 600,
        color: colorMap[tone] || "var(--text)",
      }}>
        {shown}
      </div>
    </div>
  );
}

function Button({ children, variant = "primary", onClick, type = "button", disabled, style }) {
  const variants = {
    primary: { background: "var(--accent)", color: "#06201C", border: "none" },
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

function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 6, fontWeight: 500 }}>
        {label}
      </div>
      {children}
    </label>
  );
}

const inputStyle = {
  width: "100%", padding: "9px 11px", background: "var(--surface-2)",
  border: "1px solid var(--border)", borderRadius: 7, color: "var(--text)",
  fontSize: 14, outline: "none", transition: "border-color .15s",
};

/* Password input with a 🙈/🙉 visibility toggle — used on the login
   form and the create-login modal. */
function PasswordField({ value, onChange, placeholder, required, minLength, autoComplete }) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        style={{ ...inputStyle, paddingRight: 40 }}
        type={visible ? "text" : "password"}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        title={visible ? "Hide password" : "Show password"}
        aria-label={visible ? "Hide password" : "Show password"}
        style={{
          position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", lineHeight: 1,
          padding: 6, borderRadius: 6, color: "var(--text-muted)",
          display: "grid", placeItems: "center",
        }}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

function Modal({ title, onClose, children, width = 440 }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(4,7,9,0.68)", backdropFilter: "blur(2px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, padding: 20,
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width, maxWidth: "100%", maxHeight: "88vh", overflowY: "auto",
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 16, padding: 22, animation: "hb-rise .22s ease both",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}
        className="hb-scroll"
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600 }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)" }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function ResetPasswordModal({ api, user, onClose, onDone }) {
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api(`/auth/users/${user.user_id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ new_password: newPassword }),
      });
      onDone();
    } catch (err) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`Reset Password — ${user.email}`} onClose={onClose} width={400}>
      <form onSubmit={submit}>
        <ErrorBanner message={error} onDismiss={() => setError("")} />
        <Field label="New Password">
          <PasswordField
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="Enter new password"
          />
        </Field>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
          <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Resetting…" : "Reset Password"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function CreateUserModal({ api, onClose, onCreated }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const [clientId, setClientId] = useState("");
  const [clients, setClients] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api("/clients/");
        setClients(res?.data || res || []);
      } catch (_) { /* non-critical */ }
    })();
  }, [api]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          role,
          client_id: role === "client" ? Number(clientId) : undefined,
        }),
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create user.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Create New User" onClose={onClose} width={420}>
      <form onSubmit={submit}>
        <ErrorBanner message={error} onDismiss={() => setError("")} />
        <Field label="Email Address">
          <input
            style={inputStyle}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@stayahead.com"
          />
        </Field>

        <Field label="Password">
          <PasswordField
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="Min 6 characters"
          />
        </Field>

        <Field label="Role">
          <select
            style={inputStyle}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="admin">Admin (Full Access)</option>
            <option value="admin2">Admin 2 (View Only)</option>
            <option value="admin3">Admin 3 (View Only)</option>
            <option value="client">Client</option>
          </select>
        </Field>

        {role === "client" && (
          <Field label="Assign Client">
            <select
              style={inputStyle}
              required
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">Select a Client…</option>
              {clients.map((c) => (
                <option key={c.client_id} value={c.client_id}>
                  {c.client_name}
                </option>
              ))}
            </select>
          </Field>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
          <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 size={14} className="hb-spin" /> : <Plus size={14} />}
            {loading ? "Creating…" : "Create User"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, background: "var(--danger-dim)",
      color: "var(--danger)", padding: "10px 14px", borderRadius: 8, fontSize: 13.5,
      marginBottom: 16, animation: "hb-rise .2s ease both",
    }}>
      <AlertTriangle size={15} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onDismiss} style={{ background: "none", border: "none", color: "var(--danger)" }}>
        <X size={14} />
      </button>
    </div>
  );
}


function InfoBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, background: "var(--warning-dim)",
      color: "var(--warning)", padding: "10px 14px", borderRadius: 8, fontSize: 13.5,
      marginBottom: 16, animation: "hb-rise .2s ease both",
    }}>
      <AlertTriangle size={15} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} style={{ background: "none", border: "none", color: "var(--warning)" }}>
          <X size={14} />
        </button>
      )}
    </div>
  );
}

function timeAgo(iso) {
  if (!iso) return "—";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function initialsOf(name) {
  if (!name) return "??";
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

/* ------------------------------------------------------------------ */
/* Date / trend-row helpers — used to derive "today" vs "overall"      */
/* metrics from the existing daily trend endpoints without inventing   */
/* any new backend data.                                               */
/* ------------------------------------------------------------------ */
function toDateStr(d) {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  if (typeof d === "string") return d.slice(0, 10);
  return null;
}
function localDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function getTodayStr() {
  return localDateStr(new Date());
}
function getYesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localDateStr(d);
}
/* Finds the row in a daily trend array (e.g. run-trend, hours-saved-trend)
   whose date field matches the given date string. */
function findTrendRow(trend, dateStr, dateField = "run_date") {
  if (!Array.isArray(trend)) return null;
  return trend.find((r) => toDateStr(r[dateField]) === dateStr) || null;
}
/* Safely pulls the first present field from an object, trying several
   possible backend field-name variants without fabricating a value. */
function pickField(obj, keys, fallback = 0) {
  if (!obj) return fallback;
  for (const k of keys) {
    if (obj[k] != null) return obj[k];
  }
  return fallback;
}
function pctChange(curr, prev) {
  if (curr == null || prev == null || prev === 0) return null;
  return Math.round(((curr - prev) / prev) * 100);
}

function parseServerDate(iso) {
  if (!iso) return null;
  if (iso instanceof Date) return iso;
  const value = String(iso).trim();
  if (!value) return null;
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getLocalDateStr(iso) {
  if (!iso) return "";
  // If passed a Date object, return its local date parts directly
  if (iso instanceof Date) {
    if (isNaN(iso.getTime())) return "";
    const y = iso.getFullYear();
    const m = String(iso.getMonth() + 1).padStart(2, "0");
    const day = String(iso.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  const value = String(iso).trim();
  if (!value) return "";
  // If the server sends a naive datetime string (no TZ suffix), the DB time IS
  // already in local/IST time. We must NOT treat it as UTC.
  // Just extract the date portion directly from the string to avoid a +5:30 shift
  // that would push evening IST runs into the next day.
  if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/.test(value)) {
    return value.slice(0, 10);
  }
  // Has explicit TZ offset (e.g. +05:30 or Z) — parse and use local date
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatRunTime(iso) {
  if (!iso) return "—";
  const date = parseServerDate(iso) || new Date(iso);
  if (isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function fmtDuration(seconds) {
  if (seconds == null || isNaN(seconds)) return "—";
  const sec = Math.round(Number(seconds));
  const mins = Math.floor(sec / 60);
  const secs = sec % 60;
  if (mins === 0) return `${secs}s`;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}h ${remMins}m`;
}

function isWithinLastDays(iso, days) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return false;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return t >= cutoff;
}

const CHART_COLORS = {
  accent: "#3ED9BE",
  accent2: "#7C9CFF",
  success: "#3ED9BE",
  danger: "#FF6B6A",
  warning: "#F0A857",
  muted: "#7FA0A0",
  border: "#263540",
  surface: "#121A1F",
};

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: "var(--surface-3)", border: "1px solid var(--border)",
      borderRadius: 8, padding: "8px 12px", fontSize: 12.5,
    }}>
      <div style={{ color: "var(--text-muted)", marginBottom: 4, fontFamily: "var(--font-mono)" }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
}

function EmptyChartState() {
  return (
    <div style={{
      height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
      color: "var(--text-dim)", fontSize: 13,
    }}>
      No data yet.
    </div>
  );
}

function VitalsMark({ active }) {
  return (
    <div style={{ position: "relative", height: 30, overflow: "hidden", opacity: active ? 1 : 0.25 }}>
      <svg width="200%" height="30" viewBox="0 0 900 30" style={{ animation: active ? "hb-flow 2.4s linear infinite" : "none" }}>
        <defs>
          <linearGradient id="loginPulseGrad" x1="0" x2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0" />
            <stop offset="50%" stopColor="var(--accent)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 450].map((o) => (
          <path key={o} d={`M${o},15 L${o + 140},15 L${o + 160},4 L${o + 180},26 L${o + 200},15 L${o + 450},15`}
            fill="none" stroke="url(#loginPulseGrad)" strokeWidth="2" strokeLinecap="round" />
        ))}
      </svg>
    </div>
  );
}

function ExecutionPulseBar({ events, connected }) {
  const rate = useEventRate(events);           // already defined in this file
  const lastFailed = events[0]?.status === "Failed";
  const color = lastFailed ? "var(--danger)" : "var(--accent)";
  // busier fleet -> faster beat; idle fleet still shows a slow resting pulse
  const duration = Math.max(1.1, 3.2 - Math.min(rate, 15) * 0.12);

  return (
    <div className="hb-heartbeat-bar" aria-hidden="true">
      <svg
        width="200%" height="100%" viewBox="0 0 900 26" preserveAspectRatio="none"
        className="hb-heartbeat-svg"
        style={{ animationDuration: `${duration}s`, opacity: connected ? 1 : 0.35 }}
      >
        <defs>
          <linearGradient id="hbTopBeatGrad" x1="0" x2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0" />
            <stop offset="65%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 450].map((o) => (
          <g key={o}>
            <path
              d={`M${o},13 H${o + 150} L${o + 160},13 L${o + 167},5 L${o + 174},13 L${o + 182},22 L${o + 190},13 L${o + 198},9 L${o + 204},13 H${o + 450}`}
              fill="none" stroke="url(#hbTopBeatGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            />
            <circle
              cx={o + 204} cy={13} r="3" fill={color} className="hb-heartbeat-dot"
              style={{ filter: `drop-shadow(0 0 4px ${color}) drop-shadow(0 0 8px ${color})` }}
            />
          </g>
        ))}
      </svg>
      {/* <div className="hb-heartbeat-rate">
        <span className="hb-heartbeat-rate-dot" style={{ background: connected ? color : "var(--text-dim)" }} />
        {connected ? `${rate} ` : "offline"}
      </div> */}
    </div>
  );
}

function LoginScreen({ onLogin, sessionMessage, theme, toggleTheme }) {
  const [baseUrl, setBaseUrl] = useState(window.location.origin);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [showLockedModal, setShowLockedModal] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLocked(false);
    setShowLockedModal(false);
    setLoading(true);

    try {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data?.message || (typeof data?.detail === "string" ? data.detail : data?.detail?.[0]?.msg) || "Login failed.";
        const accountIsLocked = data?.code === "ACCOUNT_LOCKED" || (
          !errorMsg.toLowerCase().includes("remaining") &&
          (errorMsg.toLowerCase().includes("account locked") || errorMsg.toLowerCase().includes("contact admin"))
        );
        if (accountIsLocked) {
          setIsLocked(true);
          setShowLockedModal(true);
        }
        throw new Error(errorMsg);
      }

      onLogin({
        baseUrl,
        token: data.access_token,
        refreshToken: data.refresh_token,
        role: data.role,
        clientId: data.client_id,
        email,
      });
    } catch (err) {
      setError(err.message || "Could not reach the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hb-root hb-login-root" data-theme={theme}>

      <div className="hb-login-orb hb-login-orb-a" />
      <div className="hb-login-orb hb-login-orb-b" />

      <div className={`hb-login-lit-zone${theme === "light" ? " is-lit" : ""}`}>
        <LampThemeToggle theme={theme} toggleTheme={toggleTheme} />

        <div className="hb-login-card-wrap">
          <div className="hb-login-brand">
            <div className="hb-login-mark">
              <Activity size={22} />
            </div>
            <div>
              <div className="hb-login-brand-name">HeartBeat</div>
              <div className="hb-login-brand-sub">RPA fleet monitoring for StayAhead Legal</div>
            </div>
          </div>

          <VitalsMark active={true} />

          <div className="hb-login-status">
            <span />
            Secure monitoring console
          </div>

          <form onSubmit={submit} className="hb-login-form">
            <ErrorBanner message={error} onDismiss={() => { setError(""); setIsLocked(false); }} />
            {isLocked && (
              <div style={{
                marginTop: -8, marginBottom: 16, padding: "10px 14px", borderRadius: 8,
                background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)",
                fontSize: 12.5, color: "var(--danger)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10
              }}>
                {/* <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <ShieldAlert size={15} style={{ flexShrink: 0 }} />
                  <span>Account locked after 3 failed login attempts.</span>
                </span> */}
                <button
                  type="button"
                  onClick={() => setShowLockedModal(true)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--danger)", fontWeight: 700, textDecoration: "underline", whiteSpace: "nowrap", marginLeft: "98px",
                  }}
                >
                  Contact Admin
                </button>
              </div>
            )}
            {!error && <InfoBanner message={sessionMessage} />}

            {/* <Field label="Backend URL">
            <input
              className="hb-control"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              autoComplete="url"
            />
          </Field> */}

            <Field label="Email">
              <input
                className="hb-control"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@stayahead.com"
                autoComplete="username"
              />
            </Field>

            <Field label="Password">
              <PasswordField
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </Field>

            <Button
              type="submit"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center", marginTop: 4 }}
            >
              {loading ? <Loader2 size={15} style={{ animation: "hb-spin 1s linear infinite" }} /> : null}
              {loading ? "Signing in…" : "Sign in"}
            </Button>

            <div className="hb-login-contact">
              <span>Need help?</span>
              <a href="mailto:rpa.support@thestayahead.com">
                Contact StayAhead Support
              </a>
            </div>
          </form>
        </div>
      </div>

      {showLockedModal && (
        <Modal title="Account Locked" onClose={() => setShowLockedModal(false)} width={450}>
          <div style={{ textAlign: "center", padding: "6px 4px 10px" }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.28)",
              color: "var(--danger)", display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 14px"
            }}>
              <ShieldAlert size={28} />
            </div>

            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: "var(--text-main)" }}>
              Account Security Lockout
            </div>

            <p style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.5, margin: "0 auto 16px", maxWidth: 360 }}>
              Your account {email ? <strong>({email})</strong> : ""} has been locked after <strong>3 failed login attempts</strong> to protect system security.
            </p>

            <div style={{
              background: "rgba(239, 68, 68, 0.06)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: 10,
              padding: "12px 14px",
              fontSize: 12.5,
              color: "var(--text-main)",
              marginBottom: 20,
              textAlign: "left",
              lineHeight: 1.5
            }}>
              <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--danger)" }}>Action Required:</div>
              <div>Please reach out to your system administrator to verify your credentials and restore your account access.</div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowLockedModal(false)}
                className="hb-btn hb-btn-secondary"
                style={{ padding: "8px 16px", borderRadius: 8, }}

              >
                Dismiss
              </button>
              <a
                href={`mailto:rpa.support@thestayahead.com?subject=Account%20Unlock%20Request%20(${encodeURIComponent(email || "User")})&body=Hello%20Administrator,%0D%0A%0D%0AMy%20account%20(${encodeURIComponent(email || "")})%20has%20been%20locked%20after%203%20failed%20login%20attempts.%20Please%20unlock%20my%20account.%0D%0A%0D%0AThank%20you.`}
                className="hb-btn hb-btn-primary"
                style={{
                  padding: "8px 16px",
                  background: "var(--danger)",
                  borderColor: "var(--danger)",
                  borderRadius: 8,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  textDecoration: "none",
                  color: "white",
                }}
              >
                <Mail size={15} />
                Contact Admin
              </a>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Unified filter system

/* ------------------------------------------------------------------ */
/* Unified filter system — one "Filters" button opens a popover panel   */
/* holding every filter for the view (client / department / period /   */
/* machine). Selected filters also show as removable chips underneath, */
/* so the state is visible without opening the panel again.            */
/* ------------------------------------------------------------------ */
function useDepartmentOptions(api) {
  const [opts, setOpts] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await api("/bots/departments/list");
        setOpts((res?.data || []).map((d) => ({ value: d, label: d })));
      } catch (_) { /* non-critical */ }
    })();
  }, [api]);
  return opts;
}

function useMachineOptions(api) {
  const [opts, setOpts] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await api("/bots/machines/list");
        setOpts((res?.data || []).map((m) => ({ value: m, label: m })));
      } catch (_) { /* non-critical */ }
    })();
  }, [api]);
  return opts;
}

function useClientOptions(api) {
  const [opts, setOpts] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await api("/clients/");
        setOpts((res?.data || []).map((c) => ({ value: c.client_id, label: c.client_name })));
      } catch (_) { /* non-critical */ }
    })();
  }, [api]);
  return opts;
}

const PERIOD_OPTIONS = [
  { value: "day", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
];

/* Client-side period filter — for views (like Logs) whose backend
   endpoint doesn't take a period param. Mirrors the day/week/month/all
   buckets used everywhere else in the app. */
function isWithinPeriod(iso, period) {
  if (!period || period === "all") return true;
  if (!iso) return false;
  const date = new Date(iso);
  if (isNaN(date.getTime())) return false;
  const now = new Date();
  if (period === "day") {
    return date.toDateString() === now.toDateString();
  }
  if (period === "week") {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return date >= weekAgo;
  }
  if (period === "month") {
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return date >= monthAgo;
  }
  return true;
}
/* A single filter group: icon + label + native <select>, used inside
   the popover panel. Kept as a native select for accessibility and
   mobile-friendliness — only the panel chrome around it is custom. */
function FilterGroupRow({ icon: Icon, label, value, onChange, options, placeholder }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <Icon size={12} color="var(--text-dim)" />
        <span style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--text-dim)", fontWeight: 700 }}>
          {label}
        </span>
      </div>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        style={{ ...inputStyle, padding: "8px 10px", fontSize: 13 }}
      >
        <option value="">{placeholder || `All ${label.toLowerCase()}`}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}



/* The trigger button + popover panel. `groups` is an array of:
   { key, icon, label, value, onChange, options, placeholder?, isActive? }
   isActive defaults to "value is set" — pass a custom fn for filters
   like period that have a non-empty default (e.g. treat "week" as the
   neutral/unset state so the badge count doesn't look "on" at load). */
function FilterPopover({ groups, align = "right" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const isActive = (g) => (g.isActive ? g.isActive(g.value) : g.value != null && g.value !== "");
  const activeCount = groups.filter(isActive).length;

  const resetAll = () => groups.forEach((g) => g.onChange(null));

  return (
    <div ref={rootRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          background: activeCount > 0 ? "var(--accent-dim)" : "var(--surface)",
          border: `1px solid ${activeCount > 0 ? "var(--accent)" : "var(--border)"}`,
          borderRadius: 10, padding: "8px 12px", fontSize: 13, fontWeight: 600,
          color: activeCount > 0 ? "var(--accent)" : "var(--text-muted)",
          transition: "border-color .15s, background .15s",
        }}
        onMouseEnter={(e) => { if (activeCount === 0) e.currentTarget.style.borderColor = "var(--border-hover)"; }}
        onMouseLeave={(e) => { if (activeCount === 0) e.currentTarget.style.borderColor = "var(--border)"; }}
      >
        <Filter size={14} />
        Filters{activeCount > 0 ? ` (${activeCount})` : ""}
        <ChevronDown size={13} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>

      {open && (
        <div
          className="hb-scroll"
          style={{
            position: "absolute", top: "calc(100% + 8px)", [align]: 0, zIndex: 60,
            width: 260, maxHeight: 420, overflowY: "auto",
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
            padding: 14, boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
            animation: "hb-rise .16s ease both",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span className="hb-eyebrow">Filters</span>
            {activeCount > 0 && (
              <button
                onClick={resetAll}
                style={{
                  background: "none", border: "none", color: "var(--danger)", fontSize: 11.5, fontWeight: 600,
                  display: "inline-flex", alignItems: "center", gap: 4, padding: 2,
                }}
              >
                <RotateCcw size={11} /> Reset
              </button>
            )}
          </div>
          {groups.map((g) => (
            <FilterGroupRow
              key={g.key}
              icon={g.icon} label={g.label} value={g.value} onChange={g.onChange}
              options={g.options} placeholder={g.placeholder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* Removable chips summarising the current selection, shown underneath
   the Filters button so the applied state is visible at a glance. */
function ActiveFilterChips({ groups }) {
  const isActive = (g) => (g.isActive ? g.isActive(g.value) : g.value != null && g.value !== "");
  const active = groups.filter(isActive);
  if (active.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
      {active.map((g) => {
        const opt = g.options.find((o) => String(o.value) === String(g.value));
        return (
          <span
            key={g.key}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "var(--accent-dim)", color: "var(--accent)",
              padding: "4px 6px 4px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 600,
              fontFamily: "var(--font-mono)",
            }}
          >
            {opt?.label || g.value}
            <button
              onClick={() => g.onChange(null)}
              style={{ background: "none", border: "none", color: "inherit", display: "flex", padding: 2, borderRadius: "50%" }}
              title={`Remove ${g.label} filter`}
            >
              <X size={11} />
            </button>
          </span>
        );
      })}
    </div>
  );
}

/* Stylish search input — used on the Clients and Bots list views.
   Filters client-side across the record's `searchKeys` fields, so it
   works instantly without a round-trip while the row count updates. */
function SearchBar({ value, onChange, placeholder = "Search…" }) {
  return (
    <div className="hb-search-bar">
      <Search size={14} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {value && (
        <button
          type="button"
          className="hb-search-clear"
          onClick={() => onChange("")}
          title="Clear search"
          aria-label="Clear search"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

/* Segmented status filter for Recent Runs — All / Running / Success / Failed */
function StatusFilterTabs({ value, onChange, counts = null }) {
  const options = [
    { key: "all", label: "All", color: "var(--text-muted)" },
    { key: "Started", label: "Running", color: "var(--warning)" },
    { key: "Success", label: "Success", color: "var(--success)" },
    { key: "Failed", label: "Failed", color: "var(--danger)" },
  ];
  return (
    <div style={{
      display: "inline-flex", background: "var(--surface-2)", border: "1px solid var(--border)",
      borderRadius: 8, padding: 3, gap: 2,
    }}>
      {options.map((o) => {
        const active = value === o.key;
        const count = counts ? counts[o.key] : null;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            style={{
              border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11.5, fontWeight: 600,
              background: active ? "var(--surface-3)" : "transparent",
              color: active ? o.color : "var(--text-dim)",
              display: "inline-flex", alignItems: "center", gap: 5,
              cursor: "pointer",
              transition: "background .15s, color .15s",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: o.color, flexShrink: 0, opacity: active ? 1 : 0.5 }} />
            <span>{o.label}</span>
            {count != null && (
              <span style={{
                fontSize: 10, padding: "1px 5px", borderRadius: 10,
                background: active ? "var(--surface-2)" : "var(--surface-3)",
                color: active ? o.color : "var(--text-dim)",
                fontWeight: 700,
              }}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* Date filter tabs for Execution History — Today / Yesterday / Last 5 days / Custom Date */
function RunDateFilterTabs({ value, onChange, customDate, onCustomDateChange, counts }) {
  return (
    <div className="hb-runs-date-tabs">
      <div className="hb-runs-date-group">
        <button
          type="button"
          className={`hb-runs-date-btn ${value === "today" ? "active" : ""}`}
          onClick={() => onChange("today")}
        >
          <span>Today</span>
          {counts?.today != null && counts.today > 0 && (
            <span className="hb-runs-tab-badge">{counts.today}</span>
          )}
        </button>
        <button
          type="button"
          className={`hb-runs-date-btn ${value === "yesterday" ? "active" : ""}`}
          onClick={() => onChange("yesterday")}
        >
          <span>Yesterday</span>
          {counts?.yesterday != null && counts.yesterday > 0 && (
            <span className="hb-runs-tab-badge">{counts.yesterday}</span>
          )}
        </button>
        <button
          type="button"
          className={`hb-runs-date-btn ${value === "5days" ? "active" : ""}`}
          onClick={() => onChange("5days")}
        >
          <span>Last 5 days</span>
        </button>
      </div>

      <div className="hb-custom-date-container">
        <input
          type="date"
          className={`hb-custom-date-input ${value === "custom" ? "active" : ""}`}
          value={customDate || ""}
          onChange={(e) => {
            onCustomDateChange(e.target.value);
            if (e.target.value) onChange("custom");
          }}
          title="Pick custom date"
        />
        {value === "custom" && customDate && (
          <button
            type="button"
            className="hb-clear-date-btn"
            onClick={() => {
              onCustomDateChange("");
              onChange("today");
            }}
            title="Reset to today"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Vitals strip — signature element. Real BPM derived from live events */
/* ------------------------------------------------------------------ */
function useEventRate(events) {
  const [rate, setRate] = useState(0);
  useEffect(() => {
    const calc = () => {
      const now = Date.now();
      const recent = events.filter((e) => now - (e._receivedAt || 0) < 60000);
      setRate(recent.length);
    };
    calc();
    const id = setInterval(calc, 2000);
    return () => clearInterval(id);
  }, [events]);
  return rate;
}

function ClientBotDetailModal({ api, client, onClose }) {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api(`/dashboard/running-bots?client_id=${client.client_id}`);
        setBots(res || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [api, client.client_id]);

  return (
    <Modal title={`${client.client_name} — running bots`} onClose={onClose} width={440}>
      <ErrorBanner message={error} onDismiss={() => setError("")} />
      {loading && <div style={{ color: "var(--text-dim)", fontSize: 13, padding: "10px 0" }}>Loading…</div>}
      {!loading && bots.length === 0 && (
        <div style={{ color: "var(--text-dim)", fontSize: 13, padding: "10px 0" }}>
          No bots currently running for this client.
        </div>
      )}
      <div className="hb-scroll" style={{ maxHeight: 360, overflowY: "auto" }}>
        {bots.map((b) => (
          <div key={b.run_id} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "10px 4px",
            borderBottom: "1px solid var(--border)",
          }}>
            <StatusDot status="Started" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 500 }}>{b.bot_name}</div>
              <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>Started {timeAgo(b.start_time)}</div>
            </div>
            <Badge tone="warning">Running</Badge>
          </div>
        ))}
      </div>
    </Modal>
  );
}

/* Per-client running-bot count, animated — pulls straight from
   /dashboard/client-activity so counts are accurate (not deduped from
   the recent-runs list) and count up when they change. Clicking a chip
   opens the exact bot names + status behind that count. */
function ClientCountChip({ client, index, onClick }) {
  const running = useCountUp(client.running_count ?? 0, 500);
  const isRunning = (client.running_count ?? 0) > 0;
  return (
    <button
      onClick={() => onClick(client)}
      style={{
        display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
        background: "var(--surface)", border: `1px solid ${isRunning ? "var(--accent)" : "var(--border)"}`, borderRadius: 12,
        padding: "10px 14px", minWidth: 150, animation: `hb-rise .4s ease ${index * 0.04}s both, ${isRunning ? "hb-ring 2.4s ease-in-out infinite" : "none"}`,
        textAlign: "left", transition: "border-color .15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-hover)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = isRunning ? "var(--accent)" : "var(--border)"; }}
    >
      <div style={{
        width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700, fontFamily: "var(--font-display)", flexShrink: 0,
        background: isRunning ? "var(--accent-dim)" : "var(--surface-3)",
        color: isRunning ? "var(--accent)" : "var(--text-dim)",
        animation: isRunning ? "hb-pulse-dot 1.4s ease-in-out infinite" : "none",
      }}>
        {initialsOf(client.client_name)}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)" }}>
          {client.client_name}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700,
            color: isRunning ? "var(--accent)" : "var(--text-dim)",
          }}>
            {running}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-dim)" }}>running · {client.total_bots} bots</span>
        </div>
      </div>
    </button>
  );
}

/* Shows only clients that currently have at least one bot running —
   the whole point of the strip is "who's active right now", so idle
   clients (running_count === 0) are filtered out rather than listed. */
function ClientActivityStrip({ api }) {
  const [clients, setClients] = useState([]);
  const [error, setError] = useState("");
  const [detailClient, setDetailClient] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api("/dashboard/client-activity");
      setClients(res || []);
    } catch (err) {
      setError(err.message);
    }
  }, [api]);

  useEffect(() => {
    load();
    const id = setInterval(load, 8000); // keep counts fresh without needing a websocket event
    return () => clearInterval(id);
  }, [load]);

  const runningClients = clients.filter((c) => (c.running_count ?? 0) > 0);

  if (error) {
    return <ErrorBanner message={error} onDismiss={() => setError("")} />;
  }
  if (runningClients.length === 0) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <div className="hb-eyebrow" style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
        Bots running now — click a client to see which bots
        <span style={{
          width: 6, height: 6, borderRadius: "50%", background: "var(--accent)",
          animation: "hb-glow 1.4s ease-in-out infinite", display: "inline-block",
        }} />
      </div>
      <div className="hb-scroll" style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
        {runningClients.map((c, i) => <ClientCountChip key={c.client_id} client={c} index={i} onClick={setDetailClient} />)}
      </div>
      {detailClient && (
        <ClientBotDetailModal api={api} client={detailClient} onClose={() => setDetailClient(null)} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard view                                                      */
/* ------------------------------------------------------------------ */
function ExecutionPulse({ wsConnected, statusSummary, runningCount }) {
  const success = Number(statusSummary?.success || 0);
  const failed = Number(statusSummary?.failed || 0);
  const running = Number(runningCount ?? statusSummary?.started ?? 0);
  const total = success + failed + running;

  return (
    <div className="hb-pulse-panel">
      <div className="hb-pulse-header">
        <div>

          <div className="hb-pulse-title">Live automation Heartbeat</div>
        </div>
        <Badge tone={wsConnected ? "success" : "muted"}>
          <span className="hb-pulse-status-dot" /> {wsConnected ? "STREAMING" : "OFFLINE"}
        </Badge>
      </div>

      <div className="hb-pulse-wave" aria-label="Live execution pulse">
        <svg viewBox="0 0 1000 120" preserveAspectRatio="none" role="img">
          <defs>
            <linearGradient id="hbExecutionPulse" x1="0" x2="1">
              <stop offset="0%" stopColor="var(--accent-2)" stopOpacity="0" />
              <stop offset="18%" stopColor="var(--accent-2)" stopOpacity=".45" />
              <stop offset="50%" stopColor="var(--accent)" stopOpacity="1" />
              <stop offset="82%" stopColor="var(--accent-2)" stopOpacity=".45" />
              <stop offset="100%" stopColor="var(--accent-2)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path className="hb-pulse-grid" d="M0 60 H1000" />
          <path className="hb-pulse-grid" d="M0 30 H1000" />
          <path className="hb-pulse-grid" d="M0 90 H1000" />
          <path
            className="hb-pulse-line"
            d="M0 60 H115 L132 60 L145 38 L158 82 L171 60 H285 L302 60 L315 25 L328 95 L341 60 H470 L487 60 L500 42 L513 78 L526 60 H650 L667 60 L680 31 L693 89 L706 60 H830 L847 60 L860 40 L873 80 L886 60 H1000"
            stroke="url(#hbExecutionPulse)"
          />
          <circle className="hb-pulse-beacon" cx="886" cy="60" r="5" />
        </svg>
        <div className="hb-pulse-scan" />
      </div>

      <div className="hb-pulse-stages">
        {/* <div className="hb-pulse-stage success">
          <span className="hb-pulse-stage-dot" />
          <div><b>{total}</b><span>Total Runs</span></div>
        </div>

        <div className="hb-pulse-stage success">
          <span className="hb-pulse-stage-dot" />
          <div><b>{success}</b><span>Completed</span></div>
        </div>
                <div className="hb-pulse-stage failed">
          <span className="hb-pulse-stage-dot" />
          <div><b>{failed}</b><span>Failed</span></div>
        </div> */}
      </div>
    </div>
  );
}

function DashboardMetric({ icon: Icon, label, value, tone = "accent", note, pulse = false }) {
  const toneColor = tone === "success" ? "var(--success)" : tone === "danger" ? "var(--danger)" : tone === "warning" ? "var(--warning)" : "var(--accent)";
  return (
    <div className={`hb-dash-metric hb-dash-metric-${tone}${pulse ? " is-live" : ""}`}>
      <div className="hb-dash-metric-top">
        <span className="hb-metric-icon" style={{ color: toneColor }}><Icon size={16} /></span>
        <span className="hb-eyebrow">{label}</span>
      </div>
      <div className="hb-dash-metric-value" style={{ color: toneColor }}>{value}</div>
      {note && <div className="hb-dash-metric-note">{note}</div>}
    </div>
  );
}

function DashboardChartPanel({ title, subtitle, children, accent = "accent" }) {
  return (
    <div className={`hb-analytics-card hb-analytics-${accent}`}>
      <div className="hb-analytics-head">
        <div>
          <div className="hb-eyebrow">Analytics</div>
          <div className="hb-analytics-title">{title}</div>
          <div className="hb-analytics-subtitle">{subtitle}</div>
        </div>
        <span className="hb-chart-orb" />
      </div>
      <div className="hb-analytics-chart">{children}</div>
    </div>
  );
}

function DashboardStatusBreakdown({ statusSummary }) {
  const success = Number(statusSummary?.success || 0);
  const failed = Number(statusSummary?.failed || 0);
  const running = Number(statusSummary?.started || 0);
  const total = success + failed + running;
  const successPct = total ? Math.round((success / total) * 100) : 0;

  return (
    <div className="hb-status-card">
      <div className="hb-analytics-head">
        <div>
          <div className="hb-eyebrow">Operations mix</div>
          <div className="hb-analytics-title">Status breakdown</div>
          <div className="hb-analytics-subtitle">Current execution distribution</div>
        </div>
        <div className="hb-status-rate">{successPct}%<span>success</span></div>
      </div>
      <div className="hb-status-visual">
        <div className="hb-status-ring" style={{ "--success-pct": `${successPct}%` }}>
          <div><strong>{total}</strong><span>runs</span></div>
        </div>
        <div className="hb-status-legend">
          <div><span className="status-dot success" /> <b>{success}</b><small>Success</small></div>
          <div><span className="status-dot failed" /> <b>{failed}</b><small>Failed</small></div>
          <div><span className="status-dot running" /> <b>{running}</b><small>Running</small></div>
        </div>
      </div>
    </div>
  );
}

function formatSavedMinutes(hours) {
  const numericHours = Number(hours);
  if (!Number.isFinite(numericHours)) return "—";
  return `${Math.max(0, Math.round(numericHours * 60)).toLocaleString()} min`;
}

function HoursSavedRing({ totalHours, dayCount }) {
  // Fullness is relative to a soft daily-target reference so the ring means
  // something (not just an arbitrary fill) without inventing backend data.
  const dailyTarget = 4; // hrs/day reference — adjust to your team's benchmark
  const pct = dayCount > 0 ? Math.min(100, Math.round((totalHours / (dailyTarget * dayCount)) * 100)) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
      <div
        className="hb-status-ring"
        style={{ background: `conic-gradient(var(--success) ${pct}%, var(--surface-3) ${pct}% 100%)` }}
      >
        <div><strong>{totalHours.toFixed(1)}</strong><span>{formatSavedMinutes(totalHours)}</span></div>
      </div>
    </div>
  );
}

function FleetOverviewCard({ summary, isAdmin }) {
  const totalBots = summary?.total_bots ?? "—";
  const totalClients = summary?.total_clients ?? "—";

  return (
    <div className={`hb-fleet-card-v2 hb-fleet-card-premium${isAdmin ? " is-admin" : ""}`}>
      <div className="hb-fleet-v2-glow" />
      <div className="hb-fleet-orbit orbit-one" />
      <div className="hb-fleet-orbit orbit-two" />
      <div className="hb-fleet-core"><Bot size={22} strokeWidth={1.8} /></div>
      <div className="hb-fleet-v2-top">
        <div>
          <span className="hb-fleet-v2-kicker">{isAdmin ? "FLEET OVERVIEW" : "ROBOT FLEET"}</span>
          <strong>{isAdmin ? "Overall operations" : "All robots"}</strong>
        </div>
      </div>
      <div className={`hb-fleet-v2-metrics${isAdmin ? " two" : " one"}`}>
        <div className="hb-fleet-v2-metric">
          <span className="hb-fleet-v2-icon"><Bot size={15} /></span>
          <span className="hb-fleet-v2-value">{totalBots}</span>
          <span className="hb-fleet-v2-label">Robots</span>
        </div>
        {isAdmin && (
          <div className="hb-fleet-v2-metric">
            <span className="hb-fleet-v2-icon clients"><Users size={15} /></span>
            <span className="hb-fleet-v2-value">{totalClients}</span>
            <span className="hb-fleet-v2-label">Clients</span>
          </div>
        )}
      </div>
      <div className="hb-fleet-v2-line" />
    </div>
  );
}
function RunLogViewer({ api, bot, run, attachment, onClose }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedLog, setCopiedLog] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const text = await api(
          `/dashboard/bot-runs/${run?.run_id}/logs/${attachment?.attachment_id}`,
          { responseType: "text" }
        );
        if (!cancelled) setContent(text || "");
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [api, run?.run_id, attachment?.attachment_id]);

  const logPath = `/dashboard/bot-runs/${run?.run_id}/logs/${attachment?.attachment_id}`;
  const logLink = api?.baseUrl ? `${api.baseUrl}${logPath}` : logPath;

  const copyLogContent = async () => {
    try {
      await navigator.clipboard.writeText(content || "");
      setCopiedLog(true);
      window.setTimeout(() => setCopiedLog(false), 1500);
    } catch (_) {
      setError("Unable to copy the log content.");
    }
  };

  const copyLogLink = async () => {
    try {
      await navigator.clipboard.writeText(logLink);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1500);
    } catch (_) {
      setError("Unable to copy the log link.");
    }
  };

  return (
    <Modal title={`${attachment?.filename || "Log"} — details`} onClose={onClose} width={900}>
      <ErrorBanner message={error} onDismiss={() => setError("")} />
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, marginBottom: 12, padding: "10px 12px",
        border: "1px solid var(--border)", borderRadius: 10,
        background: "var(--surface-2)",
        flexWrap: "wrap",
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 650, fontSize: 13 }}>{bot?.bot_name || "Bot"}</div>
          <div style={{ color: "var(--text-dim)", fontSize: 11, marginTop: 3 }}>
            Run #{run?.run_id} · {attachment?.filename}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={copyLogContent}
            disabled={loading}
            title="Copy the full log content"
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              background: "var(--surface-3)", border: "1px solid var(--border)",
              color: copiedLog ? "var(--success)" : "var(--text-muted)",
              borderRadius: 8, padding: "6px 9px", fontSize: 11.5, fontWeight: 600,
              opacity: loading ? 0.5 : 1,
            }}
          >
            {copiedLog ? <Check size={12} /> : <Copy size={12} />} {copiedLog ? "Copied" : "Copy log"}
          </button>
          <button
            type="button"
            onClick={copyLogLink}
            disabled={loading}
            title="Copy a link to this log"
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              background: "var(--surface-3)", border: "1px solid var(--border)",
              color: copiedLink ? "var(--success)" : "var(--text-muted)",
              borderRadius: 8, padding: "6px 9px", fontSize: 11.5, fontWeight: 600,
            }}
          >
            {copiedLink ? <Check size={12} /> : <Link2 size={12} />} {copiedLink ? "Copied" : "Copy link"}
          </button>
          <Badge tone={run?.status === "Success" ? "success" : run?.status === "Failed" ? "danger" : "warning"}>
            {run?.status || "—"}
          </Badge>
        </div>
      </div>

      <pre className="hb-scroll" style={{
        margin: 0,
        maxHeight: "62vh",
        overflow: "auto",
        padding: 15,
        border: "1px solid var(--border)",
        borderRadius: 11,
        background: "var(--surface-3)",
        color: "var(--text-muted)",
        fontFamily: "var(--font-mono)",
        fontSize: 11.5,
        lineHeight: 1.65,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}>
        {loading ? "Loading log…" : content || "Log file is empty."}
      </pre>
    </Modal>
  );
}

function OverallRunsCard({ totalRuns, successfulRuns }) {
  const runs = Number(totalRuns || 0);
  const success = Number(successfulRuns || 0);
  const successRate = runs > 0 ? Math.round((success / runs) * 100) : 0;
  const animatedRuns = useCountUp(runs);

  return (
    <div className="hb-overall-runs-card">
      <div className="hb-overall-runs-head">
        <div>
          <div className="hb-eyebrow">Overall runs</div>
          <strong>Execution health</strong>
        </div>
        <div className="hb-overall-runs-icon"><Activity size={17} /></div>
      </div>

      <div className="hb-overall-runs-body">
        <div className="hb-overall-runs-total">
          <span>Total runs</span>
          <strong>{Number(animatedRuns || 0).toLocaleString()}</strong>
        </div>

        <div className="hb-overall-runs-rate">
          <div
            className="hb-overall-runs-ring"
            style={{ "--success-pct": `${successRate}%` }}
          >
            <div>
              <strong>{successRate}%</strong>
              <span>Success</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientPerformanceCard({ totalRuns, successRate, hoursSaved }) {
  const minutesSaved = Number.isFinite(Number(hoursSaved)) ? Math.max(0, Math.round(Number(hoursSaved) * 60)) : null;
  const avgMinutes = Number(totalRuns) > 0 && minutesSaved != null ? Math.round(minutesSaved / Number(totalRuns)) : null;

  return (
    <div className="hb-client-performance-card">
      <div className="hb-client-performance-head">
        <div>
          <div className="hb-eyebrow">Client value</div>
          <div className="hb-client-performance-title">Automation performance</div>
          <div className="hb-client-performance-subtitle">Selected period snapshot</div>
        </div>
        <div className="hb-client-performance-icon"><TrendingUp size={17} /></div>
      </div>
      <div className="hb-client-performance-grid">
        <div className="hb-client-performance-stat"><span>Runs</span><strong>{Number(totalRuns || 0).toLocaleString()}</strong></div>
        <div className="hb-client-performance-stat success"><span>Success rate</span><strong>{successRate != null ? `${successRate}%` : "—"}</strong></div>
        <div className="hb-client-performance-stat"><span>Hours saved</span><strong>{hoursSaved != null ? `${Number(hoursSaved).toFixed(1)}h` : "—"}</strong><small>{minutesSaved != null ? `${minutesSaved.toLocaleString()} min total` : "—"}</small></div>
        <div className="hb-client-performance-stat accent"><span>Avg. saved / run</span><strong>{avgMinutes != null ? `${avgMinutes}m` : "—"}</strong></div>
      </div>
      <div className="hb-client-performance-bar"><span style={{ width: `${Math.max(0, Math.min(100, Number(successRate || 0)))}%` }} /></div>
      <div className="hb-client-performance-foot"><span>Automation success</span><b>{successRate != null ? `${successRate}%` : "No data"}</b></div>
    </div>
  );
}

function ClientTimezoneClocks({ timezone, isDrawer = false }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!timezone) return null;

  const clientTime = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: isDrawer ? undefined : "2-digit",
    hour12: true,
  }).format(now);

  const stayAheadUSTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "2-digit",
    minute: "2-digit",
    second: isDrawer ? undefined : "2-digit",
    hour12: true,
  }).format(now);

  const stayAheadTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: isDrawer ? undefined : "2-digit",
    hour12: true,
  }).format(now);

  return (
    <div className={`hb-topbar-clocks${isDrawer ? " hb-drawer-clocks" : ""}`}>
      {/* Client Local Time */}
      <div className="hb-topbar-clock-item">
        <div className="hb-topbar-clock-label">Your Time Zone</div>
        <div className="hb-topbar-clock-time client">{clientTime}</div>
      </div>

      <div className="hb-topbar-clock-divider" />

      {/* StayAhead US */}
      <div className="hb-topbar-clock-item">
        <div className="hb-topbar-clock-label">StayAhead US</div>
        <div className="hb-topbar-clock-time">{stayAheadUSTime}</div>
      </div>

      <div className="hb-topbar-clock-divider" />

      {/* StayAhead India */}
      <div className="hb-topbar-clock-item">
        <div className="hb-topbar-clock-label">StayAhead India</div>
        <div className="hb-topbar-clock-time">{stayAheadTime}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* NEW: EditUserModal — insert this right after ResetPasswordModal      */
/* ------------------------------------------------------------------ */
function EditUserModal({ api, user, onClose, onUpdated }) {
  const [role, setRole] = useState(user.role);
  const [status, setStatus] = useState(user.status);
  const [clientId, setClientId] = useState(user.client_id || "");
  const [clients, setClients] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api("/clients/");
        setClients(res?.data || res || []);
      } catch (_) { /* non-critical */ }
    })();
  }, [api]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api(`/auth/users/${user.user_id}`, {
        method: "PATCH",
        body: JSON.stringify({
          role,
          status,
          client_id: role === "client" ? Number(clientId) : null,
        }),
      });
      onUpdated();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update user.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`Edit User — ${user.email}`} onClose={onClose} width={420}>
      <form onSubmit={submit}>
        <ErrorBanner message={error} onDismiss={() => setError("")} />

        <Field label="Role">
          <select style={inputStyle} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="admin">Admin (Full Access)</option>
            <option value="admin2">Admin 2 (View Only)</option>
            <option value="admin3">Admin 3 (View Only)</option>
            <option value="client">Client</option>
          </select>
        </Field>

        {role === "client" && (
          <Field label="Assign Client">
            <select
              style={inputStyle}
              required
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">Select a Client…</option>
              {clients.map((c) => (
                <option key={c.client_id} value={c.client_id}>
                  {c.client_name}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Status">
          <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </Field>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
          <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function UsersView({ api, currentEmail }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [resetTarget, setResetTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api("/auth/users");
      setUsers(res?.data || res || []);
    } catch (err) {
      setError(err.message || "Failed to load user logins.");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const unlock = async (u) => {
    setError("");
    try {
      await api(`/auth/users/${u.user_id}/unlock`, { method: "POST" });
      load();
    } catch (err) {
      setError(err.message || "Failed to unlock user account.");
    }
  };

  const isLocked = (u) => u.locked_until && new Date(u.locked_until).getTime() > Date.now();
  const isSelf = (u) => currentEmail && u.email?.toLowerCase() === currentEmail.toLowerCase();

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (users || []).filter((u) => {
      const matchesSearch = !q || (u.email || "").toLowerCase().includes(q) || String(u.user_id).includes(q);
      const matchesRole = !roleFilter || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  return (
    <div>
      <ErrorBanner message={error} onDismiss={() => setError("")} />

      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        marginBottom: 16,
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "1 1 300px" }}>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by user email…"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ ...inputStyle, width: "auto", minWidth: 120, padding: "8px 10px" }}
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="admin2">Admin 2</option>
            <option value="admin3">Admin 3</option>
            <option value="client">Client</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Button variant="ghost" onClick={load}>
            <RotateCcw size={13} className={loading ? "hb-spin" : ""} /> Refresh
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus size={14} /> New User
          </Button>
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <div className="hb-scroll" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={{ textAlign: "left", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>Email</th>
                <th style={{ textAlign: "left", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>Role</th>
                <th style={{ textAlign: "left", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>Status</th>
                <th style={{ textAlign: "left", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>Login Status</th>
                <th style={{ textAlign: "right", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} style={{ padding: 28, textAlign: "center", color: "var(--text-dim)" }}>Loading users…</td></tr>
              )}
              {!loading && filteredUsers.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 28, textAlign: "center", color: "var(--text-dim)" }}>
                  {users.length === 0 ? "No logins created yet." : "No users match your filter."}
                </td></tr>
              )}
              {filteredUsers.map((u) => {
                const locked = isLocked(u);
                return (
                  <tr key={u.user_id} className="hb-row-hover" style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "11px 16px", fontWeight: 600 }}>{u.email}</td>
                    <td style={{ padding: "11px 16px" }}>
                      <Badge tone={["admin", "admin2", "admin3"].includes(u.role) ? "accent" : "muted"}>{u.role}</Badge>
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      <Badge tone={u.status === "Active" ? "success" : "muted"}>{u.status}</Badge>
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      {locked ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <ShieldAlert size={14} color="var(--danger)" />
                          <span style={{ color: "var(--danger)", fontSize: 12, fontWeight: 600 }}>
                            Locked ({u.failed_login_attempts >= 3 ? "3/3 failed attempts" : "Contact Admin"})
                          </span>
                        </div>
                      ) : u.failed_login_attempts > 0 ? (
                        <span style={{ color: "var(--warning)", fontSize: 12.5, fontWeight: 500 }}>
                          {u.failed_login_attempts} of 3 failed attempts
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-dim)", fontSize: 12.5 }}>Healthy</span>
                      )}
                    </td>
                    <td style={{ padding: "11px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                      {locked && (
                        <button
                          onClick={() => unlock(u)}
                          title="Unlock account"
                          style={{
                            background: "var(--accent-dim)", border: "none", color: "var(--accent)",
                            padding: "5px 8px", borderRadius: 6, marginRight: 6, cursor: "pointer",
                            fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4
                          }}
                        >
                          <Unlock size={13} /> Unlock
                        </button>
                      )}
                      {!isSelf(u) && (
                        <button
                          onClick={() => setEditTarget(u)}
                          title="Edit role, status or client"
                          style={{
                            background: "var(--surface-2)", border: "1px solid var(--border)",
                            color: "var(--text-muted)", padding: "5px 8px", borderRadius: 6, marginRight: 6,
                            cursor: "pointer", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4
                          }}
                        >
                          <Pencil size={13} /> Edit
                        </button>
                      )}
                      <button
                        onClick={() => setResetTarget(u)}
                        title="Reset password"
                        style={{
                          background: "var(--surface-2)", border: "1px solid var(--border)",
                          color: "var(--text-muted)", padding: "5px 8px", borderRadius: 6,
                          cursor: "pointer", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4
                        }}
                      >
                        <KeyRound size={13} /> Reset Pass
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <CreateUserModal
          api={api}
          onClose={() => setShowCreateModal(false)}
          onCreated={load}
        />
      )}

      {resetTarget && (
        <ResetPasswordModal
          api={api}
          user={resetTarget}
          onClose={() => setResetTarget(null)}
          onDone={() => { setResetTarget(null); load(); }}
        />
      )}

      {editTarget && (
        <EditUserModal
          api={api}
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onUpdated={load}
        />
      )}
    </div>
  );
}

function DashboardView({ api, wsConnected, liveEvents, isAdmin, role, session }) {
  const [summary, setSummary] = useState(null);
  const [recent, setRecent] = useState([]);
  const [runTrendRaw, setRunTrendRaw] = useState([]);
  const [hoursTrendRaw, setHoursTrendRaw] = useState([]);
  const [statusSummary, setStatusSummary] = useState(null);
  const [error, setError] = useState("");
  const [department, setDepartment] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [recentStatusFilter, setRecentStatusFilter] = useState("all");
  const [recentDateFilter, setRecentDateFilter] = useState("today");
  const [customRunDate, setCustomRunDate] = useState("");
  const [selectedRunLog, setSelectedRunLog] = useState(null);
  const [historyExpanded, setHistoryExpanded] = useState(true);
  const [period, setPeriod] = useState("day");

  const [clientTimezone, setClientTimezone] = useState(null);
  const departmentOptions = useDepartmentOptions(api);
  const clientOptions = useClientOptions(api);

  const filterGroups = useMemo(() => {
    const groups = [];
    if (isAdmin) groups.push({ key: "client", icon: Users, label: "Client", value: clientId, onChange: setClientId, options: clientOptions });
    groups.push({ key: "department", icon: Building2, label: "Department", value: department, onChange: setDepartment, options: departmentOptions });
    return groups;
  }, [isAdmin, clientId, clientOptions, department, departmentOptions]);

  const buildQs = useCallback(() => {
    const params = new URLSearchParams();
    if (department) params.set("department", department);
    if (isAdmin && clientId) params.set("client_id", clientId);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }, [department, clientId, isAdmin]);

  const load = useCallback(async () => {
    try {
      setError("");
      const qs = buildQs();
      const recentSuffix = qs ? `${qs}&limit=100` : `?limit=100`;
      const trendSuffix = qs ? `${qs}&period=${period}` : `?period=${period}`;
      const [s, r, rt, ht, ss] = await Promise.all([
        api(`/dashboard/summary${qs}`),
        api(`/dashboard/recent-runs${recentSuffix}`),
        api(`/dashboard/run-trend${trendSuffix}`),
        api(`/dashboard/hours-saved-trend${trendSuffix}`),
        api(`/dashboard/status-summary${trendSuffix}`),
      ]);
      setSummary(s);
      setRecent(r || []);
      setRunTrendRaw(rt || []);
      setHoursTrendRaw(ht || []);
      setStatusSummary(ss);
    } catch (err) {
      setError(err.message);
    }
  }, [api, buildQs, period]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (liveEvents.length) load(); }, [liveEvents.length]); // eslint-disable-line react-hooks/exhaustive-deps



  const todayStr = getTodayStr();
  const yesterdayStr = getYesterdayStr();
  const todayRunRow = useMemo(() => findTrendRow(runTrendRaw, todayStr), [runTrendRaw, todayStr]);
  const yesterdayRunRow = useMemo(() => findTrendRow(runTrendRaw, yesterdayStr), [runTrendRaw, yesterdayStr]);
  const todayHoursRow = useMemo(() => findTrendRow(hoursTrendRaw, todayStr), [hoursTrendRaw, todayStr]);
  const yesterdayHoursRow = useMemo(() => findTrendRow(hoursTrendRaw, yesterdayStr), [hoursTrendRaw, yesterdayStr]);

  const todayRuns = pickField(todayRunRow, ["total_runs"], 0);
  const todaySuccess = pickField(todayRunRow, ["successful_runs", "success_count", "successful", "success"], 0);
  const todayFailed = pickField(todayRunRow, ["failed_runs", "failed_count", "failed"], 0);
  const yesterdayRuns = yesterdayRunRow ? pickField(yesterdayRunRow, ["total_runs"], 0) : null;
  const runsPctChange = pctChange(todayRuns, yesterdayRuns);

  const todayHoursFromTrend = todayHoursRow ? pickField(todayHoursRow, ["hours_saved"], null) : null;
  const todayHours = todayHoursFromTrend != null ? todayHoursFromTrend : (typeof summary?.hours_saved_today === "number" ? summary.hours_saved_today : null);
  const yesterdayHours = yesterdayHoursRow ? pickField(yesterdayHoursRow, ["hours_saved"], null) : null;
  const overallHoursFields = ["hours_saved_total", "total_hours_saved", "hours_saved_overall", "lifetime_hours_saved", "overall_hours_saved"];
  const overallHoursAvailable = !!(summary && overallHoursFields.some((k) => summary[k] != null));
  const overallHours = overallHoursAvailable ? pickField(summary, overallHoursFields, 0) : null;

  const runTrendForChart = useMemo(() =>
    (runTrendRaw || []).map((d) => ({
      date: (period === "month" || period === "all") ? d.run_date?.slice(0, 7) : d.run_date?.slice(5),
      runs: d.total_runs
    })),
    [runTrendRaw, period]);

  const hoursTrendForChart = useMemo(() =>
    (hoursTrendRaw || []).map((d) => ({
      date: (period === "month" || period === "all") ? d.run_date?.slice(0, 7) : d.run_date?.slice(5),
      hours: d.hours_saved
    })),
    [hoursTrendRaw, period]);
  const todayLocalDate = useMemo(() => getTodayStr(), []);
  const yesterdayLocalDate = useMemo(() => getYesterdayStr(), []);

  const dateCounts = useMemo(() => {
    let today = 0;
    let yesterday = 0;
    for (const r of recent || []) {
      const d = getLocalDateStr(r.start_time);
      if (d === todayLocalDate) today++;
      if (d === yesterdayLocalDate) yesterday++;
    }
    return { today, yesterday };
  }, [recent, todayLocalDate, yesterdayLocalDate]);

  const runsForSelectedDate = useMemo(() => {
    return (recent || [])
      .filter((r) => {
        if (!r.start_time) return false;
        const d = getLocalDateStr(r.start_time);
        if (recentDateFilter === "today") return d === todayLocalDate;
        if (recentDateFilter === "yesterday") return d === yesterdayLocalDate;
        if (recentDateFilter === "custom") return customRunDate ? d === customRunDate : true;
        return isWithinLastDays(r.start_time, 5);
      })
      .sort((a, b) => new Date(b.start_time || 0) - new Date(a.start_time || 0));
  }, [recent, recentDateFilter, customRunDate, todayLocalDate, yesterdayLocalDate]);

  const statusCountsForActiveDate = useMemo(() => {
    let all = runsForSelectedDate.length;
    let started = 0;
    let success = 0;
    let failed = 0;
    for (const r of runsForSelectedDate) {
      if (r.status === "Started") started++;
      else if (r.status === "Success") success++;
      else if (r.status === "Failed") failed++;
    }
    return { all, Started: started, Success: success, Failed: failed };
  }, [runsForSelectedDate]);

  const filteredRecent = useMemo(() => {
    if (recentStatusFilter === "all") return runsForSelectedDate;
    return runsForSelectedDate.filter((r) => r.status === recentStatusFilter);
  }, [runsForSelectedDate, recentStatusFilter]);

  const activeDateLabel = useMemo(() => {
    if (recentDateFilter === "today") return "Today";
    if (recentDateFilter === "yesterday") return "Yesterday";
    if (recentDateFilter === "custom" && customRunDate) {
      try {
        const [y, m, d] = customRunDate.split("-").map(Number);
        return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
      } catch (_) {
        return customRunDate;
      }
    }
    return "Last 5 days";
  }, [recentDateFilter, customRunDate]);

  const clientName = isAdmin ? "Operations fleet" : (session?.clientName || session?.client_name || session?.email?.split("@")[0] || "Your workspace");

  const totalTrendRuns = runTrendForChart.reduce((sum, row) => sum + Number(row.runs || 0), 0);
  const totalTrendHours = hoursTrendForChart.reduce((sum, row) => sum + Number(row.hours || 0), 0);
  const periodStatusTotal = Number(statusSummary?.success || 0) + Number(statusSummary?.failed || 0) + Number(statusSummary?.started || 0);
  const periodSuccessRate = periodStatusTotal > 0 ? Math.round((Number(statusSummary?.success || 0) / periodStatusTotal) * 100) : null;

  const [topBots, setTopBots] = useState([]);
  const [topClients, setTopClients] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const qs = buildQs();
        const sep = qs ? "&" : "?";
        // period state-aiye ingayum use panrom
        const calls = [api(`/dashboard/top-bots${qs}${sep}period=${period}&limit=200`)];
        if (isAdmin) calls.push(api(`/dashboard/top-clients${qs}${sep}period=${period}&limit=200`));
        const results = await Promise.all(calls);
        setTopBots(results[0] || []);
        if (isAdmin) {
          setTopClients(results[1] || []);
        }
      } catch (_) { /* non-critical */ }
    })();
  }, [api, buildQs, period, isAdmin]); // <-- dependency-la 'period' irukanum

  return (
    <div className="hb-dashboard-v3">
      <ErrorBanner message={error} onDismiss={() => setError("")} />
      <ExecutionPulseBar events={liveEvents} connected={wsConnected} />

      <section className="hb-dashboard-intro">
        <div className="hb-dashboard-intro-copy">
          <div>
            <div className="hb-eyebrow">{isAdmin ? "Robots " : "Client operations"}</div>
            <h1 className="hb-v3-title">{isAdmin ? " Performance Dashboard" : `${clientName} Robots Performance`}</h1>
            <p className="hb-v3-subtitle">Real-time visibility into today's executions, automation value and operational health.</p>
          </div>

        </div>
        <div className="hb-dashboard-intro-right">
          <FleetOverviewCard summary={summary} isAdmin={isAdmin} />
          {isAdmin && (
            <OverallRunsCard
              totalRuns={summary?.total_runs}
              successfulRuns={summary?.successful_runs}
            />
          )}

          <div className="hb-v3-controls">
            <div className="hb-connection-pill">
              <span className={`hb-connection-dot ${wsConnected ? "live" : "offline"}`} />
              {wsConnected ? "Live" : "Offline"}
            </div>
            <div className="hb-filter-bar"><span className="hb-filter-label">Scope</span><FilterPopover groups={filterGroups} /></div>
            <ActiveFilterChips groups={filterGroups} />
          </div>
        </div>
      </section>

      {isAdmin && <ClientActivityStrip api={api} />}

      <section className="hb-today-section">
        <div className="hb-section-rule"><div className="hb-eyebrow">Today's run summary</div><span className="hb-section-date">{new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span></div>
        <div className="hb-today-grid">
          <DashboardMetric icon={Activity} label="Total runs" value={todayRuns} tone="accent" note={runsPctChange != null ? `${runsPctChange >= 0 ? "+" : ""}${runsPctChange}% vs yesterday` : "Today's execution volume"} />
          <DashboardMetric icon={Clock} label="Running now" value={summary?.running_bots ?? "—"} tone="warning" note="Active executions" pulse={Number(summary?.running_bots || 0) > 0} />
          <DashboardMetric icon={CheckCircle2} label="Success" value={todaySuccess} tone="success" note="Completed successfully" />
          <DashboardMetric icon={XCircle} label="Failed" value={todayFailed} tone="danger" note="Requires attention" pulse={todayFailed > 0} />
          <div className="hb-today-hours-card">
            <div className="hb-today-hours-icon"><Clock size={14} /></div>
            <div className="hb-today-hours-copy">
              <span>Saved today</span>
              <strong>{todayHours != null ? `${Number(todayHours).toFixed(1)}h` : "—"}</strong>
              <small>{todayHours != null ? `${formatSavedMinutes(todayHours)} saved` : "Automation value"}</small>
            </div>
            <div className="hb-today-hours-ring" style={{ "--hours-pct": `${Math.min(100, Math.round((Number(todayHours || 0) / 4) * 100))}%` }} />
          </div>
        </div>
      </section>

      {/* <ExecutionPulse wsConnected={wsConnected} statusSummary={statusSummary} runningCount={summary?.running_bots} /> */}

      <section className="hb-analytics-zone">
        <div className="hb-section-rule"><div className="hb-eyebrow">Performance analytics</div><div className="hb-period-toggle">
          {[
            ['day', 'Daily'],
            ['week', 'Weekly'],
            ['month', 'Monthly'],
            ['all', 'All-Time']
          ].map(([key, label]) => (
            <button
              key={key}
              className={period === key ? "active" : ""}
              onClick={() => setPeriod(key)}
            >
              {label}
            </button>
          ))}
        </div></div>
        <div className="hb-analytics-grid">
          <DashboardChartPanel title="Runs over time" subtitle={`${totalTrendRuns.toLocaleString()} runs in selected period`} accent="blue">
            {runTrendForChart.length === 0 ? <EmptyChartState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={runTrendForChart} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs><linearGradient id="hbRunsV3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent-2)" stopOpacity=".38" /><stop offset="100%" stopColor="var(--accent-2)" stopOpacity="0" /></linearGradient></defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--text-dim)" fontSize={10.5} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-dim)" fontSize={10.5} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="runs" name="Runs" stroke="var(--accent-2)" strokeWidth={2.5} fill="url(#hbRunsV3)" isAnimationActive animationDuration={850} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </DashboardChartPanel>

          <DashboardChartPanel title="Hours saved" subtitle={`${totalTrendHours.toFixed(1)} hours (${formatSavedMinutes(totalTrendHours)}) in selected period`} accent="green">
            {hoursTrendForChart.length === 0 ? <EmptyChartState /> : (
              <div className="hb-hours-saved-layout">
                <div className="hb-hours-saved-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hoursTrendForChart} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="date" stroke="var(--text-dim)" fontSize={9.5} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--text-dim)" fontSize={9.5} tickLine={false} axisLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="hours" name="Hours saved" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="hb-hours-saved-ring-wrap">
                  <HoursSavedRing totalHours={totalTrendHours} dayCount={hoursTrendForChart.length} />
                </div>
              </div>
            )}
          </DashboardChartPanel>

          <DashboardStatusBreakdown statusSummary={statusSummary} />
        </div>
      </section>

      <section className="hb-ranking-grid" style={{ marginTop: 24 }}>
        <RankingChart title="Top bots" icon={Bot} rows={topBots} nameKey="bot_name" subKey={isAdmin ? "client_name" : undefined} loading={false} />
        {isAdmin ? (
          <RankingChart title="Top clients" icon={Users} rows={topClients} nameKey="client_name" loading={false} />
        ) : (
          <ClientPerformanceCard totalRuns={totalTrendRuns} successRate={periodSuccessRate} hoursSaved={totalTrendHours} />
        )}
      </section>

      <section className="hb-runs-zone">
        <div className="hb-section-rule"><div className="hb-eyebrow">Recent runs</div><span className="hb-section-hint">Latest automation executions</span></div>
        <div className="hb-runs-panel">
          <div className="hb-runs-head">
            <button type="button" className="hb-history-toggle" onClick={() => setHistoryExpanded((v) => !v)} aria-expanded={historyExpanded}>
              <span className="hb-history-chevron"><ChevronDown size={16} /></span>
              <span>
                <span className="hb-panel-title">Execution history ({activeDateLabel})</span>
                <span className="hb-section-subtitle">
                  {historyExpanded
                    ? `${runsForSelectedDate.length} bot execution${runsForSelectedDate.length === 1 ? "" : "s"} ${recentDateFilter === "today" ? "today" : recentDateFilter === "yesterday" ? "yesterday" : `on ${activeDateLabel}`}. Click row to inspect logs.`
                    : "Click to expand automation executions."}
                </span>
              </span>
            </button>

            <div className="hb-runs-controls">
              <RunDateFilterTabs
                value={recentDateFilter}
                onChange={setRecentDateFilter}
                customDate={customRunDate}
                onCustomDateChange={setCustomRunDate}
                counts={dateCounts}
              />
              <StatusFilterTabs
                value={recentStatusFilter}
                onChange={setRecentStatusFilter}
                counts={statusCountsForActiveDate}
              />
            </div>
          </div>
          {historyExpanded && (
            <>
              <div className="hb-runs-table-head">
                <span>Bot & ID</span>
                <span>Client</span>
                <span>Status</span>
                <span>Duration</span>
                <span>Started</span>
                {/* <span style={{ textAlign: "right" }}>Logs</span> */}
              </div>
              <div className="hb-scroll hb-runs-list">
                {filteredRecent.length === 0 && (
                  <div className="hb-empty-runs">
                    {runsForSelectedDate.length === 0
                      ? `No bots executed ${recentDateFilter === "today" ? "today" : recentDateFilter === "yesterday" ? "yesterday" : `on ${activeDateLabel}`}.`
                      : "No runs match the selected status filter."}
                  </div>
                )}
                {filteredRecent.map((r, i) => (
                  <div
                    key={r.run_id}
                    className={`hb-run-row ${i === 0 && liveEvents.length ? "fresh" : ""}`}
                    onClick={() => setSelectedRunLog(r)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelectedRunLog(r); }}
                    style={{ cursor: "pointer" }}
                    title="Click to view run details and logs"
                  >
                    <div className="hb-run-bot">
                      <StatusDot status={r.status} />
                      <div>
                        <strong>{r.bot_name}</strong>
                        <div className="hb-run-sub">
                          <small>{r.execution_id || `Run #${r.run_id}`}</small>
                          {r.status === "Failed" && r.failure_stage && (
                            <span className="hb-stage-pill" title={`Failed stage: ${r.failure_stage}`}>
                              Stage: {r.failure_stage}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="hb-run-client">{r.client_name || "—"}</div>
                    <div>
                      <Badge tone={r.status === "Success" ? "success" : r.status === "Failed" ? "danger" : r.status === "Started" ? "warning" : "muted"}>
                        {r.status === "Started" ? "Running" : r.status}
                      </Badge>
                    </div>
                    <div className="hb-run-duration">
                      {r.status === "Started" ? (
                        <span className="hb-running-pulse">In progress…</span>
                      ) : (
                        fmtDuration(r.duration_seconds)
                      )}
                    </div>
                    <div className="hb-run-time">
                      <strong>{formatRunTime(r.start_time)}</strong>
                      <small>{timeAgo(r.start_time)}</small>
                    </div>
                    {/* <div className="hb-run-action" style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="hb-run-log-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRunLog(r);
                        }}
                        title="View log files"
                      >
                        <FileText size={13} />
                        <span>Logs</span>
                      </button>
                    </div> */}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {selectedRunLog && (
        <RunLogsModal
          api={api}
          bot={{ bot_name: selectedRunLog.bot_name, bot_id: selectedRunLog.bot_id }}
          run={selectedRunLog}
          onClose={() => setSelectedRunLog(null)}
        />
      )}

      <footer className="hb-dashboard-footer">
        <div></div>
        <div><a href="mailto:rpa.support@thestayahead.com">rpa.support@thestayahead.com</a><span>© {new Date().getFullYear()} StayAhead LLC. All rights reserved.</span></div>
      </footer>
    </div>
  );
}
function RunLogsModal({ api, bot, run, onClose }) {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAttachment, setSelectedAttachment] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api(`/dashboard/bot-runs/${run.run_id}/logs`);
        if (!cancelled) setAttachments(res || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [api, run.run_id]);

  const formatBytes = (bytes) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (selectedAttachment) {
    return (
      <RunLogViewer
        api={api}
        bot={bot}
        run={run}
        attachment={selectedAttachment}
        onClose={() => setSelectedAttachment(null)}
      />
    );
  }

  return (
    <Modal title={`${bot?.bot_name || run?.bot_name || "Bot"} — run logs`} onClose={onClose} width={700}>
      <ErrorBanner message={error} onDismiss={() => setError("")} />

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
        gap: 10, marginBottom: 14, padding: "12px 14px",
        border: "1px solid var(--border)", borderRadius: 10,
        background: "var(--surface-2)",
      }}>
        <div>
          <div style={{ color: "var(--text-dim)", fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5 }}>Bot & Run</div>
          <div style={{ fontWeight: 650, fontSize: 13, marginTop: 2 }}>{bot?.bot_name || run?.bot_name}</div>
          <div style={{ color: "var(--text-dim)", fontSize: 11 }}>{run?.execution_id || `Run #${run?.run_id}`}</div>
        </div>

        <div>
          <div style={{ color: "var(--text-dim)", fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5 }}>Client</div>
          <div style={{ fontWeight: 600, fontSize: 12.5, marginTop: 2 }}>{run?.client_name || "—"}</div>
        </div>

        <div>
          <div style={{ color: "var(--text-dim)", fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5 }}>Status</div>
          <div style={{ marginTop: 2 }}>
            <Badge tone={run?.status === "Success" ? "success" : run?.status === "Failed" ? "danger" : run?.status === "Started" ? "warning" : "muted"}>
              {run?.status === "Started" ? "Running" : run?.status}
            </Badge>
          </div>
        </div>

        <div>
          <div style={{ color: "var(--text-dim)", fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5 }}>Duration</div>
          <div style={{ fontWeight: 600, fontSize: 12.5, marginTop: 2, fontFamily: "var(--font-mono)" }}>
            {run?.status === "Started" ? "In progress…" : fmtDuration(run?.duration_seconds)}
          </div>
        </div>

        <div>
          <div style={{ color: "var(--text-dim)", fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5 }}>Started At</div>
          <div style={{ fontWeight: 500, fontSize: 12, marginTop: 2 }}>
            {run?.start_time ? new Date(run.start_time).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "—"}
          </div>
          <div style={{ color: "var(--text-dim)", fontSize: 10.5 }}>
            {run?.start_time ? new Date(run.start_time).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
          </div>
        </div>

        {run?.status === "Failed" && run?.failure_stage && (
          <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 2 }}>
            <span style={{ color: "var(--danger)", fontSize: 12, fontWeight: 600 }}>
              Failure Stage:
            </span>{" "}
            <span style={{ color: "var(--text)", fontSize: 12 }}>{run.failure_stage}</span>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ padding: 34, textAlign: "center", color: "var(--text-dim)" }}>
          Loading logs…
        </div>
      ) : attachments.length === 0 ? (
        <div style={{ padding: 38, textAlign: "center", color: "var(--text-dim)" }}>
          <FileText size={28} style={{ opacity: .45, marginBottom: 8 }} />
          <div>No log files attached to this run.</div>
        </div>
      ) : (
        <div style={{ border: "1px solid var(--border)", borderRadius: 11, overflow: "hidden" }}>
          {attachments.map((file, index) => (
            <div key={file.attachment_id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 12, padding: "12px 14px",
              borderBottom: index === attachments.length - 1 ? "none" : "1px solid var(--border)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 9, display: "grid", placeItems: "center",
                  background: "var(--accent-dim)", color: "var(--accent)", flexShrink: 0,
                }}>
                  <FileText size={16} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {file.filename}
                  </div>
                  <div style={{ marginTop: 3, color: "var(--text-dim)", fontSize: 10.5, fontFamily: "var(--font-mono)" }}>
                    {formatBytes(file.size_bytes)}
                  </div>
                </div>
              </div>
              <Button variant="ghost" onClick={() => setSelectedAttachment(file)}>
                <ExternalLink size={13} /> Open log
              </Button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}


function LogsView({ api, context = null, onBackToReports }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [period, setPeriod] = useState("day");
  const [selectedRun, setSelectedRun] = useState(null);
  const [selectedBot, setSelectedBot] = useState(null);

  const isSingleRunContext = !!context?.run_id;

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let res;
      if (context?.run_id) {
        // When coming from Bot Reports, load only that exact run.
        const attachments = await api(`/dashboard/bot-runs/${context.run_id}/logs`);
        res = (attachments || []).map((file) => ({
          ...file,
          run_id: context.run_id,
          bot_id: context.bot_id ?? file.bot_id,
          bot_name: context.bot_name ?? file.bot_name,
          client_name: context.client_name ?? file.client_name,
          status: context.status ?? file.status,
          start_time: context.start_time ?? file.start_time,
        }));
      } else {
        // Direct sidebar navigation shows all available bot logs.
        res = await api("/dashboard/logs?limit=500");
      }
      setRows(Array.isArray(res) ? res : []);
    } catch (err) {
      setError(err.message || "Failed to load bot logs.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [api, context?.run_id, context?.bot_id, context?.bot_name, context?.client_name, context?.status, context?.start_time]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = !status || row.status === status;
      // Single-run context is already scoped to one run — period doesn't apply there.
      const matchesPeriod = isSingleRunContext || isWithinPeriod(row.start_time, period);
      const haystack = `${row.bot_name || ""} ${row.client_name || ""} ${row.filename || ""} ${row.run_id || ""}`.toLowerCase();
      return matchesStatus && matchesPeriod && (!q || haystack.includes(q));
    });
  }, [rows, search, status, period, isSingleRunContext]);

  // Single-run context (opened from Bot Reports): one row, that run's files.
  const groupedByRun = useMemo(() => {
    const map = new Map();
    for (const row of filtered) {
      if (!map.has(row.run_id)) {
        map.set(row.run_id, {
          run_id: row.run_id,
          bot_id: row.bot_id,
          bot_name: row.bot_name,
          client_name: row.client_name,
          status: row.status,
          start_time: row.start_time,
          files: [],
        });
      }
      map.get(row.run_id).files.push(row);
    }
    return Array.from(map.values());
  }, [filtered]);

  // General "all logs" list: one row PER BOT, so a bot with 85 failed runs
  // shows as a single summarized row instead of 85 near-identical lines.
  const groupedByBot = useMemo(() => {
    const map = new Map();
    for (const row of filtered) {
      const key = row.bot_id ?? row.bot_name;
      if (!map.has(key)) {
        map.set(key, {
          bot_id: row.bot_id,
          bot_name: row.bot_name,
          client_name: row.client_name,
          runIds: new Set(),
          fileCount: 0,
          failedCount: 0,
          successCount: 0,
          latestStart: row.start_time,
        });
      }
      const g = map.get(key);
      g.runIds.add(row.run_id);
      g.fileCount += 1;
      if (row.status === "Failed") g.failedCount += 1;
      if (row.status === "Success") g.successCount += 1;
      if (row.start_time && (!g.latestStart || new Date(row.start_time) > new Date(g.latestStart))) {
        g.latestStart = row.start_time;
      }
    }
    return Array.from(map.values())
      .map((g) => ({ ...g, runCount: g.runIds.size }))
      .sort((a, b) => new Date(b.latestStart || 0) - new Date(a.latestStart || 0));
  }, [filtered]);

  const displayRows = isSingleRunContext ? groupedByRun : groupedByBot;

  return (
    <>
      <div>
        <ErrorBanner message={error} onDismiss={() => setError("")} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {context?.run_id && (
                <button
                  type="button"
                  onClick={onBackToReports}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    background: "var(--surface-2)", border: "1px solid var(--border)",
                    color: "var(--text-muted)", borderRadius: 8, padding: "6px 9px", fontSize: 12,
                  }}
                >
                  ← Back
                </button>
              )}
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 650 }}>Bot Logs</div>
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 5 }}>
              {context?.run_id
                ? `${context.bot_name || "Bot"} · Run #${context.run_id}${context.status ? ` · ${context.status}` : ""}`
                : "Execution logs received from bot report emails."}
            </div>
          </div>
          <Badge tone="accent"><FileText size={11} /> {filtered.length} files</Badge>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: 10, marginBottom: 14, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }}>
          <div style={{ position: "relative", flex: "1 1 260px", minWidth: 200 }}>
            <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)", pointerEvents: "none" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bot, client, file or run"
              aria-label="Search bot, client, file or run"
              style={{
                width: "100%", boxSizing: "border-box", padding: "9px 12px 9px 34px",
                background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)",
                borderRadius: 9, outline: "none", fontSize: 13,
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
            />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...inputStyle, width: "auto", minWidth: 120, padding: "8px 10px" }}>
            <option value="">All statuses</option>
            <option value="Success">Success</option>
            <option value="Failed">Failed</option>
          </select>
          {!isSingleRunContext && (
            <select value={period} onChange={(e) => setPeriod(e.target.value)} style={{ ...inputStyle, width: "auto", minWidth: 120, padding: "8px 10px" }}>
              {PERIOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}
          <Button variant="ghost" onClick={loadLogs}><RotateCcw size={13} /> Refresh</Button>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 42, textAlign: "center", color: "var(--text-dim)" }}>Loading logs…</div>
          ) : displayRows.length === 0 ? (
            <div style={{ padding: 42, textAlign: "center", color: "var(--text-dim)" }}>No bot logs found.</div>
          ) : isSingleRunContext ? (
            <div className="hb-scroll" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th style={{ textAlign: "left", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>Bot</th>
                    <th style={{ textAlign: "left", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>Client</th>
                    <th style={{ textAlign: "left", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>Run</th>
                    <th style={{ textAlign: "left", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>Status</th>
                    <th style={{ textAlign: "left", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>Started</th>
                    <th style={{ textAlign: "right", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>Files</th>
                    <th style={{ textAlign: "right", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((run) => (
                    <tr key={run.run_id} className="hb-row-hover" style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 600 }}>{run.bot_name || "—"}</td>
                      <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>{run.client_name || "—"}</td>
                      <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", fontSize: 11.5 }}>#{run.run_id}</td>
                      <td style={{ padding: "12px 16px" }}><Badge tone={run.status === "Success" ? "success" : run.status === "Failed" ? "danger" : "warning"}>{run.status || "—"}</Badge></td>
                      <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 11.5 }}>{run.start_time ? new Date(run.start_time).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "var(--font-mono)" }}>{run.files.length}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <Button variant="ghost" onClick={() => setSelectedRun(run)}><FileText size={13} /> View logs</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="hb-scroll" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th style={{ textAlign: "left", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>Bot</th>
                    <th style={{ textAlign: "left", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>Client</th>
                    <th style={{ textAlign: "right", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>Runs</th>
                    <th style={{ textAlign: "right", padding: "11px 16px", color: "var(--success)", fontWeight: 500, fontSize: 12 }}>Success</th>
                    <th style={{ textAlign: "right", padding: "11px 16px", color: "var(--danger)", fontWeight: 500, fontSize: 12 }}>Failed</th>
                    <th style={{ textAlign: "left", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>Latest</th>
                    <th style={{ textAlign: "right", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((bot) => (
                    <tr
                      key={bot.bot_id ?? bot.bot_name}
                      className="hb-row-hover"
                      onClick={() => setSelectedBot(bot)}
                      style={{ borderBottom: "1px solid var(--border)", cursor: "pointer" }}
                    >
                      <td style={{ padding: "12px 16px", fontWeight: 600 }}>{bot.bot_name || "—"}</td>
                      <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>{bot.client_name || "—"}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "var(--font-mono)" }}>{bot.runCount}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--success)" }}>{bot.successCount}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "var(--font-mono)", color: bot.failedCount > 0 ? "var(--danger)" : "var(--text-dim)" }}>{bot.failedCount}</td>
                      <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 11.5 }}>{bot.latestStart ? new Date(bot.latestStart).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <Button variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedBot(bot); }}>
                          <FileText size={13} /> View logs
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedRun && (
        <RunLogsModal
          api={api}
          bot={{ bot_name: selectedRun.bot_name }}
          run={selectedRun}
          onClose={() => setSelectedRun(null)}
        />
      )}

      {selectedBot && (
        <BotRunHistoryModal
          api={api}
          bot={{ bot_id: selectedBot.bot_id, bot_name: selectedBot.bot_name, client_name: selectedBot.client_name }}
          onClose={() => setSelectedBot(null)}
          onOpenLogs={(ctx) => setSelectedRun(ctx)}
        />
      )}
    </>
  );
}
function BotRunHistoryModal({ api, bot, onClose, onOpenLogs }) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRun, setSelectedRun] = useState(null);

  const RUN_HISTORY_DAYS = 5;

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api(`/dashboard/bot-runs/${bot.bot_id}`);
        setRuns(res || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [api, bot.bot_id]);

  // Filter to the last 5 days and sort newest to oldest
  const filteredRuns = useMemo(() => {
    return [...(runs || [])].sort((a, b) => new Date(b.start_time || 0) - new Date(a.start_time || 0));
  }, [runs]);

  const fmtDateTime = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <>
      <Modal title={`${bot.bot_name} — run history`} onClose={onClose} width={720}>
        <ErrorBanner message={error} onDismiss={() => setError("")} />
        <div className="hb-scroll" style={{ maxHeight: 440, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={{ textAlign: "left", padding: "8px 10px", color: "var(--text-muted)", fontWeight: 500, fontSize: 11.5 }}>Started</th>
                <th style={{ textAlign: "left", padding: "8px 10px", color: "var(--text-muted)", fontWeight: 500, fontSize: 11.5 }}>Status</th>
                <th style={{ textAlign: "right", padding: "8px 10px", color: "var(--text-muted)", fontWeight: 500, fontSize: 11.5 }}>Duration</th>
                <th style={{ textAlign: "right", padding: "8px 10px", color: "var(--text-muted)", fontWeight: 500, fontSize: 11.5 }}>Transactions</th>
                <th style={{ textAlign: "right", padding: "8px 10px", color: "var(--text-muted)", fontWeight: 500, fontSize: 11.5 }}>Logs</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} style={{ padding: 20, textAlign: "center", color: "var(--text-dim)" }}>Loading…</td></tr>
              )}
              {!loading && filteredRuns.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 20, textAlign: "center", color: "var(--text-dim)" }}>No runs in the last {RUN_HISTORY_DAYS} days.</td></tr>
              )}
              {filteredRuns.map((r) => {
                const hasCounts = r.success_count != null || r.failed_count != null;
                const total = (r.success_count || 0) + (r.failed_count || 0);
                return (
                  <tr key={r.run_id} className="hb-row-hover" style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "9px 10px" }}>{fmtDateTime(r.start_time)}</td>
                    <td style={{ padding: "9px 10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <StatusDot status={r.status} />
                        {r.status}
                      </div>
                    </td>
                    <td style={{ padding: "9px 10px", textAlign: "right", fontFamily: "var(--font-mono)" }}>
                      {fmtDuration(r.duration_seconds)}
                    </td>
                    <td style={{ padding: "9px 10px", textAlign: "right", fontFamily: "var(--font-mono)" }}>
                      {hasCounts ? (
                        <span>
                          {total}
                          {r.failed_count > 0 && <span style={{ color: "var(--danger)" }}> ({r.failed_count} failed)</span>}
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{ padding: "9px 10px", textAlign: "right" }}>
                      {(r.status === "Success" || r.status === "Failed") ? (
                        <Button
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenLogs?.({
                              run_id: r.run_id,
                              bot_id: bot.bot_id,
                              bot_name: bot.bot_name,
                              client_name: bot.client_name,
                              status: r.status,
                              start_time: r.start_time,
                            });
                            onClose();
                          }}
                        >
                          <FileText size={12} /> Logs
                        </Button>
                      ) : (
                        <span style={{ color: "var(--text-dim)" }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Modal>

      {selectedRun && (
        <RunLogsModal
          api={api}
          bot={bot}
          run={selectedRun}
          onClose={() => setSelectedRun(null)}
        />
      )}
    </>
  );
}

function getSenderInfo(m, isInternal, activeClientName, currentUserId) {
  const isOwn = Number(m.sender_user_id) === Number(currentUserId);
  const role = (m.sender_role || "").toLowerCase();

  let name = m.sender_name || "";
  let roleLabel = "";
  let roleClass = "";

  if (role === "admin") {
    roleLabel = "Primary Admin";
    roleClass = "primary-admin";
  } else if (role === "admin2") {
    roleLabel = "Admin 2";
    roleClass = "team-admin";
  } else if (role === "admin3") {
    roleLabel = "Admin 3";
    roleClass = "team-admin";
  } else if (role === "client") {
    roleLabel = "Client";
    roleClass = "client";
  } else {
    roleLabel = role ? role.toUpperCase() : "ADMIN";
    roleClass = "team-admin";
  }

  if (!name) {
    if (m.sender_email) {
      name = m.sender_email.split("@")[0];
      name = name.charAt(0).toUpperCase() + name.slice(1);
    } else if (isOwn) {
      name = "You";
    } else if (isInternal) {
      name = roleLabel;
    } else {
      name = activeClientName || "Client";
    }
  }

  return { name, roleLabel, roleClass, isOwn };
}


function formatChatTime(iso, timezone = "Asia/Kolkata") {
  const date = parseServerDate(iso);
  if (!date) return "";
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch (_) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  }
}

function SwipeableMessageRow({
  message: m,
  isOwn,
  senderInfo,
  onReply,
  onQuoteClick,
  activeClientId,
  chatTimezone,
  parentMessage,
}) {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const currentOffsetRef = useRef(0);
  const isDraggingRef = useRef(false);

  const handlePointerDown = (e) => {
    if (e.button != null && e.button !== 0) return;
    if (e.target.closest("button") || e.target.closest("a") || e.target.closest(".hb-chat-quote-card")) return;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    currentOffsetRef.current = 0;
    isDraggingRef.current = true;
    setIsDragging(true);
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch (_) { }
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - startXRef.current;
    const deltaY = Math.abs(e.clientY - startYRef.current);
    if (deltaY > Math.abs(deltaX) && currentOffsetRef.current === 0) {
      return;
    }
    if (deltaX > 0) {
      const clamped = Math.min(deltaX * 0.55, 68);
      currentOffsetRef.current = clamped;
      setDragOffset(clamped);
    }
  };

  const handlePointerEnd = (e) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch (_) { }

    if (currentOffsetRef.current >= 35) {
      onReply(m);
    }
    setDragOffset(0);
    currentOffsetRef.current = 0;
  };

  const triggered = dragOffset >= 35;

  return (
    <div
      className="hb-chat-swipe-wrap"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <div
        className="hb-chat-swipe-indicator"
        style={{
          opacity: dragOffset > 8 ? Math.min(dragOffset / 35, 1) : 0,
          transform: `scale(${Math.min(0.6 + dragOffset / 60, 1.15)})`,
          background: triggered ? "var(--accent)" : "var(--surface-3)",
          color: triggered ? "#fff" : "var(--text-muted)",
        }}
      >
        <Reply size={13} />
      </div>

      <div
        className={`hb-chat-row ${isOwn ? "own" : "other"}`}
        id={`msg-${m.id}`}
        style={{
          transform: `translateX(${dragOffset}px)`,
          transition: isDragging ? "none" : "transform 0.22s cubic-bezier(0.18, 0.89, 0.32, 1.28)",
          width: "100%",
        }}
      >
        {!isOwn && (
          <div
            className="hb-chat-mini-avatar"
            style={
              activeClientId === "internal"
                ? { background: "linear-gradient(135deg, var(--accent), var(--accent-strong))", color: "#fff" }
                : undefined
            }
          >
            {initialsOf(senderInfo.name || senderInfo.roleLabel)}
          </div>
        )}

        {isOwn && (
          <div className="hb-chat-hover-actions own">
            <button
              type="button"
              className="hb-chat-action-btn"
              title="Reply"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onReply(m);
              }}
            >
              <Reply size={13} />
            </button>
          </div>
        )}

        <div
          className={`hb-chat-bubble ${isOwn ? "own" : "other"}`}
          onDoubleClick={() => onReply(m)}
          title="Double-click or swipe to reply"
        >
          {!isOwn && (activeClientId === "internal" || senderInfo.roleClass !== "client") && (
            <div className="hb-chat-sender-header">
              <span className="hb-chat-sender-name">
                {senderInfo.name}
              </span>
              {senderInfo.roleLabel && (
                <span className={`hb-chat-role-chip ${senderInfo.roleClass}`}>
                  {senderInfo.roleLabel}
                </span>
              )}
            </div>
          )}

          {parentMessage && (
            <div
              className="hb-chat-quote-card"
              onClick={(e) => {
                e.stopPropagation();
                onQuoteClick(parentMessage.id);
              }}
              title="Click to view original message"
            >
              <div className="hb-chat-quote-sender">
                <Reply size={10} />
                <span>{parentMessage.senderName}</span>
              </div>
              <div className="hb-chat-quote-text">{parentMessage.message}</div>
            </div>
          )}

          <div className="hb-chat-message-text">{m.message}</div>
          <div className="hb-chat-bubble-time">
            <span>{formatChatTime(m.created_at, chatTimezone)}</span>
            {isOwn && <span className="hb-chat-read-tick">{m.is_read ? "✓✓" : "✓"}</span>}
          </div>
        </div>

        {!isOwn && (
          <div className="hb-chat-hover-actions other">
            <button
              type="button"
              className="hb-chat-action-btn"
              title="Reply"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onReply(m);
              }}
            >
              <Reply size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MessagesView({ api, role, session, liveEvents }) {
  const isPrimaryAdmin = role === "admin";
  const isTeamAdmin = ["admin", "admin2", "admin3"].includes(role);
  const isAdmin = isTeamAdmin;
  const [threads, setThreads] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientTimezones, setClientTimezones] = useState({});
  const [activeClientId, setActiveClientId] = useState("");
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [newConversationForClient, setNewConversationForClient] = useState(null);
  const [activeMessages, setActiveMessages] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all"); // "all" | "team" | "clients"
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const messagesEndRef = useRef(null);

  const currentUserId = useMemo(() => {
    try {
      const token = session?.token;
      if (!token) return null;
      const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      return payload?.sub != null ? Number(payload.sub) : null;
    } catch (_) {
      return null;
    }
  }, [session?.token]);

  const loadThreads = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    setError("");
    try {
      const res = await api("/messages/threads");
      const list = Array.isArray(res) ? res : (res?.data || []);
      setThreads(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || "Failed to load conversations.");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [api]);

  const loadThread = useCallback(async (threadId, silent = false) => {
    if (!threadId) {
      setActiveMessages([]);
      return;
    }
    if (!silent) setThreadLoading(true);
    try {
      const res = await api(`/messages/threads/${threadId}`);
      const list = Array.isArray(res) ? res : (res?.data || []);
      setActiveMessages(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || "Failed to load conversation.");
    } finally {
      if (!silent) setThreadLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadThreads(true);
  }, [loadThreads]);

  useEffect(() => {
    const timer = setInterval(() => loadThreads(false), 15000);
    return () => clearInterval(timer);
  }, [loadThreads]);

  // Live WebSocket refresh for real-time incoming messages
  useEffect(() => {
    if (!liveEvents?.length) return;
    const latest = liveEvents[0];
    if (latest?.event === "new_message" || latest?.sound_type === "message") {
      loadThreads(false);
      if (activeThreadId) {
        loadThread(activeThreadId, true);
      }
    }
  }, [liveEvents, activeThreadId, loadThread, loadThreads]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const res = await api("/clients/");
        const list = res?.data || res || [];
        setClients(Array.isArray(list) ? list : []);
        if (Array.isArray(list)) {
          setClientTimezones((prev) => {
            const next = { ...prev };
            list.forEach((c) => {
              if (c?.client_id && c?.timezone) next[Number(c.client_id)] = c.timezone;
            });
            return next;
          });
        }
      } catch (err) {
        setError(err.message || "Failed to load clients.");
      }
    })();
  }, [api, isAdmin]);

  // Keep the active client's timezone fresh
  useEffect(() => {
    if (activeClientId === "internal") return;
    const id = Number(activeClientId || session?.clientId);
    if (!id) return;
    const known = clientTimezones[id];
    if (known) return;
    (async () => {
      try {
        const res = await api(`/clients/${id}`);
        const client = res?.data || res;
        if (client?.timezone) {
          setClientTimezones((prev) => ({ ...prev, [id]: client.timezone }));
        }
      } catch (_) { /* keep chat usable if timezone lookup is unavailable */ }
    })();
  }, [api, activeClientId, session?.clientId, clientTimezones]);

  // Build conversations: Internal Team chat + client chats
  const conversations = useMemo(() => {
    if (!isAdmin) {
      if (!threads.length) return [];
      const latest = [...threads].sort((a, b) =>
        new Date(b.last_message_at || b.updated_at || 0).getTime() -
        new Date(a.last_message_at || a.updated_at || 0).getTime()
      )[0];
      return [{
        clientId: Number(latest?.client_id || session?.clientId),
        name: "StayAhead Support",
        threadId: latest?.id,
        latest,
        unread: threads.reduce((sum, t) => sum + Number(t.unread_count || 0), 0),
        isInternal: false,
      }];
    }

    const map = new Map();
    let internalConversation = null;

    for (const thread of threads) {
      const isInternal = Boolean(thread.is_internal || thread.client_id == null);

      if (isInternal) {
        const latestTime = new Date(thread.last_message_at || thread.updated_at || 0).getTime();
        const existingTime = internalConversation
          ? new Date(internalConversation.latest?.last_message_at || internalConversation.latest?.updated_at || 0).getTime()
          : -1;

        if (!internalConversation || latestTime >= existingTime) {
          internalConversation = {
            clientId: "internal",
            name: "Internal Team",
            threadId: thread.id,
            latest: thread,
            unread: Number(thread.unread_count || 0) + Number(internalConversation?.unread || 0),
            timezone: "Asia/Kolkata",
            isInternal: true,
          };
        } else {
          internalConversation.unread += Number(thread.unread_count || 0);
        }
        continue;
      }

      const id = Number(thread.client_id);
      const existing = map.get(id);
      const latestTime = new Date(thread.last_message_at || thread.updated_at || 0).getTime();
      const existingTime = existing ? new Date(existing.latest?.last_message_at || existing.latest?.updated_at || 0).getTime() : -1;
      if (!existing || latestTime >= existingTime) {
        map.set(id, {
          clientId: id,
          name: thread.client_name || `Client #${id}`,
          threadId: thread.id,
          latest: thread,
          unread: Number(thread.unread_count || 0) + Number(existing?.unread || 0),
          timezone: thread.timezone || clientTimezones[id] || null,
          isInternal: false,
        });
      } else {
        existing.unread += Number(thread.unread_count || 0);
        if (!existing.timezone && (thread.timezone || clientTimezones[id])) {
          existing.timezone = thread.timezone || clientTimezones[id];
        }
      }
    }

    // Always provide "Internal Team" chat option for all admins
    if (!internalConversation) {
      internalConversation = {
        clientId: "internal",
        name: "Internal Team",
        threadId: null,
        latest: null,
        unread: 0,
        timezone: "Asia/Kolkata",
        isInternal: true,
      };
    }

    const clientConvs = Array.from(map.values()).sort((a, b) =>
      new Date(b.latest?.last_message_at || 0).getTime() - new Date(a.latest?.last_message_at || 0).getTime()
    );

    // Return Internal Team at the top, then client conversations
    return [internalConversation, ...clientConvs];
  }, [isAdmin, threads, clientTimezones, session?.clientId]);

  const filteredConversations = useMemo(() => {
    let list = conversations;
    if (categoryFilter === "team") {
      list = list.filter((c) => c.isInternal);
    } else if (categoryFilter === "clients") {
      list = list.filter((c) => !c.isInternal);
    }
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => [c.name, c.latest?.subject, c.latest?.last_message]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q)));
  }, [conversations, search, categoryFilter]);

  const activeConversation = conversations.find(
    (c) => String(c.clientId) === String(activeClientId)
  ) || null;

  useEffect(() => {
    if (!isAdmin && !activeClientId && session?.clientId) {
      setActiveClientId(String(session.clientId));
      return;
    }
    if (!activeClientId && conversations.length) {
      setActiveClientId(String(conversations[0].clientId));
      setActiveThreadId(conversations[0].threadId || null);
    }
  }, [activeClientId, conversations, isAdmin, session?.clientId]);

  useEffect(() => {
    if (!activeConversation) {
      setActiveThreadId(null);
      setActiveMessages([]);
      return;
    }
    if (newConversationForClient && String(newConversationForClient) === String(activeClientId)) return;
    if (String(activeClientId) === String(activeConversation.clientId) && activeConversation.threadId) {
      setActiveThreadId(activeConversation.threadId);
    }
  }, [activeConversation, activeClientId, newConversationForClient]);

  useEffect(() => {
    loadThread(activeThreadId);
    if (!activeThreadId) return;
    const timer = setInterval(() => loadThread(activeThreadId, true), 8000);
    return () => clearInterval(timer);
  }, [activeThreadId, loadThread]);

  // Mark incoming messages read
  useEffect(() => {
    if (!activeMessages.length) return;
    const unread = activeMessages.filter(
      (m) => !m.is_read && Number(m.sender_user_id) !== Number(currentUserId)
    );
    if (!unread.length) return;

    let cancelled = false;
    (async () => {
      await Promise.all(unread.map(async (m) => {
        try {
          await api(`/messages/${m.id}/read`, { method: "PATCH" });
        } catch (_) { /* keep chat usable */ }
      }));
      if (!cancelled) {
        setActiveMessages((prev) => prev.map((m) =>
          unread.some((u) => u.id === m.id)
            ? { ...m, is_read: true, read_at: new Date().toISOString() }
            : m
        ));
        loadThreads(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeMessages.length, activeThreadId, currentUserId, api, loadThreads]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activeMessages.length, activeThreadId]);

  const messagesMap = useMemo(() => {
    const map = new Map();
    activeMessages.forEach((m) => {
      if (m?.id != null) map.set(Number(m.id), m);
    });
    return map;
  }, [activeMessages]);

  const scrollToMessage = useCallback((msgId) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.transition = "filter 0.3s, transform 0.3s";
      el.style.filter = "drop-shadow(0 0 10px var(--accent))";
      setTimeout(() => {
        el.style.filter = "none";
      }, 1400);
    }
  }, []);

  const handleReply = useCallback((m) => {
    const activeDispName = activeClientId === "internal"
      ? "Internal Team"
      : (activeConversation?.name || "Support");
    const sender = getSenderInfo(m, activeClientId === "internal", activeDispName, currentUserId);
    setReplyingTo({
      id: m.id,
      message: m.message,
      senderName: sender.isOwn ? "You" : sender.name,
      subject: m.subject,
    });
    setTimeout(() => {
      const textarea = document.querySelector(".hb-chat-composer textarea");
      textarea?.focus();
      textarea?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
    }, 40);
  }, [activeClientId, activeConversation?.name, currentUserId]);

  const chooseConversation = useCallback((clientId, threadId = null) => {
    setActiveClientId(String(clientId));
    setActiveThreadId(threadId ? Number(threadId) : null);
    setNewConversationForClient(null);
    setReplyingTo(null);
    setMessage("");
    setSubject("");
    setSuccess("");
    setError("");
  }, []);

  const startNewChat = (clientId) => {
    if (!clientId) return;
    setActiveClientId(String(clientId));
    setActiveThreadId(null);
    setNewConversationForClient(String(clientId));
    setReplyingTo(null);
    setActiveMessages([]);
    setMessage("");
    setSubject(clientId === "internal" ? "Internal Team Discussion" : "");
    setSuccess("");
  };

  const sendMessage = async (e) => {
    e?.preventDefault?.();
    const text = message.trim();
    const isInternal = activeClientId === "internal" || activeConversation?.isInternal;

    const targetClientId = isInternal
      ? null
      : (isAdmin ? (activeConversation?.clientId || activeClientId) : session?.clientId);

    if (!isInternal && !targetClientId) return;
    if (!text || sending) return;

    const last = activeMessages[activeMessages.length - 1];
    const defaultSubject = isInternal ? "Internal Team Discussion" : "HeartBeat Support";
    const cleanSubject = String(
      subject.trim() || replyingTo?.subject || last?.subject || activeConversation?.latest?.subject || defaultSubject
    ).replace(/^(re:\s*)+/i, "").trim();
    const finalSubject = activeThreadId ? `Re: ${cleanSubject}` : cleanSubject;

    // FIX: Only link reply_to_id if the user explicitly clicked/swiped to reply!
    const replyTargetId = replyingTo?.id ? Number(replyingTo.id) : null;

    setSending(true);
    setError("");
    setSuccess("");
    try {
      const res = await api("/messages", {
        method: "POST",
        body: JSON.stringify({
          client_id: isInternal ? null : Number(targetClientId),
          thread_id: activeThreadId ? Number(activeThreadId) : null,
          reply_to_id: replyTargetId,
          subject: finalSubject,
          message: text,
        }),
      });

      const created = res?.data || res;
      setMessage("");
      setSubject("");
      setReplyingTo(null);
      if (created) setActiveMessages((prev) => [...prev, created]);
      if (created?.thread_id) setActiveThreadId(Number(created.thread_id));
      setNewConversationForClient(null);
      await loadThreads(false);
      setSuccess("Message sent");
      window.setTimeout(() => setSuccess(""), 1800);
    } catch (err) {
      setError(err.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const onComposerKeyDown = (e) => {
    if (e.key === "Escape" && replyingTo) {
      setReplyingTo(null);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  const parseServerDate = (iso) => {
    if (!iso) return null;
    if (iso instanceof Date) return iso;
    const value = String(iso).trim();
    if (!value) return null;
    const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const getChatTimezone = (clientId = activeClientId) =>
    clientId === "internal"
      ? "Asia/Kolkata"
      : (clientTimezones[Number(clientId)] || (Number(clientId) === Number(session?.clientId) ? session?.timezone : null) || "Asia/Kolkata");

  const getZonedParts = (iso, timezone) => {
    const date = parseServerDate(iso);
    if (!date) return null;
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    }).formatToParts(date);
    const out = {};
    parts.forEach((p) => { if (p.type !== "literal") out[p.type] = p.value; });
    return out;
  };

  const formatChatTime = (iso, timezone = getChatTimezone()) => {
    const date = parseServerDate(iso);
    if (!date) return "";
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone, hour: "2-digit", minute: "2-digit", hour12: true,
    }).format(date);
  };

  const formatListTime = (iso, timezone = getChatTimezone()) => {
    const date = parseServerDate(iso);
    if (!date) return "";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs >= 0 && diffMs < 60000) return "now";
    if (diffMs >= 60000 && diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m`;
    if (diffMs >= 3600000 && diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h`;
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 1) return "1d";
    if (diffDays < 7) {
      try {
        return new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).format(date);
      } catch (_) {
        return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
      }
    }
    try {
      return new Intl.DateTimeFormat("en-US", { timeZone: timezone, day: "numeric", month: "short" }).format(date);
    } catch (_) {
      return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" }).format(date);
    }
  };

  const dayLabel = (iso, timezone = getChatTimezone()) => {
    const p = getZonedParts(iso, timezone);
    if (!p) return "";
    const now = new Date();
    const n = getZonedParts(now.toISOString(), timezone);
    if (p.year === n.year && p.month === n.month && p.day === n.day) return "Today";
    const yesterday = new Date(now.getTime() - 86400000);
    const y = getZonedParts(yesterday.toISOString(), timezone);
    if (p.year === y.year && p.month === y.month && p.day === y.day) return "Yesterday";
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone, day: "2-digit", month: "short", year: p.year !== n.year ? "numeric" : undefined,
    }).format(parseServerDate(iso));
  };

  let previousDay = "";
  const activeDisplayName = activeClientId === "internal"
    ? "Internal Team"
    : (isAdmin
      ? (activeConversation?.name || clients.find((c) => String(c.client_id) === String(activeClientId))?.client_name || "Client")
      : "StayAhead Support");

  return (
    <div className="hb-chat-page">
      <div className="hb-chat-heading">
        <div>
          <div className="hb-eyebrow">Communication</div>
          <h1 className="hb-messages-title">{activeClientId === "internal" ? "Internal Team Chat" : (isAdmin ? "Messages" : "StayAhead Support")}</h1>
          <p className="hb-messages-subtitle">
            {activeClientId === "internal"
              ? "Confidential team discussions between admins (admin, admin2, admin3)."
              : (isPrimaryAdmin
                ? "Stay connected with your team and clients."
                : (isAdmin ? "Internal team communication." : "Chat directly with the StayAhead support team."))}
          </p>
        </div>
        <Button variant="ghost" onClick={() => loadThreads(true)} disabled={loading}>
          <RotateCcw size={13} className={loading ? "hb-spin" : ""} /> Refresh
        </Button>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError("")} />
      {success && <InfoBanner message={success} onDismiss={() => setSuccess("")} />}

      <div className="hb-chat-shell hb-chat-shell-v2">
        <aside className="hb-chat-sidebar hb-chat-sidebar-v2">
          <div className="hb-chat-sidebar-top">
            <div className="hb-chat-sidebar-title">
              <strong>Chats</strong>
              {conversations.length > 0 && <span>{conversations.length}</span>}
            </div>
            <div className="hb-message-search-wrap">
              <Search size={14} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" />
            </div>
            {isAdmin && (
              <div className="hb-chat-category-tabs">
                <button
                  type="button"
                  className={`hb-chat-tab-pill ${categoryFilter === "all" ? "active" : ""}`}
                  onClick={() => setCategoryFilter("all")}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`hb-chat-tab-pill ${categoryFilter === "team" ? "active" : ""}`}
                  onClick={() => setCategoryFilter("team")}
                >
                  Team
                </button>
                <button
                  type="button"
                  className={`hb-chat-tab-pill ${categoryFilter === "clients" ? "active" : ""}`}
                  onClick={() => setCategoryFilter("clients")}
                >
                  Clients
                </button>
              </div>
            )}
          </div>

          <div className="hb-chat-conversation-list hb-scroll">
            {loading && !conversations.length ? (
              <div className="hb-chat-empty"><Loader2 size={18} className="hb-spin" /> Loading chats…</div>
            ) : filteredConversations.length === 0 ? (
              <div className="hb-chat-empty"><MessageSquare size={20} /><span>{search ? "No chats found" : "No conversations yet"}</span></div>
            ) : filteredConversations.map((c) => (
              <button
                key={c.clientId}
                type="button"
                className={`hb-chat-conversation hb-chat-conversation-v2${String(activeClientId) === String(c.clientId) ? " active" : ""}`}
                onClick={() => chooseConversation(c.clientId, c.threadId)}
              >
                <div className={`hb-chat-avatar hb-chat-avatar-v2 ${c.unread > 0 ? "has-unread" : ""}`} style={c.isInternal ? { background: "linear-gradient(135deg, var(--accent), var(--accent-strong))", color: "#fff" } : undefined}>
                  {c.isInternal ? "👥" : initialsOf(c.name)}
                </div>
                <div className="hb-chat-conversation-copy">
                  <div className="hb-chat-conversation-top">
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                      <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</strong>
                      {c.isInternal && (
                        <span style={{ fontSize: 9.5, padding: "1px 6px", borderRadius: 4, background: "var(--accent-dim)", color: "var(--accent)", fontWeight: 700, flexShrink: 0 }}>
                          Team
                        </span>
                      )}
                    </div>
                    <span className="hb-chat-list-time">{formatListTime(c.latest?.last_message_at, c.timezone || clientTimezones[Number(c.clientId)] || "Asia/Kolkata")}</span>
                  </div>
                  <div className="hb-chat-conversation-preview">
                    <span className={c.unread > 0 ? "unread-bold" : ""}>
                      {c.latest?.last_message ||
                        c.latest?.subject ||
                        (c.isInternal ? "Internal team discussion" : "Start a conversation")}
                    </span>

                    {c.unread > 0 && (
                      <span className="hb-chat-ig-dot" title={`${c.unread} unread`} />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {isAdmin && (
            <div className="hb-chat-new-wrap hb-chat-new-wrap-v2">
              <select value="" onChange={(e) => startNewChat(e.target.value)} className="hb-control">
                <option value="">＋ New conversation</option>
                <option value="internal">👥 Internal Team Chat</option>
                {clients.length > 0 && (
                  <optgroup label="Client Chats">
                    {clients.map((c) => <option key={c.client_id} value={c.client_id}>{c.client_name}</option>)}
                  </optgroup>
                )}
              </select>
            </div>
          )}
        </aside>

        <section className="hb-chat-main hb-chat-main-v2">
          {activeClientId ? (
            <>
              <header className="hb-chat-main-head hb-chat-main-head-v2">
                <div className="hb-chat-avatar large hb-chat-avatar-v2" style={activeClientId === "internal" ? { background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", color: "#fff" } : undefined}>
                  {activeClientId === "internal" ? "👥" : initialsOf(activeDisplayName)}
                </div>
                <div className="hb-chat-person">
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                    <strong>{activeDisplayName}</strong>
                    {activeClientId === "internal" && (
                      <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, background: "rgba(59,130,246,0.18)", color: "var(--accent-2)", fontWeight: 700 }}>
                        Internal Admins
                      </span>
                    )}
                  </div>
                  <span>
                    {activeClientId === "internal"
                      ? "Internal discussion between admin, admin2, and admin3"
                      : (activeThreadId ? (activeMessages.length ? `${activeMessages.length} messages` : "Conversation") : "New conversation")}
                  </span>
                </div>
                {activeThreadId && <div className="hb-chat-thread-subject">{activeMessages[0]?.subject?.replace(/^(re:\s*)+/i, "") || activeConversation?.latest?.subject || "Conversation"}</div>}
              </header>

              <div className="hb-chat-thread hb-scroll">
                {threadLoading ? (
                  <div className="hb-chat-welcome"><Loader2 size={19} className="hb-spin" /><span>Opening conversation…</span></div>
                ) : activeMessages.length === 0 ? (
                  <div className="hb-chat-welcome">
                    <div className="hb-message-empty-icon"><MessageSquare size={20} /></div>
                    <strong>Start the conversation</strong>
                    <span>{activeClientId === "internal" ? "Send a message to your internal admin team." : (isAdmin ? "Send a friendly message to this client." : "Send a message to the StayAhead support team.")}</span>
                  </div>
                ) : activeMessages.map((m) => {
                  const senderInfo = getSenderInfo(m, activeClientId === "internal", activeDisplayName, currentUserId);
                  const chatTimezone = getChatTimezone(activeClientId);
                  const label = dayLabel(m.created_at, chatTimezone);
                  const showDay = label !== previousDay;
                  previousDay = label;

                  const parent = m.reply_to_id ? messagesMap.get(Number(m.reply_to_id)) : null;
                  const parentSender = parent
                    ? getSenderInfo(parent, activeClientId === "internal", activeDisplayName, currentUserId)
                    : null;
                  const parentMessage = parent ? {
                    id: parent.id,
                    message: parent.message,
                    senderName: parentSender.isOwn ? "You" : parentSender.name,
                  } : null;

                  return (
                    <React.Fragment key={m.id}>
                      {showDay && <div className="hb-chat-day"><span>{label}</span></div>}
                      <SwipeableMessageRow
                        message={m}
                        isOwn={senderInfo.isOwn}
                        senderInfo={senderInfo}
                        onReply={handleReply}
                        onQuoteClick={scrollToMessage}
                        activeClientId={activeClientId}
                        chatTimezone={chatTimezone}
                        parentMessage={parentMessage}
                      />
                    </React.Fragment>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <form className="hb-chat-composer hb-chat-composer-v2" onSubmit={sendMessage}>
                {!activeThreadId && (
                  <input className="hb-chat-subject-input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
                )}
                {replyingTo && (
                  <div className="hb-chat-reply-banner">
                    <div className="hb-chat-reply-banner-content">
                      <Reply size={14} className="hb-chat-reply-banner-icon" />
                      <div className="hb-chat-reply-banner-text">
                        <span className="hb-chat-reply-banner-sender">Replying to {replyingTo.senderName}:</span>
                        <span className="hb-chat-reply-banner-snippet">{replyingTo.message}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="hb-chat-reply-close"
                      onClick={() => setReplyingTo(null)}
                      title="Cancel reply"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                <div className="hb-chat-composer-row">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={onComposerKeyDown}
                    placeholder={replyingTo ? `Replying to ${replyingTo.senderName}…` : "Message…"}
                    rows={1}
                  />
                  <button type="submit" className="hb-chat-send" disabled={sending || !message.trim()} title="Send message">
                    {sending ? <Loader2 size={18} className="hb-spin" /> : <Send size={18} />}
                  </button>
                </div>
                <div className="hb-chat-composer-hint">Enter to send · Shift + Enter for new line</div>
              </form>
            </>
          ) : (
            <div className="hb-chat-welcome full">
              <div className="hb-chat-empty-hero"><MessageSquare size={22} /></div>
              <strong>{isAdmin ? "Select a chat" : "No messages yet"}</strong>
              <span>{isAdmin ? "Choose a client from the left to start chatting." : "Your conversation with StayAhead will appear here."}</span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ReportsView({ api, onOpenLogs, isAdmin }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedBot, setSelectedBot] = useState(null);
  const [department, setDepartment] = useState(null);
  const [period, setPeriod] = useState("day");
  const [search, setSearch] = useState("");

  const departmentOptions = useDepartmentOptions(api);
  const filterGroups = useMemo(() => [
    { key: "department", icon: Building2, label: "Department", value: department, onChange: setDepartment, options: departmentOptions },
    { key: "period", icon: CalendarClock, label: "Period", value: period, onChange: (v) => setPeriod(v || "day"), options: PERIOD_OPTIONS, isActive: (v) => v && v !== "day" },
  ], [department, departmentOptions, period]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (department) params.set("department", department);
        if (period && period !== "all") params.set("period", period);
        const qs = params.toString();
        const res = await api(`/dashboard/bot-summary${qs ? `?${qs}` : ""}`);
        setRows(res || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [api, department, period]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.bot_name || ""} ${r.client_name || ""} ${r.department || ""}`.toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <div>
      <ErrorBanner message={error} onDismiss={() => setError("")} />

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: 10, marginBottom: 14, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }}>
        <div style={{ position: "relative", flex: "1 1 260px", minWidth: 200 }}>
          <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)", pointerEvents: "none" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bot, client or department"
            aria-label="Search bot, client or department"
            style={{
              width: "100%", boxSizing: "border-box", padding: "9px 12px 9px 34px",
              background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)",
              borderRadius: 9, outline: "none", fontSize: 13,
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
          />
        </div>
        <FilterPopover groups={filterGroups} />
        <ActiveFilterChips groups={filterGroups} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
          {filteredRows.length} bot{filteredRows.length === 1 ? "" : "s"}{search.trim() && rows.length !== filteredRows.length ? ` of ${rows.length}` : ""} — click a row to see run history
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <div className="hb-scroll" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={{ textAlign: "left", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>Bot</th>
                <th style={{ textAlign: "left", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>Client</th>
                <th style={{ textAlign: "left", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>Department</th>
                <th style={{ textAlign: "right", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>Total runs</th>
                <th style={{ textAlign: "right", padding: "11px 16px", color: "var(--success)", fontWeight: 500, fontSize: 12 }}>Success</th>
                <th style={{ textAlign: "right", padding: "11px 16px", color: "var(--danger)", fontWeight: 500, fontSize: 12 }}>Failed</th>
                <th style={{ textAlign: "left", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12, width: 160 }}>Success rate</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "var(--text-dim)" }}>Loading…</td></tr>
              )}
              {!loading && filteredRows.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "var(--text-dim)" }}>
                  {rows.length === 0 ? "No bots yet." : "No bots match your search."}
                </td></tr>
              )}
              {filteredRows.map((r) => {
                const total = r.total_runs || 0;
                const rate = total > 0 ? Math.round((r.success_count / total) * 100) : null;
                return (
                  <tr
                    key={r.bot_id}
                    className="hb-row-hover"
                    onClick={() => setSelectedBot(r)}
                    style={{ borderBottom: "1px solid var(--border)", cursor: "pointer" }}
                  >
                    <td style={{ padding: "11px 16px", fontWeight: 500 }}>{r.bot_name}</td>
                    <td style={{ padding: "11px 16px", color: "var(--text-muted)" }}>{r.client_name}</td>
                    <td style={{ padding: "11px 16px" }}>{r.department ? <Badge tone="accent">{r.department}</Badge> : <span style={{ color: "var(--text-dim)" }}>—</span>}</td>
                    <td style={{ padding: "11px 16px", textAlign: "right", fontFamily: "var(--font-mono)" }}>{total}</td>
                    <td style={{ padding: "11px 16px", textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--success)" }}>{r.success_count}</td>
                    <td style={{ padding: "11px 16px", textAlign: "right", fontFamily: "var(--font-mono)", color: r.failed_count > 0 ? "var(--danger)" : "var(--text-dim)" }}>{r.failed_count}</td>
                    <td style={{ padding: "11px 16px" }}>
                      {rate === null ? (
                        <span style={{ color: "var(--text-dim)", fontSize: 12 }}>—</span>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: "var(--surface-3)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{
                              width: `${rate}%`, height: "100%", transition: "width .5s ease",
                              background: rate >= 90 ? "var(--success)" : rate >= 60 ? "var(--warning)" : "var(--danger)",
                            }} />
                          </div>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", width: 34 }}>{rate}%</span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedBot && (
        <BotRunHistoryModal
          api={api}
          bot={selectedBot}
          onClose={() => setSelectedBot(null)}
          onOpenLogs={isAdmin ? onOpenLogs : null}   // client ku null → logs option hide
        />
      )}
    </div>
  );
}

function FailureStageBar({ stage, count, maxCount, index }) {
  const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "7px 0",
      animation: `hb-rise .35s ease ${index * 0.03}s both`,
    }}>
      <div style={{ width: 150, fontSize: 12.5, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>
        {stage}
      </div>
      <div style={{ flex: 1, height: 8, background: "var(--surface-3)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "var(--danger)", borderRadius: 4, transition: "width .5s ease" }} />
      </div>
      <div style={{ width: 30, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--danger)", flexShrink: 0 }}>
        {count}
      </div>
    </div>
  );
}
/* ------------------------------------------------------------------ */
/* Failures — dedicated view for triaging failed runs: breakdown by    */
/* failure stage, then the full list with error messages, filterable   */
/* by department / client / period. Reuses the same query params the   */
/* rest of the dashboard already established.                          */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* NEW: BotFailuresModal — per-bot failed-run list with the same        */
/* expand-to-see-full-error-message behaviour the old flat table had.   */
/* ------------------------------------------------------------------ */
function BotFailuresModal({ bot, rows, onClose }) {
  const [expandedRow, setExpandedRow] = useState(null);
  const botRows = useMemo(
    () => rows
      .filter((r) => (r.bot_id ?? r.bot_name) === (bot.bot_id ?? bot.bot_name))
      .sort((a, b) => new Date(b.start_time || 0) - new Date(a.start_time || 0)),
    [rows, bot]
  );

  return (
    <Modal title={`${bot.bot_name} — failed runs`} onClose={onClose} width={720}>
      <div className="hb-scroll" style={{ maxHeight: 460, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th style={{ textAlign: "left", padding: "8px 10px", color: "var(--text-muted)", fontWeight: 500, fontSize: 11.5 }}>Stage</th>
              <th style={{ textAlign: "left", padding: "8px 10px", color: "var(--text-muted)", fontWeight: 500, fontSize: 11.5 }}>Error</th>
              <th style={{ textAlign: "right", padding: "8px 10px", color: "var(--text-muted)", fontWeight: 500, fontSize: 11.5 }}>When</th>
            </tr>
          </thead>
          <tbody>
            {botRows.length === 0 && (
              <tr><td colSpan={3} style={{ padding: 20, textAlign: "center", color: "var(--text-dim)" }}>No failed runs found.</td></tr>
            )}
            {botRows.map((r) => {
              const isExpanded = expandedRow === r.run_id;
              return (
                <React.Fragment key={r.run_id}>
                  <tr
                    className="hb-row-hover"
                    onClick={() => setExpandedRow(isExpanded ? null : r.run_id)}
                    style={{ borderBottom: isExpanded ? "none" : "1px solid var(--border)", cursor: "pointer" }}
                  >
                    <td style={{ padding: "9px 10px" }}><Badge tone="danger">{r.failure_stage || "Unknown"}</Badge></td>
                    <td style={{
                      padding: "9px 10px", color: "var(--text-muted)", maxWidth: 320,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: isExpanded ? "normal" : "nowrap",
                    }}>
                      {r.error_message || "—"}
                    </td>
                    <td style={{ padding: "9px 10px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--text-dim)" }}>
                      {timeAgo(r.start_time)}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <td colSpan={3} style={{ padding: "0 10px 12px" }}>
                        <div style={{
                          background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8,
                          padding: "10px 12px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)",
                        }}>
                          {r.error_message || "No error message was captured for this run."}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Failures — dedicated view for triaging failed runs. Grouped by bot   */
/* (same pattern as the Logs view), with a per-bot modal for the full   */
/* list of failed runs and error messages. Default period is "day" so   */
/* it opens on today's failures; the period filter (week/month/all)     */
/* re-queries the backend the same way Reports and the Dashboard do.    */
/* ------------------------------------------------------------------ */
function FailuresView({ api, isAdmin }) {
  const [rows, setRows] = useState([]);
  const [stageSummary, setStageSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [department, setDepartment] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [period, setPeriod] = useState("day");
  const [selectedBot, setSelectedBot] = useState(null);

  const departmentOptions = useDepartmentOptions(api);
  const clientOptions = useClientOptions(api);
  const filterGroups = useMemo(() => {
    const groups = [];
    if (isAdmin) groups.push({ key: "client", icon: Users, label: "Client", value: clientId, onChange: setClientId, options: clientOptions });
    groups.push({ key: "department", icon: Building2, label: "Department", value: department, onChange: setDepartment, options: departmentOptions });
    groups.push({ key: "period", icon: CalendarClock, label: "Period", value: period, onChange: (v) => setPeriod(v || "day"), options: PERIOD_OPTIONS, isActive: (v) => v && v !== "day" });
    return groups;
  }, [isAdmin, clientId, clientOptions, department, departmentOptions, period]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (department) params.set("department", department);
        if (isAdmin && clientId) params.set("client_id", clientId);
        if (period && period !== "all") params.set("period", period);
        const qs = params.toString();
        const suffix = qs ? `?${qs}` : "";
        const [failures, stages] = await Promise.all([
          api(`/dashboard/failures${suffix}`),
          api(`/dashboard/failure-stage-summary${suffix}`),
        ]);
        setRows(failures || []);
        setStageSummary(stages || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [api, department, clientId, period, isAdmin]);

  const maxStageCount = stageSummary.reduce((m, s) => Math.max(m, s.count), 0);

  // One row per bot instead of one row per failed run.
  const groupedByBot = useMemo(() => {
    const map = new Map();
    for (const row of rows) {
      const key = row.bot_id ?? row.bot_name;
      if (!map.has(key)) {
        map.set(key, {
          bot_id: row.bot_id,
          bot_name: row.bot_name,
          client_name: row.client_name,
          count: 0,
          stages: new Map(),
          latestStart: row.start_time,
        });
      }
      const g = map.get(key);
      g.count += 1;
      const stage = row.failure_stage || "Unknown";
      g.stages.set(stage, (g.stages.get(stage) || 0) + 1);
      if (row.start_time && (!g.latestStart || new Date(row.start_time) > new Date(g.latestStart))) {
        g.latestStart = row.start_time;
      }
    }
    return Array.from(map.values())
      .map((g) => {
        let topStage = "Unknown";
        let topCount = -1;
        g.stages.forEach((c, s) => { if (c > topCount) { topCount = c; topStage = s; } });
        return { ...g, topStage };
      })
      .sort((a, b) => b.count - a.count);
  }, [rows]);

  return (
    <div>
      <ErrorBanner message={error} onDismiss={() => setError("")} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ color: "var(--text-muted)", fontSize: 13.5, paddingTop: 8 }}>
          {rows.length} failed run{rows.length === 1 ? "" : "s"} across {groupedByBot.length} bot{groupedByBot.length === 1 ? "" : "s"} — click a row for details
        </div>
        <div>
          <FilterPopover groups={filterGroups} />
          <ActiveFilterChips groups={filterGroups} />
        </div>
      </div>

      {/* Failure-stage breakdown — shows where in the process bots are failing most */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
        padding: "16px 18px", marginBottom: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <AlertOctagon size={15} color="var(--danger)" />
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14.5 }}>Failures by stage</div>
        </div>
        {loading ? (
          <div style={{ padding: "16px 0", color: "var(--text-dim)", fontSize: 13 }}>Loading…</div>
        ) : stageSummary.length === 0 ? (
          <div style={{ padding: "16px 0", color: "var(--text-dim)", fontSize: 13 }}>No failures in this window. 🎉</div>
        ) : (
          <div style={{ marginTop: 8 }}>
            {stageSummary.map((s, i) => (
              <FailureStageBar key={s.stage} stage={s.stage} count={s.count} maxCount={maxStageCount} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* Failed runs grouped by bot */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <div className="hb-scroll" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={{ textAlign: "left", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>Bot</th>
                {isAdmin && <th style={{ textAlign: "left", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>Client</th>}
                <th style={{ textAlign: "right", padding: "11px 16px", color: "var(--danger)", fontWeight: 500, fontSize: 12 }}>Failures</th>
                <th style={{ textAlign: "left", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>Top stage</th>
                <th style={{ textAlign: "right", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>Latest</th>
                <th style={{ textAlign: "right", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={isAdmin ? 6 : 5} style={{ padding: 24, textAlign: "center", color: "var(--text-dim)" }}>Loading…</td></tr>
              )}
              {!loading && groupedByBot.length === 0 && (
                <tr><td colSpan={isAdmin ? 6 : 5} style={{ padding: 24, textAlign: "center", color: "var(--text-dim)" }}>No failed runs in this window.</td></tr>
              )}
              {groupedByBot.map((bot) => (
                <tr
                  key={bot.bot_id ?? bot.bot_name}
                  className="hb-row-hover"
                  onClick={() => setSelectedBot(bot)}
                  style={{ borderBottom: "1px solid var(--border)", cursor: "pointer" }}
                >
                  <td style={{ padding: "11px 16px", fontWeight: 500 }}>{bot.bot_name}</td>
                  {isAdmin && <td style={{ padding: "11px 16px", color: "var(--text-muted)" }}>{bot.client_name}</td>}
                  <td style={{ padding: "11px 16px", textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--danger)" }}>{bot.count}</td>
                  <td style={{ padding: "11px 16px" }}><Badge tone="danger">{bot.topStage}</Badge></td>
                  <td style={{ padding: "11px 16px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-dim)" }}>{timeAgo(bot.latestStart)}</td>
                  <td style={{ padding: "11px 16px", textAlign: "right" }}>
                    <Button variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedBot(bot); }}>
                      <AlertOctagon size={13} /> View failures
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedBot && (
        <BotFailuresModal bot={selectedBot} rows={rows} onClose={() => setSelectedBot(null)} />
      )}
    </div>
  );
}
/* ------------------------------------------------------------------ */
/* Analytics — weekly/monthly leaderboards: top clients, top bots.     */
/* Ranked primarily by run count; success rate shown alongside.        */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* Analytics — ranking chart tooltip                                  */
/* ------------------------------------------------------------------ */

function RankingTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const d = payload[0].payload;

  return (
    <div
      style={{
        background: "var(--surface-3)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "9px 12px",
        fontSize: 12.5,
      }}
    >
      <div
        style={{
          color: "var(--text)",
          fontWeight: 600,
          marginBottom: 3,
        }}
      >
        {d.name}
      </div>

      <div
        style={{
          color: "var(--text-muted)",
        }}
      >
        {d.runs} runs
      </div>

      <div
        style={{
          color:
            d.rate >= 90
              ? "var(--success)"
              : d.rate >= 60
                ? "var(--warning)"
                : "var(--danger)",
          fontWeight: 600,
        }}
      >
        {d.rate}% success
      </div>
    </div>
  );
}
function RankingChart({ title, icon: Icon, rows, nameKey, subKey, loading }) {
  const isClientRanking = title.toLowerCase().includes("client");
  const clientBarColors = ["#3B82F6", "#8B5CF6", "#06B6D4", "#22C55E", "#F97316", "#EC4899", "#14B8A6", "#6366F1"];
  const data = rows.map((r) => ({
    name: r[nameKey], sub: subKey ? r[subKey] : undefined, runs: r.total_runs || 0, rate: r.success_rate ?? 0,
  }));
  const chartHeight = Math.max(220, data.length * 40);
  return (
    <div className={`hb-ranking-card ${isClientRanking ? "is-client-ranking" : "is-bot-ranking"}`} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
        <Icon size={15} color="var(--accent)" />
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14.5 }}>{title}</div>
      </div>
      <div style={{ padding: "18px 18px 6px", maxHeight: 480, overflowY: "auto" }} className="hb-scroll">
        {loading ? (
          <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontSize: 13 }}>Loading…</div>
        ) : data.length === 0 ? (
          <div style={{ height: 220 }}><EmptyChartState /></div>
        ) : (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 28, left: 4, bottom: 4 }} barCategoryGap="28%">
              <CartesianGrid stroke={CHART_COLORS.border} horizontal={false} />
              <XAxis type="number" stroke={CHART_COLORS.muted} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" stroke={CHART_COLORS.muted} fontSize={11.5} tickLine={false} axisLine={false} width={112} />
              <Tooltip content={<RankingTooltip />} cursor={{ fill: "var(--surface-2)" }} />
              <Bar dataKey="runs" name="Runs" radius={[0, 6, 6, 0]} isAnimationActive animationDuration={700}>
                {data.map((d, i) => (
                  <Cell key={i} fill={isClientRanking ? clientBarColors[i % clientBarColors.length] : (d.rate >= 90 ? CHART_COLORS.success : d.rate >= 60 ? CHART_COLORS.warning : CHART_COLORS.danger)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      {!loading && data.length > 0 && !isClientRanking && (
        <div style={{ display: "flex", gap: 16, padding: "4px 18px 16px", fontSize: 11, color: "var(--text-dim)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: CHART_COLORS.success, display: "inline-block" }} /> ≥90% success</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: CHART_COLORS.warning, display: "inline-block" }} /> 60–89%</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: CHART_COLORS.danger, display: "inline-block" }} /> &lt;60%</span>
        </div>
      )}
      {!loading && data.length > 0 && isClientRanking && (
        <div style={{ padding: "4px 18px 16px", fontSize: 11, color: "var(--text-dim)" }}>Ranked by run volume</div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Account view — replaces "Clients" nav item for client-role logins   */
/* ------------------------------------------------------------------ */
function AccountView({ api, session }) {
  const [client, setClient] = useState(null);
  const [botStats, setBotStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [clientsRes, botsRes] = await Promise.all([
          api("/clients/"),
          api("/bots/"),
        ]);
        const list = clientsRes?.data || [];
        const mine = list.find((c) => c.client_id === session.clientId) || list[0] || null;
        setClient(mine);
        const bots = botsRes?.data || [];
        setBotStats({ total: bots.length, active: bots.filter((b) => b.status === "Active").length });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [api, session.clientId]);

  return (
    <div>
      <ErrorBanner message={error} onDismiss={() => setError("")} />

      <div style={{
        background: "linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%)",
        border: "1px solid var(--border)", borderRadius: 16, padding: 28, marginBottom: 20,
        display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20,
        animation: "hb-rise .3s ease both",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 54, height: 54, borderRadius: "50%", flexShrink: 0,
            background: "var(--accent-dim)", color: "var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700,
          }}>
            {initialsOf(client?.client_name || session.email)}
          </div>
          <div>
            <div className="hb-eyebrow" style={{ marginBottom: 6 }}>Account</div>
            {loading ? (
              <div style={{ color: "var(--text-dim)", fontSize: 14 }}>Loading…</div>
            ) : (
              <>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
                  {client?.client_name || session.email}
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: 13.5 }}>{client?.contact_person}</div>
              </>
            )}
          </div>
        </div>
        {client && <Badge tone={client.status === "Active" ? "success" : "muted"}>{client.status}</Badge>}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <StatCard label="Your bots" value={botStats?.total ?? "—"} index={0} />
        <StatCard label="Active" value={botStats?.active ?? "—"} tone="success" index={1} />
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 22 }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14.5, marginBottom: 16 }}>Contact details</div>
        {[
          ["Signed in as", session.email],
          ["Client email", client?.email],
          ["Email domains", client?.email_domains],
        ].map(([label, val]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)", fontSize: 13.5 }}>
            <span style={{ color: "var(--text-muted)" }}>{label}</span>
            <span>{val || "—"}</span>
          </div>
        ))}
        <div style={{ marginTop: 16, fontSize: 12.5, color: "var(--text-dim)" }}>
          Need something changed here? Reach out to your StayAhead Legal account manager — client details are managed on our side.
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Generic CRUD table view (Clients / Bots / Departments)               */
/* ------------------------------------------------------------------ */
function CrudView({ api, canWrite, config, initialClientFilter = null, rowContext = null }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null); // { mode: 'create'|'edit', data }
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [hardDelete, setHardDelete] = useState(false);
  const [loginModalFor, setLoginModalFor] = useState(null);
  const [refs, setRefs] = useState({}); // supporting lookups (e.g. clients for bots)
  const [clientFilterId, setClientFilterId] = useState(initialClientFilter);
  const [department, setDepartment] = useState(null);
  const [machine, setMachine] = useState(null);
  const [search, setSearch] = useState("");

  const departmentOptions = useDepartmentOptions(api);
  const machineOptions = useMachineOptions(api);
  const clientOptions = useClientOptions(api);
  const filterGroups = useMemo(() => {
    const groups = [];
    if (config.showClientFilter) groups.push({ key: "client", icon: Users, label: "Client", value: clientFilterId, onChange: setClientFilterId, options: clientOptions });
    if (config.showDepartmentFilter) groups.push({ key: "department", icon: Building2, label: "Department", value: department, onChange: setDepartment, options: departmentOptions });
    if (config.showMachineFilter) groups.push({ key: "machine", icon: HardDrive, label: "Machine", value: machine, onChange: setMachine, options: machineOptions });
    return groups;
  }, [config, clientFilterId, clientOptions, department, departmentOptions, machine, machineOptions]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let path = config.listPath;
      const params = new URLSearchParams();
      if (config.showClientFilter && clientFilterId) params.set("client_id", clientFilterId);
      if (config.showDepartmentFilter && department) params.set("department", department);
      if (config.showMachineFilter && machine) params.set("machine_name", machine);
      const qs = params.toString();
      if (qs) path += `?${qs}`;
      const res = await api(path);
      let data = res.data || [];
      // machine_name filter isn't a backend query param on /bots/, so apply client-side
      if (config.showMachineFilter && machine) {
        data = data.filter((r) => r.machine_name === machine);
      }
      setRows(data);
      if (config.refs) {
        const entries = await Promise.all(
          config.refs.map(async (r) => [r.key, (await api(r.path)).data || []])
        );
        setRefs(Object.fromEntries(entries));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [api, config, clientFilterId, department, machine]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => setModal({ mode: "create", data: config.emptyForm() });
  const openEdit = (row) => setModal({ mode: "edit", data: { ...row } });

  const save = async (formData) => {
    try {
      if (modal.mode === "create") {
        await api(config.listPath, { method: "POST", body: JSON.stringify(formData) });
      } else {
        await api(`${config.listPath}${modal.data[config.idField]}`, {
          method: "PATCH", body: JSON.stringify(config.toUpdatePayload(formData)),
        });
      }
      setModal(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const doDelete = async () => {
    try {
      const id = confirmDelete[config.idField];
      const query = config.supportsSoftDelete && hardDelete ? "?hard=true" : "";
      await api(`${config.listPath}${id}${query}`, { method: "DELETE" });
      setConfirmDelete(null);
      setHardDelete(false);
      load();
    } catch (err) {
      setError(err.message);
      setConfirmDelete(null);
    }
  };

  // Client-side search across the record's searchable fields — instant
  // filtering without another round trip while the count updates live.
  const filteredRows = useMemo(() => {
    if (!config.searchKeys || !search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((row) =>
      config.searchKeys.some((k) => String(row[k] ?? "").toLowerCase().includes(q))
    );
  }, [rows, search, config.searchKeys]);

  return (
    <div>
      <ErrorBanner message={error} onDismiss={() => setError("")} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ color: "var(--text-muted)", fontSize: 13, paddingTop: 8, whiteSpace: "nowrap" }}>
            {filteredRows.length} {config.label.toLowerCase()}
            {search.trim() && rows.length !== filteredRows.length ? ` of ${rows.length}` : ""}
          </div>
          {config.searchKeys && (
            <SearchBar value={search} onChange={setSearch} placeholder={config.searchPlaceholder || `Search ${config.label.toLowerCase()}…`} />
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {filterGroups.length > 0 && (
            <div>
              <FilterPopover groups={filterGroups} />
              <ActiveFilterChips groups={filterGroups} />
            </div>
          )}
          {canWrite && (
            <Button onClick={openCreate}><Plus size={14} /> New {config.singular}</Button>
          )}
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <div className="hb-scroll" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {config.columns.map((c) => (
                  <th key={c.key} style={{ textAlign: "left", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>
                    {c.label}
                  </th>
                ))}
                {canWrite && <th style={{ padding: "11px 16px" }}></th>}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={config.columns.length + 1} style={{ padding: 24, textAlign: "center", color: "var(--text-dim)" }}>Loading…</td></tr>
              )}
              {!loading && filteredRows.length === 0 && (
                <tr><td colSpan={config.columns.length + 1} style={{ padding: 24, textAlign: "center", color: "var(--text-dim)" }}>
                  {rows.length === 0 ? "Nothing here yet." : "No matches for your search."}
                </td></tr>
              )}
              {filteredRows.map((row) => (
                <tr key={row[config.idField]} className="hb-row-hover" style={{ borderBottom: "1px solid var(--border)" }}>
                  {config.columns.map((c) => (
                    <td key={c.key} style={{ padding: "11px 16px", verticalAlign: "middle" }}>
                      {c.render ? c.render(row, rowContext ? { ...refs, ...rowContext } : refs) : row[c.key] ?? "—"}
                    </td>
                  ))}
                  {canWrite && (
                    <td style={{ padding: "11px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                      {config.showCreateLogin && (
                        <button onClick={() => setLoginModalFor(row)} title="Create login" style={{ background: "none", border: "none", color: "var(--accent)", padding: 4 }}>
                          <KeyRound size={14} />
                        </button>
                      )}
                      {!config.hideEdit && (
                        <button onClick={() => openEdit(row)} style={{ background: "none", border: "none", color: "var(--text-muted)", padding: 4 }}>
                          <Pencil size={14} />
                        </button>
                      )}
                      <button onClick={() => setConfirmDelete(row)} style={{ background: "none", border: "none", color: "var(--danger)", padding: 4 }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <FormModal
          title={`${modal.mode === "create" ? "New" : "Edit"} ${config.singular}`}
          fields={config.formFields}
          initial={modal.data}
          refs={refs}
          onCancel={() => setModal(null)}
          onSave={save}
        />
      )}

      {confirmDelete && (
        <Modal title={`Delete ${config.singular}`} onClose={() => { setConfirmDelete(null); setHardDelete(false); }} width={380}>
          <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 16 }}>
            {config.supportsSoftDelete
              ? "By default this deactivates the record instead of erasing it. Choose permanent delete only if you're sure — it can't be undone and may be blocked if related records still exist."
              : "This will permanently remove the record and its run history. This can't be undone."}
          </div>
          {config.supportsSoftDelete && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, fontSize: 13.5 }}>
              <input type="checkbox" checked={hardDelete} onChange={(e) => setHardDelete(e.target.checked)} />
              Permanently delete instead of deactivating
            </label>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Button variant="ghost" onClick={() => { setConfirmDelete(null); setHardDelete(false); }}>Cancel</Button>
            <Button variant="danger" onClick={doDelete}>
              {hardDelete ? "Delete permanently" : "Deactivate"}
            </Button>
          </div>
        </Modal>
      )}

      {loginModalFor && (
        <CreateLoginModal api={api} client={loginModalFor} onClose={() => setLoginModalFor(null)} />
      )}
    </div>
  );
}

function CreateLoginModal({ api, client, onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email, password, role: "client", client_id: client.client_id,
        }),
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`Create login — ${client.client_name}`} onClose={onClose} width={400}>
      {success ? (
        <div>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, color: "var(--success)",
            background: "var(--success-dim)", padding: "10px 14px", borderRadius: 8,
            fontSize: 13.5, marginBottom: 16,
          }}>
            <Check size={15} /> Login created for {email}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
            Share these credentials with the client through a secure channel — they won't be shown again here.
          </div>
          <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: 12, fontFamily: "var(--font-mono)", fontSize: 12.5, marginBottom: 16 }}>
            <div>email: {email}</div>
            <div>password: {password}</div>
          </div>
          <Button onClick={onClose} style={{ width: "100%", justifyContent: "center" }}>Done</Button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <ErrorBanner message={error} onDismiss={() => setError("")} />
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
            This creates a client-role account scoped to <strong style={{ color: "var(--text)" }}>{client.client_name}</strong> — they'll only see their own bots and runs.
          </div>
          <Field label="Login email">
            <input style={inputStyle} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Temporary password">
            <PasswordField
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </Field>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
            <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Creating…" : "Create login"}</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function FormModal({ title, fields, initial, refs, onCancel, onSave }) {
  const [form, setForm] = useState(initial);
  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <Modal title={title} onClose={onCancel}>
      <form onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
        {fields.map((f) => (
          <Field key={f.key} label={f.label}>
            {f.type === "select" ? (
              <select style={inputStyle} value={form[f.key] ?? ""} onChange={(e) => set(f.key, f.numeric ? Number(e.target.value) : e.target.value)}>
                <option value="">Select…</option>
                {(f.optionsFrom ? refs[f.optionsFrom] : f.options || []).map((opt) => (
                  <option key={opt.value ?? opt[f.optionValueKey]} value={opt.value ?? opt[f.optionValueKey]}>
                    {opt.label ?? opt[f.optionLabelKey]}
                  </option>
                ))}
              </select>
            ) : f.type === "number" ? (
              <input style={inputStyle} type="number" step="any" value={form[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value === "" ? null : Number(e.target.value))} />
            ) : (
              <input style={inputStyle} type={f.type || "text"} value={form[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)} required={f.required} />
            )}
          </Field>
        ))}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
          <Button variant="ghost" onClick={onCancel} type="button">Cancel</Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Entity configs                                                       */
/* ------------------------------------------------------------------ */
function getTimezoneMeta(timezone) {
  if (!timezone) return null;
  try {
    const now = new Date();
    const zoneName = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "short",
    }).formatToParts(now).find((p) => p.type === "timeZoneName")?.value || timezone;

    // Compare the selected timezone with the browser/local timezone.
    const getParts = (tz) => {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hourCycle: "h23",
      }).formatToParts(now);
      const map = {};
      parts.forEach((p) => { map[p.type] = Number(p.value); });
      return Date.UTC(map.year, map.month - 1, map.day, map.hour, map.minute, map.second);
    };

    // HeartBeat uses StayAhead (Asia/Kolkata) as the reference clock.
    // Do not compare against the machine/browser timezone.
    const stayAheadOffsetMs = getParts("Asia/Kolkata") - getParts("UTC");
    const zoneOffsetMs = getParts(timezone) - getParts("UTC");
    const diffMinutes = Math.round((zoneOffsetMs - stayAheadOffsetMs) / 60000);

    let relation = "same time";
    if (diffMinutes !== 0) {
      const abs = Math.abs(diffMinutes);
      const hours = Math.floor(abs / 60);
      const minutes = abs % 60;
      const duration = `${hours}h${minutes ? ` ${minutes}m` : ""}`;
      relation = diffMinutes > 0 ? `${duration} ahead` : `${duration} behind`;
    }

    return { zoneName, relation };
  } catch (_) {
    return { zoneName: timezone, relation: "" };
  }
}

function ClientTimezoneCell({ timezone }) {
  const meta = getTimezoneMeta(timezone);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!timezone) return undefined;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [timezone]);

  if (!meta) return <span style={{ color: "var(--text-dim)" }}>—</span>;

  const clientTime = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(now);

  return (
    <div className="hb-client-tz" title={timezone}>
      <div className="hb-client-tz-top">
        <span className="hb-client-tz-zone">{meta.zoneName}</span>
        <span className="hb-client-tz-live">●</span>
      </div>
      {/* <span className="hb-client-tz-time"></span>  */}
      <span className="hb-client-tz-diff">
        {meta.relation}
      </span>
    </div>
  );
}

function TimezoneClock({ label, timezone }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(now);

  return (
    <div>
      <div>{label}</div>
      <div>{time}</div>
    </div>
  );
}

function StayAheadClocks({ isDrawer = false }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const stayAheadUSTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "2-digit",
    minute: "2-digit",
    second: isDrawer ? undefined : "2-digit",
    hour12: true,
  }).format(now);

  const stayAheadIndiaTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: isDrawer ? undefined : "2-digit",
    hour12: true,
  }).format(now);

  return (
    <div className={`hb-topbar-clocks${isDrawer ? " hb-drawer-clocks" : ""}`}>
      <div className="hb-topbar-clock-item">
        <div className="hb-topbar-clock-label">StayAhead US</div>
        <div className="hb-topbar-clock-time">{stayAheadUSTime}</div>
      </div>

      <div className="hb-topbar-clock-divider" />

      <div className="hb-topbar-clock-item">
        <div className="hb-topbar-clock-label">StayAhead India</div>
        <div className="hb-topbar-clock-time">{stayAheadIndiaTime}</div>
      </div>
    </div>
  );
}

const clientConfig = {
  label: "Clients", singular: "Client", idField: "client_id", listPath: "/clients/",
  supportsSoftDelete: true,
  showCreateLogin: true,
  searchKeys: ["client_name", "contact_person", "email", "email_domains"],
  searchPlaceholder: "Search clients…",
  columns: [
    { key: "client_name", label: "Name" },

    { key: "contact_person", label: "Contact" },

    { key: "email", label: "Email" },

    {
      key: "email_domains",
      label: "Email domains",
      render: (r) => r.email_domains || "—",
    },

    {
      key: "bot_count",
      label: "Bot Count",
      render: (r, refs) => (
        <button
          type="button"
          onClick={() => refs?.onBotCountClick && refs.onBotCountClick(r.client_id)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            minWidth: 42,
            justifyContent: "center",
            padding: "5px 9px",
            borderRadius: 8,
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            color: "var(--accent)",
            fontFamily: "var(--font-mono)",
            fontSize: 14,
            fontWeight: 900,
            cursor: refs?.onBotCountClick ? "pointer" : "default",
          }}
          title={`View bots for this client (${r.bot_count ?? 0})`}
        >
          <Bot size={13} />
          <span>{r.bot_count ?? 0}</span>
        </button>
      ),
    },

    {
      key: "status",
      label: "Status",
      render: (r) => (
        <Badge tone={r.status === "Active" ? "success" : "muted"}>
          {r.status}
        </Badge>
      ),
    },

    {
      key: "local_time",
      label: "Local Time",
      render: (r) => <ClientTimezoneCell timezone={r.timezone} />,
    },
  ],
  formFields: [
    {
      key: "client_name",
      label: "Client name",
      required: true,
    },
    {
      key: "contact_person",
      label: "Contact person",
    },
    {
      key: "email",
      label: "Email",
      type: "email",
      required: true,
    },
    {
      key: "email_domains",
      label: "Email domains (comma-separated, e.g. domain.com,other.com)",
    },
    {
      key: "timezone",
      label: "Timezone",
      type: "select",
      options: [
        { value: "America/New_York", label: "Eastern Time — New York" },
        { value: "America/Chicago", label: "Central Time — Chicago" },
        { value: "America/Denver", label: "Mountain Time — Denver" },
        { value: "America/Los_Angeles", label: "Pacific Time — Los Angeles" },
        { value: "America/Phoenix", label: "Arizona — Phoenix" },
        { value: "Europe/London", label: "UK — London" },
        { value: "Europe/Dublin", label: "Ireland — Dublin" },
        { value: "Asia/Kolkata", label: "India — Kolkata" },
        { value: "Australia/Sydney", label: "Australia — Sydney" },
      ],
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "Active", label: "Active" },
        { value: "Inactive", label: "Inactive" },
      ],
    },
  ],

  emptyForm: () => ({
    client_name: "",
    contact_person: "",
    email: "",
    email_domains: "",
    timezone: "America/New_York",
    status: "Active",
  }),

  toUpdatePayload: (f) => ({
    client_name: f.client_name,
    contact_person: f.contact_person,
    email: f.email,
    email_domains: f.email_domains,
    timezone: f.timezone,
    status: f.status,
  }),
};

const departmentConfig = {
  label: "Departments", singular: "Department", idField: "department_id", listPath: "/departments/",
  supportsSoftDelete: false,
  hideEdit: true, // backend only supports create + delete for departments
  columns: [
    { key: "name", label: "Name" },
  ],
  formFields: [
    { key: "name", label: "Department name", required: true },
  ],
  emptyForm: () => ({ name: "" }),
  toUpdatePayload: (f) => ({ name: f.name }),
};

const botConfig = {
  label: "Bots", singular: "Bot", idField: "bot_id", listPath: "/bots/",
  supportsSoftDelete: false,
  showClientFilter: true,
  showDepartmentFilter: true,
  showMachineFilter: true,
  searchKeys: ["bot_name", "email_identifier", "machine_name", "owner"],
  searchPlaceholder: "Search bots…",
  refs: [{ key: "clients", path: "/clients/" }, { key: "departments", path: "/departments/" }],
  columns: [
    { key: "bot_name", label: "Name" },
    { key: "email_identifier", label: "Email identifier", render: (r) => <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}>{r.email_identifier}</span> },
    { key: "client_id", label: "Client", render: (r, refs) => refs.clients?.find((c) => c.client_id === r.client_id)?.client_name || `#${r.client_id}` },
    { key: "department", label: "Department", render: (r) => r.department ? <Badge tone="accent">{r.department}</Badge> : <span style={{ color: "var(--text-dim)" }}>—</span> },
    { key: "machine_name", label: "Machine", render: (r) => r.machine_name ? <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--text-muted)" }}>{r.machine_name}</span> : <span style={{ color: "var(--text-dim)" }}>—</span> },
    { key: "manual_process_rate", label: "Manual Process Rate", render: (r) => <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--text-muted)" }}>{r.transaction_batch_size} acc = {r.transaction_batch_hours}h</span> },
    { key: "status", label: "Status", render: (r) => <Badge tone={r.status === "Active" ? "success" : "muted"}>{r.status}</Badge> },
  ],
  formFields: [
    { key: "bot_name", label: "Bot name", required: true },
    { key: "email_identifier", label: "Email identifier", required: true },
    { key: "client_id", label: "Client", type: "select", numeric: true, optionsFrom: "clients", optionValueKey: "client_id", optionLabelKey: "client_name" },
    { key: "department", label: "Department", type: "select", optionsFrom: "departments", optionValueKey: "name", optionLabelKey: "name" },
    { key: "machine_name", label: "Machine name (e.g. VM-LEGAL-01)" },
    { key: "owner", label: "Owner" },
    { key: "transaction_batch_size", label: "Accounts per batch (e.g. 10)", type: "number" },
    { key: "transaction_batch_hours", label: "Manual hours per batch (e.g. 1)", type: "number" },
    { key: "status", label: "Status", type: "select", options: [{ value: "Active", label: "Active" }, { value: "Inactive", label: "Inactive" }] },
  ],
  emptyForm: () => ({ bot_name: "", email_identifier: "", client_id: "", department: "", machine_name: "", owner: "", transaction_batch_size: 10, transaction_batch_hours: 1, status: "Active" }),
  toUpdatePayload: (f) => ({
    bot_name: f.bot_name, email_identifier: f.email_identifier,
    client_id: f.client_id, department: f.department, machine_name: f.machine_name, owner: f.owner,
    transaction_batch_size: f.transaction_batch_size, transaction_batch_hours: f.transaction_batch_hours,
    status: f.status,
  }),
};

/* ------------------------------------------------------------------ */
/* Shell (sidebar + topbar) — nav is role-aware:                       */
/* admins manage Clients; client logins get an Account page instead.   */
/* ------------------------------------------------------------------ */
const NAV_ADMIN = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "reports", label: "Bot Reports", icon: FileBarChart },
  { key: "bots", label: "Bots", icon: Bot },
  { key: "clients", label: "Clients", icon: Users },

  { key: "logs", label: "Logs", icon: FileText },
  { key: "messages", label: "Messages", icon: MessageSquare },
  { key: "failures", label: "Failures", icon: AlertOctagon },

  { key: "client-management", label: "Credential Management", icon: Building2 },

  { key: "departments", label: "Departments", icon: Building2 },
  { key: "action-items", label: "Action Items", icon: ClipboardList },
  { key: "users", label: "Users", icon: KeyRound },

];
const NAV_CLIENT = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "contact", label: "Contact", icon: MessageSquare },
  { key: "reports", label: "Bot Reports", icon: FileBarChart },
  { key: "failures", label: "Failures", icon: AlertOctagon },
  { key: "bots", label: "Bots", icon: Bot },
  { key: "account", label: "Account", icon: UserCircle2 },
];

/* Sidebar profile block — click the avatar row to open a small dropdown
   with the theme toggle and Sign out. Keeps the footer compact instead
   of stacking a permanently-visible switch under every user's name. */
function ProfileMenu({ email, role, onLogout, theme, toggleTheme }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div className="hb-profile" ref={rootRef}>
      {open && (
        <div className="hb-profile-menu">
          <button className="hb-theme-toggle" onClick={toggleTheme} type="button">
            {theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}
            {theme === "dark" ? "Dark mode" : "Light mode"}
            <span className={`hb-theme-track${theme === "dark" ? " on" : ""}`}>
              <span className="hb-theme-thumb" />
            </span>
          </button>
          <div className="hb-profile-menu-divider" />
          <button className="hb-profile-menu-item danger" onClick={onLogout} type="button">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      )}
      <button
        className={`hb-profile-trigger${open ? " is-open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="hb-avatar">{initialsOf(email)}</div>
        <div className="hb-profile-copy" style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</div>
          <div style={{ marginTop: 4 }}><Badge tone="accent">{role}</Badge></div>
        </div>
        <ChevronDown
          size={14}
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s", color: "var(--text-dim)", flexShrink: 0 }}
        />
      </button>
    </div>
  );
}


const SIDEBAR_KEY = "heartbeat_sidebar_collapsed";

function AppShell({ session, onLogout, onSessionExpired, onTokensRefreshed, theme, toggleTheme }) {
  const { baseUrl, token, role, email } = session;
  const currentUserId = useMemo(() => {
    try {
      if (!token) return null;

      const payload = JSON.parse(
        atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
      );

      return payload?.sub != null ? Number(payload.sub) : null;
    } catch (_) {
      return null;
    }
  }, [token]);
  const api = useApi(baseUrl, session, onTokensRefreshed, onSessionExpired);
  const [view, setView] = useState("dashboard");
  const [logContext, setLogContext] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [liveEvents, setLiveEvents] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [botsClientFilter, setBotsClientFilter] = useState(null);
  const [targetActionItem, setTargetActionItem] = useState(null);
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const handleToggleSound = () => {
    const next = toggleSound();
    setSoundOn(next);
  };
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_KEY) === "1"; } catch (_) { return false; }
  });
  // Replace these 2 lines in AppShell:
  const isSuperAdmin = role === "admin";
  const isAnyAdmin = ["admin", "admin2", "admin3"].includes(role);
  const isAdmin = isAnyAdmin;

  const NAV_ADMIN_VIEWER = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "action-items", label: "Action Items", icon: ClipboardList },
    { key: "reports", label: "Bot Reports", icon: FileBarChart },
    { key: "logs", label: "Logs", icon: FileText },
    { key: "messages", label: "Messages", icon: MessageSquare },
    { key: "failures", label: "Failures", icon: AlertOctagon },
    { key: "clients", label: "Clients", icon: Users },
    { key: "client-management", label: "Client Management", icon: Building2 },
    { key: "bots", label: "Bots", icon: Bot },
    { key: "departments", label: "Departments", icon: Building2 },
  ];
  const NAV = isSuperAdmin ? NAV_ADMIN : isAnyAdmin ? NAV_ADMIN_VIEWER : NAV_CLIENT;
  const [clientTimezone, setClientTimezone] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0"); } catch (_) { /* ignore */ }
      return next;
    });
  }, []);
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleSidebar]);
  useEffect(() => {
    const expiryMs = decodeJwtExpiryMs(token);
    if (!expiryMs) return;
    const delay = expiryMs - Date.now() - 60_000;
    if (delay <= 0) return;
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`${baseUrl}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: session.refreshToken }),
        });
        if (res.ok) {
          const data = await res.json();
          onTokensRefreshed(data.access_token, data.refresh_token);
        }
      } catch (_) { /* reactive refresh handles the next request */ }
    }, delay);
    return () => clearTimeout(id);
  }, [token, session.refreshToken, baseUrl, onTokensRefreshed]);

  useEffect(() => {
    if (!baseUrl || !token) return;
    const wsUrl = baseUrl.replace(/^http/, "ws") + `/ws?token=${encodeURIComponent(token)}`;
    let ws;
    let retryTimer;
    let closed = false;
    let attempt = 0;

    const connect = () => {
      if (closed) return;
      try { ws = new WebSocket(wsUrl); } catch (_) { setWsConnected(false); return; }
      ws.onopen = () => { attempt = 0; setWsConnected(true); };
      ws.onclose = () => {
        setWsConnected(false);
        if (closed) return;
        const delay = Math.min(1000 * 2 ** attempt, 15000);
        attempt += 1;
        retryTimer = setTimeout(connect, delay);
      };
      ws.onerror = () => { try { ws.close(); } catch (_) { } };
      ws.onmessage = (e) => {
        if (closed) return;
        try {
          const data = JSON.parse(e.data);
          handleWebSocketSoundEvent(data, currentUserId);
          if (data.event === "new_message") {
            setUnreadMessages((prev) => prev + 1);
          }
          if (data.event) setLiveEvents((prev) => [{ ...data, _receivedAt: Date.now() }, ...prev].slice(0, 50));
        } catch (_) { /* ignore heartbeat/ping frames */ }
      };
    };
    connect();
    return () => {
      closed = true;
      clearTimeout(retryTimer);
      try { ws?.close(); } catch (_) { }
    };
  }, [baseUrl, token]);

  useEffect(() => {
    console.log("SESSION CLIENT ID:", session?.clientId);

    if (!session?.clientId) {
      console.log("NO CLIENT ID - USING NEW YORK");
      setClientTimezone("America/New_York");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const response = await api(`/clients/${session.clientId}`);

        console.log("CLIENT RESPONSE:", response);

        const client = response?.data;

        console.log("MATCHED CLIENT:", client);
        console.log("MATCHED TIMEZONE:", client?.timezone);

        if (!cancelled) {
          setClientTimezone(
            client?.timezone || "America/New_York"
          );
        }
      } catch (err) {
        console.error("Failed to load client timezone:", err);

        if (!cancelled) {
          setClientTimezone("America/New_York");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api, session?.clientId]);

  useEffect(() => {
    let cancelled = false;
    const loadUnread = async () => {
      try {
        const res = await api("/messages/unread-count");
        if (!cancelled) setUnreadMessages(Number(res?.unread_count || 0));
      } catch (_) {
        // Messaging is non-critical to the main dashboard.
      }
    };
    loadUnread();
    const timer = setInterval(loadUnread, 15000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [api]);

  const selectView = (next) => {
    setBotsClientFilter(null); // manual nav clears any client-scoped bot filter
    setView(next);
    if (next !== "logs") setLogContext(null);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openLogsFromRun = useCallback((context) => {
    setLogContext(context || null);
    setView("logs");
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const openBotsForClient = useCallback((clientId) => {
    setBotsClientFilter(clientId);
    setView("bots");
    setLogContext(null);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleOpenActionItems = useCallback((actionItemId) => {
    if (actionItemId) {
      setTargetActionItem({ id: actionItemId, ts: Date.now() });
    }
    setBotsClientFilter(null);
    setView("action-items");
    setLogContext(null);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="hb-root hb-app-shell" data-theme={theme}>
      {/* <style>{TOKENS}</style> */}

      {/* Mobile Drawer Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          className="hb-sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`hb-sidebar${sidebarCollapsed ? " is-collapsed" : ""}${mobileMenuOpen ? " mobile-open" : ""}`}>
        <div className="hb-brand">
          <div className="hb-brand-mark">
            <img src="/logo2.png" alt="HeartBeat" className="hb-brand-logo" />
          </div>
          <div className="hb-brand-copy" style={{ minWidth: 0, flex: 1 }}>
            <div style={{ font: "800 16px/1.1 var(--font-display)", letterSpacing: "-.1px" }}>HeartBeat</div>
            <div style={{ marginTop: 3, color: "var(--text-dim)", fontSize: 10.5, letterSpacing: ".35px" }}>Bot Monitor Dashboard</div>
          </div>
          <button
            type="button"
            className="hb-sidebar-mobile-close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <button
          className="hb-sidebar-collapse-btn"
          onClick={toggleSidebar}
          title={sidebarCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
          aria-label="Toggle sidebar"
        >
          {sidebarCollapsed ? <ChevronsRight size={13} /> : <ChevronsLeft size={13} />}
        </button>

        <nav className="hb-sidebar-nav hb-scroll">

          <div className="hb-nav-section hb-eyebrow">Workspace</div>
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = view === n.key;
            return (
              <button key={n.key} className={`hb-nav-item${active ? " active" : ""}`} onClick={() => selectView(n.key)} title={n.label}>
                <span className="hb-nav-icon"><Icon size={15} /></span>
                <span className="hb-nav-label" style={{ flex: 1 }}>{n.label}</span>
                {(n.key === "contact" || n.key === "messages") && unreadMessages > 0 && (
                  <span className="hb-chat-badge-pill">
                    {unreadMessages > 99 ? "99+" : unreadMessages}
                  </span>
                )}
                {active && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 0 4px var(--accent-dim)" }} />}
              </button>
            );
          })}
        </nav>

        <div className="hb-sidebar-footer">
          <div className="hb-sidebar-drawer-clocks">
            {isAdmin ? <StayAheadClocks isDrawer /> : <ClientTimezoneClocks timezone={clientTimezone} isDrawer />}
          </div>
          <ProfileMenu email={email} role={role} onLogout={onLogout} theme={theme} toggleTheme={toggleTheme} />
        </div>
      </aside>

      <div className="hb-shell-main">

        <header className="hb-topbar">
          <div className="hb-topbar-left">
            <button className="hb-mobile-toggle" onClick={() => setMobileMenuOpen((v) => !v)} aria-label="Open navigation">
              {mobileMenuOpen ? <X size={17} /> : <LayoutDashboard size={17} />}
            </button>


            <div>
              {view !== "dashboard" && <div className="hb-page-title">{view.replace("-", " ")}</div>}
              <div className={view === "dashboard" ? "hb-page-meta-solo" : "hb-page-meta"}>
                {new Date().toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric"
                })}

              </div>

            </div>
          </div>
          {isAdmin ? (
            <StayAheadClocks />
          ) : (
            <ClientTimezoneClocks timezone={clientTimezone} />
          )}


          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isAdmin && (
              <Notifications
                api={api}
                onOpenActionItems={handleOpenActionItems}
                liveEvents={liveEvents}
              />
            )}
            <button
              onClick={handleToggleSound}
              title={soundOn ? "Mute notification sounds" : "Enable notification sounds"}
              aria-label="Toggle notification sounds"
              style={{
                display: "grid", placeItems: "center", width: 36, height: 36,
                border: "1px solid var(--border)", background: "var(--surface)",
                color: soundOn ? "var(--accent)" : "var(--text-dim)", borderRadius: 10, transition: "border-color .15s, color .15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-hover)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
            >
              {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-label="Toggle theme"
              style={{
                display: "grid", placeItems: "center", width: 36, height: 36,
                border: "1px solid var(--border)", background: "var(--surface)",
                color: "var(--text-muted)", borderRadius: 10, transition: "border-color .15s, color .15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.color = "var(--text)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div className="hb-status-chip" title={wsConnected ? "Realtime connection is active" : "Realtime connection is reconnecting"}>
              <span className="hb-status-chip-label">Realtime</span>
              {wsConnected
                ? <Badge tone="success"><Wifi size={11} /> connected</Badge>
                : <Badge tone="muted"><WifiOff size={11} /> reconnecting</Badge>}
            </div>
          </div>
        </header>

        {mobileMenuOpen && (
          <div style={{ position: "fixed", inset: "62px 0 auto 0", zIndex: 40, padding: 10, background: "rgba(7,17,31,.96)", borderBottom: "1px solid var(--border)", backdropFilter: "blur(18px)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6 }}>
              {NAV.map((n) => {
                const Icon = n.icon;
                const active = view === n.key;
                return <button key={n.key} onClick={() => selectView(n.key)} style={{ minHeight: 44, borderRadius: 10, border: `1px solid ${active ? "rgba(62,217,190,.25)" : "var(--border)"}`, background: active ? "var(--accent-dim)" : "var(--surface)", color: active ? "var(--accent)" : "var(--text-muted)", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", fontWeight: 600, fontSize: 12.5 }}><Icon size={15} />{n.label}{(n.key === "contact" || n.key === "messages") && unreadMessages > 0 ? <span className="hb-chat-badge-pill">{unreadMessages > 99 ? "99+" : unreadMessages}</span> : null}</button>;
              })}
            </div>
          </div>
        )}

        <main
          className={`hb-main-content ${view === "dashboard" ? "hb-dashboard-live" : ""
            }`}
        >



          <div className="hb-content-frame">
            {view === "dashboard" && (
              <DashboardView
                api={api}
                wsConnected={wsConnected}
                liveEvents={liveEvents}
                role={role}
                isAdmin={isAdmin}
                session={session}
              />
            )}



            {view === "messages" && isAdmin && <MessagesView api={api} role={role} session={session} liveEvents={liveEvents} />}
            {view === "contact" && !isAdmin && <MessagesView api={api} role={role} session={session} liveEvents={liveEvents} />}
            {view === "reports" && <ReportsView api={api} onOpenLogs={openLogsFromRun} isAdmin={isAdmin} />}
            {view === "logs" && isAdmin && <LogsView api={api} context={logContext} onBackToReports={() => selectView("reports")} />}
            {view === "failures" && (
              <FailuresView api={api} isAdmin={isAdmin} />
            )}
            {view === "client-management" && isAdmin && (
              <ClientManagementCRUDView api={api} session={session} />
            )}
            {view === "clients" && isAdmin && (
              <CrudView
                api={api}
                canWrite={isSuperAdmin}
                config={clientConfig}
                rowContext={{ onBotCountClick: openBotsForClient }}
              />
            )}
            {view === "bots" && (
              <CrudView
                api={api}
                canWrite={isSuperAdmin}
                config={botConfig}
                initialClientFilter={botsClientFilter}
              />
            )}
            {view === "departments" && isAdmin && (
              <CrudView
                api={api}
                canWrite={isSuperAdmin}
                config={departmentConfig}
              />
            )}
            {view === "users" && isSuperAdmin && (
              <UsersView api={api} currentEmail={email} />
            )}

            {view === "action-items" && isAdmin && (
              <ActionItems
                api={api}
                targetActionItem={targetActionItem}
                onClearTargetActionItem={() => setTargetActionItem(null)}
              />
            )}
            {view === "account" && !isAdmin && (
              <AccountView
                api={api}
                session={session}
              />
            )}
          </div>
        </main>
      </div>



      <nav className="hb-mobile-nav" aria-label="Primary navigation">
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = view === n.key;
          return (
            <button key={n.key} className={active ? "active" : ""} onClick={() => selectView(n.key)} style={{ position: "relative" }}>
              <Icon size={17} />
              <span>{n.label}</span>
              {(n.key === "contact" || n.key === "messages") && unreadMessages > 0 ? (
                <span className="hb-chat-badge-pill" style={{ position: "absolute", top: 2, right: "calc(50% - 18px)", transform: "scale(0.8)" }}>
                  {unreadMessages > 99 ? "99+" : unreadMessages}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
/* ------------------------------------------------------------------ */
/* Root                                                                 */
/* ------------------------------------------------------------------ */
const SESSION_KEY = "heartbeat_session";
const loadStoredSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
};

export default function HeartBeatApp() {
  const [session, setSession] = useState(loadStoredSession);
  const [sessionMessage, setSessionMessage] = useState("");
  const { theme, toggleTheme } = useTheme();

  const handleLogin = (s) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    setSessionMessage("");
    setSession(s);
  };

  const handleLogout = (message = "") => {
    localStorage.removeItem(SESSION_KEY);
    setSessionMessage(message);
    setSession(null);
  };

  // Called whenever the access/refresh tokens are renewed — by the proactive
  // pre-expiry timer in AppShell, or by useApi's reactive 401-retry path.
  const handleTokensRefreshed = (accessToken, refreshToken) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = { ...prev, token: accessToken, refreshToken };
      localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      return next;
    });
  };

  if (!session) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        sessionMessage={sessionMessage}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    );
  }
  return (
    <AppShell
      session={session}
      onLogout={() => handleLogout("")}
      onSessionExpired={() => handleLogout("Your session expired — please sign in again.")}
      onTokensRefreshed={handleTokensRefreshed}
      theme={theme}
      toggleTheme={toggleTheme}
    />
  );
}