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
  buildDonationListQuery,
  DONATION_STATUS_FILTER_OPTIONS,
  formatDonationAmount,
  formatDonationDate,
  getDonationDisplayName,
  getDonationManagementPath,
  getDonationStatusLabel,
  isDonationTerminalStatus,
} from './donationUi.js';

const DONATIONS_PAGE_SIZE = 20;

export function DonationsManagementPage() {
  const { role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(
    () => readManagementListSearchParams(searchParams, { includeStatus: true }),
    [searchParams]
  );
  const managementPath = useMemo(() => getDonationManagementPath(role), [role]);
  const dashboardPath = role === 'admin' ? '/admin' : '/staff';

  const updateFilters = useCallback(
    (nextValues) => {
      setSearchParams(
        buildManagementListSearchParams(filters, nextValues, { includeStatus: true }),
        { replace: true }
      );
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
      `/api/donations${buildDonationListQuery(
        currentFilters.search,
        currentFilters.page,
        DONATIONS_PAGE_SIZE,
        currentFilters.status
      )}`,
    []
  );
  const { pageState, reload } = usePaginatedManagementList({
    buildQuery,
    defaultLimit: DONATIONS_PAGE_SIZE,
    filters,
    onPageSync: handlePageSync,
  });
  const hasActiveFilters = Boolean(filters.status || filters.search);

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
    <main className="route-shell donations-shell">
      <section className="donations-hero">
        <div>
                    <h1>Дарения</h1>
          <p>Преглед на даренията.</p>
        </div>

        <div className="donations-filters-card">
          <label>
            <span>Търсене</span>
              <input
                type="search"
              value={searchDraft}
              placeholder="Име, имейл, телефон или съобщение"
              onChange={(event) => setSearchDraft(event.target.value)}
            />
          </label>
          <label>
            <span>Статус</span>
            <select
              value={filters.status}
              onChange={(event) => updateFilters({ status: event.target.value })}
            >
              {DONATION_STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
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

      <div className="route-actions">
        <Link className="app-secondary-action" to={dashboardPath}>
          Към таблото
        </Link>
      </div>

      <section className="donations-card">
        {!pageState.isLoading && !pageState.error ? (
          <div className="donations-list-heading">
            <div>
              <p className="route-meta">{hasActiveFilters ? 'Резултати' : 'Общ списък'}</p>
              <h2>{hasActiveFilters ? 'Намерени дарения' : 'Всички дарения'}</h2>
            </div>
            <strong>
              {hasActiveFilters
                ? `Намерени: ${pageState.total} дарения`
                : `Общо дарения: ${pageState.total}`}
            </strong>
          </div>
        ) : null}

        {pageState.isLoading ? (
          <div className="adoptions-empty-state">
            <h2>Зареждане на даренията</h2>
            <p>Подготвяме списъка.</p>
          </div>
        ) : null}

        {pageState.error ? (
          <div className="adoptions-empty-state">
            <h2>Даренията не могат да се заредят</h2>
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
            <h2>{hasActiveFilters ? 'Няма дарения по избраните критерии' : 'Няма записани дарения'}</h2>
            <p>
              {hasActiveFilters
                ? 'Промени или изчисти филтрите.'
                : 'Когато има нови дарения, ще се покажат тук.'}
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
            id="donations-results-start"
            className="donations-table pagination-scroll-target"
          >
            {pageState.items.map((donation) => (
              <article
                key={donation.id}
                className={`donations-table-row${
                  isDonationTerminalStatus(donation.status)
                    ? ' workflow-list-item--terminal'
                    : ''
                }`}
              >
                <div>
                  <div className="donation-row-badges">
                    <span className="donation-amount-pill">{formatDonationAmount(donation.amount)}</span>
                    <span className={`donation-status is-${donation.status}`}>
                      {getDonationStatusLabel(donation.status)}
                    </span>
                  </div>
                  <h2>{getDonationDisplayName(donation)}</h2>
                  <p>{donation.email}{donation.phone ? ` • ${donation.phone}` : ''}</p>
                </div>

                <div>
                  <strong>Подадено</strong>
                  <span>{formatDonationDate(donation.createdAt)}</span>
                </div>

                <div>
                  <strong>Съобщение</strong>
                  <span>{donation.message ? 'Има съобщение' : 'Без съобщение'}</span>
                </div>

                <div className="adoptions-row-actions donations-row-actions">
                  <Link className="app-secondary-action" to={`${managementPath}/${donation.id}`}>
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
          scrollTargetId="donations-results-start"
        />
      </section>
    </main>
  );
}




