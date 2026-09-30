import { useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { useAuth } from '../../auth/AuthProvider.jsx';
import { PaginationControls } from '../../components/common/PaginationControls.jsx';
import { usePaginatedManagementList } from '../../hooks/usePaginatedManagementList.js';
import { useDebouncedSearchFilter } from '../../hooks/useDebouncedSearchFilter.js';
import {
  buildManagementListSearchParams,
  readManagementListSearchParams,
} from '../../lib/searchParams.js';
import {
  ADOPTION_STATUS_OPTIONS,
  buildAdoptionListQuery,
  formatAdoptionDate,
  getAdoptionStatusGuidance,
  getAdoptionStatusLabel,
  getAnimalDisplayName,
  getUserDisplayName,
  isAdoptionTerminalStatus,
} from './adoptionUi.js';

const ADOPTION_REQUESTS_PAGE_SIZE = 20;

export function AdoptionRequestsListPage() {
  const { role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => readManagementListSearchParams(searchParams), [searchParams]);

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
      `/api/adoptions${buildAdoptionListQuery(
        currentFilters.status,
        currentFilters.page,
        ADOPTION_REQUESTS_PAGE_SIZE,
        currentFilters.search
      )}`,
    []
  );
  const { pageState, reload } = usePaginatedManagementList({
    buildQuery,
    defaultLimit: ADOPTION_REQUESTS_PAGE_SIZE,
    filters,
    onPageSync: handlePageSync,
  });
  const hasActiveFilters = Boolean(filters.status || filters.search);
  const dashboardPath = role === 'admin' ? '/admin' : '/staff';

  function handleStatusFilterChange(value) {
    updateFilters({ status: value });
  }

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
    <main className="route-shell adoptions-shell">
      <section className="adoptions-hero">
        <div>
          <h1>Заявки за осиновяване</h1>
          <p>Филтър, търсене и преглед на входящите заявки.</p>
        </div>

        <div className="adoptions-filters-card">
          <label className="adoptions-filter">
            Филтър по статус
            <select value={filters.status} onChange={(event) => handleStatusFilterChange(event.target.value)}>
              <option value="">Всички статуси</option>
              {ADOPTION_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="adoptions-filter">
            Търсене
            <input
              type="search"
              value={searchDraft}
              placeholder="Клиент, имейл, телефон или животно"
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
        <Link className="app-primary-action" to="/animals/new">
          Добави животно
        </Link>
        <Link className="app-secondary-action" to={dashboardPath}>
          Към таблото
        </Link>
      </div>

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
              className="app-primary-action"
              onClick={reload}
            >
              Опитай отново
            </button>
          </div>
        ) : null}

        {!pageState.isLoading && !pageState.error && pageState.items.length === 0 ? (
          <div className="adoptions-empty-state">
            <h2>{hasActiveFilters ? 'Няма заявки по избраните критерии' : 'Все още няма заявки'}</h2>
            <p>
              {hasActiveFilters
                ? 'Промени или изчисти филтрите.'
                : 'Новите заявки за осиновяване ще се покажат тук.'}
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
            id="adoption-requests-results-start"
            className="adoptions-table pagination-scroll-target"
          >
            {pageState.items.map((request) => (
              <article
                key={request.id}
                className={`adoptions-table-row${
                  isAdoptionTerminalStatus(request.status)
                    ? ' workflow-list-item--terminal'
                    : ''
                }`}
              >
                <div>
                  <span className={`adoption-status is-${request.status}`}>
                    {getAdoptionStatusLabel(request.status)}
                  </span>
                  <h2>{getAnimalDisplayName(request.animal)}</h2>
                  <p>
                    {request.animal?.speciesLabel || request.animal?.species} • {request.animal?.breed}
                  </p>
                  <p className="management-status-guidance">
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
                  <Link className="app-secondary-action" to={`/adoptions/${request.id}`}>
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
          scrollTargetId="adoption-requests-results-start"
        />
      </section>
    </main>
  );
}
