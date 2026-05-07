import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useAuth } from '../../auth/AuthProvider.jsx';
import { createEmptyFeedback, createErrorFeedback, createSuccessFeedback } from '../../lib/feedback.js';
import { fetchJson, patchJson } from '../../lib/api.js';
import {
  VOLUNTEER_STATUS_OPTIONS,
  formatVolunteerDate,
  getVolunteerDisplayName,
  getVolunteerManagementPath,
  getVolunteerPositionSummary,
  getVolunteerStatusGuidance,
  getVolunteerStatusLabel,
} from './volunteerUi.js';

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
    status: 'pending',
    notes: '',
  });
  const [submitState, setSubmitState] = useState({
    isSubmitting: false,
    feedback: createEmptyFeedback(),
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

    loadApplication();

    return () => {
      isMounted = false;
    };
  }, [applicationId, reloadToken]);

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSubmitState({
        isSubmitting: true,
        feedback: createEmptyFeedback(),
      });

      const updatedApplication = await patchJson(`/api/volunteers/${applicationId}/status`, reviewForm);

      setPageState((currentValue) => ({
        ...currentValue,
        item: updatedApplication,
      }));
      setReviewForm({
        status: updatedApplication.status || 'pending',
        notes: updatedApplication.notes || '',
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

  const application = pageState.item;
  const isMinorApplication = Number(application?.age) > 0 && Number(application.age) < 18;

  return (
    <main className="route-shell volunteers-shell">
      <div className="route-actions">
        <Link className="animals-secondary-action" to={managementPath}>
          Назад към кандидатурите
        </Link>
        <Link className="animals-primary-action" to="/volunteers">
          Формата за кандидатстване
        </Link>
      </div>

      <section className="volunteers-hero volunteers-hero-detail">
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
              <p className="route-meta">Volunteer Overview</p>
              <h2>{getVolunteerDisplayName(application)}</h2>
              <p>{application.email}</p>
            </div>
          </div>

          <dl className="profile-summary-list">
            <div>
              <dt>Телефон</dt>
              <dd>{application.phone}</dd>
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
              <dt>Статус</dt>
              <dd>{getVolunteerStatusLabel(application.status)}</dd>
            </div>
            <div>
              <dt>Подадена</dt>
              <dd>{formatVolunteerDate(application.createdAt)}</dd>
            </div>
            <div>
              <dt>Последна промяна</dt>
              <dd>{formatVolunteerDate(application.updatedAt)}</dd>
            </div>
          </dl>
        </article>

        <article className="route-card profile-panel-card volunteers-panel-card">
          <div className="profile-panel-heading">
            <div>
              <p className="route-meta">Application</p>
              <h2>Кандидатура</h2>
            </div>
          </div>

          {isMinorApplication ? (
            <div className="volunteers-copy-block">
              <h3>Родител или настойник</h3>
              <p>
                Съгласие: {application.guardianConsent ? 'Да' : 'Не'}
                <br />
                Име: {application.guardianName || 'Няма данни'}
                <br />
                Контакт: {application.guardianContact || 'Няма данни'}
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
              <p className="route-meta">Review</p>
              <h2>Преглед и решение</h2>
            </div>
          </div>

          {submitState.feedback.message ? (
            <div
              className={`auth-status ${submitState.feedback.type === 'error' ? 'auth-status-error' : 'auth-status-info'}`}
            >
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
                {VOLUNTEER_STATUS_OPTIONS.map((option) => (
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


