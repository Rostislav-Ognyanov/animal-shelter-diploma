import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { fetchJson } from '../../lib/api.js';
import {
  REPORT_PERIOD_OPTIONS,
  buildActivityCards,
  buildDashboardCards,
  buildReportsFilterSummary,
  buildReportsHighlights,
  buildReportsQueryString,
  buildReportsSearchParams,
  downloadReportsExport,
  enrichBreakdown,
  enrichIntakeByPeriod,
  formatReportsDate,
  getReportsSourceLabel,
  parseReportsFilters,
} from './reportsUi.js';

function DistributionPanel({ title, items }) {
  return (
    <article className="route-card reports-panel">
      <div className="reports-panel-heading">
        <div>
          <p className="route-meta">Breakdown</p>
          <h2>{title}</h2>
        </div>
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

function DashboardCard({ card }) {
  return (
    <article className="reports-summary-card">
      <p className="route-meta">Dashboard</p>
      <strong>{card.value}</strong>
      <h2>{card.label}</h2>
      <p>{card.note}</p>
    </article>
  );
}

function ActivityCard({ card }) {
  return (
    <article className="route-card reports-activity-card">
      <p className="route-meta">Периодна активност</p>
      <strong>{card.value}</strong>
      <h2>{card.label}</h2>
      <p>{card.note}</p>
    </article>
  );
}

export function AdminReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const appliedFilters = useMemo(() => parseReportsFilters(searchParams), [searchParams]);
  const [draftFilters, setDraftFilters] = useState(appliedFilters);
  const [pageState, setPageState] = useState({
    overview: null,
    animalMasterData: null,
    isLoading: true,
    error: '',
  });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    setDraftFilters(appliedFilters);
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
  const dashboardCards = useMemo(() => buildDashboardCards(overview.dashboard ?? {}), [overview.dashboard]);
  const activityCards = useMemo(
    () => buildActivityCards(overview.activity ?? {}, overview.filters ?? appliedFilters),
    [appliedFilters, overview.activity, overview.filters]
  );
  const highlights = useMemo(
    () => buildReportsHighlights(overview, animalMasterData),
    [animalMasterData, overview]
  );
  const requestsByStatus = useMemo(
    () => enrichBreakdown(overview.reports?.requestsByStatus ?? [], 'request-status'),
    [overview.reports]
  );
  const usersByRole = useMemo(
    () => enrichBreakdown(overview.reports?.usersByRole ?? [], 'user-role'),
    [overview.reports]
  );
  const usersByActivity = useMemo(
    () => enrichBreakdown(overview.reports?.usersByActivity ?? [], 'user-activity'),
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
  const animalsBySize = useMemo(
    () => enrichBreakdown(animalMasterData.animalSizeBreakdown ?? [], 'animal-size'),
    [animalMasterData.animalSizeBreakdown]
  );
  const animalsByGender = useMemo(
    () => enrichBreakdown(animalMasterData.animalGenderBreakdown ?? [], 'animal-gender'),
    [animalMasterData.animalGenderBreakdown]
  );
  const animalCare = useMemo(
    () => enrichBreakdown(animalMasterData.animalCareBreakdown ?? [], 'animal-care'),
    [animalMasterData.animalCareBreakdown]
  );
  const intakeByPeriod = useMemo(
    () => enrichIntakeByPeriod(animalMasterData.intakeByPeriod ?? []),
    [animalMasterData.intakeByPeriod]
  );

  function updateDraftField(fieldName, value) {
    setDraftFilters((currentValue) => ({
      ...currentValue,
      [fieldName]: value,
    }));
  }

  function handleApplyFilters(event) {
    event.preventDefault();
    setSearchParams(buildReportsSearchParams(draftFilters));
  }

  function handleResetFilters() {
    const resetFilters = {
      period: 'all',
      dateFrom: '',
      dateTo: '',
    };

    setDraftFilters(resetFilters);
    setSearchParams(buildReportsSearchParams(resetFilters));
  }

  function handleExport() {
    if (!pageState.overview || !pageState.animalMasterData) {
      return;
    }

    downloadReportsExport(
      {
        overview: pageState.overview,
        animalMasterData: pageState.animalMasterData,
      },
      overview.filters ?? appliedFilters
    );
  }

  if (pageState.isLoading) {
    return (
      <main className="route-shell reports-shell">
        <section className="route-card reports-loading-card">
                    <h1>Зареждане на dashboard-а</h1>
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
            className="animals-primary-action"
            onClick={() => setReloadToken((currentValue) => currentValue + 1)}
          >
            Опитай отново
          </button>
        </section>
      </main>
    );
  }

  const activeFilterSummary = buildReportsFilterSummary(appliedFilters, overview.filters ?? animalMasterData.filters);
  const isEmpty =
    (overview.dashboard?.totalAnimals ?? 0) === 0 &&
    (overview.dashboard?.totalUsers ?? 0) === 0 &&
    (overview.reports?.adoptions?.totalRequests ?? 0) === 0;

  return (
    <main className="route-shell reports-shell">
      <section className="reports-hero">
        <div>
                    <h1>Отчети и административен dashboard</h1>
          <p>
            Обобщен изглед на системата.
          </p>
        </div>

        <div className="reports-hero-meta">
          <span className="reports-source-pill">{getReportsSourceLabel(overview.source)}</span>
          <span className="reports-generated-at">Обновено: {formatReportsDate(overview.generatedAt)}</span>
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
                  onChange={(event) => updateDraftField('dateFrom', event.target.value)}
                />
              </label>

              <label>
                <span>До дата</span>
                <input
                  type="date"
                  value={draftFilters.dateTo}
                  onChange={(event) => updateDraftField('dateTo', event.target.value)}
                />
              </label>
            </>
          ) : null}

          <div className="reports-filter-actions">
            <button type="submit" className="animals-primary-action">
              Приложи филтъра
            </button>
            <button type="button" className="animals-secondary-action" onClick={handleResetFilters}>
              Изчисти
            </button>
            <button type="button" className="animals-secondary-action" onClick={handleExport}>
              Експорт JSON
            </button>
          </div>
        </form>

        <p className="reports-filter-summary">{activeFilterSummary}</p>
      </section>

      {isEmpty ? (
        <section className="route-card reports-empty-card">
          <p className="route-meta">Dashboard</p>
          <h2>Все още няма достатъчно данни за аналитика</h2>
          <p>
            Добави записи, за да се появи аналитика.
          </p>
        </section>
      ) : (
        <>
          <section className="reports-summary-grid">
            {dashboardCards.map((card) => (
              <DashboardCard key={card.key} card={card} />
            ))}
          </section>

          <section className="reports-activity-grid">
            {activityCards.map((card) => (
              <ActivityCard key={card.key} card={card} />
            ))}
          </section>

          <section className="reports-highlights-grid">
            {highlights.map((highlight) => (
              <article key={highlight.key} className="route-card reports-highlight-card">
                <p className="route-meta">Insight</p>
                <h2>{highlight.title}</h2>
                <p>{highlight.text}</p>
              </article>
            ))}
          </section>

          <section className="reports-panels-grid">
            <DistributionPanel
              title="Заявки по статус"

              items={requestsByStatus}
            />
            <DistributionPanel
              title="Потребители по роля"

              items={usersByRole}
            />
            <DistributionPanel
              title="Активни и неактивни профили"

              items={usersByActivity}
            />
            <DistributionPanel
              title="Животни по статус"

              items={animalsByStatus}
            />
            <DistributionPanel
              title="Животни по вид"

              items={animalsBySpecies}
            />
            <DistributionPanel
              title="Животни по размер"

              items={animalsBySize}
            />
            <DistributionPanel
              title="Животни по пол"

              items={animalsByGender}
            />
            <DistributionPanel
              title="Грижи и подготовка"

              items={animalCare}
            />

            <article className="route-card reports-panel reports-masterdata-panel">
              <div className="reports-panel-heading">
                <div>
                  <p className="route-meta">Animal Master Data</p>
                  <h2>Обхват и периоди</h2>
                </div>

              </div>

              <div className="reports-masterdata-summary">
                <div>
                  <strong>{animalMasterData.totals?.totalAnimals ?? 0}</strong>
                  <span>записа в текущия отчетен обхват</span>
                </div>
                <div>
                  <strong>{animalMasterData.overallTotals?.totalAnimals ?? 0}</strong>
                  <span>общо записа за животни в системата</span>
                </div>
                <div>
                  <strong>{animalMasterData.totals?.activeRecords ?? 0}</strong>
                  <span>активни записа в текущия обхват</span>
                </div>
                <div>
                  <strong>{animalMasterData.totals?.inactiveRecords ?? 0}</strong>
                  <span>неактивни записа в текущия обхват</span>
                </div>
              </div>

              <div className="reports-period-grid">
                {intakeByPeriod.map((period) => (
                  <article key={period.key} className="reports-period-card">
                    <strong>{period.count}</strong>
                    <span>{period.label}</span>
                    <div className="reports-bar-track">
                      <div className="reports-bar-fill" style={{ width: `${period.widthPercent}%` }} />
                    </div>
                  </article>
                ))}
              </div>

              <p className="reports-masterdata-updated">
                Последна актуализация на animal master-data: {formatReportsDate(animalMasterData.updatedAt)}
              </p>
            </article>
          </section>
        </>
      )}
    </main>
  );
}




