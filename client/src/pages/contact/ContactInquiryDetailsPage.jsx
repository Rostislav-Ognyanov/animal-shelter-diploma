import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useAuth } from '../../auth/AuthProvider.jsx';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';
import { createEmptyFeedback, createErrorFeedback, createSuccessFeedback } from '../../lib/feedback.js';
import { fetchJson, patchJson } from '../../lib/api.js';
import {
  formatContactInquiryDate,
  getContactInquiryDonationTopicLabel,
  getContactInquiryDisplayName,
  getContactInquiryManagementPath,
  getContactInquiryStatusGuidance,
  getContactInquiryStatusLabel,
  getContactInquiryStatusTransitionOptions,
  getContactInquirySubjectLabel,
  getContactInquirySpecialCareAssistanceTypeLabel,
  getContactInquirySpecialCareAvailabilityLabel,
  getContactInquiryTypeLabel,
} from './contactInquiryUi.js';

function buildInquiryDetailRows(inquiry) {
  const rows = [
    ['Тип', getContactInquiryTypeLabel(inquiry.type)],
    ['Статус', getContactInquiryStatusLabel(inquiry.status)],
    ['Имейл', inquiry.email],
    ['Телефон', inquiry.phone || 'Няма телефон'],
    [
      'Тема',
      getContactInquirySubjectLabel(inquiry.type, inquiry.subject) || 'Няма тема',
    ],
    ['Подадено', formatContactInquiryDate(inquiry.createdAt)],
    ['Последна промяна', formatContactInquiryDate(inquiry.updatedAt)],
  ];

  if (inquiry.animalName) {
    rows.push([
      'Животно',
      inquiry.animalId ? (
        <Link to={`/animals/${inquiry.animalId}`}>{inquiry.animalName}</Link>
      ) : (
        inquiry.animalName
      ),
    ]);
  }

  if (inquiry.assistanceType) {
    rows.push([
      'Предлагана помощ',
      getContactInquirySpecialCareAssistanceTypeLabel(inquiry.assistanceType),
    ]);
  }

  if (typeof inquiry.hasRelevantExperience === 'boolean') {
    rows.push(['Предишен релевантен опит', inquiry.hasRelevantExperience ? 'Да' : 'Не']);
  }

  if (inquiry.experienceDetails) {
    rows.push(['Описание на опита', inquiry.experienceDetails]);
  }

  if (inquiry.availability) {
    rows.push([
      'Наличност',
      inquiry.type === 'special-care'
        ? getContactInquirySpecialCareAvailabilityLabel(inquiry.availability)
        : inquiry.availability,
    ]);
  }

  if (inquiry.donationTopic) {
    rows.push([
      'Вид дарение',
      getContactInquiryDonationTopicLabel(inquiry.donationTopic),
    ]);
  }

  return rows;
}

export function ContactInquiryDetailsPage() {
  const { inquiryId } = useParams();
  const { role } = useAuth();
  const [reloadToken, setReloadToken] = useState(0);
  const [pageState, setPageState] = useState({
    item: null,
    isLoading: true,
    error: '',
  });
  const [reviewForm, setReviewForm] = useState({
    status: '',
  });
  const [submitState, setSubmitState] = useState({
    isSubmitting: false,
    feedback: createEmptyFeedback(),
  });
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);

  const managementPath = useMemo(() => getContactInquiryManagementPath(role), [role]);

  useEffect(() => {
    let isMounted = true;

    async function loadInquiry() {
      try {
        setPageState({
          item: null,
          isLoading: true,
          error: '',
        });

        const payload = await fetchJson(`/api/contact-inquiries/${inquiryId}`);

        if (!isMounted) {
          return;
        }

        setPageState({
          item: payload,
          isLoading: false,
          error: '',
        });
        setReviewForm({
          status: '',
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

    loadInquiry();

    return () => {
      isMounted = false;
    };
  }, [inquiryId, reloadToken]);

  async function updateInquiryStatus(nextStatus) {
    try {
      setSubmitState({
        isSubmitting: true,
        feedback: createEmptyFeedback(),
      });

      const updatedInquiry = await patchJson(`/api/contact-inquiries/${inquiryId}/status`, {
        status: nextStatus,
      });

      setPageState((currentValue) => ({
        ...currentValue,
        item: updatedInquiry,
      }));
      setReviewForm({
        status: '',
      });
      setSubmitState({
        isSubmitting: false,
        feedback: createSuccessFeedback('Запитването е обновено успешно.'),
      });
    } catch (error) {
      setSubmitState({
        isSubmitting: false,
        feedback: createErrorFeedback(error.message),
      });
    }
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!reviewForm.status) {
      setSubmitState({
        isSubmitting: false,
        feedback: createErrorFeedback('Избери разрешен следващ статус преди запис.'),
      });
      return;
    }

    if (reviewForm.status === 'resolved') {
      setIsResolveDialogOpen(true);
      return;
    }

    updateInquiryStatus(reviewForm.status);
  }

  async function confirmResolvedStatus() {
    await updateInquiryStatus('resolved');
    setIsResolveDialogOpen(false);
  }

  function closeResolveDialog() {
    if (!submitState.isSubmitting) {
      setIsResolveDialogOpen(false);
    }
  }

  if (pageState.isLoading) {
    return (
      <main className="route-shell rescue-shell">
        <section className="route-card profile-loading-card">
          <h1>Зареждане на запитването</h1>
          <p>Подготвяме детайлите за преглед.</p>
        </section>
      </main>
    );
  }

  if (pageState.error) {
    return (
      <main className="route-shell rescue-shell">
        <section className="route-card profile-loading-card">
          <h1>Запитването не може да се зареди</h1>
          <p>{pageState.error}</p>
          <div className="route-actions rescue-inline-actions">
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

  const inquiry = pageState.item;
  const inquiryStatusOptions = getContactInquiryStatusTransitionOptions(
    inquiry?.status,
    inquiry?.allowedStatusTransitions
  );
  const hasInquiryStatusOptions = inquiryStatusOptions.length > 0;
  const detailRows = buildInquiryDetailRows(inquiry);
  const statusHistory = Array.isArray(inquiry?.statusHistory) ? inquiry.statusHistory : [];

  return (
    <main className="route-shell rescue-shell">
      <div className="route-actions">
        <Link className="app-secondary-action" to={managementPath}>
          Назад към запитванията
        </Link>
        <Link className="app-primary-action" to="/svurji-se-s-nas">
          Контактна форма
        </Link>
      </div>

      <section className="rescue-hero">
        <div>
          <h1>{getContactInquiryDisplayName(inquiry)}</h1>
          <p>{getContactInquiryStatusGuidance(inquiry.status)}</p>
        </div>

        <div className="profile-hero-badges">
          <span className={`rescue-status is-${inquiry.status}`}>
            {getContactInquiryStatusLabel(inquiry.status)}
          </span>
          <span className="rescue-urgency is-medium">{getContactInquiryTypeLabel(inquiry.type)}</span>
        </div>
      </section>

      <section className="profile-grid rescue-details-grid">
        <article className="route-card profile-summary-card rescue-summary-card">
          <div className="profile-summary-top">
            <div>
              <p className="route-meta">Обобщение</p>
              <h2>{getContactInquiryDisplayName(inquiry)}</h2>
              <p>{inquiry.email}</p>
            </div>
          </div>

          <dl className="profile-summary-list">
            {detailRows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </article>

        <article className="route-card profile-panel-card rescue-panel-card">
          <div className="profile-panel-heading">
            <div>
              <p className="route-meta">Детайли на съобщението</p>
              <h2>Съобщение</h2>
            </div>
          </div>

          <div className="rescue-copy-block">
            <h3>Описание</h3>
            <p>{inquiry.description || 'Няма допълнително описание.'}</p>
          </div>
        </article>

        <article className="route-card profile-panel-card rescue-panel-card">
          <div className="profile-panel-heading">
            <div>
              <p className="route-meta">Преглед</p>
              <h2>Преглед и статус</h2>
            </div>
          </div>

          {submitState.feedback.message ? (
            <div className={`feedback-message ${submitState.feedback.type === 'error' ? 'feedback-message-error' : 'feedback-message-info'}`}>
              {submitState.feedback.message}
            </div>
          ) : null}

          <form className="profile-form-grid" onSubmit={handleSubmit}>
            <label>
              <span>Статус</span>
              <select
                value={reviewForm.status}
                onChange={(event) =>
                  setReviewForm({
                    status: event.target.value,
                  })
                }
                disabled={!hasInquiryStatusOptions || submitState.isSubmitting}
              >
                <option value="" disabled>
                  {hasInquiryStatusOptions ? 'Избери нов статус' : 'Няма преходи'}
                </option>
                {inquiryStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="profile-form-actions profile-form-grid-wide">
              <button
                type="submit"
                className="app-primary-action"
                disabled={!hasInquiryStatusOptions || !reviewForm.status || submitState.isSubmitting}
              >
                {submitState.isSubmitting ? 'Запис...' : 'Запази статуса'}
              </button>
            </div>
          </form>
        </article>

        <article className="route-card profile-panel-card rescue-panel-card">
          <div className="profile-panel-heading">
            <div>
              <p className="route-meta">История</p>
              <h2>История на статусите</h2>
            </div>
          </div>

          {statusHistory.length > 0 ? (
            <div className="rescue-copy-block">
              {statusHistory.map((entry, index) => (
                <p key={`${entry.changedAt}-${entry.toStatus}-${index}`}>
                  <strong>
                    {entry.fromStatus
                      ? `${getContactInquiryStatusLabel(entry.fromStatus)} → ${getContactInquiryStatusLabel(entry.toStatus)}`
                      : getContactInquiryStatusLabel(entry.toStatus)}
                  </strong>
                  <br />
                  {entry.changedByName ? `${entry.changedByName} · ` : ''}
                  {formatContactInquiryDate(entry.changedAt)}
                </p>
              ))}
            </div>
          ) : (
            <p className="content-state-message">Няма записана история за този статус.</p>
          )}
        </article>
      </section>

      <ConfirmDialog
        isOpen={isResolveDialogOpen}
        title="Приключване на запитването"
        description="Сигурен ли си, че искаш да отбележиш запитването като решено?"
        confirmLabel="Отбележи като решено"
        cancelLabel="Назад"
        isSubmitting={submitState.isSubmitting}
        onConfirm={confirmResolvedStatus}
        onClose={closeResolveDialog}
      />
    </main>
  );
}
