import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Bell,
    Check,
    CheckCheck,
    ClipboardList,
    Loader2,
    X,
} from "lucide-react";

import "../styles/notifications.css";

function timeAgo(iso) {
    if (!iso) return "—";

    const timestamp = new Date(iso).getTime();
    if (Number.isNaN(timestamp)) return "—";

    const diff = Math.max(0, (Date.now() - timestamp) / 1000);

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 172800) return "Yesterday";

    return `${Math.floor(diff / 86400)}d ago`;
}

function getResponseData(response) {
    if (response?.data != null) return response.data;
    return response;
}

function notificationIcon(type) {
    switch (type) {
        case "ACTION_ITEM_ASSIGNED":
        case "ACTION_ITEM_REASSIGNED":
            return <ClipboardList size={17} />;

        default:
            return <Bell size={17} />;
    }
}

export default function Notifications({ api, onOpenActionItems, liveEvents }) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);
    const [error, setError] = useState("");

    const rootRef = useRef(null);

    const loadNotifications = useCallback(
        async (silent = false) => {
            if (!silent) setLoading(true);

            try {
                const response = await api("/notifications/?limit=50");
                const data = getResponseData(response);

                setNotifications(Array.isArray(data?.items) ? data.items : []);
                setUnreadCount(Number(data?.unread_count || 0));
                setError("");
            } catch (err) {
                if (!silent) {
                    setError(err?.message || "Failed to load notifications.");
                }
            } finally {
                if (!silent) setLoading(false);
            }
        },
        [api]
    );

    useEffect(() => {
        loadNotifications();

        const interval = setInterval(() => {
            loadNotifications(true);
        }, 30000);

        return () => clearInterval(interval);
    }, [loadNotifications]);

    // Live refresh when WebSocket receives new_notification
    useEffect(() => {
        if (!liveEvents?.length) return;
        const latest = liveEvents[0];
        if (latest?.event === "new_notification" || latest?.sound_type === "action_item") {
            loadNotifications(true);
        }
    }, [liveEvents, loadNotifications]);

    useEffect(() => {
        if (!open) return;

        const handleOutsideClick = (event) => {
            if (rootRef.current && !rootRef.current.contains(event.target)) {
                setOpen(false);
            }
        };

        const handleEscape = (event) => {
            if (event.key === "Escape") {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [open]);

    const markAsRead = async (notification, openActionItem = false) => {
        if (!notification) return;

        if (openActionItem && notification.action_item_id) {
            setOpen(false);
            onOpenActionItems?.(notification.action_item_id);
        }

        try {
            setActionLoading(notification.notification_id);

            if (!notification.is_read) {
                await api(`/notifications/${notification.notification_id}/read`, {
                    method: "PATCH",
                });
            }

            setNotifications((current) =>
                current.map((item) =>
                    item.notification_id === notification.notification_id
                        ? {
                            ...item,
                            is_read: true,
                            read_at: new Date().toISOString(),
                        }
                        : item
                )
            );

            setUnreadCount((current) =>
                notification.is_read ? current : Math.max(0, current - 1)
            );
        } catch (err) {
            setError(err?.message || "Failed to update notification.");
        } finally {
            setActionLoading(null);
        }
    };

    const markAllAsRead = async () => {
        if (!unreadCount) return;

        try {
            setActionLoading("all");

            await api("/notifications/read-all", {
                method: "PATCH",
            });

            setNotifications((current) =>
                current.map((item) => ({
                    ...item,
                    is_read: true,
                    read_at: item.read_at || new Date().toISOString(),
                }))
            );

            setUnreadCount(0);
            setError("");
        } catch (err) {
            setError(err?.message || "Failed to mark notifications as read.");
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="hb-notifications" ref={rootRef}>
            <button
                type="button"
                className={`hb-notification-trigger${open ? " is-open" : ""}`}
                onClick={() => {
                    setOpen((value) => !value);
                    if (!open) {
                        loadNotifications(true);
                    }
                }}
                aria-label={
                    unreadCount > 0
                        ? `${unreadCount} unread notifications`
                        : "Notifications"
                }
                aria-haspopup="dialog"
                aria-expanded={open}
            >
                <Bell size={17} />

                {unreadCount > 0 && (
                    <span className="hb-notification-count">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="hb-notification-panel">
                    <div className="hb-notification-header">
                        <div>
                            <div className="hb-notification-title">Notifications</div>
                            <div className="hb-notification-subtitle">
                                {unreadCount > 0
                                    ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"
                                    }`
                                    : "You're all caught up"}
                            </div>
                        </div>

                        <div className="hb-notification-header-actions">
                            {unreadCount > 0 && (
                                <button
                                    type="button"
                                    className="hb-notification-mark-all"
                                    onClick={markAllAsRead}
                                    disabled={actionLoading === "all"}
                                    title="Mark all as read"
                                >
                                    {actionLoading === "all" ? (
                                        <Loader2 size={14} className="hb-notification-spin" />
                                    ) : (
                                        <CheckCheck size={14} />
                                    )}
                                    Mark all read
                                </button>
                            )}

                            <button
                                type="button"
                                className="hb-notification-close"
                                onClick={() => setOpen(false)}
                                aria-label="Close notifications"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="hb-notification-error">
                            <span>{error}</span>
                            <button type="button" onClick={() => setError("")}>
                                <X size={13} />
                            </button>
                        </div>
                    )}

                    <div className="hb-notification-list hb-scroll">
                        {loading ? (
                            <div className="hb-notification-loading">
                                <Loader2 size={18} className="hb-notification-spin" />
                                Loading notifications…
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="hb-notification-empty">
                                <div className="hb-notification-empty-icon">
                                    <Bell size={20} />
                                </div>
                                <div className="hb-notification-empty-title">
                                    No notifications
                                </div>
                                <div className="hb-notification-empty-text">
                                    New assignments and updates will appear here.
                                </div>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.notification_id}
                                    className={`hb-notification-item${notification.is_read ? "" : " is-unread"
                                        }`}
                                    onClick={() => {
                                        if (notification.action_item_id) {
                                            markAsRead(notification, true);
                                        } else {
                                            markAsRead(notification, false);
                                        }
                                    }}
                                    role={notification.action_item_id ? "button" : undefined}
                                    tabIndex={notification.action_item_id ? 0 : undefined}
                                    onKeyDown={(event) => {
                                        if (
                                            notification.action_item_id &&
                                            (event.key === "Enter" || event.key === " ")
                                        ) {
                                            event.preventDefault();
                                            markAsRead(notification, true);
                                        }
                                    }}
                                >
                                    <div className="hb-notification-item-icon">
                                        {notificationIcon(notification.notification_type)}
                                    </div>

                                    <div className="hb-notification-item-content">
                                        <div className="hb-notification-item-top">
                                            <div className="hb-notification-item-title">
                                                {notification.title}
                                            </div>

                                            {!notification.is_read && (
                                                <span className="hb-notification-unread-dot" />
                                            )}
                                        </div>

                                        <div className="hb-notification-item-message">
                                            {notification.message}
                                        </div>

                                        <div className="hb-notification-item-meta">
                                            <span>{timeAgo(notification.created_at)}</span>

                                            {notification.action_item_id && (
                                                <span className="hb-notification-action-link">
                                                    View Action Item
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {!notification.is_read && (
                                        <button
                                            type="button"
                                            className="hb-notification-read-btn"
                                            title="Mark as read"
                                            aria-label="Mark notification as read"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                markAsRead(notification, false);
                                            }}
                                            disabled={
                                                actionLoading === notification.notification_id
                                            }
                                        >
                                            {actionLoading === notification.notification_id ? (
                                                <Loader2
                                                    size={14}
                                                    className="hb-notification-spin"
                                                />
                                            ) : (
                                                <Check size={14} />
                                            )}
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}