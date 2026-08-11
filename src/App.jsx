import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  LayoutDashboard, Users, Bot, LogOut, Plus, Pencil,
  Trash2, Activity, CheckCircle2, XCircle, Clock, Wifi, WifiOff,
  X, AlertTriangle, Loader2, KeyRound, Check, FileBarChart, UserCircle2,
  TrendingUp, Building2, AlertOctagon, Unlock, RotateCcw, ShieldAlert,
  Filter, ChevronDown, HardDrive, CalendarClock
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, PieChart, Pie, Cell, Legend,
} from "recharts";

/* ------------------------------------------------------------------ */
/* Design tokens — "vitals monitor" system                             */
/* Signature: the fleet is read the way a patient's vitals are read —  */
/* a live waveform + a BPM-style number that actually reacts to real   */
/* run-events, not a decorative pulse line.                            */
/* ------------------------------------------------------------------ */
const TOKENS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

:root { color-scheme: dark; }
html, body, #root { margin: 0; min-height: 100%; }
body { background: #07111f; }

.hb-root {
  --bg: #07111f;
  --bg-elevated: #0b1728;
  --surface: #0e1c2f;
  --surface-2: #13243b;
  --surface-3: #192c45;
  --surface-glass: rgba(14, 28, 47, .82);
  --border: #1e3551;
  --border-hover: #2d4a6b;
  --text: #edf4ff;
  --text-muted: #8ea3bd;
  --text-dim: #96aac2;
  --accent: #3ED9BE;
  --accent-strong: #22b99f;
  --accent-dim: rgba(62,217,190,.12);
  --accent-2: #7b8cff;
  --success: #31d583;
  --success-dim: rgba(49,213,131,.12);
  --danger: #ff5d6c;
  --danger-dim: rgba(255,93,108,.12);
  --warning: #f6b65b;
  --warning-dim: rgba(246,182,91,.12);
  --font-display: 'Manrope', sans-serif;
  --font-body: 'DM Sans', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --shadow-sm: 0 1px 2px rgba(0,0,0,.16), 0 6px 20px rgba(0,0,0,.12);
  --shadow-md: 0 16px 40px rgba(0,0,0,.24);
  background:
    radial-gradient(900px 500px at 12% -10%, rgba(62,217,190,.06), transparent 62%),
    radial-gradient(900px 600px at 95% 0%, rgba(123,140,255,.08), transparent 60%),
    var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  min-height: 100vh;
  width: 100%;
}
.hb-root * { box-sizing: border-box; }
.hb-root ::selection { background: var(--accent-dim); }
.hb-root button, .hb-root input, .hb-root select { font-family: inherit; }
.hb-root button { cursor: pointer; }
.hb-root :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 6px; }
.hb-scroll::-webkit-scrollbar { width: 7px; height: 7px; }
.hb-scroll::-webkit-scrollbar-track { background: transparent; }
.hb-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
.hb-eyebrow { font-size: 10px; letter-spacing: 1.35px; text-transform: uppercase; color: var(--text-dim); font-weight: 700; }
.hb-row-hover { transition: background .16s ease, transform .16s ease; }
.hb-row-hover:hover { background: rgba(255,255,255,.025); }
.hb-card { transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease; }
.hb-card:hover { transform: translateY(-2px); border-color: var(--border-hover); box-shadow: var(--shadow-md); }

.hb-app-shell {
  height: 100vh;
  display: flex;
  overflow: hidden;
}
.hb-sidebar { width: 248px; flex: 0 0 248px; min-height: 100vh; position: sticky; top: 0; display: flex; flex-direction: column; background: rgba(8,20,35,.92); border-right: 1px solid var(--border); backdrop-filter: blur(18px); z-index: 20; transition: width .2s ease, flex-basis .2s ease; }
.hb-sidebar.is-collapsed { width: 82px; flex-basis: 82px; }
.hb-brand { padding: 20px 18px 18px; display: flex; align-items: center; gap: 11px; }
.hb-brand-mark {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;

  background: transparent;
  box-shadow: none;
  overflow: hidden;
}

.hb-brand-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}.hb-sidebar-nav { flex: 1; overflow: auto; padding: 8px 12px; }
.hb-nav-section { padding: 9px 10px 7px; }
.hb-nav-item { width: 100%; display: flex; align-items: center; gap: 11px; min-height: 42px; padding: 7px 10px; border-radius: 11px; border: 1px solid transparent; background: transparent; color: var(--text-muted); font-size: 13px; font-weight: 600; text-align: left; transition: all .16s ease; }
.hb-nav-item:hover { background: rgba(255,255,255,.035); color: var(--text); }
.hb-nav-item.active { background: linear-gradient(90deg, rgba(62,217,190,.12), rgba(62,217,190,.035)); border-color: rgba(62,217,190,.16); color: var(--text); }
.hb-nav-icon { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; flex: 0 0 auto; color: var(--text-dim); background: var(--surface-3); }
.hb-nav-item.active .hb-nav-icon { color: var(--accent); background: var(--accent-dim); }
.hb-sidebar-footer { padding: 12px; border-top: 1px solid var(--border); }
.hb-profile { display: flex; align-items: center; gap: 10px; padding: 10px; border: 1px solid var(--border); background: rgba(255,255,255,.025); border-radius: 13px; }
.hb-avatar { width: 32px; height: 32px; border-radius: 10px; display: grid; place-items: center; flex: 0 0 auto; background: var(--accent-dim); color: var(--accent); font: 700 11px var(--font-display); }
.hb-shell-main {
  flex: 1;
  min-width: 0;
  margin-left: 0;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  transition: margin-left .2s ease;
}
.hb-topbar { min-height: 72px; position: sticky; top: 0; z-index: 15; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px clamp(18px,3vw,34px); background: rgba(7,17,31,.78); border-bottom: 1px solid rgba(30,53,81,.85); backdrop-filter: blur(18px); }
.hb-topbar-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
.hb-page-title { font: 800 19px/1.1 var(--font-display); text-transform: capitalize; }
.hb-page-meta { margin-top: 4px; color: var(--text-dim); font-size: 11.5px; }
.hb-main-content { padding: clamp(18px,3vw,32px); }
.hb-content-frame { max-width: 1600px; margin: 0 auto; }
.hb-mobile-toggle { display: none; }
.hb-mobile-nav { display: none; }
.hb-status-chip { display: inline-flex; align-items: center; gap: 7px; border: 1px solid var(--border); background: rgba(14,28,47,.9); border-radius: 999px; padding: 6px 9px 6px 11px; }
.hb-status-chip-label { color: var(--text-dim); font-size: 11px; }

.hb-dashboard-hero { display:flex; justify-content:space-between; align-items:flex-end; gap:18px; padding: 6px 0 20px; }
.hb-dashboard-title { margin:0; font: 800 clamp(25px,3vw,34px)/1.05 var(--font-display); letter-spacing:-.8px; }
.hb-dashboard-subtitle { color: var(--text-muted); font-size: 13px; margin-top: 7px; }
.hb-filter-bar { display:flex; align-items:center; gap:8px; flex-wrap:wrap; padding:7px; border:1px solid var(--border); border-radius:14px; background:rgba(14,28,47,.72); box-shadow:var(--shadow-sm); }
.hb-filter-label { color:var(--text-dim); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; padding:0 5px; }
.hb-stat-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; }
.hb-stat-card { min-width:0; padding:18px; border:1px solid var(--border); border-radius:16px; background:linear-gradient(180deg,rgba(14,28,47,.96),rgba(11,23,40,.96)); box-shadow:var(--shadow-sm); }
.hb-section-heading { display:flex; justify-content:space-between; align-items:center; gap:12px; margin: 22px 0 10px; }
.hb-section-title { font: 700 13px var(--font-display); }
.hb-section-subtitle { color:var(--text-dim); font-size:11px; }
.hb-panel { border:1px solid var(--border); border-radius:16px; background:rgba(14,28,47,.9); box-shadow:var(--shadow-sm); overflow:hidden; }
.hb-panel-header { padding:14px 17px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; gap:10px; }
.hb-panel-title { font:700 13.5px var(--font-display); }

@keyframes hb-pulse-dot { 0%,100% { opacity:1; } 50% { opacity:.45; } }
@keyframes hb-flow { from { transform:translateX(0); } to { transform:translateX(-50%); } }
@keyframes hb-flash { 0% { background:var(--accent-dim); } 100% { background:transparent; } }
@keyframes hb-spin { to { transform:rotate(360deg); } }
@keyframes hb-rise { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
@keyframes hb-glow { 0%,100% { opacity:.55; } 50% { opacity:1; } }
@keyframes hb-skeleton { 0% { background-position:-200px 0; } 100% { background-position:200px 0; } }
@keyframes hb-soft-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(62,217,190,.00), var(--shadow-sm); } 50% { box-shadow: 0 0 0 1px rgba(62,217,190,.18), 0 12px 38px rgba(62,217,190,.08); } }
@keyframes hb-border-scan { 0% { transform:translateX(-110%); opacity:0; } 18% { opacity:.8; } 50% { opacity:.9; } 82% { opacity:.8; } 100% { transform:translateX(110%); opacity:0; } }
@keyframes hb-ecg-beat { 0%, 70%, 100% { transform:scaleY(1); } 74% { transform:scaleY(1.05); } 78% { transform:scaleY(.98); } }
.hb-command-grid { display:grid; grid-template-columns:minmax(0,1.65fr) minmax(300px,.85fr); gap:14px; align-items:stretch; }
.hb-command-card { position:relative; overflow:hidden; border:1px solid var(--border); background:linear-gradient(145deg,rgba(14,28,47,.96),rgba(9,20,34,.96)); border-radius:18px; box-shadow:var(--shadow-sm); }
.hb-command-card::after { content:""; position:absolute; top:0; left:-35%; width:35%; height:1px; background:linear-gradient(90deg,transparent,var(--accent),transparent); animation:hb-border-scan 5.5s ease-in-out infinite; opacity:.5; }
.hb-glow-card { animation:hb-soft-pulse 4.5s ease-in-out infinite; }
.hb-glow-card:hover { transform:translateY(-3px); border-color:rgba(62,217,190,.35); box-shadow:0 18px 42px rgba(0,0,0,.28),0 0 28px rgba(62,217,190,.08); }
.hb-live-ecg { height:46px; overflow:hidden; border-radius:12px; background:rgba(3,12,22,.5); border:1px solid rgba(62,217,190,.1); position:relative; }
.hb-live-ecg::before { content:""; position:absolute; inset:0; background:linear-gradient(90deg,rgba(62,217,190,.03),transparent 30%,rgba(62,217,190,.05)); pointer-events:none; }
.hb-mini-kpi-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
.hb-mini-kpi { padding:14px 15px; border:1px solid var(--border); border-radius:14px; background:rgba(19,36,59,.72); transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease; }
.hb-mini-kpi:hover { transform:translateY(-2px); border-color:var(--border-hover); box-shadow:0 12px 30px rgba(0,0,0,.22); }
.hb-section-rule { display:flex; align-items:center; gap:10px; margin:24px 0 10px; }
.hb-section-rule::after { content:""; height:1px; flex:1; background:linear-gradient(90deg,var(--border),transparent); }
@media (max-width: 980px) { .hb-command-grid { grid-template-columns:1fr; } }
@media (max-width: 680px) { .hb-mini-kpi-grid { grid-template-columns:1fr; } }


/* ------------------------------------------------------------------ */
/* Dashboard V3 — asymmetric live operations architecture            */
/* ------------------------------------------------------------------ */
.hb-dashboard-v3 { max-width: 1600px; margin: 0 auto; }
.hb-dashboard-intro { display:flex; justify-content:space-between; align-items:flex-end; gap:24px; padding:4px 0 22px; }
.hb-v3-title { margin:7px 0 0; font:800 clamp(27px,3vw,38px)/1.04 var(--font-display); letter-spacing:-1px; }
.hb-v3-subtitle { max-width:690px; margin:9px 0 0; color:var(--text-muted); font-size:13px; line-height:1.55; }
.hb-v3-controls { display:flex; align-items:center; justify-content:flex-end; gap:8px; flex-wrap:wrap; }

.hb-heartbeat-bar { position: relative; height: 22px; overflow: hidden; margin-bottom: 8px; display: flex; align-items: center; }
.hb-heartbeat-svg { display: block; animation-name: hb-flow-ltr; animation-timing-function: linear; animation-iteration-count: infinite; transition: opacity .3s ease; }
@keyframes hb-flow-ltr { from { transform: translateX(-50%); } to { transform: translateX(0); } }
.hb-heartbeat-dot { animation: hb-glow 1.6s ease-in-out infinite; }
.hb-heartbeat-rate {
  position: absolute; right: 0; top: 50%; transform: translateY(-50%);
  display: flex; align-items: center; gap: 6px;
  font: 600 10.5px var(--font-mono); color: var(--text-dim);
  background: var(--bg); padding-left: 10px;
}
.hb-heartbeat-rate-dot { width: 6px; height: 6px; border-radius: 50%; }
@media (prefers-reduced-motion: reduce) { .hb-heartbeat-svg { animation: none; opacity: .35; } }

.hb-connection-pill { display:inline-flex; align-items:center; gap:7px; padding:8px 11px; border:1px solid var(--border); border-radius:999px; background:rgba(14,28,47,.72); color:var(--text-muted); font:600 11px var(--font-mono); }
.hb-connection-dot { width:7px; height:7px; border-radius:50%; display:inline-block; }
.hb-connection-dot.live { background:var(--success); box-shadow:0 0 0 4px var(--success-dim); animation:hb-pulse-dot 1.6s ease-in-out infinite; }
.hb-connection-dot.offline { background:var(--text-dim); }
.hb-section-date,.hb-section-hint { color:var(--text-dim); font:500 10px var(--font-mono); margin-left:auto; }
.hb-today-grid { display:grid; grid-template-columns:1.2fr 1fr 1fr 1fr; gap:12px; }
.hb-dash-metric { position:relative; overflow:hidden; min-height:150px; padding:18px 19px; border:1px solid var(--border); border-radius:17px; background:linear-gradient(145deg,rgba(14,28,47,.98),rgba(9,20,34,.98)); box-shadow:var(--shadow-sm); transition:transform .22s ease,border-color .22s ease,box-shadow .22s ease; animation:hb-rise .42s ease both; }
.hb-dash-metric:nth-child(2){animation-delay:.04s}.hb-dash-metric:nth-child(3){animation-delay:.08s}.hb-dash-metric:nth-child(4){animation-delay:.12s}
.hb-dash-metric::before { content:""; position:absolute; width:110px; height:110px; right:-48px; bottom:-55px; border-radius:50%; background:currentColor; opacity:.055; }
.hb-dash-metric:hover { transform:translateY(-4px); border-color:var(--border-hover); box-shadow:0 18px 38px rgba(0,0,0,.26),0 0 28px rgba(62,217,190,.045); }
.hb-dash-metric.is-live { box-shadow:0 0 0 1px rgba(246,182,91,.12),var(--shadow-sm); }
.hb-dash-metric.is-live::after { content:""; position:absolute; left:0; right:0; top:0; height:1px; background:linear-gradient(90deg,transparent,currentColor,transparent); animation:hb-border-scan 3.8s ease-in-out infinite; opacity:.65; }
.hb-dash-metric-top { display:flex; align-items:center; gap:8px; }
.hb-metric-icon { width:32px; height:32px; display:grid; place-items:center; border-radius:10px; background:rgba(255,255,255,.035); border:1px solid rgba(255,255,255,.045); }
.hb-dash-metric-value { margin-top:20px; font:700 clamp(30px,3vw,40px)/1 var(--font-mono); letter-spacing:-1.5px; }
.hb-dash-metric-note { margin-top:8px; color:var(--text-dim); font-size:11px; }
.hb-pulse-panel { position:relative; margin-top:14px; padding:18px; overflow:hidden; border:1px solid rgba(62,217,190,.2); border-radius:19px; background:linear-gradient(135deg,rgba(10,25,42,.98),rgba(12,30,48,.92)); box-shadow:0 18px 45px rgba(0,0,0,.18),0 0 45px rgba(62,217,190,.045); }
.hb-pulse-panel::before { content:""; position:absolute; inset:-1px; border-radius:20px; padding:1px; background:linear-gradient(100deg,transparent,rgba(62,217,190,.25),transparent); -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0); -webkit-mask-composite:xor; mask-composite:exclude; animation:hb-pulse-border 5s linear infinite; pointer-events:none; }
@keyframes hb-pulse-border { to { transform:translateX(25%); } }
.hb-pulse-header { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.hb-pulse-title { margin-top:4px; font:700 15px var(--font-display); }
.hb-pulse-status-dot { width:6px; height:6px; border-radius:50%; background:currentColor; display:inline-block; }
.hb-pulse-wave { position:relative; height:120px; margin:12px 0 10px; border-radius:13px; overflow:hidden; background:radial-gradient(circle at 50% 50%,rgba(62,217,190,.055),transparent 48%),rgba(3,12,22,.52); border:1px solid rgba(62,217,190,.08); }
.hb-pulse-wave svg { display:block; width:100%; height:100%; }
.hb-pulse-grid { fill:none; stroke:var(--border); stroke-width:1; opacity:.55; stroke-dasharray:2 9; }
.hb-pulse-line { fill:none; stroke-width:2.8; stroke-linecap:round; stroke-linejoin:round; stroke-dasharray:1500; animation:hb-pulse-draw 4.5s linear infinite; filter:drop-shadow(0 0 5px rgba(62,217,190,.22)); }
@keyframes hb-pulse-draw { from { stroke-dashoffset:1500; } to { stroke-dashoffset:0; } }
.hb-pulse-beacon { fill:var(--accent); filter:drop-shadow(0 0 8px rgba(62,217,190,.65)); animation:hb-beacon 1.4s ease-in-out infinite; }
@keyframes hb-beacon { 50% { r:8; opacity:.45; } }
.hb-pulse-scan { position:absolute; top:0; bottom:0; width:1px; background:linear-gradient(transparent,var(--accent),transparent); box-shadow:0 0 14px rgba(62,217,190,.55); animation:hb-scan 3.8s linear infinite; opacity:.45; }
@keyframes hb-scan { from { left:-2%; } to { left:102%; } }
.hb-pulse-stages { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
.hb-pulse-stage { display:flex; align-items:center; gap:9px; padding:11px 13px; border:1px solid var(--border); border-radius:12px; background:rgba(19,36,59,.56); }
.hb-pulse-stage-dot { width:8px; height:8px; border-radius:50%; background:var(--text-dim); box-shadow:0 0 0 4px rgba(255,255,255,.025); }
.hb-pulse-stage.running .hb-pulse-stage-dot { background:var(--warning); box-shadow:0 0 0 4px var(--warning-dim); animation:hb-pulse-dot 1.4s ease-in-out infinite; }
.hb-pulse-stage.failed .hb-pulse-stage-dot { background:var(--danger); box-shadow:0 0 0 4px var(--danger-dim); }
.hb-pulse-stage.success .hb-pulse-stage-dot { background:var(--success); box-shadow:0 0 0 4px var(--success-dim); }
.hb-pulse-stage b { display:block; font:650 15px var(--font-mono); }.hb-pulse-stage span { display:block; margin-top:2px; color:var(--text-dim); font-size:10px; }
.hb-analytics-zone,.hb-value-zone,.hb-overall-zone,.hb-runs-zone { margin-top:22px; }
.hb-period-toggle { margin-left:auto; display:inline-flex; gap:2px; padding:3px; border:1px solid var(--border); border-radius:9px; background:rgba(14,28,47,.72); }
.hb-period-toggle button { border:0; border-radius:6px; padding:5px 10px; color:var(--text-dim); background:transparent; font-size:10.5px; font-weight:700; }
.hb-period-toggle button:hover { color:var(--text); }.hb-period-toggle button.active { color:var(--text); background:var(--surface-3); box-shadow:0 0 0 1px var(--border); }
.hb-analytics-grid { display:grid; grid-template-columns:1.25fr 1.25fr .8fr; gap:12px; }
.hb-analytics-card,.hb-status-card { min-width:0; min-height:340px; padding:17px; border:1px solid var(--border); border-radius:17px; background:linear-gradient(150deg,rgba(14,28,47,.96),rgba(9,20,34,.96)); box-shadow:var(--shadow-sm); transition:transform .22s ease,border-color .22s ease,box-shadow .22s ease; }
.hb-analytics-card:hover,.hb-status-card:hover { transform:translateY(-3px); border-color:var(--border-hover); box-shadow:0 18px 40px rgba(0,0,0,.25),0 0 26px rgba(62,217,190,.04); }
.hb-analytics-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
.hb-analytics-title { margin-top:4px; font:700 15px var(--font-display); }.hb-analytics-subtitle { margin-top:3px; color:var(--text-dim); font-size:10.5px; }
.hb-chart-orb { width:9px; height:9px; border-radius:50%; background:var(--accent); box-shadow:0 0 0 5px var(--accent-dim),0 0 14px rgba(62,217,190,.3); animation:hb-glow 2.2s ease-in-out infinite; }
.hb-analytics-blue .hb-chart-orb { background:var(--accent-2); box-shadow:0 0 0 5px rgba(123,140,255,.1),0 0 14px rgba(123,140,255,.25); }
.hb-analytics-chart { height:245px; margin-top:14px; }
.hb-status-rate { color:var(--success); font:700 18px var(--font-mono); text-align:right; }.hb-status-rate span { display:block; color:var(--text-dim); font:500 9px var(--font-body); margin-top:2px; }
.hb-status-visual { display:flex; align-items:center; justify-content:center; gap:20px; height:245px; }
.hb-status-ring { width:142px; height:142px; border-radius:50%; display:grid; place-items:center; background:conic-gradient(var(--success) var(--success-pct),var(--danger) var(--success-pct) 96%,var(--warning) 96%); position:relative; box-shadow:0 0 30px rgba(62,217,190,.08); }
.hb-status-ring::before { content:""; position:absolute; inset:11px; border-radius:50%; background:var(--surface); border:1px solid var(--border); }.hb-status-ring div { position:relative; z-index:1; text-align:center; }.hb-status-ring strong { display:block; font:700 27px var(--font-mono); }.hb-status-ring span { display:block; color:var(--text-dim); font-size:9px; margin-top:2px; }
.hb-status-legend { display:grid; gap:13px; }.hb-status-legend div { display:grid; grid-template-columns:8px auto; column-gap:8px; align-items:center; }.hb-status-legend .status-dot { width:7px; height:7px; border-radius:50%; grid-row:span 2; }.hb-status-legend .success { background:var(--success); }.hb-status-legend .failed { background:var(--danger); }.hb-status-legend .running { background:var(--warning); }.hb-status-legend b { font:600 13px var(--font-mono); }.hb-status-legend small { color:var(--text-dim); font-size:9.5px; }
.hb-value-grid { display:grid; grid-template-columns:1.3fr 1.2fr 1fr 1fr; gap:10px; }
.hb-value-card { position:relative; min-height:142px; overflow:hidden; padding:16px; border:1px solid var(--border); border-radius:15px; background:rgba(14,28,47,.82); transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease; }
.hb-value-card::after { content:""; position:absolute; width:90px; height:90px; right:-38px; bottom:-42px; border-radius:50%; background:var(--accent); opacity:.04; }.hb-value-card:hover { transform:translateY(-3px); border-color:var(--border-hover); box-shadow:0 16px 34px rgba(0,0,0,.22); }.hb-value-card-icon { width:30px; height:30px; display:grid; place-items:center; border-radius:9px; background:rgba(255,255,255,.035); margin-bottom:12px; }.hb-value-card-value { margin-top:7px; font:650 clamp(20px,2.2vw,28px) var(--font-mono); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }.hb-value-card-caption { margin-top:5px; color:var(--text-dim); font-size:10.5px; }
.hb-overall-card { position:relative; display:grid; grid-template-columns:1.6fr repeat(3,1fr); align-items:stretch; overflow:hidden; border:1px solid rgba(123,140,255,.2); border-radius:18px; background:linear-gradient(120deg,rgba(19,30,57,.98),rgba(10,22,38,.96)); box-shadow:0 20px 45px rgba(0,0,0,.2),0 0 35px rgba(123,140,255,.05); }
.hb-overall-main { position:relative; padding:21px 22px; overflow:hidden; }.hb-overall-orbit { position:absolute; width:180px; height:180px; right:-75px; top:-75px; border:1px solid rgba(123,140,255,.15); border-radius:50%; box-shadow:0 0 40px rgba(123,140,255,.07); animation:hb-orbit 8s linear infinite; }.hb-overall-orbit::after { content:""; position:absolute; width:6px; height:6px; border-radius:50%; background:var(--accent-2); left:24px; top:40px; box-shadow:0 0 12px rgba(123,140,255,.8); }
@keyframes hb-orbit { to { transform:rotate(360deg); } }
.hb-overall-number { margin-top:7px; font:750 clamp(31px,4vw,44px) var(--font-mono); color:var(--text); letter-spacing:-2px; }.hb-overall-caption { margin-top:5px; color:var(--text-dim); font-size:10.5px; }.hb-overall-stat { display:flex; flex-direction:column; justify-content:center; padding:18px; border-left:1px solid var(--border); }.hb-overall-stat span { color:var(--text-dim); font-size:10px; text-transform:uppercase; letter-spacing:.7px; }.hb-overall-stat strong { margin-top:7px; font:700 24px var(--font-mono); }.hb-overall-stat.success strong { color:var(--success); }.hb-overall-stat.danger strong { color:var(--danger); }.hb-overall-stat.accent strong { color:var(--accent); }
.hb-runs-panel { overflow:hidden; border:1px solid var(--border); border-radius:17px; background:rgba(14,28,47,.88); box-shadow:var(--shadow-sm); }.hb-runs-head { display:flex; align-items:center; justify-content:space-between; gap:15px; padding:15px 17px; border-bottom:1px solid var(--border); }.hb-runs-table-head,.hb-run-row { display:grid; grid-template-columns:minmax(0,1.6fr) minmax(130px,1fr) 110px 90px; align-items:center; gap:12px; }.hb-runs-table-head { padding:9px 17px; color:var(--text-dim); font:700 9px var(--font-mono); text-transform:uppercase; letter-spacing:.7px; background:rgba(3,12,22,.3); }.hb-runs-list { max-height:410px; overflow-y:auto; }.hb-run-row { min-height:63px; padding:10px 17px; border-top:1px solid rgba(30,53,81,.72); transition:background .18s ease,transform .18s ease; }.hb-run-row:hover { background:rgba(19,36,59,.55); }.hb-run-row.fresh { animation:hb-run-flash 1.1s ease-out; }.hb-run-bot { display:flex; align-items:center; gap:9px; min-width:0; }.hb-run-bot strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12.5px; }.hb-run-bot small { display:block; margin-top:3px; color:var(--text-dim); font:500 9.5px var(--font-mono); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.hb-run-client,.hb-run-time { color:var(--text-muted); font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.hb-run-time { color:var(--text-dim); font-family:var(--font-mono); text-align:right; }.hb-empty-runs { padding:42px 20px; text-align:center; color:var(--text-dim); font-size:12px; }
@keyframes hb-run-flash { 0% { background:rgba(62,217,190,.12); } 100% { background:transparent; } }
.hb-dashboard-footer { display:flex; justify-content:space-between; align-items:flex-start; gap:20px; margin-top:30px; padding:20px 2px 8px; border-top:1px solid var(--border); color:var(--text-dim); font-size:10.5px; }.hb-dashboard-footer div { display:flex; flex-direction:column; gap:4px; }.hb-dashboard-footer strong { color:var(--text-muted); font:650 11px var(--font-display); }.hb-dashboard-footer a { color:var(--text-muted); text-decoration:none; }.hb-dashboard-footer a:hover { color:var(--accent); }
@media (max-width: 1120px) { .hb-today-grid{grid-template-columns:repeat(2,1fr)} .hb-analytics-grid{grid-template-columns:1fr 1fr}.hb-status-card{grid-column:1/-1}.hb-value-grid{grid-template-columns:repeat(2,1fr)} .hb-overall-card{grid-template-columns:1.4fr 1fr 1fr 1fr} }
@media (max-width: 820px) { .hb-dashboard-intro{align-items:flex-start;flex-direction:column}.hb-v3-controls{width:100%;justify-content:flex-start}.hb-analytics-grid{grid-template-columns:1fr}.hb-status-card{grid-column:auto}.hb-overall-card{grid-template-columns:1fr 1fr}.hb-overall-main{grid-column:1/-1}.hb-overall-stat:nth-child(2){border-left:0}.hb-runs-table-head,.hb-run-row{grid-template-columns:minmax(0,1.5fr) 100px 82px}.hb-runs-table-head span:nth-child(2),.hb-run-row .hb-run-client{display:none} }
@media (max-width: 620px) { .hb-today-grid{grid-template-columns:1fr}.hb-pulse-stages{grid-template-columns:1fr}.hb-value-grid{grid-template-columns:1fr}.hb-overall-card{grid-template-columns:1fr}.hb-overall-main{grid-column:auto}.hb-overall-stat{border-left:0;border-top:1px solid var(--border)}.hb-runs-head{align-items:flex-start;flex-direction:column}.hb-runs-table-head,.hb-run-row{grid-template-columns:minmax(0,1fr) 82px}.hb-runs-table-head span:nth-child(3),.hb-run-row>div:nth-child(3){display:none}.hb-dashboard-footer{flex-direction:column}.hb-section-date,.hb-section-hint{display:none} }
@media (prefers-reduced-motion: reduce) { .hb-pulse-line,.hb-pulse-beacon,.hb-pulse-scan,.hb-overall-orbit,.hb-dash-metric,.hb-value-card,.hb-analytics-card,.hb-status-card{animation:none!important;transition:none!important} }

/* =========================================================
   HEARTBEAT - LIVE EXECUTION ECG BORDER
   ========================================================= */

.hb-dashboard-live {
  position: relative;
  isolation: isolate;
}

/* Subtle permanent dashboard border */
.hb-dashboard-live::before {
  content: "";
  position: absolute;
  inset: 8px;
  border: 1px solid rgba(62, 217, 190, 0.14);
  border-radius: 18px;
  pointer-events: none;
  z-index: 0;
}

/* ECG border */
.hb-ecg-border {
  position: absolute;
  inset: 8px;
  width: calc(100% - 16px);
  height: calc(100% - 16px);

  pointer-events: none;
  z-index: 3;
  overflow: visible;
}

/* Faint border track */
.hb-ecg-track {
  fill: none;
  stroke: rgba(62, 217, 190, 0.08);
  stroke-width: 1;
}

/* Moving ECG signal */
.hb-ecg-wave {
  fill: none;
  stroke: var(--accent);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 0 5px rgba(62, 217, 190, 0.55));
}

@keyframes hb-ecg-run {
  from { stroke-dashoffset: 0; }
  to   { stroke-dashoffset: -3170; }
}
@media (prefers-reduced-motion: reduce) {
  .hb-ecg-wave {
    animation: none;
    opacity: 0.4;
  }
}

@media (max-width: 1100px) {
  .hb-sidebar { width:82px; flex-basis:82px; }
  .hb-brand { justify-content:center; padding-left:10px; padding-right:10px; }
  .hb-brand-copy, .hb-nav-label, .hb-nav-section, .hb-profile-copy, .hb-profile-action, .hb-collapse-copy { display:none !important; }
  .hb-sidebar-nav { padding-left:10px; padding-right:10px; }
  .hb-nav-item { justify-content:center; padding:7px; }
  .hb-nav-icon { width:34px; height:34px; }
  .hb-sidebar-footer { padding:10px; }
  .hb-profile { justify-content:center; padding:8px; }
  .hb-stat-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
}
@media (max-width: 760px) {
  .hb-app-shell { display:block; }
  .hb-sidebar { display:none; }
  .hb-topbar { min-height:62px; padding:10px 14px; }
  .hb-mobile-toggle { display:grid; place-items:center; width:36px; height:36px; border:1px solid var(--border); background:var(--surface); color:var(--text-muted); border-radius:10px; }
  .hb-main-content { padding:14px; padding-bottom:82px; }
  .hb-page-title { font-size:16px; }
  .hb-page-meta { display:none; }
  .hb-dashboard-hero { display:block; padding-top:2px; }
  .hb-dashboard-title { font-size:25px; }
  .hb-dashboard-subtitle { font-size:12.5px; }
  .hb-filter-bar { margin-top:14px; width:100%; }
  .hb-filter-label { display:none; }
  .hb-stat-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:9px; }
  .hb-stat-card { padding:14px; }
  .hb-mobile-nav { position:fixed; display:flex; left:10px; right:10px; bottom:10px; z-index:50; gap:4px; padding:6px; border:1px solid var(--border); border-radius:16px; background:rgba(8,20,35,.94); backdrop-filter:blur(18px); box-shadow:0 16px 36px rgba(0,0,0,.38); overflow-x:auto; }
  .hb-mobile-nav button { flex:1 0 64px; border:0; background:transparent; color:var(--text-dim); border-radius:11px; min-height:50px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; font-size:9.5px; font-weight:700; }
  .hb-mobile-nav button.active { color:var(--accent); background:var(--accent-dim); }
}
@media (max-width: 520px) {
  .hb-stat-grid { grid-template-columns:1fr 1fr; }
  .hb-topbar-left { gap:8px; }
  .hb-status-chip-label { display:none; }
}
@media (prefers-reduced-motion: reduce) { .hb-root * { animation:none !important; transition:none !important; } }
`;
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
      const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${baseUrl}${path}`, { ...options, headers });
      let body = null;
      try { body = await res.json(); } catch (_) { /* no body */ }

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

  return useCallback((path, options = {}) => request(path, options, session.token), [request, session.token]);
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
function useCountUpFloat(target, decimals = 2, duration = 700) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (typeof target !== "number" || isNaN(target)) return;
    let raf; let start;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(target * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => raf && cancelAnimationFrame(raf);
  }, [target, duration]);
  return typeof target === "number" ? display.toFixed(decimals) : target;
}

/* ------------------------------------------------------------------ */
/* Small building blocks                                                */
/* ------------------------------------------------------------------ */
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
function StatSection({ title, children }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
      padding: "16px 18px 18px", flex: "1 1 320px", minWidth: 300,
    }}>
      <div className="hb-eyebrow" style={{ marginBottom: 12 }}>{title}</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

function MiniStat({ label, value, tone = "accent", index = 0 }) {
  const colorMap = {
    accent: "var(--accent)", success: "var(--success)",
    danger: "var(--danger)", warning: "var(--warning)",
  };
  const animated = useCountUp(typeof value === "number" ? value : NaN);
  const shown = typeof value === "number" ? animated : value;
  return (
    <div style={{
      flex: "1 1 110px", minWidth: 90, background: "var(--surface-2)", border: "1px solid var(--border)",
      borderRadius: 10, padding: "11px 14px", animation: `hb-rise .4s ease ${index * 0.05}s both`,
    }}>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, fontWeight: 500 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 21, fontWeight: 600, color: colorMap[tone] || "var(--text)" }}>
        {shown}
      </div>
    </div>
  );
}

/* Big, headline-weight cards for "Run summary" — the numbers that matter
   most get the largest treatment, an icon chip, a soft radial glow, and
   a pulsing icon when there's something actually running right now. */
function BigStatCard({ icon: Icon, label, value, tone = "accent", index = 0, pulse = false, subtitle = null }) {
  const colorMap = { accent: "var(--accent)", success: "var(--success)", danger: "var(--danger)", warning: "var(--warning)" };
  const dimMap = { accent: "var(--accent-dim)", success: "var(--success-dim)", danger: "var(--danger-dim)", warning: "var(--warning-dim)" };
  const color = colorMap[tone] || "var(--accent)";
  const dim = dimMap[tone] || "var(--accent-dim)";
  const animated = useCountUp(typeof value === "number" ? value : NaN);
  const shown = typeof value === "number" ? animated : value;
  return (
    <div
      style={{
        flex: "1 1 210px", minWidth: 190, background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 18, padding: "22px 24px", position: "relative", overflow: "hidden",
        animation: `hb-rise .5s ease ${index * 0.06}s both`,
        transition: "transform .2s ease, border-color .2s ease, box-shadow .2s ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.boxShadow = "0 12px 28px rgba(0,0,0,0.25)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ position: "absolute", top: -36, right: -36, width: 120, height: 120, borderRadius: "50%", background: color, opacity: 0.07 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, position: "relative" }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
          background: dim, color, flexShrink: 0,
          animation: pulse ? "hb-pulse-dot 1.4s ease-in-out infinite" : "none",
        }}>
          <Icon size={18} />
        </div>
        <div className="hb-eyebrow">{label}</div>
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 36, fontWeight: 700, color, lineHeight: 1, position: "relative" }}>
        {shown}
      </div>
      {subtitle && (
        <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 8, position: "relative" }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

/* Compact single item inside the fleet-snapshot ticker strip */
function FleetSnapshotItem({ icon: Icon, label, value, index = 0 }) {
  const animated = useCountUp(typeof value === "number" ? value : NaN, 500);
  const shown = typeof value === "number" ? animated : value;
  return (
    <div style={{
      flex: "1 1 140px", minWidth: 130, display: "flex", alignItems: "center", gap: 10,
      padding: "13px 18px", animation: `hb-rise .4s ease ${index * 0.05}s both`,
    }}>
      <Icon size={15} color="var(--text-dim)" style={{ flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 16.5, fontWeight: 600, color: "var(--text)" }}>{shown}</div>
        <div style={{ fontSize: 10.5, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 0.6, whiteSpace: "nowrap" }}>{label}</div>
      </div>
    </div>
  );
}

/* Secondary, quieter row underneath the run summary — same info density
   as before, but visually de-emphasized as a single ticker strip rather
   than boxed cards, so it reads as supporting context, not headline. */
function FleetSnapshotStrip({ items }) {
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", background: "var(--surface-2)", border: "1px solid var(--border)",
      borderRadius: 12, overflow: "hidden", marginBottom: 22,
    }}>
      {items.map((it, i) => (
        <React.Fragment key={it.label}>
          {i > 0 && <div style={{ width: 1, background: "var(--border)", flexShrink: 0 }} />}
          <FleetSnapshotItem {...it} index={i} />
        </React.Fragment>
      ))}
    </div>
  );
}

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
          background: "none", border: "none", fontSize: 16, lineHeight: 1,
          padding: 6, borderRadius: 6, color: "var(--text-muted)",
        }}
      >
        {visible ? "🙉" : "🙈"}
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
function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}
function getYesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
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

function ChartCard({ title, children, height = 220, totalLabel, totalValue, totalTone = "accent" }) {
  const colorMap = {
    accent: "var(--accent)", success: "var(--success)",
    danger: "var(--danger)", warning: "var(--warning)", accent2: "var(--accent-2)",
  };
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14 }}>{title}</div>
        {totalValue != null && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 17, fontWeight: 700, color: colorMap[totalTone] || "var(--text)", lineHeight: 1 }}>
              {totalValue}
            </div>
            <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 2 }}>{totalLabel}</div>
          </div>
        )}
      </div>
      <div style={{ height }}>{children}</div>
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

function ChartsPanel({ runTrend = [], hoursTrend = [], statusSummary }) {
  const statusData = statusSummary ? [
    { name: "Running", value: statusSummary.started, color: CHART_COLORS.warning },
    { name: "Success", value: statusSummary.success, color: CHART_COLORS.success },
    { name: "Failed", value: statusSummary.failed, color: CHART_COLORS.danger },
  
  ].filter((d) => d.value > 0) : [];

  const totalRuns = (runTrend || []).reduce((s, d) => s + (d.runs || 0), 0);
  const totalHours = (hoursTrend || []).reduce((s, d) => s + (d.hours || 0), 0);

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1.3fr 1fr", gap: 16 }}>
        <ChartCard title="Runs over time" totalValue={totalRuns} totalLabel="total runs" totalTone="accent2">
          {runTrend.length === 0 ? (
            <EmptyChartState />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={runTrend} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="runsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.accent2} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={CHART_COLORS.accent2} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART_COLORS.border} vertical={false} />
                <XAxis dataKey="date" stroke={CHART_COLORS.muted} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={CHART_COLORS.muted} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="runs" name="Runs" stroke={CHART_COLORS.accent2} strokeWidth={2} fill="url(#runsGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Hours saved over time" totalValue={totalHours ? totalHours.toFixed(1) : 0} totalLabel="hours saved" totalTone="success">
          {hoursTrend.length === 0 ? (
            <EmptyChartState />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hoursTrend} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.success} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={CHART_COLORS.success} stopOpacity={0.35} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART_COLORS.border} vertical={false} />
                <XAxis dataKey="date" stroke={CHART_COLORS.muted} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={CHART_COLORS.muted} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="hours" name="Hours saved" fill="url(#hoursGrad)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Status breakdown">
          {statusData.length === 0 ? (
            <EmptyChartState />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData} dataKey="value" nameKey="name"
                  innerRadius={45} outerRadius={70} paddingAngle={3}
                  stroke="none"
                >
                  {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  verticalAlign="bottom" height={28}
                  formatter={(value) => <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Login screen                                                        */
/* ------------------------------------------------------------------ */
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

function LoginScreen({ onLogin, sessionMessage }) {
  const [baseUrl, setBaseUrl] = useState("http://127.0.0.1:8000");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [debugLog, setDebugLog] = useState([]);

  const log = (msg) => setDebugLog((prev) => [...prev, `${new Date().toLocaleTimeString()} — ${msg}`]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setDebugLog([]);
    log("Sign in clicked.");
    setLoading(true);
    try {
      log(`Sending request to ${baseUrl}/auth/login ...`);
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      log(`Response received. Status: ${res.status}`);
      const data = await res.json();
      log(`Response body parsed.`);
      if (!res.ok) throw new Error(data?.message || data?.detail?.[0]?.msg || "Login failed.");
      log("Login successful, entering app...");
      onLogin({
        baseUrl,
        token: data.access_token,
        refreshToken: data.refresh_token,
        role: data.role,
        clientId: data.client_id,
        email,
      });
    } catch (err) {
      log(`ERROR: ${err.message}`);
      setError(err.message || "Could not reach the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hb-root" style={{
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <style>{TOKENS}</style>
      <div style={{ width: 380, maxWidth: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, justifyContent: "center" }}>
          <Activity size={22} color="var(--accent)" />
          <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, letterSpacing: -0.3 }}>HeartBeat</span>
        </div>
        <VitalsMark active={true} />
        <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13, marginBottom: 24 }}>
          RPA fleet monitoring for StayAhead Legal
        </div>

        <form onSubmit={submit} style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 16, padding: 26,
        }}>
          <ErrorBanner message={error} onDismiss={() => setError("")} />
          {!error && <InfoBanner message={sessionMessage} />}

          <Field label="Backend URL">
            <input style={inputStyle} value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
          </Field>
          <Field label="Email">
            <input style={inputStyle} type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@stayahead.com" />
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

          <Button type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
            {loading ? <Loader2 size={15} style={{ animation: "hb-spin 1s linear infinite" }} /> : null}
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        {debugLog.length > 0 && (
          <div style={{
            marginTop: 16, background: "var(--surface-2)", border: "1px solid var(--border)",
            borderRadius: 10, padding: 12, fontFamily: "var(--font-mono)", fontSize: 11.5,
            color: "var(--text-muted)", maxHeight: 160, overflowY: "auto",
          }} className="hb-scroll">
            {debugLog.map((line, i) => (
              <div key={i} style={{ marginBottom: 4, color: line.includes("ERROR") ? "var(--danger)" : "var(--text-muted)" }}>
                {line}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
];

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

/* Segmented status filter for Recent Runs — All / Success / Failed / Running */
function StatusFilterTabs({ value, onChange }) {
  const options = [
    { key: "Started", label: "Running", color: "var(--warning)" },
    { key: "all", label: "All", color: "var(--text-muted)" },
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
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            style={{
              border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11.5, fontWeight: 600,
              background: active ? "var(--surface-3)" : "transparent",
              color: active ? o.color : "var(--text-dim)",
              display: "inline-flex", alignItems: "center", gap: 5,
              transition: "background .15s, color .15s",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: o.color, flexShrink: 0, opacity: active ? 1 : 0.5 }} />
            {o.label}
          </button>
        );
      })}
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

function VitalsStrip({ events, connected }) {
  const rate = useEventRate(events);
  const lastFailed = events[0]?.status === "Failed";
  const lineColor = lastFailed ? "var(--danger)" : "var(--accent)";
  const speed = Math.max(1.1, 3.2 - Math.min(rate, 15) * 0.12);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 22,
      background: "linear-gradient(180deg, var(--surface) 0%, var(--surface-2) 100%)",
      border: "1px solid var(--border)", borderRadius: 16, padding: "16px 22px 16px 24px",
      marginBottom: 20,
    }}>
      <div style={{ flexShrink: 0 }}>
        {connected
          ? <Badge tone={lastFailed ? "danger" : "success"}><Wifi size={11} /> live</Badge>
          : <Badge tone="muted"><WifiOff size={11} /> offline</Badge>}
      </div>
      <div style={{ position: "relative", flex: 1, height: 50, overflow: "hidden" }}>
        <svg width="200%" height="50" viewBox="0 0 900 50" style={{
          animation: connected ? `hb-flow ${speed}s linear infinite` : "none",
          opacity: connected ? 1 : 0.25,
        }}>
          <defs>
            <linearGradient id="vitalsGrad" x1="0" x2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0" />
              <stop offset="50%" stopColor={lineColor} stopOpacity="1" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 450].map((o) => (
            <path key={o}
              d={`M${o},25 L${o + 140},25 L${o + 160},6 L${o + 182},44 L${o + 200},25 L${o + 450},25`}
              fill="none" stroke="url(#vitalsGrad)" strokeWidth="2.5" strokeLinecap="round" />
          ))}
        </svg>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0, minWidth: 78 }}>
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: 32, fontWeight: 600, lineHeight: 1,
          color: lineColor, animation: connected && rate > 0 ? "hb-glow 1.6s ease-in-out infinite" : "none",
        }}>
          {rate}
        </div>
        <div className="hb-eyebrow" style={{ marginTop: 4 }}>runs / min</div>
      </div>
    </div>
  );
}

/* Detail popover: exact running bot names + status for one client,
   opened by clicking that client's chip. Pulls from
   /dashboard/running-bots?client_id=X (not just an aggregate count). */
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

function DashboardValueCard({ label, value, caption, tone = "accent", icon: Icon }) {
  const color = tone === "success" ? "var(--success)" : tone === "danger" ? "var(--danger)" : "var(--accent)";
  return (
    <div className="hb-value-card">
      <div className="hb-value-card-icon" style={{ color }}><Icon size={17} /></div>
      <div className="hb-eyebrow">{label}</div>
      <div className="hb-value-card-value" style={{ color }}>{value}</div>
      <div className="hb-value-card-caption">{caption}</div>
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

function DashboardView({ api, wsConnected, liveEvents, role, session }) {
  const [summary, setSummary] = useState(null);
  const [recent, setRecent] = useState([]);
  const [runTrendRaw, setRunTrendRaw] = useState([]);
  const [hoursTrendRaw, setHoursTrendRaw] = useState([]);
  const [statusSummary, setStatusSummary] = useState(null);
  const [error, setError] = useState("");
  const [department, setDepartment] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [recentStatusFilter, setRecentStatusFilter] = useState("all");
  const [period, setPeriod] = useState("day");
  const isAdmin = role === "admin";

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
      const trendSuffix = qs ? `${qs}&period=${period}` : `?period=${period}`;
      const [s, r, rt, ht, ss] = await Promise.all([
        api(`/dashboard/summary${qs}`),
        api(`/dashboard/recent-runs${qs}`),
        api(`/dashboard/run-trend${trendSuffix}`),
        api(`/dashboard/hours-saved-trend${trendSuffix}`),
        api(`/dashboard/status-summary${qs}`),
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

  const runTrendForChart = useMemo(() => (runTrendRaw || []).map((d) => ({ date: period === "month" ? d.run_date?.slice(0, 7) : d.run_date?.slice(5), runs: d.total_runs })), [runTrendRaw, period]);
  const hoursTrendForChart = useMemo(() => (hoursTrendRaw || []).map((d) => ({ date: period === "month" ? d.run_date?.slice(0, 7) : d.run_date?.slice(5), hours: d.hours_saved })), [hoursTrendRaw, period]);
  const filteredRecent = recentStatusFilter === "all" ? recent : recent.filter((r) => r.status === recentStatusFilter);
  const clientName = isAdmin ? "Operations fleet" : (session?.clientName || session?.client_name || session?.email?.split("@")[0] || "Your workspace");

  const totalTrendRuns = runTrendForChart.reduce((sum, row) => sum + Number(row.runs || 0), 0);
  const totalTrendHours = hoursTrendForChart.reduce((sum, row) => sum + Number(row.hours || 0), 0);

  return (
    <div className="hb-dashboard-v3">
      <ErrorBanner message={error} onDismiss={() => setError("")} />
        <ExecutionPulseBar events={liveEvents} connected={wsConnected} />

      <section className="hb-dashboard-intro">
        <div>
          <div className="hb-eyebrow">{isAdmin ? "Robots " : "Client operations"}</div>
          <h1 className="hb-v3-title">{isAdmin ? " Performance Dashboard" : `${clientName} Robots Performance`}</h1>
          <p className="hb-v3-subtitle">Real-time visibility into today's executions, automation value and operational health.</p>
        </div>
        <div className="hb-v3-controls">
          <div className="hb-connection-pill">
            <span className={`hb-connection-dot ${wsConnected ? "live" : "offline"}`} />
            {wsConnected ? "Live" : "Offline"}
          </div>
          <div className="hb-filter-bar"><span className="hb-filter-label">Scope</span><FilterPopover groups={filterGroups} /></div>
          <ActiveFilterChips groups={filterGroups} />
        </div>
      </section>

      <section className="hb-today-section">
        <div className="hb-section-rule"><div className="hb-eyebrow">Today's run summary</div><span className="hb-section-date">{new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span></div>
        <div className="hb-today-grid">
          <DashboardMetric icon={Activity} label="Total runs" value={todayRuns} tone="accent" note={runsPctChange != null ? `${runsPctChange >= 0 ? "+" : ""}${runsPctChange}% vs yesterday` : "Today's execution volume"} />
           <DashboardMetric icon={Clock} label="Running now" value={summary?.running_bots ?? "—"} tone="warning" note="Active executions" pulse={Number(summary?.running_bots || 0) > 0} />
          <DashboardMetric icon={CheckCircle2} label="Success" value={todaySuccess} tone="success" note="Completed successfully" />
          <DashboardMetric icon={XCircle} label="Failed" value={todayFailed} tone="danger" note="Requires attention" pulse={todayFailed > 0} />
         
        </div>
      </section>

      {/* <ExecutionPulse wsConnected={wsConnected} statusSummary={statusSummary} runningCount={summary?.running_bots} /> */}

      <section className="hb-analytics-zone">
        <div className="hb-section-rule"><div className="hb-eyebrow">Performance analytics</div><div className="hb-period-toggle">
          {[['day','Daily'],['week','Weekly'],['month','Monthly']].map(([key, label]) => <button key={key} className={period === key ? "active" : ""} onClick={() => setPeriod(key)}>{label}</button>)}
        </div></div>
        <div className="hb-analytics-grid">
          <DashboardChartPanel title="Runs over time" subtitle={`${totalTrendRuns.toLocaleString()} runs in selected period`} accent="blue">
            {runTrendForChart.length === 0 ? <EmptyChartState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={runTrendForChart} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs><linearGradient id="hbRunsV3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent-2)" stopOpacity=".38"/><stop offset="100%" stopColor="var(--accent-2)" stopOpacity="0"/></linearGradient></defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--text-dim)" fontSize={10.5} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-dim)" fontSize={10.5} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="runs" name="Runs" stroke="var(--accent-2)" strokeWidth={2.5} fill="url(#hbRunsV3)" isAnimationActive animationDuration={850} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </DashboardChartPanel>

          <DashboardChartPanel title="Hours saved over time" subtitle={`${totalTrendHours.toFixed(1)} hours in selected period`} accent="green">
            {hoursTrendForChart.length === 0 ? <EmptyChartState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hoursTrendForChart} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs><linearGradient id="hbHoursV3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity=".95"/><stop offset="100%" stopColor="var(--accent)" stopOpacity=".2"/></linearGradient></defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--text-dim)" fontSize={10.5} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-dim)" fontSize={10.5} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="hours" name="Hours saved" fill="url(#hbHoursV3)" radius={[5,5,0,0]} isAnimationActive animationDuration={700} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </DashboardChartPanel>

          <DashboardStatusBreakdown statusSummary={statusSummary} />
        </div>
      </section>

            <section className="hb-overall-zone">
        <div className="hb-section-rule"><div className="hb-eyebrow">Overall performance</div><span className="hb-section-hint">Lifetime execution record</span></div>
        <div className="hb-overall-card">
          <div className="hb-overall-main"><span className="hb-overall-orbit" /><div className="hb-eyebrow">Total executions</div><div className="hb-overall-number">{summary?.total_runs ?? "—"}</div><div className="hb-overall-caption">All recorded runs in the selected scope</div></div>
          <div className="hb-overall-stat success"><span>Success</span><strong>{summary?.successful_runs ?? "—"}</strong></div>
          <div className="hb-overall-stat danger"><span>Failures</span><strong>{summary?.failed_runs ?? "—"}</strong></div>
          <div className="hb-overall-stat accent"><span>Running</span><strong>{summary?.running_bots ?? "—"}</strong></div>
        </div>
      </section>

      <section className="hb-value-zone">
        <div className="hb-section-rule"><div className="hb-eyebrow">Automation value</div></div>
        <div className="hb-value-grid">
          <DashboardValueCard icon={TrendingUp} label="Hours saved today" value={todayHours != null ? `${Number(todayHours).toFixed(2)} hrs` : "—"} caption={yesterdayHours != null ? `${(Number(todayHours || 0) - Number(yesterdayHours)).toFixed(2)} hrs vs yesterday` : "Today's realized automation value"} tone="accent" />
          <DashboardValueCard icon={Clock} label="Overall hours saved" value={overallHoursAvailable ? `${Number(overallHours || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} hrs` : "—"} caption="Lifetime automation value" tone="success" />
          <DashboardValueCard icon={Bot} label="Active robots" value={summary?.total_bots ?? "—"} caption="Robots available in this scope" tone="accent" />
          <DashboardValueCard icon={Users} label={isAdmin ? "Active clients" : "Workspace"} value={isAdmin ? (summary?.total_clients ?? "—") : clientName} caption={isAdmin ? "Clients in the selected scope" : "Current client workspace"} tone="accent" />
        </div>
      </section>



      <section className="hb-runs-zone">
        <div className="hb-section-rule"><div className="hb-eyebrow">Recent runs</div><span className="hb-section-hint">Latest automation executions</span></div>
        <div className="hb-runs-panel">
          <div className="hb-runs-head">
            <div><div className="hb-panel-title">Execution history</div><div className="hb-section-subtitle">Filter the stream without leaving the dashboard.</div></div>
            <StatusFilterTabs value={recentStatusFilter} onChange={setRecentStatusFilter} />
          </div>
          <div className="hb-runs-table-head"><span>Bot</span><span>Client</span><span>Status</span><span>Started</span></div>
          <div className="hb-scroll hb-runs-list">
            {filteredRecent.length === 0 && <div className="hb-empty-runs">{recent.length === 0 ? "No runs yet." : "No runs match this filter."}</div>}
            {filteredRecent.map((r, i) => (
              <div key={r.run_id} className={`hb-run-row ${i === 0 && liveEvents.length ? "fresh" : ""}`}>
                <div className="hb-run-bot"><StatusDot status={r.status} /><div><strong>{r.bot_name}</strong><small>{r.execution_id || `Run #${r.run_id}`}</small></div></div>
                <div className="hb-run-client">{r.client_name || "—"}</div>
                <div><Badge tone={r.status === "Success" ? "success" : r.status === "Failed" ? "danger" : r.status === "Started" ? "warning" : "muted"}>{r.status === "Started" ? "Running" : r.status}</Badge></div>
                <div className="hb-run-time">{timeAgo(r.start_time)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="hb-dashboard-footer">
        <div></div>
        <div><a href="mailto:rpa.support@thestayahead.com">rpa.support@thestayahead.com</a><span>© {new Date().getFullYear()} StayAhead LLC. All rights reserved.</span></div>
      </footer>
    </div>
  );
}

function HoursSavedSection({ todayHours, yesterdayHours, overallHours, overallAvailable }) {
  const hasToday = typeof todayHours === "number" && !isNaN(todayHours);
  const animatedToday = useCountUpFloat(hasToday ? todayHours : NaN, 2, 800);
  const diff = (hasToday && typeof yesterdayHours === "number") ? (todayHours - yesterdayHours) : null;

  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 18, alignItems: "stretch" }}>
      <div
        style={{
          flex: "2 1 280px", minWidth: 240, background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 18, padding: "22px 24px", position: "relative", overflow: "hidden",
          animation: "hb-rise .5s ease both",
          transition: "transform .2s ease, border-color .2s ease, box-shadow .2s ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.boxShadow = "0 12px 28px rgba(0,0,0,0.25)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
      >
        <div style={{ position: "absolute", top: -36, right: -36, width: 120, height: 120, borderRadius: "50%", background: "var(--accent)", opacity: 0.07 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, position: "relative" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--accent-dim)", color: "var(--accent)", flexShrink: 0 }}>
            <TrendingUp size={18} />
          </div>
          <div className="hb-eyebrow">Hours saved today</div>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 36, fontWeight: 700, color: "var(--accent)", lineHeight: 1, position: "relative" }}>
          {hasToday ? `${animatedToday} hrs` : "—"}
        </div>
        {diff != null && (
          <div style={{ fontSize: 11.5, color: diff >= 0 ? "var(--success)" : "var(--danger)", marginTop: 8, position: "relative" }}>
            {diff >= 0 ? "+" : ""}{diff.toFixed(2)} hrs vs yesterday
          </div>
        )}
      </div>

      <div style={{
        flex: "1 1 200px", minWidth: 180, background: "var(--surface-2)", border: "1px solid var(--border)",
        borderRadius: 12, padding: "16px 18px", display: "flex", flexDirection: "column", justifyContent: "center",
        animation: "hb-rise .45s ease .06s both", transition: "border-color .18s ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-hover)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
      >
        <div className="hb-eyebrow" style={{ marginBottom: 8 }}>Overall hours saved</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 600, color: "var(--text)" }}>
          {overallAvailable ? `${Number(overallHours ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} hrs` : "—"}
        </div>
        {!overallAvailable && (
          <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 6 }}>
            Backend doesn't expose a lifetime hours-saved total yet.
          </div>
        )}
      </div>
    </div>
  );
}

function BotRunHistoryModal({ api, bot, onClose }) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const fmtDuration = (seconds) => {
    if (seconds == null) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const fmtDateTime = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <Modal title={`${bot.bot_name} — run history`} onClose={onClose} width={620}>
      <ErrorBanner message={error} onDismiss={() => setError("")} />
      <div className="hb-scroll" style={{ maxHeight: 440, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th style={{ textAlign: "left", padding: "8px 10px", color: "var(--text-muted)", fontWeight: 500, fontSize: 11.5 }}>Started</th>
              <th style={{ textAlign: "left", padding: "8px 10px", color: "var(--text-muted)", fontWeight: 500, fontSize: 11.5 }}>Status</th>
              <th style={{ textAlign: "right", padding: "8px 10px", color: "var(--text-muted)", fontWeight: 500, fontSize: 11.5 }}>Duration</th>
              <th style={{ textAlign: "right", padding: "8px 10px", color: "var(--text-muted)", fontWeight: 500, fontSize: 11.5 }}>Transactions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4} style={{ padding: 20, textAlign: "center", color: "var(--text-dim)" }}>Loading…</td></tr>
            )}
            {!loading && runs.length === 0 && (
              <tr><td colSpan={4} style={{ padding: 20, textAlign: "center", color: "var(--text-dim)" }}>No runs yet.</td></tr>
            )}
            {runs.map((r) => {
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

function ReportsView({ api }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedBot, setSelectedBot] = useState(null);
  const [department, setDepartment] = useState(null);
  const [period, setPeriod] = useState("all");

  const departmentOptions = useDepartmentOptions(api);
  const filterGroups = useMemo(() => [
    { key: "department", icon: Building2, label: "Department", value: department, onChange: setDepartment, options: departmentOptions },
    { key: "period", icon: CalendarClock, label: "Period", value: period, onChange: (v) => setPeriod(v || "all"), options: PERIOD_OPTIONS, isActive: (v) => v && v !== "all" },
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

  return (
    <div>
      <ErrorBanner message={error} onDismiss={() => setError("")} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ color: "var(--text-muted)", fontSize: 13, paddingTop: 8 }}>
          {rows.length} bot{rows.length === 1 ? "" : "s"} — click a row to see run history
        </div>
        <div>
          <FilterPopover groups={filterGroups} />
          <ActiveFilterChips groups={filterGroups} />
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
              {!loading && rows.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "var(--text-dim)" }}>No bots yet.</td></tr>
              )}
              {rows.map((r) => {
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
        <BotRunHistoryModal api={api} bot={selectedBot} onClose={() => setSelectedBot(null)} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Failures — dedicated view for triaging failed runs: breakdown by    */
/* failure stage, then the full list with error messages, filterable   */
/* by department / client / period. Reuses the same query params the   */
/* rest of the dashboard already established.                          */
/* ------------------------------------------------------------------ */
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

function FailuresView({ api, isAdmin }) {
  const [rows, setRows] = useState([]);
  const [stageSummary, setStageSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [department, setDepartment] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [period, setPeriod] = useState("week");
  const [expandedRow, setExpandedRow] = useState(null);

  const departmentOptions = useDepartmentOptions(api);
  const clientOptions = useClientOptions(api);
  const filterGroups = useMemo(() => {
    const groups = [];
    if (isAdmin) groups.push({ key: "client", icon: Users, label: "Client", value: clientId, onChange: setClientId, options: clientOptions });
    groups.push({ key: "department", icon: Building2, label: "Department", value: department, onChange: setDepartment, options: departmentOptions });
    groups.push({ key: "period", icon: CalendarClock, label: "Period", value: period, onChange: (v) => setPeriod(v || "week"), options: PERIOD_OPTIONS, isActive: (v) => v && v !== "week" });
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

  return (
    <div>
      <ErrorBanner message={error} onDismiss={() => setError("")} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ color: "var(--text-muted)", fontSize: 13.5, paddingTop: 8 }}>
          {rows.length} failed run{rows.length === 1 ? "" : "s"} — click a row for the full error message
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

      {/* Full failed-run list */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <div className="hb-scroll" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={{ textAlign: "left", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>Bot</th>
                {isAdmin && <th style={{ textAlign: "left", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>Client</th>}
                <th style={{ textAlign: "left", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>Stage</th>
                <th style={{ textAlign: "left", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>Error</th>
                <th style={{ textAlign: "right", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>When</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={isAdmin ? 5 : 4} style={{ padding: 24, textAlign: "center", color: "var(--text-dim)" }}>Loading…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={isAdmin ? 5 : 4} style={{ padding: 24, textAlign: "center", color: "var(--text-dim)" }}>No failed runs in this window.</td></tr>
              )}
              {rows.map((r) => {
                const isExpanded = expandedRow === r.run_id;
                return (
                  <React.Fragment key={r.run_id}>
                    <tr
                      className="hb-row-hover"
                      onClick={() => setExpandedRow(isExpanded ? null : r.run_id)}
                      style={{ borderBottom: isExpanded ? "none" : "1px solid var(--border)", cursor: "pointer" }}
                    >
                      <td style={{ padding: "11px 16px", fontWeight: 500 }}>{r.bot_name}</td>
                      {isAdmin && <td style={{ padding: "11px 16px", color: "var(--text-muted)" }}>{r.client_name}</td>}
                      <td style={{ padding: "11px 16px" }}>
                        <Badge tone="danger">{r.failure_stage || "Unknown"}</Badge>
                      </td>
                      <td style={{
                        padding: "11px 16px", color: "var(--text-muted)", maxWidth: 320,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: isExpanded ? "normal" : "nowrap",
                      }}>
                        {r.error_message || "—"}
                      </td>
                      <td style={{ padding: "11px 16px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-dim)" }}>
                        {timeAgo(r.start_time)}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        <td colSpan={isAdmin ? 5 : 4} style={{ padding: "0 16px 14px" }}>
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
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Analytics — weekly/monthly leaderboards: top clients, top bots.     */
/* Ranked primarily by run count; success rate shown alongside.        */
/* ------------------------------------------------------------------ */
function RankingTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: "var(--surface-3)", border: "1px solid var(--border)",
      borderRadius: 8, padding: "9px 12px", fontSize: 12.5,
    }}>
      <div style={{ color: "var(--text)", fontWeight: 600, marginBottom: 3 }}>{d.name}</div>
      <div style={{ color: "var(--text-muted)" }}>{d.runs} runs</div>
      <div style={{
        color: d.rate >= 90 ? "var(--success)" : d.rate >= 60 ? "var(--warning)" : "var(--danger)", fontWeight: 600,
      }}>
        {d.rate}% success
      </div>
    </div>
  );
}

/* Real animated horizontal bar chart — bar length is run volume,
   bar colour is success rate, so rank and health read at a glance. */
function RankingChart({ title, icon: Icon, rows, nameKey, subKey, loading }) {
  const data = rows.slice(0, 8).map((r) => ({
    name: r[nameKey], sub: subKey ? r[subKey] : undefined, runs: r.total_runs || 0, rate: r.success_rate ?? 0,
  }));
  const chartHeight = Math.max(220, data.length * 46);
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
        <Icon size={15} color="var(--accent)" />
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14.5 }}>{title}</div>
      </div>
      <div style={{ padding: "18px 18px 6px" }}>
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
                  <Cell key={i} fill={d.rate >= 90 ? CHART_COLORS.success : d.rate >= 60 ? CHART_COLORS.warning : CHART_COLORS.danger} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      {!loading && data.length > 0 && (
        <div style={{ display: "flex", gap: 16, padding: "4px 18px 16px", fontSize: 11, color: "var(--text-dim)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: CHART_COLORS.success, display: "inline-block" }} /> ≥90% success</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: CHART_COLORS.warning, display: "inline-block" }} /> 60–89%</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: CHART_COLORS.danger, display: "inline-block" }} /> &lt;60%</span>
        </div>
      )}
    </div>
  );
}

function AnalyticsView({ api, isAdmin }) {
  const [topClients, setTopClients] = useState([]);
  const [topBots, setTopBots] = useState([]);
  const [department, setDepartment] = useState(null);
  const [period, setPeriod] = useState("week");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const departmentOptions = useDepartmentOptions(api);
  const filterGroups = useMemo(() => [
    { key: "department", icon: Building2, label: "Department", value: department, onChange: setDepartment, options: departmentOptions },
    { key: "period", icon: CalendarClock, label: "Period", value: period, onChange: (v) => setPeriod(v || "week"), options: PERIOD_OPTIONS, isActive: (v) => v && v !== "week" },
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
        const suffix = qs ? `?${qs}` : "";
        const calls = [api(`/dashboard/top-bots${suffix}`)];
        if (isAdmin) calls.unshift(api(`/dashboard/top-clients${suffix}`));
        const results = await Promise.all(calls);
        if (isAdmin) {
          setTopClients(results[0] || []);
          setTopBots(results[1] || []);
        } else {
          setTopClients([]);
          setTopBots(results[0] || []);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [api, department, period, isAdmin]);

  return (
    <div>
      <ErrorBanner message={error} onDismiss={() => setError("")} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ color: "var(--text-muted)", fontSize: 13.5, paddingTop: 8 }}>
          Ranked by run count, success rate shown alongside
        </div>
        <div>
          <FilterPopover groups={filterGroups} />
          <ActiveFilterChips groups={filterGroups} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isAdmin ? "1fr 1fr" : "1fr", gap: 16 }}>
        {isAdmin && (
          <RankingChart title="Top clients" icon={TrendingUp} rows={topClients} nameKey="client_name" loading={loading} />
        )}
        <RankingChart title="Top bots" icon={Bot} rows={topBots} nameKey="bot_name" subKey={isAdmin ? "client_name" : undefined} loading={loading} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Users — admin-only account management: view every login, unlock a   */
/* locked-out account, or force a password reset. Uses /auth/users,    */
/* /auth/users/{id}/unlock, /auth/users/{id}/reset-password.           */
/* ------------------------------------------------------------------ */
function ResetPasswordModal({ api, user, onClose, onDone }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api(`/auth/users/${user.user_id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ new_password: password }),
      });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`Reset password — ${user.email}`} onClose={onClose} width={400}>
      <form onSubmit={submit}>
        <ErrorBanner message={error} onDismiss={() => setError("")} />
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
          This immediately signs the user out everywhere — they'll need the new password on their next login.
        </div>
        <Field label="New password">
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
          <Button type="submit" disabled={loading}>{loading ? "Resetting…" : "Reset password"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function UsersView({ api }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resetTarget, setResetTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api("/auth/users");
      setUsers(res?.data || []);
    } catch (err) {
      setError(err.message);
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
      setError(err.message);
    }
  };

  const isLocked = (u) => u.locked_until && new Date(u.locked_until).getTime() > Date.now();

  return (
    <div>
      <ErrorBanner message={error} onDismiss={() => setError("")} />
      <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
        {users.length} login{users.length === 1 ? "" : "s"} — unlock accounts or force a password reset
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <div className="hb-scroll" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={{ textAlign: "left", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>Email</th>
                <th style={{ textAlign: "left", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>Role</th>
                <th style={{ textAlign: "left", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>Status</th>
                <th style={{ textAlign: "left", padding: "11px 16px", color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>Login status</th>
                <th style={{ padding: "11px 16px" }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "var(--text-dim)" }}>Loading…</td></tr>
              )}
              {!loading && users.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "var(--text-dim)" }}>No logins yet.</td></tr>
              )}
              {users.map((u) => {
                const locked = isLocked(u);
                return (
                  <tr key={u.user_id} className="hb-row-hover" style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "11px 16px", fontWeight: 500 }}>{u.email}</td>
                    <td style={{ padding: "11px 16px" }}><Badge tone="accent">{u.role}</Badge></td>
                    <td style={{ padding: "11px 16px" }}>
                      <Badge tone={u.status === "Active" ? "success" : "muted"}>{u.status}</Badge>
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      {locked ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <ShieldAlert size={13} color="var(--danger)" />
                          <span style={{ color: "var(--danger)", fontSize: 12.5 }}>
                            Locked until {new Date(u.locked_until).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      ) : u.failed_login_attempts > 0 ? (
                        <span style={{ color: "var(--warning)", fontSize: 12.5 }}>
                          {u.failed_login_attempts} failed attempt{u.failed_login_attempts === 1 ? "" : "s"}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-dim)", fontSize: 12.5 }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "11px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                      {locked && (
                        <button onClick={() => unlock(u)} title="Unlock account" style={{ background: "none", border: "none", color: "var(--accent)", padding: 4 }}>
                          <Unlock size={14} />
                        </button>
                      )}
                      <button onClick={() => setResetTarget(u)} title="Reset password" style={{ background: "none", border: "none", color: "var(--text-muted)", padding: 4 }}>
                        <RotateCcw size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {resetTarget && (
        <ResetPasswordModal
          api={api} user={resetTarget}
          onClose={() => setResetTarget(null)}
          onDone={() => { setResetTarget(null); load(); }}
        />
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
function CrudView({ api, canWrite, config }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null); // { mode: 'create'|'edit', data }
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [hardDelete, setHardDelete] = useState(false);
  const [loginModalFor, setLoginModalFor] = useState(null);
  const [refs, setRefs] = useState({}); // supporting lookups (e.g. clients for bots)
  const [clientFilterId, setClientFilterId] = useState(null);
  const [department, setDepartment] = useState(null);
  const [machine, setMachine] = useState(null);

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

  return (
    <div>
      <ErrorBanner message={error} onDismiss={() => setError("")} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ color: "var(--text-muted)", fontSize: 13, paddingTop: 8 }}>{rows.length} {config.label.toLowerCase()}</div>
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
              {!loading && rows.length === 0 && (
                <tr><td colSpan={config.columns.length + 1} style={{ padding: 24, textAlign: "center", color: "var(--text-dim)" }}>Nothing here yet.</td></tr>
              )}
              {rows.map((row) => (
                <tr key={row[config.idField]} className="hb-row-hover" style={{ borderBottom: "1px solid var(--border)" }}>
                  {config.columns.map((c) => (
                    <td key={c.key} style={{ padding: "11px 16px", verticalAlign: "middle" }}>
                      {c.render ? c.render(row, refs) : row[c.key] ?? "—"}
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
const clientConfig = {
  label: "Clients", singular: "Client", idField: "client_id", listPath: "/clients/",
  supportsSoftDelete: true,
  showCreateLogin: true,
  columns: [
    { key: "client_name", label: "Name" },
    { key: "contact_person", label: "Contact" },
    { key: "email", label: "Email" },
    { key: "email_domains", label: "Email domains", render: (r) => r.email_domains || "—" },
    { key: "status", label: "Status", render: (r) => <Badge tone={r.status === "Active" ? "success" : "muted"}>{r.status}</Badge> },
  ],
  formFields: [
    { key: "client_name", label: "Client name", required: true },
    { key: "contact_person", label: "Contact person" },
    { key: "email", label: "Email", type: "email", required: true },
    { key: "email_domains", label: "Email domains (comma-separated, e.g. domain.com,other.com)" },
    { key: "status", label: "Status", type: "select", options: [{ value: "Active", label: "Active" }, { value: "Inactive", label: "Inactive" }] },
  ],
  emptyForm: () => ({ client_name: "", contact_person: "", email: "", email_domains: "", status: "Active" }),
  toUpdatePayload: (f) => ({ client_name: f.client_name, contact_person: f.contact_person, email: f.email, email_domains: f.email_domains, status: f.status }),
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
  refs: [{ key: "clients", path: "/clients/" }, { key: "departments", path: "/departments/" }],
  columns: [
    { key: "bot_name", label: "Name" },
    { key: "bot_code", label: "Code", render: (r) => <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}>{r.bot_code}</span> },
    { key: "client_id", label: "Client", render: (r, refs) => refs.clients?.find((c) => c.client_id === r.client_id)?.client_name || `#${r.client_id}` },
    { key: "department", label: "Department", render: (r) => r.department ? <Badge tone="accent">{r.department}</Badge> : <span style={{ color: "var(--text-dim)" }}>—</span> },
    { key: "machine_name", label: "Machine", render: (r) => r.machine_name ? <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--text-muted)" }}>{r.machine_name}</span> : <span style={{ color: "var(--text-dim)" }}>—</span> },
    { key: "rate", label: "Rate", render: (r) => <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--text-muted)" }}>{r.transaction_batch_size} acc = {r.transaction_batch_hours}h</span> },
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

function AppShell({ session, onLogout, onSessionExpired, onTokensRefreshed }) {
  const { baseUrl, token, role, email } = session;
  const api = useApi(baseUrl, session, onTokensRefreshed, onSessionExpired);
  const [view, setView] = useState("dashboard");
  const [wsConnected, setWsConnected] = useState(false);
  const [liveEvents, setLiveEvents] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdmin = role === "admin";
  const NAV = isAdmin ? NAV_ADMIN : NAV_CLIENT;

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
      ws.onerror = () => { try { ws.close(); } catch (_) {} };
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.event) setLiveEvents((prev) => [{ ...data, _receivedAt: Date.now() }, ...prev].slice(0, 50));
        } catch (_) { /* ignore heartbeat/ping frames */ }
      };
    };

    connect();
    return () => {
      closed = true;
      clearTimeout(retryTimer);
      try { ws?.close(); } catch (_) {}
    };
  }, [baseUrl, token]);

  const selectView = (next) => {
    setView(next);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="hb-root hb-app-shell">
      <style>{TOKENS}</style>

      <aside className="hb-sidebar">
        <div className="hb-brand">
          <div className="hb-brand-mark">
  <img
    src="./public/HEARTBEAT.png"
    alt="HeartBeat"
    className="hb-brand-logo"
  />
</div>
          <div className="hb-brand-copy" style={{ minWidth: 0 }}>
            <div style={{ font: "800 16px/1.1 var(--font-display)", letterSpacing: "-.1px" }}>HeartBeat</div>
            <div style={{ marginTop: 3, color: "var(--text-dim)", fontSize: 10.5, letterSpacing: ".35px" }}>Bot Monitor Dashboard</div>
          </div>
        </div>

        <nav className="hb-sidebar-nav hb-scroll">
          <div className="hb-nav-section hb-eyebrow">Workspace</div>
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = view === n.key;
            return (
              <button key={n.key} className={`hb-nav-item${active ? " active" : ""}`} onClick={() => selectView(n.key)} title={n.label}>
                <span className="hb-nav-icon"><Icon size={15} /></span>
                <span className="hb-nav-label" style={{ flex: 1 }}>{n.label}</span>
                {active && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 0 4px var(--accent-dim)" }} />}
              </button>
            );
          })}
        </nav>

        <div className="hb-sidebar-footer">
          <div className="hb-profile">
            <div className="hb-avatar">{initialsOf(email)}</div>
            <div className="hb-profile-copy" style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</div>
              <div style={{ marginTop: 4 }}><Badge tone="accent">{role}</Badge></div>
            </div>
            <button className="hb-profile-action" onClick={onLogout} title="Sign out" aria-label="Sign out" style={{ border: 0, background: "transparent", color: "var(--text-dim)", padding: 5, display: "grid", placeItems: "center", borderRadius: 7 }}>
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <div className="hb-shell-main">
        
        <header className="hb-topbar">
          <div className="hb-topbar-left">
            <button className="hb-mobile-toggle" onClick={() => setMobileMenuOpen((v) => !v)} aria-label="Open navigation">
              {mobileMenuOpen ? <X size={17} /> : <LayoutDashboard size={17} />}
            </button>
            <div>
              <div className="hb-page-title">{view.replace("-", " ")}</div>
              <div className="hb-page-meta">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div>
            </div>
          </div>

          <div className="hb-status-chip" title={wsConnected ? "Realtime connection is active" : "Realtime connection is reconnecting"}>
            <span className="hb-status-chip-label">Realtime</span>
            {wsConnected
              ? <Badge tone="success"><Wifi size={11} /> connected</Badge>
              : <Badge tone="muted"><WifiOff size={11} /> reconnecting</Badge>}
          </div>
        </header>

        {mobileMenuOpen && (
          <div style={{ position: "fixed", inset: "62px 0 auto 0", zIndex: 40, padding: 10, background: "rgba(7,17,31,.96)", borderBottom: "1px solid var(--border)", backdropFilter: "blur(18px)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6 }}>
              {NAV.map((n) => {
                const Icon = n.icon;
                const active = view === n.key;
                return <button key={n.key} onClick={() => selectView(n.key)} style={{ minHeight: 44, borderRadius: 10, border: `1px solid ${active ? "rgba(62,217,190,.25)" : "var(--border)"}`, background: active ? "var(--accent-dim)" : "var(--surface)", color: active ? "var(--accent)" : "var(--text-muted)", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", fontWeight: 600, fontSize: 12.5 }}><Icon size={15} />{n.label}</button>;
              })}
            </div>
          </div>
        )}

<main
  className={`hb-main-content ${
    view === "dashboard" ? "hb-dashboard-live" : ""
  }`}
>
  


  <div className="hb-content-frame">
    {view === "dashboard" && (
      <DashboardView
        api={api}
        wsConnected={wsConnected}
        liveEvents={liveEvents}
        role={role}
        session={session}
      />
    )}
     
    {view === "reports" && <ReportsView api={api} />}
    {view === "failures" && (
      <FailuresView api={api} isAdmin={isAdmin} />
    )}
    {view === "analytics" && (
      <AnalyticsView api={api} isAdmin={isAdmin} />
    )}
    {view === "clients" && isAdmin && (
      <CrudView
        api={api}
        canWrite={isAdmin}
        config={clientConfig}
      />
    )}
    {view === "bots" && (
      <CrudView
        api={api}
        canWrite={isAdmin}
        config={botConfig}
      />
    )}
    {view === "departments" && isAdmin && (
      <CrudView
        api={api}
        canWrite={isAdmin}
        config={departmentConfig}
      />
    )}
    {view === "users" && isAdmin && (
      <UsersView api={api} />
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
          return <button key={n.key} className={active ? "active" : ""} onClick={() => selectView(n.key)}><Icon size={17} /><span>{n.label}</span></button>;
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

  if (!session) return <LoginScreen onLogin={handleLogin} sessionMessage={sessionMessage} />;
  return (
    <AppShell
      session={session}
      onLogout={() => handleLogout("")}
      onSessionExpired={() => handleLogout("Your session expired — please sign in again.")}
      onTokensRefreshed={handleTokensRefreshed}
    />
  );
}