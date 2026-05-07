import {
  ANIMAL_FILTER_SIZE_OPTIONS,
  ANIMAL_FILTER_SPECIES_OPTIONS,
  ANIMAL_FILTER_STATUS_OPTIONS,
  normalizeAnimalStatusValue,
  normalizeSizeValue,
  normalizeSpeciesValue,
} from './animalUi.js';

export const PAGE_SIZE = 10;
export const DEFAULT_SORT = 'name-asc';

export const DEFAULT_FILTERS = {
  query: '',
  species: '',
  size: '',
  status: '',
  sort: DEFAULT_SORT,
  page: 1,
};

export const SPECIES_OPTIONS = ANIMAL_FILTER_SPECIES_OPTIONS;
export const SIZE_OPTIONS = ANIMAL_FILTER_SIZE_OPTIONS;
export const STATUS_OPTIONS = ANIMAL_FILTER_STATUS_OPTIONS;

export const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Име: А-Я' },
  { value: 'name-desc', label: 'Име: Я-А' },
  { value: 'createdAt-desc', label: 'Най-нови записи' },
  { value: 'createdAt-asc', label: 'Най-стари записи' },
  { value: 'intakeDate-desc', label: 'Последно приети' },
  { value: 'intakeDate-asc', label: 'Най-рано приети' },
  { value: 'age-desc', label: 'Възраст: низходящо' },
  { value: 'age-asc', label: 'Възраст: възходящо' },
];

const SORT_VALUE_SET = new Set(SORT_OPTIONS.map((option) => option.value));

function readTextParam(searchParams, key, fallback = '') {
  return searchParams.get(key)?.trim() ?? fallback;
}

function normalizePageValue(value) {
  const numericPage = Number(value ?? 1);
  return Number.isInteger(numericPage) && numericPage > 0 ? numericPage : 1;
}

function normalizeSortFilterValue(value) {
  const normalizedValue = String(value ?? '').trim();
  return SORT_VALUE_SET.has(normalizedValue) ? normalizedValue : DEFAULT_SORT;
}

function findOptionLabel(options, value) {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function normalizeSpeciesFilterValue(value) {
  return normalizeSpeciesValue(value);
}

export function normalizeSizeFilterValue(value) {
  return normalizeSizeValue(value);
}

function normalizeStatusFilterValue(value) {
  return normalizeAnimalStatusValue(value);
}

export function normalizeAnimalsFilters(filters = {}) {
  return {
    query: String(filters.query ?? '').trim(),
    species: normalizeSpeciesFilterValue(filters.species ?? filters.type),
    size: normalizeSizeFilterValue(filters.size),
    status: normalizeStatusFilterValue(filters.status),
    sort: normalizeSortFilterValue(filters.sort),
    page: normalizePageValue(filters.page),
  };
}

export function readFiltersFromParams(searchParams) {
  return normalizeAnimalsFilters({
    query: readTextParam(searchParams, 'query'),
    species: readTextParam(searchParams, 'species') || readTextParam(searchParams, 'type'),
    size: readTextParam(searchParams, 'size'),
    status: readTextParam(searchParams, 'status'),
    sort: readTextParam(searchParams, 'sort', DEFAULT_SORT) || DEFAULT_SORT,
    page: readTextParam(searchParams, 'page', '1'),
  });
}

export function mergeAnimalsRouteFilters(currentFilters, nextFilters = {}, options = {}) {
  const resetPage = options.resetPage ?? false;
  const mergedFilters = normalizeAnimalsFilters({
    ...DEFAULT_FILTERS,
    ...currentFilters,
    ...nextFilters,
  });

  if (resetPage) {
    mergedFilters.page = 1;
  }

  return mergedFilters;
}

export function serializeAnimalsParams(filters, options = {}) {
  const params = new URLSearchParams();
  const normalizedFilters = normalizeAnimalsFilters(filters);
  const limit = options.includeLimit === false ? null : options.limit ?? PAGE_SIZE;

  if (normalizedFilters.query) {
    params.set('query', normalizedFilters.query);
  }

  if (normalizedFilters.species) {
    params.set('species', normalizedFilters.species);
  }

  if (normalizedFilters.size) {
    params.set('size', normalizedFilters.size);
  }

  if (normalizedFilters.status) {
    params.set('status', normalizedFilters.status);
  }

  if (normalizedFilters.sort !== DEFAULT_SORT) {
    params.set('sort', normalizedFilters.sort);
  }

  if (limit) {
    params.set('limit', String(limit));
  }

  if (normalizedFilters.page > 1) {
    params.set('page', String(normalizedFilters.page));
  }

  return params;
}

export function serializeSearchRouteParams(filters) {
  return serializeAnimalsParams(
    {
      ...DEFAULT_FILTERS,
      ...filters,
    },
    {
      includeLimit: false,
    }
  );
}

export function buildAnimalsSearchPath(filters) {
  const params = serializeSearchRouteParams(filters);
  const queryString = params.toString();
  return queryString ? `/search?${queryString}` : '/search';
}

export function buildResultsSummary(total, filters, pagination) {
  const normalizedFilters = normalizeAnimalsFilters(filters);
  const parts = [];

  if (normalizedFilters.query) {
    parts.push(`търсене "${normalizedFilters.query}"`);
  }

  if (normalizedFilters.species) {
    parts.push(`вид ${findOptionLabel(SPECIES_OPTIONS, normalizedFilters.species)}`);
  }

  if (normalizedFilters.size) {
    parts.push(`размер ${findOptionLabel(SIZE_OPTIONS, normalizedFilters.size)}`);
  }

  if (normalizedFilters.status) {
    parts.push(`статус ${findOptionLabel(STATUS_OPTIONS, normalizedFilters.status)}`);
  }

  const page = normalizePageValue(pagination?.page);
  const totalPages = Math.max(Number(pagination?.totalPages ?? 0), 1);

  if (parts.length === 0) {
    return `Открити са ${total} животни. Страница ${page} от ${totalPages}.`;
  }

  return `Открити са ${total} резултата при ${parts.join(', ')}. Страница ${page} от ${totalPages}.`;
}
