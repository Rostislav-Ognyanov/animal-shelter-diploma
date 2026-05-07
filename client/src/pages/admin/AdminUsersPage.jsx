import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../auth/AuthProvider.jsx';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';
import { fetchApi, fetchJson, patchJson, postJson } from '../../lib/api.js';
import { createEmptyFeedback, createErrorFeedback, createSuccessFeedback } from '../../lib/feedback.js';
import {
  buildUserCollectionMetrics,
  formatUserDate,
  getUserDisplayName,
  getUserRoleLabel,
  getUserStatusLabel,
  getUserStatusTone,
  USER_PAGE_SIZE_OPTIONS,
  USER_ROLE_OPTIONS,
  USER_STATUS_OPTIONS,
} from '../users/usersUi.js';

const EMPTY_EDIT_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  role: 'client',
};

const EMPTY_CREATE_FORM = {
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  isActive: true,
};

function buildEmptyPagination() {
  return {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  };
}

function buildEditForm(user) {
  return {
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    role: user?.role ?? 'client',
  };
}

function buildFilterSummary(filters, total) {
  const summaryParts = [];

  if (filters.role) {
    summaryParts.push(`Роля: ${getUserRoleLabel(filters.role)}`);
  }

  if (filters.status) {
    summaryParts.push(`Статус: ${filters.status === 'active' ? 'Активни' : 'Неактивни'}`);
  }

  if (filters.search) {
    summaryParts.push(`Търсене: „${filters.search}“`);
  }

  if (summaryParts.length === 0) {
    return `Няма активни филтри. Виждат се ${total} записа за текущата страница.`;
  }

  return `${summaryParts.join(' · ')} · ${total} записа за текущата страница.`;
}

export function AdminUsersPage() {
  const { currentUser, updateCurrentUser } = useAuth();
  const [filters, setFilters] = useState({
    role: '',
    status: '',
    search: '',
    page: 1,
    limit: 10,
  });
  const [searchInput, setSearchInput] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [listState, setListState] = useState({
    items: [],
    total: 0,
    pagination: buildEmptyPagination(),
    policy: null,
    isLoading: true,
    error: '',
  });
  const [selectedUserId, setSelectedUserId] = useState('');
  const [detailsReloadToken, setDetailsReloadToken] = useState(0);
  const [detailsState, setDetailsState] = useState({
    item: null,
    isLoading: false,
    error: '',
  });
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [editState, setEditState] = useState({
    isSubmitting: false,
    feedback: createEmptyFeedback(),
  });
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [createState, setCreateState] = useState({
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

    async function loadUsers() {
      try {
        setListState((currentValue) => ({
          ...currentValue,
          isLoading: true,
          error: '',
        }));

        const params = new URLSearchParams();

        if (filters.role) {
          params.set('role', filters.role);
        }

        if (filters.status) {
          params.set('status', filters.status);
        }

        if (filters.search) {
          params.set('search', filters.search);
        }

        params.set('page', String(filters.page));
        params.set('limit', String(filters.limit));

        const payload = await fetchApi(`/api/users?${params.toString()}`);

        if (!isMounted) {
          return;
        }

        setListState({
          items: payload.data?.items ?? [],
          total: payload.data?.total ?? 0,
          pagination: payload.meta?.pagination ?? buildEmptyPagination(),
          policy: payload.data?.policy ?? null,
          isLoading: false,
          error: '',
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setListState((currentValue) => ({
          ...currentValue,
          items: [],
          total: 0,
          pagination: buildEmptyPagination(),
          isLoading: false,
          error: error.message,
        }));
      }
    }

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, [filters, reloadToken]);

  useEffect(() => {
    if (!selectedUserId) {
      setDetailsState({
        item: null,
        isLoading: false,
        error: '',
      });
      setEditForm(EMPTY_EDIT_FORM);
      setEditState((currentValue) => ({
        ...currentValue,
        feedback: createEmptyFeedback(),
      }));
      setStatusState((currentValue) => ({
        ...currentValue,
        feedback: createEmptyFeedback(),
      }));
      return;
    }

    let isMounted = true;

    async function loadSelectedUser() {
      try {
        setDetailsState({
          item: null,
          isLoading: true,
          error: '',
        });

        const payload = await fetchJson(`/api/users/${selectedUserId}`);

        if (!isMounted) {
          return;
        }

        setDetailsState({
          item: payload,
          isLoading: false,
          error: '',
        });
        setEditForm(buildEditForm(payload));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setDetailsState({
          item: null,
          isLoading: false,
          error: error.message,
        });
      }
    }

    loadSelectedUser();

    return () => {
      isMounted = false;
    };
  }, [selectedUserId, detailsReloadToken]);

  const selectedUser = detailsState.item;
  const managedRoles = useMemo(() => {
    return listState.policy?.managedRoles ?? ['client', 'employee', 'admin'];
  }, [listState.policy]);
  const collectionMetrics = useMemo(() => buildUserCollectionMetrics(listState.items), [listState.items]);
  const filterSummary = useMemo(
    () => buildFilterSummary(filters, listState.items.length),
    [filters, listState.items.length]
  );
  const isEditingSelf = selectedUser?.id === currentUser?.id;
  const isEditDirty = useMemo(() => {
    if (!selectedUser) {
      return false;
    }

    return (
      editForm.firstName !== (selectedUser.firstName ?? '') ||
      editForm.lastName !== (selectedUser.lastName ?? '') ||
      editForm.email !== (selectedUser.email ?? '') ||
      editForm.role !== (selectedUser.role ?? 'client')
    );
  }, [editForm.email, editForm.firstName, editForm.lastName, editForm.role, selectedUser]);

  function syncUserEverywhere(updatedUser) {
    setListState((currentValue) => ({
      ...currentValue,
      items: currentValue.items.map((item) => (item.id === updatedUser.id ? { ...item, ...updatedUser } : item)),
    }));
    setDetailsState((currentValue) => ({
      ...currentValue,
      item: updatedUser,
    }));
    setEditForm(buildEditForm(updatedUser));

    if (updatedUser.id === currentUser?.id) {
      updateCurrentUser(updatedUser);
    }
  }

  function handleFilterChange(fieldName, value) {
    setFilters((currentValue) => ({
      ...currentValue,
      [fieldName]: value,
      page: fieldName === 'page' ? value : 1,
    }));
  }

  function handleSearchSubmit(event) {
    event.preventDefault();

    setFilters((currentValue) => ({
      ...currentValue,
      search: searchInput.trim(),
      page: 1,
    }));
  }

  function handleClearFilters() {
    setSearchInput('');
    setFilters((currentValue) => ({
      ...currentValue,
      role: '',
      status: '',
      search: '',
      page: 1,
    }));
  }

  function handleSelectUser(userId) {
    setSelectedUserId(userId);
    setEditState((currentValue) => ({
      ...currentValue,
      feedback: createEmptyFeedback(),
    }));
    setStatusState((currentValue) => ({
      ...currentValue,
      feedback: createEmptyFeedback(),
    }));
  }

  function handleEditFieldChange(fieldName, value) {
    setEditForm((currentValue) => ({
      ...currentValue,
      [fieldName]: value,
    }));
  }

  function handleCreateFieldChange(fieldName, value) {
    setCreateForm((currentValue) => ({
      ...currentValue,
      [fieldName]: value,
    }));
  }

  function handleEditReset() {
    setEditForm(buildEditForm(selectedUser));
    setEditState((currentValue) => ({
      ...currentValue,
      feedback: createEmptyFeedback(),
    }));
  }

  async function handleEditSubmit(event) {
    event.preventDefault();

    if (!selectedUser) {
      return;
    }

    try {
      setEditState({
        isSubmitting: true,
        feedback: createEmptyFeedback(),
      });

      const updatedUser = await patchJson(`/api/users/${selectedUser.id}`, editForm);

      syncUserEverywhere(updatedUser);
      setEditState({
        isSubmitting: false,
        feedback: createSuccessFeedback('Данните за потребителя са обновени успешно.'),
      });
      setReloadToken((currentValue) => currentValue + 1);
    } catch (error) {
      setEditState({
        isSubmitting: false,
        feedback: createErrorFeedback(error.message),
      });
    }
  }

  async function handleCreateSubmit(event) {
    event.preventDefault();

    try {
      setCreateState({
        isSubmitting: true,
        feedback: createEmptyFeedback(),
      });

      const createdEmployee = await postJson('/api/users/employees', createForm);

      setCreateForm(EMPTY_CREATE_FORM);
      setCreateState({
        isSubmitting: false,
        feedback: createSuccessFeedback('Новият служител е създаден успешно.'),
      });
      setSelectedUserId(createdEmployee.id);
      setDetailsState({
        item: createdEmployee,
        isLoading: false,
        error: '',
      });
      setEditForm(buildEditForm(createdEmployee));
      setReloadToken((currentValue) => currentValue + 1);
    } catch (error) {
      setCreateState({
        isSubmitting: false,
        feedback: createErrorFeedback(error.message),
      });
    }
  }

  function handleStatusActionRequest() {
    if (!selectedUser) {
      return;
    }

    const nextIsActive = !selectedUser.isActive;

    setConfirmState({
      nextIsActive,
      title: nextIsActive ? 'Активиране на профил' : 'Деактивиране на профил',
      description: nextIsActive
        ? `Сигурен ли си, че искаш да активираш профила на ${getUserDisplayName(selectedUser)}?`
        : `Сигурен ли си, че искаш да деактивираш профила на ${getUserDisplayName(selectedUser)}?`,
      confirmLabel: nextIsActive ? 'Активирай' : 'Деактивирай',
      tone: nextIsActive ? 'primary' : 'danger',
    });
  }

  async function handleConfirmStatusChange() {
    if (!selectedUser || !confirmState) {
      return;
    }

    try {
      setStatusState({
        isSubmitting: true,
        feedback: createEmptyFeedback(),
      });

      const updatedUser = await patchJson(`/api/users/${selectedUser.id}/status`, {
        isActive: confirmState.nextIsActive,
      });

      syncUserEverywhere(updatedUser);
      setConfirmState(null);
      setStatusState({
        isSubmitting: false,
        feedback: createSuccessFeedback(
          confirmState.nextIsActive
            ? 'Профилът е активиран успешно.'
            : 'Профилът е деактивиран успешно.'
        ),
      });
      setReloadToken((currentValue) => currentValue + 1);
    } catch (error) {
      setConfirmState(null);
      setStatusState({
        isSubmitting: false,
        feedback: createErrorFeedback(error.message),
      });
    }
  }

  return (
    <main className="route-shell users-admin-shell">
      <section className="users-admin-hero">
        <div>
                    <h1>Административно управление на потребители</h1>
          <p>
            Списък, филтри и действия.
          </p>
        </div>

        <div className="users-admin-hero-metrics">
          <div className="users-admin-metric-card">
            <strong>{listState.total}</strong>
            <span>общо потребители</span>
          </div>
          <div className="users-admin-metric-card">
            <strong>{listState.pagination.page}</strong>
            <span>текуща страница</span>
          </div>
        </div>
      </section>

      <section className="users-admin-dashboard">
        <article className="route-card users-admin-overview-card">
          <p className="route-meta">Visible Slice</p>
          <strong>{collectionMetrics.active}</strong>
          <span>активни в текущата извадка</span>
        </article>
        <article className="route-card users-admin-overview-card">
          <p className="route-meta">Clients</p>
          <strong>{collectionMetrics.clients}</strong>
          <span>клиентски профили на текущата страница</span>
        </article>
        <article className="route-card users-admin-overview-card">
          <p className="route-meta">Employees</p>
          <strong>{collectionMetrics.employees}</strong>
          <span>служители в текущата извадка</span>
        </article>
        <article className="route-card users-admin-overview-card">
          <p className="route-meta">Admins</p>
          <strong>{collectionMetrics.admins}</strong>
          <span>администраторски профили</span>
        </article>
        <article className="route-card users-admin-context-card">
          <p className="route-meta">Current Focus</p>
          <h2>Текущ контекст</h2>
          <p>{filterSummary}</p>
          {selectedUser ? (
            <Link className="animals-secondary-action" to={`/admin/users/${selectedUser.id}`}>
              Отвори детайлна страница за {getUserDisplayName(selectedUser)}
            </Link>
          ) : (
            <span className="users-admin-context-hint">Избери профил.</span>
          )}
        </article>
      </section>

      <section className="route-card users-admin-toolbar">
        <form className="users-admin-search" onSubmit={handleSearchSubmit}>
          <input
            type="search"
            value={searchInput}
            placeholder="Търси по име, username или имейл"
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <button type="submit" className="animals-primary-action" disabled={listState.isLoading}>
            Търси
          </button>
        </form>

        <div className="users-admin-filters">
          <label>
            <span>Роля</span>
            <select
              value={filters.role}
              onChange={(event) => handleFilterChange('role', event.target.value)}
              disabled={listState.isLoading}
            >
              {USER_ROLE_OPTIONS.map((option) => (
                <option key={option.value || 'all-roles'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Активност</span>
            <select
              value={filters.status}
              onChange={(event) => handleFilterChange('status', event.target.value)}
              disabled={listState.isLoading}
            >
              {USER_STATUS_OPTIONS.map((option) => (
                <option key={option.value || 'all-statuses'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Показвай</span>
            <select
              value={filters.limit}
              onChange={(event) => handleFilterChange('limit', Number(event.target.value))}
              disabled={listState.isLoading}
            >
              {USER_PAGE_SIZE_OPTIONS.map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize} на страница
                </option>
              ))}
            </select>
          </label>

          <button type="button" className="animals-secondary-action" onClick={handleClearFilters}>
            Изчисти
          </button>
        </div>
      </section>

      <section className="users-admin-layout">
        <article className="route-card users-admin-list-card">
          <div className="users-admin-list-heading">
            <div>
              <p className="route-meta">Users List</p>
              <h2>Всички потребители</h2>
            </div>
            <span className="users-admin-list-summary">
              {listState.isLoading ? 'Зареждане...' : `${listState.total} записа`}
            </span>
          </div>

          {listState.error ? (
            <div className="users-admin-empty-state">
              <h3>Списъкът не можа да се зареди</h3>
              <p>{listState.error}</p>
              <button
                type="button"
                className="animals-primary-action"
                onClick={() => setReloadToken((currentValue) => currentValue + 1)}
              >
                Опитай отново
              </button>
            </div>
          ) : null}

          {!listState.error && listState.isLoading ? (
            <div className="users-admin-empty-state">
              <h3>Зареждане на потребителите</h3>
              <p>Моля, изчакай.</p>
            </div>
          ) : null}

          {!listState.error && !listState.isLoading && listState.items.length === 0 ? (
            <div className="users-admin-empty-state">
              <h3>Няма потребители за тези критерии</h3>
              <p>Промени филтрите или изчисти търсенето, за да видиш повече записи.</p>
            </div>
          ) : null}

          {!listState.error && !listState.isLoading && listState.items.length > 0 ? (
            <div className="users-admin-list">
              {listState.items.map((user) => (
                <article
                  key={user.id}
                  className={`users-admin-row ${selectedUserId === user.id ? 'is-selected' : ''}`}
                >
                  <div className="users-admin-row-main">
                    <div className="users-admin-row-top">
                      <h3>{getUserDisplayName(user)}</h3>
                      <div className="users-admin-row-badges">
                        <span className="profile-role-pill">{getUserRoleLabel(user.role)}</span>
                        <span className={`profile-status-pill ${getUserStatusTone(user.isActive)}`}>
                          {getUserStatusLabel(user.isActive)}
                        </span>
                      </div>
                    </div>

                    <p>{user.email}</p>
                    <small>@{user.username}</small>
                    <small>Последна промяна: {formatUserDate(user.updatedAt)}</small>
                  </div>

                  <div className="users-admin-row-actions">
                    <button
                      type="button"
                      className="animals-secondary-action"
                      onClick={() => handleSelectUser(user.id)}
                    >
                      {selectedUserId === user.id ? 'Бърз панел' : 'Бързо управление'}
                    </button>
                    <Link className="animals-primary-action" to={`/admin/users/${user.id}`}>
                      Отделна страница
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {!listState.error && !listState.isLoading && listState.items.length > 0 ? (
            <div className="animals-pagination users-admin-pagination">
              <button
                type="button"
                className="animals-secondary-action"
                disabled={!listState.pagination.hasPreviousPage}
                onClick={() => handleFilterChange('page', filters.page - 1)}
              >
                Предишна
              </button>

              <div className="animals-pagination-info">
                <strong>Страница {listState.pagination.page}</strong>
                <span>от {Math.max(listState.pagination.totalPages, 1)}</span>
              </div>

              <button
                type="button"
                className="animals-primary-action"
                disabled={!listState.pagination.hasNextPage}
                onClick={() => handleFilterChange('page', filters.page + 1)}
              >
                Следваща
              </button>
            </div>
          ) : null}
        </article>

        <div className="users-admin-side">
          <article className="route-card users-admin-detail-card">
            <div className="users-admin-detail-heading">
              <div>
                <p className="route-meta">Quick Manage</p>
                <h2>Бърз панел за профил</h2>
              </div>
              {selectedUser ? (
                <div className="users-admin-detail-actions">
                  <Link className="animals-secondary-action" to={`/admin/users/${selectedUser.id}`}>
                    Към детайлна страница
                  </Link>
                  <button
                    type="button"
                    className="animals-secondary-action"
                    onClick={() => setDetailsReloadToken((currentValue) => currentValue + 1)}
                  >
                    Презареди
                  </button>
                </div>
              ) : null}
            </div>

            {!selectedUserId ? (
              <div className="users-admin-empty-state">
                <h3>Избери потребител от списъка</h3>
                <p>Бързо управление на избрания профил.</p>
              </div>
            ) : null}

            {selectedUserId && detailsState.isLoading ? (
              <div className="users-admin-empty-state">
                <h3>Зареждане на профила</h3>
                <p>Моля, изчакай.</p>
              </div>
            ) : null}

            {selectedUserId && detailsState.error ? (
              <div className="users-admin-empty-state">
                <h3>Профилът не можа да се зареди</h3>
                <p>{detailsState.error}</p>
              </div>
            ) : null}

            {selectedUser ? (
              <>
                <div className="users-admin-selected-summary">
                  <div>
                    <h3>{getUserDisplayName(selectedUser)}</h3>
                    <p>{selectedUser.email}</p>
                  </div>

                  <div className="users-admin-row-badges">
                    <span className="profile-role-pill">{getUserRoleLabel(selectedUser.role)}</span>
                    <span className={`profile-status-pill ${getUserStatusTone(selectedUser.isActive)}`}>
                      {getUserStatusLabel(selectedUser.isActive)}
                    </span>
                  </div>
                </div>

                <dl className="profile-summary-list users-admin-summary-list">
                  <div>
                    <dt>Username</dt>
                    <dd>{selectedUser.username}</dd>
                  </div>
                  <div>
                    <dt>Създаден профил</dt>
                    <dd>{formatUserDate(selectedUser.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>Последно влизане</dt>
                    <dd>{formatUserDate(selectedUser.lastLoginAt)}</dd>
                  </div>
                  <div>
                    <dt>Последна промяна</dt>
                    <dd>{formatUserDate(selectedUser.updatedAt)}</dd>
                  </div>
                </dl>

                {editState.feedback.message ? (
                  <div
                    className={`auth-status ${editState.feedback.type === 'error' ? 'auth-status-error' : 'auth-status-info'}`}
                  >
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
                      Собственият администраторски профил може да се редактира, но ролята му не може
                      да се сменя оттук.
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

                {statusState.feedback.message ? (
                  <div
                    className={`auth-status ${statusState.feedback.type === 'error' ? 'auth-status-error' : 'auth-status-info'}`}
                  >
                    {statusState.feedback.message}
                  </div>
                ) : null}

                <div className="users-admin-status-panel">
                  <div>
                    <strong>Статус на профила</strong>
                    <p>
                      {selectedUser.isActive
                        ? 'Активен достъп до системата.'
                        : 'Без достъп до системата.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    className={selectedUser.isActive ? 'animals-secondary-action animal-danger-action' : 'animals-primary-action'}
                    disabled={statusState.isSubmitting || (isEditingSelf && selectedUser.isActive)}
                    onClick={handleStatusActionRequest}
                  >
                    {statusState.isSubmitting
                      ? 'Запис...'
                      : selectedUser.isActive
                        ? 'Деактивирай профила'
                        : 'Активирай профила'}
                  </button>
                </div>
              </>
            ) : null}
          </article>

          <article className="route-card users-admin-create-card">
            <div className="users-admin-detail-heading">
              <div>
                <p className="route-meta">Create Employee</p>
                <h2>Добави служител</h2>
              </div>
            </div>



            {createState.feedback.message ? (
              <div
                className={`auth-status ${createState.feedback.type === 'error' ? 'auth-status-error' : 'auth-status-info'}`}
              >
                {createState.feedback.message}
              </div>
            ) : null}

            <form className="profile-form-grid" onSubmit={handleCreateSubmit}>
              <label>
                <span>Име</span>
                <input
                  type="text"
                  value={createForm.firstName}
                  onChange={(event) => handleCreateFieldChange('firstName', event.target.value)}
                  disabled={createState.isSubmitting}
                />
              </label>

              <label>
                <span>Фамилия</span>
                <input
                  type="text"
                  value={createForm.lastName}
                  onChange={(event) => handleCreateFieldChange('lastName', event.target.value)}
                  disabled={createState.isSubmitting}
                />
              </label>

              <label>
                <span>Username</span>
                <input
                  type="text"
                  value={createForm.username}
                  onChange={(event) => handleCreateFieldChange('username', event.target.value)}
                  disabled={createState.isSubmitting}
                />
              </label>

              <label>
                <span>Имейл</span>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(event) => handleCreateFieldChange('email', event.target.value)}
                  disabled={createState.isSubmitting}
                />
              </label>

              <label>
                <span>Парола</span>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(event) => handleCreateFieldChange('password', event.target.value)}
                  disabled={createState.isSubmitting}
                />
              </label>

              <label>
                <span>Потвърди парола</span>
                <input
                  type="password"
                  value={createForm.confirmPassword}
                  onChange={(event) => handleCreateFieldChange('confirmPassword', event.target.value)}
                  disabled={createState.isSubmitting}
                />
              </label>

              <label className="users-admin-checkbox profile-form-grid-wide">
                <input
                  type="checkbox"
                  checked={createForm.isActive}
                  onChange={(event) => handleCreateFieldChange('isActive', event.target.checked)}
                  disabled={createState.isSubmitting}
                />
                <span>Създай профила като активен</span>
              </label>

              <div className="profile-form-actions profile-form-grid-wide">
                <button type="submit" className="animals-primary-action" disabled={createState.isSubmitting}>
                  {createState.isSubmitting ? 'Създаване...' : 'Създай служител'}
                </button>
              </div>
            </form>
          </article>
        </div>
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














