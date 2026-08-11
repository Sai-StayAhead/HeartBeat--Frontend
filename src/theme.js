/**
 * HeartBeat design tokens.
 * Brand: StayAhead orange accent on a dark navy/charcoal enterprise-monitoring
 * surface. Green is reserved for "success", red for "failed" — nothing else
 * borrows those two colors anywhere in the app.
 */
export const TOKENS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');

html, body { margin: 0; padding: 0; background: #0B1220; }

.hb-root {
  --bg: #0B1220;
  --surface: #101A2C;
  --surface-2: #16233A;
  --surface-3: #1D2C46;
  --border: #223052;
  --border-hover: #33456B;
  --text: #EEF2F8;
  --text-muted: #8A9AB5;
  --text-dim: #5A6C8C;

  /* StayAhead orange — the one accent used for brand, live/heartbeat state,
     and neutral "informational" emphasis. */
  --accent: #FF7A33;
  --accent-strong: #FF5E1A;
  --accent-dim: rgba(255,122,51,0.14);

  /* Reserved exclusively for outcome states. */
  --success: #22C55E;
  --success-dim: rgba(34,197,94,0.14);
  --danger: #EF4444;
  --danger-dim: rgba(239,68,68,0.14);

  --font-display: 'Space Grotesk', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  background:
    radial-gradient(ellipse 900px 480px at 10% -10%, rgba(255,122,51,0.05), transparent 60%),
    var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  min-height: 100vh;
  width: 100%;
}
.hb-root * { box-sizing: border-box; }
.hb-root ::selection { background: var(--accent-dim); }
.hb-root button { font-family: inherit; cursor: pointer; }
.hb-root input, .hb-root select { font-family: inherit; }
.hb-root :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }

.hb-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
.hb-scroll::-webkit-scrollbar-track { background: transparent; }
.hb-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

.hb-eyebrow { font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--text-dim); font-weight: 600; }
.hb-row-hover { transition: background .12s ease; }
.hb-row-hover:hover { background: var(--surface-2); }
.hb-card { transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease; }
.hb-card:hover { transform: translateY(-2px); border-color: var(--border-hover); box-shadow: 0 12px 26px rgba(0,0,0,.28); }

@keyframes hb-pulse-dot { 0%,100% { opacity: 1; } 50% { opacity: .45; } }
@keyframes hb-flow { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes hb-flash { 0% { background: var(--accent-dim); } 100% { background: transparent; } }
@keyframes hb-spin { to { transform: rotate(360deg); } }
@keyframes hb-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes hb-glow { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
@keyframes hb-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes hb-skeleton { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }

@media (prefers-reduced-motion: reduce) {
  .hb-root * { animation: none !important; transition: none !important; }
}
`;

export const CHART_COLORS = {
  accent: "#FF7A33",
  accentSoft: "#FFB37A",
  success: "#22C55E",
  danger: "#EF4444",
  muted: "#8A9AB5",
  border: "#223052",
};