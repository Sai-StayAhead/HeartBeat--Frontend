import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Plus,
    Pencil,
    Trash2,
    CheckCircle2,
    Clock3,
    CircleAlert,
    ClipboardList,
    ListTodo,
    Search,
    RefreshCw,
    X,
    CalendarDays,
    UserRound,
    Building2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Loader2,
    ArrowRight,
    Filter,
    AlarmClock,
} from "lucide-react";

import "../styles/action-items.css";

/* ------------------------------------------------------------------ */
/* Static option sets — unchanged contract with the backend           */
/* ------------------------------------------------------------------ */

const CATEGORIES = [
    { value: "TODAY_TASK", label: "Today Task" },
    { value: "WAITING_REQUIREMENT", label: "Waiting Requirement" },
    { value: "PC_TASK", label: "PC Task" },
    { value: "QA_TESTING", label: "QA Testing" },
];

const STATUSES = [
    { value: "NOT_STARTED", label: "Not Started" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "WAITING_REQUIREMENT", label: "Waiting Requirement" },
    { value: "WAITING_CLIENT", label: "Waiting Client" },
    { value: "BLOCKED", label: "Blocked" },
    { value: "READY_FOR_QA", label: "Ready for QA" },
    { value: "QA_TESTING", label: "QA Testing" },
    { value: "COMPLETED", label: "Completed" },
    { value: "ON_HOLD", label: "On Hold" },
];

const PRIORITIES = [
    { value: "LOW", label: "Low" },
    { value: "MEDIUM", label: "Medium" },
    { value: "HIGH", label: "High" },
    { value: "CRITICAL", label: "Critical" },
];

const emptyForm = {
    client_id: "",
    task_title: "",
    description: "",
    category: "TODAY_TASK",
    status: "NOT_STARTED",
    priority: "MEDIUM",
    assigned_user_id: "",
    task_date: "",
    due_date: "",
    next_follow_up_date: "",
    remarks: "",
};

/* Which Kanban bucket a given status belongs to. Four buckets keeps the
   overview readable; QA/Ready-for-QA read naturally as "in progress"
   work, and On Hold reads as "waiting" on something. */
const BUCKET_OF_STATUS = {
    NOT_STARTED: "TODO",
    IN_PROGRESS: "PROGRESS",
    READY_FOR_QA: "PROGRESS",
    QA_TESTING: "PROGRESS",
    WAITING_REQUIREMENT: "WAITING",
    WAITING_CLIENT: "WAITING",
    BLOCKED: "WAITING",
    ON_HOLD: "WAITING",
    COMPLETED: "COMPLETED",
};

const BUCKETS = [
    { key: "TODO", label: "To Do", icon: ListTodo, tone: "muted" },
    { key: "PROGRESS", label: "In Progress", icon: Clock3, tone: "info" },
    { key: "WAITING", label: "Waiting", icon: CircleAlert, tone: "warning" },
    { key: "COMPLETED", label: "Completed", icon: CheckCircle2, tone: "success" },
];

const TABS = [
    { key: "ALL", label: "All Tasks" },
    { key: "TODO", label: "To Do" },
    { key: "PROGRESS", label: "In Progress" },
    { key: "WAITING", label: "Waiting" },
    { key: "COMPLETED", label: "Completed" },
    { key: "OVERDUE", label: "Overdue" },
    { key: "TODAY", label: "Today" },
];

const PAGE_SIZE = 8;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

function formatDate(value) {
    if (!value) return "—";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function getResponseData(response) {
    if (Array.isArray(response)) return response;
    return response?.data ?? [];
}

function getReport(response) {
    return response?.data ?? response ?? {};
}

function humanize(value) {
    if (!value) return "—";
    return value
        .toLowerCase()
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function initialsOf(name) {
    if (!name) return "??";
    return name
        .split(/[\s@.]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase();
}

function bucketOf(status) {
    return BUCKET_OF_STATUS[status] || "TODO";
}

function isOverdue(item, todayStr) {
    return !!item.due_date && item.due_date < todayStr && item.status !== "COMPLETED";
}

function isDueToday(item, todayStr) {
    return item.due_date === todayStr || item.task_date === todayStr;
}

/* Merge every report bucket into one flat, de-duplicated list so the
   Kanban view + table can group purely by status rather than by which
   report section the backend happened to put an item in. */
function flattenReport(report) {
    if (!report) return [];
    const map = new Map();
    const addAll = (list) => {
        (list || []).forEach((item) => {
            if (item && item.action_item_id != null) map.set(item.action_item_id, item);
        });
    };
    addAll(report.today_tasks);
    addAll(report.waiting_requirements);
    addAll(report.pc_tasks);
    addAll(report.qa_testing);
    (report.recent_completed || []).forEach((group) => addAll(group.items));
    return Array.from(map.values());
}

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                        */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }) {
    const tone =
        status === "COMPLETED"
            ? "success"
            : ["BLOCKED", "WAITING_CLIENT", "WAITING_REQUIREMENT"].includes(status)
                ? "warning"
                : ["READY_FOR_QA", "QA_TESTING"].includes(status)
                    ? "info"
                    : status === "ON_HOLD"
                        ? "muted"
                        : "accent";

    return (
        <span className={`hb-ai-badge ${tone}`}>
            {status === "COMPLETED" && <CheckCircle2 size={11} />}
            {["BLOCKED", "WAITING_CLIENT", "WAITING_REQUIREMENT"].includes(status) && <CircleAlert size={11} />}
            {["READY_FOR_QA", "QA_TESTING"].includes(status) && <Clock3 size={11} />}
            {status === "IN_PROGRESS" && <Clock3 size={11} />}
            {humanize(status)}
        </span>
    );
}

function PriorityBadge({ priority }) {
    return (
        <span className={`hb-ai-priority ${String(priority || "").toLowerCase()}`}>
            <span className="hb-ai-priority-dot" />
            {humanize(priority)}
        </span>
    );
}

function Avatar({ label }) {
    return <span className="hb-ai-avatar">{initialsOf(label)}</span>;
}

/* ------------------------------------------------------------------ */
/* Kanban overview — stat strip + four preview columns                */
/* ------------------------------------------------------------------ */

function OverviewCard({ icon: Icon, tone, label, value }) {
    return (
        <div className={`hb-ai-overview-card ${tone}`}>
            <div className="hb-ai-overview-icon">
                <Icon size={18} />
            </div>
            <div>
                <strong>{value}</strong>
                <span>{label}</span>
            </div>
        </div>
    );
}

function KanbanCard({ item, clientsById, usersById }) {
    const clientName = item.client_id && clientsById[item.client_id] ? clientsById[item.client_id] : "Internal";
    const assignedName = item.assigned_user_id && usersById[item.assigned_user_id] ? usersById[item.assigned_user_id] : null;

    return (
        <div className="hb-ai-kanban-card">
            <div className="hb-ai-kanban-card-top">
                <strong>{item.task_title}</strong>
                {assignedName && <Avatar label={assignedName} />}
            </div>
            <div className="hb-ai-kanban-card-meta">
                <span className="hb-ai-kanban-client">
                    <Building2 size={11} /> {clientName}
                </span>
                <span className="hb-ai-kanban-date">
                    <CalendarDays size={11} /> {formatDate(item.due_date || item.task_date)}
                </span>
            </div>
            <PriorityBadge priority={item.priority} />
        </div>
    );
}

function KanbanColumn({ bucket, items, clientsById, usersById, onViewAll }) {
    const Icon = bucket.icon;
    const preview = items.slice(0, 3);

    return (
        <div className="hb-ai-kanban-col">
            <div className="hb-ai-kanban-col-head">
                <div className="hb-ai-kanban-col-title">
                    <span className={`hb-ai-kanban-col-icon ${bucket.tone}`}>
                        <Icon size={14} />
                    </span>
                    {bucket.label}
                    <span className="hb-ai-kanban-count">{items.length}</span>
                </div>
                <button type="button" className="hb-ai-view-all" onClick={() => onViewAll(bucket.key)}>
                    View All <ArrowRight size={12} />
                </button>
            </div>

            <div className="hb-ai-kanban-col-body">
                {preview.length === 0 ? (
                    <div className="hb-ai-kanban-empty">Nothing here right now.</div>
                ) : (
                    preview.map((item) => (
                        <KanbanCard key={item.action_item_id} item={item} clientsById={clientsById} usersById={usersById} />
                    ))
                )}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Table                                                               */
/* ------------------------------------------------------------------ */

function TaskRow({
    item,
    index,
    clientsById,
    usersById,
    onEdit,
    onDelete,
    onViewDetails,
}) {
    const clientName = item.client_id && clientsById[item.client_id] ? clientsById[item.client_id] : "Internal";
    const assignedName = item.assigned_user_id && usersById[item.assigned_user_id] ? usersById[item.assigned_user_id] : "Unassigned";

    return (
        <tr
            className={`hb-ai-row${item.status === "COMPLETED" ? " hb-ai-row-clickable" : ""}`}
            onClick={() => {
                if (item.status === "COMPLETED") {
                    onViewDetails(item);
                }
            }}
        >
            <td className="hb-ai-cell-check">
                <input type="checkbox" aria-label={`Select ${item.task_title}`} />
            </td>
            <td className="hb-ai-cell-index">{index}</td>
            <td className="hb-ai-cell-task">
                <strong title={item.task_title}>{item.task_title}</strong>
                {item.description && <span title={item.description}>{item.description}</span>}
            </td>
            <td className="hb-ai-cell-muted">
                <span className="hb-ai-inline">
                    <Building2 size={12} /> {clientName}
                </span>
            </td>
            <td className="hb-ai-cell-muted">
                <span className="hb-ai-inline">
                    <Avatar label={assignedName} /> {assignedName}
                </span>
            </td>
            <td className="hb-ai-cell-muted hb-ai-mono">{formatDate(item.due_date)}</td>
            <td><StatusBadge status={item.status} /></td>
            <td><PriorityBadge priority={item.priority} /></td>
            <td className="hb-ai-cell-actions">
                <button
                    type="button"
                    className="hb-ai-icon-btn"
                    title="Edit"
                    onClick={(event) => {
                        event.stopPropagation();
                        onEdit(item);
                    }}
                >
                    <Pencil size={13} />
                </button>
                <button
                    type="button"
                    className="hb-ai-icon-btn danger"
                    title="Delete"
                    onClick={(event) => {
                        event.stopPropagation();
                        onDelete(item);
                    }}
                >
                    <Trash2 size={13} />
                </button>
            </td>
        </tr>
    );
}

/* ------------------------------------------------------------------ */
/* Modal — create / edit                                              */
/* ------------------------------------------------------------------ */

function ActionItemModal({ open, form, setForm, editingItem, clients, users, saving, onClose, onSubmit }) {
    if (!open) return null;

    const update = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    return (
        <div className="hb-action-modal-backdrop" onMouseDown={onClose}>
            <div className="hb-action-modal" onMouseDown={(event) => event.stopPropagation()}>
                <div className="hb-action-modal-header">
                    <div>
                        <div className="hb-eyebrow">WORKSPACE</div>
                        <h2>{editingItem ? "Edit Action Item" : "New Action Item"}</h2>
                        <p>Create and manage operational work for the team.</p>
                    </div>
                    <button type="button" className="hb-action-modal-close" onClick={onClose}>
                        <X size={17} />
                    </button>
                </div>

                <form onSubmit={onSubmit}>
                    <div className="hb-action-modal-body">
                        <div className="hb-action-form-grid full">
                            <label className="hb-action-field">
                                <span>Action Item *</span>
                                <input
                                    value={form.task_title}
                                    onChange={(e) => update("task_title", e.target.value)}
                                    placeholder="Enter action item"
                                    required
                                    maxLength={255}
                                />
                            </label>

                            <label className="hb-action-field">
                                <span>Description</span>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => update("description", e.target.value)}
                                    placeholder="Add additional details..."
                                    rows={3}
                                />
                            </label>
                        </div>

                        <div className="hb-action-form-grid">
                            <label className="hb-action-field">
                                <span>Category</span>
                                <div className="hb-action-select-wrap">
                                    <select value={form.category} onChange={(e) => update("category", e.target.value)}>
                                        {CATEGORIES.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} />
                                </div>
                            </label>

                            <label className="hb-action-field">
                                <span>Status</span>
                                <div className="hb-action-select-wrap">
                                    <select value={form.status} onChange={(e) => update("status", e.target.value)}>
                                        {STATUSES.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} />
                                </div>
                            </label>

                            <label className="hb-action-field">
                                <span>Priority</span>
                                <div className="hb-action-select-wrap">
                                    <select value={form.priority} onChange={(e) => update("priority", e.target.value)}>
                                        {PRIORITIES.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} />
                                </div>
                            </label>

                            <label className="hb-action-field">
                                <span>Client</span>
                                <div className="hb-action-select-wrap">
                                    <select value={form.client_id} onChange={(e) => update("client_id", e.target.value)}>
                                        <option value="">Internal / No Client</option>
                                        {clients.map((client) => (
                                            <option key={client.client_id} value={client.client_id}>{client.client_name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} />
                                </div>
                            </label>

                            <label className="hb-action-field">
                                <span>Assigned To</span>
                                <div className="hb-action-select-wrap">
                                    <select value={form.assigned_user_id} onChange={(e) => update("assigned_user_id", e.target.value)}>
                                        <option value="">Unassigned</option>
                                        {users
                                            .filter(
                                                (user) =>
                                                    ["admin", "admin2", "admin3"].includes(user.role) ||
                                                    String(user.user_id) === String(form.assigned_user_id)
                                            )
                                            .map((user) => (
                                                <option key={user.user_id} value={user.user_id}>
                                                    {user.email}
                                                </option>
                                            ))}
                                    </select>
                                    <ChevronDown size={14} />
                                </div>
                            </label>

                            <label className="hb-action-field">
                                <span>Task Date</span>
                                <input type="date" value={form.task_date} onChange={(e) => update("task_date", e.target.value)} required />
                            </label>

                            <label className="hb-action-field">
                                <span>Due Date</span>
                                <input type="date" value={form.due_date} onChange={(e) => update("due_date", e.target.value)} />
                            </label>

                            <label className="hb-action-field">
                                <span>Next Follow-up</span>
                                <input type="date" value={form.next_follow_up_date} onChange={(e) => update("next_follow_up_date", e.target.value)} />
                            </label>
                        </div>

                        <label className="hb-action-field">
                            <span>Remarks</span>
                            <textarea
                                value={form.remarks}
                                onChange={(e) => update("remarks", e.target.value)}
                                placeholder="Add notes or follow-up remarks..."
                                rows={3}
                            />
                        </label>
                    </div>

                    <div className="hb-action-modal-footer">
                        <button type="button" className="hb-action-secondary-btn" onClick={onClose} disabled={saving}>
                            Cancel
                        </button>
                        <button type="submit" className="hb-action-primary-btn" disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 size={14} className="hb-action-spin" /> Saving...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={14} /> {editingItem ? "Save Changes" : "Create Action Item"}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
function ActionItemDetailsModal({
    item,
    clientName,
    assignedName,
    onClose,
    onEdit,
}) {
    if (!item) return null;

    return (
        <div
            className="hb-action-modal-backdrop"
            onMouseDown={onClose}
        >
            <div
                className="hb-action-modal"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="hb-action-modal-header">
                    <div>
                        <div className="hb-eyebrow">
                            {item.status === "COMPLETED" ? "COMPLETED TASK" : "ACTION ITEM"}
                        </div>

                        <h2>Task Details</h2>

                        <p>View action item details and status.</p>
                    </div>

                    <button
                        type="button"
                        className="hb-action-modal-close"
                        onClick={onClose}
                    >
                        <X size={17} />
                    </button>
                </div>

                <div className="hb-action-modal-body">
                    <div className="hb-action-form-grid full">
                        <div className="hb-action-field">
                            <span>Action Item</span>
                            <div className="hb-ai-detail-value">
                                {item.task_title || "—"}
                            </div>
                        </div>

                        <div className="hb-action-field">
                            <span>Description</span>
                            <div className="hb-ai-detail-value multiline">
                                {item.description || "No description provided."}
                            </div>
                        </div>
                    </div>

                    <div className="hb-action-form-grid">
                        <div className="hb-action-field">
                            <span>Category</span>
                            <div className="hb-ai-detail-value">
                                {humanize(item.category)}
                            </div>
                        </div>

                        <div className="hb-action-field">
                            <span>Status</span>
                            <div className="hb-ai-detail-value">
                                <StatusBadge status={item.status} />
                            </div>
                        </div>

                        <div className="hb-action-field">
                            <span>Priority</span>
                            <div className="hb-ai-detail-value">
                                <PriorityBadge priority={item.priority} />
                            </div>
                        </div>

                        <div className="hb-action-field">
                            <span>Client</span>
                            <div className="hb-ai-detail-value">
                                {clientName}
                            </div>
                        </div>

                        <div className="hb-action-field">
                            <span>Assigned To</span>
                            <div className="hb-ai-detail-value">
                                {assignedName}
                            </div>
                        </div>

                        <div className="hb-action-field">
                            <span>Task Date</span>
                            <div className="hb-ai-detail-value">
                                {formatDate(item.task_date)}
                            </div>
                        </div>

                        <div className="hb-action-field">
                            <span>Due Date</span>
                            <div className="hb-ai-detail-value">
                                {formatDate(item.due_date)}
                            </div>
                        </div>

                        <div className="hb-action-field">
                            <span>Next Follow-up</span>
                            <div className="hb-ai-detail-value">
                                {formatDate(item.next_follow_up_date)}
                            </div>
                        </div>

                        <div className="hb-action-field">
                            <span>Completed At</span>
                            <div className="hb-ai-detail-value">
                                {item.completed_at
                                    ? new Date(item.completed_at).toLocaleString()
                                    : "—"}
                            </div>
                        </div>
                    </div>

                    <div className="hb-action-field">
                        <span>Remarks</span>

                        <div className="hb-ai-detail-value multiline">
                            {item.remarks || "No remarks added."}
                        </div>
                    </div>
                </div>

                <div className="hb-action-modal-footer">
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {onEdit && (
                            <button
                                type="button"
                                className="hb-action-primary-btn"
                                onClick={() => {
                                    onClose();
                                    onEdit(item);
                                }}
                            >
                                <Pencil size={13} /> Edit
                            </button>
                        )}
                        <button
                            type="button"
                            className="hb-action-secondary-btn"
                            onClick={onClose}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
/* ------------------------------------------------------------------ */
/* Root                                                                */
/* ------------------------------------------------------------------ */

export default function ActionItems({ api, targetActionItem, onClearTargetActionItem }) {
    const [reportDate, setReportDate] = useState(todayISO());
    const [report, setReport] = useState(null);
    const [clients, setClients] = useState([]);
    const [users, setUsers] = useState([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [detailsItem, setDetailsItem] = useState(null);

    const [activeTab, setActiveTab] = useState("ALL");
    const [search, setSearch] = useState("");
    const [clientFilter, setClientFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("");
    const [dateFilter, setDateFilter] = useState("");
    const [page, setPage] = useState(1);


    const tableRef = useRef(null);

    const clientsById = useMemo(() => {
        const map = {};
        clients.forEach((client) => { map[Number(client.client_id)] = client.client_name; });
        return map;
    }, [clients]);

    const usersById = useMemo(() => {
        const map = {};
        users.forEach((user) => { map[Number(user.user_id)] = user.email || user.name || `User ${user.user_id}`; });
        return map;
    }, [users]);

    const loadReport = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError("");
        try {
            const response = await api(`/action-items/daily-report?report_date=${encodeURIComponent(reportDate)}`);
            setReport(getReport(response));
        } catch (err) {
            setError(err.message || "Failed to load action items.");
        } finally {
            if (!silent) setLoading(false);
        }
    }, [api, reportDate]);

    const loadOptions = useCallback(async () => {
        try {
            const clientsResponse = await api("/clients/");
            const clientData = getResponseData(clientsResponse);

            setClients(
                Array.isArray(clientData) ? clientData : []
            );
        } catch (err) {
            console.warn("Action item client loading failed:", err);
        }

        try {
            const usersResponse = await api("/auth/users/assignees");
            const userData = getResponseData(usersResponse);

            setUsers(
                Array.isArray(userData) ? userData : []
            );
        } catch (err) {
            console.warn("Action item user loading failed:", err);
        }
    }, [api]);

    useEffect(() => { loadOptions(); }, [loadOptions]);

    // Load report on mount and silently poll every 30s to keep assigned tasks fresh
    useEffect(() => {
        loadReport();
        const interval = setInterval(() => {
            loadReport(true);
        }, 30000);
        return () => clearInterval(interval);
    }, [loadReport]);

    // When navigated via "View Action Item" from notifications
    useEffect(() => {
        if (!targetActionItem?.id) return;

        let cancelled = false;

        const handleTarget = async () => {
            try {
                const response = await api(`/action-items/${targetActionItem.id}`);
                const item = response?.data ?? response;

                if (cancelled || !item) return;

                setDetailsItem(item);

                setActiveTab("ALL");
                setClientFilter("");
                setStatusFilter("");
                setPriorityFilter("");
                setDateFilter("");
                setSearch("");
                setPage(1);

                if (item.task_date && item.task_date !== reportDate) {
                    setReportDate(item.task_date);
                } else {
                    loadReport(true);
                }

                setReport((prev) => {
                    if (!prev) return prev;
                    const alreadyExists =
                        (prev.today_tasks || []).some((t) => t.action_item_id === item.action_item_id) ||
                        (prev.waiting_requirements || []).some((t) => t.action_item_id === item.action_item_id) ||
                        (prev.pc_tasks || []).some((t) => t.action_item_id === item.action_item_id) ||
                        (prev.qa_testing || []).some((t) => t.action_item_id === item.action_item_id);

                    if (alreadyExists) return prev;
                    return {
                        ...prev,
                        today_tasks: [item, ...(prev.today_tasks || [])],
                    };
                });
            } catch (err) {
                console.warn("Failed to fetch target action item:", err);
                loadReport(true);
            } finally {
                onClearTargetActionItem?.();
            }
        };

        handleTarget();

        return () => {
            cancelled = true;
        };
    }, [targetActionItem, api, reportDate, loadReport, onClearTargetActionItem]);

    const allItems = useMemo(() => flattenReport(report), [report]);
    const todayStr = todayISO();

    const bucketCounts = useMemo(() => {
        const counts = { TODO: 0, PROGRESS: 0, WAITING: 0, COMPLETED: 0 };
        allItems.forEach((item) => { counts[bucketOf(item.status)] += 1; });
        return counts;
    }, [allItems]);

    const itemsByBucket = useMemo(() => {
        const grouped = { TODO: [], PROGRESS: [], WAITING: [], COMPLETED: [] };
        allItems.forEach((item) => { grouped[bucketOf(item.status)].push(item); });
        return grouped;
    }, [allItems]);

    const overdueCount = useMemo(() => allItems.filter((i) => isOverdue(i, todayStr)).length, [allItems, todayStr]);
    const todayCount = useMemo(() => allItems.filter((i) => isDueToday(i, todayStr)).length, [allItems, todayStr]);

    const filteredItems = useMemo(() => {
        let list = allItems;

        if (activeTab === "OVERDUE") list = list.filter((i) => isOverdue(i, todayStr));
        else if (activeTab === "TODAY") list = list.filter((i) => isDueToday(i, todayStr));
        else if (activeTab !== "ALL") list = list.filter((i) => bucketOf(i.status) === activeTab);

        if (clientFilter) list = list.filter((i) => String(i.client_id || "") === String(clientFilter));
        if (statusFilter) list = list.filter((i) => i.status === statusFilter);
        if (priorityFilter) list = list.filter((i) => i.priority === priorityFilter);
        if (dateFilter) list = list.filter((i) => i.due_date === dateFilter || i.task_date === dateFilter);

        const q = search.trim().toLowerCase();
        if (q) {
            list = list.filter((i) => {
                const clientName = i.client_id && clientsById[i.client_id] ? clientsById[i.client_id] : "internal";
                const assignedName = i.assigned_user_id && usersById[i.assigned_user_id] ? usersById[i.assigned_user_id] : "unassigned";
                const haystack = `${i.task_title || ""} ${i.description || ""} ${clientName} ${assignedName}`.toLowerCase();
                return haystack.includes(q);
            });
        }

        return [...list].sort((a, b) => new Date(a.due_date || a.task_date || 0) - new Date(b.due_date || b.task_date || 0));
    }, [allItems, activeTab, clientFilter, statusFilter, priorityFilter, dateFilter, search, clientsById, usersById, todayStr]);

    useEffect(() => { setPage(1); }, [activeTab, clientFilter, statusFilter, priorityFilter, dateFilter, search]);

    const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
    const pageItems = filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const hasActiveFilters = !!(clientFilter || statusFilter || priorityFilter || dateFilter || search.trim());

    const resetFilters = () => {
        setClientFilter(""); setStatusFilter(""); setPriorityFilter(""); setDateFilter(""); setSearch("");
    };

    const goToBucket = (bucketKey) => {
        setActiveTab(bucketKey);
        tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const openCreate = () => {
        setEditingItem(null);
        setForm({ ...emptyForm, task_date: reportDate, due_date: reportDate });
        setError(""); setNotice(""); setModalOpen(true);
    };
    const openDetails = (item) => {
        setDetailsItem(item);
    };

    const closeDetails = () => {
        setDetailsItem(null);
    };
    const openEdit = async (item) => {
        try {
            setError("");
            setNotice("");

            const response = await api(
                `/action-items/${item.action_item_id}`
            );

            const fullItem = response?.data ?? response;

            setEditingItem(fullItem);

            setForm({
                client_id: fullItem.client_id ?? "",
                task_title: fullItem.task_title ?? "",
                description: fullItem.description ?? "",
                category: fullItem.category ?? "TODAY_TASK",
                status: fullItem.status ?? "NOT_STARTED",
                priority: fullItem.priority ?? "MEDIUM",
                assigned_user_id: fullItem.assigned_user_id ?? "",
                task_date: fullItem.task_date ?? reportDate,
                due_date: fullItem.due_date ?? "",
                next_follow_up_date: fullItem.next_follow_up_date ?? "",
                remarks: fullItem.remarks ?? "",
            });

            setModalOpen(true);
        } catch (err) {
            setError(err.message || "Failed to load action item.");
        }
    };
    const closeModal = () => {
        if (saving) return;
        setModalOpen(false); setEditingItem(null); setForm(emptyForm);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!form.task_title.trim()) { setError("Action item title is required."); return; }

        setSaving(true); setError(""); setNotice("");

        const payload = {
            client_id: form.client_id ? Number(form.client_id) : null,
            task_title: form.task_title.trim(),
            description: form.description.trim() || null,
            category: form.category,
            status: form.status,
            priority: form.priority,
            assigned_user_id: form.assigned_user_id ? Number(form.assigned_user_id) : null,
            task_date: form.task_date,
            due_date: form.due_date || null,
            next_follow_up_date: form.next_follow_up_date || null,
            remarks: form.remarks.trim() || null,
        };

        try {
            if (editingItem) {
                await api(`/action-items/${editingItem.action_item_id}`, { method: "PUT", body: JSON.stringify(payload) });
                setNotice("Action item updated successfully.");
            } else {
                await api("/action-items/", { method: "POST", body: JSON.stringify(payload) });
                setNotice("Action item created successfully.");
            }
            setModalOpen(false); setEditingItem(null); setForm(emptyForm);
            await loadReport(true);
        } catch (err) {
            setError(err.message || "Failed to save action item.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (item) => {
        const confirmed = window.confirm(`Delete "${item.task_title}"?\n\nThis action cannot be undone.`);
        if (!confirmed) return;
        setError(""); setNotice("");
        try {
            await api(`/action-items/${item.action_item_id}`, { method: "DELETE" });
            setNotice("Action item deleted successfully.");
            await loadReport(true);
        } catch (err) {
            setError(err.message || "Failed to delete action item.");
        }
    };

    if (loading && !report) {
        return (
            <div className="hb-ai-page">
                <div className="hb-ai-loading">
                    <Loader2 size={20} className="hb-action-spin" />
                    Loading Action Items...
                </div>
            </div>
        );
    }

    return (
        <div className="hb-ai-page">
            {/* Hero */}
            <div className="hb-ai-hero">
                <div>
                    <h1 className="hb-ai-title">Action Items</h1>
                    <p className="hb-ai-subtitle">Track and manage your tasks efficiently.</p>
                </div>
                <button type="button" className="hb-action-primary-btn hb-ai-add-btn" onClick={openCreate}>
                    <Plus size={15} /> Add Action Item
                </button>
            </div>

            {error && (
                <div className="hb-action-alert danger">
                    <CircleAlert size={15} /><span>{error}</span>
                    <button type="button" onClick={() => setError("")}><X size={14} /></button>
                </div>
            )}
            {notice && (
                <div className="hb-action-alert success">
                    <CheckCircle2 size={15} /><span>{notice}</span>
                    <button type="button" onClick={() => setNotice("")}><X size={14} /></button>
                </div>
            )}

            {/* Overview strip */}
            <div className="hb-ai-overview-grid">
                <OverviewCard icon={ClipboardList} tone="accent" label="Total Tasks" value={allItems.length} />
                <OverviewCard icon={Clock3} tone="info" label="In Progress" value={bucketCounts.PROGRESS} />
                <OverviewCard icon={CircleAlert} tone="warning" label="Waiting" value={bucketCounts.WAITING} />
                <OverviewCard icon={CheckCircle2} tone="success" label="Completed" value={bucketCounts.COMPLETED} />
            </div>

            {/* Kanban preview columns */}
            <div className="hb-ai-kanban-grid">
                {BUCKETS.map((bucket) => (
                    <KanbanColumn
                        key={bucket.key}
                        bucket={bucket}
                        items={itemsByBucket[bucket.key]}
                        clientsById={clientsById}
                        usersById={usersById}
                        onViewAll={goToBucket}
                    />
                ))}
            </div>

            {/* Table toolbar */}
            <div className="hb-ai-table-panel" ref={tableRef}>
                <div className="hb-ai-toolbar">
                    <div className="hb-ai-tabs">
                        {TABS.map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                className={`hb-ai-tab${activeTab === tab.key ? " active" : ""}`}
                                onClick={() => setActiveTab(tab.key)}
                            >
                                {tab.label}
                                {tab.key === "OVERDUE" && overdueCount > 0 && <span className="hb-ai-tab-count danger">{overdueCount}</span>}
                                {tab.key === "TODAY" && todayCount > 0 && <span className="hb-ai-tab-count accent">{todayCount}</span>}
                            </button>
                        ))}
                    </div>

                    <div className="hb-ai-toolbar-right">
                        <div className="hb-ai-search">
                            <Search size={14} />
                            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search action items…" />
                        </div>

                        <div className="hb-ai-select-wrap">
                            <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
                                <option value="">All Clients</option>
                                {clients.map((c) => (
                                    <option key={c.client_id} value={c.client_id}>{c.client_name}</option>
                                ))}
                            </select>
                            <ChevronDown size={13} />
                        </div>

                        <div className="hb-ai-select-wrap">
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                <option value="">All Status</option>
                                {STATUSES.map((s) => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                            <ChevronDown size={13} />
                        </div>

                        <div className="hb-ai-select-wrap">
                            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                                <option value="">All Priority</option>
                                {PRIORITIES.map((p) => (
                                    <option key={p.value} value={p.value}>{p.label}</option>
                                ))}
                            </select>
                            <ChevronDown size={13} />
                        </div>

                        <label className="hb-ai-date-filter">
                            <CalendarDays size={13} />
                            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
                        </label>

                        {hasActiveFilters && (
                            <button type="button" className="hb-ai-clear-filters" onClick={resetFilters} title="Clear filters">
                                <Filter size={13} /> Clear
                            </button>
                        )}

                        <button type="button" className="hb-action-secondary-btn hb-ai-refresh-btn" onClick={() => loadReport()} disabled={loading}>
                            <RefreshCw size={13} className={loading ? "hb-action-spin" : ""} />
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="hb-ai-table-wrap">
                    <table className="hb-ai-table">
                        <thead>
                            <tr>
                                <th className="hb-ai-cell-check"><input type="checkbox" aria-label="Select all" /></th>
                                <th>#</th>
                                <th>Task Title</th>
                                <th>Client</th>
                                <th>Assigned To</th>
                                <th>Due Date</th>
                                <th>Status</th>
                                <th>Priority</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {pageItems.length === 0 ? (
                                <tr>
                                    <td colSpan={9}>
                                        <div className="hb-ai-empty">
                                            <AlarmClock size={20} />
                                            <strong>No tasks match these filters</strong>
                                            <span>Try clearing a filter or search term.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                pageItems.map((item, i) => (
                                    <TaskRow
                                        key={item.action_item_id}
                                        item={item}
                                        index={(page - 1) * PAGE_SIZE + i + 1}
                                        clientsById={clientsById}
                                        usersById={usersById}
                                        onEdit={openEdit}
                                        onDelete={handleDelete}
                                        onViewDetails={openDetails}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="hb-ai-table-footer">
                    <span>
                        Showing {filteredItems.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
                        –{Math.min(page * PAGE_SIZE, filteredItems.length)} of {filteredItems.length} items
                    </span>

                    <div className="hb-ai-pagination">
                        <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                            <ChevronLeft size={14} />
                        </button>
                        <span className="hb-ai-page-current">{page}</span>
                        <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>

            <ActionItemModal
                open={modalOpen}
                form={form}
                setForm={setForm}
                editingItem={editingItem}
                clients={clients}
                users={users}
                saving={saving}
                onClose={closeModal}
                onSubmit={handleSubmit}
            />

            <ActionItemDetailsModal
                item={detailsItem}
                clientName={
                    detailsItem?.client_id &&
                        clientsById[detailsItem.client_id]
                        ? clientsById[detailsItem.client_id]
                        : "Internal / No Client"
                }
                assignedName={
                    detailsItem?.assigned_user_id &&
                        usersById[detailsItem.assigned_user_id]
                        ? usersById[detailsItem.assigned_user_id]
                        : "Unassigned"
                }
                onClose={closeDetails}
                onEdit={openEdit}
            />
        </div>
    );
}