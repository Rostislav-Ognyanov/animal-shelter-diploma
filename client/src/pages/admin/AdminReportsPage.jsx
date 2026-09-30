import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { fetchJson } from '../../lib/api.js';
import {
  REPORT_PERIOD_OPTIONS,
  buildActivityCards,
  buildReportsFilterSummary,
  buildReportsQueryString,
  buildReportsSearchParams,
  enrichBreakdown,
  parseReportsFilters,
} from './reportsUi.js';

function DistributionPanel({ category, title, items }) {
  return (
    <article className="reports-panel">
      <div className="reports-panel-heading">
        <p className="route-meta">{category}</p>
        <h3>{title}</h3>
      </div>

      <div className="reports-bar-list">
        {items.map((item) => (
          <div key={item.key} className="reports-bar-row">
            <div className="reports-bar-topline">
              <strong>{item.label}</strong>
              <span>
                {item.count} <small>({item.shareOfTotal}%)</small>
              </span>
            </div>
            <div className="reports-bar-track">
              <div className="reports-bar-fill" style={{ width: `${item.widthPercent}%` }} />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function ActivityCard({ card }) {
  return (
    <article className={`reports-activity-card is-${card.tone}`}>
      <strong>{card.value}</strong>
      <h3>{card.label}</h3>
      <p>{card.note}</p>
    </article>
  );
}

function validateReportFilters(filters) {
  if (filters.period !== 'custom') {
    return '';
  }

  if (!filters.dateFrom && !filters.dateTo) {
    return 'При персонализиран период избери поне начална или крайна дата.';
  }

  if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
    return 'Началната дата не може да бъде след крайната дата.';
  }

  return '';
}

export function AdminReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const appliedFilters = useMemo(() => parseReportsFilters(searchParams), [searchParams]);
  const [draftFilters, setDraftFilters] = useState(appliedFilters);
  const [filterError, setFilterError] = useState('');
  const [pageState, setPageState] = useState({
    overview: null,
    animalMasterData: null,
    isLoading: true,
    error: '',
  });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    setDraftFilters(appliedFilters);
    setFilterError('');
  }, [appliedFilters.dateFrom, appliedFilters.dateTo, appliedFilters.period]);

  useEffect(() => {
    let isMounted = true;

    async function loadReports() {
      try {
        setPageState({
          overview: null,
          animalMasterData: null,
          isLoading: true,
          error: '',
        });

        const queryString = buildReportsQueryString(appliedFilters);
        const suffix = queryString ? `?${queryString}` : '';
        const [overview, animalMasterData] = await Promise.all([
          fetchJson(`/api/reports/overview${suffix}`),
          fetchJson(`/api/reports/animal-master-data${suffix}`),
        ]);

        if (!isMounted) {
          return;
        }

        setPageState({
          overview,
          animalMasterData,
          isLoading: false,
          error: '',
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPageState({
          overview: null,
          animalMasterData: null,
          isLoading: false,
          error: error.message,
        });
      }
    }

    loadReports();

    return () => {
      isMounted = false;
    };
  }, [appliedFilters.dateFrom, appliedFilters.dateTo, appliedFilters.period, reloadToken]);

  const overview = pageState.overview ?? {};
  const animalMasterData = pageState.animalMasterData ?? {};
  const activityCards = useMemo(
    () =>
      buildActivityCards(
        overview.activity ?? {},
        overview.reports ?? {},
        overview.filters ?? appliedFilters
      ),
    [appliedFilters, overview.activity, overview.filters, overview.reports]
  );
  const requestsByStatus = useMemo(
    () => enrichBreakdown(overview.reports?.requestsByStatus ?? [], 'request-status'),
    [overview.reports]
  );
  const volunteerApplicationsByStatus = useMemo(
    () =>
      enrichBreakdown(
        overview.reports?.volunteerApplicationsByStatus ?? [],
        'volunteer-status'
      ),
    [overview.reports]
  );
  const rescueReportsByStatus = useMemo(
    () =>
      enrichBreakdown(overview.reports?.rescueReportsByStatus ?? [], 'rescue-report-status'),
    [overview.reports]
  );
  const rescueReportsByUrgency = useMemo(
    () =>
      enrichBreakdown(overview.reports?.rescueReportsByUrgency ?? [], 'rescue-report-urgency'),
    [overview.reports]
  );
  const contactInquiriesByStatus = useMemo(
    () =>
      enrichBreakdown(
        overview.reports?.contactInquiriesByStatus ?? [],
        'contact-inquiry-status'
      ),
    [overview.reports]
  );
  const donationsByStatus = useMemo(
    () => enrichBreakdown(overview.reports?.donationsByStatus ?? [], 'donation-status'),
    [overview.reports]
  );
  const animalsByStatus = useMemo(
    () => enrichBreakdown(animalMasterData.animalStatusBreakdown ?? [], 'animal-status'),
    [animalMasterData.animalStatusBreakdown]
  );
  const animalsBySpecies = useMemo(
    () => enrichBreakdown(animalMasterData.animalSpeciesBreakdown ?? [], 'animal-species'),
    [animalMasterData.animalSpeciesBreakdown]
  );

  function updateDraftField(fieldName, value) {
    setFilterError('');
    setDraftFilters((currentValue) => ({
      ...currentValue,
      [fieldName]: value,
    }));
  }

  function handleApplyFilters(event) {
    event.preventDefault();

    const nextFilterError = validateReportFilters(draftFilters);

    if (nextFilterError) {
      setFilterError(nextFilterError);
      return;
    }

    setFilterError('');
    setSearchParams(buildReportsSearchParams(draftFilters));
  }

  function handleResetFilters() {
    const resetFilters = {
      period: '30d',
      dateFrom: '',
      dateTo: '',
    };

    setDraftFilters(resetFilters);
    setFilterError('');
    setSearchParams(buildReportsSearchParams(resetFilters));
  }

  if (pageState.isLoading) {
    return (
      <main className="route-shell reports-shell">
        <section className="route-card reports-loading-card">
          <h1>Зареждане на отчетите</h1>
          <p>Моля, изчакай.</p>
        </section>
      </main>
    );
  }

  if (pageState.error) {
    return (
      <main className="route-shell reports-shell">
        <section className="route-card reports-loading-card">
          <h1>Отчетите не могат да се заредят</h1>
          <p>{pageState.error}</p>
          <button
            type="button"
            className="app-primary-action"
            onClick={() => setReloadToken((currentValue) => currentValue + 1)}
          >
            Опитай отново
          </button>
        </section>
      </main>
    );
  }

  const activeFilterSummary = buildReportsFilterSummary(
    appliedFilters,
    overview.filters ?? animalMasterData.filters
  );

  return (
    <main className="route-shell reports-shell">
      <section className="reports-hero">
        <div>
          <h1>Отчети</h1>
          <p>Обобщени показатели за дейността на приюта.</p>
        </div>
      </section>

      <section className="route-card reports-filters-card">
        <form className="reports-filter-form" onSubmit={handleApplyFilters}>
          <label>
            <span>Период</span>
            <select
              value={draftFilters.period}
              onChange={(event) => updateDraftField('period', event.target.value)}
            >
              {REPORT_PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {draftFilters.period === 'custom' ? (
            <>
              <label>
                <span>От дата</span>
                <input
                  type="date"
                  value={draftFilters.dateFrom}
                  max={draftFilters.dateTo || undefined}
                  onChange={(event) => updateDraftField('dateFrom', event.target.value)}
                />
              </label>

              <label>
                <span>До дата</span>
                <input
                  type="date"
                  value={draftFilters.dateTo}
                  min={draftFilters.dateFrom || undefined}
                  onChange={(event) => updateDraftField('dateTo', event.target.value)}
                />
              </label>
            </>
          ) : null}

          <div className="reports-filter-actions">
            <button type="submit" className="app-primary-action">
              Приложи
            </button>
            <button type="button" className="app-secondary-action" onClick={handleResetFilters}>
              Изчисти
            </button>
          </div>
        </form>

        {filterError ? (
          <p className="feedback-message feedback-message-error">{filterError}</p>
        ) : null}

        <p className="reports-filter-summary">{activeFilterSummary}</p>
      </section>

      <section className="reports-section" aria-labelledby="reports-activity-title">
        <div className="reports-section-heading">
          <p className="route-meta">Избран период</p>
          <h2 id="reports-activity-title">Основни показатели</h2>
        </div>

        <div className="reports-activity-grid">
          {activityCards.map((card) => (
            <ActivityCard key={card.key} card={card} />
          ))}
        </div>
      </section>

      <section className="reports-section" aria-labelledby="reports-breakdowns-title">
        <div className="reports-section-heading">
          <p className="route-meta">Оперативен преглед</p>
          <h2 id="reports-breakdowns-title">Основни разбивки</h2>
        </div>

        <div className="reports-panels-grid">
          <DistributionPanel
            category="Осиновявания"
            title="Заявки по статус"
            items={requestsByStatus}
          />
          <DistributionPanel
            category="Доброволчество"
            title="Кандидатури по статус"
            items={volunteerApplicationsByStatus}
          />
          <DistributionPanel
            category="Сигнали"
            title="По статус"
            items={rescueReportsByStatus}
          />
          <DistributionPanel
            category="Сигнали"
            title="По спешност"
            items={rescueReportsByUrgency}
          />
          <DistributionPanel
            category="Запитвания"
            title="По статус"
            items={contactInquiriesByStatus}
          />
          <DistributionPanel
            category="Дарения"
            title="По статус"
            items={donationsByStatus}
          />
          <DistributionPanel
            category="Животни"
            title="По статус"
            items={animalsByStatus}
          />
          <DistributionPanel
            category="Животни"
            title="По вид"
            items={animalsBySpecies}
          />
        </div>
      </section>
    </main>
  );
}
