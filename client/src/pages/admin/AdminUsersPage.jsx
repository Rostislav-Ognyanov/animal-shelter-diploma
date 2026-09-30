import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import {
  USER_EMAIL_MAX_LENGTH,
  USER_FIRST_NAME_MAX_LENGTH,
  USER_LAST_NAME_MAX_LENGTH,
  USER_PASSWORD_MAX_LENGTH,
  USER_PASSWORD_MIN_LENGTH,
  USERNAME_HTML_PATTERN,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from '../../../../shared/domain/userConstants.js';
import { PaginationControls } from '../../components/common/PaginationControls.jsx';
import { useDebouncedSearchFilter } from '../../hooks/useDebouncedSearchFilter.js';
import { usePaginatedManagementList } from '../../hooks/usePaginatedManagementList.js';
import { postJson } from '../../lib/api.js';
import { createEmptyFeedback, createErrorFeedback, createSuccessFeedback } from '../../lib/feedback.js';
import {
  buildManagementListSearchParams,
  normalizePageParam,
  readManagementListSearchParams,
} from '../../lib/searchParams.js';
import {
  EMPTY_USER_SUMMARY,
  formatUserDate,
  getUserDisplayName,
  getUserRoleLabel,
  getUserStatusLabel,
  getUserStatusTone,
  USER_PAGE_SIZE_OPTIONS,
  USER_ROLE_OPTIONS,
  USER_STATUS_OPTIONS,
} from '../users/usersUi.js';

const EMPTY_CREATE_FORM = {
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  isActive: true,
};

const DEFAULT_USERS_PAGE_SIZE = 10;
const USER_LIST_EXTRA_FILTER_KEYS = ['role'];

function normalizeUserLimitParam(value) {
  const numericLimit = Number(value ?? DEFAULT_USERS_PAGE_SIZE);

  return USER_PAGE_SIZE_OPTIONS.includes(numericLimit) ? numericLimit : DEFAULT_USERS_PAGE_SIZE;
}

function readUserFilters(searchParams) {
  return {
    ...readManagementListSearchParams(searchParams, { extraKeys: USER_LIST_EXTRA_FILTER_KEYS }),
    limit: normalizeUserLimitParam(searchParams.get('limit')),
  };
}

function buildUserSearchParams(currentFilters, nextValues) {
  const nextParams = buildManagementListSearchParams(currentFilters, nextValues, {
    extraKeys: USER_LIST_EXTRA_FILTER_KEYS,
  });
  const nextLimit = Object.prototype.hasOwnProperty.call(nextValues, 'limit')
    ? normalizeUserLimitParam(nextValues.limit)
    : normalizeUserLimitParam(currentFilters.limit);

  if (nextLimit !== DEFAULT_USERS_PAGE_SIZE) {
    nextParams.set('limit', String(nextLimit));
  }

  return nextParams;
}

function buildUsersQuery(filters) {
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

  params.set('page', String(normalizePageParam(filters.page)));
  params.set('limit', String(normalizeUserLimitParam(filters.limit)));

  return `/api/users?${params.toString()}`;
}

function selectUserListAdditionalState(payload) {
  return {
    summary: payload?.data?.summary ?? EMPTY_USER_SUMMARY,
  };
}

function buildFilterSummary(filters, shownCount, total) {
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
    return `Няма активни филтри. ${shownCount} показани от общо ${total} потребители.`;
  }

  return `${summaryParts.join(' · ')} · ${shownCount} показани от ${total} резултата.`;
}

export function AdminUsersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => readUserFilters(searchParams), [searchParams]);
  const updateFilters = useCallback(
    (nextValues) => {
      setSearchParams(buildUserSearchParams(filters, nextValues), { replace: true });
    },
    [filters, setSearchParams]
  );
  const commitSearchFilter = useCallback(
    (value) => updateFilters({ search: value }),
    [updateFilters]
  );
  const [searchDraft, setSearchDraft] = useDebouncedSearchFilter(
    filters.search,
    commitSearchFilter
  );
  const handlePageSync = useCallback((page) => updateFilters({ page }), [updateFilters]);
  const { pageState: listState, reload: reloadUsers } = usePaginatedManagementList({
    buildQuery: buildUsersQuery,
    defaultLimit: filters.limit,
    filters,
    onPageSync: handlePageSync,
    selectAdditionalState: selectUserListAdditionalState,
  });
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [createState, setCreateState] = useState({
    isSubmitting: false,
    feedback: createEmptyFeedback(),
  });

  const userSummary = listState.summary ?? EMPTY_USER_SUMMARY;
  const filterSummary = useMemo(
    () => buildFilterSummary(filters, listState.items.length, listState.total),
    [filters, listState.items.length, listState.total]
  );
  const hasActiveFilters = Boolean(filters.role || filters.status || filters.search);

  function handleFilterChange(fieldName, value) {
    updateFilters({ [fieldName]: value });
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    updateFilters({ search: searchDraft });
  }

  function handleClearFilters() {
    setSearchDraft('');
    updateFilters({
      role: '',
      status: '',
      search: '',
      page: 1,
    });
  }

  function handlePageChange(nextPage) {
    if (nextPage < 1 || nextPage === filters.page) {
      return;
    }

    updateFilters({ page: nextPage });
  }

  function handleCreateFieldChange(fieldName, value) {
    setCreateForm((currentValue) => ({
      ...currentValue,
      [fieldName]: value,
    }));
  }

  async function handleCreateSubmit(event) {
    event.preventDefault();

    if (createForm.password !== createForm.confirmPassword) {
      setCreateState({
        isSubmitting: false,
        feedback: createErrorFeedback('Паролата и потвърждението не съвпадат.'),
      });
      return;
    }

    try {
      setCreateState({
        isSubmitting: true,
        feedback: createEmptyFeedback(),
      });

      await postJson('/api/users/employees', createForm);

      setCreateForm(EMPTY_CREATE_FORM);
      setCreateState({
        isSubmitting: false,
        feedback: createSuccessFeedback('Новият служител е създаден успешно.'),
      });
      reloadUsers();
    } catch (error) {
      setCreateState({
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
          <p>Списък, филтри и действия.</p>
        </div>

        <div className="users-admin-hero-metrics">
          <div className="users-admin-metric-card">
            <strong>{listState.total}</strong>
            <span>резултати по текущите критерии</span>
          </div>
          <div className="users-admin-metric-card">
            <strong>{listState.items.length}</strong>
            <span>показани на тази страница</span>
          </div>
        </div>
      </section>

      <section className="users-admin-dashboard">
        <article className="route-card users-admin-overview-card">
          <p className="route-meta">Общо</p>
          <strong>{userSummary.total}</strong>
          <span>потребители в системата</span>
        </article>
        <article className="route-card users-admin-overview-card">
          <p className="route-meta">Активни</p>
          <strong>{userSummary.active}</strong>
          <span>активни потребители в системата</span>
        </article>
        <article className="route-card users-admin-overview-card">
          <p className="route-meta">Неактивни</p>
          <strong>{userSummary.inactive}</strong>
          <span>деактивирани профили</span>
        </article>
        <article className="route-card users-admin-overview-card">
          <p className="route-meta">Клиенти</p>
          <strong>{userSummary.clients}</strong>
          <span>клиентски профили</span>
        </article>
        <article className="route-card users-admin-overview-card">
          <p className="route-meta">Служители</p>
          <strong>{userSummary.employees}</strong>
          <span>служителски профили</span>
        </article>
        <article className="route-card users-admin-overview-card">
          <p className="route-meta">Администратори</p>
          <strong>{userSummary.admins}</strong>
          <span>администраторски профили</span>
        </article>
        <article className="route-card users-admin-context-card">
          <p className="route-meta">Текущ фокус</p>
          <h2>Текущ контекст</h2>
          <p>{filterSummary}</p>
          <span className="users-admin-context-hint">
            Управлението на конкретен профил се извършва от детайлната страница.
          </span>
        </article>
      </section>

      <section className="route-card users-admin-toolbar">
        <form className="users-admin-search" onSubmit={handleSearchSubmit}>
          <input
            type="search"
            value={searchDraft}
            placeholder="Търси по име, username или имейл"
            onChange={(event) => setSearchDraft(event.target.value)}
          />
          <button type="submit" className="app-primary-action" disabled={listState.isLoading}>
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

          {hasActiveFilters ? (
            <button type="button" className="app-secondary-action" onClick={handleClearFilters}>
              Изчисти
            </button>
          ) : null}
        </div>
      </section>

      <section className="users-admin-layout">
        <article className="route-card users-admin-list-card">
          <div className="users-admin-list-heading">
            <div>
              <p className="route-meta">Списък</p>
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
                className="app-primary-action"
                onClick={reloadUsers}
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
              {hasActiveFilters ? (
                <button type="button" className="app-secondary-action" onClick={handleClearFilters}>
                  Изчисти
                </button>
              ) : null}
            </div>
          ) : null}

          {!listState.error && !listState.isLoading && listState.items.length > 0 ? (
            <div
              id="admin-users-results-start"
              className="users-admin-list pagination-scroll-target"
            >
              {listState.items.map((user) => (
                <article key={user.id} className="users-admin-row">
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
                    <Link className="app-primary-action" to={`/admin/users/${user.id}`}>
                      Детайли
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          <PaginationControls
            pagination={listState.pagination}
            isLoading={listState.isLoading}
            onPageChange={handlePageChange}
            scrollTargetId="admin-users-results-start"
          />
        </article>

        <div className="users-admin-side">
          <article className="route-card users-admin-create-card">
            <div className="users-admin-detail-heading">
              <div>
                <p className="route-meta">Нов служител</p>
                <h2>Добави служител</h2>
              </div>
            </div>

            {createState.feedback.message ? (
              <div
                className={`feedback-message ${
                  createState.feedback.type === 'error'
                    ? 'feedback-message-error'
                    : 'feedback-message-info'
                }`}
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
                  maxLength={USER_FIRST_NAME_MAX_LENGTH}
                  onChange={(event) => handleCreateFieldChange('firstName', event.target.value)}
                  disabled={createState.isSubmitting}
                  required
                />
              </label>

              <label>
                <span>Фамилия</span>
                <input
                  type="text"
                  value={createForm.lastName}
                  maxLength={USER_LAST_NAME_MAX_LENGTH}
                  onChange={(event) => handleCreateFieldChange('lastName', event.target.value)}
                  disabled={createState.isSubmitting}
                  required
                />
              </label>

              <label>
                <span>Username</span>
                <input
                  type="text"
                  value={createForm.username}
                  minLength={USERNAME_MIN_LENGTH}
                  maxLength={USERNAME_MAX_LENGTH}
                  pattern={USERNAME_HTML_PATTERN}
                  title="Може да съдържа букви, цифри, точка, тире и долна черта."
                  autoComplete="username"
                  onChange={(event) => handleCreateFieldChange('username', event.target.value)}
                  disabled={createState.isSubmitting}
                  required
                />
              </label>

              <label>
                <span>Имейл</span>
                <input
                  type="email"
                  value={createForm.email}
                  maxLength={USER_EMAIL_MAX_LENGTH}
                  autoComplete="email"
                  onChange={(event) => handleCreateFieldChange('email', event.target.value)}
                  disabled={createState.isSubmitting}
                  required
                />
              </label>

              <label>
                <span>Парола</span>
                <input
                  type="password"
                  value={createForm.password}
                  minLength={USER_PASSWORD_MIN_LENGTH}
                  maxLength={USER_PASSWORD_MAX_LENGTH}
                  autoComplete="new-password"
                  onChange={(event) => handleCreateFieldChange('password', event.target.value)}
                  disabled={createState.isSubmitting}
                  required
                />
              </label>

              <label>
                <span>Потвърди парола</span>
                <input
                  type="password"
                  value={createForm.confirmPassword}
                  minLength={USER_PASSWORD_MIN_LENGTH}
                  maxLength={USER_PASSWORD_MAX_LENGTH}
                  autoComplete="new-password"
                  onChange={(event) => handleCreateFieldChange('confirmPassword', event.target.value)}
                  disabled={createState.isSubmitting}
                  required
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
                <button type="submit" className="app-primary-action" disabled={createState.isSubmitting}>
                  {createState.isSubmitting ? 'Създаване...' : 'Създай служител'}
                </button>
              </div>
            </form>
          </article>
        </div>
      </section>
    </main>
  );
}
