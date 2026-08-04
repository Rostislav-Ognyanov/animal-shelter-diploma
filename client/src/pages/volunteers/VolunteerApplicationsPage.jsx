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
  VOLUNTEER_STATUS_OPTIONS,
  buildVolunteerListQuery,
  formatVolunteerDate,
  getVolunteerDisplayName,
  getVolunteerManagementPath,
  getVolunteerPositionSummary,
  getVolunteerStatusGuidance,
  getVolunteerStatusLabel,
  getVolunteerStatusTransitionOptions,
} from './volunteerUi.js';

const VOLUNTEER_APPLICATIONS_PAGE_SIZE = 10;

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

export function VolunteerApplicationsPage() {
  const { role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [reloadToken, setReloadToken] = useState(0);
  const [pageState, setPageState] = useState({
    items: [],
    total: 0,
    pagination: buildEmptyPagination(VOLUNTEER_APPLICATIONS_PAGE_SIZE),
    isLoading: true,
    error: '',
  });
  const [selectedStatuses, setSelectedStatuses] = useState({});
  const [submittingId, setSubmittingId] = useState('');
  const [feedback, setFeedback] = useState(createEmptyFeedback());

  const filters = useMemo(() => normalizeSearchParams(searchParams), [searchParams]);
  const managementPath = useMemo(() => getVolunteerManagementPath(role), [role]);

  useEffect(() => {
    let isMounted = true;

    async function loadApplications() {
      try {
        setPageState((currentValue) => ({
          ...currentValue,
          isLoading: true,
          error: '',
        }));

        const payload = await fetchApi(
          `/api/volunteers${buildVolunteerListQuery(
            filters.status,
            filters.search,
            filters.page,
            VOLUNTEER_APPLICATIONS_PAGE_SIZE
          )}`
        );

        if (!isMounted) {
          return;
        }

        const pagination =
          payload.meta?.pagination ?? buildEmptyPagination(VOLUNTEER_APPLICATIONS_PAGE_SIZE);

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
          pagination: buildEmptyPagination(VOLUNTEER_APPLICATIONS_PAGE_SIZE),
          isLoading: false,
          error: error.message,
        });
      }
    }

    loadApplications();

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

  async function handleStatusUpdate(application) {
    const nextStatus = selectedStatuses[application.id];

    if (!nextStatus || nextStatus === application.status) {
      setFeedback(createErrorFeedback('Избери разрешен следващ статус преди запис.'));
      return;
    }

    try {
      setSubmittingId(application.id);
      setFeedback(createEmptyFeedback());
      const updatedApplication = await patchJson(`/api/volunteers/${application.id}/status`, {
        status: nextStatus,
        notes: application.notes || '',
      });

      setPageState((currentValue) => ({
        ...currentValue,
        items: currentValue.items.map((item) =>
          item.id === application.id ? { ...item, ...updatedApplication } : item
        ),
      }));
      setSelectedStatuses((currentValue) => {
        const nextValue = { ...currentValue };
        delete nextValue[application.id];
        return nextValue;
      });
      setFeedback(
        createSuccessFeedback(
          `Кандидатурата на ${getVolunteerDisplayName(updatedApplication)} е обновена на „${getVolunteerStatusLabel(updatedApplication.status)}“.`
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
    <main className="route-shell volunteers-shell">
      <section className="volunteers-hero volunteers-hero-staff">
        <div>
                    <h1>Кандидатури за доброволчество</h1>
          <p>Преглед и одобрение на входящите кандидатури.</p>
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
              value={filters.search}
              placeholder="Име, имейл или телефон"
              onChange={(event) => updateFilters({ search: event.target.value })}
            />
          </label>
        </div>
      </section>

      <div className="route-actions">
        <Link className="animals-secondary-action" to="/volunteers">
          Към формата за кандидатстване
        </Link>
        <Link className="animals-primary-action" to="/search">
          Към животните
        </Link>
      </div>

      {feedback.message ? (
        <div className={`auth-status ${feedback.type === 'error' ? 'auth-status-error' : 'auth-status-info'}`}>
          {feedback.message}
        </div>
      ) : null}

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
              className="animals-primary-action"
              onClick={() => setReloadToken((currentValue) => currentValue + 1)}
            >
              Опитай отново
            </button>
          </div>
        ) : null}

        {!pageState.isLoading && !pageState.error && pageState.items.length === 0 ? (
          <div className="adoptions-empty-state">
            <h2>Няма кандидатури за избрания филтър</h2>
            <p>Промени филтъра или изчакай нови кандидатури.</p>
          </div>
        ) : null}

        {!pageState.isLoading && !pageState.error && pageState.items.length > 0 ? (
          <div className="volunteers-table">
            {pageState.items.map((application) => {
              const transitionOptions = getVolunteerStatusTransitionOptions(
                application.status,
                application.allowedStatusTransitions
              );
              const hasTransitionOptions = transitionOptions.length > 0;

              return (
              <article key={application.id} className="volunteers-table-row">
                <div>
                  <span className={`volunteer-status is-${application.status}`}>
                    {getVolunteerStatusLabel(application.status)}
                  </span>
                  <h2>{getVolunteerDisplayName(application)}</h2>
                  <p>{application.email} • {application.phone}</p>
                  <p className="adoption-request-guidance">
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
                  <select
                    value={selectedStatuses[application.id] ?? ''}
                    disabled={!hasTransitionOptions || submittingId === application.id}
                    onChange={(event) =>
                      setSelectedStatuses((currentValue) => ({
                        ...currentValue,
                        [application.id]: event.target.value,
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
                    disabled={!hasTransitionOptions || submittingId === application.id}
                    onClick={() => handleStatusUpdate(application)}
                  >
                    {submittingId === application.id ? 'Запис...' : 'Запази'}
                  </button>
                  <Link className="animals-secondary-action" to={`${managementPath}/${application.id}`}>
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


