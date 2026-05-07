import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useAuth } from '../../auth/AuthProvider.jsx';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';
import { fetchJson, patchJson } from '../../lib/api.js';
import { createEmptyFeedback, createErrorFeedback, createSuccessFeedback } from '../../lib/feedback.js';
import {
  formatUserDate,
  getUserDisplayName,
  getUserRoleLabel,
  getUserStatusLabel,
  getUserStatusTone,
} from '../users/usersUi.js';

const EMPTY_EDIT_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  role: 'client',
};

function buildEditForm(user) {
  return {
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    role: user?.role ?? 'client',
  };
}

export function AdminUserDetailsPage() {
  const { userId } = useParams();
  const { currentUser, updateCurrentUser } = useAuth();
  const [reloadToken, setReloadToken] = useState(0);
  const [pageState, setPageState] = useState({
    item: null,
    isLoading: true,
    error: '',
    statusCode: 0,
  });
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [editState, setEditState] = useState({
    isSubmitting: false,
    feedback: createEmptyFeedback(),
  });
  const [statusState, setStatusState] = useState({
    isSubmitting: false,
    feedback: createEmptyFeedback(),
  });
  const [confirmState, setConfirmState] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      try {
        setPageState({
          item: null,
          isLoading: true,
          error: '',
          statusCode: 0,
        });

        const payload = await fetchJson(`/api/users/${userId}`);

        if (!isMounted) {
          return;
        }

        setPageState({
          item: payload,
          isLoading: false,
          error: '',
          statusCode: 0,
        });
        setEditForm(buildEditForm(payload));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPageState({
          item: null,
          isLoading: false,
          error: error.message,
          statusCode: error.status ?? 0,
        });
      }
    }

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [reloadToken, userId]);

  const user = pageState.item;
  const managedRoles = useMemo(() => user?.policy?.managedRoles ?? ['client', 'employee', 'admin'], [user]);
  const isEditingSelf = user?.id === currentUser?.id;
  const isEditDirty = useMemo(() => {
    if (!user) {
      return false;
    }

    return (
      editForm.firstName !== (user.firstName ?? '') ||
      editForm.lastName !== (user.lastName ?? '') ||
      editForm.email !== (user.email ?? '') ||
      editForm.role !== (user.role ?? 'client')
    );
  }, [editForm.email, editForm.firstName, editForm.lastName, editForm.role, user]);

  function syncUser(updatedUser) {
    setPageState((currentValue) => ({
      ...currentValue,
      item: updatedUser,
    }));
    setEditForm(buildEditForm(updatedUser));

    if (updatedUser.id === currentUser?.id) {
      updateCurrentUser(updatedUser);
    }
  }

  function handleEditFieldChange(fieldName, value) {
    setEditForm((currentValue) => ({
      ...currentValue,
      [fieldName]: value,
    }));
  }

  function handleEditReset() {
    setEditForm(buildEditForm(user));
    setEditState((currentValue) => ({
      ...currentValue,
      feedback: createEmptyFeedback(),
    }));
  }

  async function handleEditSubmit(event) {
    event.preventDefault();

    if (!user) {
      return;
    }

    try {
      setEditState({
        isSubmitting: true,
        feedback: createEmptyFeedback(),
      });

      const updatedUser = await patchJson(`/api/users/${user.id}`, editForm);

      syncUser(updatedUser);
      setEditState({
        isSubmitting: false,
        feedback: createSuccessFeedback('Профилът е обновен успешно.'),
      });
    } catch (error) {
      setEditState({
        isSubmitting: false,
        feedback: createErrorFeedback(error.message),
      });
    }
  }

  function handleStatusActionRequest() {
    if (!user) {
      return;
    }

    const nextIsActive = !user.isActive;

    setConfirmState({
      nextIsActive,
      title: nextIsActive ? 'Активиране на профил' : 'Деактивиране на профил',
      description: nextIsActive
        ? `Сигурен ли си, че искаш да активираш профила на ${getUserDisplayName(user)}?`
        : `Сигурен ли си, че искаш да деактивираш профила на ${getUserDisplayName(user)}?`,
      confirmLabel: nextIsActive ? 'Активирай' : 'Деактивирай',
      tone: nextIsActive ? 'primary' : 'danger',
    });
  }

  async function handleConfirmStatusChange() {
    if (!user || !confirmState) {
      return;
    }

    try {
      setStatusState({
        isSubmitting: true,
        feedback: createEmptyFeedback(),
      });

      const updatedUser = await patchJson(`/api/users/${user.id}/status`, {
        isActive: confirmState.nextIsActive,
      });

      syncUser(updatedUser);
      setConfirmState(null);
      setStatusState({
        isSubmitting: false,
        feedback: createSuccessFeedback(
          confirmState.nextIsActive
            ? 'Профилът е активиран успешно.'
            : 'Профилът е деактивиран успешно.'
        ),
      });
    } catch (error) {
      setConfirmState(null);
      setStatusState({
        isSubmitting: false,
        feedback: createErrorFeedback(error.message),
      });
    }
  }

  if (pageState.isLoading) {
    return (
      <main className="route-shell users-detail-shell">
        <section className="route-card users-detail-loading-card">
                    <h1>Зареждане на профила</h1>
          <p>Подготвяме административния детайлен преглед за избрания потребител.</p>
        </section>
      </main>
    );
  }

  if (pageState.error) {
    return (
      <main className="route-shell users-detail-shell">
        <div className="users-detail-topbar">
          <Link className="animals-secondary-action" to="/admin/users">
            Към списъка с потребители
          </Link>
        </div>

        <section className="route-card users-detail-loading-card">
                    <h1>{pageState.statusCode === 404 ? 'Потребителят не е намерен' : 'Профилът не може да се зареди'}</h1>
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
    <main className="route-shell users-detail-shell">
      <div className="users-detail-topbar">
        <Link className="animals-secondary-action" to="/admin/users">
          Към списъка с потребители
        </Link>
      </div>

      <section className="users-admin-hero users-detail-hero">
        <div>
                    <h1>{getUserDisplayName(user)}</h1>
          <p>
            Редакция и статус.
          </p>
        </div>

        <div className="profile-hero-badges">
          <span className="profile-role-pill">{getUserRoleLabel(user.role)}</span>
          <span className={`profile-status-pill ${getUserStatusTone(user.isActive)}`}>
            {getUserStatusLabel(user.isActive)}
          </span>
        </div>
      </section>

      <section className="users-detail-grid">
        <article className="route-card profile-summary-card">
          <div className="profile-summary-top">
            <div>
              <p className="route-meta">Profile Snapshot</p>
              <h2>{user.email}</h2>
              <p>@{user.username}</p>
            </div>
          </div>

          <dl className="profile-summary-list">
            <div>
              <dt>Роля</dt>
              <dd>{getUserRoleLabel(user.role)}</dd>
            </div>
            <div>
              <dt>Статус</dt>
              <dd>{getUserStatusLabel(user.isActive)}</dd>
            </div>
            <div>
              <dt>Създаден профил</dt>
              <dd>{formatUserDate(user.createdAt)}</dd>
            </div>
            <div>
              <dt>Последно влизане</dt>
              <dd>{formatUserDate(user.lastLoginAt)}</dd>
            </div>
            <div>
              <dt>Последна промяна</dt>
              <dd>{formatUserDate(user.updatedAt)}</dd>
            </div>
            <div>
              <dt>Потребителско име</dt>
              <dd>{user.username}</dd>
            </div>
          </dl>
        </article>

        <article className="route-card profile-panel-card">
          <div className="profile-panel-heading">
            <div>
              <p className="route-meta">Admin Edit</p>
              <h2>Редакция на профила</h2>
            </div>
          </div>

          {editState.feedback.message ? (
            <div className={`auth-status ${editState.feedback.type === 'error' ? 'auth-status-error' : 'auth-status-info'}`}>
              {editState.feedback.message}
            </div>
          ) : null}

          <form className="profile-form-grid" onSubmit={handleEditSubmit}>
            <label>
              <span>Име</span>
              <input
                type="text"
                value={editForm.firstName}
                onChange={(event) => handleEditFieldChange('firstName', event.target.value)}
                disabled={editState.isSubmitting}
              />
            </label>

            <label>
              <span>Фамилия</span>
              <input
                type="text"
                value={editForm.lastName}
                onChange={(event) => handleEditFieldChange('lastName', event.target.value)}
                disabled={editState.isSubmitting}
              />
            </label>

            <label className="profile-form-grid-wide">
              <span>Имейл</span>
              <input
                type="email"
                value={editForm.email}
                onChange={(event) => handleEditFieldChange('email', event.target.value)}
                disabled={editState.isSubmitting}
              />
            </label>

            <label className="profile-form-grid-wide">
              <span>Роля</span>
              <select
                value={editForm.role}
                onChange={(event) => handleEditFieldChange('role', event.target.value)}
                disabled={editState.isSubmitting || isEditingSelf}
              >
                {managedRoles.map((role) => (
                  <option key={role} value={role}>
                    {getUserRoleLabel(role)}
                  </option>
                ))}
              </select>
            </label>

            {isEditingSelf ? (
              <p className="users-admin-inline-note">
                Собствената роля не се сменя оттук.
              </p>
            ) : null}

            <div className="profile-form-actions profile-form-grid-wide">
              <button
                type="submit"
                className="animals-primary-action"
                disabled={editState.isSubmitting || !isEditDirty}
              >
                {editState.isSubmitting ? 'Запис...' : 'Запази промените'}
              </button>
              <button
                type="button"
                className="animals-secondary-action"
                onClick={handleEditReset}
                disabled={editState.isSubmitting || !isEditDirty}
              >
                Върни стойностите
              </button>
            </div>
          </form>
        </article>

        <article className="route-card users-detail-side-card">
          <div className="profile-panel-heading">
            <div>
              <p className="route-meta">Status & Notes</p>
              <h2>Статус</h2>
            </div>
          </div>

          {statusState.feedback.message ? (
            <div className={`auth-status ${statusState.feedback.type === 'error' ? 'auth-status-error' : 'auth-status-info'}`}>
              {statusState.feedback.message}
            </div>
          ) : null}

          <div className="users-detail-note-list">
            <div className="users-detail-note-card">
              <strong>Текущо състояние</strong>
              <p>
                {user.isActive
                  ? 'Активен достъп.'
                  : 'Без достъп до системата.'}
              </p>
            </div>

          </div>

          <div className="users-admin-status-panel">
            <div>
              <strong>Промяна на активността</strong>
              <p>Чувствително действие.</p>
            </div>

            <button
              type="button"
              className={user.isActive ? 'animals-secondary-action animal-danger-action' : 'animals-primary-action'}
              disabled={statusState.isSubmitting || (isEditingSelf && user.isActive)}
              onClick={handleStatusActionRequest}
            >
              {statusState.isSubmitting ? 'Запис...' : user.isActive ? 'Деактивирай профила' : 'Активирай профила'}
            </button>
          </div>
        </article>
      </section>

      <ConfirmDialog
        isOpen={Boolean(confirmState)}
        title={confirmState?.title ?? ''}
        description={confirmState?.description ?? ''}
        confirmLabel={confirmState?.confirmLabel ?? 'Потвърди'}
        cancelLabel="Отказ"
        tone={confirmState?.tone ?? 'danger'}
        isSubmitting={statusState.isSubmitting}
        onConfirm={handleConfirmStatusChange}
        onClose={() => {
          if (!statusState.isSubmitting) {
            setConfirmState(null);
          }
        }}
      />
    </main>
  );
}


