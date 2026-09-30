import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { fetchApiResponse, fetchJson, patchJson } from '../../lib/api.js';
import {
  emitNotificationsUpdated,
  formatNotificationDate,
  getNotificationPath,
  NOTIFICATIONS_UPDATED_EVENT,
} from '../../pages/notifications/notificationUi.js';

const DROPDOWN_NOTIFICATION_LIMIT = 5;
const UNREAD_REFRESH_INTERVAL_MS = 60000;

function formatUnreadCount(count) {
  const numericCount = Number(count ?? 0);

  if (numericCount > 99) {
    return '99+';
  }

  return String(Math.max(numericCount, 0));
}

export function NotificationBell({ currentUser, role, onOpen }) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuState, setMenuState] = useState({
    items: [],
    isLoading: false,
    error: '',
  });
  const bellRef = useRef(null);
  const hasUnread = unreadCount > 0;

  async function loadUnreadCount() {
    if (!currentUser) {
      setUnreadCount(0);
      return;
    }

    try {
      const payload = await fetchJson('/api/notifications/unread-count');
      setUnreadCount(Number(payload?.unreadCount ?? 0));
    } catch {
      // A refresh failure does not mean there are no unread notifications.
    }
  }

  async function loadNotifications() {
    if (!currentUser) {
      return;
    }

    setMenuState((currentValue) => ({
      ...currentValue,
      isLoading: true,
      error: '',
    }));

    try {
      const payload = await fetchApiResponse(`/api/notifications?page=1&limit=${DROPDOWN_NOTIFICATION_LIMIT}`);
      setMenuState({
        items: payload.data?.items ?? [],
        isLoading: false,
        error: '',
      });
    } catch (error) {
      setMenuState({
        items: [],
        isLoading: false,
        error: error.message,
      });
    }
  }

  async function markNotificationRead(notification) {
    if (!notification?.id || notification.isRead) {
      return;
    }

    try {
      const updatedNotification = await patchJson(`/api/notifications/${notification.id}/read`, {});
      setMenuState((currentValue) => ({
        ...currentValue,
        items: currentValue.items.map((item) =>
          item.id === updatedNotification.id ? updatedNotification : item
        ),
      }));
      setUnreadCount((currentValue) => Math.max(currentValue - 1, 0));
      emitNotificationsUpdated();
    } catch {
      // Opening the linked resource is more important than blocking on read state sync.
    }
  }

  async function markAllRead() {
    try {
      await patchJson('/api/notifications/read-all', {});
      setUnreadCount(0);
      setMenuState((currentValue) => ({
        ...currentValue,
        items: currentValue.items.map((item) => ({
          ...item,
          isRead: true,
        })),
      }));
      emitNotificationsUpdated();
    } catch (error) {
      setMenuState((currentValue) => ({
        ...currentValue,
        error: error.message,
      }));
    }
  }

  function toggleDropdown() {
    setIsOpen((currentValue) => {
      const nextValue = !currentValue;

      if (nextValue) {
        onOpen?.();
        loadNotifications();
      }

      return nextValue;
    });
  }

  useEffect(() => {
    if (!currentUser) {
      setUnreadCount(0);
      setMenuState({
        items: [],
        isLoading: false,
        error: '',
      });
      setIsOpen(false);
      return undefined;
    }

    let isMounted = true;

    async function refreshCount() {
      if (!isMounted) {
        return;
      }

      await loadUnreadCount();
    }

    refreshCount();
    const intervalId = window.setInterval(refreshCount, UNREAD_REFRESH_INTERVAL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [currentUser?.id]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      return undefined;
    }

    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, loadUnreadCount);

    return () => {
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, loadUnreadCount);
    };
  }, [currentUser?.id]);

  if (!currentUser) {
    return null;
  }

  return (
    <div className="notification-bell" ref={bellRef}>
      <button
        type="button"
        className="notification-trigger"
        aria-expanded={isOpen}
        aria-controls="notifications-menu"
        aria-label={hasUnread ? `Известия, ${unreadCount} непрочетени` : 'Известия'}
        onClick={toggleDropdown}
      >
        <span className="notification-trigger-icon" aria-hidden="true">
          🔔
        </span>
        {hasUnread ? <strong>{formatUnreadCount(unreadCount)}</strong> : null}
      </button>

      <div
        id="notifications-menu"
        className={`notification-dropdown ${isOpen ? 'is-open' : ''}`}
        hidden={!isOpen}
      >
        <div className="notification-dropdown-header">
          <h2>Известия</h2>
          <button type="button" onClick={markAllRead} disabled={!hasUnread}>
            Всички прочетени
          </button>
        </div>

        {menuState.isLoading ? <p className="notification-dropdown-state">Зареждане...</p> : null}
        {menuState.error ? <p className="notification-dropdown-state">{menuState.error}</p> : null}

        {!menuState.isLoading && !menuState.error && menuState.items.length === 0 ? (
          <p className="notification-dropdown-state">Няма известия.</p>
        ) : null}

        {!menuState.isLoading && !menuState.error && menuState.items.length > 0 ? (
          <div className="notification-dropdown-list">
            {menuState.items.map((notification) => (
              <Link
                key={notification.id}
                className={`notification-menu-item ${notification.isRead ? '' : 'is-unread'}`}
                to={getNotificationPath(notification, role)}
                onClick={() => {
                  setIsOpen(false);
                  markNotificationRead(notification);
                }}
              >
                <strong>{notification.title}</strong>
                <span>{notification.message}</span>
                <small>{formatNotificationDate(notification.lastTriggeredAt ?? notification.createdAt)}</small>
              </Link>
            ))}
          </div>
        ) : null}

        <Link
          className="notification-dropdown-all-link"
          to="/notifications"
          onClick={() => setIsOpen(false)}
        >
          Всички известия
        </Link>
      </div>
    </div>
  );
}
