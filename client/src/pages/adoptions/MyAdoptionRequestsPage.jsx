import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';
import { createEmptyFeedback, createErrorFeedback, createSuccessFeedback } from '../../lib/feedback.js';
import { fetchJson, patchJson } from '../../lib/api.js';
import {
  ADOPTION_STATUS_OPTIONS,
  buildAdoptionStatusQuery,
  formatAdoptionDate,
  getAdoptionStatusGuidance,
  getAdoptionStatusLabel,
  getAnimalDisplayName,
} from './adoptionUi.js';

export function MyAdoptionRequestsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [pageState, setPageState] = useState({
    items: [],
    isLoading: true,
    error: '',
  });
  const [feedback, setFeedback] = useState(createEmptyFeedback);
  const [cancellingId, setCancellingId] = useState('');
  const [requestToCancel, setRequestToCancel] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadRequests() {
      try {
        setPageState((currentValue) => ({ ...currentValue, isLoading: true, error: '' }));
        const payload = await fetchJson(`/api/adoptions/my${buildAdoptionStatusQuery(statusFilter)}`);

        if (!isMounted) {
          return;
        }

        setPageState({
          items: payload.items ?? [],
          isLoading: false,
          error: '',
        });
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

  async function handleCancel(requestId) {
    try {
      setCancellingId(requestId);
      setFeedback(createEmptyFeedback());
      const updatedRequest = await patchJson(`/api/adoptions/${requestId}/cancel`, {});

      setPageState((currentValue) => ({
        ...currentValue,
        items: currentValue.items.map((item) =>
          item.id === requestId ? { ...item, ...updatedRequest } : item
        ),
      }));
      setFeedback(createSuccessFeedback('Заявката е отменена успешно.'));
    } catch (error) {
      setFeedback(createErrorFeedback(error.message));
    } finally {
      setCancellingId('');
      setRequestToCancel(null);
    }
  }

  return (
    <main className="route-shell adoptions-shell">
      <section className="adoptions-hero">
        <div>
                    <h1>Моите заявки</h1>
          <p>
            Текущи статуси и връзка към животното.
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
        <Link className="animals-primary-action" to="/search">
          Разгледай животните
        </Link>
        <Link className="animals-secondary-action" to="/profile">
          Моят профил
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
            <h2>Зареждане на заявките</h2>
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
            <h2>{statusFilter ? 'Няма заявки по избрания статус' : 'Все още няма заявки'}</h2>
            <p>
              {statusFilter
                ? 'Смени филтъра.'
                : 'Подай заявка от страница на животно.'}
            </p>
            <Link className="animals-primary-action" to="/search">
              Разгледай животните
            </Link>
          </div>
        ) : null}

        {!pageState.isLoading && !pageState.error && pageState.items.length > 0 ? (
          <div className="adoptions-list">
            {pageState.items.map((request) => {
              const animalName = getAnimalDisplayName(request.animal);

              return (
                <article key={request.id} className="adoption-request-card">
                  <div className="adoption-request-main">
                    <span className={`adoption-status is-${request.status}`}>
                      {getAdoptionStatusLabel(request.status)}
                    </span>
                    <h2>{animalName}</h2>
                    <p>{request.motivation}</p>
                    <small>Подадена на {formatAdoptionDate(request.createdAt)}</small>
                    <p className="adoption-request-guidance">
                      {getAdoptionStatusGuidance(request.status)}
                    </p>
                  </div>

                  <div className="adoption-request-actions">
                    <Link className="animals-primary-action" to={`/adoptions/${request.id}`}>
                      Детайли
                    </Link>
                    <Link className="animals-secondary-action" to={`/animals/${request.animalId}`}>
                      Животно
                    </Link>
                    {request.status === 'pending' ? (
                      <button
                        type="button"
                        className="animals-secondary-action animal-danger-action"
                        disabled={cancellingId === request.id}
                        onClick={() => setRequestToCancel(request)}
                      >
                        {cancellingId === request.id ? 'Отмяна...' : 'Отмени'}
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>

      <ConfirmDialog
        isOpen={Boolean(requestToCancel)}
        title="Отмяна на заявка"
        description={
          requestToCancel
            ? `Сигурен ли си, че искаш да отмениш заявката за ${getAnimalDisplayName(requestToCancel.animal)}?`
            : ''
        }
        confirmLabel="Отмени заявката"
        cancelLabel="Назад"
        tone="danger"
        isSubmitting={Boolean(cancellingId)}
        onConfirm={() => {
          if (requestToCancel) {
            handleCancel(requestToCancel.id);
          }
        }}
        onClose={() => {
          if (!cancellingId) {
            setRequestToCancel(null);
          }
        }}
      />
    </main>
  );
}




