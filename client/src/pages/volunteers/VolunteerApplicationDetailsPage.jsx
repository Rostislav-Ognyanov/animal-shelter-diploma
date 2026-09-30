import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useAuth } from '../../auth/AuthProvider.jsx';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';
import { createEmptyFeedback, createErrorFeedback, createSuccessFeedback } from '../../lib/feedback.js';
import { fetchJson, patchJson } from '../../lib/api.js';
import { VOLUNTEER_TEXT_LIMITS } from '../../../../shared/domain/volunteerConstants.js';
import {
  formatVolunteerDate,
  getVolunteerDisplayName,
  getVolunteerManagementPath,
  getVolunteerPositionSummary,
  getVolunteerStatusGuidance,
  getVolunteerStatusLabel,
  getVolunteerStatusTransitionOptions,
} from './volunteerUi.js';

function isMinorApplicationRecord(application) {
  const age = Number(application?.age);
  return Number.isInteger(age) && age > 0 && age < 18;
}

function normalizeComparableText(value) {
  return String(value ?? '').trim();
}

function buildReviewPayload(application, reviewForm) {
  const payload = {};

  if (reviewForm.status) {
    payload.status = reviewForm.status;
  }

  if (normalizeComparableText(reviewForm.notes)) {
    payload.notes = reviewForm.notes;
  }

  if (
    isMinorApplicationRecord(application) &&
    Boolean(reviewForm.guardianConsentVerified) !== Boolean(application?.guardianConsentVerified)
  ) {
    payload.guardianConsentVerified = Boolean(reviewForm.guardianConsentVerified);
  }

  return payload;
}

function buildReviewConfirmation(nextStatus) {
  if (nextStatus === 'approved') {
    return {
      title: 'Одобряване на кандидатура',
      description:
        'Сигурен ли си, че кандидатурата е прегледана и трябва да бъде одобрена?',
      tone: 'default',
    };
  }

  if (nextStatus === 'rejected') {
    return {
      title: 'Отхвърляне на кандидатура',
      description:
        'Сигурен ли си, че тази доброволческа кандидатура трябва да бъде отхвърлена?',
      tone: 'danger',
    };
  }

  return null;
}

export function VolunteerApplicationDetailsPage() {
  const { applicationId } = useParams();
  const { role } = useAuth();
  const [reloadToken, setReloadToken] = useState(0);
  const [pageState, setPageState] = useState({
    item: null,
    isLoading: true,
    error: '',
  });
  const [reviewForm, setReviewForm] = useState({
    status: '',
    notes: '',
    guardianConsentVerified: false,
  });
  const [submitState, setSubmitState] = useState({
    isSubmitting: false,
    feedback: createEmptyFeedback(),
  });
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    payload: null,
    title: '',
    description: '',
    tone: 'default',
  });

  const managementPath = useMemo(() => getVolunteerManagementPath(role), [role]);

  useEffect(() => {
    let isMounted = true;

    async function loadApplication() {
      try {
        setPageState({
          item: null,
          isLoading: true,
          error: '',
        });

        const payload = await fetchJson(`/api/volunteers/${applicationId}`);

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
          notes: '',
          guardianConsentVerified: Boolean(payload.guardianConsentVerified),
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

    loadApplication();

    return () => {
      isMounted = false;
    };
  }, [applicationId, reloadToken]);

  async function submitReviewPayload(updatePayload) {
    try {
      setSubmitState({
        isSubmitting: true,
        feedback: createEmptyFeedback(),
      });

      const updatedApplication = await patchJson(`/api/volunteers/${applicationId}/review`, updatePayload);

      setPageState((currentValue) => ({
        ...currentValue,
        item: updatedApplication,
      }));
      setReviewForm({
        status: '',
        notes: '',
        guardianConsentVerified: Boolean(updatedApplication.guardianConsentVerified),
      });
      setSubmitState({
        isSubmitting: false,
        feedback: createSuccessFeedback('Кандидатурата е обновена успешно.'),
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

    const updatePayload = buildReviewPayload(pageState.item, reviewForm);

    if (Object.keys(updatePayload).length === 0) {
      setSubmitState({
        isSubmitting: false,
        feedback: createErrorFeedback('Няма въведени промени за запис.'),
      });
      return;
    }

    const confirmation = buildReviewConfirmation(updatePayload.status);

    if (confirmation) {
      setConfirmState({
        isOpen: true,
        payload: updatePayload,
        ...confirmation,
      });
      return;
    }

    submitReviewPayload(updatePayload);
  }

  function closeConfirmDialog() {
    if (submitState.isSubmitting) {
      return;
    }

    setConfirmState({
      isOpen: false,
      payload: null,
      title: '',
      description: '',
      tone: 'default',
    });
  }

  async function confirmReviewSubmit() {
    if (!confirmState.payload) {
      return;
    }

    await submitReviewPayload(confirmState.payload);
    setConfirmState({
      isOpen: false,
      payload: null,
      title: '',
      description: '',
      tone: 'default',
    });
  }

  if (pageState.isLoading) {
    return (
      <main className="route-shell volunteers-shell">
        <section className="route-card profile-loading-card">
          <h1>Зареждане на кандидатурата</h1>
          <p>Подготвяме детайлите за преглед.</p>
        </section>
      </main>
    );
  }

  if (pageState.error) {
    return (
      <main className="route-shell volunteers-shell">
        <section className="route-card profile-loading-card">
          <h1>Кандидатурата не може да се зареди</h1>
          <p>{pageState.error}</p>
          <div className="route-actions volunteers-inline-actions">
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

  const application = pageState.item;
  const isMinorApplication = isMinorApplicationRecord(application);
  const volunteerStatusOptions = getVolunteerStatusTransitionOptions(
    application?.status,
    application?.allowedStatusTransitions
  );
  const hasVolunteerStatusOptions = volunteerStatusOptions.length > 0;
  const reviewPayload = buildReviewPayload(application, reviewForm);
  const hasReviewChanges = Object.keys(reviewPayload).length > 0;
  const internalNotes = Array.isArray(application?.internalNotes) ? application.internalNotes : [];
  const statusHistory = Array.isArray(application?.statusHistory) ? application.statusHistory : [];
  const approvalBlockedByGuardianConsent =
    isMinorApplication &&
    application?.status === 'under-review' &&
    !application.guardianConsentVerified;

  return (
    <main className="route-shell volunteers-shell">
      <div className="route-actions">
        <Link className="app-secondary-action" to={managementPath}>
          Назад към кандидатурите
        </Link>
        <Link className="app-primary-action" to="/volunteers">
          Формата за кандидатстване
        </Link>
      </div>

      <section className="volunteers-hero">
        <div>
          <h1>{getVolunteerDisplayName(application)}</h1>
          <p>{getVolunteerStatusGuidance(application.status)}</p>
        </div>

        <div className="profile-hero-badges volunteers-hero-badges">
          <span className={`volunteer-status is-${application.status}`}>
            {getVolunteerStatusLabel(application.status)}
          </span>
        </div>
      </section>

      <section className="profile-grid volunteers-details-grid">
        <article className="route-card profile-summary-card volunteers-summary-card">
          <div className="profile-summary-top">
            <div>
              <p className="route-meta">Обобщение</p>
              <h2>Данни за кандидата</h2>
              <p>{getVolunteerDisplayName(application)}</p>
            </div>
          </div>

          <dl className="profile-summary-list">
            <div>
              <dt>Имейл</dt>
              <dd>
                <a href={`mailto:${application.email}`}>{application.email}</a>
              </dd>
            </div>
            <div>
              <dt>Телефон</dt>
              <dd>
                <a href={`tel:${application.phone}`}>{application.phone}</a>
              </dd>
            </div>
            <div>
              <dt>Възраст</dt>
              <dd>{application.age || 'Няма данни'}</dd>
            </div>
            <div>
              <dt>Наличност</dt>
              <dd>{application.availability || 'Няма данни'}</dd>
            </div>
            <div>
              <dt>Подадена</dt>
              <dd>{formatVolunteerDate(application.createdAt)}</dd>
            </div>
          </dl>
        </article>

        <article className="route-card profile-panel-card volunteers-panel-card">
          <div className="profile-panel-heading">
            <div>
              <p className="route-meta">Преглед</p>
              <h2>Преглед и решение</h2>
            </div>
          </div>

          {submitState.feedback.message ? (
            <div
              className={`feedback-message ${submitState.feedback.type === 'error' ? 'feedback-message-error' : 'feedback-message-info'}`}
            >
              {submitState.feedback.message}
            </div>
          ) : null}

          <form className="profile-form-grid" onSubmit={handleSubmit}>
            {isMinorApplication ? (
              <>
                <label className="volunteer-checkbox-row profile-form-grid-wide">
                  <input
                    type="checkbox"
                    checked={Boolean(reviewForm.guardianConsentVerified)}
                    onChange={(event) =>
                      setReviewForm((currentValue) => ({
                        ...currentValue,
                        guardianConsentVerified: event.target.checked,
                      }))
                    }
                    disabled={submitState.isSubmitting}
                  />
                  <span>Съгласието от родител/настойник е потвърдено</span>
                </label>

                {approvalBlockedByGuardianConsent ? (
                  <p className="management-status-guidance profile-form-grid-wide">
                    Одобрението ще бъде достъпно след записано служебно потвърждение на съгласието.
                  </p>
                ) : null}
              </>
            ) : null}

            <label>
              <span>Статус</span>
              <select
                value={reviewForm.status}
                onChange={(event) =>
                  setReviewForm((currentValue) => ({
                    ...currentValue,
                    status: event.target.value,
                  }))
                }
                disabled={!hasVolunteerStatusOptions || submitState.isSubmitting}
              >
                <option value="" disabled>
                  {hasVolunteerStatusOptions ? 'Избери нов статус' : 'Няма преходи'}
                </option>
                {volunteerStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="profile-form-grid-wide">
              <span>Нова бележка</span>
              <textarea
                value={reviewForm.notes}
                placeholder="Добави нова вътрешна бележка за екипа"
                maxLength={VOLUNTEER_TEXT_LIMITS.internalNote}
                onChange={(event) =>
                  setReviewForm((currentValue) => ({
                    ...currentValue,
                    notes: event.target.value,
                  }))
                }
                disabled={submitState.isSubmitting}
              />
            </label>

            <div className="profile-form-actions profile-form-grid-wide">
              <button
                type="submit"
                className="app-primary-action"
                disabled={submitState.isSubmitting || !hasReviewChanges}
              >
                {submitState.isSubmitting ? 'Запис...' : 'Запази промените'}
              </button>
            </div>
          </form>
        </article>

        <article className="route-card profile-panel-card volunteers-panel-card volunteers-detail-wide">
          <div className="profile-panel-heading">
            <div>
              <p className="route-meta">Подадени данни</p>
              <h2>Кандидатура</h2>
            </div>
          </div>

          {isMinorApplication ? (
            <div className="volunteers-copy-block">
              <h3>Родител или настойник</h3>
              <p>
                Кандидатът е под 18 години.
                <br />
                Име: {application.guardianName || 'Няма данни'}
                <br />
                Контакт: {application.guardianContact || 'Няма данни'}
                <br />
                Потвърдено съгласие: {application.guardianConsentVerified ? 'Да' : 'Не'}
                {application.guardianConsentVerified ? (
                  <>
                    <br />
                    Потвърдено от: {application.guardianConsentVerifiedByName || 'Служител'}
                    <br />
                    Дата на потвърждение: {formatVolunteerDate(application.guardianConsentVerifiedAt)}
                  </>
                ) : null}
              </p>
            </div>
          ) : null}

          <div className="volunteers-copy-block">
            <h3>Предпочитани дейности</h3>
            <p>{getVolunteerPositionSummary(application)}</p>
          </div>

          <div className="volunteers-copy-block">
            <h3>Мотивация</h3>
            <p>{application.motivation || 'Няма въведена мотивация.'}</p>
          </div>

          <div className="volunteers-copy-block">
            <h3>Опит</h3>
            <p>{application.experience || 'Не е описан предишен опит.'}</p>
          </div>
        </article>

        <article className="route-card profile-panel-card volunteers-panel-card">
          <div className="profile-panel-heading">
            <div>
              <p className="route-meta">История</p>
              <h2>История на статуса</h2>
            </div>
          </div>

          {statusHistory.length > 0 ? (
            <div className="adoptions-notes-list">
              {statusHistory.map((entry, index) => (
                <div key={`${entry.changedAt}-${index}`} className="adoptions-note-entry">
                  <div className="adoptions-note-meta">
                    <strong>
                      {entry.fromStatus
                        ? `${getVolunteerStatusLabel(entry.fromStatus)} към ${getVolunteerStatusLabel(entry.toStatus)}`
                        : getVolunteerStatusLabel(entry.toStatus)}
                    </strong>
                    <span>{entry.changedByName || 'Система'}</span>
                  </div>
                  <small>{formatVolunteerDate(entry.changedAt)}</small>
                </div>
              ))}
            </div>
          ) : (
            <p>Няма записана история на статуса.</p>
          )}
        </article>

        <article className="route-card profile-panel-card volunteers-panel-card">
          <div className="profile-panel-heading">
            <div>
              <p className="route-meta">Бележки</p>
              <h2>Вътрешни бележки</h2>
            </div>
          </div>

          {internalNotes.length > 0 ? (
            <div className="adoptions-notes-list">
              {internalNotes.map((note, index) => (
                <div key={`${note.createdAt}-${index}`} className="adoptions-note-entry">
                  <div className="adoptions-note-meta">
                    <strong>{note.authorName || 'Служител'}</strong>
                    <span>Вътрешна бележка</span>
                  </div>
                  <p className="adoptions-note-body">{note.text}</p>
                  <small>{formatVolunteerDate(note.createdAt)}</small>
                </div>
              ))}
            </div>
          ) : (
            <p>Няма вътрешни бележки.</p>
          )}
        </article>

      </section>

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel="Потвърди"
        isSubmitting={submitState.isSubmitting}
        tone={confirmState.tone}
        onConfirm={confirmReviewSubmit}
        onClose={closeConfirmDialog}
      />
    </main>
  );
}


