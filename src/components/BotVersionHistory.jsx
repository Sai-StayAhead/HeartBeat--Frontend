import React, { useState, useEffect, useCallback } from "react";
import { Plus, Clock, Tag, User as UserIcon, Loader2 } from "lucide-react";

/* ------------------------------------------------------------------ */
/* BotVersionHistoryModal                                              */
/*                                                                      */
/* Shows a bot's version history (newest first) and, for admins, a     */
/* small inline form to record a new version. Adding a version hits    */
/* POST /bots/{bot_id}/versions, which the backend uses to both append */
/* a history row AND update bots.current_version — so the bots list    */
/* column refreshes automatically the next time it reloads.            */
/*                                                                      */
/* This component takes the shared UI primitives (Modal, Button,       */
/* Field, ErrorBanner, inputStyle, timeAgo) as props instead of        */
/* importing them, since they live inline in App.jsx today. That keeps */
/* this file drop-in without needing App.jsx to export anything new.   */
/* ------------------------------------------------------------------ */
export default function BotVersionHistoryModal({
  api,
  bot,
  canWrite,
  onClose,
  Modal,
  Button,
  Field,
  ErrorBanner,
  inputStyle,
  timeAgo,
}) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVersion, setNewVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api(`/bots/${bot.bot_id}/versions`);
      setVersions(res?.data || res || []);
    } catch (err) {
      setError(err.message || "Failed to load version history.");
    } finally {
      setLoading(false);
    }
  }, [api, bot.bot_id]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    const version = newVersion.trim();
    if (!version) return;
    setSaving(true);
    setError("");
    try {
      await api(`/bots/${bot.bot_id}/versions`, {
        method: "POST",
        body: JSON.stringify({
          version,
          notes: notes.trim() || undefined,
        }),
      });
      setNewVersion("");
      setNotes("");
      setShowAddForm(false);
      load();
    } catch (err) {
      setError(err.message || "Failed to add version.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`${bot.bot_name} — version history`} onClose={onClose} width={480}>
      <ErrorBanner message={error} onDismiss={() => setError("")} />

      {canWrite && (
        <div style={{ marginBottom: 16 }}>
          {!showAddForm ? (
            <Button onClick={() => setShowAddForm(true)}>
              <Plus size={14} /> Add new version
            </Button>
          ) : (
            <form
              onSubmit={submit}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: 14,
                background: "var(--surface-2)",
                animation: "hb-rise .18s ease both",
              }}
            >
              <Field label="Version">
                <input
                  style={inputStyle}
                  value={newVersion}
                  onChange={(e) => setNewVersion(e.target.value)}
                  placeholder="e.g. 1.2.0"
                  required
                  autoFocus
                />
              </Field>
              <Field label="Notes (optional)">
                <input
                  style={inputStyle}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What changed in this version"
                />
              </Field>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewVersion("");
                    setNotes("");
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 size={13} className="hb-spin" /> : <Plus size={13} />}
                  {saving ? "Saving…" : "Save version"}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="hb-scroll" style={{ maxHeight: 360, overflowY: "auto" }}>
        {loading && (
          <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>
            Loading…
          </div>
        )}

        {!loading && versions.length === 0 && (
          <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>
            No versions recorded yet.
          </div>
        )}

        {!loading &&
          versions.map((v, i) => (
            <div
              key={v.bot_version_id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "12px 4px",
                borderBottom: i === versions.length - 1 ? "none" : "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: i === 0 ? "var(--accent-dim)" : "var(--surface-3)",
                  color: i === 0 ? "var(--accent)" : "var(--text-dim)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Tag size={14} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: 13.5 }}>
                    {v.version}
                  </span>
                  {i === 0 && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 7px",
                        borderRadius: 10,
                        background: "var(--accent-dim)",
                        color: "var(--accent)",
                      }}
                    >
                      LATEST
                    </span>
                  )}
                </div>
                {v.notes && (
                  <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 3 }}>{v.notes}</div>
                )}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginTop: 5,
                    fontSize: 11,
                    color: "var(--text-dim)",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock size={11} /> {timeAgo(v.created_at)}
                  </span>
                  {v.changed_by && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <UserIcon size={11} /> {v.changed_by}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
      </div>
    </Modal>
  );
}