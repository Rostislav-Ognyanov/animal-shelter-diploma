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
import { buildPublicAssetPath } from '../../lib/publicAssetPath.js';
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
    title: 'Осинови животно',
    description:
      'Разгледайте животните, които търсят дом, и използвайте филтрите, за да откриете най-подходящия приятел за вашето семейство и начин на живот.',
    totalLabel: 'намерени резултати',
    pagesLabel: 'страници с резултати',
    resultsTitle: 'Животни за осиновяване',
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
  const hasManagementAccess = canManageAnimals(role);
  const isSearchVariant = variant === 'search';
  const usesAvailableOnly = isSearchVariant && !hasManagementAccess;
  const routeFilters = useMemo(
    () => (usesAvailableOnly ? { ...activeFilters, status: '' } : activeFilters),
    [activeFilters, usesAvailableOnly]
  );
  const effectiveFilters = useMemo(
    () => (usesAvailableOnly ? { ...routeFilters, status: 'available' } : routeFilters),
    [routeFilters, usesAvailableOnly]
  );
  const normalizedRouteQuery = useMemo(
    () => serializeSearchRouteParams(routeFilters).toString(),
    [routeFilters]
  );
  const copy = PAGE_COPY[variant] ?? PAGE_COPY.animals;
  const showHeroAside = !isSearchVariant;
  const [formValues, setFormValues] = useState(() => ({
    query: routeFilters.query,
    species: routeFilters.species,
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
      size: routeFilters.size,
      status: routeFilters.status,
    });
  }, [routeFilters.query, routeFilters.species, routeFilters.size, routeFilters.status]);

  useEffect(() => {
    let isMounted = true;

    async function loadAnimals() {
      try {
        setAnimalsState((currentValue) => ({
          ...currentValue,
          isLoading: true,
          error: '',
        }));

        const params = serializeAnimalsParams(effectiveFilters);
        const payload = await fetchApi(`/api/animals?${params.toString()}`);

        if (!isMounted) {
          return;
        }

        const total = payload.data?.total ?? 0;

        setAnimalsState({
          items: payload.data?.items ?? [],
          total,
          pagination: payload.meta?.pagination ?? buildEmptyPagination(total),
          sort: payload.meta?.sort ?? effectiveFilters.sort,
          isLoading: false,
          error: '',
        });
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
              ? 'Животните временно не могат да се заредят. Провери връзката към базата данни или активирай mock fallback режима за разработка.'
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

  const roleLabel = getRoleLabel(role);
  const roleDescription = getRoleDescription(role);
  const roleUiActions = getRoleUiActions(role);
  const hasAppliedFilters = Boolean(
    routeFilters.query || routeFilters.species || routeFilters.size || routeFilters.status
  );
  const showInitialLoading = animalsState.isLoading && animalsState.items.length === 0;
  const showRefreshingState = animalsState.isLoading && animalsState.items.length > 0;
  const showEmptyState = !animalsState.isLoading && !animalsState.error && animalsState.items.length === 0;
  const emptyStateTitle = isSearchVariant
    ? 'В момента няма животни, които да съвпадат напълно с избраните критерии.'
    : 'Няма намерени животни по тези критерии.';
  const emptyStateDescription = isSearchVariant
    ? 'Опитайте с по-широко търсене или изчистете част от филтрите, за да разгледате повече животни, които търсят дом.'
    : 'Опитай с по-широко търсене или изчисти част от филтрите, за да видиш повече налични записи.';

  function updateRouteFilters(nextFilters, navigateOptions = {}) {
    const normalizedNextFilters = usesAvailableOnly ? { ...nextFilters, status: '' } : nextFilters;
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
          size: formValues.size,
          status: usesAvailableOnly ? '' : formValues.status,
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
    <main className={`route-shell animals-list-shell${isSearchVariant ? ' adoption-page-shell' : ''}`}>
      <section className={`animals-list-hero${isSearchVariant ? ' adoption-page-hero' : ''}`}>
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
        ) : null}
      </section>

      {isSearchVariant ? (
        <section className="about adoption-reason-about">
          <div className="section-container about-content">
            <div className="about-layout">
              <div className="about-text">
                <h2>Нов дом, нов живот, нова надежда</h2>
                <div className="about-copy">
                  <p>
                    Осиновяването е шанс да дадете на едно животно не просто дом, а сигурност, грижа и истинско ново
                    начало. Много от животните в приюта са преживели изоставяне, несигурност или липса на внимание, а
                    осиновяването им дава възможност отново да се почувстват обичани и защитени. То е добро не само за
                    самото животно, но и за човека, който получава верен приятел, доверие и силна емоционална връзка.
                    Когато осиновите, вие променяте един живот завинаги и помагате на приюта да освободи място за друго
                    животно в нужда. Това е отговорен и съпричастен избор, който носи реална промяна.
                  </p>
                </div>
                <a className="about-page-contact-link adoption-reason-action" href="#adoption-filters">
                  Осинови сега
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
        {isSearchVariant ? (
          <p className="animals-toolbar-intro">
            Използвайте търсенето и филтрите, за да откриете животно, което най-добре отговаря на вашия дом, начин на
            живот и възможности за грижа.
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
              {isSearchVariant ? 'Приложи' : 'Търси'}
            </button>
          </div>

          <div className={`animals-filters-form${usesAvailableOnly ? ' adoption-public-filters-form' : ''}`}>
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

            {!usesAvailableOnly ? (
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
            ) : null}

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

            <div className={`animals-filters-actions${isSearchVariant ? ' animals-filters-actions-single' : ''}`}>
              {!isSearchVariant ? (
                <button type="submit" className="animals-primary-action">
                  Приложи
                </button>
              ) : null}
              <button type="button" className="animals-secondary-action" onClick={handleClearFilters}>
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
              <strong>{emptyStateTitle}</strong>
              <p>{emptyStateDescription}</p>
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






