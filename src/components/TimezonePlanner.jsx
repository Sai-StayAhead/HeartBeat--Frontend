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
    <span className={`hb-tz-code-badge ${accent ? "is-accent" : ""}`}>
      {code}
    </span>
  );
}

function StatusDot({ status }) {
  const Icon = status.iconName === "briefcase" ? Briefcase : status.iconName === "sparkles" ? Sparkles : Moon;
  return (
    <span className="hb-tz-status-badge" style={{ color: status.color }}>
      <span className="hb-tz-status-dot" style={{ backgroundColor: status.color }} />
      <Icon size={11} className="hb-tz-status-icon" />
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
    <div className={`hb-tz ${isModal ? "is-modal" : ""}`}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="hb-tz-header">
        <div className="hb-tz-header-left">
          <div className="hb-tz-header-icon-wrap">
            <Globe size={22} />
          </div>
          <div className="hb-tz-header-titles">
            <div className="hb-tz-header-pill">
              <span className="hb-tz-header-pill-dot" />
              <span>Operations Fleet Sync</span>
            </div>
            <h2 className="hb-tz-title">Timezones & Meeting Planner</h2>
            <p className="hb-tz-subtitle">
              US enterprise hubs and India operations time alignment
            </p>
          </div>
        </div>

        <div className="hb-tz-header-actions">
          {clients.length > 0 && (
            <div className="hb-tz-select-wrap">
              <Building2 size={14} className="hb-tz-select-icon" />
              <select
                value={selectedClientId}
                onChange={(e) => handleClientSelect(e.target.value)}
                className="hb-tz-client-select"
                aria-label="Select client timezone"
              >
                <option value="">-- Select Client Timezone --</option>
                {clients.map((c) => (
                  <option key={c.client_id} value={c.client_id}>
                    {c.client_name} ({c.timezone.split("/").pop().replace(/_/g, " ")})
                  </option>
                ))}
              </select>
            </div>
          )}
          {isModal && onClose && (
            <button type="button" onClick={onClose} className="hb-tz-btn-secondary hb-tz-modal-close">
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
            <div key={tz.key} className={`hb-tz-clock-card ${isIst ? "is-ist" : ""}`}>
              <div className="hb-tz-clock-top">
                <div className="hb-tz-clock-zone-badge">
                  <CodeBadge code={tz.code} accent={isIst} />
                  <span className="hb-tz-clock-key">{tz.key}</span>
                </div>
                <span className="hb-tz-clock-offset">{tz.offsetNote}</span>
              </div>
              <div className="hb-tz-clock-time-wrap">
                <span className="hb-tz-clock-time">{timeStr}</span>
              </div>
              <div className="hb-tz-clock-meta">
                <span className="hb-tz-clock-city" title={tz.city}>{tz.region}</span>
                <div className="hb-tz-clock-status">
                  <span className="hb-tz-status-indicator" style={{ backgroundColor: status.color }} />
                  <span style={{ color: status.color }}>{status.label}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Converter Card ──────────────────────────────────── */}
      <div className="hb-tz-converter">

        {/* Controls: Presets + Date */}
        <div className="hb-tz-controls">
          <div className="hb-tz-presets-wrap">
            <span className="hb-tz-presets-label">
              <Clock size={12} /> Presets:
            </span>
            <div className="hb-tz-presets">
              {quickPresets.map((preset, idx) => {
                const isActive = sourceZoneKey === preset.zone && selectedHour === preset.hour && selectedMinute === preset.min;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={`hb-tz-preset-btn ${isActive ? "is-active" : ""}`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="hb-tz-date-picker-wrap">
            <span className="hb-tz-date-label">Date:</span>
            <div className="hb-tz-date-input-box">
              <CalendarClock size={13} className="hb-tz-date-icon" />
              <input
                type="date"
                value={selectedDateStr}
                onChange={(e) => setSelectedDateStr(e.target.value)}
                className="hb-tz-date-input"
              />
            </div>
          </div>
        </div>

        {/* Time Bridge: Source → IST */}
        <div className="hb-tz-bridge">
          {/* Left Pane — Source Zone */}
          <div className="hb-tz-pane is-source">
            <div className="hb-tz-pane-header">
              <div className="hb-tz-pane-zone-select">
                <CodeBadge code={sourceZone.code} />
                <div className="hb-tz-select-inline-wrap">
                  <select
                    value={sourceZoneKey}
                    onChange={(e) => { setSourceZoneKey(e.target.value); setSelectedClientId(""); }}
                    className="hb-tz-source-select"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.key} value={tz.key}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <StatusDot status={sourceConversion?.status || { tone: "success", label: "Active", color: "var(--success)", iconName: "briefcase" }} />
            </div>

            <div className="hb-tz-time-dial-wrap">
              <div className="hb-tz-time-dial">
                <select
                  value={selectedHour}
                  onChange={(e) => setSelectedHour(Number(e.target.value))}
                  className="hb-tz-dial-select hour-select"
                  aria-label="Select hour"
                >
                  {Array.from({ length: 24 }).map((_, h) => {
                    const ampm = h >= 12 ? "PM" : "AM";
                    const displayH = h % 12 === 0 ? 12 : h % 12;
                    return (
                      <option key={h} value={h}>
                        {displayH}:00 {ampm}
                      </option>
                    );
                  })}
                </select>
                <span className="hb-tz-time-separator">:</span>
                <select
                  value={selectedMinute}
                  onChange={(e) => setSelectedMinute(Number(e.target.value))}
                  className="hb-tz-dial-select min-select"
                  aria-label="Select minute"
                >
                  <option value={0}>00</option>
                  <option value={15}>15</option>
                  <option value={30}>30</option>
                  <option value={45}>45</option>
                </select>
                <span className="hb-tz-time-zone-tag">
                  {sourceZone.key}
                </span>
              </div>
            </div>

            <div className="hb-tz-pane-footer">
              <span>{sourceConversion?.dateStr}</span>
              <span className="hb-tz-pane-dot">|</span>
              <span>{sourceZone.city}</span>
            </div>
          </div>

          {/* Center Connector */}
          <div className="hb-tz-connector">
            <div className="hb-tz-connector-line" />
            <div className="hb-tz-connector-badge">
              <div className="hb-tz-connector-icon">
                <ArrowRightLeft size={15} />
              </div>
              <div className="hb-tz-connector-text">
                {istDelta.deltaStr} {istDelta.direction !== "Same Time" ? istDelta.direction : ""}
              </div>
            </div>
            <div className="hb-tz-connector-line" />
          </div>

          {/* Right Pane — IST Target */}
          <div className="hb-tz-pane is-target">
            <div className="hb-tz-pane-header">
              <div className="hb-tz-target-label">
                <CodeBadge code="IN" accent />
                <span className="hb-tz-target-title">
                  India Standard Time (IST)
                </span>
              </div>
              <StatusDot status={istConversion?.status || { tone: "success", label: "Active", color: "var(--success)", iconName: "briefcase" }} />
            </div>

            <div className="hb-tz-target-time-wrap">
              <span className="hb-tz-target-time">
                {istConversion?.timeStr}
              </span>
              <span className="hb-tz-time-zone-tag accent">IST</span>
            </div>

            <div className="hb-tz-pane-footer">
              <span>{istConversion?.dateStr}</span>
              <span className="hb-tz-pane-dot">|</span>
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
                <tr key={conv.key} className={conv.isSource ? "is-source-row" : conv.key === "IST" ? "is-ist-row" : ""}>
                  <td>
                    <div className="hb-tz-table-zone-cell">
                      <CodeBadge code={conv.code} accent={conv.key === "IST"} />
                      <span className="hb-tz-table-key">{conv.key}</span>
                      <span className="hb-tz-table-offset">({conv.offsetNote})</span>
                    </div>
                  </td>
                  <td className="hb-tz-table-city">{conv.city}</td>
                  <td>
                    <span className={`hb-tz-table-time ${conv.key === "IST" ? "is-ist" : ""}`}>
                      {conv.timeStr}
                    </span>
                  </td>
                  <td className="hb-tz-table-date">{conv.dateStr}</td>
                  <td><StatusDot status={conv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 24-Hour Overlap Timeline */}
        <div className="hb-tz-timeline">
          <div className="hb-tz-timeline-header">
            <div className="hb-tz-timeline-title">
              <Sparkles size={13} className="hb-tz-sparkle-icon" />
              <span>24-Hour Operations Sync Track</span>
            </div>
            <div className="hb-tz-overlap-callout">
              <span className="hb-tz-overlap-dot" />
              <span className="hb-tz-overlap-label">Golden Overlap:</span>
              <span className="hb-tz-overlap-times">
                8:30 AM – 11:30 AM EST = 7:00 PM – 10:00 PM IST
              </span>
            </div>
          </div>

          <div className="hb-tz-timeline-scroll">
            <div className="hb-tz-timeline-track">
              {/* EST row */}
              <div className="hb-tz-tl-row">
                <div className="hb-tz-tl-label-col">
                  <span className="hb-tz-tl-pill">EST</span>
                </div>
                <div className="hb-tz-tl-grid">
                  {Array.from({ length: 24 }).map((_, h) => {
                    const isOverlap = h >= 8 && h <= 12;
                    const isSelected = sourceZoneKey === "EST" && selectedHour === h;
                    return (
                      <button
                        key={h}
                        type="button"
                        className={`hb-tz-tl-cell ${isSelected ? "is-selected" : ""} ${isOverlap ? "is-overlap" : ""}`}
                        onClick={() => { setSourceZoneKey("EST"); setSelectedHour(h); setSelectedClientId(""); }}
                        title={`Select EST ${h}:00`}
                      >
                        {h}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* IST row */}
              <div className="hb-tz-tl-row">
                <div className="hb-tz-tl-label-col">
                  <span className="hb-tz-tl-pill is-ist">IST</span>
                </div>
                <div className="hb-tz-tl-grid">
                  {Array.from({ length: 24 }).map((_, h) => {
                    const istH = (h + 10) % 24;
                    const isOverlap = h >= 8 && h <= 12;
                    const isSelected = sourceZoneKey === "EST" && selectedHour === h;
                    return (
                      <div
                        key={h}
                        className={`hb-tz-tl-cell is-readonly ${isSelected ? "is-selected-match" : ""} ${isOverlap ? "is-overlap" : ""}`}
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
          <div className="hb-tz-action-buttons">
            <button
              type="button"
              onClick={handleCopy}
              className={`hb-tz-btn-primary ${copied ? "is-copied" : ""}`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? "Copied Meeting Details!" : "Copy Meeting Details"}</span>
            </button>

            <a
              href={teamsMeetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hb-tz-btn-secondary hb-tz-btn-teams"
              title="Open Microsoft Teams (Desktop / Web) with pre-selected time"
            >
              <Video size={14} className="hb-tz-btn-teams-icon" />
              <span>Schedule in Teams</span>
              <ExternalLink size={11} className="hb-tz-external-icon" />
            </a>

            <button
              type="button"
              onClick={handleOpenOutlook}
              className="hb-tz-btn-secondary hb-tz-btn-outlook"
              title="Open Desktop Outlook appointment with pre-selected time"
            >
              <CalendarPlus size={14} className="hb-tz-btn-outlook-icon" />
              <span>Open in Outlook</span>
            </button>
          </div>
          <div className="hb-tz-dst-badge">
            <Building2 size={12} />
            <span>Auto-synced with Daylight Saving Time (DST)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
