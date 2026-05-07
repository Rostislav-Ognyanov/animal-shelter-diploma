import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import {
  canManageAnimals,
  getRoleDescription,
  getRoleLabel,
  getRoleUiActions,
} from '../../auth/roleUi.js';
import { AnimalCard } from '../../components/animals/AnimalCard.jsx';
import { AnimalsListSkeleton } from '../../components/animals/AnimalsListSkeleton.jsx';
import { fetchApi } from '../../lib/api.js';
import {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  PAGE_SIZE,
  SIZE_OPTIONS,
  SORT_OPTIONS,
  SPECIES_OPTIONS,
  STATUS_OPTIONS,
  buildResultsSummary,
  mergeAnimalsRouteFilters,
  readFiltersFromParams,
  serializeAnimalsParams,
  serializeSearchRouteParams,
} from './animalsListQuery.js';

const PAGE_COPY = {
  animals: {
    meta: '',
    title: 'Списък с животни',
    description:
      'Разгледай наличните животни, филтрирай по вид, размер и статус и премини към подробната страница на всяко от тях.',
    totalLabel: 'общо съвпадения',
    pagesLabel: 'страници резултати',
    resultsTitle: 'Налични животни',
  },
  search: {
    meta: '',
    title: 'Животни',
    description:
      'Единна страница за търсене, филтриране, сортиране и странициране на животните в системата.',
    totalLabel: 'намерени резултати',
    pagesLabel: 'страници с резултати',
    resultsTitle: 'Налични животни',
  },
};

function buildEmptyPagination(total = 0) {
  return {
    page: 1,
    limit: PAGE_SIZE,
    total,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  };
}

export function AnimalsListPage({ role, variant = 'animals' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeFilters = useMemo(() => readFiltersFromParams(searchParams), [searchParams]);
  const normalizedRouteQuery = useMemo(
    () => serializeSearchRouteParams(activeFilters).toString(),
    [activeFilters]
  );
  const copy = PAGE_COPY[variant] ?? PAGE_COPY.animals;
  const [formValues, setFormValues] = useState(() => ({
    query: activeFilters.query,
    species: activeFilters.species,
    size: activeFilters.size,
    status: activeFilters.status,
  }));
  const [reloadToken, setReloadToken] = useState(0);
  const [animalsState, setAnimalsState] = useState({
    items: [],
    total: 0,
    pagination: buildEmptyPagination(),
    sort: DEFAULT_SORT,
    isLoading: true,
    error: '',
  });

  useEffect(() => {
    const currentQuery = searchParams.toString();

    if (currentQuery === normalizedRouteQuery) {
      return;
    }

    setSearchParams(serializeSearchRouteParams(activeFilters), { replace: true });
  }, [activeFilters, normalizedRouteQuery, searchParams, setSearchParams]);

  useEffect(() => {
    setFormValues({
      query: activeFilters.query,
      species: activeFilters.species,
      size: activeFilters.size,
      status: activeFilters.status,
    });
  }, [activeFilters.query, activeFilters.species, activeFilters.size, activeFilters.status]);

  useEffect(() => {
    let isMounted = true;

    async function loadAnimals() {
      try {
        setAnimalsState((currentValue) => ({
          ...currentValue,
          isLoading: true,
          error: '',
        }));

        const params = serializeAnimalsParams(activeFilters);
        const payload = await fetchApi(`/api/animals?${params.toString()}`);

        if (!isMounted) {
          return;
        }

        const total = payload.data?.total ?? 0;

        setAnimalsState({
          items: payload.data?.items ?? [],
          total,
          pagination: payload.meta?.pagination ?? buildEmptyPagination(total),
          sort: payload.meta?.sort ?? activeFilters.sort,
          isLoading: false,
          error: '',
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setAnimalsState((currentValue) => ({
          ...currentValue,
          sort: activeFilters.sort,
          isLoading: false,
          error:
            error.status === 503
              ? 'Животните временно не могат да се заредят. Провери връзката към базата данни или активирай mock fallback режима за разработка.'
              : error.message,
        }));
      }
    }

    loadAnimals();

    return () => {
      isMounted = false;
    };
  }, [activeFilters, reloadToken]);

  const resultsSummary = useMemo(
    () => buildResultsSummary(animalsState.total, activeFilters, animalsState.pagination),
    [activeFilters, animalsState.pagination, animalsState.total]
  );

  const hasManagementAccess = canManageAnimals(role);
  const roleLabel = getRoleLabel(role);
  const roleDescription = getRoleDescription(role);
  const roleUiActions = getRoleUiActions(role);
  const hasAppliedFilters = Boolean(
    activeFilters.query || activeFilters.species || activeFilters.size || activeFilters.status
  );
  const showInitialLoading = animalsState.isLoading && animalsState.items.length === 0;
  const showRefreshingState = animalsState.isLoading && animalsState.items.length > 0;
  const showEmptyState = !animalsState.isLoading && !animalsState.error && animalsState.items.length === 0;

  function updateRouteFilters(nextFilters, navigateOptions = {}) {
    setSearchParams(serializeSearchRouteParams(nextFilters), navigateOptions);
  }

  function handleFieldChange(field, value) {
    setFormValues((currentValue) => ({
      ...currentValue,
      [field]: value,
    }));
  }

  function handleSearchSubmit(event) {
    event.preventDefault();

    updateRouteFilters(
      mergeAnimalsRouteFilters(activeFilters, { query: formValues.query }, { resetPage: true })
    );
  }

  function handleFiltersSubmit(event) {
    event.preventDefault();

    updateRouteFilters(
      mergeAnimalsRouteFilters(
        activeFilters,
        {
          query: formValues.query,
          species: formValues.species,
          size: formValues.size,
          status: formValues.status,
        },
        { resetPage: true }
      )
    );
  }

  function handleClearFilters() {
    setFormValues({
      query: '',
      species: '',
      size: '',
      status: '',
    });

    updateRouteFilters({
      ...DEFAULT_FILTERS,
      sort: activeFilters.sort,
      page: 1,
    });
  }

  function handleSortChange(event) {
    updateRouteFilters(
      mergeAnimalsRouteFilters(activeFilters, { sort: event.target.value }, { resetPage: true })
    );
  }

  function handlePageChange(nextPage) {
    if (nextPage < 1 || nextPage === activeFilters.page) {
      return;
    }

    updateRouteFilters(mergeAnimalsRouteFilters(activeFilters, { page: nextPage }));
  }

  function handleRetryLoad() {
    setReloadToken((currentValue) => currentValue + 1);
  }

  return (
    <main className="route-shell animals-list-shell">
      <section className="animals-list-hero">
        <div>

          <h1>{copy.title}</h1>

        </div>

        <div className="animals-list-hero-aside">
          <div className="animals-list-highlight-card">
            <strong>{animalsState.total}</strong>
            <span>{copy.totalLabel}</span>
          </div>
          <div className="animals-list-highlight-card">
            <strong>{Math.max(animalsState.pagination.totalPages, 1)}</strong>
            <span>{copy.pagesLabel}</span>
          </div>
          <div className="animals-list-role-note">
            <strong>{roleLabel} интерфейс</strong>
            <span>{roleDescription}</span>
            <div className="animals-list-role-actions">
              {roleUiActions.map((action) => (
                <Link
                  key={`${action.to}-${action.label}`}
                  className={action.variant === 'primary' ? 'animals-primary-action' : 'animals-secondary-action'}
                  to={action.to}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="animals-toolbar-card">
        <form className="animals-toolbar-search" onSubmit={handleSearchSubmit}>
          <input
            type="search"
            name="query"
            placeholder="Търсене по име, порода или вид"
            value={formValues.query}
            onChange={(event) => handleFieldChange('query', event.target.value)}
          />
          <button type="submit" disabled={animalsState.isLoading && !showInitialLoading}>
            Търси
          </button>
        </form>

        <label className="animals-toolbar-sort">
          <span>Сортиране</span>
          <select value={activeFilters.sort} onChange={handleSortChange}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="animals-filters-card">
        <div className="animals-filters-heading">
          <h2>Филтри</h2>

        </div>

        <form className="animals-filters-form" onSubmit={handleFiltersSubmit}>
          <label>
            <span>Вид</span>
            <select
              value={formValues.species}
              onChange={(event) => handleFieldChange('species', event.target.value)}
            >
              {SPECIES_OPTIONS.map((option) => (
                <option key={option.value || 'all-species'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Размер</span>
            <select value={formValues.size} onChange={(event) => handleFieldChange('size', event.target.value)}>
              {SIZE_OPTIONS.map((option) => (
                <option key={option.value || 'all-sizes'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Статус</span>
            <select value={formValues.status} onChange={(event) => handleFieldChange('status', event.target.value)}>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || 'all-statuses'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="animals-filters-actions">
            <button type="submit" className="animals-primary-action">
              Приложи
            </button>
            <button type="button" className="animals-secondary-action" onClick={handleClearFilters}>
              Изчисти
            </button>
          </div>
        </form>
      </section>

      <section className="animals-list-results">
        <div className="animals-list-summary">
          <div>
            <h2>{copy.resultsTitle}</h2>
            <p>{resultsSummary}</p>
          </div>
          <span className="animals-summary-pill">
            {showInitialLoading ? 'Зареждане...' : `${animalsState.total} резултата`}
          </span>
        </div>

        {animalsState.error ? (
          <div className="animals-feedback-card animals-feedback-card-error" role="alert">
            <div>
              <strong>Не успяхме да заредим резултатите.</strong>
              <p>{animalsState.error}</p>
            </div>
            <div className="animals-feedback-actions">
              <button type="button" className="animals-primary-action" onClick={handleRetryLoad}>
                Опитай отново
              </button>
              {hasAppliedFilters ? (
                <button type="button" className="animals-secondary-action" onClick={handleClearFilters}>
                  Изчисти филтрите
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {showInitialLoading ? <AnimalsListSkeleton count={PAGE_SIZE} /> : null}

        {showRefreshingState ? (
          <div className="section-message animals-refresh-message">
            Обновяваме резултатите според новите критерии...
          </div>
        ) : null}

        {showEmptyState ? (
          <div className="animals-feedback-card animals-feedback-card-empty">
            <div>
              <strong>Няма намерени животни по тези критерии.</strong>
              <p>
                Опитай с по-широко търсене или изчисти част от филтрите, за да видиш повече налични записи.
              </p>
            </div>
            <div className="animals-feedback-actions">
              {hasAppliedFilters ? (
                <button type="button" className="animals-primary-action" onClick={handleClearFilters}>
                  Изчисти филтрите
                </button>
              ) : null}
              {hasManagementAccess ? (
                <Link className="animals-secondary-action" to="/animals/new">
                  Добави ново животно
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}

        {animalsState.items.length > 0 ? (
          <>
            <div className="animals-list-grid">
              {animalsState.items.map((animal) => (
                <AnimalCard key={animal.id} animal={animal} showManageLink={hasManagementAccess} />
              ))}
            </div>

            <div className="animals-pagination">
              <button
                type="button"
                className="animals-secondary-action"
                disabled={animalsState.isLoading || !animalsState.pagination.hasPreviousPage}
                onClick={() => handlePageChange(animalsState.pagination.page - 1)}
              >
                Предишна
              </button>

              <div className="animals-pagination-info">
                <strong>Страница {animalsState.pagination.page}</strong>
                <span>от {Math.max(animalsState.pagination.totalPages, 1)}</span>
              </div>

              <button
                type="button"
                className="animals-primary-action"
                disabled={animalsState.isLoading || !animalsState.pagination.hasNextPage}
                onClick={() => handlePageChange(animalsState.pagination.page + 1)}
              >
                Следваща
              </button>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}






