import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { useAuth } from '../../auth/AuthProvider.jsx';
import {
  buildEmptyPagination,
  PaginationControls,
} from '../../components/common/PaginationControls.jsx';
import { fetchApi } from '../../lib/api.js';
import {
  buildDonationListQuery,
  formatDonationAmount,
  formatDonationDate,
  getDonationDisplayName,
  getDonationManagementPath,
} from './donationUi.js';

const DONATIONS_PAGE_SIZE = 20;

function normalizePageParam(value) {
  const numericPage = Number(value ?? 1);
  return Number.isInteger(numericPage) && numericPage > 0 ? numericPage : 1;
}

function normalizeSearchParams(searchParams) {
  return {
    search: searchParams.get('search') || '',
    page: normalizePageParam(searchParams.get('page')),
  };
}

export function DonationsManagementPage() {
  const { role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [reloadToken, setReloadToken] = useState(0);
  const [pageState, setPageState] = useState({
    items: [],
    total: 0,
    pagination: buildEmptyPagination(DONATIONS_PAGE_SIZE),
    isLoading: true,
    error: '',
  });

  const filters = useMemo(() => normalizeSearchParams(searchParams), [searchParams]);
  const managementPath = useMemo(() => getDonationManagementPath(role), [role]);
  const secondaryPath = role === 'admin' ? '/admin/reports' : '/search';
  const secondaryLabel = role === 'admin' ? 'Отчети' : 'Към животните';

  useEffect(() => {
    let isMounted = true;

    async function loadDonations() {
      try {
        setPageState((currentValue) => ({ ...currentValue, isLoading: true, error: '' }));
        const payload = await fetchApi(
          `/api/donations${buildDonationListQuery(filters.search, filters.page, DONATIONS_PAGE_SIZE)}`
        );

        if (!isMounted) {
          return;
        }

        const pagination = payload.meta?.pagination ?? buildEmptyPagination(DONATIONS_PAGE_SIZE);

        setPageState({
          items: payload.data?.items ?? [],
          total: payload.data?.total ?? 0,
          pagination,
          isLoading: false,
          error: '',
        });
        const syncedPage = Number(pagination.page ?? filters.page);

        if (Number.isInteger(syncedPage) && syncedPage > 0 && syncedPage !== filters.page) {
          updatePageParam(syncedPage);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPageState({
          items: [],
          total: 0,
          pagination: buildEmptyPagination(DONATIONS_PAGE_SIZE),
          isLoading: false,
          error: error.message,
        });
      }
    }

    loadDonations();

    return () => {
      isMounted = false;
    };
  }, [filters.search, filters.page, reloadToken]);

  function updateSearch(value) {
    const nextParams = new URLSearchParams();

    if (value.trim()) {
      nextParams.set('search', value.trim());
    }

    setSearchParams(nextParams, { replace: true });
  }

  function updatePageParam(nextPage) {
    const nextParams = new URLSearchParams();

    if (filters.search.trim()) {
      nextParams.set('search', filters.search.trim());
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

    updatePageParam(nextPage);
  }

  return (
    <main className="route-shell donations-shell">
      <section className="donations-hero donations-hero-staff">
        <div>
                    <h1>Дарения</h1>
          <p>Преглед на даренията.</p>
        </div>

        <div className="donations-filters-card">
          <label>
            <span>Търсене</span>
            <input
              type="search"
              value={filters.search}
              placeholder="Име, имейл, телефон или съобщение"
              onChange={(event) => updateSearch(event.target.value)}
            />
          </label>
        </div>
      </section>

      <div className="route-actions">
        <Link className="animals-secondary-action" to="/donations">
          Към страницата за дарения
        </Link>
        <Link className="animals-primary-action" to={secondaryPath}>
          {secondaryLabel}
        </Link>
      </div>

      <section className="donations-card">
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
              className="animals-primary-action"
              onClick={() => setReloadToken((currentValue) => currentValue + 1)}
            >
              Опитай отново
            </button>
          </div>
        ) : null}

        {!pageState.isLoading && !pageState.error && pageState.items.length === 0 ? (
          <div className="adoptions-empty-state">
            <h2>Няма записани дарения</h2>
            <p>Когато има нови дарения, ще се покажат тук.</p>
          </div>
        ) : null}

        {!pageState.isLoading && !pageState.error && pageState.items.length > 0 ? (
          <div className="donations-table">
            {pageState.items.map((donation) => (
              <article key={donation.id} className="donations-table-row">
                <div>
                  <span className="donation-amount-pill">{formatDonationAmount(donation.amount)}</span>
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
                  <Link className="animals-secondary-action" to={`${managementPath}/${donation.id}`}>
                    Детайли
                  </Link>
                </div>
              </article>
            ))}
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




