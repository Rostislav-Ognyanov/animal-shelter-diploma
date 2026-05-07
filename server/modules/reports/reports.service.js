import Animal from '../../models/Animal.js';
import AdoptionRequest from '../../models/AdoptionRequest.js';
import User from '../../models/User.js';
import {
  describeAnimalsPersistenceMode,
  isAnimalsMockFallbackEnabled,
  isDatabaseConnected,
} from '../../config/db.js';
import { loadJsonFile } from '../../utils/loadJsonFile.js';
import { createHttpError } from '../../utils/httpError.js';
import {
  ANIMAL_GENDER_VALUES,
  ANIMAL_SIZE_VALUES,
  ANIMAL_SPECIES_VALUES,
  ANIMAL_STATUS_VALUES,
} from '../animals/animal.constants.js';
import { ADOPTION_REQUEST_STATUS_VALUES } from '../shared/rolePolicies.js';
import { MANAGED_USER_ROLE_VALUES, USER_STATUS_VALUES } from '../users/user.constants.js';

const USERS_DATA_PATH = 'data/users.json';
const ANIMALS_DATA_PATH = 'data/animals.json';
const ADOPTIONS_DATA_PATH = 'data/adoption-requests.json';
const REPORT_INTAKE_WINDOWS = [7, 30, 90];
const REPORT_PERIOD_VALUES = ['all', '7d', '30d', '90d', 'this-month', 'this-year', 'custom'];

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeDateOutput(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

function startOfDay(dateValue) {
  const nextDate = new Date(dateValue);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function endOfDay(dateValue) {
  const nextDate = new Date(dateValue);
  nextDate.setHours(23, 59, 59, 999);
  return nextDate;
}

function parseDateInput(value, fieldName) {
  if (!value) {
    return null;
  }

  const dateValue = new Date(value);

  if (Number.isNaN(dateValue.getTime())) {
    throw createHttpError(400, `Параметърът "${fieldName}" трябва да бъде валидна дата.`);
  }

  return dateValue;
}

function buildFilterLabel(period, dateFrom, dateTo) {
  switch (period) {
    case '7d':
      return 'Последни 7 дни';
    case '30d':
      return 'Последни 30 дни';
    case '90d':
      return 'Последни 90 дни';
    case 'this-month':
      return 'Текущ месец';
    case 'this-year':
      return 'Текуща година';
    case 'custom': {
      const fromLabel = dateFrom ? startOfDay(dateFrom).toISOString().slice(0, 10) : 'началото';
      const toLabel = dateTo ? endOfDay(dateTo).toISOString().slice(0, 10) : 'днес';
      return `Персонализиран диапазон: ${fromLabel} - ${toLabel}`;
    }
    default:
      return 'Всички налични данни';
  }
}

function normalizeReportsFilters(filters = {}) {
  const normalizedPeriod = normalizeText(filters.period || 'all') || 'all';

  if (!REPORT_PERIOD_VALUES.includes(normalizedPeriod)) {
    throw createHttpError(400, 'Параметърът "period" съдържа невалидна стойност.', {
      allowedPeriods: REPORT_PERIOD_VALUES,
    });
  }

  const now = new Date();
  let dateFrom = null;
  let dateTo = null;

  switch (normalizedPeriod) {
    case '7d':
    case '30d':
    case '90d': {
      const days = Number(normalizedPeriod.replace('d', ''));
      dateTo = endOfDay(now);
      dateFrom = startOfDay(now);
      dateFrom.setDate(dateFrom.getDate() - (days - 1));
      break;
    }
    case 'this-month':
      dateTo = endOfDay(now);
      dateFrom = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      break;
    case 'this-year':
      dateTo = endOfDay(now);
      dateFrom = startOfDay(new Date(now.getFullYear(), 0, 1));
      break;
    case 'custom': {
      const parsedDateFrom = parseDateInput(filters.dateFrom, 'dateFrom');
      const parsedDateTo = parseDateInput(filters.dateTo, 'dateTo');

      if (!parsedDateFrom && !parsedDateTo) {
        throw createHttpError(400, 'При period="custom" трябва да подадеш поне dateFrom или dateTo.');
      }

      dateFrom = parsedDateFrom ? startOfDay(parsedDateFrom) : null;
      dateTo = parsedDateTo ? endOfDay(parsedDateTo) : endOfDay(now);
      break;
    }
    default:
      break;
  }

  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw createHttpError(400, 'Параметърът "dateFrom" не може да бъде след "dateTo".');
  }

  return {
    period: normalizedPeriod,
    isFiltered: normalizedPeriod !== 'all',
    dateFrom: normalizeDateOutput(dateFrom),
    dateTo: normalizeDateOutput(dateTo),
    label: buildFilterLabel(normalizedPeriod, dateFrom, dateTo),
  };
}

function canUseReportsMockFallback() {
  return !isDatabaseConnected() && isAnimalsMockFallbackEnabled();
}

function assertReportsDataSourceAvailable() {
  if (isDatabaseConnected() || canUseReportsMockFallback()) {
    return;
  }

  throw createHttpError(
    503,
    'Модулът за отчети не е достъпен, защото няма активна връзка с MongoDB и mock fallback режимът е изключен.'
  );
}

async function readUsersDataset() {
  assertReportsDataSourceAvailable();

  if (isDatabaseConnected()) {
    return User.find({})
      .select('role isActive createdAt updatedAt')
      .lean();
  }

  return loadJsonFile(USERS_DATA_PATH);
}

async function readAnimalsDataset() {
  assertReportsDataSourceAvailable();

  if (isDatabaseConnected()) {
    return Animal.find({})
      .select('species status size gender intakeDate vaccinated neutered isActive createdAt updatedAt')
      .lean();
  }

  return loadJsonFile(ANIMALS_DATA_PATH);
}

async function readAdoptionsDataset() {
  assertReportsDataSourceAvailable();

  if (isDatabaseConnected()) {
    return AdoptionRequest.find({})
      .select('status createdAt updatedAt')
      .lean();
  }

  return loadJsonFile(ADOPTIONS_DATA_PATH);
}

function buildSourceDescriptor() {
  const mode = isDatabaseConnected() ? 'mongodb' : canUseReportsMockFallback() ? 'mock-fallback' : 'unavailable';

  return {
    mode,
    label: describeAnimalsPersistenceMode(),
  };
}

function buildCountSeed(keys) {
  return keys.reduce((summary, key) => {
    summary[key] = 0;
    return summary;
  }, {});
}

function buildKeyedBreakdown(items, allowedKeys, resolver) {
  const counts = buildCountSeed(allowedKeys);

  items.forEach((item) => {
    const key = resolver(item);

    if (Object.prototype.hasOwnProperty.call(counts, key)) {
      counts[key] += 1;
    }
  });

  return allowedKeys.map((key) => ({
    key,
    count: counts[key] ?? 0,
  }));
}

function buildUsersByActivityBreakdown(users) {
  const counts = {
    active: 0,
    inactive: 0,
  };

  users.forEach((user) => {
    counts[user?.isActive ? 'active' : 'inactive'] += 1;
  });

  return USER_STATUS_VALUES.map((key) => ({
    key,
    count: counts[key] ?? 0,
  }));
}

function buildAnimalCareBreakdown(animals) {
  return [
    {
      key: 'vaccinated',
      count: animals.filter((animal) => Boolean(animal?.vaccinated)).length,
    },
    {
      key: 'not-vaccinated',
      count: animals.filter((animal) => !animal?.vaccinated).length,
    },
    {
      key: 'neutered',
      count: animals.filter((animal) => Boolean(animal?.neutered)).length,
    },
    {
      key: 'not-neutered',
      count: animals.filter((animal) => !animal?.neutered).length,
    },
  ];
}

function buildIntakeByPeriod(animals, now = new Date()) {
  return REPORT_INTAKE_WINDOWS.map((days) => {
    const threshold = new Date(now);
    threshold.setDate(threshold.getDate() - days);

    const count = animals.filter((animal) => {
      const intakeDate = new Date(animal?.intakeDate ?? animal?.createdAt ?? 0);
      return !Number.isNaN(intakeDate.getTime()) && intakeDate >= threshold;
    }).length;

    return {
      key: `${days}d`,
      days,
      count,
    };
  });
}

function buildDashboardMetrics(animals, adoptions, users) {
  const animalStatusBreakdown = buildKeyedBreakdown(animals, ANIMAL_STATUS_VALUES, (animal) =>
    normalizeText(animal?.status)
  );
  const requestsByStatus = buildKeyedBreakdown(adoptions, ADOPTION_REQUEST_STATUS_VALUES, (request) =>
    normalizeText(request?.status)
  );
  const usersByRole = buildKeyedBreakdown(users, MANAGED_USER_ROLE_VALUES, (user) =>
    normalizeText(user?.role)
  );

  const getCount = (collection, key) => collection.find((entry) => entry.key === key)?.count ?? 0;

  return {
    totalAnimals: animals.length,
    availableAnimals: getCount(animalStatusBreakdown, 'available'),
    reservedAnimals: getCount(animalStatusBreakdown, 'reserved'),
    adoptedAnimals: getCount(animalStatusBreakdown, 'adopted'),
    pendingRequests: getCount(requestsByStatus, 'pending'),
    totalUsers: users.length,
    employeeUsers: getCount(usersByRole, 'employee'),
    adminUsers: getCount(usersByRole, 'admin'),
  };
}

function filterItemsByDate(items, dateResolver, filters) {
  if (!filters.isFiltered) {
    return items;
  }

  const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
  const dateTo = filters.dateTo ? new Date(filters.dateTo) : null;

  return items.filter((item) => {
    const rawValue = dateResolver(item);

    if (!rawValue) {
      return false;
    }

    const dateValue = new Date(rawValue);

    if (Number.isNaN(dateValue.getTime())) {
      return false;
    }

    if (dateFrom && dateValue < dateFrom) {
      return false;
    }

    if (dateTo && dateValue > dateTo) {
      return false;
    }

    return true;
  });
}

function buildActivitySnapshot(filteredAnimals, filteredRequests, filteredCompletedAdoptions, filteredUsers) {
  return {
    newAnimals: filteredAnimals.length,
    newRequests: filteredRequests.length,
    completedAdoptions: filteredCompletedAdoptions.length,
    newUsers: filteredUsers.length,
  };
}

function getLatestAnimalUpdate(animals) {
  return normalizeDateOutput(
    animals.reduce((latestValue, animal) => {
      const candidateValue = animal?.updatedAt ?? animal?.createdAt ?? animal?.intakeDate ?? null;

      if (!candidateValue) {
        return latestValue;
      }

      if (!latestValue) {
        return candidateValue;
      }

      return new Date(candidateValue) > new Date(latestValue) ? candidateValue : latestValue;
    }, null)
  );
}

export async function getReportsOverviewData(filters = {}) {
  const normalizedFilters = normalizeReportsFilters(filters);
  const [animals, adoptions, users] = await Promise.all([
    readAnimalsDataset(),
    readAdoptionsDataset(),
    readUsersDataset(),
  ]);

  const filteredAnimals = filterItemsByDate(
    animals,
    (animal) => animal?.intakeDate ?? animal?.createdAt,
    normalizedFilters
  );
  const filteredRequests = filterItemsByDate(
    adoptions,
    (request) => request?.createdAt,
    normalizedFilters
  );
  const filteredUsers = filterItemsByDate(
    users,
    (user) => user?.createdAt,
    normalizedFilters
  );
  const filteredCompletedAdoptions = filterItemsByDate(
    adoptions.filter((request) => normalizeText(request?.status) === 'completed'),
    (request) => request?.updatedAt ?? request?.createdAt,
    normalizedFilters
  );

  return {
    generatedAt: new Date().toISOString(),
    source: buildSourceDescriptor(),
    filters: normalizedFilters,
    dashboard: buildDashboardMetrics(animals, adoptions, users),
    activity: buildActivitySnapshot(
      filteredAnimals,
      filteredRequests,
      filteredCompletedAdoptions,
      filteredUsers
    ),
    reports: {
      requestsByStatus: buildKeyedBreakdown(filteredRequests, ADOPTION_REQUEST_STATUS_VALUES, (request) =>
        normalizeText(request?.status)
      ),
      usersByRole: buildKeyedBreakdown(filteredUsers, MANAGED_USER_ROLE_VALUES, (user) =>
        normalizeText(user?.role)
      ),
      usersByActivity: buildUsersByActivityBreakdown(filteredUsers),
      adoptions: {
        totalRequests: filteredRequests.length,
        completedCount: filteredCompletedAdoptions.length,
      },
    },
  };
}

export async function getAnimalMasterDataReport(filters = {}) {
  const normalizedFilters = normalizeReportsFilters(filters);
  const animals = await readAnimalsDataset();
  const filteredAnimals = filterItemsByDate(
    animals,
    (animal) => animal?.intakeDate ?? animal?.createdAt,
    normalizedFilters
  );

  return {
    generatedAt: new Date().toISOString(),
    source: buildSourceDescriptor(),
    filters: normalizedFilters,
    animalStatusBreakdown: buildKeyedBreakdown(filteredAnimals, ANIMAL_STATUS_VALUES, (animal) =>
      normalizeText(animal?.status)
    ),
    animalSpeciesBreakdown: buildKeyedBreakdown(filteredAnimals, ANIMAL_SPECIES_VALUES, (animal) =>
      normalizeText(animal?.species)
    ),
    animalSizeBreakdown: buildKeyedBreakdown(filteredAnimals, ANIMAL_SIZE_VALUES, (animal) =>
      normalizeText(animal?.size)
    ),
    animalGenderBreakdown: buildKeyedBreakdown(filteredAnimals, ANIMAL_GENDER_VALUES, (animal) =>
      normalizeText(animal?.gender)
    ),
    animalCareBreakdown: buildAnimalCareBreakdown(filteredAnimals),
    intakeByPeriod: buildIntakeByPeriod(animals),
    totals: {
      totalAnimals: filteredAnimals.length,
      activeRecords: filteredAnimals.filter((animal) => Boolean(animal?.isActive)).length,
      inactiveRecords: filteredAnimals.filter((animal) => !animal?.isActive).length,
    },
    overallTotals: {
      totalAnimals: animals.length,
      activeRecords: animals.filter((animal) => Boolean(animal?.isActive)).length,
      inactiveRecords: animals.filter((animal) => !animal?.isActive).length,
    },
    updatedAt: getLatestAnimalUpdate(filteredAnimals.length > 0 ? filteredAnimals : animals),
  };
}
