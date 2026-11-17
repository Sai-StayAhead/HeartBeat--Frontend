import React, { useState, useEffect, useMemo } from "react";
import {
  Globe, Clock, Copy, Check, ExternalLink,
  CalendarClock, ArrowRightLeft, Briefcase, Sun, Moon,
  Building2, Sparkles, Video, CalendarPlus
} from "lucide-react";

// ─── Timezone Data ────────────────────────────────────────────
export const TIMEZONES = [
  { key: "IST", label: "India Standard Time (IST)", iana: "Asia/Kolkata", code: "IN", city: "New Delhi / Mumbai / Bengaluru", offsetNote: "UTC+5:30", region: "India Operations" },
  { key: "EST", label: "US Eastern (EST/EDT)", iana: "America/New_York", code: "US-E", city: "New York / Atlanta / DC / Miami", offsetNote: "UTC-5 / UTC-4", region: "US East Coast" },
  { key: "CST", label: "US Central (CST/CDT)", iana: "America/Chicago", code: "US-C", city: "Chicago / Dallas / Houston", offsetNote: "UTC-6 / UTC-5", region: "US Central" },
  { key: "MST", label: "US Mountain (MST/MDT)", iana: "America/Denver", code: "US-M", city: "Denver / Phoenix / Salt Lake", offsetNote: "UTC-7 / UTC-6", region: "US Mountain" },
  { key: "PST", label: "US Pacific (PST/PDT)", iana: "America/Los_Angeles", code: "US-W", city: "Los Angeles / San Francisco / Seattle", offsetNote: "UTC-8 / UTC-7", region: "US West Coast" },
  { key: "UTC", label: "Universal Standard (UTC/GMT)", iana: "UTC", code: "UTC", city: "London / Global Standard", offsetNote: "UTC+0", region: "Global Reference" },
];

// ─── Exported Helpers ─────────────────────────────────────────
export function formatTimeInZone(date, iana, options = {}) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: iana, hour: "numeric", minute: "2-digit", hour12: true, ...options,
    }).format(date);
  } catch (_) { return "\u2014"; }
}

export function formatDateInZone(date, iana, options = {}) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: iana, weekday: "short", month: "short", day: "numeric", ...options,
    }).format(date);
  } catch (_) { return "\u2014"; }
}

export function getHourWorkStatus(hour) {
  if (hour >= 9 && hour < 18)
    return { tone: "success", label: "Office Hours", color: "var(--success)", iconName: "briefcase" };
  if ((hour >= 7 && hour < 9) || (hour >= 18 && hour < 21))
    return { tone: "warning", label: "Golden Overlap", color: "var(--warning)", iconName: "sparkles" };
  return { tone: "muted", label: "Off-Hours", color: "var(--text-dim)", iconName: "moon" };
}

export function getHourInZone(date, iana) {
  try {
    const str = new Intl.DateTimeFormat("en-US", { timeZone: iana, hour: "numeric", hour12: false }).format(date);
    return parseInt(str, 10) % 24;
  } catch (_) { return date.getHours(); }
}

// ─── Internal Helpers ─────────────────────────────────────────
function getTimezoneDelta(date, sourceIana, targetIana = "Asia/Kolkata") {
  try {
    const dSource = new Date(date.toLocaleString("en-US", { timeZone: sourceIana }));
    const dTarget = new Date(date.toLocaleString("en-US", { timeZone: targetIana }));
    const diffMs = dTarget.getTime() - dSource.getTime();
    const diffMinutes = Math.round(diffMs / 60000);
    const absMinutes = Math.abs(diffMinutes);
    const hours = Math.floor(absMinutes / 60);
    const mins = absMinutes % 60;
    const sign = diffMinutes >= 0 ? "+" : "-";
    const deltaStr = diffMinutes === 0 ? "Same Time" : `${sign}${hours}h ${mins > 0 ? `${mins}m` : ""}`.trim();
    const direction = diffMinutes >= 0 ? "ahead" : "behind";
    return { diffMinutes, hours, mins, sign, deltaStr, direction };
  } catch (_) {
    return { diffMinutes: 630, hours: 10, mins: 30, sign: "+", deltaStr: "+10h 30m", direction: "ahead" };
  }
}

// ─── Micro Components ─────────────────────────────────────────
function CodeBadge({ code, accent }) {
  return (
    <span style={{
      fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
      padding: "2px 6px", borderRadius: 4,
      background: accent ? "var(--accent-dim)" : "var(--surface-3)",
      border: `1px solid ${accent ? "var(--accent)" : "var(--border)"}`,
      color: accent ? "var(--accent)" : "var(--text-dim)",
      letterSpacing: "0.04em",
    }}>
      {code}
    </span>
  );
}

function StatusDot({ status }) {
  const Icon = status.iconName === "briefcase" ? Briefcase : status.iconName === "sparkles" ? Sparkles : Moon;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 11, fontWeight: 600, color: status.color, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: status.color, flexShrink: 0 }} />
      <Icon size={11} />
      <span>{status.label}</span>
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function TimezonePlanner({ api, isModal = false, onClose }) {
  const [now, setNow] = useState(new Date());
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [sourceZoneKey, setSourceZoneKey] = useState("EST");
  const [selectedHour, setSelectedHour] = useState(10);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedDateStr, setSelectedDateStr] = useState(() => new Date().toISOString().slice(0, 10));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!api) return;
    (async () => {
      try {
        const res = await api("/clients/");
        const list = (res?.data || []).map((c) => ({
          client_id: c.client_id,
          client_name: (c.client_name || "").trim(),
          timezone: c.timezone || "America/New_York",
        }));
        list.sort((a, b) => a.client_name.localeCompare(b.client_name, undefined, { sensitivity: "base" }));
        setClients(list);
      } catch (_) { /* non-critical */ }
    })();
  }, [api]);

  const handleClientSelect = (clientId) => {
    setSelectedClientId(clientId);
    if (!clientId) return;
    const client = clients.find((c) => String(c.client_id) === String(clientId));
    if (client) {
      const match = TIMEZONES.find((tz) => tz.iana.toLowerCase() === client.timezone.toLowerCase());
      if (match) { setSourceZoneKey(match.key); }
      else if (client.timezone.includes("Chicago")) setSourceZoneKey("CST");
      else if (client.timezone.includes("Denver") || client.timezone.includes("Phoenix")) setSourceZoneKey("MST");
      else if (client.timezone.includes("Los_Angeles")) setSourceZoneKey("PST");
      else if (client.timezone.includes("Kolkata")) setSourceZoneKey("IST");
      else setSourceZoneKey("EST");
    }
  };

  const sourceZone = useMemo(() => TIMEZONES.find((tz) => tz.key === sourceZoneKey) || TIMEZONES[1], [sourceZoneKey]);

  const targetDateObj = useMemo(() => {
    try {
      const [year, month, day] = selectedDateStr.split("-").map(Number);
      const baseUtc = new Date(Date.UTC(year, month - 1, day, selectedHour, selectedMinute, 0));
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: sourceZone.iana, year: "numeric", month: "numeric", day: "numeric",
        hour: "numeric", minute: "numeric", hour12: false,
      });
      const parts = formatter.formatToParts(baseUtc);
      const getVal = (type) => parseInt(parts.find((p) => p.type === type)?.value || "0", 10);
      const tzHour = getVal("hour") % 24;
      const tzMinute = getVal("minute");
      const tzDay = getVal("day");
      let diffMinutes = (selectedHour - tzHour) * 60 + (selectedMinute - tzMinute);
      if (tzDay !== day) diffMinutes += (day - tzDay) * 24 * 60;
      return new Date(baseUtc.getTime() + diffMinutes * 60000);
    } catch (_) { return new Date(); }
  }, [selectedDateStr, selectedHour, selectedMinute, sourceZone.iana]);

  const conversions = useMemo(() => {
    return TIMEZONES.map((tz) => {
      const timeStr = formatTimeInZone(targetDateObj, tz.iana);
      const dateStr = formatDateInZone(targetDateObj, tz.iana);
      const fullDateStr = formatDateInZone(targetDateObj, tz.iana, { year: "numeric", month: "short", day: "numeric" });
      const hourInZone = getHourInZone(targetDateObj, tz.iana);
      const status = getHourWorkStatus(hourInZone);
      return { ...tz, timeStr, dateStr, fullDateStr, hourInZone, status, isSource: tz.key === sourceZone.key };
    });
  }, [targetDateObj, sourceZone.key]);

  const istConversion = conversions.find((c) => c.key === "IST");
  const sourceConversion = conversions.find((c) => c.key === sourceZone.key);

  const istDelta = useMemo(() => getTimezoneDelta(targetDateObj, sourceZone.iana, "Asia/Kolkata"), [targetDateObj, sourceZone.iana]);

  const meetingSummaryText = useMemo(() => {
    const find = (k) => conversions.find((c) => c.key === k);
    return [
      "PROPOSED OPERATIONS MEETING TIME",
      "============================================================",
      `Date: ${sourceZone.key === "IST" ? find("IST")?.fullDateStr : find("EST")?.fullDateStr || selectedDateStr}`,
      "",
      `* US Eastern (EST/EDT):   ${find("EST")?.timeStr} (${find("EST")?.dateStr})`,
      `* US Central (CST/CDT):   ${find("CST")?.timeStr} (${find("CST")?.dateStr})`,
      `* US Mountain (MST/MDT):  ${find("MST")?.timeStr} (${find("MST")?.dateStr})`,
      `* US Pacific (PST/PDT):   ${find("PST")?.timeStr} (${find("PST")?.dateStr})`,
      `* India Standard (IST):   ${find("IST")?.timeStr} (${find("IST")?.dateStr})`,
      `* Universal Standard (UTC): ${find("UTC")?.timeStr} (${find("UTC")?.dateStr})`,
      "============================================================",
      "StayAhead Operations Fleet \u2022 HeartBeat Sync",
    ].join("\n");
  }, [conversions, sourceZone.key, selectedDateStr]);

  const handleCopy = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(meetingSummaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const teamsMeetingUrl = useMemo(() => {
    try {
      const startIso = targetDateObj.toISOString().slice(0, 19);
      const endObj = new Date(targetDateObj.getTime() + 45 * 60000);
      const endIso = endObj.toISOString().slice(0, 19);
      const subject = encodeURIComponent("Sync Meeting");
      // Teams deep link — launches Desktop Teams or Web Teams with exact time pre-selected and NO description
      return `https://teams.microsoft.com/l/meeting/new?startTime=${startIso}&endTime=${endIso}&subject=${subject}`;
    } catch (_) { return "#"; }
  }, [targetDateObj]);

  const handleOpenOutlook = () => {
    try {
      const pad = (n) => String(n).padStart(2, "0");
      const toUtcIcs = (date) =>
        `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}00Z`;

      const startUtc = toUtcIcs(targetDateObj);
      const endObj = new Date(targetDateObj.getTime() + 45 * 60000);
      const endUtc = toUtcIcs(endObj);
      const nowUtc = toUtcIcs(new Date());

      // Standard RFC 5545 iCalendar format — time pre-selected, NO meeting details in description
      const ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//StayAhead//HeartBeat//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:REQUEST",
        "BEGIN:VEVENT",
        `UID:${Date.now()}@heartbeat.stayahead.com`,
        `DTSTAMP:${nowUtc}`,
        `DTSTART:${startUtc}`,
        `DTEND:${endUtc}`,
        "SUMMARY:Sync Meeting",
        "DESCRIPTION:",
        "STATUS:CONFIRMED",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");

      const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "meeting-invite.ics";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("Failed to generate Outlook calendar file:", err);
    }
  };

  const quickPresets = [
    { label: "10 AM EST", zone: "EST", hour: 10, min: 0 },
    { label: "9 AM EST", zone: "EST", hour: 9, min: 0 },
    { label: "1 PM EST", zone: "EST", hour: 13, min: 0 },
    { label: "6:30 PM IST", zone: "IST", hour: 18, min: 30 },
    { label: "10:30 AM IST", zone: "IST", hour: 10, min: 30 },
  ];

  const applyPreset = (preset) => {
    setSourceZoneKey(preset.zone);
    setSelectedHour(preset.hour);
    setSelectedMinute(preset.min);
    setSelectedClientId("");
  };

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="hb-tz" style={{ padding: isModal ? "4px 0" : "2px 0" }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="hb-tz-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: "var(--accent-dim)", color: "var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Globe size={18} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text)", lineHeight: 1.3 }}>
              Timezone Mapping & Meeting Planner
            </h2>
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-dim)", lineHeight: 1.4 }}>
              US enterprise hubs and India operations time alignment
            </p>
          </div>
        </div>

        <div className="hb-tz-header-actions">
          {clients.length > 0 && (
            <select
              value={selectedClientId}
              onChange={(e) => handleClientSelect(e.target.value)}
              style={{
                background: "var(--surface)", color: "var(--text)",
                border: "1px solid var(--border)", borderRadius: 7,
                padding: "6px 10px", fontSize: 12, outline: "none", cursor: "pointer", fontWeight: 600,
              }}
            >
              <option value="">-- Select Client --</option>
              {clients.map((c) => (
                <option key={c.client_id} value={c.client_id}>
                  {c.client_name} ({c.timezone.split("/").pop().replace(/_/g, " ")})
                </option>
              ))}
            </select>
          )}
          {isModal && onClose && (
            <button onClick={onClose} className="hb-tz-btn-secondary" style={{ padding: "6px 12px" }}>
              Close
            </button>
          )}
        </div>
      </div>

      {/* ── Live Clocks Grid ────────────────────────────────── */}
      <div className="hb-tz-clocks">
        {TIMEZONES.map((tz) => {
          const timeStr = formatTimeInZone(now, tz.iana);
          const hour = getHourInZone(now, tz.iana);
          const status = getHourWorkStatus(hour);
          const isIst = tz.key === "IST";
          return (
            <div key={tz.key} className={`hb-tz-clock-item${isIst ? " --accent" : ""}`}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <CodeBadge code={tz.code} accent={isIst} />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: isIst ? "var(--accent)" : "var(--text)" }}>
                  {tz.key}
                </span>
              </div>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 800, letterSpacing: "-0.3px",
                color: isIst ? "var(--accent)" : "var(--text)",
              }}>
                {timeStr}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: status.color }} />
                <span style={{ fontSize: 10, color: "var(--text-dim)" }}>{status.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Converter Card ──────────────────────────────────── */}
      <div className="hb-tz-converter">

        {/* Controls: Presets + Date */}
        <div className="hb-tz-controls">
          <div className="hb-tz-presets">
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Presets:
            </span>
            {quickPresets.map((preset, idx) => {
              const isActive = sourceZoneKey === preset.zone && selectedHour === preset.hour && selectedMinute === preset.min;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`hb-tz-preset-btn${isActive ? " --active" : ""}`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 600 }}>Date:</span>
            <input
              type="date"
              value={selectedDateStr}
              onChange={(e) => setSelectedDateStr(e.target.value)}
              style={{
                background: "var(--surface-2)", color: "var(--text)",
                border: "1px solid var(--border)", borderRadius: 6,
                padding: "5px 8px", fontSize: 12, outline: "none", fontWeight: 600,
              }}
            />
          </div>
        </div>

        {/* Time Bridge: Source → IST */}
        <div className="hb-tz-bridge">
          {/* Left Pane — Source Zone */}
          <div className="hb-tz-pane">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <CodeBadge code={sourceZone.code} />
                <select
                  value={sourceZoneKey}
                  onChange={(e) => { setSourceZoneKey(e.target.value); setSelectedClientId(""); }}
                  style={{
                    background: "transparent", color: "var(--text)", border: "none",
                    fontWeight: 700, fontSize: 13, outline: "none", cursor: "pointer", padding: 0,
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.key} value={tz.key} style={{ background: "var(--surface)", color: "var(--text)" }}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
              <StatusDot status={sourceConversion?.status || { tone: "success", label: "Active", color: "var(--success)", iconName: "briefcase" }} />
            </div>

            <div style={{ display: "flex", alignItems: "baseline", gap: 4, margin: "4px 0" }}>
              <select
                value={selectedHour}
                onChange={(e) => setSelectedHour(Number(e.target.value))}
                style={{
                  fontFamily: "var(--font-mono)", fontSize: 30, fontWeight: 800,
                  color: "var(--text)", background: "transparent", border: "none",
                  outline: "none", cursor: "pointer", padding: 0,
                }}
              >
                {Array.from({ length: 24 }).map((_, h) => {
                  const ampm = h >= 12 ? "PM" : "AM";
                  const displayH = h % 12 === 0 ? 12 : h % 12;
                  return (
                    <option key={h} value={h} style={{ background: "var(--surface)", color: "var(--text)", fontSize: 14 }}>
                      {displayH}:00 {ampm}
                    </option>
                  );
                })}
              </select>
              <select
                value={selectedMinute}
                onChange={(e) => setSelectedMinute(Number(e.target.value))}
                style={{
                  fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700,
                  color: "var(--text-muted)", background: "transparent", border: "none",
                  outline: "none", cursor: "pointer", padding: 0,
                }}
              >
                <option value={0} style={{ background: "var(--surface)" }}>:00</option>
                <option value={15} style={{ background: "var(--surface)" }}>:15</option>
                <option value={30} style={{ background: "var(--surface)" }}>:30</option>
                <option value={45} style={{ background: "var(--surface)" }}>:45</option>
              </select>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-dim)", marginLeft: 4 }}>
                {sourceZone.key}
              </span>
            </div>

            <div style={{ fontSize: 11.5, color: "var(--text-dim)", display: "flex", alignItems: "center", gap: 5 }}>
              <span>{sourceConversion?.dateStr}</span>
              <span style={{ opacity: 0.4 }}>|</span>
              <span>{sourceZone.city}</span>
            </div>
          </div>

          {/* Center Connector */}
          <div className="hb-tz-connector">
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "var(--surface-3)", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)",
            }}>
              <ArrowRightLeft size={14} />
            </div>
            <div style={{
              fontSize: 11, fontWeight: 700, color: "var(--accent)",
              background: "var(--accent-dim)", padding: "3px 10px", borderRadius: 6,
              whiteSpace: "nowrap", fontFamily: "var(--font-mono)",
            }}>
              {istDelta.deltaStr} {istDelta.direction !== "Same Time" ? istDelta.direction : ""}
            </div>
          </div>

          {/* Right Pane — IST Target */}
          <div className="hb-tz-pane --target">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <CodeBadge code="IN" accent />
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>
                  India Standard Time (IST)
                </span>
              </div>
              <StatusDot status={istConversion?.status || { tone: "success", label: "Active", color: "var(--success)", iconName: "briefcase" }} />
            </div>

            <div style={{
              fontFamily: "var(--font-mono)", fontSize: 30, fontWeight: 800,
              color: "var(--accent)", margin: "4px 0", letterSpacing: "-0.5px",
            }}>
              {istConversion?.timeStr}
            </div>

            <div style={{ fontSize: 11.5, color: "var(--text-dim)", display: "flex", alignItems: "center", gap: 5 }}>
              <span>{istConversion?.dateStr}</span>
              <span style={{ opacity: 0.4 }}>|</span>
              <span>New Delhi / Mumbai / Bengaluru</span>
            </div>
          </div>
        </div>

        {/* Conversion Table */}
        <div className="hb-tz-table-wrap">
          <table className="hb-tz-table">
            <thead>
              <tr>
                <th>Zone</th>
                <th>Coverage</th>
                <th>Converted Time</th>
                <th>Date</th>
                <th>Window</th>
              </tr>
            </thead>
            <tbody>
              {conversions.map((conv) => (
                <tr key={conv.key} className={conv.isSource ? "--source" : ""}>
                  <td>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <CodeBadge code={conv.code} accent={conv.key === "IST"} />
                      <span style={{ fontWeight: 700, fontSize: 12.5 }}>{conv.key}</span>
                      <span style={{ color: "var(--text-dim)", fontSize: 11 }}>({conv.offsetNote})</span>
                    </div>
                  </td>
                  <td style={{ color: "var(--text-dim)", fontSize: 12 }}>{conv.city}</td>
                  <td style={{
                    fontFamily: "var(--font-mono)", fontWeight: 700,
                    color: conv.key === "IST" ? "var(--accent)" : "var(--text)", fontSize: 13,
                  }}>
                    {conv.timeStr}
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{conv.dateStr}</td>
                  <td><StatusDot status={conv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 24-Hour Overlap Timeline */}
        <div className="hb-tz-timeline">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{
              fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", color: "var(--text-dim)",
              display: "flex", alignItems: "center", gap: 5, letterSpacing: "0.03em",
            }}>
              <Sparkles size={12} style={{ color: "var(--accent)" }} /> 24-Hour Sync Track
            </span>
            <span style={{ fontSize: 10.5, color: "var(--accent)", fontWeight: 600 }}>
              Golden Overlap: 8:30 AM - 11:30 AM EST = 7:00 PM - 10:00 PM IST
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 600 }}>
              {/* EST row */}
              <div className="hb-tz-tl-row">
                <span className="hb-tz-tl-label" style={{ color: "var(--text-dim)" }}>EST</span>
                <div className="hb-tz-tl-grid">
                  {Array.from({ length: 24 }).map((_, h) => {
                    const isOverlap = h >= 8 && h <= 12;
                    const isSelected = sourceZoneKey === "EST" && selectedHour === h;
                    return (
                      <button
                        key={h}
                        type="button"
                        className="hb-tz-tl-cell"
                        onClick={() => { setSourceZoneKey("EST"); setSelectedHour(h); setSelectedClientId(""); }}
                        title={`EST ${h}:00`}
                        style={{
                          background: isSelected ? "var(--accent)" : isOverlap ? "rgba(16,185,129,0.25)" : "var(--surface-2)",
                          color: isSelected ? "#fff" : isOverlap ? "var(--success)" : "var(--text-dim)",
                          borderColor: isSelected ? "var(--accent)" : "transparent",
                        }}
                      >
                        {h}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* IST row */}
              <div className="hb-tz-tl-row">
                <span className="hb-tz-tl-label" style={{ color: "var(--accent)" }}>IST</span>
                <div className="hb-tz-tl-grid">
                  {Array.from({ length: 24 }).map((_, h) => {
                    const istH = (h + 10) % 24;
                    const isOverlap = h >= 8 && h <= 12;
                    const isSelected = sourceZoneKey === "EST" && selectedHour === h;
                    return (
                      <div
                        key={h}
                        className="hb-tz-tl-cell"
                        style={{
                          background: isSelected ? "var(--accent-dim)" : isOverlap ? "rgba(16,185,129,0.15)" : "var(--surface-3)",
                          color: isOverlap ? "var(--success)" : "var(--text-dim)",
                          cursor: "default",
                        }}
                      >
                        {istH}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="hb-tz-actions">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" onClick={handleCopy} className="hb-tz-btn-primary"
              style={{ background: copied ? "var(--success)" : undefined }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? "Copied!" : "Copy Meeting Details"}</span>
            </button>

            <a
              href={teamsMeetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hb-tz-btn-secondary"
              title="Open Microsoft Teams (Desktop / Web) with pre-selected time"
            >
              <Video size={14} style={{ color: "#6264a7" }} />
              <span>Schedule in Teams</span>
              <ExternalLink size={11} style={{ opacity: 0.5 }} />
            </a>

            <button
              type="button"
              onClick={handleOpenOutlook}
              className="hb-tz-btn-secondary"
              title="Open Desktop Outlook appointment with pre-selected time"
            >
              <CalendarPlus size={14} style={{ color: "var(--accent)" }} />
              <span>Open in Outlook</span>
            </button>
          </div>
          <span style={{ fontSize: 11, color: "var(--text-dim)", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Building2 size={12} /> Auto-synced with Daylight Saving Time (DST)
          </span>
        </div>
      </div>
    </div>
  );
}
