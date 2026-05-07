import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useAuth } from '../../auth/AuthProvider.jsx';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';
import { fetchJson, patchJson } from '../../lib/api.js';
import {
  formatAdoptionDate,
  getAdoptionStatusGuidance,
  getAdoptionStatusLabel,
  getAdoptionStatusTransitions,
  getAnimalDisplayName,
  getUserDisplayName,
  isStaffRole,
} from './adoptionUi.js';

export function AdoptionRequestDetailsPage() {
  const { requestId } = useParams();
  const { role } = useAuth();
  const [reloadToken, setReloadToken] = useState(0);
  const [pageState, setPageState] = useState({
    item: null,
    isLoading: true,
    error: '',
  });
  const [statusForm, setStatusForm] = useState({
    status: '',
    internalNote: '',
  });
  const [submitState, setSubmitState] = useState({
    isSubmitting: false,
    error: '',
    success: '',
  });
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadRequest() {
      try {
        setPageState({ item: null, isLoading: true, error: '' });
        setSubmitState({ isSubmitting: false, error: '', success: '' });
        const request = await fetchJson(`/api/adoptions/${requestId}`);

        if (!isMounted) {
          return;
        }

        setPageState({ item: request, isLoading: false, error: '' });
        setStatusForm({ status: '', internalNote: '' });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPageState({ item: null, isLoading: false, error: error.message });
      }
    }

    loadRequest();

    return () => {
      isMounted = false;
    };
  }, [requestId, reloadToken]);

  const request = pageState.item;
  const transitions = useMemo(() => getAdoptionStatusTransitions(request?.status), [request?.status]);
  const canManageRequest = isStaffRole(role);
  const canCancelOwnPending = role === 'client' && request?.status === 'pending';
  const statusGuidance = getAdoptionStatusGuidance(request?.status, canManageRequest ? 'staff' : 'client');
  const requestListPath = canManageRequest
    ? role === 'admin'
      ? '/admin/adoptions'
      : '/staff/adoptions'
    : '/adoptions/my';

  async function handleStatusSubmit(event) {
    event.preventDefault();

    if (!statusForm.status) {
      setSubmitState({ isSubmitting: false, error: 'Избери нов статус.', success: '' });
      return;
    }

    try {
      setSubmitState({ isSubmitting: true, error: '', success: '' });
      const updatedRequest = await patchJson(`/api/adoptions/${requestId}/status`, {
        status: statusForm.status,
        internalNote: statusForm.internalNote,
      });

      setPageState((currentValue) => ({ ...currentValue, item: updatedRequest }));
      setStatusForm({ status: '', internalNote: '' });
      setSubmitState({
        isSubmitting: false,
        error: '',
        success: `Статусът е обновен на „${getAdoptionStatusLabel(updatedRequest.status)}“.`,
      });
    } catch (error) {
      setSubmitState({ isSubmitting: false, error: error.message, success: '' });
    }
  }

  async function handleCancel() {
    try {
      setSubmitState({ isSubmitting: true, error: '', success: '' });
      const updatedRequest = await patchJson(`/api/adoptions/${requestId}/cancel`, {});

      setPageState((currentValue) => ({ ...currentValue, item: updatedRequest }));
      setSubmitState({
        isSubmitting: false,
        error: '',
        success: 'Заявката е отменена успешно.',
      });
      setIsCancelDialogOpen(false);
    } catch (error) {
      setSubmitState({ isSubmitting: false, error: error.message, success: '' });
      setIsCancelDialogOpen(false);
    }
  }

  if (pageState.isLoading) {
    return (
      <main className="route-shell adoptions-shell">
        <section className="route-card adoptions-card">
                    <h1>Зареждане на заявката</h1>
          <p>Подготвяме детайлите за тази заявка.</p>
        </section>
      </main>
    );
  }

  if (pageState.error) {
    return (
      <main className="route-shell adoptions-shell">
        <section className="route-card adoptions-card">
                    <h1>Заявката не може да се зареди</h1>
          <p>{pageState.error}</p>
          <button
            type="button"
            className="animals-primary-action"
            onClick={() => setReloadToken((currentValue) => currentValue + 1)}
          >
            Опитай отново
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="route-shell adoptions-shell">
      <div className="route-actions">
        <Link className="animals-secondary-action" to={requestListPath}>
          Към списъка със заявки
        </Link>
        <Link className="animals-primary-action" to={`/animals/${request.animalId}`}>
          Към животното
        </Link>
      </div>

      <section className="adoptions-hero">
        <div>
                    <h1>Заявка за {getAnimalDisplayName(request.animal)}</h1>
          <p>{request.motivation}</p>
        </div>

        <div className="adoptions-detail-status">
          <span className={`adoption-status is-${request.status}`}>
            {getAdoptionStatusLabel(request.status)}
          </span>
          <small>Подадена на {formatAdoptionDate(request.createdAt)}</small>
        </div>
      </section>

      {submitState.error ? <div className="auth-status auth-status-error">{submitState.error}</div> : null}
      {submitState.success ? <div className="auth-status auth-status-info">{submitState.success}</div> : null}

      <section className="adoptions-detail-grid">
        <article className="adoptions-card adoptions-progress-card">
          <h2>Текущ етап</h2>
          <p>{statusGuidance}</p>
          <div className="adoptions-progress-meta">
            <div>
              <strong>Текущ статус</strong>
              <span>{getAdoptionStatusLabel(request.status)}</span>
            </div>
            <div>
              <strong>Подадена</strong>
              <span>{formatAdoptionDate(request.createdAt)}</span>
            </div>
            <div>
              <strong>Последна промяна</strong>
              <span>{formatAdoptionDate(request.updatedAt)}</span>
            </div>
          </div>
        </article>

        <article className="adoptions-card">
          <h2>Данни за заявката</h2>
          <dl className="adoptions-info-list">
            <div>
              <dt>Животно</dt>
              <dd>
                <Link to={`/animals/${request.animalId}`}>{getAnimalDisplayName(request.animal)}</Link>
              </dd>
            </div>
            <div>
              <dt>Клиент</dt>
              <dd>{getUserDisplayName(request.user)}</dd>
            </div>
            <div>
              <dt>Телефон</dt>
              <dd>{request.contactPhone}</dd>
            </div>
            <div>
              <dt>Статус</dt>
              <dd>{getAdoptionStatusLabel(request.status)}</dd>
            </div>
            <div>
              <dt>Създадена</dt>
              <dd>{formatAdoptionDate(request.createdAt)}</dd>
            </div>
            <div>
              <dt>Последна промяна</dt>
              <dd>{formatAdoptionDate(request.updatedAt)}</dd>
            </div>
          </dl>
        </article>

        {canManageRequest ? (
          <article className="adoptions-card">
            <h2>Промяна на статус</h2>
            <form className="adoption-form" onSubmit={handleStatusSubmit}>
              <label>
                Нов статус
                <select
                  value={statusForm.status}
                  disabled={transitions.length === 0 || submitState.isSubmitting}
                  onChange={(event) =>
                    setStatusForm((currentValue) => ({ ...currentValue, status: event.target.value }))
                  }
                >
                  <option value="">
                    {transitions.length > 0 ? 'Избери статус' : 'Няма разрешени преходи'}
                  </option>
                  {transitions.map((status) => (
                    <option key={status} value={status}>
                      {getAdoptionStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Вътрешна бележка
                <textarea
                  value={statusForm.internalNote}
                  placeholder="Кратка служебна бележка към промяната, ако е нужна."
                  disabled={submitState.isSubmitting}
                  onChange={(event) =>
                    setStatusForm((currentValue) => ({ ...currentValue, internalNote: event.target.value }))
                  }
                />
              </label>

              <button
                type="submit"
                className="animals-primary-action"
                disabled={transitions.length === 0 || submitState.isSubmitting}
              >
                {submitState.isSubmitting ? 'Запис...' : 'Запази статуса'}
              </button>
            </form>
          </article>
        ) : null}

        {canCancelOwnPending ? (
          <article className="adoptions-card">
            <h2>Отмяна</h2>
            <p>Само при статус „В очакване“.</p>
            <button
              type="button"
              className="animals-secondary-action animal-danger-action"
              disabled={submitState.isSubmitting}
              onClick={() => setIsCancelDialogOpen(true)}
            >
              {submitState.isSubmitting ? 'Отмяна...' : 'Отмени заявката'}
            </button>
          </article>
        ) : null}

        {canManageRequest ? (
          <article className="adoptions-card adoptions-notes-card">
            <h2>Вътрешни бележки</h2>
            {request.internalNotes?.length > 0 ? (
              <div className="adoptions-notes-list">
                {request.internalNotes.map((note, index) => (
                  <div key={`${note.createdAt}-${index}`} className="adoptions-note-entry">
                    <div className="adoptions-note-meta">
                      <strong>{note.authorName || 'Служител'}</strong>
                      <span>Вътрешна бележка</span>
                    </div>
                    <p className="adoptions-note-body">{note.text}</p>
                    <small>{formatAdoptionDate(note.createdAt)}</small>
                  </div>
                ))}
              </div>
            ) : (
              <p>Няма вътрешни бележки.</p>
            )}
          </article>
        ) : null}
      </section>

      <ConfirmDialog
        isOpen={isCancelDialogOpen}
        title="Отмяна на заявка"
        description={`Сигурен ли си, че искаш да отмениш заявката за ${getAnimalDisplayName(request.animal)}?`}
        confirmLabel="Отмени заявката"
        cancelLabel="Назад"
        tone="danger"
        isSubmitting={submitState.isSubmitting}
        onConfirm={handleCancel}
        onClose={() => {
          if (!submitState.isSubmitting) {
            setIsCancelDialogOpen(false);
          }
        }}
      />
    </main>
  );
}



