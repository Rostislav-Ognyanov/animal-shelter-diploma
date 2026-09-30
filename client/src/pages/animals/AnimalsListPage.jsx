import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { canManageAnimals } from '../../auth/roleUi.js';
import { AnimalCard } from '../../components/animals/AnimalCard.jsx';
import { AnimalsListSkeleton } from '../../components/animals/AnimalsListSkeleton.jsx';
import { PaginationControls } from '../../components/common/PaginationControls.jsx';
import { fetchApiResponse } from '../../lib/api.js';
import { buildPublicAssetPath } from '../../lib/publicAssetPath.js';
import {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  GENDER_OPTIONS,
  PAGE_SIZE,
  PUBLIC_STATUS_OPTIONS,
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

const MANAGEMENT_PAGE_COPY = {
  title: 'Списък с животни',
  totalLabel: 'общо съвпадения',
  pagesLabel: 'страници резултати',
  resultsTitle: 'Налични животни',
};

const PUBLIC_ADOPTION_PAGE_COPY = {
  title: 'Открий животно',
  totalLabel: 'намерени резултати',
  pagesLabel: 'страници с резултати',
  resultsTitle: 'Животни в приюта',
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

export function AnimalsListPage({ role }) {
  const [searchParams, setSearchParams] = useSearchParams();
  // URL parameters are the source of truth so filters survive refreshes
  // and can be shared as a link.
  const activeFilters = useMemo(() => readFiltersFromParams(searchParams), [searchParams]);
  const hasManagementAccess = canManageAnimals(role);
  const isAdoptionView = !hasManagementAccess;
  const routeFilters = useMemo(
    () =>
      isAdoptionView &&
      activeFilters.status &&
      !PUBLIC_STATUS_OPTIONS.some((option) => option.value === activeFilters.status)
        ? { ...activeFilters, status: '' }
        : activeFilters,
    [activeFilters, isAdoptionView]
  );
  const effectiveFilters = routeFilters;
  const normalizedRouteQuery = useMemo(
    () => serializeSearchRouteParams(routeFilters).toString(),
    [routeFilters]
  );
  const copy = isAdoptionView ? PUBLIC_ADOPTION_PAGE_COPY : MANAGEMENT_PAGE_COPY;
  const showHeroAside = hasManagementAccess;
  const [formValues, setFormValues] = useState(() => ({
    query: routeFilters.query,
    species: routeFilters.species,
    gender: routeFilters.gender,
    size: routeFilters.size,
    status: routeFilters.status,
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

    setSearchParams(serializeSearchRouteParams(routeFilters), { replace: true });
  }, [normalizedRouteQuery, routeFilters, searchParams, setSearchParams]);

  useEffect(() => {
    setFormValues({
      query: routeFilters.query,
      species: routeFilters.species,
      gender: routeFilters.gender,
      size: routeFilters.size,
      status: routeFilters.status,
    });
  }, [routeFilters.query, routeFilters.species, routeFilters.gender, routeFilters.size, routeFilters.status]);

  useEffect(() => {
    let isMounted = true;

    async function loadAnimals() {
      try {
        // Keep previous results visible during refetch to avoid UI flicker when filters change.
        setAnimalsState((currentValue) => ({
          ...currentValue,
          isLoading: true,
          error: '',
        }));

        const params = serializeAnimalsParams(effectiveFilters);
        const payload = await fetchApiResponse(`/api/animals?${params.toString()}`);

        if (!isMounted) {
          return;
        }

        const total = payload.data?.total ?? 0;
        const pagination = payload.meta?.pagination ?? buildEmptyPagination(total);

        setAnimalsState({
          items: payload.data?.items ?? [],
          total,
          pagination,
          sort: payload.meta?.sort ?? effectiveFilters.sort,
          isLoading: false,
          error: '',
        });

        const syncedPage = Number(pagination.page ?? routeFilters.page);

        if (Number.isInteger(syncedPage) && syncedPage > 0 && syncedPage !== routeFilters.page) {
          updateRouteFilters(
            mergeAnimalsRouteFilters(routeFilters, { page: syncedPage }),
            { replace: true }
          );
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setAnimalsState((currentValue) => ({
          ...currentValue,
          sort: effectiveFilters.sort,
          isLoading: false,
          error:
            error.status === 503
              ? 'Животните временно не могат да се заредят. Опитай отново след малко.'
              : error.message,
        }));
      }
    }

    loadAnimals();

    return () => {
      isMounted = false;
    };
  }, [effectiveFilters, reloadToken]);

  const resultsSummary = useMemo(
    () => buildResultsSummary(animalsState.total, routeFilters, animalsState.pagination),
    [routeFilters, animalsState.pagination, animalsState.total]
  );

  const hasAppliedFilters = Boolean(
    routeFilters.query || routeFilters.species || routeFilters.gender || routeFilters.size || routeFilters.status
  );
  const showInitialLoading = animalsState.isLoading && animalsState.items.length === 0;
  const showRefreshingState = animalsState.isLoading && animalsState.items.length > 0;
  const showEmptyState = !animalsState.isLoading && !animalsState.error && animalsState.items.length === 0;
  const emptyStateTitle = isAdoptionView
    ? 'В момента няма животни, които да съвпадат напълно с избраните критерии.'
    : 'Няма намерени животни по тези критерии.';
  const emptyStateDescription = isAdoptionView
    ? 'Опитай с по-широко търсене или изчисти част от филтрите, за да разгледаш повече животни в приюта.'
    : 'Опитай с по-широко търсене или изчисти част от филтрите, за да видиш повече налични записи.';

  function updateRouteFilters(nextFilters, navigateOptions = {}) {
    const normalizedNextFilters =
      isAdoptionView &&
      nextFilters.status &&
      !PUBLIC_STATUS_OPTIONS.some((option) => option.value === nextFilters.status)
        ? { ...nextFilters, status: '' }
        : nextFilters;
    setSearchParams(serializeSearchRouteParams(normalizedNextFilters), navigateOptions);
  }

  function handleFieldChange(field, value) {
    setFormValues((currentValue) => ({
      ...currentValue,
      [field]: value,
    }));
  }

  function handleFiltersSubmit(event) {
    event.preventDefault();

    updateRouteFilters(
      mergeAnimalsRouteFilters(
        routeFilters,
        {
          query: formValues.query,
          species: formValues.species,
          gender: formValues.gender,
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
      gender: '',
      size: '',
      status: '',
    });

    updateRouteFilters({
      ...DEFAULT_FILTERS,
      sort: routeFilters.sort,
      page: 1,
    });
  }

  function handleSortChange(event) {
    updateRouteFilters(
      mergeAnimalsRouteFilters(routeFilters, { sort: event.target.value }, { resetPage: true })
    );
  }

  function handlePageChange(nextPage) {
    if (nextPage < 1 || nextPage === routeFilters.page) {
      return;
    }

    updateRouteFilters(mergeAnimalsRouteFilters(routeFilters, { page: nextPage }));
  }

  function handleRetryLoad() {
    setReloadToken((currentValue) => currentValue + 1);
  }

  return (
    <main className={`route-shell animals-list-shell${isAdoptionView ? ' adoption-page-shell' : ''}`}>
      <section className={`animals-list-hero${isAdoptionView ? ' adoption-page-hero' : ''}`}>
        <div>
          <h1>{copy.title}</h1>
        </div>

        {showHeroAside ? (
          <div className="animals-list-hero-aside">
            <div className="animals-list-highlight-card">
              <strong>{animalsState.total}</strong>
              <span>{copy.totalLabel}</span>
            </div>
            <div className="animals-list-highlight-card">
              <strong>{Math.max(animalsState.pagination.totalPages, 1)}</strong>
              <span>{copy.pagesLabel}</span>
            </div>
          </div>
        ) : null}
      </section>

      {isAdoptionView ? (
        <section className="about adoption-reason-about">
          <div className="section-container about-content">
            <div className="about-layout">
              <div className="about-text">
                <h2>Нов дом, нов живот, нова надежда</h2>
                <div className="about-copy">
                  <p>
                    Осиновяването е шанс да дадеш на едно животно не просто дом, а сигурност, грижа и истинско ново
                    начало. Много от животните в приюта са преживели изоставяне, несигурност или липса на внимание, а
                    осиновяването им дава възможност отново да се почувстват обичани и защитени. То е добро не само за
                    самото животно, но и за човека, който получава верен приятел, доверие и силна емоционална връзка.
                    Когато осиновиш, ти променяш един живот завинаги и помагаш на приюта да освободи място за друго
                    животно в нужда. Това е отговорен и съпричастен избор, който носи реална промяна.
                  </p>
                </div>
                <a className="page-contact-link" href="#adoption-filters">
                  Разгледай животните
                </a>
              </div>

              <figure className="about-image-wrap">
                <img
                  src={buildPublicAssetPath('images/page_images/adoption_hero.jpg')}
                  alt="Осиновяване на животно от приюта"
                />
              </figure>
            </div>
          </div>
        </section>
      ) : null}

      <section className="animals-toolbar-card" id="adoption-filters">
        {isAdoptionView ? (
          <p className="animals-toolbar-intro">
            Използвай търсенето и филтрите, за да откриеш животно за осиновяване или да научиш повече за
            животните под грижа и в защитен режим.
          </p>
        ) : null}
        <form className="animals-search-filters-form" onSubmit={handleFiltersSubmit}>
          <div className="animals-toolbar-search">
            <input
              type="search"
              name="query"
              placeholder="Търсене по име, порода или вид"
              value={formValues.query}
              onChange={(event) => handleFieldChange('query', event.target.value)}
            />
            <button type="submit" disabled={animalsState.isLoading && !showInitialLoading}>
              {isAdoptionView ? 'Приложи' : 'Търси'}
            </button>
          </div>

          <div className={`animals-filters-form${isAdoptionView ? ' adoption-public-filters-form' : ''}`}>
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
              <span>Пол</span>
              <select value={formValues.gender} onChange={(event) => handleFieldChange('gender', event.target.value)}>
                {GENDER_OPTIONS.map((option) => (
                  <option key={option.value || 'all-genders'} value={option.value}>
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
                {(isAdoptionView ? PUBLIC_STATUS_OPTIONS : STATUS_OPTIONS).map((option) => (
                  <option key={option.value || 'all-statuses'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="animals-toolbar-sort">
              <span>Сортиране</span>
              <select value={routeFilters.sort} onChange={handleSortChange}>
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className={`animals-filters-actions${isAdoptionView ? ' animals-filters-actions-single' : ''}`}>
              {!isAdoptionView ? (
                <button type="submit" className="app-primary-action">
                  Приложи
                </button>
              ) : null}
              <button type="button" className="app-secondary-action" onClick={handleClearFilters}>
                Изчисти
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="animals-list-results" id="adoption-animals">
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
              <button type="button" className="app-primary-action" onClick={handleRetryLoad}>
                Опитай отново
              </button>
              {hasAppliedFilters ? (
                <button type="button" className="app-secondary-action" onClick={handleClearFilters}>
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
              <strong>{emptyStateTitle}</strong>
              <p>{emptyStateDescription}</p>
            </div>
            <div className="animals-feedback-actions">
              {hasAppliedFilters ? (
                <button type="button" className="app-primary-action" onClick={handleClearFilters}>
                  Изчисти филтрите
                </button>
              ) : null}
              {hasManagementAccess ? (
                <Link className="app-secondary-action" to="/animals/new">
                  Добави ново животно
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}

        {!animalsState.error && animalsState.items.length > 0 ? (
          <div
            id="animals-results-start"
            className="animals-list-grid pagination-scroll-target"
          >
            {animalsState.items.map((animal) => (
              <AnimalCard key={animal.id} animal={animal} showManageLink={hasManagementAccess} />
            ))}
          </div>
        ) : null}

        <PaginationControls
          pagination={animalsState.pagination}
          isLoading={animalsState.isLoading}
          onPageChange={handlePageChange}
          scrollTargetId="animals-results-start"
        />
      </section>
    </main>
  );
}






