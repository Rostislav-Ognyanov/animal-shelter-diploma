import { useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { useAuth } from '../../auth/AuthProvider.jsx';
import { PaginationControls } from '../../components/common/PaginationControls.jsx';
import { useDebouncedSearchFilter } from '../../hooks/useDebouncedSearchFilter.js';
import { usePaginatedManagementList } from '../../hooks/usePaginatedManagementList.js';
import {
  buildManagementListSearchParams,
  readManagementListSearchParams,
} from '../../lib/searchParams.js';
import {
  VOLUNTEER_STATUS_OPTIONS,
  buildVolunteerListQuery,
  formatVolunteerDate,
  getVolunteerDisplayName,
  getVolunteerManagementPath,
  getVolunteerPositionSummary,
  getVolunteerStatusGuidance,
  getVolunteerStatusLabel,
  isVolunteerTerminalStatus,
} from './volunteerUi.js';

const VOLUNTEER_APPLICATIONS_PAGE_SIZE = 10;

export function VolunteerApplicationsListPage() {
  const { role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => readManagementListSearchParams(searchParams), [searchParams]);
  const managementPath = useMemo(() => getVolunteerManagementPath(role), [role]);

  const updateFilters = useCallback(
    (nextValues) => {
      setSearchParams(buildManagementListSearchParams(filters, nextValues), { replace: true });
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
  const buildQuery = useCallback(
    (currentFilters) =>
      `/api/volunteers${buildVolunteerListQuery(
        currentFilters.status,
        currentFilters.search,
        currentFilters.page,
        VOLUNTEER_APPLICATIONS_PAGE_SIZE
      )}`,
    []
  );
  const { pageState, reload } = usePaginatedManagementList({
    buildQuery,
    defaultLimit: VOLUNTEER_APPLICATIONS_PAGE_SIZE,
    filters,
    onPageSync: handlePageSync,
  });
  const hasActiveFilters = Boolean(filters.status || filters.search);
  const dashboardPath = role === 'admin' ? '/admin' : '/staff';

  function handlePageChange(nextPage) {
    if (nextPage < 1 || nextPage === filters.page) {
      return;
    }

    updateFilters({ page: nextPage });
  }

  function handleClearFilters() {
    setSearchDraft('');
    updateFilters({
      status: '',
      search: '',
      page: 1,
    });
  }

  return (
    <main className="route-shell volunteers-shell">
      <section className="volunteers-hero">
        <div>
          <h1>Кандидатури за доброволчество</h1>
          <p>Преглед на входящите кандидатури за доброволчество.</p>
        </div>

        <div className="volunteers-filters-card">
          <label>
            <span>Статус</span>
            <select
              value={filters.status}
              onChange={(event) => updateFilters({ status: event.target.value })}
            >
              <option value="">Всички статуси</option>
              {VOLUNTEER_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Търсене</span>
            <input
              type="search"
              value={searchDraft}
              placeholder="Име, имейл или телефон"
              onChange={(event) => setSearchDraft(event.target.value)}
            />
          </label>

          {hasActiveFilters ? (
            <button type="button" className="app-secondary-action" onClick={handleClearFilters}>
              Изчисти
            </button>
          ) : null}
        </div>
      </section>

      <div className="route-actions">
        <Link className="app-secondary-action" to={dashboardPath}>
          Към таблото
        </Link>
      </div>

      <section className="volunteers-card">
        {pageState.isLoading ? (
          <div className="adoptions-empty-state">
            <h2>Зареждане на кандидатурите</h2>
            <p>Подготвяме списъка за преглед.</p>
          </div>
        ) : null}

        {pageState.error ? (
          <div className="adoptions-empty-state">
            <h2>Кандидатурите не могат да се заредят</h2>
            <p>{pageState.error}</p>
            <button
              type="button"
              className="app-primary-action"
              onClick={reload}
            >
              Опитай отново
            </button>
          </div>
        ) : null}

        {!pageState.isLoading && !pageState.error && pageState.items.length === 0 ? (
          <div className="adoptions-empty-state">
            <h2>{hasActiveFilters ? 'Няма кандидатури по избраните критерии' : 'Все още няма кандидатури'}</h2>
            <p>
              {hasActiveFilters
                ? 'Промени или изчисти филтрите.'
                : 'Новите кандидатури за доброволчество ще се покажат тук.'}
            </p>
            {hasActiveFilters ? (
              <button type="button" className="app-secondary-action" onClick={handleClearFilters}>
                Изчисти
              </button>
            ) : null}
          </div>
        ) : null}

        {!pageState.isLoading && !pageState.error && pageState.items.length > 0 ? (
          <div
            id="volunteer-applications-results-start"
            className="volunteers-table pagination-scroll-target"
          >
            {pageState.items.map((application) => (
              <article
                key={application.id}
                className={`volunteers-table-row${
                  isVolunteerTerminalStatus(application.status)
                    ? ' workflow-list-item--terminal'
                    : ''
                }`}
              >
                <div>
                  <span className={`volunteer-status is-${application.status}`}>
                    {getVolunteerStatusLabel(application.status)}
                  </span>
                  <h2>{getVolunteerDisplayName(application)}</h2>
                  <p>{application.email} • {application.phone}</p>
                  <p className="management-status-guidance">
                    {getVolunteerStatusGuidance(application.status)}
                  </p>
                  <p className="volunteer-positions-preview">Дейности: {getVolunteerPositionSummary(application)}</p>
                </div>

                <div>
                  <strong>Наличност</strong>
                  <span>{application.availability || 'Няма данни'}</span>
                </div>

                <div>
                  <strong>Подадена</strong>
                  <span>{formatVolunteerDate(application.createdAt)}</span>
                </div>

                <div className="adoptions-row-actions volunteers-row-actions">
                  <Link className="app-secondary-action" to={`${managementPath}/${application.id}`}>
                    Детайли
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        <PaginationControls
          pagination={pageState.pagination}
          isLoading={pageState.isLoading}
          onPageChange={handlePageChange}
          scrollTargetId="volunteer-applications-results-start"
        />
      </section>
    </main>
  );
}

