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
  CONTACT_INQUIRY_STATUS_OPTIONS,
  CONTACT_INQUIRY_TYPE_OPTIONS,
  buildContactInquiryListQuery,
  formatContactInquiryDate,
  getContactInquiryDisplayName,
  getContactInquiryManagementPath,
  getContactInquiryStatusGuidance,
  getContactInquiryStatusLabel,
  getContactInquirySubjectLabel,
  getContactInquiryTypeLabel,
  isContactInquiryTerminalStatus,
} from './contactInquiryUi.js';

const CONTACT_INQUIRIES_PAGE_SIZE = 10;
const CONTACT_INQUIRY_FILTER_KEYS = ['type'];

export function ContactInquiriesListPage() {
  const { role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(
    () => readManagementListSearchParams(searchParams, { extraKeys: CONTACT_INQUIRY_FILTER_KEYS }),
    [searchParams]
  );
  const managementPath = useMemo(() => getContactInquiryManagementPath(role), [role]);

  const updateFilters = useCallback(
    (nextValues) => {
      setSearchParams(
        buildManagementListSearchParams(filters, nextValues, {
          extraKeys: CONTACT_INQUIRY_FILTER_KEYS,
        }),
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
      `/api/contact-inquiries${buildContactInquiryListQuery(
        currentFilters.type,
        currentFilters.status,
        currentFilters.search,
        currentFilters.page,
        CONTACT_INQUIRIES_PAGE_SIZE
      )}`,
    []
  );
  const { pageState, reload } = usePaginatedManagementList({
    buildQuery,
    defaultLimit: CONTACT_INQUIRIES_PAGE_SIZE,
    filters,
    onPageSync: handlePageSync,
  });
  const hasActiveFilters = Boolean(filters.type || filters.status || filters.search);
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
      type: '',
      status: '',
      search: '',
      page: 1,
    });
  }

  return (
    <main className="route-shell rescue-shell">
      <section className="rescue-hero">
        <div>
          <h1>Запитвания от контактната страница</h1>
          <p>Преглед на въпроси за осиновяване, специална грижа, доброволчество, дарения и обща връзка.</p>
        </div>

        <div className="rescue-filters-card">
          <label>
            <span>Тип</span>
            <select value={filters.type} onChange={(event) => updateFilters({ type: event.target.value })}>
              <option value="">Всички типове</option>
              {CONTACT_INQUIRY_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Статус</span>
            <select
              value={filters.status}
              onChange={(event) => updateFilters({ status: event.target.value })}
            >
              <option value="">Всички статуси</option>
              {CONTACT_INQUIRY_STATUS_OPTIONS.map((option) => (
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
              placeholder="Име, имейл, телефон или описание"
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
            <h2>Зареждане на запитванията</h2>
            <p>Подготвяме списъка за преглед.</p>
          </div>
        ) : null}

        {pageState.error ? (
          <div className="adoptions-empty-state">
            <h2>Запитванията не могат да се заредят</h2>
            <p>{pageState.error}</p>
            <button type="button" className="app-primary-action" onClick={reload}>
              Опитай отново
            </button>
          </div>
        ) : null}

        {!pageState.isLoading && !pageState.error && pageState.items.length === 0 ? (
          <div className="adoptions-empty-state">
            <h2>{hasActiveFilters ? 'Няма запитвания по избраните критерии' : 'Все още няма запитвания'}</h2>
            <p>
              {hasActiveFilters
                ? 'Промени или изчисти филтрите.'
                : 'Новите запитвания ще се покажат тук.'}
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
            id="contact-inquiries-results-start"
            className="rescue-table pagination-scroll-target"
          >
            {pageState.items.map((inquiry) => (
              <article
                key={inquiry.id}
                className={`rescue-table-row${
                  isContactInquiryTerminalStatus(inquiry.status)
                    ? ' workflow-list-item--terminal'
                    : ''
                }`}
              >
                <div>
                  <div className="rescue-row-badges">
                    <span className={`rescue-status is-${inquiry.status}`}>
                      {getContactInquiryStatusLabel(inquiry.status)}
                    </span>
                    <span className="rescue-urgency is-medium">{getContactInquiryTypeLabel(inquiry.type)}</span>
                  </div>
                  <h2>{getContactInquiryDisplayName(inquiry)}</h2>
                  <p>{inquiry.email} • {inquiry.phone || 'Няма телефон'}</p>
                  <p className="management-status-guidance">{getContactInquiryStatusGuidance(inquiry.status)}</p>
                </div>

                <div>
                  <strong>Тема</strong>
                  <span>
                    {getContactInquirySubjectLabel(inquiry.type, inquiry.subject) || 'Няма тема'}
                  </span>
                </div>

                <div>
                  <strong>Подадено</strong>
                  <span>{formatContactInquiryDate(inquiry.createdAt)}</span>
                </div>

                <div className="adoptions-row-actions rescue-row-actions">
                  <Link className="app-secondary-action" to={`${managementPath}/${inquiry.id}`}>
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
          scrollTargetId="contact-inquiries-results-start"
        />
      </section>
    </main>
  );
}
