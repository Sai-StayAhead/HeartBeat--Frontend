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
    Copy,
    Check,
    Link2,
    Paperclip,
    FileText,
    Image as ImageIcon,
    Download,
    Upload,
    Eye,
    LayoutGrid,
    Columns3,
    List,
    Bot,
} from "lucide-react";

import "../styles/action-items.css";

function formatBytes(bytes) {
    const n = Number(bytes || 0);
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function isImageAttachment(att) {
    const ct = String(att?.content_type || att?.type || "").toLowerCase();
    const name = String(att?.filename || att?.name || "").toLowerCase();
    return ct.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(name);
}

function isPdfAttachment(att) {
    const ct = String(att?.content_type || att?.type || "").toLowerCase();
    const name = String(att?.filename || att?.name || "").toLowerCase();
    return ct === "application/pdf" || /\.pdf$/i.test(name);
}

function isSafeBlobUrl(url) {
    return typeof url === "string" && url.startsWith("blob:");
}

function validateAttachmentFile(file) {
    if (!file) return "Invalid file.";
    const ext = String(file.name || "").split(".").pop()?.toLowerCase() || "";
    const allowedExt = new Set(["png", "jpg", "jpeg", "webp", "gif", "pdf"]);
    if (!allowedExt.has(ext)) {
        return `"${file.name}" is not supported. Only PNG, JPG, JPEG, WEBP, GIF photos or PDF files are allowed.`;
    }
    if (file.size > 10 * 1024 * 1024) {
        return `"${file.name}" exceeds the 10 MB limit.`;
    }
    if (file.size <= 0) {
        return `"${file.name}" is empty.`;
    }
    return null;
}

function AttachmentCountBadge({ count }) {
    if (!count) return null;
    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                fontWeight: 600,
                padding: "2px 7px",
                borderRadius: 6,
                background: "var(--surface-2, rgba(148, 163, 184, 0.12))",
                color: "var(--text-muted)",
                border: "1px solid var(--border)",
            }}
            title={`${count} attachment${count === 1 ? "" : "s"}`}
        >
            <Paperclip size={11} />
            {count}
        </span>
    );
}

function QueuedFileThumb({ file, onRemove }) {
    const isImg = isImageAttachment(file);
    const [previewUrl, setPreviewUrl] = useState(null);

    useEffect(() => {
        if (!isImg) return undefined;
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file, isImg]);

    return (
        <div className="hb-ai-att-chip">
            {isImg && previewUrl ? (
                <img src={previewUrl} alt={file.name} className="hb-ai-att-thumb" />
            ) : (
                <span className="hb-ai-att-icon">
                    <FileText size={16} />
                </span>
            )}
            <div className="hb-ai-att-meta">
                <strong title={file.name}>{file.name}</strong>
                <span>{formatBytes(file.size)} · Pending</span>
            </div>
            <button
                type="button"
                className="hb-ai-att-del"
                onClick={onRemove}
                title="Remove attachment"
            >
                <X size={13} />
            </button>
        </div>
    );
}

function TicketKeyBadge({ ticketKey }) {
    if (!ticketKey) return null;
    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.03em",
                padding: "2px 7px",
                borderRadius: 6,
                background: "rgba(249, 115, 22, 0.12)",
                color: "var(--accent, #f97316)",
                border: "1px solid rgba(249, 115, 22, 0.28)",
                whiteSpace: "nowrap",
            }}
        >
            {ticketKey}
        </span>
    );
}

/* ------------------------------------------------------------------ */
/* Static option sets — unchanged contract with the backend           */
/* ------------------------------------------------------------------ */

const CATEGORIES = [
    { value: "TODAY_TASK", label: "Today Task" },
    { value: "ISSUE", label: "Issue / Bug" },
    { value: "ENHANCEMENT", label: "Enhancement" },
    { value: "WAITING_REQUIREMENT", label: "Waiting Requirement" },
    { value: "PC_TASK", label: "PC Task" },
    { value: "QA_TESTING", label: "QA Testing" },
];

const STATUSES = [
    { value: "NOT_STARTED", label: "Not Started" },
    { value: "UNDER_MAINTENANCE", label: "Under Maintenance" },
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
    bot_id: "",
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

/* Which Kanban bucket a given status belongs to. Five buckets keeps the
   overview readable; Under Maintenance gets high visibility. */
const BUCKET_OF_STATUS = {
    NOT_STARTED: "TODO",
    UNDER_MAINTENANCE: "MAINTENANCE",
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
    { key: "MAINTENANCE", label: "Under Maintenance", icon: CircleAlert, tone: "warning" },
    { key: "PROGRESS", label: "In Progress", icon: Clock3, tone: "info" },
    { key: "WAITING", label: "Waiting", icon: CircleAlert, tone: "warning" },
    { key: "COMPLETED", label: "Completed", icon: CheckCircle2, tone: "success" },
];

const TABS = [
    { key: "TODAY", label: "Today" },
    { key: "ALL", label: "All Tasks" },
    { key: "MAINTENANCE", label: "Under Maintenance" },
    { key: "TODO", label: "To Do" },
    { key: "PROGRESS", label: "In Progress" },
    { key: "WAITING", label: "Waiting" },
    { key: "COMPLETED", label: "Completed" },
    { key: "OVERDUE", label: "Overdue" },
];

const PAGE_SIZE = 9;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function todayISO() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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

function formatUserDisplayName(user) {
    if (!user) return "";
    const explicit = String(user.display_name || user.full_name || user.name || "").trim();
    if (explicit) return explicit;
    const email = String(user.email || "").trim();
    if (!email) return user.user_id ? `User ${user.user_id}` : "";
    const local = email.split("@")[0] || email;
    const parts = local
        .split(/[._-]+/)
        .filter(Boolean);
    if (!parts.length) return email;
    return parts
        .map((part) => (part.length <= 2 ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1)))
        .join(" ");
}

function resolveAssignedName(item, usersById, fallback = "Unassigned") {
    const explicit = String(item?.assigned_user_name || "").trim();
    if (explicit) return explicit;
    if (item?.assigned_user_id && usersById?.[Number(item.assigned_user_id)]) {
        return usersById[Number(item.assigned_user_id)];
    }
    return fallback;
}

function initialsOf(name) {
    if (!name) return "??";
    return String(name)
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

    // recent_completed may arrive grouped ([{ items: [...] }]) or flat ([item, ...])
    (report.recent_completed || []).forEach((entry) => {
        if (!entry) return;
        if (Array.isArray(entry.items)) addAll(entry.items);
        else if (entry.action_item_id != null) addAll([entry]);
    });

    // Some backends return completed items under a different key
    addAll(report.completed_tasks);
    addAll(report.completed);

    return Array.from(map.values());
}
/* ------------------------------------------------------------------ */
/* Small presentational pieces                                        */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }) {
    const isMaintenance = status === "UNDER_MAINTENANCE";
    const tone =
        status === "COMPLETED"
            ? "success"
            : isMaintenance || ["BLOCKED", "WAITING_CLIENT", "WAITING_REQUIREMENT"].includes(status)
                ? "warning"
                : ["READY_FOR_QA", "QA_TESTING"].includes(status)
                    ? "info"
                    : status === "ON_HOLD"
                        ? "muted"
                        : "accent";

    return (
        <span className={`hb-ai-badge ${tone}`}>
            {status === "COMPLETED" && <CheckCircle2 size={11} />}
            {isMaintenance && <CircleAlert size={11} />}
            {!isMaintenance && ["BLOCKED", "WAITING_CLIENT", "WAITING_REQUIREMENT"].includes(status) && <CircleAlert size={11} />}
            {["READY_FOR_QA", "QA_TESTING"].includes(status) && <Clock3 size={11} />}
            {status === "IN_PROGRESS" && <Clock3 size={11} />}
            {humanize(status)}
        </span>
    );
}

function CategoryBadge({ category }) {
    if (!category) return null;
    const isIssue = category === "ISSUE";
    const isEnhancement = category === "ENHANCEMENT";
    const tone = isIssue ? "warning" : isEnhancement ? "info" : "muted";

    return (
        <span className={`hb-ai-badge ${tone}`} style={{ fontSize: 9.5 }}>
            {humanize(category)}
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

function OverviewCard({ icon: Icon, tone, label, value, active = false, onClick }) {
    return (
        <button
            type="button"
            className={`hb-ai-overview-card ${tone}${active ? " active" : ""}${onClick ? " clickable" : ""}`}
            onClick={onClick}
        >
            <div className="hb-ai-overview-icon">
                <Icon size={18} />
            </div>
            <div style={{ textAlign: "left" }}>
                <strong>{value}</strong>
                <span>{label}</span>
            </div>
        </button>
    );
}

function ActionItemCard({
    item,
    clientsById,
    usersById,
    clientMode,
    todayStr,
    onEdit,
    onDelete,
    onViewDetails,
}) {
    const clientName = item.client_name || (item.client_id && clientsById[item.client_id] ? clientsById[item.client_id] : "Internal");
    const assignedName = resolveAssignedName(item, usersById, "Unassigned");
    const overdue = isOverdue(item, todayStr);
    const dueLabel = formatDate(item.due_date || item.task_date);
    const priorityKey = String(item.priority || "medium").toLowerCase();
    const isMaintenance = item.status === "UNDER_MAINTENANCE";

    return (
        <article
            className={`hb-ai-task-card priority-${priorityKey}${isMaintenance ? " maintenance" : ""}`}
            onClick={() => onViewDetails?.(item)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onViewDetails?.(item);
                }
            }}
        >
            <div className="hb-ai-task-card-head">
                <div className="hb-ai-task-card-badges">
                    <TicketKeyBadge ticketKey={item.ticket_key} />
                    <StatusBadge status={item.status} />
                    {overdue && (
                        <span className="hb-ai-badge danger" style={{ fontSize: 10 }}>
                            Overdue
                        </span>
                    )}
                </div>
                <PriorityBadge priority={item.priority} />
            </div>

            <div className="hb-ai-task-card-body">
                <h3 className="hb-ai-task-card-title" title={item.task_title}>
                    {item.task_title}
                </h3>
                {item.description ? (
                    <p className="hb-ai-task-card-desc" title={item.description}>
                        {item.description}
                    </p>
                ) : (
                    <p className="hb-ai-task-card-desc empty">No description provided.</p>
                )}
            </div>

            <div className="hb-ai-task-card-chips">
                <span className="hb-ai-card-chip">
                    <Building2 size={12} />
                    <span>{clientName}</span>
                </span>
                {item.bot_name && (
                    <span className="hb-ai-card-chip bot">
                        <Bot size={12} />
                        <span>{item.bot_name}</span>
                    </span>
                )}
                {item.category && <CategoryBadge category={item.category} />}
                <AttachmentCountBadge count={item.attachments?.length || 0} />
            </div>

            <div className="hb-ai-task-card-footer">
                <div className="hb-ai-task-card-assignee" title={assignedName}>
                    <Avatar label={assignedName} />
                    <span>{assignedName}</span>
                </div>

                <div className="hb-ai-task-card-right">
                    <span className={`hb-ai-task-card-date${overdue ? " overdue" : ""}`}>
                        <CalendarDays size={12} />
                        {dueLabel}
                    </span>

                    <div className="hb-ai-task-card-actions" onClick={(e) => e.stopPropagation()}>
                        {onEdit && (
                            <button
                                type="button"
                                className="hb-ai-icon-btn"
                                title="Edit"
                                onClick={() => onEdit(item)}
                            >
                                <Pencil size={13} />
                            </button>
                        )}
                        {!clientMode && onDelete && (
                            <button
                                type="button"
                                className="hb-ai-icon-btn danger"
                                title="Delete"
                                onClick={() => onDelete(item)}
                            >
                                <Trash2 size={13} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </article>
    );
}

function KanbanCard({ item, clientsById, usersById, onViewDetails }) {
    const clientName = item.client_name || (item.client_id && clientsById[item.client_id] ? clientsById[item.client_id] : "Internal");
    const assignedName = resolveAssignedName(item, usersById, null);

    return (
        <div
            className="hb-ai-kanban-card"
            onClick={() => onViewDetails?.(item)}
            style={onViewDetails ? { cursor: "pointer" } : undefined}
        >
            <div className="hb-ai-kanban-card-top">
                <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                    {item.ticket_key && (
                        <div>
                            <TicketKeyBadge ticketKey={item.ticket_key} />
                        </div>
                    )}
                    <strong>{item.task_title}</strong>
                </div>
                {assignedName && <Avatar label={assignedName} />}
            </div>
            {item.bot_name && (
                <div style={{ fontSize: 11, color: "var(--text-secondary, #64748b)", margin: "3px 0 6px", display: "flex", alignItems: "center", gap: 4 }}>
                    <span>🤖</span> <span style={{ fontWeight: 500 }}>{item.bot_name}</span>
                </div>
            )}
            <div className="hb-ai-kanban-card-meta">
                <span className="hb-ai-kanban-client">
                    <Building2 size={11} /> {clientName}
                </span>
                <span className="hb-ai-kanban-date">
                    <CalendarDays size={11} /> {formatDate(item.due_date || item.task_date)}
                </span>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
                <CategoryBadge category={item.category} />
                <PriorityBadge priority={item.priority} />
                <AttachmentCountBadge count={item.attachments?.length || 0} />
            </div>
        </div>
    );
}

function KanbanColumn({ bucket, items, clientsById, usersById, onViewAll, onViewDetails }) {
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
                        <KanbanCard
                            key={item.action_item_id}
                            item={item}
                            clientsById={clientsById}
                            usersById={usersById}
                            onViewDetails={onViewDetails}
                        />
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
    clientMode,
    onEdit,
    onDelete,
    onViewDetails,
}) {
    const clientName = item.client_name || (item.client_id && clientsById[item.client_id] ? clientsById[item.client_id] : "Internal");
    const assignedName = resolveAssignedName(item, usersById, "Unassigned");

    return (
        <tr
            className="hb-ai-row hb-ai-row-clickable"
            onClick={() => onViewDetails?.(item)}
        >
            <td className="hb-ai-cell-check" onClick={(event) => event.stopPropagation()}>
                <input type="checkbox" aria-label={`Select ${item.task_title}`} />
            </td>
            <td className="hb-ai-cell-index">{index}</td>
            <td className="hb-ai-cell-task">
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <TicketKeyBadge ticketKey={item.ticket_key} />
                    <strong title={item.task_title}>{item.task_title}</strong>
                    <CategoryBadge category={item.category} />
                    <AttachmentCountBadge count={item.attachments?.length || 0} />
                </div>
                {item.bot_name && (
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        🤖 {item.bot_name}
                    </div>
                )}
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
            <td className="hb-ai-cell-muted hb-ai-mono">{formatDate(item.due_date || item.task_date)}</td>
            <td><StatusBadge status={item.status} /></td>
            <td><PriorityBadge priority={item.priority} /></td>
            <td className="hb-ai-cell-actions">
                {onEdit && (
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
                )}
                {!clientMode && onDelete && (
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
                )}
            </td>
        </tr>
    );
}

/* ------------------------------------------------------------------ */
/* Modal — create / edit                                              */
/* ------------------------------------------------------------------ */

function ActionItemModal({
    open,
    form,
    setForm,
    editingItem,
    clients,
    users,
    bots = [],
    clientMode = false,
    saving,
    pendingFiles = [],
    onAddFiles,
    onRemovePendingFile,
    onDeleteExistingAttachment,
    deletingAttachmentId = null,
    fileError = "",
    onClose,
    onSubmit,
}) {
    if (!open) return null;

    const update = (field, value) => {
        setForm((prev) => {
            const next = { ...prev, [field]: value };
            if (field === "bot_id" && value && !prev.client_id) {
                const matched = bots.find((b) => String(b.bot_id) === String(value));
                if (matched?.client_id) {
                    next.client_id = String(matched.client_id);
                }
            }
            return next;
        });
    };

    const categoriesToDisplay = clientMode
        ? [
            { value: "ISSUE", label: "Issue / Bug" },
            { value: "ENHANCEMENT", label: "Enhancement" },
          ]
        : CATEGORIES;

    const filteredBots = form.client_id
        ? bots.filter((b) => String(b.client_id) === String(form.client_id))
        : bots;

    return (
        <div className="hb-action-modal-backdrop" onMouseDown={onClose}>
            <div className="hb-action-modal" onMouseDown={(event) => event.stopPropagation()}>
                <div className="hb-action-modal-header">
                    <div>
                        <div className="hb-eyebrow" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span>{clientMode ? "SUPPORT & TICKETING" : "WORKSPACE"}</span>
                            {editingItem?.ticket_key && <TicketKeyBadge ticketKey={editingItem.ticket_key} />}
                        </div>
                        <h2>
                            {clientMode
                                ? editingItem
                                    ? "Edit Ticket"
                                    : "Raise Ticket / Request"
                                : editingItem
                                    ? "Edit Action Item"
                                    : "New Action Item"}
                        </h2>
                        <p>
                            {clientMode
                                ? "Report an issue or request an enhancement for your bots."
                                : "Create and manage operational work for the team."}
                        </p>
                    </div>
                    <button type="button" className="hb-action-modal-close" onClick={onClose}>
                        <X size={17} />
                    </button>
                </div>

                <form onSubmit={onSubmit}>
                    <div className="hb-action-modal-body">
                        <div className="hb-action-form-grid full">
                            <label className="hb-action-field">
                                <span>{clientMode ? "Ticket Title *" : "Action Item *"}</span>
                                <input
                                    value={form.task_title}
                                    onChange={(e) => update("task_title", e.target.value)}
                                    placeholder={clientMode ? "Brief summary of the issue or enhancement" : "Enter action item"}
                                    required
                                    maxLength={255}
                                />
                            </label>

                            <label className="hb-action-field">
                                <span>Description</span>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => update("description", e.target.value)}
                                    placeholder={clientMode ? "Detailed description of what is happening or requested..." : "Add additional details..."}
                                    rows={3}
                                />
                            </label>
                        </div>

                        <div className="hb-action-form-grid">
                            <label className="hb-action-field">
                                <span>Category</span>
                                <div className="hb-action-select-wrap">
                                    <select value={form.category} onChange={(e) => update("category", e.target.value)}>
                                        {categoriesToDisplay.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} />
                                </div>
                            </label>

                            <label className="hb-action-field">
                                <span>Affected Bot (Optional)</span>
                                <div className="hb-action-select-wrap">
                                    <select value={form.bot_id} onChange={(e) => update("bot_id", e.target.value)}>
                                        <option value="">No Specific Bot / General</option>
                                        {filteredBots.map((bot) => (
                                            <option key={bot.bot_id} value={bot.bot_id}>
                                                {bot.bot_name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} />
                                </div>
                            </label>

                            {!clientMode && (
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
                            )}

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

                            {!clientMode && (
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
                            )}

                            {!clientMode && (
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
                                                        {formatUserDisplayName(user)}
                                                    </option>
                                                ))}
                                        </select>
                                        <ChevronDown size={14} />
                                    </div>
                                </label>
                            )}

                            {!clientMode && (
                                <label className="hb-action-field">
                                    <span>Task Date</span>
                                    <input type="date" value={form.task_date} onChange={(e) => update("task_date", e.target.value)} required />
                                </label>
                            )}

                            <label className="hb-action-field">
                                <span>{clientMode ? "Desired Due Date" : "Due Date"}</span>
                                <input type="date" value={form.due_date} onChange={(e) => update("due_date", e.target.value)} />
                            </label>

                            {!clientMode && (
                                <label className="hb-action-field">
                                    <span>Next Follow-up</span>
                                    <input type="date" value={form.next_follow_up_date} onChange={(e) => update("next_follow_up_date", e.target.value)} />
                                </label>
                            )}
                        </div>

                        {!clientMode && (
                            <label className="hb-action-field">
                                <span>Remarks</span>
                                <textarea
                                    value={form.remarks}
                                    onChange={(e) => update("remarks", e.target.value)}
                                    placeholder="Add notes or follow-up remarks..."
                                    rows={3}
                                />
                            </label>
                        )}

                        <div className="hb-action-field" style={{ marginTop: 14 }}>
                            <span>Attachments (Photo or PDF, max 10 MB each)</span>
                            <label className="hb-ai-att-dropzone">
                                <input
                                    type="file"
                                    accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,image/png,image/jpeg,image/webp,image/gif,application/pdf"
                                    multiple
                                    style={{ display: "none" }}
                                    onChange={(e) => {
                                        if (e.target.files?.length) {
                                            onAddFiles?.(Array.from(e.target.files));
                                        }
                                        e.target.value = "";
                                    }}
                                />
                                <Upload size={15} />
                                <span>Click to attach screenshots, photos, or PDF files</span>
                            </label>
                            {fileError && (
                                <div className="hb-action-alert danger" style={{ marginTop: 8, marginBottom: 0 }}>
                                    <CircleAlert size={14} />
                                    <span>{fileError}</span>
                                </div>
                            )}
                            {((editingItem?.attachments?.length || 0) > 0 || pendingFiles.length > 0) && (
                                <div className="hb-ai-att-list">
                                    {(editingItem?.attachments || []).map((att) => (
                                        <div key={`existing-${att.attachment_id}`} className="hb-ai-att-chip">
                                            <span className="hb-ai-att-icon">
                                                {isImageAttachment(att) ? <ImageIcon size={16} /> : <FileText size={16} />}
                                            </span>
                                            <div className="hb-ai-att-meta">
                                                <strong title={att.filename}>{att.filename}</strong>
                                                <span>{formatBytes(att.size_bytes)} · Saved</span>
                                            </div>
                                            {onDeleteExistingAttachment && (
                                                <button
                                                    type="button"
                                                    className="hb-ai-att-del"
                                                    disabled={deletingAttachmentId === att.attachment_id}
                                                    onClick={() => onDeleteExistingAttachment(editingItem.action_item_id, att)}
                                                    title="Remove attachment"
                                                >
                                                    {deletingAttachmentId === att.attachment_id ? (
                                                        <Loader2 size={13} className="hb-action-spin" />
                                                    ) : (
                                                        <Trash2 size={13} />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {pendingFiles.map((file, idx) => (
                                        <QueuedFileThumb
                                            key={`${file.name}-${file.size}-${file.lastModified}-${idx}`}
                                            file={file}
                                            onRemove={() => onRemovePendingFile?.(idx)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
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
                                    <CheckCircle2 size={14} />
                                    {clientMode
                                        ? editingItem
                                            ? "Save Ticket"
                                            : "Raise Ticket"
                                        : editingItem
                                            ? "Save Changes"
                                            : "Create Action Item"}
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
    api,
    item,
    clientName,
    assignedName,
    onAttachmentsUpdated,
    onClose,
    onEdit,
    readOnly = false,
    clientMode = false,
}) {
    const [copied, setCopied] = useState(false);
    const [attError, setAttError] = useState("");
    const [uploadingAtt, setUploadingAtt] = useState(false);
    const [busyAttId, setBusyAttId] = useState(null);
    const [previewData, setPreviewData] = useState(null);

    const closePreview = () => {
        setPreviewData((prev) => {
            if (prev?.url) URL.revokeObjectURL(prev.url);
            return null;
        });
    };

    useEffect(() => {
        setCopied(false);
        setAttError("");
        closePreview();
    }, [item?.action_item_id, item?.ticket_key]);

    useEffect(() => () => {
        setPreviewData((prev) => {
            if (prev?.url) URL.revokeObjectURL(prev.url);
            return null;
        });
    }, []);

    if (!item) return null;

    const handleViewAttachment = async (att) => {
        const isImg = isImageAttachment(att);
        const isPdf = isPdfAttachment(att);
        if (!isImg && !isPdf) {
            setAttError("Inline preview is restricted to images and PDF files. Please download the file instead.");
            return;
        }
        setAttError("");
        setBusyAttId(att.attachment_id);
        try {
            const blob = await api(`/action-items/${item.action_item_id}/attachments/${att.attachment_id}`, {
                responseType: "blob",
            });
            if (!blob) throw new Error("Unable to load attachment.");
            let safeBlob = blob;
            if (isPdf) {
                const headerBytes = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
                const signature = String.fromCharCode(...headerBytes);
                if (!signature.startsWith("%PDF-")) {
                    throw new Error("Invalid PDF file content.");
                }
                safeBlob = new Blob([blob], { type: "application/pdf" });
            }
            const url = URL.createObjectURL(safeBlob);
            setPreviewData((prev) => {
                if (prev?.url) URL.revokeObjectURL(prev.url);
                return { attachment: att, url };
            });
        } catch (err) {
            setAttError(err.message || "Failed to load attachment preview.");
        } finally {
            setBusyAttId(null);
        }
    };

    const handleDownloadAttachment = async (att) => {
        setAttError("");
        setBusyAttId(att.attachment_id);
        try {
            const blob = await api(
                `/action-items/${item.action_item_id}/attachments/${att.attachment_id}?download=true`,
                { responseType: "blob" }
            );
            if (!blob) throw new Error("Unable to download attachment.");
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = att.filename || "attachment";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (err) {
            setAttError(err.message || "Failed to download attachment.");
        } finally {
            setBusyAttId(null);
        }
    };

    const handleUploadMore = async (fileList) => {
        const files = Array.from(fileList || []);
        if (!files.length) return;
        for (const f of files) {
            const errMsg = validateAttachmentFile(f);
            if (errMsg) {
                setAttError(errMsg);
                return;
            }
        }
        setAttError("");
        setUploadingAtt(true);
        try {
            const fd = new FormData();
            files.forEach((f) => fd.append("files", f));
            await api(`/action-items/${item.action_item_id}/attachments`, {
                method: "POST",
                body: fd,
            });
            await onAttachmentsUpdated?.(item.action_item_id);
        } catch (err) {
            setAttError(err.message || "Failed to upload attachment.");
        } finally {
            setUploadingAtt(false);
        }
    };

    const handleDeleteAtt = async (att) => {
        if (!window.confirm(`Remove attachment "${att.filename}"?`)) return;
        setAttError("");
        setBusyAttId(att.attachment_id);
        try {
            await api(`/action-items/${item.action_item_id}/attachments/${att.attachment_id}`, {
                method: "DELETE",
            });
            await onAttachmentsUpdated?.(item.action_item_id);
        } catch (err) {
            setAttError(err.message || "Failed to remove attachment.");
        } finally {
            setBusyAttId(null);
        }
    };

    const attachments = item.attachments || [];

    const ticketUrl = item.ticket_key
        ? `${window.location.origin}/tickets/${item.ticket_key}`
        : null;

    const handleCopyLink = async () => {
        if (!ticketUrl) return;
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(ticketUrl);
            } else {
                const el = document.createElement("textarea");
                el.value = ticketUrl;
                el.setAttribute("readonly", "");
                el.style.position = "absolute";
                el.style.left = "-9999px";
                document.body.appendChild(el);
                el.select();
                document.execCommand("copy");
                document.body.removeChild(el);
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (_) {
            // ignore clipboard failure
        }
    };

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
                        <div className="hb-eyebrow" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span>{item.status === "COMPLETED" ? "COMPLETED TASK" : "ACTION ITEM"}</span>
                            <TicketKeyBadge ticketKey={item.ticket_key} />
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
                    {ticketUrl && (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 10,
                                padding: "8px 12px",
                                borderRadius: 8,
                                background: "var(--surface-2, rgba(148, 163, 184, 0.08))",
                                border: "1px solid var(--border, rgba(148, 163, 184, 0.2))",
                                marginBottom: 14,
                                flexWrap: "wrap",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                                <Link2 size={14} style={{ color: "var(--accent, #f97316)", flexShrink: 0 }} />
                                <span
                                    style={{
                                        fontFamily: "var(--font-mono)",
                                        fontSize: 12,
                                        color: "var(--text-muted, #94a3b8)",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                    title={ticketUrl}
                                >
                                    {ticketUrl}
                                </span>
                            </div>
                            <button
                                type="button"
                                className="hb-action-secondary-btn"
                                onClick={handleCopyLink}
                                style={{ padding: "5px 10px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}
                            >
                                {copied ? <Check size={13} /> : <Copy size={13} />}
                                {copied ? "Copied!" : "Copy Link"}
                            </button>
                        </div>
                    )}
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

                    {clientMode && (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                marginBottom: 14,
                                padding: "10px 12px",
                                borderRadius: 8,
                                background: "var(--surface-2, rgba(148, 163, 184, 0.08))",
                                border: "1px solid var(--border, rgba(148, 163, 184, 0.2))",
                                fontSize: 12,
                                flexWrap: "wrap",
                            }}
                        >
                            <span style={{ fontWeight: 600, color: "var(--text-dim)" }}>Request Progress:</span>
                            {[
                                { label: "1. Submitted", done: true },
                                {
                                    label: "2. In Review / Work",
                                    done: item.status !== "NOT_STARTED",
                                },
                                { label: "3. Completed", done: item.status === "COMPLETED" },
                            ].map((step) => (
                                <span
                                    key={step.label}
                                    style={{
                                        padding: "3px 8px",
                                        borderRadius: 999,
                                        fontWeight: 600,
                                        background: step.done ? "rgba(34, 197, 94, 0.14)" : "transparent",
                                        color: step.done ? "var(--success, #22c55e)" : "var(--text-dim)",
                                        border: `1px solid ${step.done ? "rgba(34, 197, 94, 0.35)" : "var(--border, rgba(148,163,184,0.25))"}`,
                                    }}
                                >
                                    {step.label}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="hb-action-form-grid">
                        <div className="hb-action-field">
                            <span>Category</span>
                            <div className="hb-ai-detail-value">
                                {humanize(item.category)}
                            </div>
                        </div>

                        {item.bot_name && (
                            <div className="hb-action-field">
                                <span>Affected Bot</span>
                                <div className="hb-ai-detail-value">
                                    🤖 {item.bot_name}
                                </div>
                            </div>
                        )}

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
                            <span>{clientMode ? "Assigned Administrator" : "Assigned To"}</span>
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
                            <span>Created At</span>
                            <div className="hb-ai-detail-value">
                                {item.created_at
                                    ? new Date(item.created_at).toLocaleString()
                                    : "—"}
                            </div>
                        </div>

                        <div className="hb-action-field">
                            <span>Last Updated</span>
                            <div className="hb-ai-detail-value">
                                {item.updated_at
                                    ? new Date(item.updated_at).toLocaleString()
                                    : "—"}
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
                        <span>{clientMode ? "Administrator Updates & Comments" : "Remarks"}</span>

                        <div className="hb-ai-detail-value multiline">
                            {item.remarks || (clientMode ? "No administrator updates yet." : "No remarks added.")}
                        </div>
                    </div>

                    <div className="hb-action-field" style={{ marginTop: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                            <span>Attachments ({attachments.length})</span>
                            {!readOnly && (
                                <label className="hb-action-secondary-btn" style={{ padding: "5px 10px", fontSize: 11.5, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>
                                    <input
                                        type="file"
                                        accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,image/png,image/jpeg,image/webp,image/gif,application/pdf"
                                        multiple
                                        style={{ display: "none" }}
                                        disabled={uploadingAtt}
                                        onChange={(e) => {
                                            if (e.target.files?.length) handleUploadMore(e.target.files);
                                            e.target.value = "";
                                        }}
                                    />
                                    {uploadingAtt ? <Loader2 size={12} className="hb-action-spin" /> : <Upload size={12} />}
                                    {uploadingAtt ? "Uploading..." : "Attach Photo / PDF"}
                                </label>
                            )}
                        </div>

                        {attError && (
                            <div className="hb-action-alert danger" style={{ marginTop: 8, marginBottom: 0 }}>
                                <CircleAlert size={14} />
                                <span>{attError}</span>
                            </div>
                        )}

                        {attachments.length === 0 ? (
                            <div className="hb-ai-detail-value" style={{ marginTop: 6, color: "var(--text-dim)" }}>
                                No photos or PDF attachments uploaded yet.
                            </div>
                        ) : (
                            <div className="hb-ai-att-list" style={{ marginTop: 8 }}>
                                {attachments.map((att) => (
                                    <div key={att.attachment_id} className="hb-ai-att-card">
                                        <div
                                            className="hb-ai-att-card-main"
                                            onClick={() => handleViewAttachment(att)}
                                            title="Click to preview"
                                        >
                                            <span className="hb-ai-att-icon">
                                                {isImageAttachment(att) ? <ImageIcon size={16} /> : <FileText size={16} />}
                                            </span>
                                            <div className="hb-ai-att-meta">
                                                <strong title={att.filename}>{att.filename}</strong>
                                                <span>{formatBytes(att.size_bytes)} · {isImageAttachment(att) ? "Image" : "PDF"}</span>
                                            </div>
                                        </div>
                                        <div className="hb-ai-att-actions">
                                            <button
                                                type="button"
                                                className="hb-ai-icon-btn"
                                                title="Preview"
                                                disabled={busyAttId === att.attachment_id}
                                                onClick={() => handleViewAttachment(att)}
                                            >
                                                {busyAttId === att.attachment_id ? <Loader2 size={13} className="hb-action-spin" /> : <Eye size={13} />}
                                            </button>
                                            <button
                                                type="button"
                                                className="hb-ai-icon-btn"
                                                title="Download"
                                                disabled={busyAttId === att.attachment_id}
                                                onClick={() => handleDownloadAttachment(att)}
                                            >
                                                <Download size={13} />
                                            </button>
                                            {!readOnly && (
                                                <button
                                                    type="button"
                                                    className="hb-ai-icon-btn danger"
                                                    title="Remove attachment"
                                                    disabled={busyAttId === att.attachment_id}
                                                    onClick={() => handleDeleteAtt(att)}
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {previewData && (
                    <div className="hb-ai-preview-backdrop" onMouseDown={closePreview}>
                        <div className="hb-ai-preview-dialog" onMouseDown={(e) => e.stopPropagation()}>
                            <div className="hb-ai-preview-head">
                                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                                    {isImageAttachment(previewData.attachment) ? <ImageIcon size={16} /> : <FileText size={16} />}
                                    <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {previewData.attachment.filename}
                                    </strong>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <a
                                        href={previewData.url}
                                        download={previewData.attachment.filename}
                                        className="hb-action-secondary-btn"
                                        style={{ padding: "5px 10px", fontSize: 12, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}
                                    >
                                        <Download size={13} /> Download
                                    </a>
                                    <button type="button" className="hb-action-modal-close" onClick={closePreview}>
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                            <div className="hb-ai-preview-body">
                                {isImageAttachment(previewData.attachment) && isSafeBlobUrl(previewData.url) ? (
                                    <img src={previewData.url} alt={previewData.attachment.filename} className="hb-ai-preview-img" />
                                ) : isPdfAttachment(previewData.attachment) && isSafeBlobUrl(previewData.url) ? (
                                    <iframe
                                        src={previewData.url}
                                        title={previewData.attachment.filename}
                                        className="hb-ai-preview-pdf"
                                        sandbox="allow-same-origin allow-downloads"
                                        referrerPolicy="no-referrer"
                                    />
                                ) : (
                                    <div className="hb-ai-empty">
                                        <strong>Preview unavailable</strong>
                                        <span>Use the Download button above to open this file locally.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="hb-action-modal-footer">
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", width: "100%", justifyContent: "flex-end" }}>
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

export default function ActionItems({ api, targetActionItem, onClearTargetActionItem, clientMode = false, clientId = null, liveEvents = [], readOnly = false }) {
    const canWrite = !readOnly;
    const canDelete = !readOnly && !clientMode;
    const [reportDate, setReportDate] = useState(todayISO());
    const [report, setReport] = useState(null);
    const [clients, setClients] = useState([]);
    const [users, setUsers] = useState([]);
    const [bots, setBots] = useState([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [detailsItem, setDetailsItem] = useState(null);
    const [pendingFiles, setPendingFiles] = useState([]);
    const [fileError, setFileError] = useState("");
    const [deletingAttachmentId, setDeletingAttachmentId] = useState(null);

    const [activeTab, setActiveTab] = useState(clientMode ? "ALL" : "TODAY");
    const [viewMode, setViewMode] = useState("CARDS");
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
        users.forEach((user) => { map[Number(user.user_id)] = formatUserDisplayName(user) || `User ${user.user_id}`; });
        return map;
    }, [users]);

    const loadReport = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError("");
        try {
            if (clientMode) {
                const response = await api("/action-items/");
                const items = getResponseData(response);
                setReport({
                    today_tasks: Array.isArray(items) ? items : [],
                    waiting_requirements: [],
                    pc_tasks: [],
                    qa_testing: [],
                    completed_tasks: [],
                });
            } else {
                const response = await api(`/action-items/daily-report?report_date=${encodeURIComponent(reportDate)}`);
                setReport(getReport(response));
            }
        } catch (err) {
            setError(err.message || "Failed to load action items.");
        } finally {
            if (!silent) setLoading(false);
        }
    }, [api, reportDate, clientMode]);

    const loadOptions = useCallback(async () => {
        if (!clientMode) {
            try {
                const clientsResponse = await api("/clients/");
                const clientData = getResponseData(clientsResponse);
                setClients(Array.isArray(clientData)
                    ? clientData.sort((a, b) => String(a.client_name || "").trim().localeCompare(String(b.client_name || "").trim(), undefined, { sensitivity: "base" }))
                    : []);
            } catch (err) {
                console.warn("Action item client loading failed:", err);
            }

            try {
                const usersResponse = await api("/auth/users/assignees");
                const userData = getResponseData(usersResponse);
                setUsers(Array.isArray(userData) ? userData : []);
            } catch (err) {
                console.warn("Action item user loading failed:", err);
            }
        }

        try {
            const botsResponse = await api("/bots/");
            const botData = getResponseData(botsResponse);
            setBots(Array.isArray(botData)
                ? botData.sort((a, b) => String(a.bot_name || "").trim().localeCompare(String(b.bot_name || "").trim(), undefined, { sensitivity: "base" }))
                : []);
        } catch (err) {
            console.warn("Action item bot loading failed:", err);
        }
    }, [api, clientMode]);

    useEffect(() => { loadOptions(); }, [loadOptions]);

    // Load report on mount and silently poll every 30s to keep assigned tasks fresh
    useEffect(() => {
        loadReport();
        const interval = setInterval(() => {
            loadReport(true);
        }, 30000);
        return () => clearInterval(interval);
    }, [loadReport]);

    const latestEventKey = liveEvents?.[0]?._eventSeq ?? liveEvents?.[0]?._receivedAt ?? 0;

    useEffect(() => {
        if (!liveEvents?.length) return;
        const latest = liveEvents[0];
        const ev = latest?.event;
        if (ev === "action_item_updated" || ev === "new_notification") {
            loadReport(true);
        }
    }, [latestEventKey, liveEvents, loadReport]);

    // When navigated via "View Action Item" from notifications or direct /tickets/<KEY> URL
    useEffect(() => {
        if (!targetActionItem?.id && !targetActionItem?.ticketKey) return;

        let cancelled = false;

        const handleTarget = async () => {
            try {
                const endpoint = targetActionItem.ticketKey
                    ? `/action-items/by-key/${encodeURIComponent(targetActionItem.ticketKey)}`
                    : `/action-items/${targetActionItem.id}`;
                const response = await api(endpoint);
                const item = response?.data ?? response;

                if (cancelled || !item) return;

                setDetailsItem(item);
                if (item.ticket_key && window.location.pathname !== `/tickets/${item.ticket_key}`) {
                    window.history.replaceState(null, "", `/tickets/${item.ticket_key}`);
                }

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
                setError(err.message || "Ticket not found or access denied.");
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
        const counts = { TODO: 0, MAINTENANCE: 0, PROGRESS: 0, WAITING: 0, COMPLETED: 0 };
        allItems.forEach((item) => {
            const b = bucketOf(item.status);
            if (counts[b] !== undefined) counts[b] += 1;
            else counts[b] = 1;
        });
        return counts;
    }, [allItems]);

    const itemsByBucket = useMemo(() => {
        const grouped = { TODO: [], MAINTENANCE: [], PROGRESS: [], WAITING: [], COMPLETED: [] };
        allItems.forEach((item) => {
            const b = bucketOf(item.status);
            if (!grouped[b]) grouped[b] = [];
            grouped[b].push(item);
        });
        return grouped;
    }, [allItems]);

    const overdueCount = useMemo(() => allItems.filter((i) => isOverdue(i, todayStr)).length, [allItems, todayStr]);
    const todayCount = useMemo(() => allItems.filter((i) => isDueToday(i, todayStr)).length, [allItems, todayStr]);

    const filteredItems = useMemo(() => {
        let list = allItems;
        const q = search.trim().toLowerCase();

        if (activeTab === "OVERDUE") list = list.filter((i) => isOverdue(i, todayStr));
        else if (activeTab === "TODAY") {
            // When user enters a search query, search across all items so matching client/bot tickets are found
            if (!q) {
                list = list.filter((i) => isDueToday(i, todayStr));
            }
        }
        else if (activeTab !== "ALL") list = list.filter((i) => bucketOf(i.status) === activeTab);

        if (clientFilter) list = list.filter((i) => String(i.client_id || "") === String(clientFilter));
        if (statusFilter) list = list.filter((i) => i.status === statusFilter);
        if (priorityFilter) list = list.filter((i) => i.priority === priorityFilter);
        if (dateFilter) list = list.filter((i) => i.due_date === dateFilter || i.task_date === dateFilter);

        if (q) {
            list = list.filter((i) => {
                const clientName = i.client_name || (i.client_id && clientsById[i.client_id] ? clientsById[i.client_id] : "");
                const botName = i.bot_name || "";
                const assignedName = resolveAssignedName(i, usersById, "unassigned");
                const categoryLabel = humanize(i.category || "");
                const statusLabel = humanize(i.status || "");
                const haystack = `${i.ticket_key || ""} ${i.task_title || ""} ${i.description || ""} ${clientName} ${botName} ${assignedName} ${categoryLabel} ${statusLabel}`.toLowerCase();
                return haystack.includes(q);
            });
        }

        return [...list].sort((a, b) => new Date(a.due_date || a.task_date || 0) - new Date(b.due_date || b.task_date || 0));
    }, [allItems, activeTab, clientFilter, statusFilter, priorityFilter, dateFilter, search, clientsById, usersById, todayStr]);

    useEffect(() => { setPage(1); }, [activeTab, viewMode, clientFilter, statusFilter, priorityFilter, dateFilter, search]);

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

    const refreshItemAfterAttachments = useCallback(async (actionItemId) => {
        try {
            const response = await api(`/action-items/${actionItemId}`);
            const fresh = response?.data ?? response;
            if (fresh?.action_item_id != null) {
                setDetailsItem((prev) =>
                    prev && prev.action_item_id === actionItemId ? fresh : prev
                );
                setEditingItem((prev) =>
                    prev && prev.action_item_id === actionItemId ? fresh : prev
                );
            }
        } catch (_) {
            // fallback to full report reload
        }
        await loadReport(true);
    }, [api, loadReport]);

    useEffect(() => {
        if (!detailsItem?.action_item_id) return;
        const fresh = allItems.find((i) => i.action_item_id === detailsItem.action_item_id);
        if (!fresh) return;
        const prevAttIds = (detailsItem.attachments || []).map((a) => a.attachment_id).join(",");
        const freshAttIds = (fresh.attachments || []).map((a) => a.attachment_id).join(",");
        if (
            fresh.status !== detailsItem.status ||
            fresh.priority !== detailsItem.priority ||
            fresh.updated_at !== detailsItem.updated_at ||
            prevAttIds !== freshAttIds
        ) {
            setDetailsItem(fresh);
        }
    }, [allItems, detailsItem]);

    const handleAddFiles = (incomingFiles) => {
        const list = Array.from(incomingFiles || []);
        if (!list.length) return;
        for (const file of list) {
            const validationErr = validateAttachmentFile(file);
            if (validationErr) {
                setFileError(validationErr);
                return;
            }
        }
        setFileError("");
        setPendingFiles((prev) => {
            const existingKeys = new Set(
                prev.map((f) => `${f.name}:${f.size}:${f.lastModified}`)
            );
            const next = [...prev];
            for (const f of list) {
                const key = `${f.name}:${f.size}:${f.lastModified}`;
                if (!existingKeys.has(key)) {
                    existingKeys.add(key);
                    next.push(f);
                }
            }
            return next;
        });
    };

    const handleRemovePendingFile = (idx) => {
        setFileError("");
        setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleDeleteExistingAttachment = async (actionItemId, att) => {
        if (!window.confirm(`Remove attachment "${att.filename}"?`)) return;
        setFileError("");
        setDeletingAttachmentId(att.attachment_id);
        try {
            await api(`/action-items/${actionItemId}/attachments/${att.attachment_id}`, {
                method: "DELETE",
            });
            setEditingItem((prev) =>
                prev && prev.action_item_id === actionItemId
                    ? {
                        ...prev,
                        attachments: (prev.attachments || []).filter(
                            (a) => a.attachment_id !== att.attachment_id
                        ),
                      }
                    : prev
            );
            setDetailsItem((prev) =>
                prev && prev.action_item_id === actionItemId
                    ? {
                        ...prev,
                        attachments: (prev.attachments || []).filter(
                            (a) => a.attachment_id !== att.attachment_id
                        ),
                      }
                    : prev
            );
            await loadReport(true);
        } catch (err) {
            setFileError(err.message || "Failed to remove attachment.");
        } finally {
            setDeletingAttachmentId(null);
        }
    };

    const openCreate = () => {
        if (readOnly) return;
        setPendingFiles([]);
        setFileError("");
        setDeletingAttachmentId(null);
        setEditingItem(null);
        setForm({
            ...emptyForm,
            client_id: clientMode && clientId ? String(clientId) : "",
            category: clientMode ? "ISSUE" : "TODAY_TASK",
            task_date: reportDate,
            due_date: reportDate,
        });
        setError(""); setNotice(""); setModalOpen(true);
    };
    const openDetails = (item) => {
        setDetailsItem(item);
        if (item?.ticket_key && window.location.pathname !== `/tickets/${item.ticket_key}`) {
            window.history.replaceState(null, "", `/tickets/${item.ticket_key}`);
        }
    };

    const closeDetails = () => {
        setDetailsItem(null);
        if (window.location.pathname.startsWith("/tickets/")) {
            window.history.replaceState(null, "", "/");
        }
    };
    const openEdit = async (item) => {
        if (readOnly) return;
        try {
            setError("");
            setNotice("");

            const response = await api(
                `/action-items/${item.action_item_id}`
            );

            const fullItem = response?.data ?? response;

            setEditingItem(fullItem);
            setPendingFiles([]);
            setFileError("");
            setDeletingAttachmentId(null);

            setForm({
                client_id: fullItem.client_id ?? "",
                bot_id: fullItem.bot_id ?? "",
                task_title: fullItem.task_title ?? "",
                description: fullItem.description ?? "",
                category: fullItem.category ?? (clientMode ? "ISSUE" : "TODAY_TASK"),
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
        if (!saving) {
            setPendingFiles([]);
            setFileError("");
            setDeletingAttachmentId(null);
        }
        if (saving) return;
        setModalOpen(false); setEditingItem(null); setForm(emptyForm);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!form.task_title.trim()) { setError(clientMode ? "Ticket title is required." : "Action item title is required."); return; }

        setSaving(true); setError(""); setNotice(""); setFileError("");

        const syncPendingAttachments = async (item, wasEditing) => {
            if (!pendingFiles.length || item?.action_item_id == null) return item;
            const fd = new FormData();
            pendingFiles.forEach((f) => fd.append("files", f));
            try {
                await api(`/action-items/${item.action_item_id}/attachments`, {
                    method: "POST",
                    body: fd,
                });
                const refreshed = await api(`/action-items/${item.action_item_id}`);
                return refreshed?.data ?? refreshed ?? item;
            } catch (uploadErr) {
                if (item?.action_item_id != null) {
                    setEditingItem(item);
                    if (!wasEditing) {
                        setReport((prev) => prev
                            ? { ...prev, today_tasks: [item, ...(prev.today_tasks || [])] }
                            : prev);
                    }
                }
                setFileError(
                    uploadErr.message ||
                    "Ticket saved, but attachments failed to upload. Remove or retry below."
                );
                await loadReport(true);
                throw Object.assign(new Error("__ATTACHMENT_UPLOAD_HANDLED__"), {
                    handledAttachmentError: true,
                });
            }
        };

        const payload = clientMode
            ? {
                ...(editingItem ? {} : { client_id: clientId ? Number(clientId) : null }),
                bot_id: form.bot_id ? Number(form.bot_id) : null,
                task_title: form.task_title.trim(),
                description: form.description.trim() || null,
                category: form.category,
                priority: form.priority,
                due_date: form.due_date || null,
            }
            : {
                client_id: form.client_id ? Number(form.client_id) : null,
                bot_id: form.bot_id ? Number(form.bot_id) : null,
                task_title: form.task_title.trim(),
                description: form.description.trim() || null,
                category: form.category,
                status: form.status,
                priority: form.priority,
                assigned_user_id: form.assigned_user_id ? Number(form.assigned_user_id) : null,
                task_date: form.task_date || todayISO(),
                due_date: form.due_date || null,
                next_follow_up_date: form.next_follow_up_date || null,
                remarks: form.remarks.trim() || null,
            };

        try {
            if (editingItem) {
                const updated = await api(`/action-items/${editingItem.action_item_id}`, { method: "PUT", body: JSON.stringify(payload) });
                const updatedItem = await syncPendingAttachments(updated?.data ?? updated ?? editingItem, true);
                setPendingFiles([]);
                setFileError("");
                if (detailsItem?.action_item_id === updatedItem?.action_item_id) {
                    setDetailsItem(updatedItem);
                }
                setNotice(clientMode ? "Ticket updated successfully." : "Action item updated successfully.");
            } else {
                const created = await api("/action-items/", { method: "POST", body: JSON.stringify(payload) });
                const rawCreatedItem = created?.data ?? created;
                const newItem = await syncPendingAttachments(rawCreatedItem, false);
                setPendingFiles([]);
                setFileError("");
                const keyLabel = newItem?.ticket_key ? ` (${newItem.ticket_key})` : "";
                setNotice(clientMode
                    ? `Ticket${keyLabel} raised successfully! Admin team has been notified.`
                    : `Action item${keyLabel} created successfully.`);

                if (newItem?.action_item_id != null) {
                    setReport((prev) => prev
                        ? { ...prev, today_tasks: [newItem, ...(prev.today_tasks || [])] }
                        : prev);
                }
            }
            setModalOpen(false); setEditingItem(null); setForm(emptyForm);
            await loadReport(true);
        } catch (err) {
            if (!err?.handledAttachmentError) {
                setError(err.message || (clientMode ? "Failed to save ticket." : "Failed to save action item."));
            }
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
                    <h1 className="hb-ai-title">{clientMode ? "My Requests & Tickets" : "Action Items"}</h1>
                    <p className="hb-ai-subtitle">
                        {clientMode ? "Raise requests, track status progress, and view administrator updates." : "Track and manage your tasks efficiently."}
                    </p>
                </div>
                {canWrite && (
                    <button type="button" className="hb-action-primary-btn hb-ai-add-btn" onClick={openCreate}>
                        <Plus size={15} /> {clientMode ? "Raise Request" : "Add Action Item"}
                    </button>
                )}
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

            {/* Interactive Overview strip */}
            <div className="hb-ai-overview-grid">
                <OverviewCard
                    icon={CalendarDays}
                    tone="accent"
                    label="Today's Items"
                    value={todayCount}
                    active={activeTab === "TODAY"}
                    onClick={() => goToBucket("TODAY")}
                />
                <OverviewCard
                    icon={ClipboardList}
                    tone="muted"
                    label="All Tasks"
                    value={allItems.length}
                    active={activeTab === "ALL"}
                    onClick={() => goToBucket("ALL")}
                />
                <OverviewCard
                    icon={CircleAlert}
                    tone="warning"
                    label="Maintenance"
                    value={bucketCounts.MAINTENANCE || 0}
                    active={activeTab === "MAINTENANCE"}
                    onClick={() => goToBucket("MAINTENANCE")}
                />
                <OverviewCard
                    icon={Clock3}
                    tone="info"
                    label="In Progress"
                    value={bucketCounts.PROGRESS || 0}
                    active={activeTab === "PROGRESS"}
                    onClick={() => goToBucket("PROGRESS")}
                />
                <OverviewCard
                    icon={CheckCircle2}
                    tone="success"
                    label="Completed"
                    value={bucketCounts.COMPLETED || 0}
                    active={activeTab === "COMPLETED"}
                    onClick={() => goToBucket("COMPLETED")}
                />
            </div>

            {/* Unified Action Items Workspace (Cards default, Board, Table) */}
            <div className="hb-ai-table-panel" ref={tableRef}>
                <div className="hb-ai-toolbar">
                    <div className="hb-ai-toolbar-top">
                        <div className="hb-ai-tabs">
                            {TABS.map((tab) => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    className={`hb-ai-tab${activeTab === tab.key ? " active" : ""}`}
                                    onClick={() => setActiveTab(tab.key)}
                                >
                                    {tab.label}
                                    {tab.key === "TODAY" && <span className="hb-ai-tab-count accent">{todayCount}</span>}
                                    {tab.key === "ALL" && allItems.length > 0 && <span className="hb-ai-tab-count muted">{allItems.length}</span>}
                                    {tab.key === "OVERDUE" && overdueCount > 0 && <span className="hb-ai-tab-count danger">{overdueCount}</span>}
                                </button>
                            ))}
                        </div>

                        <div className="hb-ai-view-switch" role="group" aria-label="View mode">
                            <button
                                type="button"
                                className={`hb-ai-view-btn${viewMode === "CARDS" ? " active" : ""}`}
                                onClick={() => setViewMode("CARDS")}
                                title="Card grid view"
                            >
                                <LayoutGrid size={14} />
                                <span>Cards</span>
                            </button>
                            <button
                                type="button"
                                className={`hb-ai-view-btn${viewMode === "BOARD" ? " active" : ""}`}
                                onClick={() => setViewMode("BOARD")}
                                title="Kanban board view"
                            >
                                <Columns3 size={14} />
                                <span>Board</span>
                            </button>
                            <button
                                type="button"
                                className={`hb-ai-view-btn${viewMode === "TABLE" ? " active" : ""}`}
                                onClick={() => setViewMode("TABLE")}
                                title="Table list view"
                            >
                                <List size={14} />
                                <span>Table</span>
                            </button>
                        </div>
                    </div>

                    <div className="hb-ai-toolbar-right">
                        <div className="hb-ai-search">
                            <Search size={14} />
                            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, client, bot or assignee…" />
                        </div>

                        {!clientMode && (
                            <div className="hb-ai-select-wrap">
                                <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
                                    <option value="">All Clients</option>
                                    {clients.map((c) => (
                                        <option key={c.client_id} value={c.client_id}>{c.client_name}</option>
                                    ))}
                                </select>
                                <ChevronDown size={13} />
                            </div>
                        )}

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

                        <button type="button" className="hb-action-secondary-btn hb-ai-refresh-btn" onClick={() => loadReport()} disabled={loading} title="Refresh">
                            <RefreshCw size={13} className={loading ? "hb-action-spin" : ""} />
                        </button>
                    </div>
                </div>

                {viewMode === "BOARD" ? (
                    <div className="hb-ai-board-wrap">
                        <div className="hb-ai-kanban-grid">
                            {BUCKETS.map((bucket) => (
                                <KanbanColumn
                                    key={bucket.key}
                                    bucket={bucket}
                                    items={itemsByBucket[bucket.key]}
                                    clientsById={clientsById}
                                    usersById={usersById}
                                    onViewAll={(bucketKey) => {
                                        setActiveTab(bucketKey);
                                        setViewMode("CARDS");
                                    }}
                                    onViewDetails={openDetails}
                                />
                            ))}
                        </div>
                    </div>
                ) : viewMode === "CARDS" ? (
                    <div className="hb-ai-cards-wrap">
                        {pageItems.length === 0 ? (
                            <div className="hb-ai-empty">
                                <AlarmClock size={24} />
                                <strong>
                                    {activeTab === "TODAY" && !hasActiveFilters
                                        ? "No action items scheduled for today"
                                        : "No tasks match these filters"}
                                </strong>
                                <span>
                                    {activeTab === "TODAY" && !hasActiveFilters
                                        ? "Switch to All Tasks or create a new item to get started."
                                        : "Try clearing a filter or search term."}
                                </span>
                                {activeTab === "TODAY" && allItems.length > 0 && (
                                    <button
                                        type="button"
                                        className="hb-action-secondary-btn"
                                        style={{ marginTop: 6 }}
                                        onClick={() => setActiveTab("ALL")}
                                    >
                                        View All Tasks ({allItems.length})
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="hb-ai-cards-grid">
                                {pageItems.map((item) => (
                                    <ActionItemCard
                                        key={item.action_item_id}
                                        item={item}
                                        clientsById={clientsById}
                                        usersById={usersById}
                                        clientMode={clientMode}
                                        todayStr={todayStr}
                                        onEdit={canWrite ? openEdit : undefined}
                                        onDelete={canDelete ? handleDelete : undefined}
                                        onViewDetails={openDetails}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
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
                                            clientMode={clientMode}
                                            onEdit={canWrite ? openEdit : undefined}
                                            onDelete={canDelete ? handleDelete : undefined}
                                            onViewDetails={openDetails}
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {viewMode !== "BOARD" && (
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
                )}
            </div>

            <ActionItemModal
                open={modalOpen}
                form={form}
                setForm={setForm}
                editingItem={editingItem}
                clients={clients}
                users={users}
                bots={bots}
                clientMode={clientMode}
                saving={saving}
                pendingFiles={pendingFiles}
                onAddFiles={handleAddFiles}
                onRemovePendingFile={handleRemovePendingFile}
                onDeleteExistingAttachment={handleDeleteExistingAttachment}
                deletingAttachmentId={deletingAttachmentId}
                fileError={fileError}
                onClose={closeModal}
                onSubmit={handleSubmit}
            />

            <ActionItemDetailsModal
                api={api}
                item={detailsItem}
                onAttachmentsUpdated={refreshItemAfterAttachments}
                clientName={
                    detailsItem?.client_name || (detailsItem?.client_id &&
                        clientsById[detailsItem.client_id]
                        ? clientsById[detailsItem.client_id]
                        : "Internal / No Client")
                }
                assignedName={resolveAssignedName(detailsItem, usersById, "Unassigned")}
                onClose={closeDetails}
                onEdit={canWrite ? openEdit : undefined}
                readOnly={readOnly}
                clientMode={clientMode}
            />
        </div>
    );
}