import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { useAuth } from '../../auth/AuthProvider.jsx';
import { PageErrorState, PageLoadingState } from '../../components/common/PageStatusStates.jsx';
import { PaginationControls, buildEmptyPagination } from '../../components/common/PaginationControls.jsx';
import { fetchApiResponse, patchJson } from '../../lib/api.js';
import {
  formatNotificationDate,
  emitNotificationsUpdated,
  getNotificationPath,
  getNotificationTypeLabel,
} from './notificationUi.js';

const NOTIFICATIONS_PAGE_SIZE = 20;

function normalizePageParam(value) {
  const numericPage = Number(value ?? 1);
  return Number.isInteger(numericPage) && numericPage > 0 ? numericPage : 1;
}

export function NotificationsPage() {
  const { role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [reloadToken, setReloadToken] = useState(0);
  const page = useMemo(() => normalizePageParam(searchParams.get('page')), [searchParams]);
  const [pageState, setPageState] = useState({
    items: [],
    total: 0,
    pagination: buildEmptyPagination(NOTIFICATIONS_PAGE_SIZE),
    isLoading: true,
    error: '',
  });
  const [actionError, setActionError] = useState('');

  const updatePageParam = useCallback(
    (nextPage) => {
      const nextParams = new URLSearchParams();

      if (nextPage > 1) {
        nextParams.set('page', String(nextPage));
      }

      setSearchParams(nextParams, { replace: true });
    },
    [setSearchParams]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadNotifications() {
      try {
        setPageState((currentValue) => ({
          ...currentValue,
          isLoading: true,
          error: '',
        }));
        setActionError('');

        const payload = await fetchApiResponse(
          `/api/notifications?page=${page}&limit=${NOTIFICATIONS_PAGE_SIZE}`
        );

        if (!isMounted) {
          return;
        }

        const pagination = payload.meta?.pagination ?? buildEmptyPagination(NOTIFICATIONS_PAGE_SIZE);

        setPageState({
          items: payload.data?.items ?? [],
          total: payload.data?.total ?? 0,
          pagination,
          isLoading: false,
          error: '',
        });

        if (pagination.page !== page) {
          updatePageParam(pagination.page);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPageState({
          items: [],
          total: 0,
          pagination: buildEmptyPagination(NOTIFICATIONS_PAGE_SIZE),
          isLoading: false,
          error: error.message,
        });
      }
    }

    loadNotifications();

    return () => {
      isMounted = false;
    };
  }, [page, reloadToken, updatePageParam]);

  async function markNotificationRead(notification) {
    if (!notification?.id || notification.isRead) {
      return;
    }

    try {
      const updatedNotification = await patchJson(`/api/notifications/${notification.id}/read`, {});
      setPageState((currentValue) => ({
        ...currentValue,
        items: currentValue.items.map((item) =>
          item.id === updatedNotification.id ? updatedNotification : item
        ),
      }));
      setActionError('');
      emitNotificationsUpdated();
    } catch (error) {
      setActionError(error.message);
    }
  }

  async function markAllRead() {
    try {
      await patchJson('/api/notifications/read-all', {});
      setPageState((currentValue) => ({
        ...currentValue,
        items: currentValue.items.map((item) => ({
          ...item,
          isRead: true,
        })),
      }));
      setActionError('');
      emitNotificationsUpdated();
    } catch (error) {
      setActionError(error.message);
    }
  }

  function handlePageChange(nextPage) {
    if (nextPage < 1 || nextPage === page) {
      return;
    }

    updatePageParam(nextPage);
  }

  if (pageState.isLoading && pageState.items.length === 0) {
    return (
      <PageLoadingState
        className="notifications-shell"
        title="Зареждане на известията"
        message="Подготвяме последните съобщения."
      />
    );
  }

  if (pageState.error) {
    return (
      <PageErrorState
        className="notifications-shell"
        title="Известията не могат да се заредят"
        message={pageState.error}
        onRetry={() => setReloadToken((currentValue) => currentValue + 1)}
      />
    );
  }

  return (
    <main className="route-shell notifications-shell">
      <section className="route-card notifications-hero">
        <div>
          <p className="route-meta">Личен център</p>
          <h1>Известия</h1>
          <p>Следи важните промени и съобщения, свързани с профила и активността ти в платформата.</p>
        </div>

        <button type="button" className="app-secondary-action" onClick={markAllRead}>
          Маркирай всички като прочетени
        </button>
      </section>

      {actionError ? <p className="feedback-message feedback-message-error">{actionError}</p> : null}

      <section className="route-card notifications-list-card">
        {pageState.items.length === 0 ? (
          <div className="adoptions-empty-state">
            <h2>Няма известия</h2>
            <p>Когато има важна промяна, тя ще се появи тук.</p>
          </div>
        ) : (
          <div
            id="notifications-results-start"
            className="notifications-list pagination-scroll-target"
          >
            {pageState.items.map((notification) => (
              <article
                key={notification.id}
                className={`notification-list-item ${notification.isRead ? '' : 'is-unread'}`}
              >
                <div>
                  <span>{getNotificationTypeLabel(notification.type)}</span>
                  <h2>{notification.title}</h2>
                  <p>{notification.message}</p>
                  <small>{formatNotificationDate(notification.lastTriggeredAt ?? notification.createdAt)}</small>
                </div>

                <div className="notifications-list-actions">
                  <Link
                    className="app-primary-action"
                    to={getNotificationPath(notification, role)}
                    onClick={() => markNotificationRead(notification)}
                  >
                    Отвори
                  </Link>
                  {!notification.isRead ? (
                    <button
                      type="button"
                      className="app-secondary-action"
                      onClick={() => markNotificationRead(notification)}
                    >
                      Прочетено
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}

        <PaginationControls
          pagination={pageState.pagination}
          isLoading={pageState.isLoading}
          onPageChange={handlePageChange}
          scrollTargetId="notifications-results-start"
        />
      </section>
    </main>
  );
}
