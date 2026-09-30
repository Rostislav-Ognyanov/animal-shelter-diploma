import Animal from '../../models/Animal.js';
import AdoptionRequest from '../../models/AdoptionRequest.js';
import ContactInquiry from '../../models/ContactInquiry.js';
import Donation from '../../models/Donation.js';
import RescueReport from '../../models/RescueReport.js';
import User from '../../models/User.js';
import VolunteerApplication from '../../models/VolunteerApplication.js';
import { createHttpError } from '../../utils/httpError.js';
import { normalizeDateOutput } from '../../utils/serialization.js';
import {
  ADOPTION_STATUS_VALUES,
} from '../../../shared/domain/adoptionConstants.js';
import {
  ANIMAL_GENDER_VALUES,
  ANIMAL_SIZE_VALUES,
  ANIMAL_SPECIES_VALUES,
  ANIMAL_STATUS_VALUES,
} from '../animals/animal.constants.js';
import { CONTACT_INQUIRY_STATUS_VALUES } from '../../../shared/domain/contactInquiryConstants.js';
import { DONATION_STATUS_VALUES } from '../../../shared/domain/donationConstants.js';
import {
  RESCUE_REPORT_STATUS_VALUES,
  RESCUE_REPORT_URGENCY_VALUES,
} from '../../../shared/domain/rescueReportConstants.js';
import { MANAGED_USER_ROLE_VALUES } from '../../../shared/domain/roleConstants.js';
import { USER_STATUS_VALUES } from '../../../shared/domain/userConstants.js';
import { VOLUNTEER_STATUS_VALUES } from '../../../shared/domain/volunteerConstants.js';
import {
  REPORT_INTAKE_WINDOWS,
  REPORT_PERIOD_LABELS,
  REPORT_PERIOD_VALUES,
} from '../../../shared/domain/reportConstants.js';

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase();
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

function formatDateOnly(dateValue) {
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function parseDateInput(value, fieldName) {
  if (!value) {
    return null;
  }

  const normalizedValue = String(value).trim();
  const dateOnlyMatch = normalizedValue.match(DATE_ONLY_PATTERN);
  const dateValue = dateOnlyMatch
    ? new Date(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3])
      )
    : new Date(normalizedValue);

  if (
    Number.isNaN(dateValue.getTime()) ||
    (dateOnlyMatch &&
      (dateValue.getFullYear() !== Number(dateOnlyMatch[1]) ||
        dateValue.getMonth() !== Number(dateOnlyMatch[2]) - 1 ||
        dateValue.getDate() !== Number(dateOnlyMatch[3])))
  ) {
    throw createHttpError(400, `Параметърът "${fieldName}" трябва да бъде валидна дата.`);
  }

  return dateValue;
}

function buildFilterLabel(period, dateFrom, dateTo) {
  switch (period) {
    case '7d':
    case '30d':
    case '90d':
    case 'this-month':
    case 'this-year':
      return REPORT_PERIOD_LABELS[period];
    case 'custom': {
      const fromLabel = dateFrom ? formatDateOnly(dateFrom) : 'началото';
      const toLabel = dateTo ? formatDateOnly(dateTo) : 'днес';
      return `Персонализиран диапазон: ${fromLabel} - ${toLabel}`;
    }
    default:
      return REPORT_PERIOD_LABELS['30d'];
  }
}

function normalizeReportsFilters(filters = {}) {
  const normalizedPeriod = normalizeText(filters.period || '30d') || '30d';

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
    isFiltered: true,
    dateFrom: normalizeDateOutput(dateFrom),
    dateTo: normalizeDateOutput(dateTo),
    label: buildFilterLabel(normalizedPeriod, dateFrom, dateTo),
  };
}

async function readUsersDataset() {
  return User.find({})
    .select('role isActive createdAt updatedAt')
    .lean();
}

async function readAnimalsDataset() {
  return Animal.find({})
    .select('species status size gender intakeDate vaccinated neutered isActive createdAt updatedAt')
    .lean();
}

async function readAdoptionsDataset() {
  return AdoptionRequest.find({})
    .select('status statusHistory createdAt updatedAt')
    .lean();
}

async function readVolunteerApplicationsDataset() {
  return VolunteerApplication.find({})
    .select('status createdAt updatedAt')
    .lean();
}

async function readRescueReportsDataset() {
  return RescueReport.find({})
    .select('status urgency createdAt updatedAt')
    .lean();
}

async function readContactInquiriesDataset() {
  return ContactInquiry.find({})
    .select('status createdAt updatedAt')
    .lean();
}

async function readDonationsDataset() {
  return Donation.find({})
    .select('amountCents status statusHistory receivedAt createdAt updatedAt')
    .lean();
}

function buildSourceDescriptor() {
  return {
    mode: 'mongodb',
    label: 'MongoDB',
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

function getDonationAmountCents(donation) {
  if (Number.isInteger(donation?.amountCents)) {
    return donation.amountCents;
  }

  return 0;
}

function getDonationStatus(donation) {
  const status = normalizeText(donation?.status);
  return DONATION_STATUS_VALUES.includes(status) ? status : 'pledged';
}

function sumDonationAmounts(donations) {
  return donations.reduce((sum, donation) => sum + getDonationAmountCents(donation), 0) / 100;
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

function buildDashboardMetrics(animals, adoptions, users, operationalData = {}) {
  const animalStatusBreakdown = buildKeyedBreakdown(animals, ANIMAL_STATUS_VALUES, (animal) =>
    normalizeText(animal?.status)
  );
  const requestsByStatus = buildKeyedBreakdown(adoptions, ADOPTION_STATUS_VALUES, (request) =>
    normalizeText(request?.status)
  );
  const usersByRole = buildKeyedBreakdown(users, MANAGED_USER_ROLE_VALUES, (user) =>
    normalizeText(user?.role)
  );

  const getCount = (collection, key) => collection.find((entry) => entry.key === key)?.count ?? 0;
  const volunteerApplications = operationalData.volunteerApplications ?? [];
  const rescueReports = operationalData.rescueReports ?? [];
  const contactInquiries = operationalData.contactInquiries ?? [];
  const donations = operationalData.donations ?? [];
  const receivedDonations = donations.filter((donation) => getDonationStatus(donation) === 'received');
  const openRescueStatuses = new Set(['pending', 'under-review', 'accepted']);
  const donationAmountTotal = sumDonationAmounts(donations);
  const receivedDonationAmountTotal = sumDonationAmounts(receivedDonations);

  return {
    totalAnimals: animals.length,
    availableAnimals: getCount(animalStatusBreakdown, 'available'),
    reservedAnimals: getCount(animalStatusBreakdown, 'reserved'),
    adoptedAnimals: getCount(animalStatusBreakdown, 'adopted'),
    pendingRequests: getCount(requestsByStatus, 'pending'),
    totalUsers: users.length,
    employeeUsers: getCount(usersByRole, 'employee'),
    adminUsers: getCount(usersByRole, 'admin'),
    pendingVolunteerApplications: volunteerApplications.filter(
      (application) => normalizeText(application?.status) === 'pending'
    ).length,
    openRescueReports: rescueReports.filter((report) =>
      openRescueStatuses.has(normalizeText(report?.status))
    ).length,
    criticalRescueReports: rescueReports.filter((report) =>
      openRescueStatuses.has(normalizeText(report?.status)) &&
      normalizeText(report?.urgency) === 'critical'
    ).length,
    pendingContactInquiries: contactInquiries.filter(
      (inquiry) => normalizeText(inquiry?.status) === 'pending'
    ).length,
    donationRecords: donations.length,
    donationAmountTotal,
    receivedDonationRecords: receivedDonations.length,
    receivedDonationAmountTotal,
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

function buildActivitySnapshot(
  filteredAnimals,
  filteredRequests,
  filteredCompletedAdoptions,
  filteredUsers,
  filteredReceivedDonations = []
) {
  return {
    newAnimals: filteredAnimals.length,
    newRequests: filteredRequests.length,
    completedAdoptions: filteredCompletedAdoptions.length,
    newUsers: filteredUsers.length,
    receivedDonations: filteredReceivedDonations.length,
    receivedDonationAmountTotal: sumDonationAmounts(filteredReceivedDonations),
  };
}

// Operational totals belong to the actual transition time; updatedAt may change later for unrelated edits.
function getStatusReachedAt(item, status) {
  const historyEntries = Array.isArray(item?.statusHistory) ? item.statusHistory : [];
  const matchingEntries = historyEntries
    .filter((entry) => normalizeText(entry?.toStatus) === status && entry?.changedAt)
    .sort((firstEntry, secondEntry) => new Date(secondEntry.changedAt) - new Date(firstEntry.changedAt));

  return matchingEntries[0]?.changedAt ?? item?.updatedAt ?? item?.createdAt;
}

function getDonationReceivedAt(donation) {
  return donation?.receivedAt ?? getStatusReachedAt(donation, 'received');
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
  const [
    animals,
    adoptions,
    users,
    volunteerApplications,
    rescueReports,
    contactInquiries,
    donations,
  ] = await Promise.all([
    readAnimalsDataset(),
    readAdoptionsDataset(),
    readUsersDataset(),
    readVolunteerApplicationsDataset(),
    readRescueReportsDataset(),
    readContactInquiriesDataset(),
    readDonationsDataset(),
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
    (request) => getStatusReachedAt(request, 'completed'),
    normalizedFilters
  );
  const filteredVolunteerApplications = filterItemsByDate(
    volunteerApplications,
    (application) => application?.createdAt,
    normalizedFilters
  );
  const filteredRescueReports = filterItemsByDate(
    rescueReports,
    (report) => report?.createdAt,
    normalizedFilters
  );
  const filteredContactInquiries = filterItemsByDate(
    contactInquiries,
    (inquiry) => inquiry?.createdAt,
    normalizedFilters
  );
  const filteredDonations = filterItemsByDate(
    donations,
    (donation) => donation?.createdAt,
    normalizedFilters
  );
  const filteredReceivedDonations = filterItemsByDate(
    donations.filter((donation) => getDonationStatus(donation) === 'received'),
    getDonationReceivedAt,
    normalizedFilters
  );

  return {
    source: buildSourceDescriptor(),
    filters: normalizedFilters,
    dashboard: buildDashboardMetrics(animals, adoptions, users, {
      volunteerApplications,
      rescueReports,
      contactInquiries,
      donations,
    }),
    activity: buildActivitySnapshot(
      filteredAnimals,
      filteredRequests,
      filteredCompletedAdoptions,
      filteredUsers,
      filteredReceivedDonations
    ),
    reports: {
      requestsByStatus: buildKeyedBreakdown(filteredRequests, ADOPTION_STATUS_VALUES, (request) =>
        normalizeText(request?.status)
      ),
      usersByRole: buildKeyedBreakdown(filteredUsers, MANAGED_USER_ROLE_VALUES, (user) =>
        normalizeText(user?.role)
      ),
      usersByActivity: buildUsersByActivityBreakdown(filteredUsers),
      volunteerApplicationsByStatus: buildKeyedBreakdown(
        filteredVolunteerApplications,
        VOLUNTEER_STATUS_VALUES,
        (application) => normalizeText(application?.status)
      ),
      rescueReportsByStatus: buildKeyedBreakdown(
        filteredRescueReports,
        RESCUE_REPORT_STATUS_VALUES,
        (report) => normalizeText(report?.status)
      ),
      rescueReportsByUrgency: buildKeyedBreakdown(
        filteredRescueReports,
        RESCUE_REPORT_URGENCY_VALUES,
        (report) => normalizeText(report?.urgency)
      ),
      contactInquiriesByStatus: buildKeyedBreakdown(
        filteredContactInquiries,
        CONTACT_INQUIRY_STATUS_VALUES,
        (inquiry) => normalizeText(inquiry?.status)
      ),
      donationsByStatus: buildKeyedBreakdown(
        filteredDonations,
        DONATION_STATUS_VALUES,
        getDonationStatus
      ),
      donations: {
        pledgedCreatedCount: filteredDonations.length,
        pledgedCreatedAmountTotal: sumDonationAmounts(filteredDonations),
        receivedCount: filteredReceivedDonations.length,
        receivedAmountTotal: sumDonationAmounts(filteredReceivedDonations),
      },
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
    overallIntakeByPeriod: buildIntakeByPeriod(animals),
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
    updatedAt: getLatestAnimalUpdate(filteredAnimals),
    overallUpdatedAt: getLatestAnimalUpdate(animals),
  };
}
