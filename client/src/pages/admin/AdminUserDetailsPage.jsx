import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { MANAGED_USER_ROLE_VALUES } from '../../../../shared/domain/roleConstants.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';
import { fetchJson, patchJson } from '../../lib/api.js';
import { createEmptyFeedback, createErrorFeedback, createSuccessFeedback } from '../../lib/feedback.js';
import { ManagedUserEditForm, ManagedUserStatusPanel } from '../users/ManagedUserControls.jsx';
import {
  EMPTY_USER_EDIT_FORM,
  buildUserEditForm,
  formatUserDate,
  getUserDisplayName,
  getUserRoleLabel,
  getUserStatusLabel,
  getUserStatusTone,
} from '../users/usersUi.js';

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
  const [editForm, setEditForm] = useState(EMPTY_USER_EDIT_FORM);
  const [editState, setEditState] = useState({
    isSubmitting: false,
    feedback: createEmptyFeedback(),
  });
  const [statusState, setStatusState] = useState({
    isSubmitting: false,
    feedback: createEmptyFeedback(),
  });
  const [roleConfirmState, setRoleConfirmState] = useState(null);
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
        setEditForm(buildUserEditForm(payload));
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
  const managedRoles = MANAGED_USER_ROLE_VALUES;
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
    setEditForm(buildUserEditForm(updatedUser));

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
    setEditForm(buildUserEditForm(user));
    setEditState((currentValue) => ({
      ...currentValue,
      feedback: createEmptyFeedback(),
    }));
  }

  async function submitEditForm(formValues) {
    if (!user) {
      return;
    }

    try {
      setEditState({
        isSubmitting: true,
        feedback: createEmptyFeedback(),
      });

      const updatedUser = await patchJson(`/api/users/${user.id}`, formValues);

      syncUser(updatedUser);
      setRoleConfirmState(null);
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

  async function handleEditSubmit(event) {
    event.preventDefault();

    if (!user) {
      return;
    }

    const nextFormValues = { ...editForm };
    const hasRoleChange = nextFormValues.role !== user.role;

    if (hasRoleChange) {
      setRoleConfirmState({
        formValues: nextFormValues,
        title: 'Промяна на роля',
        description: `Ще промениш ролята на ${getUserDisplayName(user)} от ${getUserRoleLabel(user.role)} на ${getUserRoleLabel(nextFormValues.role)}. Това променя достъпа до защитените части на системата.`,
        confirmLabel: 'Промени ролята',
        tone: 'danger',
      });
      return;
    }

    await submitEditForm(nextFormValues);
  }

  async function handleConfirmRoleChange() {
    if (!roleConfirmState) {
      return;
    }

    await submitEditForm(roleConfirmState.formValues);
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
          <Link className="app-secondary-action" to="/admin/users">
            Към списъка с потребители
          </Link>
        </div>

        <section className="route-card users-detail-loading-card">
                    <h1>{pageState.statusCode === 404 ? 'Потребителят не е намерен' : 'Профилът не може да се зареди'}</h1>
          <p>{pageState.error}</p>
          <button
            type="button"
            className="app-primary-action"
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
        <Link className="app-secondary-action" to="/admin/users">
          Към списъка с потребители
        </Link>
      </div>

      <section className="users-admin-hero">
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
              <p className="route-meta">Профил</p>
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
              <p className="route-meta">Административна редакция</p>
              <h2>Редакция на профила</h2>
            </div>
          </div>

          <ManagedUserEditForm
            user={user}
            editForm={editForm}
            editState={editState}
            managedRoles={managedRoles}
            isEditingSelf={isEditingSelf}
            isEditDirty={isEditDirty}
            onFieldChange={handleEditFieldChange}
            onReset={handleEditReset}
            onSubmit={handleEditSubmit}
          />
        </article>

        <article className="route-card users-detail-side-card">
          <div className="profile-panel-heading">
            <div>
              <p className="route-meta">Статус</p>
              <h2>Статус</h2>
            </div>
          </div>

          <ManagedUserStatusPanel
            user={user}
            statusState={statusState}
            isEditingSelf={isEditingSelf}
            onStatusActionRequest={handleStatusActionRequest}
          />
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

      <ConfirmDialog
        isOpen={Boolean(roleConfirmState)}
        title={roleConfirmState?.title ?? ''}
        description={roleConfirmState?.description ?? ''}
        confirmLabel={roleConfirmState?.confirmLabel ?? 'Потвърди'}
        cancelLabel="Отказ"
        tone={roleConfirmState?.tone ?? 'danger'}
        isSubmitting={editState.isSubmitting}
        onConfirm={handleConfirmRoleChange}
        onClose={() => {
          if (!editState.isSubmitting) {
            setRoleConfirmState(null);
          }
        }}
      />
    </main>
  );
}


