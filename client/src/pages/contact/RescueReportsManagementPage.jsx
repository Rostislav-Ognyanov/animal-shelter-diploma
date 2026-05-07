import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { useAuth } from '../../auth/AuthProvider.jsx';
import { createEmptyFeedback, createErrorFeedback, createSuccessFeedback } from '../../lib/feedback.js';
import { fetchJson, patchJson } from '../../lib/api.js';
import {
  RESCUE_REPORT_STATUS_OPTIONS,
  buildRescueReportListQuery,
  formatRescueReportDate,
  getRescueReportDisplayName,
  getRescueReportManagementPath,
  getRescueReportSpeciesLabel,
  getRescueReportStatusGuidance,
  getRescueReportStatusLabel,
  getRescueReportUrgencyLabel,
} from './rescueReportUi.js';

function normalizeSearchParams(searchParams) {
  return {
    status: searchParams.get('status') || '',
    search: searchParams.get('search') || '',
  };
}

export function RescueReportsManagementPage() {
  const { role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [reloadToken, setReloadToken] = useState(0);
  const [pageState, setPageState] = useState({
    items: [],
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

        const payload = await fetchJson(
          `/api/rescue-reports${buildRescueReportListQuery(filters.status, filters.search)}`
        );

        if (!isMounted) {
          return;
        }

        setPageState({
          items: payload.items ?? [],
          isLoading: false,
          error: '',
        });
        setSelectedStatuses({});
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPageState({
          items: [],
          isLoading: false,
          error: error.message,
        });
      }
    }

    loadReports();

    return () => {
      isMounted = false;
    };
  }, [filters.search, filters.status, reloadToken]);

  function updateFilters(nextValues) {
    const nextParams = new URLSearchParams();
    const nextStatus = nextValues.status ?? filters.status;
    const nextSearch = nextValues.search ?? filters.search;

    if (nextStatus) {
      nextParams.set('status', nextStatus);
    }

    if (nextSearch.trim()) {
      nextParams.set('search', nextSearch.trim());
    }

    setSearchParams(nextParams, { replace: true });
  }

  async function handleStatusUpdate(report) {
    const nextStatus = selectedStatuses[report.id] || report.status;

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
      setSelectedStatuses((currentValue) => ({
        ...currentValue,
        [report.id]: updatedReport.status,
      }));
      setFeedback(
        createSuccessFeedback(
          `Сигналът на ${getRescueReportDisplayName(updatedReport)} е обновен на „${getRescueReportStatusLabel(updatedReport.status)}“.`
        )
      );
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
            {pageState.items.map((report) => (
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
                    value={selectedStatuses[report.id] ?? report.status}
                    disabled={submittingId === report.id}
                    onChange={(event) =>
                      setSelectedStatuses((currentValue) => ({
                        ...currentValue,
                        [report.id]: event.target.value,
                      }))
                    }
                  >
                    {RESCUE_REPORT_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="animals-primary-action"
                    disabled={submittingId === report.id}
                    onClick={() => handleStatusUpdate(report)}
                  >
                    {submittingId === report.id ? 'Запис...' : 'Запази'}
                  </button>
                  <Link className="animals-secondary-action" to={`${managementPath}/${report.id}`}>
                    Детайли
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}


