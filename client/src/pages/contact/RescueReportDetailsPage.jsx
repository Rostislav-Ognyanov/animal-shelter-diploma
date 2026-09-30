import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useAuth } from '../../auth/AuthProvider.jsx';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';
import { buildPublicAssetPath } from '../../lib/publicAssetPath.js';
import { createEmptyFeedback, createErrorFeedback, createSuccessFeedback } from '../../lib/feedback.js';
import { fetchJson, patchJson } from '../../lib/api.js';
import { RESCUE_REPORT_TEXT_LIMITS } from '../../../../shared/domain/rescueReportConstants.js';
import {
  formatRescueReportDate,
  getRescueReportDisplayName,
  getRescueReportManagementPath,
  getRescueReportSpeciesLabel,
  getRescueReportStatusGuidance,
  getRescueReportStatusLabel,
  getRescueReportStatusTransitionOptions,
  getRescueReportUrgencyLabel,
} from './rescueReportUi.js';

function buildReviewConfirmation(nextStatus) {
  if (nextStatus === 'resolved') {
    return {
      title: 'Приключване на сигнала',
      description:
        'Сигурен ли си, че искаш да отбележиш сигнала като решен? След това няма разрешен следващ статус.',
      tone: 'default',
    };
  }

  if (nextStatus === 'rejected') {
    return {
      title: 'Отхвърляне на сигнала',
      description: 'Сигурен ли си, че искаш да отхвърлиш този сигнал?',
      tone: 'danger',
    };
  }

  return null;
}

export function RescueReportDetailsPage() {
  const { reportId } = useParams();
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

  const managementPath = useMemo(() => getRescueReportManagementPath(role), [role]);

  useEffect(() => {
    let isMounted = true;

    async function loadReport() {
      try {
        setPageState({
          item: null,
          isLoading: true,
          error: '',
        });

        const payload = await fetchJson(`/api/rescue-reports/${reportId}`);

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

    loadReport();

    return () => {
      isMounted = false;
    };
  }, [reportId, reloadToken]);

  async function submitReviewPayload(updatePayload) {
    try {
      setSubmitState({
        isSubmitting: true,
        feedback: createEmptyFeedback(),
      });

      const updatedReport = await patchJson(
        `/api/rescue-reports/${reportId}/review`,
        updatePayload
      );

      setPageState((currentValue) => ({
        ...currentValue,
        item: updatedReport,
      }));
      setReviewForm({
        status: '',
        notes: '',
      });
      setSubmitState({
        isSubmitting: false,
        feedback: createSuccessFeedback('Сигналът е обновен успешно.'),
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

    const updatePayload = {};
    const noteText = reviewForm.notes.trim();

    if (reviewForm.status) {
      updatePayload.status = reviewForm.status;
    }

    if (noteText) {
      updatePayload.notes = noteText;
    }

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
      <main className="route-shell rescue-shell">
        <section className="route-card profile-loading-card">
                    <h1>Зареждане на сигнала</h1>
          <p>Подготвяме детайлите за преглед.</p>
        </section>
      </main>
    );
  }

  if (pageState.error) {
    return (
      <main className="route-shell rescue-shell">
        <section className="route-card profile-loading-card">
                    <h1>Сигналът не може да се зареди</h1>
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

  const report = pageState.item;
  const reportStatusOptions = getRescueReportStatusTransitionOptions(
    report?.status,
    report?.allowedStatusTransitions
  );
  const hasReportStatusOptions = reportStatusOptions.length > 0;
  const hasStatusChange = Boolean(reviewForm.status);
  const hasNotesChange = reviewForm.notes.trim().length > 0;
  const hasReviewChanges = hasStatusChange || hasNotesChange;
  const internalNotes = Array.isArray(report?.internalNotes) ? report.internalNotes : [];
  const statusHistory = Array.isArray(report?.statusHistory) ? report.statusHistory : [];

  return (
    <main className="route-shell rescue-shell">
      <div className="route-actions">
        <Link className="app-secondary-action" to={managementPath}>
          Назад към сигналите
        </Link>
        <Link className="app-primary-action" to="/svurji-se-s-nas">
          Формата за сигнал
        </Link>
      </div>

      <section className="rescue-hero">
        <div>
                    <h1>{getRescueReportDisplayName(report)}</h1>
          <p>{getRescueReportStatusGuidance(report.status)}</p>
        </div>

        <div className="profile-hero-badges">
          <span className={`rescue-status is-${report.status}`}>{getRescueReportStatusLabel(report.status)}</span>
          <span className={`rescue-urgency is-${report.urgency}`}>{getRescueReportUrgencyLabel(report.urgency)}</span>
        </div>
      </section>

      <section className="profile-grid rescue-details-grid">
        <article className="route-card profile-summary-card rescue-summary-card">
          <div className="profile-summary-top">
            <div>
              <p className="route-meta">Обобщение</p>
              <h2>{getRescueReportDisplayName(report)}</h2>
              <p>
                {[report.email, report.phone].filter(Boolean).join(' • ')}
              </p>
            </div>
          </div>

          <dl className="profile-summary-list">
            <div>
              <dt>Имейл</dt>
              <dd>
                {report.email ? (
                  <a href={`mailto:${report.email}`}>{report.email}</a>
                ) : (
                  'Няма данни'
                )}
              </dd>
            </div>
            <div>
              <dt>Телефон</dt>
              <dd>
                {report.phone ? (
                  <a href={`tel:${report.phone}`}>{report.phone}</a>
                ) : (
                  'Няма данни'
                )}
              </dd>
            </div>
            <div>
              <dt>Място</dt>
              <dd>{report.location}</dd>
            </div>
            <div>
              <dt>Вид</dt>
              <dd>{getRescueReportSpeciesLabel(report.species)}</dd>
            </div>
            <div>
              <dt>Спешност</dt>
              <dd>{getRescueReportUrgencyLabel(report.urgency)}</dd>
            </div>
            <div>
              <dt>Статус</dt>
              <dd>{getRescueReportStatusLabel(report.status)}</dd>
            </div>
            <div>
              <dt>Подаден</dt>
              <dd>{formatRescueReportDate(report.createdAt)}</dd>
            </div>
            <div>
              <dt>Последна промяна</dt>
              <dd>{formatRescueReportDate(report.updatedAt)}</dd>
            </div>
          </dl>
        </article>

        <article className="route-card profile-panel-card rescue-panel-card">
          <div className="profile-panel-heading">
            <div>
              <p className="route-meta">Преглед</p>
              <h2>Преглед и решение</h2>
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
                  setReviewForm((currentValue) => ({
                    ...currentValue,
                    status: event.target.value,
                  }))
                }
                disabled={!hasReportStatusOptions || submitState.isSubmitting}
              >
                <option value="" disabled>
                  {hasReportStatusOptions ? 'Избери нов статус' : 'Няма преходи'}
                </option>
                {reportStatusOptions.map((option) => (
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
                maxLength={RESCUE_REPORT_TEXT_LIMITS.internalNote}
                placeholder="Добави нова вътрешна бележка за екипа"
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

        <article className="route-card profile-panel-card rescue-panel-card rescue-detail-wide">
          <div className="profile-panel-heading">
            <div>
              <p className="route-meta">Детайли по случая</p>
              <h2>Описание на случая</h2>
            </div>
          </div>

          {report.imageUrl ? (
            <div className="rescue-detail-image-wrap">
              <img
                className="rescue-detail-image"
                src={buildPublicAssetPath(report.imageUrl)}
                alt={`Снимка към сигнала от ${getRescueReportDisplayName(report)}`}
              />
            </div>
          ) : null}

          <div className="rescue-copy-block">
            <h3>Описание</h3>
            <p>{report.description || 'Няма допълнително описание.'}</p>
          </div>
        </article>

        <article className="route-card profile-panel-card rescue-panel-card">
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
                        ? `${getRescueReportStatusLabel(entry.fromStatus)} към ${getRescueReportStatusLabel(entry.toStatus)}`
                        : getRescueReportStatusLabel(entry.toStatus)}
                    </strong>
                    <span>{entry.changedByName || 'Система'}</span>
                  </div>
                  <small>{formatRescueReportDate(entry.changedAt)}</small>
                </div>
              ))}
            </div>
          ) : (
            <p>Няма записана история на статуса.</p>
          )}
        </article>

        <article className="route-card profile-panel-card rescue-panel-card">
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
                  <small>{formatRescueReportDate(note.createdAt)}</small>
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


