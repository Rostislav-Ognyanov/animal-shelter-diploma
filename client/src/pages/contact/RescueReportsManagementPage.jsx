import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { useAuth } from '../../auth/AuthProvider.jsx';
import {
  buildEmptyPagination,
  PaginationControls,
} from '../../components/common/PaginationControls.jsx';
import { createEmptyFeedback, createErrorFeedback, createSuccessFeedback } from '../../lib/feedback.js';
import { fetchApi, patchJson } from '../../lib/api.js';
import {
  RESCUE_REPORT_STATUS_OPTIONS,
  buildRescueReportListQuery,
  formatRescueReportDate,
  getRescueReportDisplayName,
  getRescueReportManagementPath,
  getRescueReportSpeciesLabel,
  getRescueReportStatusGuidance,
  getRescueReportStatusLabel,
  getRescueReportStatusTransitionOptions,
  getRescueReportUrgencyLabel,
} from './rescueReportUi.js';

const RESCUE_REPORTS_PAGE_SIZE = 10;

function normalizePageParam(value) {
  const numericPage = Number(value ?? 1);
  return Number.isInteger(numericPage) && numericPage > 0 ? numericPage : 1;
}

function normalizeSearchParams(searchParams) {
  return {
    status: searchParams.get('status') || '',
    search: searchParams.get('search') || '',
    page: normalizePageParam(searchParams.get('page')),
  };
}

export function RescueReportsManagementPage() {
  const { role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [reloadToken, setReloadToken] = useState(0);
  const [pageState, setPageState] = useState({
    items: [],
    total: 0,
    pagination: buildEmptyPagination(RESCUE_REPORTS_PAGE_SIZE),
    isLoading: true,
    error: '',
  });
  const [selectedStatuses, setSelectedStatuses] = useState({});
  const [submittingId, setSubmittingId] = useState('');
  const [feedback, setFeedback] = useState(createEmptyFeedback());

  const filters = useMemo(() => normalizeSearchParams(searchParams), [searchParams]);
  const managementPath = useMemo(() => getRescueReportManagementPath(role), [role]);

  useEffect(() => {
    let isMounted = true;

    async function loadReports() {
      try {
        setPageState((currentValue) => ({
          ...currentValue,
          isLoading: true,
          error: '',
        }));

        const payload = await fetchApi(
          `/api/rescue-reports${buildRescueReportListQuery(
            filters.status,
            filters.search,
            filters.page,
            RESCUE_REPORTS_PAGE_SIZE
          )}`
        );

        if (!isMounted) {
          return;
        }

        const pagination =
          payload.meta?.pagination ?? buildEmptyPagination(RESCUE_REPORTS_PAGE_SIZE);

        setPageState({
          items: payload.data?.items ?? [],
          total: payload.data?.total ?? 0,
          pagination,
          isLoading: false,
          error: '',
        });
        const syncedPage = Number(pagination.page ?? filters.page);

        if (Number.isInteger(syncedPage) && syncedPage > 0 && syncedPage !== filters.page) {
          updateFilters({ page: syncedPage });
        }
        setSelectedStatuses({});
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPageState({
          items: [],
          total: 0,
          pagination: buildEmptyPagination(RESCUE_REPORTS_PAGE_SIZE),
          isLoading: false,
          error: error.message,
        });
      }
    }

    loadReports();

    return () => {
      isMounted = false;
    };
  }, [filters.search, filters.status, filters.page, reloadToken]);

  function updateFilters(nextValues) {
    const nextParams = new URLSearchParams();
    const nextStatus = nextValues.status ?? filters.status;
    const nextSearch = nextValues.search ?? filters.search;
    const nextPage = Object.prototype.hasOwnProperty.call(nextValues, 'page')
      ? normalizePageParam(nextValues.page)
      : 1;

    if (nextStatus) {
      nextParams.set('status', nextStatus);
    }

    if (nextSearch.trim()) {
      nextParams.set('search', nextSearch.trim());
    }

    if (nextPage > 1) {
      nextParams.set('page', String(nextPage));
    }

    setSearchParams(nextParams, { replace: true });
  }

  function handlePageChange(nextPage) {
    if (nextPage < 1 || nextPage === filters.page) {
      return;
    }

    updateFilters({ page: nextPage });
  }

  async function handleStatusUpdate(report) {
    const nextStatus = selectedStatuses[report.id];

    if (!nextStatus || nextStatus === report.status) {
      setFeedback(createErrorFeedback('Избери разрешен следващ статус преди запис.'));
      return;
    }

    try {
      setSubmittingId(report.id);
      setFeedback(createEmptyFeedback());
      const updatedReport = await patchJson(`/api/rescue-reports/${report.id}/status`, {
        status: nextStatus,
        notes: report.notes || '',
      });

      setPageState((currentValue) => ({
        ...currentValue,
        items: currentValue.items.map((item) => (item.id === report.id ? { ...item, ...updatedReport } : item)),
      }));
      setSelectedStatuses((currentValue) => {
        const nextValue = { ...currentValue };
        delete nextValue[report.id];
        return nextValue;
      });
      setFeedback(
        createSuccessFeedback(
          `Сигналът на ${getRescueReportDisplayName(updatedReport)} е обновен на „${getRescueReportStatusLabel(updatedReport.status)}“.`
        )
      );
      setReloadToken((currentValue) => currentValue + 1);
    } catch (error) {
      setFeedback(createErrorFeedback(error.message));
    } finally {
      setSubmittingId('');
    }
  }

  return (
    <main className="route-shell rescue-shell">
      <section className="rescue-hero rescue-hero-staff">
        <div>
                    <h1>Сигнали за животни в нужда</h1>
          <p>Преглед и обработка на подадените публични сигнали.</p>
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
            <span>Търсене</span>
            <input
              type="search"
              value={filters.search}
              placeholder="Име, телефон, място или описание"
              onChange={(event) => updateFilters({ search: event.target.value })}
            />
          </label>
        </div>
      </section>

      <div className="route-actions">
        <Link className="animals-secondary-action" to="/svurji-se-s-nas">
          Към формата за сигнал
        </Link>
        <Link className="animals-primary-action" to={role === 'admin' ? '/admin/reports' : '/search'}>
          {role === 'admin' ? 'Отчети' : 'Към животните'}
        </Link>
      </div>

      {feedback.message ? (
        <div className={`auth-status ${feedback.type === 'error' ? 'auth-status-error' : 'auth-status-info'}`}>
          {feedback.message}
        </div>
      ) : null}

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
              className="animals-primary-action"
              onClick={() => setReloadToken((currentValue) => currentValue + 1)}
            >
              Опитай отново
            </button>
          </div>
        ) : null}

        {!pageState.isLoading && !pageState.error && pageState.items.length === 0 ? (
          <div className="adoptions-empty-state">
            <h2>Няма сигнали за избрания филтър</h2>
            <p>Промени филтъра или изчакай нови сигнали.</p>
          </div>
        ) : null}

        {!pageState.isLoading && !pageState.error && pageState.items.length > 0 ? (
          <div className="rescue-table">
            {pageState.items.map((report) => {
              const transitionOptions = getRescueReportStatusTransitionOptions(
                report.status,
                report.allowedStatusTransitions
              );
              const hasTransitionOptions = transitionOptions.length > 0;

              return (
              <article key={report.id} className="rescue-table-row">
                <div>
                  <div className="rescue-row-badges">
                    <span className={`rescue-status is-${report.status}`}>{getRescueReportStatusLabel(report.status)}</span>
                    <span className={`rescue-urgency is-${report.urgency}`}>{getRescueReportUrgencyLabel(report.urgency)}</span>
                  </div>
                  <h2>{getRescueReportDisplayName(report)}</h2>
                  <p>{report.phone} • {report.location}</p>
                  <p className="adoption-request-guidance">{getRescueReportStatusGuidance(report.status)}</p>
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
                  <select
                    value={selectedStatuses[report.id] ?? ''}
                    disabled={!hasTransitionOptions || submittingId === report.id}
                    onChange={(event) =>
                      setSelectedStatuses((currentValue) => ({
                        ...currentValue,
                        [report.id]: event.target.value,
                      }))
                    }
                  >
                    <option value="">{hasTransitionOptions ? 'Нов статус' : 'Няма преходи'}</option>
                    {transitionOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="animals-primary-action"
                    disabled={!hasTransitionOptions || submittingId === report.id}
                    onClick={() => handleStatusUpdate(report)}
                  >
                    {submittingId === report.id ? 'Запис...' : 'Запази'}
                  </button>
                  <Link className="animals-secondary-action" to={`${managementPath}/${report.id}`}>
                    Детайли
                  </Link>
                </div>
              </article>
              );
            })}
          </div>
        ) : null}

        {!pageState.isLoading && !pageState.error && pageState.items.length > 0 ? (
          <PaginationControls
            pagination={pageState.pagination}
            isLoading={pageState.isLoading}
            onPageChange={handlePageChange}
          />
        ) : null}
      </section>
    </main>
  );
}


