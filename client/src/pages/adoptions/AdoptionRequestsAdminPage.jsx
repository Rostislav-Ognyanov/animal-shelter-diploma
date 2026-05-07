import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { createEmptyFeedback, createErrorFeedback, createSuccessFeedback } from '../../lib/feedback.js';
import { fetchJson, patchJson } from '../../lib/api.js';
import {
  ADOPTION_STATUS_OPTIONS,
  buildAdoptionStatusQuery,
  formatAdoptionDate,
  getAdoptionStatusGuidance,
  getAdoptionStatusLabel,
  getAdoptionStatusTransitions,
  getAnimalDisplayName,
  getUserDisplayName,
} from './adoptionUi.js';

export function AdoptionRequestsAdminPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [pageState, setPageState] = useState({
    items: [],
    isLoading: true,
    error: '',
  });
  const [selectedStatuses, setSelectedStatuses] = useState({});
  const [submittingId, setSubmittingId] = useState('');
  const [feedback, setFeedback] = useState(createEmptyFeedback);

  useEffect(() => {
    let isMounted = true;

    async function loadRequests() {
      try {
        setPageState((currentValue) => ({ ...currentValue, isLoading: true, error: '' }));
        const payload = await fetchJson(`/api/adoptions${buildAdoptionStatusQuery(statusFilter)}`);

        if (!isMounted) {
          return;
        }

        setPageState({
          items: payload.items ?? [],
          isLoading: false,
          error: '',
        });
        setSelectedStatuses({});
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPageState({
          items: [],
          isLoading: false,
          error: error.message,
        });
      }
    }

    loadRequests();

    return () => {
      isMounted = false;
    };
  }, [statusFilter, reloadToken]);

  async function handleStatusUpdate(request) {
    const nextStatus = selectedStatuses[request.id];

    if (!nextStatus || nextStatus === request.status) {
      setFeedback(createErrorFeedback('Избери различен статус преди обновяване.'));
      return;
    }

    try {
      setSubmittingId(request.id);
      setFeedback(createEmptyFeedback());
      const updatedRequest = await patchJson(`/api/adoptions/${request.id}/status`, {
        status: nextStatus,
      });

      setPageState((currentValue) => ({
        ...currentValue,
        items: currentValue.items.map((item) =>
          item.id === request.id ? { ...item, ...updatedRequest } : item
        ),
      }));
      setSelectedStatuses((currentValue) => ({ ...currentValue, [request.id]: '' }));
      setFeedback(
        createSuccessFeedback(
          `Статусът е обновен на „${getAdoptionStatusLabel(updatedRequest.status)}“.`
        )
      );
    } catch (error) {
      setFeedback(createErrorFeedback(error.message));
    } finally {
      setSubmittingId('');
    }
  }

  return (
    <main className="route-shell adoptions-shell">
      <section className="adoptions-hero">
        <div>
                    <h1>Заявки за осиновяване</h1>
          <p>
            Филтър и смяна на статус.
          </p>
        </div>

        <label className="adoptions-filter">
          Филтър по статус
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Всички статуси</option>
            {ADOPTION_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <div className="route-actions">
        <Link className="animals-primary-action" to="/animals/new">
          Добави животно
        </Link>
        <Link className="animals-secondary-action" to="/search">
          Към животните
        </Link>
      </div>

      {feedback.message ? (
        <div className={`auth-status ${feedback.type === 'error' ? 'auth-status-error' : 'auth-status-info'}`}>
          {feedback.message}
        </div>
      ) : null}

      <section className="adoptions-card">
        {pageState.isLoading ? (
          <div className="adoptions-empty-state">
            <h2>Зареждане на служебния списък</h2>
            <p>Моля, изчакай.</p>
          </div>
        ) : null}

        {pageState.error ? (
          <div className="adoptions-empty-state">
            <h2>Заявките не могат да се заредят</h2>
            <p>{pageState.error}</p>
            <button
              type="button"
              className="animals-primary-action"
              onClick={() => setReloadToken((currentValue) => currentValue + 1)}
            >
              Опитай отново
            </button>
          </div>
        ) : null}

        {!pageState.isLoading && !pageState.error && pageState.items.length === 0 ? (
          <div className="adoptions-empty-state">
            <h2>Няма заявки за избрания филтър</h2>
            <p>Няма записи.</p>
          </div>
        ) : null}

        {!pageState.isLoading && !pageState.error && pageState.items.length > 0 ? (
          <div className="adoptions-table">
            {pageState.items.map((request) => {
              const transitions = getAdoptionStatusTransitions(request.status);

              return (
                <article key={request.id} className="adoptions-table-row">
                  <div>
                    <span className={`adoption-status is-${request.status}`}>
                      {getAdoptionStatusLabel(request.status)}
                    </span>
                    <h2>{getAnimalDisplayName(request.animal)}</h2>
                    <p>
                      {request.animal?.speciesLabel || request.animal?.species} • {request.animal?.breed}
                    </p>
                    <p className="adoption-request-guidance">
                      {getAdoptionStatusGuidance(request.status, 'staff')}
                    </p>
                  </div>

                  <div>
                    <strong>{getUserDisplayName(request.user)}</strong>
                    <span>{request.user?.email || 'Няма имейл'}</span>
                  </div>

                  <div>
                    <strong>Подадена</strong>
                    <span>{formatAdoptionDate(request.createdAt)}</span>
                  </div>

                  <div className="adoptions-row-actions">
                    <select
                      value={selectedStatuses[request.id] ?? ''}
                      disabled={transitions.length === 0 || submittingId === request.id}
                      onChange={(event) =>
                        setSelectedStatuses((currentValue) => ({
                          ...currentValue,
                          [request.id]: event.target.value,
                        }))
                      }
                    >
                      <option value="">
                        {transitions.length > 0 ? 'Нов статус' : 'Няма преходи'}
                      </option>
                      {transitions.map((status) => (
                        <option key={status} value={status}>
                          {getAdoptionStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="animals-primary-action"
                      disabled={transitions.length === 0 || submittingId === request.id}
                      onClick={() => handleStatusUpdate(request)}
                    >
                      {submittingId === request.id ? 'Запис...' : 'Обнови'}
                    </button>
                    <Link className="animals-secondary-action" to={`/adoptions/${request.id}`}>
                      Детайли
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
    </main>
  );
}




