import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useAuth } from '../../auth/AuthProvider.jsx';
import { createEmptyFeedback, createErrorFeedback, createSuccessFeedback } from '../../lib/feedback.js';
import { fetchJson, patchJson } from '../../lib/api.js';
import {
  RESCUE_REPORT_STATUS_OPTIONS,
  formatRescueReportDate,
  getRescueReportDisplayName,
  getRescueReportManagementPath,
  getRescueReportSpeciesLabel,
  getRescueReportStatusGuidance,
  getRescueReportStatusLabel,
  getRescueReportUrgencyLabel,
} from './rescueReportUi.js';

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
    status: 'pending',
    notes: '',
  });
  const [submitState, setSubmitState] = useState({
    isSubmitting: false,
    feedback: createEmptyFeedback(),
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
          status: payload.status || 'pending',
          notes: payload.notes || '',
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

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSubmitState({
        isSubmitting: true,
        feedback: createEmptyFeedback(),
      });

      const updatedReport = await patchJson(`/api/rescue-reports/${reportId}/status`, reviewForm);

      setPageState((currentValue) => ({
        ...currentValue,
        item: updatedReport,
      }));
      setReviewForm({
        status: updatedReport.status || 'pending',
        notes: updatedReport.notes || '',
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
              className="animals-primary-action"
              onClick={() => setReloadToken((currentValue) => currentValue + 1)}
            >
              Опитай отново
            </button>
            <Link className="animals-secondary-action" to={managementPath}>
              Назад към списъка
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const report = pageState.item;

  return (
    <main className="route-shell rescue-shell">
      <div className="route-actions">
        <Link className="animals-secondary-action" to={managementPath}>
          Назад към сигналите
        </Link>
        <Link className="animals-primary-action" to="/svurji-se-s-nas">
          Формата за сигнал
        </Link>
      </div>

      <section className="rescue-hero rescue-hero-detail">
        <div>
                    <h1>{getRescueReportDisplayName(report)}</h1>
          <p>{getRescueReportStatusGuidance(report.status)}</p>
        </div>

        <div className="profile-hero-badges rescue-hero-badges">
          <span className={`rescue-status is-${report.status}`}>{getRescueReportStatusLabel(report.status)}</span>
          <span className={`rescue-urgency is-${report.urgency}`}>{getRescueReportUrgencyLabel(report.urgency)}</span>
        </div>
      </section>

      <section className="profile-grid rescue-details-grid">
        <article className="route-card profile-summary-card rescue-summary-card">
          <div className="profile-summary-top">
            <div>
              <p className="route-meta">Report Overview</p>
              <h2>{getRescueReportDisplayName(report)}</h2>
              <p>{report.phone}</p>
            </div>
          </div>

          <dl className="profile-summary-list">
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
              <p className="route-meta">Case Details</p>
              <h2>Описание на случая</h2>
            </div>
          </div>

          {report.imageUrl ? (
            <div className="rescue-detail-image-wrap">
              <img className="rescue-detail-image" src={report.imageUrl} alt={`Снимка към сигнала от ${getRescueReportDisplayName(report)}`} />
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
              <p className="route-meta">Review</p>
              <h2>Преглед и решение</h2>
            </div>
          </div>

          {submitState.feedback.message ? (
            <div className={`auth-status ${submitState.feedback.type === 'error' ? 'auth-status-error' : 'auth-status-info'}`}>
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
                disabled={submitState.isSubmitting}
              >
                {RESCUE_REPORT_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="profile-form-grid-wide">
              <span>Бележки</span>
              <textarea
                value={reviewForm.notes}
                placeholder="Вътрешни бележки за екипа"
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
              <button type="submit" className="animals-primary-action" disabled={submitState.isSubmitting}>
                {submitState.isSubmitting ? 'Запис...' : 'Запази решението'}
              </button>
            </div>
          </form>
        </article>
      </section>
    </main>
  );
}


