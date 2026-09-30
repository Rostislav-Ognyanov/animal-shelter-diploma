import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useAuth } from '../../auth/AuthProvider.jsx';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';
import { fetchJson, patchJson } from '../../lib/api.js';
import {
  formatDonationAmount,
  formatDonationDate,
  getDonationDisplayName,
  getDonationManagementPath,
  getDonationStatusLabel,
  getDonationStatusTransitions,
} from './donationUi.js';

export function DonationDetailsPage() {
  const { donationId } = useParams();
  const { role } = useAuth();
  const [reloadToken, setReloadToken] = useState(0);
  const [pageState, setPageState] = useState({
    item: null,
    isLoading: true,
    error: '',
  });
  const [statusState, setStatusState] = useState({
    isSubmitting: false,
    message: '',
    error: '',
  });
  const [confirmState, setConfirmState] = useState({
    status: '',
    title: '',
    description: '',
  });

  const managementPath = useMemo(() => getDonationManagementPath(role), [role]);

  useEffect(() => {
    let isMounted = true;

    async function loadDonation() {
      try {
        setPageState({
          item: null,
          isLoading: true,
          error: '',
        });

        const payload = await fetchJson(`/api/donations/${donationId}`);

        if (!isMounted) {
          return;
        }

        setPageState({
          item: payload,
          isLoading: false,
          error: '',
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPageState({
          item: null,
          isLoading: false,
          error: error.message,
        });
      }
    }

    loadDonation();

    return () => {
      isMounted = false;
    };
  }, [donationId, reloadToken]);

  if (pageState.isLoading) {
    return (
      <main className="route-shell donations-shell">
        <section className="route-card profile-loading-card">
          <h1>Зареждане на заявката за дарение</h1>
          <p>Подготвяме детайлите.</p>
        </section>
      </main>
    );
  }

  if (pageState.error) {
    return (
      <main className="route-shell donations-shell">
        <section className="route-card profile-loading-card">
          <h1>Заявката за дарение не може да се зареди</h1>
          <p>{pageState.error}</p>
          <div className="route-actions donations-inline-actions">
            <button
              type="button"
              className="app-primary-action"
              onClick={() => setReloadToken((currentValue) => currentValue + 1)}
            >
              Опитай отново
            </button>
            <Link className="app-secondary-action" to={managementPath}>
              Назад към списъка
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const donation = pageState.item;
  const donationName = getDonationDisplayName(donation);
  const donationStatusLabel = getDonationStatusLabel(donation.status);
  const canUpdateStatus = Boolean(donation.canUpdateStatus);
  const statusTransitions = getDonationStatusTransitions(donation.status);
  const statusHistory = Array.isArray(donation.statusHistory) ? donation.statusHistory : [];

  async function updateDonationStatus(nextStatus) {
    setStatusState({
      isSubmitting: true,
      message: '',
      error: '',
    });

    try {
      const updatedDonation = await patchJson(`/api/donations/${donation.id}/status`, {
        status: nextStatus,
      });

      setPageState((currentValue) => ({
        ...currentValue,
        item: updatedDonation,
      }));
      setStatusState({
        isSubmitting: false,
        message: 'Статусът на заявката за дарение е обновен успешно.',
        error: '',
      });
    } catch (error) {
      setStatusState({
        isSubmitting: false,
        message: '',
        error: error.message,
      });
    }
  }

  function requestDonationStatusUpdate(nextStatus) {
    if (nextStatus === 'received') {
      setConfirmState({
        status: nextStatus,
        title: 'Потвърждение за получено дарение',
        description: 'Сигурен ли си, че сумата е реално получена и записът трябва да бъде маркиран като получен?',
      });
      return;
    }

    if (nextStatus === 'cancelled') {
      setConfirmState({
        status: nextStatus,
        title: 'Отказване на заявка за дарение',
        description: 'Сигурен ли си, че тази заявка за дарение трябва да бъде отбелязана като отказана?',
      });
      return;
    }

    updateDonationStatus(nextStatus);
  }

  function closeConfirmDialog() {
    if (statusState.isSubmitting) {
      return;
    }

    setConfirmState({
      status: '',
      title: '',
      description: '',
    });
  }

  async function confirmStatusUpdate() {
    const nextStatus = confirmState.status;

    if (!nextStatus) {
      return;
    }

    await updateDonationStatus(nextStatus);
    setConfirmState({
      status: '',
      title: '',
      description: '',
    });
  }

  return (
    <main className="route-shell donations-shell">
      <div className="route-actions">
        <Link className="app-secondary-action" to={managementPath}>
          Назад към заявките
        </Link>
        <Link className="app-primary-action" to="/donations">
          Заяви дарение
        </Link>
      </div>

      <section className="donations-hero">
        <div>
          <h1>{donationName}</h1>
          <p>Запис за заявка за дарение</p>
        </div>

        <div className="donations-hero-card donations-hero-amount-card">
          <strong>Сума</strong>
          <span className="donation-amount-pill">{formatDonationAmount(donation.amount)}</span>
          <small>{donationStatusLabel}</small>
        </div>
      </section>

      <section className="profile-grid donations-details-grid">
        <article className="route-card profile-summary-card donations-summary-card">
          <div className="profile-summary-top">
            <div>
              <p className="route-meta">Контакт</p>
              <h2>Данни за дарителя</h2>
              <p>Контакти и административни дати за този запис.</p>
            </div>
          </div>

          <dl className="profile-summary-list">
            <div>
              <dt>Дарител</dt>
              <dd>{donationName}</dd>
            </div>
            <div>
              <dt>Имейл</dt>
              <dd>
                {donation.email ? (
                  <a href={`mailto:${donation.email}`}>{donation.email}</a>
                ) : (
                  'Няма данни'
                )}
              </dd>
            </div>
            <div>
              <dt>Телефон</dt>
              <dd>
                {donation.phone ? (
                  <a href={`tel:${donation.phone}`}>{donation.phone}</a>
                ) : (
                  'Няма данни'
                )}
              </dd>
            </div>
            <div>
              <dt>Подадено</dt>
              <dd>{formatDonationDate(donation.createdAt)}</dd>
            </div>
            <div>
              <dt>Получено</dt>
              <dd>{donation.receivedAt ? formatDonationDate(donation.receivedAt) : 'Все още не е потвърдено като получено'}</dd>
            </div>
            <div>
              <dt>Последна промяна</dt>
              <dd>{formatDonationDate(donation.updatedAt)}</dd>
            </div>
          </dl>
        </article>

        <article className="route-card profile-panel-card donations-panel-card">
          <div className="profile-panel-heading">
            <div>
              <p className="route-meta">Съобщение</p>
              <h2>Съобщение от дарителя</h2>
            </div>
          </div>

          <div className="donations-copy-block">
            <p>{donation.message || 'Дарителят не е оставил допълнително съобщение.'}</p>
          </div>
        </article>

        <article className="route-card profile-panel-card donations-panel-card">
          <div className="profile-panel-heading">
            <div>
              <p className="route-meta">Статус</p>
              <h2>Управление на заявката</h2>
            </div>
          </div>

          <div className="donations-copy-block">
            <p>
              Текущ статус: <strong>{donationStatusLabel}</strong>
            </p>
            <p>
              Записът започва като заявено дарение и се маркира като получено едва след реално
              потвърждение от екипа.
            </p>
          </div>

          {statusState.message ? (
            <p className="feedback-message feedback-message-info">{statusState.message}</p>
          ) : null}
          {statusState.error ? (
            <p className="feedback-message feedback-message-error">{statusState.error}</p>
          ) : null}

          {canUpdateStatus && statusTransitions.length > 0 ? (
            <div className="profile-form-actions">
              {statusTransitions.map((nextStatus) => (
                <button
                  key={nextStatus}
                  type="button"
                  className={nextStatus === 'cancelled' ? 'app-secondary-action app-danger-action' : 'app-primary-action'}
                  disabled={statusState.isSubmitting}
                  onClick={() => requestDonationStatusUpdate(nextStatus)}
                >
                  {statusState.isSubmitting ? 'Запис...' : getDonationStatusLabel(nextStatus)}
                </button>
              ))}
            </div>
          ) : (
            <p className="content-state-message">
              {canUpdateStatus
                ? 'Няма следващи разрешени статуси за този запис.'
                : 'Само администратор може да променя статуса на дарение.'}
            </p>
          )}
        </article>

        <article className="route-card profile-panel-card donations-panel-card">
          <div className="profile-panel-heading">
            <div>
              <p className="route-meta">История</p>
              <h2>История на статусите</h2>
            </div>
          </div>

          {statusHistory.length > 0 ? (
            <div className="donations-copy-block">
              {statusHistory.map((entry, index) => (
                <p key={`${entry.changedAt}-${entry.toStatus}-${index}`}>
                  <strong>
                    {entry.fromStatus
                      ? `${getDonationStatusLabel(entry.fromStatus)} → ${getDonationStatusLabel(entry.toStatus)}`
                      : getDonationStatusLabel(entry.toStatus)}
                  </strong>
                  <br />
                  {entry.changedByName ? `${entry.changedByName} · ` : ''}
                  {formatDonationDate(entry.changedAt)}
                </p>
              ))}
            </div>
          ) : (
            <p className="content-state-message">Няма записана история за този статус.</p>
          )}
        </article>
      </section>

      <ConfirmDialog
        isOpen={Boolean(confirmState.status)}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel="Потвърди"
        isSubmitting={statusState.isSubmitting}
        tone={confirmState.status === 'cancelled' ? 'danger' : 'default'}
        onConfirm={confirmStatusUpdate}
        onClose={closeConfirmDialog}
      />
    </main>
  );
}



