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
  RESCUE_REPORT_SPECIES_OPTIONS,
  RESCUE_REPORT_STATUS_OPTIONS,
  RESCUE_REPORT_URGENCY_OPTIONS,
  buildRescueReportListQuery,
  formatRescueReportDate,
  getRescueReportDisplayName,
  getRescueReportManagementPath,
  getRescueReportSpeciesLabel,
  getRescueReportStatusGuidance,
  getRescueReportStatusLabel,
  getRescueReportUrgencyLabel,
  isRescueReportTerminalStatus,
} from './rescueReportUi.js';

const RESCUE_REPORTS_PAGE_SIZE = 10;
const RESCUE_REPORT_FILTER_KEYS = ['urgency', 'species'];

export function RescueReportsManagementPage() {
  const { role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(
    () => readManagementListSearchParams(searchParams, { extraKeys: RESCUE_REPORT_FILTER_KEYS }),
    [searchParams]
  );
  const managementPath = useMemo(() => getRescueReportManagementPath(role), [role]);

  const updateFilters = useCallback(
    (nextValues) => {
      setSearchParams(
        buildManagementListSearchParams(filters, nextValues, { extraKeys: RESCUE_REPORT_FILTER_KEYS }),
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
      `/api/rescue-reports${buildRescueReportListQuery(
        currentFilters.status,
        currentFilters.search,
        currentFilters.page,
        RESCUE_REPORTS_PAGE_SIZE,
        currentFilters.urgency,
        currentFilters.species
      )}`,
    []
  );
  const { pageState, reload } = usePaginatedManagementList({
    buildQuery,
    defaultLimit: RESCUE_REPORTS_PAGE_SIZE,
    filters,
    onPageSync: handlePageSync,
  });
  const hasActiveFilters = Boolean(
    filters.status || filters.urgency || filters.species || filters.search
  );
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
      urgency: '',
      species: '',
      search: '',
      page: 1,
    });
  }

  return (
    <main className="route-shell rescue-shell">
      <section className="rescue-hero">
        <div>
          <h1>Сигнали за животни в нужда</h1>
          <p>Преглед на подадените публични сигнали.</p>
        </div>

        <div className="rescue-filters-card">
          <label>
            <span>Статус</span>
            <select
              value={filters.status}
              onChange={(event) => updateFilters({ status: event.target.value })}
            >
              <option value="">Всички статуси</option>
              {RESCUE_REPORT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Спешност</span>
            <select
              value={filters.urgency}
              onChange={(event) => updateFilters({ urgency: event.target.value })}
            >
              <option value="">Всички нива</option>
              {RESCUE_REPORT_URGENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Вид</span>
            <select
              value={filters.species}
              onChange={(event) => updateFilters({ species: event.target.value })}
            >
              <option value="">Всички видове</option>
              {RESCUE_REPORT_SPECIES_OPTIONS.map((option) => (
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
              placeholder="Име, имейл, телефон, място или описание"
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

      <section className="rescue-card">
        {pageState.isLoading ? (
          <div className="adoptions-empty-state">
            <h2>Зареждане на сигналите</h2>
            <p>Подготвяме списъка за преглед.</p>
          </div>
        ) : null}

        {pageState.error ? (
          <div className="adoptions-empty-state">
            <h2>Сигналите не могат да се заредят</h2>
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
            <h2>{hasActiveFilters ? 'Няма сигнали по избраните критерии' : 'Все още няма сигнали'}</h2>
            <p>
              {hasActiveFilters
                ? 'Промени или изчисти филтрите.'
                : 'Новите сигнали за животни в нужда ще се покажат тук.'}
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
            id="rescue-reports-results-start"
            className="rescue-table pagination-scroll-target"
          >
            {pageState.items.map((report) => (
              <article
                key={report.id}
                className={`rescue-table-row${
                  isRescueReportTerminalStatus(report.status)
                    ? ' workflow-list-item--terminal'
                    : ''
                }`}
              >
                <div>
                  <div className="rescue-row-badges">
                    <span className={`rescue-status is-${report.status}`}>{getRescueReportStatusLabel(report.status)}</span>
                    <span className={`rescue-urgency is-${report.urgency}`}>{getRescueReportUrgencyLabel(report.urgency)}</span>
                  </div>
                  <h2>{getRescueReportDisplayName(report)}</h2>
                  <p>{report.phone} • {report.location}</p>
                  <p className="management-status-guidance">{getRescueReportStatusGuidance(report.status)}</p>
                </div>

                <div>
                  <strong>Вид</strong>
                  <span>{getRescueReportSpeciesLabel(report.species)}</span>
                </div>

                <div>
                  <strong>Подаден</strong>
                  <span>{formatRescueReportDate(report.createdAt)}</span>
                </div>

                <div className="adoptions-row-actions rescue-row-actions">
                  <Link className="app-secondary-action" to={`${managementPath}/${report.id}`}>
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
          scrollTargetId="rescue-reports-results-start"
        />
      </section>
    </main>
  );
}


