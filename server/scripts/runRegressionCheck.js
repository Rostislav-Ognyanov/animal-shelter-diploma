// Regression scenarios run only after the connection is validated as a dedicated regression database.
process.env.DB_URL =
  process.env.REGRESSION_DB_URL || 'mongodb://127.0.0.1:27017/animal_shelter_regression?replicaSet=rs0';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'regression-test-secret';

const { connectToDatabase } = await import('../config/db.js');
const { assertRegressionDatabase } = await import('./regressionDatabaseGuard.js');
const { hashPassword } = await import('../modules/auth/auth.security.js');
const { updateAnimalStatus } = await import('../modules/animals/animals.service.js');
const { updateVolunteerApplicationReview } = await import(
  '../modules/volunteers/volunteers.service.js'
);
const { ANIMAL_SPECIES_VALUES, ANIMAL_TEXT_LIMITS } = await import('../modules/animals/animal.constants.js');
const {
  ANIMAL_STATUS_TRANSITIONS,
  ANIMAL_STATUS_VALUES,
  PUBLIC_ANIMAL_LIST_STATUS_VALUES,
} = await import('../../shared/domain/animalConstants.js');
const { ADOPTION_STATUS_TRANSITIONS, ADOPTION_TEXT_LIMITS } = await import(
  '../../shared/domain/adoptionConstants.js'
);
const {
  getTerminalWorkflowStatusValues,
  isTerminalWorkflowStatus,
} = await import('../../shared/domain/workflowStatus.js');
const { isValidPhone } = await import('../../shared/domain/contactValidation.js');
const { LEGAL_CONTENT_LIMITS } = await import('../../shared/domain/legalContentConstants.js');
const { PAGE_CONTENT_LIMITS } = await import('../../shared/domain/pageContentConstants.js');
const { SITE_SETTINGS_LIMITS } = await import('../../shared/domain/siteSettingsConstants.js');
const { default: AdoptionRequest } = await import('../models/AdoptionRequest.js');
const { default: Animal } = await import('../models/Animal.js');
const { default: ContactInquiry } = await import('../models/ContactInquiry.js');
const { default: Donation } = await import('../models/Donation.js');
const { default: Favorite } = await import('../models/Favorite.js');
const { default: LegalContent } = await import('../models/LegalContent.js');
const { default: Notification } = await import('../models/Notification.js');
const { default: PageContent } = await import('../models/PageContent.js');
const { default: RescueReport } = await import('../models/RescueReport.js');
const { default: RescueStory } = await import('../models/RescueStory.js');
const { default: SiteSettings } = await import('../models/SiteSettings.js');
const { default: SpeciesContent } = await import('../models/SpeciesContent.js');
const { default: User } = await import('../models/User.js');
const { default: VolunteerApplication } = await import('../models/VolunteerApplication.js');
const { default: mongoose } = await import('mongoose');
const { default: app } = await import('../app.js');
const {
  getAllowedActions,
  getPermissionsByRole,
  hasPermission,
  normalizeRole,
} = await import('../modules/shared/rolePolicies.js');
const { getProfileMenu } = await import('../modules/shared/profileMenus.js');
const {
  normalizeContentUrl,
  normalizeExternalUrl,
  normalizeImageUrl,
} = await import('../utils/contentUrls.js');
const { createDuplicateKeyHttpError } = await import('../utils/mongoErrors.js');
const { buildPagination, normalizePaginationOptions } = await import('../utils/pagination.js');

function iso(dateValue) {
  return new Date(dateValue).toISOString();
}

function formatLocalDateOnly(dateValue = new Date()) {
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function expectStatus(response, expectedStatus, scenario) {
  expect(
    response.status === expectedStatus,
    `${scenario}: expected ${expectedStatus}, received ${response.status}. ${response.body?.message ?? ''}`
  );
}

function expectHttpError(action, expectedStatus, scenario) {
  let receivedError = null;

  try {
    action();
  } catch (error) {
    receivedError = error;
  }

  expect(
    receivedError?.status === expectedStatus,
    `${scenario}: expected HTTP ${expectedStatus}, received ${receivedError?.status ?? 'no error'}.`
  );
}

function extractItems(response) {
  return response.body?.data?.items ?? [];
}

function extractItem(response) {
  return response.body?.data ?? null;
}

function extractPagination(response) {
  return response.body?.meta?.pagination ?? {};
}

function findNotification(items, type, resourceType, resourceId) {
  return items.find(
    (notification) =>
      notification.type === type &&
      notification.resourceType === resourceType &&
      notification.resourceId === resourceId
  );
}

function expectPagination(response, expectedValues, scenario) {
  const pagination = extractPagination(response);

  Object.entries(expectedValues).forEach(([fieldName, expectedValue]) => {
    expect(
      pagination[fieldName] === expectedValue,
      `${scenario}: expected pagination.${fieldName} to be ${expectedValue}, received ${pagination[fieldName]}`
    );
  });
}

function buildRegressionAdoptionPayload(overrides = {}) {
  const {
    motivation: overrideMotivation,
    ...payloadOverrides
  } = overrides;
  const motivation =
    overrideMotivation ??
    'Stable home and previous experience with dogs and cats.';

  return {
    contactPhone: '+359888111222',
    housingType: 'apartment',
    housingTypeOther: '',
    hasYard: null,
    yardSecurity: null,
    animalLivingPlace: 'indoors',
    animalLivingPlaceOther: '',
    householdMembersCount: 2,
    hasAnimalAllergies: 'no',
    hasOtherPets: false,
    otherPets: [],
    hasPreviousPetExperience: true,
    previousPetExperienceDetails: 'Previous experience with adopted pets.',
    motivation,
    acceptsUnexpectedMedicalCosts: true,
    animalTransport: 'can-arrange',
    ...payloadOverrides,
    motivation,
  };
}

async function createFixtures() {
  const adminPasswordHash = await hashPassword('Admin1234');
  const employeePasswordHash = await hashPassword('Employee1234');
  const clientPasswordHash = await hashPassword('Client1234');

  return {
    users: [
      {
        demoId: 'seed-admin-001',
        firstName: 'System',
        lastName: 'Admin',
        username: 'admin',
        email: 'admin@animalshelter.local',
        passwordHash: adminPasswordHash,
        role: 'admin',
        isActive: true,
        lastLoginAt: null,
        createdAt: iso('2026-04-01T09:00:00Z'),
        updatedAt: iso('2026-04-01T09:00:00Z'),
      },
      {
        demoId: 'seed-employee-001',
        firstName: 'Eva',
        lastName: 'Employee',
        username: 'employee',
        email: 'employee@animalshelter.local',
        passwordHash: employeePasswordHash,
        role: 'employee',
        isActive: true,
        lastLoginAt: null,
        createdAt: iso('2026-04-01T09:05:00Z'),
        updatedAt: iso('2026-04-01T09:05:00Z'),
      },
      {
        demoId: 'seed-client-001',
        firstName: 'Chris',
        lastName: 'Client',
        username: 'client',
        email: 'client@animalshelter.local',
        passwordHash: clientPasswordHash,
        role: 'client',
        isActive: true,
        lastLoginAt: null,
        createdAt: iso('2026-04-01T09:10:00Z'),
        updatedAt: iso('2026-04-01T09:10:00Z'),
      },
    ],
    animals: [
      {
        slug: 'alpha-beagle-dog',
        name: 'Alpha',
        displayName: 'Алфа',
        species: 'dog',
        breed: 'Beagle',
        age: 2,
        gender: 'female',
        size: 'medium',
        status: 'available',
        intakeDate: iso('2026-02-10T00:00:00Z'),
        healthStatus: 'Healthy and socialized',
        vaccinated: true,
        neutered: true,
        description: 'Friendly dog used for regression scenarios.',
        imageUrls: ['images/animals/dog.png'],
        isActive: true,
        createdAt: iso('2026-02-10T10:00:00Z'),
        updatedAt: iso('2026-02-10T10:00:00Z'),
      },
      {
        slug: 'beta-maine-coon-cat',
        name: 'Beta',
        displayName: 'Бета',
        species: 'cat',
        breed: 'Maine Coon',
        age: 4,
        gender: 'male',
        size: 'large',
        status: 'available',
        intakeDate: iso('2026-01-15T00:00:00Z'),
        healthStatus: 'Needs calm home',
        vaccinated: true,
        neutered: false,
        description: 'Calm cat used for cancellation flow.',
        imageUrls: ['images/animals/dog.png'],
        isActive: true,
        createdAt: iso('2026-01-15T10:00:00Z'),
        updatedAt: iso('2026-01-15T10:00:00Z'),
      },
      {
        slug: 'gamma-holland-lop-rabbit',
        name: 'Gamma',
        displayName: 'Гама',
        species: 'rabbit',
        breed: 'Holland Lop',
        age: 1,
        gender: 'female',
        size: 'small',
        status: 'medical-care',
        intakeDate: iso('2026-03-01T00:00:00Z'),
        healthStatus: 'Recovering from treatment',
        vaccinated: false,
        neutered: false,
        description: 'Rabbit used for non-available checks.',
        imageUrls: ['images/animals/dog.png'],
        isActive: true,
        createdAt: iso('2026-03-01T10:00:00Z'),
        updatedAt: iso('2026-03-01T10:00:00Z'),
      },
    ],
    adoptions: [],
    favorites: [],
  };
}

async function clearRegressionCollections() {
  assertRegressionDatabase(mongoose.connection);

  await Promise.all([
    AdoptionRequest.deleteMany({}),
    Animal.deleteMany({}),
    ContactInquiry.deleteMany({}),
    Donation.deleteMany({}),
    Favorite.deleteMany({}),
    LegalContent.deleteMany({}),
    Notification.deleteMany({}),
    PageContent.deleteMany({}),
    RescueReport.deleteMany({}),
    RescueStory.deleteMany({}),
    SiteSettings.deleteMany({}),
    SpeciesContent.deleteMany({}),
    User.deleteMany({}),
    VolunteerApplication.deleteMany({}),
  ]);
}

async function seedMongoFixtures(fixtures) {
  // The regression check seeds its own minimal data instead of depending on demo content.
  await clearRegressionCollections();

  const usersByDemoId = new Map();
  const animalsBySlug = new Map();

  for (const fixtureUser of fixtures.users) {
    const { demoId, ...userDocument } = fixtureUser;
    const createdUser = await User.create(userDocument);
    usersByDemoId.set(demoId, createdUser);
  }

  for (const fixtureAnimal of fixtures.animals) {
    const createdAnimal = await Animal.create(fixtureAnimal);
    animalsBySlug.set(createdAnimal.slug, createdAnimal);
  }

  if (fixtures.adoptions.length > 0) {
    await AdoptionRequest.insertMany(fixtures.adoptions);
  }

  if (fixtures.favorites.length > 0) {
    await Favorite.insertMany(fixtures.favorites);
  }

  return {
    usersByDemoId,
    animalsBySlug,
  };
}

async function seedDonationPaginationFixtures() {
  await Donation.deleteMany({});

  const donationDocuments = Array.from({ length: 25 }, (_, index) => {
    const number = index + 1;
    const paddedNumber = String(number).padStart(2, '0');
    const isFilteredFixture = number <= 12;

    return {
      name: `${isFilteredFixture ? 'Filtered' : 'General'} Pagination Donor ${paddedNumber}`,
      email: `pagination-donor-${paddedNumber}@example.com`,
      phone: `+35988855${String(number).padStart(4, '0')}`,
      amountCents: number * 100,
      message: isFilteredFixture ? 'filtered pagination fixture' : 'general pagination fixture',
      status: 'pledged',
      statusHistory: [
        {
          fromStatus: '',
          toStatus: 'pledged',
          changedBy: null,
          changedByName: '',
          changedAt: iso(`2026-05-${paddedNumber}T10:00:00Z`),
        },
      ],
      createdAt: iso(`2026-05-${paddedNumber}T10:00:00Z`),
      updatedAt: iso(`2026-05-${paddedNumber}T10:00:00Z`),
    };
  });

  await Donation.insertMany(donationDocuments);
}

async function seedVolunteerPaginationFixtures() {
  await VolunteerApplication.deleteMany({});

  await VolunteerApplication.insertMany(
    Array.from({ length: 3 }, (_, index) => {
      const number = index + 1;
      const paddedNumber = String(number).padStart(2, '0');

      return {
        firstName: `Volunteer${paddedNumber}`,
        lastName: 'Pagination',
        email: `volunteer-pagination-${paddedNumber}@example.com`,
        phone: `+35988777${String(number).padStart(4, '0')}`,
        age: 24 + number,
        guardianConsentVerified: false,
        preferredPositions: ['animal-care'],
        motivation: 'Regression pagination fixture.',
        experience: '',
        availability: 'Weekends',
        status: number === 1 ? 'pending' : number === 2 ? 'under-review' : 'approved',
        createdAt: iso(`2026-06-${paddedNumber}T10:00:00Z`),
        updatedAt: iso(`2026-06-${paddedNumber}T10:00:00Z`),
      };
    })
  );
}

async function seedRescueReportPaginationFixtures() {
  await RescueReport.deleteMany({});

  await RescueReport.insertMany(
    Array.from({ length: 3 }, (_, index) => {
      const number = index + 1;
      const paddedNumber = String(number).padStart(2, '0');

      return {
        name: `Reporter ${paddedNumber}`,
        email: `reporter-pagination-${paddedNumber}@example.com`,
        phone: `+35988666${String(number).padStart(4, '0')}`,
        location: `Regression location ${paddedNumber}`,
        species: number === 1 ? 'dog' : number === 2 ? 'cat' : 'rabbit',
        urgency: number === 3 ? 'high' : 'medium',
        description: 'Regression rescue report pagination fixture.',
        imageUrl:
          number === 3
            ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
            : '',
        status: number === 1 ? 'pending' : number === 2 ? 'under-review' : 'accepted',
        createdAt: iso(`2026-07-${paddedNumber}T10:00:00Z`),
        updatedAt: iso(`2026-07-${paddedNumber}T10:00:00Z`),
      };
    })
  );
}

async function createVolunteerTransitionFixture(status, suffix) {
  const createdApplication = await VolunteerApplication.create({
    firstName: `VolunteerTransition${suffix}`,
    lastName: 'Regression',
    email: `volunteer-transition-${suffix}@example.com`,
    phone: `+35988778${String(suffix).padStart(4, '0')}`,
    age: 30,
    guardianConsentVerified: false,
    preferredPositions: ['animal-care'],
    motivation: 'Regression status transition fixture.',
    experience: '',
    availability: 'Weekdays',
    status,
  });

  return String(createdApplication._id);
}

async function createMinorVolunteerTransitionFixture(
  status,
  suffix,
  { guardianConsentVerified = false } = {}
) {
  const createdApplication = await VolunteerApplication.create({
    firstName: `MinorVolunteer${suffix}`,
    lastName: 'Regression',
    email: `minor-volunteer-transition-${suffix}@example.com`,
    phone: `+35988779${String(suffix).padStart(4, '0')}`,
    age: 16,
    guardianConsentVerified,
    guardianName: `Guardian ${suffix}`,
    guardianContact: `+35988780${String(suffix).padStart(4, '0')}`,
    preferredPositions: ['animal-care'],
    motivation: 'Minor volunteer approval regression fixture.',
    experience: '',
    availability: 'Weekends',
    status,
  });

  return String(createdApplication._id);
}

async function createRescueReportTransitionFixture(status, suffix) {
  const createdReport = await RescueReport.create({
    name: `Reporter Transition ${suffix}`,
    email: `reporter-transition-${suffix}@example.com`,
    phone: `+35988667${String(suffix).padStart(4, '0')}`,
    location: `Regression transition location ${suffix}`,
    species: 'dog',
    urgency: 'medium',
    description: 'Regression status transition fixture.',
    imageUrl: '',
    status,
  });

  return String(createdReport._id);
}

async function createContactInquiryTransitionFixture(status, suffix) {
  const createdInquiry = await ContactInquiry.create({
    type: 'general',
    name: `Inquiry Transition ${suffix}`,
    email: `inquiry-transition-${suffix}@example.com`,
    phone: `+35988557${String(suffix).padStart(4, '0')}`,
    subject: 'Regression inquiry',
    description: 'Regression contact inquiry status transition fixture.',
    status,
  });

  return String(createdInquiry._id);
}

function getSetCookieHeader(headers) {
  if (typeof headers.getSetCookie === 'function') {
    const cookies = headers.getSetCookie();
    return cookies[0] ?? '';
  }

  return headers.get('set-cookie') ?? '';
}

class ApiSession {
  constructor(baseUrl, name) {
    this.baseUrl = baseUrl;
    this.name = name;
    this.cookieHeader = '';
  }

  captureCookie(response) {
    const rawSetCookie = getSetCookieHeader(response.headers);

    if (!rawSetCookie) {
      return;
    }

    const cookieMatch = rawSetCookie.match(/^[^;]+/);
    const nextCookie = cookieMatch ? cookieMatch[0] : '';

    if (!nextCookie || /=\s*$/.test(nextCookie)) {
      this.cookieHeader = '';
      return;
    }

    this.cookieHeader = nextCookie;
  }

  async request(method, pathname, { body } = {}) {
    const headers = {};

    if (this.cookieHeader) {
      headers.Cookie = this.cookieHeader;
    }

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${this.baseUrl}${pathname}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    this.captureCookie(response);

    const rawText = await response.text();
    const payload = rawText ? JSON.parse(rawText) : null;

    return {
      status: response.status,
      ok: response.ok,
      body: payload,
    };
  }

  get(pathname) {
    return this.request('GET', pathname);
  }

  post(pathname, body) {
    return this.request('POST', pathname, { body });
  }

  patch(pathname, body) {
    return this.request('PATCH', pathname, { body });
  }

  delete(pathname) {
    return this.request('DELETE', pathname);
  }
}

let server = null;
let regressionDatabaseValidated = false;
const results = [];

async function recordStep(name, action) {
  try {
    await action();
    results.push({ name, status: 'passed' });
    console.log(`[ok] ${name}`);
  } catch (error) {
    results.push({ name, status: 'failed', error: error.message });
    console.error(`[fail] ${name}`);
    throw error;
  }
}

try {
  await recordStep('Shared: RBAC defaults and defensive copies', async () => {
    expect(normalizeRole('not-a-role') === 'guest', 'invalid roles should normalize to guest');
    expect(
      !hasPermission('guest', 'users', 'list'),
      'guest should not receive privileged user permissions'
    );
    expect(
      !hasPermission('employee', 'reports', 'view-operational') &&
        !hasPermission('employee', 'content', 'manage-settings') &&
        !hasPermission('employee', 'content', 'manage-legal') &&
        !hasPermission('employee', 'users', 'list'),
      'employee should not receive admin reports, settings, legal, or user permissions'
    );
    expect(
      hasPermission('admin', 'reports', 'view-operational') &&
        hasPermission('admin', 'content', 'manage-settings') &&
        hasPermission('admin', 'content', 'manage-legal') &&
        hasPermission('admin', 'users', 'list'),
      'admin should receive reports, settings, legal, and user permissions'
    );

    const firstActions = getAllowedActions('employee', 'animals');
    firstActions.push('injected-action');
    expect(
      !getAllowedActions('employee', 'animals').includes('injected-action'),
      'allowed action getters should return copies'
    );

    const firstPermissions = getPermissionsByRole('admin');
    firstPermissions.users.push('injected-permission');
    expect(
      !getPermissionsByRole('admin').users.includes('injected-permission'),
      'permission getters should return copies'
    );

    const firstMenu = getProfileMenu('client');
    firstMenu.links.push({ href: '/injected', label: 'Injected' });
    firstMenu.links[0].label = 'Changed';
    const secondMenu = getProfileMenu('client');
    expect(
      !secondMenu.links.some((link) => link.href === '/injected') &&
        secondMenu.links[0].label !== 'Changed',
      'profile menu getters should return cloned arrays and link objects'
    );
  });

  await recordStep('Shared: strict content URL validation', async () => {
    expectHttpError(
      () => normalizeExternalUrl('https://'),
      400,
      'external URL without hostname'
    );
    expectHttpError(
      () => normalizeExternalUrl('http://'),
      400,
      'HTTP URL without hostname'
    );
    expectHttpError(
      () => normalizeImageUrl('//evil.example/image.jpg'),
      400,
      'protocol-relative image URL'
    );
    expect(
      normalizeExternalUrl('https://example.com') === 'https://example.com',
      'valid external URL should be preserved'
    );
    expect(
      normalizeContentUrl('/animals') === '/animals',
      'valid internal path should be preserved'
    );
  });

  await recordStep('Shared: immutable animal lifecycle and contact validation', async () => {
    expect(Object.isFrozen(ANIMAL_STATUS_VALUES), 'animal status values should be frozen');
    expect(Object.isFrozen(ANIMAL_STATUS_TRANSITIONS), 'animal transition map should be frozen');
    expect(
      Object.values(ANIMAL_STATUS_TRANSITIONS).every(Object.isFrozen),
      'animal transition arrays should be frozen'
    );

    const availableTransitionCount = ANIMAL_STATUS_TRANSITIONS.available.length;
    let mutationFailed = false;

    try {
      ANIMAL_STATUS_TRANSITIONS.available.push('nonsense');
    } catch {
      mutationFailed = true;
    }

    expect(
      mutationFailed && ANIMAL_STATUS_TRANSITIONS.available.length === availableTransitionCount,
      'animal transitions should reject runtime mutation'
    );
    expect(isValidPhone('+359 888 123 456'), 'shared phone validator should accept valid phones');
    expect(!isValidPhone('-------'), 'shared phone validator should reject values without digits');
    expect(!isValidPhone(''), 'shared phone validator should reject an empty required phone');
    expect(
      isValidPhone('', { allowEmpty: true }),
      'shared phone validator should support optional phone fields'
    );
  });

  await recordStep('Shared: terminal workflow status derivation', async () => {
    const terminalAdoptionStatuses = getTerminalWorkflowStatusValues(
      ADOPTION_STATUS_TRANSITIONS
    );

    expect(
      terminalAdoptionStatuses.includes('completed') &&
        terminalAdoptionStatuses.includes('rejected') &&
        terminalAdoptionStatuses.includes('cancelled'),
      'terminal adoption statuses should be derived from the transition map'
    );
    expect(
      !isTerminalWorkflowStatus('approved', ADOPTION_STATUS_TRANSITIONS),
      'approved adoption requests should remain active while completed is allowed'
    );
    expect(
      isTerminalWorkflowStatus('completed', ADOPTION_STATUS_TRANSITIONS),
      'completed adoption requests should be terminal'
    );
  });

  await recordStep('Shared: pagination and duplicate-key errors', async () => {
    const pagination = buildPagination(95, {
      page: 999,
      limit: 10,
      maxLimit: 50,
    });
    expect(pagination.page === 10, 'pagination should clamp to the last real page');
    expectHttpError(
      () => normalizePaginationOptions({ page: 'invalid' }),
      400,
      'invalid pagination page'
    );
    expectHttpError(
      () => normalizePaginationOptions({ limit: 0 }),
      400,
      'invalid pagination limit'
    );

    const duplicateError = createDuplicateKeyHttpError(
      {
        code: 11000,
        keyPattern: { email: 1 },
      },
      {
        fieldMessages: { email: 'Имейлът вече съществува.' },
      }
    );
    expect(
      duplicateError?.status === 409 && duplicateError.message === 'Имейлът вече съществува.',
      'Mongo duplicate-key errors should become HTTP 409 errors'
    );
  });

  await recordStep('Infrastructure: regression database deletion guard', async () => {
    expect(
      assertRegressionDatabase({ name: 'animal_shelter_regression' }) ===
        'animal_shelter_regression',
      'the dedicated regression database should be accepted'
    );

    for (const unsafeDatabaseName of ['', 'animal_shelter', 'animal_shelter_nonregression']) {
      let receivedError = null;

      try {
        assertRegressionDatabase({ name: unsafeDatabaseName });
      } catch (error) {
        receivedError = error;
      }

      expect(
        receivedError instanceof Error,
        `database "${unsafeDatabaseName}" should be rejected by the regression guard`
      );
    }
  });

  await connectToDatabase();
  assertRegressionDatabase(mongoose.connection);
  regressionDatabaseValidated = true;
  const fixtures = await createFixtures();
  const seededFixtures = await seedMongoFixtures(fixtures);
  const adminUserId = String(seededFixtures.usersByDemoId.get('seed-admin-001')._id);
  const employeeUserId = String(seededFixtures.usersByDemoId.get('seed-employee-001')._id);

  server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  const address = server.address();
  const regressionHost = process.env.REGRESSION_SERVER_HOST || 'localhost';
  const baseUrl = `http://${regressionHost}:${address.port}`;
  const guestSession = new ApiSession(baseUrl, 'guest');
  const clientSession = new ApiSession(baseUrl, 'client');
  const employeeSession = new ApiSession(baseUrl, 'employee');
  const adminSession = new ApiSession(baseUrl, 'admin');

  let createdAnimalId = '';
  let adoptionRequestId = '';
  let cancellableRequestId = '';

  await recordStep('Auth: register -> status -> logout -> login', async () => {
    const registerResponse = await clientSession.post('/api/auth/register', {
      firstName: 'Raya',
      lastName: 'Regression',
      username: 'regression-client',
      email: 'regression-client@example.com',
      password: 'Client1234',
      confirmPassword: 'Client1234',
      acceptTerms: true,
    });

    expectStatus(registerResponse, 201, 'register');
    expect(extractItem(registerResponse)?.authenticated === true, 'register should authenticate the new user');
    expect(extractItem(registerResponse)?.role === 'client', 'register should assign client role');
    expect(
      !Object.prototype.hasOwnProperty.call(extractItem(registerResponse) ?? {}, 'accessToken'),
      'register should not expose the JWT in the response body'
    );
    expect(Boolean(clientSession.cookieHeader), 'register should set auth cookie');

    const authStatusAfterRegister = await clientSession.get('/api/auth/status');
    expectStatus(authStatusAfterRegister, 200, 'auth status after register');
    expect(extractItem(authStatusAfterRegister)?.authenticated === true, 'status should be authenticated after register');

    const logoutResponse = await clientSession.post('/api/auth/logout', {});
    expectStatus(logoutResponse, 200, 'logout');
    expect(clientSession.cookieHeader === '', 'logout should clear auth cookie');

    const authStatusAfterLogout = await clientSession.get('/api/auth/status');
    expectStatus(authStatusAfterLogout, 200, 'auth status after logout');
    expect(extractItem(authStatusAfterLogout)?.authenticated === false, 'status should be guest after logout');

    const malformedCookieSession = new ApiSession(baseUrl, 'malformed-auth-cookie');
    malformedCookieSession.cookieHeader = 'animal_shelter_auth=%E0%A4%A';
    const malformedCookieStatusResponse = await malformedCookieSession.get('/api/auth/status');
    expectStatus(malformedCookieStatusResponse, 200, 'malformed auth cookie status');
    expect(
      extractItem(malformedCookieStatusResponse)?.authenticated === false,
      'malformed auth cookie should be treated as an invalid session'
    );
    expect(
      malformedCookieSession.cookieHeader === '',
      'malformed auth cookie should be cleared'
    );

    const invalidAcceptTermsResponse = await guestSession.post('/api/auth/register', {
      firstName: 'Terms',
      lastName: 'Regression',
      username: 'terms-regression-client',
      email: 'terms-regression-client@example.com',
      password: 'Client1234',
      confirmPassword: 'Client1234',
      acceptTerms: 'false',
    });
    expectStatus(invalidAcceptTermsResponse, 400, 'register should require boolean true acceptTerms');

    const forbiddenRoleRegisterResponse = await guestSession.post('/api/auth/register', {
      firstName: 'Role',
      lastName: 'Regression',
      username: 'role-regression-client',
      email: 'role-regression-client@example.com',
      password: 'Client1234',
      confirmPassword: 'Client1234',
      acceptTerms: true,
      role: 'admin',
    });
    expectStatus(forbiddenRoleRegisterResponse, 400, 'register should reject unsupported role field');

    const invalidRememberMeResponse = await guestSession.post('/api/auth/login', {
      identifier: 'client',
      password: 'Client1234',
      rememberMe: 'false',
    });
    expectStatus(invalidRememberMeResponse, 400, 'login should require boolean rememberMe');

    const spacedPasswordSession = new ApiSession(baseUrl, 'spaced-password-client');
    const spacedPasswordRegisterResponse = await spacedPasswordSession.post('/api/auth/register', {
      firstName: 'Spaced',
      lastName: 'Password',
      username: 'spaced-password-client',
      email: 'spaced-password-client@example.com',
      password: ' Client1234 ',
      confirmPassword: ' Client1234 ',
      acceptTerms: true,
    });
    expectStatus(spacedPasswordRegisterResponse, 201, 'register should allow passwords with spaces');

    const spacedPasswordLogoutResponse = await spacedPasswordSession.post('/api/auth/logout', {});
    expectStatus(spacedPasswordLogoutResponse, 200, 'spaced password logout');

    const trimmedPasswordLoginResponse = await spacedPasswordSession.post('/api/auth/login', {
      identifier: 'spaced-password-client',
      password: 'Client1234',
    });
    expectStatus(trimmedPasswordLoginResponse, 401, 'login should not trim stored password spaces');

    const exactPasswordLoginResponse = await spacedPasswordSession.post('/api/auth/login', {
      identifier: 'spaced-password-client',
      password: ' Client1234 ',
    });
    expectStatus(exactPasswordLoginResponse, 200, 'login should accept the exact password with spaces');

    const loginResponse = await clientSession.post('/api/auth/login', {
      identifier: 'regression-client',
      password: 'Client1234',
      rememberMe: true,
    });

    expectStatus(loginResponse, 200, 'login');
    expect(extractItem(loginResponse)?.authenticated === true, 'login should authenticate the user');
    expect(extractItem(loginResponse)?.user?.username === 'regression-client', 'login should return the correct user');
    expect(
      !Object.prototype.hasOwnProperty.call(extractItem(loginResponse) ?? {}, 'accessToken'),
      'login should not expose the JWT in the response body'
    );

    const emailUpdateWithoutPasswordResponse = await clientSession.patch('/api/users/me', {
      firstName: 'Raya',
      lastName: 'Regression',
      email: 'raya.secure@example.com',
    });
    expectStatus(emailUpdateWithoutPasswordResponse, 400, 'self email update should require current password');

    const emailUpdateWithWrongPasswordResponse = await clientSession.patch('/api/users/me', {
      firstName: 'Raya',
      lastName: 'Regression',
      email: 'raya.secure@example.com',
      currentPassword: 'WrongPassword123',
    });
    expectStatus(emailUpdateWithWrongPasswordResponse, 400, 'self email update should reject wrong password');

    const emailUpdateResponse = await clientSession.patch('/api/users/me', {
      firstName: 'Raya',
      lastName: 'Regression',
      email: 'raya.secure@example.com',
      currentPassword: 'Client1234',
    });
    expectStatus(emailUpdateResponse, 200, 'self email update with current password');
    expect(
      extractItem(emailUpdateResponse)?.email === 'raya.secure@example.com',
      'self email update should persist the new email'
    );

    const emailRestoreResponse = await clientSession.patch('/api/users/me', {
      firstName: 'Raya',
      lastName: 'Regression',
      email: 'regression-client@example.com',
      currentPassword: 'Client1234',
    });
    expectStatus(emailRestoreResponse, 200, 'self email restore with current password');

    const profileNameUpdateResponse = await clientSession.patch('/api/users/me', {
      firstName: 'Raya Updated',
      lastName: 'Regression',
      email: 'regression-client@example.com',
    });
    expectStatus(profileNameUpdateResponse, 200, 'self name update without current password');
    expect(
      extractItem(profileNameUpdateResponse)?.firstName === 'Raya Updated',
      'self name update should not require the current password'
    );

    const staleClientSession = new ApiSession(baseUrl, 'stale-client-before-password-change');
    const staleClientLoginResponse = await staleClientSession.post('/api/auth/login', {
      identifier: 'regression-client',
      password: 'Client1234',
    });
    expectStatus(staleClientLoginResponse, 200, 'stale client session setup');

    const passwordChangeResponse = await clientSession.patch('/api/users/me/password', {
      currentPassword: 'Client1234',
      newPassword: 'Client12345',
      confirmPassword: 'Client12345',
    });
    expectStatus(passwordChangeResponse, 200, 'self password change');

    const authStatusAfterPasswordChange = await clientSession.get('/api/auth/status');
    expectStatus(authStatusAfterPasswordChange, 200, 'auth status after password change');
    expect(
      extractItem(authStatusAfterPasswordChange)?.authenticated === true,
      'password change should refresh the current session cookie'
    );

    const staleClientStatusAfterPasswordChange = await staleClientSession.get('/api/auth/status');
    expectStatus(staleClientStatusAfterPasswordChange, 200, 'stale client auth status after password change');
    expect(
      extractItem(staleClientStatusAfterPasswordChange)?.authenticated === false,
      'password change should invalidate previously issued client tokens'
    );
  });

  await recordStep('Auth guards and role access', async () => {
    const loginEmployeeResponse = await employeeSession.post('/api/auth/login', {
      identifier: 'employee',
      password: 'Employee1234',
    });
    expectStatus(loginEmployeeResponse, 200, 'employee login');

    const loginAdminResponse = await adminSession.post('/api/auth/login', {
      identifier: 'admin',
      password: 'Admin1234',
    });
    expectStatus(loginAdminResponse, 200, 'admin login');

    const guestOwnRequestsResponse = await guestSession.get('/api/adoptions/my');
    expectStatus(guestOwnRequestsResponse, 401, 'guest own requests guard');

    const guestNotificationsResponse = await guestSession.get('/api/notifications');
    expectStatus(guestNotificationsResponse, 401, 'guest notifications guard');

    const adminUser = await User.findOne({ username: 'admin' }).lean();
    let notificationResourceMismatchRejected = false;

    try {
      await Notification.create({
        recipient: adminUser._id,
        type: 'adoption-created',
        title: 'Invalid notification mapping',
        message: 'Regression mismatch check.',
        resourceType: 'donation',
        resourceId: 'invalid-resource',
      });
    } catch (error) {
      notificationResourceMismatchRejected = Boolean(error?.errors?.resourceType);
    }

    expect(
      notificationResourceMismatchRejected,
      'notification resourceType should match the notification type definition'
    );

    const clientUsersResponse = await clientSession.get('/api/users');
    expectStatus(clientUsersResponse, 403, 'client admin users guard');

    const employeeUsersResponse = await employeeSession.get('/api/users');
    expectStatus(employeeUsersResponse, 403, 'employee admin users guard');

    const adminUsersResponse = await adminSession.get('/api/users');
    expectStatus(adminUsersResponse, 200, 'admin users access');
    const adminUsernames = extractItems(adminUsersResponse).map((user) => user.username);
    expect(
      adminUsernames.length === 5 &&
        adminUsernames.includes('regression-client') &&
        adminUsernames.includes('spaced-password-client'),
      'admin users list should include both clients registered by the auth scenarios'
    );

    const employeeReportsResponse = await employeeSession.get('/api/reports/overview');
    expectStatus(employeeReportsResponse, 403, 'employee reports guard');

    const defaultReportsResponse = await adminSession.get('/api/reports/overview');
    expectStatus(defaultReportsResponse, 200, 'admin reports default period');
    expect(
      extractItem(defaultReportsResponse)?.filters?.period === '30d',
      'reports overview should default to the last 30 days'
    );
    expect(
      !Object.prototype.hasOwnProperty.call(extractItem(defaultReportsResponse) ?? {}, 'generatedAt'),
      'reports overview should omit unused generatedAt metadata'
    );

    const allReportsResponse = await adminSession.get('/api/reports/overview?period=all');
    expectStatus(allReportsResponse, 400, 'reports overview rejects the removed all period');

    const adminReportsResponse = await adminSession.get(
      '/api/reports/overview?period=custom&dateFrom=1900-01-01&dateTo=2099-12-31'
    );
    expectStatus(adminReportsResponse, 200, 'admin reports access');
  });

  await recordStep('Home layout data: role menus and spoofing guard', async () => {
    const guestHomeResponse = await guestSession.get('/api/home');
    expectStatus(guestHomeResponse, 200, 'guest home layout data');
    expect(
      extractItem(guestHomeResponse)?.profileMenu?.role === 'guest',
      'guest home layout should expose the guest profile menu'
    );
    expect(
      extractItem(guestHomeResponse)?.profileMenu?.links?.some((link) => link.href === '/login'),
      'guest profile menu should include login'
    );

    const clientHomeResponse = await clientSession.get('/api/home');
    expectStatus(clientHomeResponse, 200, 'client home layout data');
    expect(
      extractItem(clientHomeResponse)?.profileMenu?.role === 'client',
      'client home layout should expose the client profile menu'
    );
    expect(
      extractItem(clientHomeResponse)?.profileMenu?.links?.some((link) => link.href === '/favorites'),
      'client profile menu should include favorites'
    );

    const guestSpoofedHomeResponse = await guestSession.get('/api/home?role=admin');
    expectStatus(guestSpoofedHomeResponse, 200, 'guest home role spoofing guard');
    expect(
      extractItem(guestSpoofedHomeResponse)?.profileMenu?.role === 'guest',
      'guest role query must not select an admin profile menu'
    );

    const clientSpoofedHomeResponse = await clientSession.get('/api/home?role=admin');
    expectStatus(clientSpoofedHomeResponse, 200, 'client home role spoofing guard');
    expect(
      extractItem(clientSpoofedHomeResponse)?.profileMenu?.role === 'client',
      'authenticated role must take precedence over the role query'
    );

    const guestLayoutData = extractItem(guestHomeResponse) ?? {};
    expect(
      !['siteSettings', 'navItems', 'userRole', 'roleLabel'].some((fieldName) =>
        Object.prototype.hasOwnProperty.call(guestLayoutData, fieldName)
      ),
      'home layout response should omit legacy navigation and role metadata'
    );
  });

  await recordStep('Content modules: permissions, publication workflow and empty public lists', async () => {
    const guestPageContentResponse = await guestSession.get('/api/page-content/about');
    expectStatus(guestPageContentResponse, 200, 'guest page content read');
    expect(extractItem(guestPageContentResponse)?.pageKey === 'about', 'guest page content should expose page key');
    expect(
      extractItem(guestPageContentResponse)?.content === null,
      'missing page content should not fall back to static defaults'
    );
    expect(
      !Object.prototype.hasOwnProperty.call(extractItem(guestPageContentResponse) ?? {}, 'updatedBy'),
      'public page content should not expose updater ids'
    );

    const clientPageContentEditResponse = await clientSession.patch('/api/page-content/about', {
      content: {
        hero: { title: 'Client edit attempt', imagePath: '' },
        blocks: [],
        toggles: [],
      },
    });
    expectStatus(clientPageContentEditResponse, 403, 'client page content edit guard');

    const employeePageContentEditResponse = await employeeSession.patch('/api/page-content/about', {
      content: {
        hero: {
          title: 'Regression about',
          imagePath: 'images/page_images/about_page.jpg',
        },
        blocks: [
          {
            id: 'regression-about-block',
            isVisible: true,
            title: 'Regression block',
            text: 'Regression block content.',
            imagePath: '',
            imageAlt: '',
            imagePosition: 'right',
            ctaLabel: '',
            ctaTo: '',
          },
        ],
        toggles: [
          {
            id: 'regression-about-toggle',
            isVisible: true,
            title: 'Regression toggle',
            text: 'Regression toggle content.',
          },
        ],
      },
    });
    expectStatus(employeePageContentEditResponse, 200, 'employee page content edit');
    expect(
      extractItem(employeePageContentEditResponse)?.content?.hero?.title === 'Regression about',
      'employee page content edit should persist normalized content'
    );

    const guestSavedPageContentResponse = await guestSession.get('/api/page-content/about');
    expectStatus(guestSavedPageContentResponse, 200, 'guest saved page content read');
    expect(
      !Object.prototype.hasOwnProperty.call(extractItem(guestSavedPageContentResponse) ?? {}, 'updatedBy'),
      'public saved page content should not expose updater ids'
    );

    const partialPageContentResponse = await employeeSession.patch('/api/page-content/about', {
      content: {
        hero: {
          title: 'Regression about updated',
        },
      },
    });
    expectStatus(partialPageContentResponse, 200, 'page content partial update');
    expect(
      extractItem(partialPageContentResponse)?.content?.hero?.title === 'Regression about updated' &&
        extractItem(partialPageContentResponse)?.content?.hero?.imagePath ===
          'images/page_images/about_page.jpg',
      'partial page content update should preserve untouched nested fields'
    );
    expect(
      extractItem(partialPageContentResponse)?.content?.blocks?.length === 1 &&
        extractItem(partialPageContentResponse)?.content?.toggles?.length === 1,
      'partial page content update should preserve untouched arrays'
    );

    const oversizedPageBlocksResponse = await employeeSession.patch('/api/page-content/about', {
      content: {
        blocks: Array.from({ length: PAGE_CONTENT_LIMITS.blocks + 1 }, (_, index) => ({
          id: `oversized-block-${index}`,
          isVisible: true,
          title: `Oversized block ${index}`,
          text: 'Oversized block regression content.',
          imagePath: '',
          imageAlt: '',
          imagePosition: 'right',
          ctaLabel: '',
          ctaTo: '',
        })),
      },
    });
    expectStatus(oversizedPageBlocksResponse, 400, 'page content block limit guard');

    const pageContentAfterOversizedBlocksResponse = await guestSession.get('/api/page-content/about');
    expectStatus(
      pageContentAfterOversizedBlocksResponse,
      200,
      'page content after rejected oversized blocks'
    );
    expect(
      extractItem(pageContentAfterOversizedBlocksResponse)?.content?.blocks?.length === 1 &&
        extractItem(pageContentAfterOversizedBlocksResponse)?.content?.blocks?.[0]?.id ===
          'regression-about-block',
      'rejected oversized blocks must not truncate or overwrite stored content'
    );

    const oversizedPageCardsResponse = await employeeSession.patch('/api/page-content/support', {
      content: {
        actionCards: Array.from({ length: PAGE_CONTENT_LIMITS.cards + 1 }, (_, index) => ({
          id: `oversized-card-${index}`,
          isVisible: true,
          title: `Oversized card ${index}`,
          description: 'Oversized card regression content.',
          imagePath: '',
          imageAlt: '',
          ctaLabel: '',
          ctaTo: '',
        })),
      },
    });
    expectStatus(oversizedPageCardsResponse, 400, 'page content card limit guard');

    const oversizedParagraphsResponse = await employeeSession.patch('/api/page-content/home', {
      content: {
        about: {
          paragraphs: Array.from(
            { length: PAGE_CONTENT_LIMITS.blocks + 1 },
            (_, index) => `Oversized paragraph ${index}`
          ),
        },
      },
    });
    expectStatus(oversizedParagraphsResponse, 400, 'page content paragraph limit guard');

    const invalidPageCountResponse = await employeeSession.patch('/api/page-content/home', {
      content: {
        rescueStoriesSection: {
          count: PAGE_CONTENT_LIMITS.sectionCountMax + 1,
        },
      },
    });
    expectStatus(invalidPageCountResponse, 400, 'page content count range guard');

    const invalidImagePositionResponse = await employeeSession.patch('/api/page-content/about', {
      content: {
        blocks: [
          {
            id: 'invalid-position-block',
            isVisible: true,
            title: 'Invalid position',
            text: 'Invalid image position regression content.',
            imagePath: '',
            imageAlt: '',
            imagePosition: 'banana',
            ctaLabel: '',
            ctaTo: '',
          },
        ],
      },
    });
    expectStatus(invalidImagePositionResponse, 400, 'page content image position guard');

    const invalidVisibilityResponse = await employeeSession.patch('/api/page-content/about', {
      content: {
        blocks: [
          {
            id: 'invalid-visibility-block',
            isVisible: 'false',
            title: 'Invalid visibility',
            text: 'Invalid visibility regression content.',
            imagePath: '',
            imageAlt: '',
            imagePosition: 'right',
            ctaLabel: '',
            ctaTo: '',
          },
        ],
      },
    });
    expectStatus(invalidVisibilityResponse, 400, 'page content visibility boolean guard');

    const imageAnchorResponse = await employeeSession.patch('/api/page-content/about', {
      content: {
        hero: {
          imagePath: '#not-an-image',
        },
      },
    });
    expectStatus(imageAnchorResponse, 400, 'page content image anchor guard');

    const duplicateBlockIdsResponse = await employeeSession.patch('/api/page-content/about', {
      content: {
        blocks: [0, 1].map((index) => ({
          id: 'duplicate-block-id',
          isVisible: true,
          title: `Duplicate block ${index}`,
          text: 'Duplicate block ID regression content.',
          imagePath: '',
          imageAlt: '',
          imagePosition: 'right',
          ctaLabel: '',
          ctaTo: '',
        })),
      },
    });
    expectStatus(duplicateBlockIdsResponse, 400, 'page content duplicate block id guard');

    const invalidCtaTargetResponse = await employeeSession.patch('/api/page-content/about', {
      content: {
        blocks: [
          {
            id: 'invalid-cta-block',
            isVisible: true,
            title: 'Invalid CTA',
            text: 'Invalid CTA target regression content.',
            imagePath: '',
            imageAlt: '',
            imagePosition: 'right',
            ctaLabel: 'Към администрацията',
            ctaTo: '/admin',
          },
        ],
      },
    });
    expectStatus(invalidCtaTargetResponse, 400, 'page content CTA allowlist guard');

    const missingImageAltResponse = await employeeSession.patch('/api/page-content/about', {
      content: {
        blocks: [
          {
            id: 'missing-image-alt-block',
            isVisible: true,
            title: 'Missing image alt',
            text: 'Missing image alt regression content.',
            imagePath: 'images/page_images/about_hero1.webp',
            imageAlt: '',
            imagePosition: 'right',
            ctaLabel: '',
            ctaTo: '',
          },
        ],
      },
    });
    expectStatus(missingImageAltResponse, 400, 'page content image alt guard');

    const unknownPageContentResponse = await guestSession.get('/api/page-content/unknown-page');
    expectStatus(unknownPageContentResponse, 404, 'unknown page content read guard');

    const unknownPageContentUpdateResponse = await employeeSession.patch(
      '/api/page-content/unknown-page',
      { content: {} }
    );
    expectStatus(unknownPageContentUpdateResponse, 404, 'unknown page content update guard');

    const invalidPageContentResponse = await employeeSession.patch('/api/page-content/home', {
      content: {
        hero: { title: 'Broken home', imagePath: '' },
        helpCards: 'not-a-list',
      },
    });
    expectStatus(invalidPageContentResponse, 400, 'page content invalid block type guard');

    const invalidSettingsUrlResponse = await adminSession.patch('/api/site-settings', {
      siteName: 'Broken settings',
      logoUrl: 'javascript:alert(1)',
      socialLinks: [{ label: 'Bad social link', url: 'javascript:alert(1)' }],
    });
    expectStatus(invalidSettingsUrlResponse, 400, 'site settings invalid URL guard');

    const speciesDraftPayload = {
      displayName: 'Regression Dog',
      title: 'Regression dog title',
      subtitle: 'Regression dog subtitle',
      cardImageUrl: 'images/animals/dog.png',
      cardImageAlt: 'Regression dog card',
      heroImageUrl: 'images/animals/dog.png',
      introduction: 'Regression introduction',
      issues: [],
      sections: [
        {
          title: 'Regression section',
          paragraphs: ['Regression paragraph'],
          items: [],
          imageUrl: '',
          imageAlt: '',
          imagePosition: 'right',
          order: 0,
          isVisible: true,
          centered: false,
        },
      ],
    };

    const invalidSpeciesImageResponse = await employeeSession.patch('/api/species-content/drafts/dog', {
      ...speciesDraftPayload,
      cardImageUrl: 'javascript:alert(1)',
    });
    expectStatus(invalidSpeciesImageResponse, 400, 'species content invalid image URL guard');

    const invalidSpeciesIssuesResponse = await employeeSession.patch('/api/species-content/drafts/dog', {
      ...speciesDraftPayload,
      issues: 'not-an-array',
    });
    expectStatus(invalidSpeciesIssuesResponse, 400, 'species content issues array guard');

    const invalidSpeciesSectionsResponse = await employeeSession.patch('/api/species-content/drafts/dog', {
      ...speciesDraftPayload,
      sections: 'not-an-array',
    });
    expectStatus(invalidSpeciesSectionsResponse, 400, 'species content sections array guard');

    const invalidSpeciesParagraphsResponse = await employeeSession.patch('/api/species-content/drafts/dog', {
      ...speciesDraftPayload,
      sections: [{ ...speciesDraftPayload.sections[0], paragraphs: 'not-an-array' }],
    });
    expectStatus(invalidSpeciesParagraphsResponse, 400, 'species content paragraphs array guard');

    const invalidSpeciesItemsResponse = await employeeSession.patch('/api/species-content/drafts/dog', {
      ...speciesDraftPayload,
      sections: [{ ...speciesDraftPayload.sections[0], items: 'not-an-array' }],
    });
    expectStatus(invalidSpeciesItemsResponse, 400, 'species content items array guard');

    const tooManySpeciesIssuesResponse = await employeeSession.patch('/api/species-content/drafts/dog', {
      ...speciesDraftPayload,
      issues: Array.from({ length: 9 }, (_, index) => `Issue ${index + 1}`),
    });
    expectStatus(tooManySpeciesIssuesResponse, 400, 'species content issues limit');

    const tooManySpeciesSectionsResponse = await employeeSession.patch('/api/species-content/drafts/dog', {
      ...speciesDraftPayload,
      sections: Array.from({ length: 13 }, (_, index) => ({
        ...speciesDraftPayload.sections[0],
        title: `Section ${index + 1}`,
        order: index,
      })),
    });
    expectStatus(tooManySpeciesSectionsResponse, 400, 'species content sections limit');

    const tooManySpeciesParagraphsResponse = await employeeSession.patch('/api/species-content/drafts/dog', {
      ...speciesDraftPayload,
      sections: [
        {
          ...speciesDraftPayload.sections[0],
          paragraphs: Array.from({ length: 13 }, (_, index) => `Paragraph ${index + 1}`),
        },
      ],
    });
    expectStatus(tooManySpeciesParagraphsResponse, 400, 'species content paragraphs limit');

    const invalidSpeciesPositionResponse = await employeeSession.patch('/api/species-content/drafts/dog', {
      ...speciesDraftPayload,
      sections: [{ ...speciesDraftPayload.sections[0], imagePosition: 'banana' }],
    });
    expectStatus(invalidSpeciesPositionResponse, 400, 'species content image position guard');

    const invalidSpeciesVisibilityResponse = await employeeSession.patch('/api/species-content/drafts/dog', {
      ...speciesDraftPayload,
      sections: [{ ...speciesDraftPayload.sections[0], isVisible: 'false' }],
    });
    expectStatus(invalidSpeciesVisibilityResponse, 400, 'species content visibility boolean guard');

    const invalidSpeciesCenteredResponse = await employeeSession.patch('/api/species-content/drafts/dog', {
      ...speciesDraftPayload,
      sections: [{ ...speciesDraftPayload.sections[0], centered: 'false' }],
    });
    expectStatus(invalidSpeciesCenteredResponse, 400, 'species content centered boolean guard');

    const invalidSpeciesOrderResponse = await employeeSession.patch('/api/species-content/drafts/dog', {
      ...speciesDraftPayload,
      sections: [{ ...speciesDraftPayload.sections[0], order: '1' }],
    });
    expectStatus(invalidSpeciesOrderResponse, 400, 'species content order number guard');

    const longSpeciesTitleResponse = await employeeSession.patch('/api/species-content/drafts/dog', {
      ...speciesDraftPayload,
      title: 'x'.repeat(181),
    });
    expectStatus(longSpeciesTitleResponse, 400, 'species content title length guard');

    const employeeSpeciesDraftResponse = await employeeSession.patch('/api/species-content/drafts/dog', speciesDraftPayload);
    expectStatus(employeeSpeciesDraftResponse, 200, 'employee species draft update');
    expect(extractItem(employeeSpeciesDraftResponse)?.isPublished === false, 'employee species draft should stay unpublished');

    const employeeSpeciesDraftSecondResponse = await employeeSession.patch('/api/species-content/drafts/dog', {
      subtitle: 'Regression dog subtitle updated',
    });
    expectStatus(employeeSpeciesDraftSecondResponse, 200, 'employee species partial draft update');
    expect(
      extractItem(employeeSpeciesDraftSecondResponse)?.draft?.title === speciesDraftPayload.title,
      'species content PATCH should preserve omitted draft fields'
    );

    const adminSpeciesNotificationsResponse = await adminSession.get('/api/notifications?limit=20');
    expectStatus(adminSpeciesNotificationsResponse, 200, 'admin species draft notifications');
    const speciesDraftNotifications = extractItems(adminSpeciesNotificationsResponse).filter(
      (notification) =>
        notification.type === 'species-content-draft-updated' &&
        notification.resourceType === 'content' &&
        notification.resourceId === 'dog'
    );
    expect(
      speciesDraftNotifications.length === 1,
      'species draft saves should keep one unread admin notification per species'
    );
    expect(Boolean(speciesDraftNotifications[0]?.lastTriggeredAt), 'species draft notification should expose lastTriggeredAt');

    const originalSpeciesNotificationFindOneAndUpdate = Notification.findOneAndUpdate;
    let notificationFailureDraftResponse;

    try {
      Notification.findOneAndUpdate = () => {
        throw new Error('Simulated species notification failure.');
      };
      notificationFailureDraftResponse = await employeeSession.patch(
        '/api/species-content/drafts/dog',
        {
          introduction: 'Regression introduction saved despite notification failure',
        }
      );
    } finally {
      Notification.findOneAndUpdate = originalSpeciesNotificationFindOneAndUpdate;
    }

    expectStatus(
      notificationFailureDraftResponse,
      200,
      'species draft save should survive notification failure'
    );
    const speciesDraftAfterNotificationFailure = await SpeciesContent.findOne({ species: 'dog' }).lean();
    expect(
      speciesDraftAfterNotificationFailure?.introduction ===
        'Regression introduction saved despite notification failure',
      'species draft should persist when notification delivery fails'
    );

    const incompleteSpeciesDraftResponse = await adminSession.patch('/api/species-content/drafts/cat', {
      subtitle: 'Incomplete draft',
    });
    expectStatus(incompleteSpeciesDraftResponse, 200, 'incomplete species draft can be saved');

    const incompleteSpeciesPublishResponse = await adminSession.patch('/api/species-content/drafts/cat/publish', {});
    expectStatus(incompleteSpeciesPublishResponse, 400, 'incomplete species draft publish guard');

    const employeeSpeciesPublishResponse = await employeeSession.patch('/api/species-content/drafts/dog/publish', {});
    expectStatus(employeeSpeciesPublishResponse, 403, 'employee species publish guard');

    const adminSpeciesPublishResponse = await adminSession.patch('/api/species-content/drafts/dog/publish', {});
    expectStatus(adminSpeciesPublishResponse, 200, 'admin species publish');
    expect(extractItem(adminSpeciesPublishResponse)?.isPublished === true, 'admin species publish should publish the draft');
    expect(
      extractItem(adminSpeciesPublishResponse)?.hasUnpublishedChanges === false,
      'published species draft should match its public snapshot'
    );

    const publicSpeciesDetailResponse = await guestSession.get('/api/species-content/dog');
    expectStatus(publicSpeciesDetailResponse, 200, 'guest species detail after publish');
    expect(extractItem(publicSpeciesDetailResponse)?.displayName === 'Regression Dog', 'published species should be public');
    expect(
      new Date(extractItem(publicSpeciesDetailResponse)?.updatedAt).getTime() ===
        new Date(extractItem(publicSpeciesDetailResponse)?.publishedAt).getTime(),
      'public species updatedAt should describe the published snapshot'
    );

    const postPublishSpeciesDraftResponse = await employeeSession.patch('/api/species-content/drafts/dog', {
      subtitle: 'Private draft after publish',
    });
    expectStatus(postPublishSpeciesDraftResponse, 200, 'post-publish species draft update');
    expect(
      extractItem(postPublishSpeciesDraftResponse)?.hasUnpublishedChanges === true,
      'staff species response should expose unpublished draft changes'
    );

    const publicSpeciesAfterDraftResponse = await guestSession.get('/api/species-content/dog');
    expectStatus(publicSpeciesAfterDraftResponse, 200, 'guest species detail after private draft update');
    expect(
      extractItem(publicSpeciesAfterDraftResponse)?.subtitle === 'Regression dog subtitle updated',
      'private draft edits should not change the public species snapshot'
    );
    expect(
      new Date(extractItem(publicSpeciesAfterDraftResponse)?.updatedAt).getTime() ===
        new Date(extractItem(publicSpeciesDetailResponse)?.updatedAt).getTime(),
      'private draft edits should not change public species metadata'
    );
    expect(
      new Date(extractItem(publicSpeciesAfterDraftResponse)?.publishedAt).getTime() ===
        new Date(extractItem(publicSpeciesDetailResponse)?.publishedAt).getTime(),
      'private draft edits should not change public species publishedAt'
    );

    const adminSpeciesArchiveResponse = await adminSession.patch('/api/species-content/drafts/dog/archive', {});
    expectStatus(adminSpeciesArchiveResponse, 200, 'admin species archive');
    expect(extractItem(adminSpeciesArchiveResponse)?.isPublished === false, 'species archive should hide public content');

    const archivedSpeciesDetailResponse = await guestSession.get('/api/species-content/dog');
    expectStatus(archivedSpeciesDetailResponse, 404, 'archived species public detail');

    const emptySpeciesListResponse = await guestSession.get('/api/species-content');
    expectStatus(emptySpeciesListResponse, 200, 'empty species public list');
    expect(extractItems(emptySpeciesListResponse).length === 0, 'empty species public list should stay empty');

    const rescueStoryPayload = {
      title: 'Regression rescue story',
      slug: 'regression-rescue-story',
      animalName: 'Raya',
      animalType: 'dog',
      submittedBy: 'Regression Author',
      outcomeStatus: 'recovered',
      summary: 'Short regression summary',
      content: 'Full regression rescue story content.',
      imageUrl: '',
      imageAlt: '',
    };

    const invalidStoryAnimalTypeResponse = await employeeSession.post('/api/rescue-stories', {
      ...rescueStoryPayload,
      slug: 'invalid-rescue-story-animal-type',
      animalType: 'куче',
    });
    expectStatus(invalidStoryAnimalTypeResponse, 400, 'rescue story canonical animal type guard');

    const invalidStorySlugResponse = await employeeSession.post('/api/rescue-stories', {
      ...rescueStoryPayload,
      slug: 'invalid rescue story slug',
    });
    expectStatus(invalidStorySlugResponse, 400, 'rescue story slug format guard');

    const overlongStoryTitleResponse = await employeeSession.post('/api/rescue-stories', {
      ...rescueStoryPayload,
      slug: 'overlong-rescue-story-title',
      title: 'x'.repeat(181),
    });
    expectStatus(overlongStoryTitleResponse, 400, 'rescue story title length guard');

    const invalidStoryImageResponse = await employeeSession.post('/api/rescue-stories', {
      ...rescueStoryPayload,
      slug: 'invalid-rescue-story-image',
      imageUrl: 'javascript:alert(1)',
      imageAlt: 'Invalid image',
    });
    expectStatus(invalidStoryImageResponse, 400, 'rescue story invalid image URL guard');

    const fractionalStoryLimitResponse = await guestSession.get('/api/rescue-stories?random=true&limit=3.5');
    expectStatus(fractionalStoryLimitResponse, 400, 'rescue story fractional public limit guard');

    const excessiveStoryLimitResponse = await guestSession.get('/api/rescue-stories?limit=25');
    expectStatus(excessiveStoryLimitResponse, 400, 'rescue story maximum public limit guard');

    const employeeCreateStoryResponse = await employeeSession.post('/api/rescue-stories', rescueStoryPayload);
    expectStatus(employeeCreateStoryResponse, 201, 'employee rescue story draft create');
    const rescueStoryId = extractItem(employeeCreateStoryResponse)?.id;
    expect(Boolean(rescueStoryId), 'created rescue story should return an id');
    expect(extractItem(employeeCreateStoryResponse)?.isPublished === false, 'new employee rescue story should start as draft');
    expect(
      extractItem(employeeCreateStoryResponse)?.publicationStatus === 'draft',
      'new rescue story should expose the draft publication state'
    );

    const duplicateStorySlugResponse = await employeeSession.post('/api/rescue-stories', {
      ...rescueStoryPayload,
      title: 'Another story with the same slug',
    });
    expectStatus(duplicateStorySlugResponse, 409, 'rescue story duplicate slug conflict');

    const adminStoryNotificationsResponse = await adminSession.get('/api/notifications?limit=20');
    expectStatus(adminStoryNotificationsResponse, 200, 'admin rescue story draft notifications');
    const createdStoryNotification = findNotification(
      extractItems(adminStoryNotificationsResponse),
      'rescue-story-draft-created',
      'rescue-story',
      rescueStoryId
    );
    expect(
      Boolean(createdStoryNotification),
      'employee rescue story draft should notify admins'
    );
    expect(Boolean(createdStoryNotification?.lastTriggeredAt), 'rescue story notification should expose lastTriggeredAt');

    const employeeUpdateStoryResponse = await employeeSession.patch(`/api/rescue-stories/${rescueStoryId}`, {
      summary: 'Updated regression summary',
    });
    expectStatus(employeeUpdateStoryResponse, 200, 'employee rescue story draft update');
    expect(
      extractItem(employeeUpdateStoryResponse)?.slug === rescueStoryPayload.slug,
      'partial rescue story update should preserve the custom slug'
    );

    const originalRescueStoryNotificationFindOneAndUpdate = Notification.findOneAndUpdate;
    let notificationFailureStoryResponse;

    try {
      Notification.findOneAndUpdate = () => {
        throw new Error('Simulated rescue story notification failure.');
      };
      notificationFailureStoryResponse = await employeeSession.patch(
        `/api/rescue-stories/${rescueStoryId}`,
        {
          submittedBy: 'Saved despite notification failure',
        }
      );
    } finally {
      Notification.findOneAndUpdate = originalRescueStoryNotificationFindOneAndUpdate;
    }

    expectStatus(
      notificationFailureStoryResponse,
      200,
      'rescue story notification failure should not fail the draft update'
    );
    expect(
      extractItem(notificationFailureStoryResponse)?.submittedBy ===
        'Saved despite notification failure',
      'rescue story update should persist when notification delivery fails'
    );

    const adminStoryUpdatedNotificationsResponse = await adminSession.get('/api/notifications?limit=20');
    expectStatus(adminStoryUpdatedNotificationsResponse, 200, 'admin rescue story updated draft notifications');
    const rescueStoryDraftNotifications = extractItems(adminStoryUpdatedNotificationsResponse).filter(
      (notification) =>
        notification.resourceType === 'rescue-story' &&
        notification.resourceId === rescueStoryId &&
        ['rescue-story-draft-created', 'rescue-story-draft-updated'].includes(notification.type)
    );
    expect(
      rescueStoryDraftNotifications.length === 1,
      'rescue story draft saves should keep one unread admin notification per story'
    );
    expect(
      rescueStoryDraftNotifications[0]?.id === createdStoryNotification.id,
      'rescue story draft update should coalesce the existing unread notification'
    );
    expect(
      rescueStoryDraftNotifications[0]?.type === 'rescue-story-draft-updated',
      'rescue story draft update should refresh the notification type'
    );

    const emptyStoriesBeforePublishResponse = await guestSession.get('/api/rescue-stories');
    expectStatus(emptyStoriesBeforePublishResponse, 200, 'empty rescue stories before publish');
    expect(extractItems(emptyStoriesBeforePublishResponse).length === 0, 'draft rescue story should not be public');

    const employeePublishStoryResponse = await employeeSession.patch(`/api/rescue-stories/${rescueStoryId}/publish`, {});
    expectStatus(employeePublishStoryResponse, 403, 'employee rescue story publish guard');

    const adminPublishStoryResponse = await adminSession.patch(`/api/rescue-stories/${rescueStoryId}/publish`, {});
    expectStatus(adminPublishStoryResponse, 200, 'admin rescue story publish');
    expect(extractItem(adminPublishStoryResponse)?.isPublished === true, 'admin publish should publish rescue story');
    expect(
      extractItem(adminPublishStoryResponse)?.publicationStatus === 'published',
      'published rescue story should expose the published state'
    );

    const repeatedPublishStoryResponse = await adminSession.patch(
      `/api/rescue-stories/${rescueStoryId}/publish`,
      {}
    );
    expectStatus(repeatedPublishStoryResponse, 409, 'rescue story repeated publish guard');

    const publicStoriesAfterPublishResponse = await guestSession.get('/api/rescue-stories');
    expectStatus(publicStoriesAfterPublishResponse, 200, 'public rescue stories after publish');
    expect(extractItems(publicStoriesAfterPublishResponse).length === 1, 'published rescue story should be public');
    expect(
      !Object.prototype.hasOwnProperty.call(extractItems(publicStoriesAfterPublishResponse)[0] ?? {}, 'isFeatured'),
      'public rescue stories should not expose removed featured metadata'
    );
    expect(
      !Object.prototype.hasOwnProperty.call(extractItems(publicStoriesAfterPublishResponse)[0] ?? {}, 'updatedBy'),
      'public rescue stories should not expose updater ids'
    );
    expect(
      !Object.prototype.hasOwnProperty.call(extractItems(publicStoriesAfterPublishResponse)[0] ?? {}, 'isPublished'),
      'public rescue stories should not expose management publication state'
    );
    expect(
      extractItems(publicStoriesAfterPublishResponse)[0]?.animalType === 'dog',
      'public rescue story should expose a canonical animal type'
    );

    const paginationStories = await RescueStory.insertMany(
      Array.from({ length: 6 }, (_, index) => ({
        title: `Pagination rescue story ${index + 1}`,
        slug: `pagination-rescue-story-${index + 1}`,
        animalName: `Pagination animal ${index + 1}`,
        animalType: 'cat',
        submittedBy: 'Regression Author',
        outcomeStatus: 'recovered',
        summary: `Pagination summary ${index + 1}`,
        content: `Pagination content ${index + 1}`,
        imageUrl: '',
        imageAlt: '',
        isPublished: true,
        publishedAt: new Date(Date.UTC(2026, 4, index + 1, 10, 0, 0)),
      }))
    );
    const firstStoriesPageResponse = await guestSession.get('/api/rescue-stories?page=1');
    expectStatus(firstStoriesPageResponse, 200, 'public rescue stories first pagination page');
    expect(
      extractItems(firstStoriesPageResponse).length === 6,
      'first public rescue stories page should contain six records'
    );
    expect(
      firstStoriesPageResponse.body?.data?.total === 7,
      'public rescue stories pagination should expose the filtered total'
    );
    expect(
      extractPagination(firstStoriesPageResponse).limit === 6 &&
        extractPagination(firstStoriesPageResponse).totalPages === 2,
      'public rescue stories should use a six-record page size'
    );

    const secondStoriesPageResponse = await guestSession.get('/api/rescue-stories?page=2');
    expectStatus(secondStoriesPageResponse, 200, 'public rescue stories second pagination page');
    expect(
      extractItems(secondStoriesPageResponse).length === 1 &&
        extractPagination(secondStoriesPageResponse).page === 2,
      'second public rescue stories page should contain the remaining record'
    );
    await RescueStory.deleteMany({
      _id: {
        $in: paginationStories.map((story) => story._id),
      },
    });

    const publicDogStoriesResponse = await guestSession.get('/api/rescue-stories?animalType=dog');
    expectStatus(publicDogStoriesResponse, 200, 'public rescue stories canonical animal filter');
    expect(
      extractItems(publicDogStoriesResponse).length === 1,
      'canonical animal filter should return the published story'
    );

    const employeeUpdatePublishedStoryResponse = await employeeSession.patch(
      `/api/rescue-stories/${rescueStoryId}`,
      {
        ...rescueStoryPayload,
        title: 'Employee should not edit published story',
      }
    );
    expectStatus(employeeUpdatePublishedStoryResponse, 409, 'employee published rescue story update guard');

    const adminUpdatePublishedStoryResponse = await adminSession.patch(
      `/api/rescue-stories/${rescueStoryId}`,
      {
        summary: 'Admin should not edit a published story directly',
      }
    );
    expectStatus(adminUpdatePublishedStoryResponse, 409, 'admin published rescue story update guard');

    const adminUnpublishStoryResponse = await adminSession.patch(
      `/api/rescue-stories/${rescueStoryId}/unpublish`,
      {}
    );
    expectStatus(adminUnpublishStoryResponse, 200, 'admin rescue story unpublish');
    expect(
      extractItem(adminUnpublishStoryResponse)?.publicationStatus === 'unpublished',
      'unpublished rescue story should expose the hidden state'
    );

    const repeatedUnpublishStoryResponse = await adminSession.patch(
      `/api/rescue-stories/${rescueStoryId}/unpublish`,
      {}
    );
    expectStatus(repeatedUnpublishStoryResponse, 409, 'rescue story repeated unpublish guard');

    const adminUpdateHiddenStoryResponse = await adminSession.patch(
      `/api/rescue-stories/${rescueStoryId}`,
      {
        summary: 'Edited only after the public story was hidden',
      }
    );
    expectStatus(adminUpdateHiddenStoryResponse, 200, 'admin hidden rescue story update');

    const adminRepublishStoryResponse = await adminSession.patch(
      `/api/rescue-stories/${rescueStoryId}/publish`,
      {}
    );
    expectStatus(adminRepublishStoryResponse, 200, 'admin rescue story republish');

    const employeeArchiveStoryResponse = await employeeSession.patch(`/api/rescue-stories/${rescueStoryId}/archive`, {});
    expectStatus(employeeArchiveStoryResponse, 403, 'employee published rescue story archive guard');

    const adminArchiveStoryResponse = await adminSession.patch(`/api/rescue-stories/${rescueStoryId}/archive`, {});
    expectStatus(adminArchiveStoryResponse, 200, 'admin rescue story archive');
    expect(
      extractItem(adminArchiveStoryResponse)?.publicationStatus === 'archived',
      'archived rescue story should expose the archived state'
    );

    const repeatedArchiveStoryResponse = await adminSession.patch(
      `/api/rescue-stories/${rescueStoryId}/archive`,
      {}
    );
    expectStatus(repeatedArchiveStoryResponse, 409, 'rescue story repeated archive guard');

    const updateArchivedStoryResponse = await adminSession.patch(
      `/api/rescue-stories/${rescueStoryId}`,
      {
        summary: 'Archived stories are read-only',
      }
    );
    expectStatus(updateArchivedStoryResponse, 409, 'archived rescue story update guard');

    const publishArchivedStoryResponse = await adminSession.patch(
      `/api/rescue-stories/${rescueStoryId}/publish`,
      {}
    );
    expectStatus(publishArchivedStoryResponse, 409, 'archived rescue story publish guard');

    const emptyStoriesAfterArchiveResponse = await guestSession.get('/api/rescue-stories');
    expectStatus(emptyStoriesAfterArchiveResponse, 200, 'empty rescue stories after archive');
    expect(extractItems(emptyStoriesAfterArchiveResponse).length === 0, 'archived rescue story should not be public');

    const guestSettingsUpdateResponse = await guestSession.patch('/api/site-settings', {
      siteName: 'Guest should not edit settings',
    });
    expectStatus(guestSettingsUpdateResponse, 401, 'guest site settings edit guard');

    const employeeSettingsUpdateResponse = await employeeSession.patch('/api/site-settings', {
      siteName: 'Employee should not edit settings',
    });
    expectStatus(employeeSettingsUpdateResponse, 403, 'employee site settings edit guard');

    const adminSettingsUpdateResponse = await adminSession.patch('/api/site-settings', {
      siteName: 'Regression Shelter',
      logoUrl: 'images/logo.jpg',
      copyright: '© 2026 Regression Shelter',
      footerSecondary: 'Regression footer',
      phone: '+359 888 000 000',
      email: 'regression@example.com',
      address: 'Regression address',
      workingHours: '09:00 - 17:00',
      socialLinks: [],
      publicBanner: { isVisible: true, text: 'Regression public banner' },
    });
    expectStatus(adminSettingsUpdateResponse, 200, 'admin site settings edit');
    expect(extractItem(adminSettingsUpdateResponse)?.siteName === 'Regression Shelter', 'admin settings edit should persist site name');

    const updatedHomeLayoutResponse = await guestSession.get('/api/home');
    expectStatus(updatedHomeLayoutResponse, 200, 'home layout after site settings update');
    expect(
      extractItem(updatedHomeLayoutResponse)?.siteName === 'Regression Shelter',
      'home layout should expose the updated site name'
    );
    expect(
      extractItem(updatedHomeLayoutResponse)?.publicBanner?.isVisible === true &&
        extractItem(updatedHomeLayoutResponse)?.publicBanner?.text === 'Regression public banner',
      'home layout should expose the updated public banner'
    );
    expect(
      extractItem(updatedHomeLayoutResponse)?.footer?.secondary === 'Regression footer' &&
        extractItem(updatedHomeLayoutResponse)?.footer?.contactInfo?.email === 'regression@example.com',
      'home layout should expose updated footer settings'
    );

    const partialBannerSettingsResponse = await adminSession.patch('/api/site-settings', {
      publicBanner: {
        isVisible: true,
        text: 'Partial regression banner',
      },
    });
    expectStatus(partialBannerSettingsResponse, 200, 'site settings partial banner update');
    expect(
      extractItem(partialBannerSettingsResponse)?.siteName === 'Regression Shelter' &&
        extractItem(partialBannerSettingsResponse)?.phone === '+359 888 000 000' &&
        extractItem(partialBannerSettingsResponse)?.email === 'regression@example.com',
      'partial banner update should preserve top-level settings'
    );

    const nestedBannerSettingsResponse = await adminSession.patch('/api/site-settings', {
      publicBanner: {
        text: 'Nested partial regression banner',
      },
    });
    expectStatus(nestedBannerSettingsResponse, 200, 'site settings nested partial banner update');
    expect(
      extractItem(nestedBannerSettingsResponse)?.publicBanner?.isVisible === true &&
        extractItem(nestedBannerSettingsResponse)?.publicBanner?.text ===
          'Nested partial regression banner',
      'nested banner update should preserve omitted banner fields'
    );

    const invalidSettingsSocialListResponse = await adminSession.patch('/api/site-settings', {
      socialLinks: 'not-a-list',
    });
    expectStatus(invalidSettingsSocialListResponse, 400, 'site settings social links array guard');

    const missingSettingsSocialLabelResponse = await adminSession.patch('/api/site-settings', {
      socialLinks: [{ url: 'https://example.com/profile' }],
    });
    expectStatus(missingSettingsSocialLabelResponse, 400, 'site settings social link label guard');

    const missingSettingsSocialUrlResponse = await adminSession.patch('/api/site-settings', {
      socialLinks: [{ label: 'Example' }],
    });
    expectStatus(missingSettingsSocialUrlResponse, 400, 'site settings social link URL guard');

    const invalidSettingsSocialUrlResponse = await adminSession.patch('/api/site-settings', {
      socialLinks: [{ label: 'Example', url: 'https://' }],
    });
    expectStatus(invalidSettingsSocialUrlResponse, 400, 'site settings social link URL format guard');

    const invalidSettingsBannerVisibilityResponse = await adminSession.patch('/api/site-settings', {
      publicBanner: { isVisible: 'false' },
    });
    expectStatus(invalidSettingsBannerVisibilityResponse, 400, 'site settings banner boolean guard');

    const emptyVisibleSettingsBannerResponse = await adminSession.patch('/api/site-settings', {
      publicBanner: { isVisible: true, text: '' },
    });
    expectStatus(emptyVisibleSettingsBannerResponse, 400, 'site settings visible banner text guard');

    const invalidSettingsEmailResponse = await adminSession.patch('/api/site-settings', {
      email: 'not-an-email',
    });
    expectStatus(invalidSettingsEmailResponse, 400, 'site settings email guard');

    const invalidSettingsPhoneResponse = await adminSession.patch('/api/site-settings', {
      phone: '-------',
    });
    expectStatus(invalidSettingsPhoneResponse, 400, 'site settings phone guard');

    const overlongSettingsSiteNameResponse = await adminSession.patch('/api/site-settings', {
      siteName: 'S'.repeat(SITE_SETTINGS_LIMITS.siteName + 1),
    });
    expectStatus(overlongSettingsSiteNameResponse, 400, 'site settings site name limit');

    const overlongSettingsBannerResponse = await adminSession.patch('/api/site-settings', {
      publicBanner: { text: 'B'.repeat(SITE_SETTINGS_LIMITS.bannerText + 1) },
    });
    expectStatus(overlongSettingsBannerResponse, 400, 'site settings banner limit');

    const overlongSettingsAddressResponse = await adminSession.patch('/api/site-settings', {
      address: 'A'.repeat(SITE_SETTINGS_LIMITS.address + 1),
    });
    expectStatus(overlongSettingsAddressResponse, 400, 'site settings address limit');

    const tooManySettingsSocialLinksResponse = await adminSession.patch('/api/site-settings', {
      socialLinks: Array.from(
        { length: SITE_SETTINGS_LIMITS.socialLinks + 1 },
        (_, index) => ({ label: `Profile ${index}`, url: `https://example.com/${index}` })
      ),
    });
    expectStatus(tooManySettingsSocialLinksResponse, 400, 'site settings social link count limit');

    const unknownSettingsFieldResponse = await adminSession.patch('/api/site-settings', {
      unsupportedSetting: true,
    });
    expectStatus(unknownSettingsFieldResponse, 400, 'site settings unknown field guard');

    const publicSettingsResponse = await guestSession.get('/api/site-settings');
    expectStatus(publicSettingsResponse, 200, 'guest site settings read');
    expect(
      !Object.prototype.hasOwnProperty.call(extractItem(publicSettingsResponse) ?? {}, 'updatedBy'),
      'public site settings should not expose updater ids'
    );
    expect(
      !Object.prototype.hasOwnProperty.call(extractItem(publicSettingsResponse) ?? {}, 'id'),
      'public site settings should not expose internal record id'
    );
    expect(
      !Object.prototype.hasOwnProperty.call(extractItem(publicSettingsResponse) ?? {}, 'key'),
      'public site settings should not expose the internal key'
    );

    const guestLegalAdminResponse = await guestSession.get('/api/legal-content/admin/records');
    expectStatus(guestLegalAdminResponse, 401, 'guest legal management guard');

    const employeeLegalAdminResponse = await employeeSession.get('/api/legal-content/admin/records');
    expectStatus(employeeLegalAdminResponse, 403, 'employee legal management guard');

    const invalidLegalIntroResponse = await adminSession.patch('/api/legal-content/admin/privacy', {
      intro: 'not-an-array',
    });
    expectStatus(invalidLegalIntroResponse, 400, 'legal intro array type guard');

    const invalidLegalSectionsResponse = await adminSession.patch('/api/legal-content/admin/privacy', {
      sections: 'not-an-array',
    });
    expectStatus(invalidLegalSectionsResponse, 400, 'legal sections array type guard');

    const invalidLegalParagraphsResponse = await adminSession.patch('/api/legal-content/admin/privacy', {
      sections: [
        {
          title: 'Invalid paragraphs',
          paragraphs: 'not-an-array',
          items: [],
          closing: [],
          order: 0,
          isVisible: true,
        },
      ],
    });
    expectStatus(invalidLegalParagraphsResponse, 400, 'legal section paragraphs type guard');

    const invalidLegalVisibilityResponse = await adminSession.patch('/api/legal-content/admin/privacy', {
      sections: [
        {
          title: 'Invalid visibility',
          paragraphs: [],
          items: [],
          closing: [],
          order: 0,
          isVisible: 'false',
        },
      ],
    });
    expectStatus(invalidLegalVisibilityResponse, 400, 'legal section boolean type guard');

    const invalidLegalOrderResponse = await adminSession.patch('/api/legal-content/admin/privacy', {
      sections: [
        {
          title: 'Invalid order',
          paragraphs: [],
          items: [],
          closing: [],
          order: '1',
          isVisible: true,
        },
      ],
    });
    expectStatus(invalidLegalOrderResponse, 400, 'legal section order type guard');

    const overlongLegalTitleResponse = await adminSession.patch('/api/legal-content/admin/privacy', {
      title: 'x'.repeat(LEGAL_CONTENT_LIMITS.title + 1),
    });
    expectStatus(overlongLegalTitleResponse, 400, 'legal title length guard');

    const overlongLegalParagraphResponse = await adminSession.patch('/api/legal-content/admin/privacy', {
      sections: [
        {
          title: 'Overlong paragraph',
          paragraphs: ['x'.repeat(LEGAL_CONTENT_LIMITS.paragraph + 1)],
          items: [],
          closing: [],
          order: 0,
          isVisible: true,
        },
      ],
    });
    expectStatus(overlongLegalParagraphResponse, 400, 'legal paragraph length guard');

    const excessiveLegalSectionsResponse = await adminSession.patch('/api/legal-content/admin/privacy', {
      sections: Array.from({ length: LEGAL_CONTENT_LIMITS.sections + 1 }, (_, index) => ({
        title: `Section ${index + 1}`,
        paragraphs: ['Paragraph'],
        items: [],
        closing: [],
        order: index,
        isVisible: true,
      })),
    });
    expectStatus(excessiveLegalSectionsResponse, 400, 'legal sections count guard');

    const unknownLegalFieldResponse = await adminSession.patch('/api/legal-content/admin/privacy', {
      title: 'Unknown field guard',
      unsupportedField: true,
    });
    expectStatus(unknownLegalFieldResponse, 400, 'legal unknown field guard');

    const unknownLegalPublishFieldResponse = await adminSession.patch(
      '/api/legal-content/admin/privacy/publish',
      { unsupportedField: true }
    );
    expectStatus(unknownLegalPublishFieldResponse, 400, 'legal publish unknown field guard');

    const incompleteLegalDraftResponse = await adminSession.patch('/api/legal-content/admin/terms', {
      title: 'Incomplete terms draft',
      intro: [],
      sections: [],
    });
    expectStatus(incompleteLegalDraftResponse, 200, 'incomplete legal draft save');

    const incompleteLegalPublishResponse = await adminSession.patch(
      '/api/legal-content/admin/terms/publish',
      {}
    );
    expectStatus(incompleteLegalPublishResponse, 400, 'incomplete legal publish guard');

    const legalDraftV1 = {
      title: 'Regression privacy v1',
      lastUpdatedLabel: '2026',
      intro: ['Old public legal intro'],
      sections: [
        {
          title: 'Old section',
          paragraphs: ['Old public legal paragraph'],
          items: [],
          closing: [],
          order: 0,
          isVisible: true,
        },
      ],
    };

    const legalDraftV2 = {
      ...legalDraftV1,
      title: 'Regression privacy v2',
      intro: ['New draft legal intro'],
    };

    const legalDraftSaveResponse = await adminSession.patch('/api/legal-content/admin/privacy', legalDraftV1);
    expectStatus(legalDraftSaveResponse, 200, 'admin legal draft save');
    expect(
      extractItem(legalDraftSaveResponse)?.hasUnpublishedChanges === true,
      'first legal draft should expose unpublished changes'
    );

    const legalPartialDraftResponse = await adminSession.patch('/api/legal-content/admin/privacy', {
      lastUpdatedLabel: '2026 г.',
    });
    expectStatus(legalPartialDraftResponse, 200, 'admin legal partial draft update');
    expect(
      extractItem(legalPartialDraftResponse)?.draft?.title === legalDraftV1.title,
      'partial legal draft update should preserve omitted fields'
    );

    const legalPublishV1Response = await adminSession.patch('/api/legal-content/admin/privacy/publish', {});
    expectStatus(legalPublishV1Response, 200, 'admin legal publish v1');
    expect(
      extractItem(legalPublishV1Response)?.hasUnpublishedChanges === false,
      'legal publish should clear unpublished changes'
    );

    const repeatedLegalPublishResponse = await adminSession.patch(
      '/api/legal-content/admin/privacy/publish',
      {}
    );
    expectStatus(repeatedLegalPublishResponse, 409, 'legal publish without changes guard');

    const publicLegalV1Response = await guestSession.get('/api/legal-content/privacy');
    expectStatus(publicLegalV1Response, 200, 'guest legal v1 read');
    expect(
      extractItem(publicLegalV1Response)?.content?.title === 'Regression privacy v1',
      'public legal content should expose first published version'
    );
    expect(
      !Object.prototype.hasOwnProperty.call(extractItem(publicLegalV1Response) ?? {}, 'updatedBy'),
      'public legal content should not expose updater ids'
    );
    expect(
      !Object.prototype.hasOwnProperty.call(extractItem(publicLegalV1Response) ?? {}, 'publishedBy'),
      'public legal content should not expose publisher ids'
    );

    const legalDraftV2SaveResponse = await adminSession.patch('/api/legal-content/admin/privacy', legalDraftV2);
    expectStatus(legalDraftV2SaveResponse, 200, 'admin legal draft v2 save');
    expect(
      extractItem(legalDraftV2SaveResponse)?.hasUnpublishedChanges === true,
      'legal draft edit should expose unpublished changes'
    );

    const publicLegalStillV1Response = await guestSession.get('/api/legal-content/privacy');
    expectStatus(publicLegalStillV1Response, 200, 'guest legal after draft edit');
    expect(
      extractItem(publicLegalStillV1Response)?.content?.title === 'Regression privacy v1',
      'legal draft edit should not change public text before publish'
    );

    const legalPublishV2Response = await adminSession.patch('/api/legal-content/admin/privacy/publish', {});
    expectStatus(legalPublishV2Response, 200, 'admin legal publish v2');
    expect(
      extractItem(legalPublishV2Response)?.hasUnpublishedChanges === false,
      'second legal publish should clear unpublished changes'
    );
    expect(
      extractItem(legalPublishV2Response)?.history?.length === 1,
      'legal version history should contain only the replaced published version'
    );

    const publicLegalV2Response = await guestSession.get('/api/legal-content/privacy');
    expectStatus(publicLegalV2Response, 200, 'guest legal v2 read');
    expect(
      extractItem(publicLegalV2Response)?.content?.title === 'Regression privacy v2',
      'legal publish should expose new public text'
    );
  });

  await recordStep('Pagination wiring: animals and users endpoints', async () => {
    const animalsPaginationResponse = await guestSession.get('/api/animals?page=2&limit=1');
    expectStatus(animalsPaginationResponse, 200, 'animals pagination wiring');
    expect(extractItems(animalsPaginationResponse).length === 1, 'animals pagination should honor limit=1');
    expect(extractItem(animalsPaginationResponse)?.total === 2, 'animals pagination should expose public total');
    expectPagination(
      animalsPaginationResponse,
      {
        page: 2,
        limit: 1,
        maxLimit: 48,
        total: 2,
        totalPages: 2,
        hasNextPage: false,
        hasPreviousPage: true,
      },
      'animals pagination wiring'
    );

    const usersPaginationResponse = await adminSession.get('/api/users?page=2&limit=2');
    expectStatus(usersPaginationResponse, 200, 'users pagination wiring');
    expect(extractItems(usersPaginationResponse).length === 2, 'users pagination should honor limit=2');
    expect(extractItem(usersPaginationResponse)?.total === 5, 'users pagination should expose total users');
    expect(
      extractItem(usersPaginationResponse)?.summary?.total === 5,
      'users pagination should expose global user summary total'
    );
    expect(
      extractItem(usersPaginationResponse)?.summary?.clients === 3,
      'users pagination should expose global client count'
    );
    expect(
      extractItem(usersPaginationResponse)?.summary?.employees === 1,
      'users pagination should expose global employee count'
    );
    expect(
      extractItem(usersPaginationResponse)?.summary?.admins === 1,
      'users pagination should expose global admin count'
    );
    expectPagination(
      usersPaginationResponse,
      {
        page: 2,
        limit: 2,
        maxLimit: 50,
        total: 5,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      },
      'users pagination wiring'
    );
  });

  await recordStep('Favorites: client add, list, remove and guards', async () => {
    const guestFavoritesResponse = await guestSession.get('/api/favorites');
    expectStatus(guestFavoritesResponse, 401, 'guest favorites guard');

    const employeeFavoritesResponse = await employeeSession.get('/api/favorites');
    expectStatus(employeeFavoritesResponse, 403, 'employee favorites guard');

    const addFavoriteResponse = await clientSession.post('/api/favorites/alpha-beagle-dog', {});
    expectStatus(addFavoriteResponse, 201, 'client add favorite');
    expect(
      extractItem(addFavoriteResponse)?.item?.id === 'alpha-beagle-dog',
      'favorite add should return the selected animal'
    );
    expect(extractItem(addFavoriteResponse)?.created === true, 'favorite add should expose created=true');
    const createdFavoriteId = extractItem(addFavoriteResponse)?.item?.favoriteId;
    expect(Boolean(createdFavoriteId), 'favorite add should expose a stable favoriteId');
    expect(
      !Object.prototype.hasOwnProperty.call(extractItem(addFavoriteResponse) ?? {}, 'policy'),
      'favorite add should not expose policy metadata'
    );

    const duplicateFavoriteResponse = await clientSession.post('/api/favorites/alpha-beagle-dog', {});
    expectStatus(duplicateFavoriteResponse, 200, 'client add duplicate favorite');
    expect(
      extractItem(duplicateFavoriteResponse)?.item?.id === 'alpha-beagle-dog',
      'duplicate favorite add should return the selected animal'
    );
    expect(
      extractItem(duplicateFavoriteResponse)?.created === false,
      'duplicate favorite add should expose created=false'
    );

    const renamedFavoriteAnimal = await Animal.findOneAndUpdate(
      { slug: 'alpha-beagle-dog' },
      { $set: { slug: 'alpha-renamed-beagle-dog' } },
      { returnDocument: 'after', runValidators: true }
    ).lean();
    expect(
      renamedFavoriteAnimal?.slug === 'alpha-renamed-beagle-dog',
      'favorite regression fixture should expose the simulated new slug'
    );

    const listFavoritesResponse = await clientSession.get('/api/favorites');
    expectStatus(listFavoritesResponse, 200, 'client list favorites');
    expect(extractItems(listFavoritesResponse).length === 1, 'favorites list should contain one record after add');
    expect(
      extractItems(listFavoritesResponse)[0]?.id === 'alpha-renamed-beagle-dog',
      'favorites list should keep the animal after slug changes'
    );
    expect(
      extractItems(listFavoritesResponse)[0]?.favoriteId === createdFavoriteId,
      'favorites list should keep the stable favoriteId after slug changes'
    );
    expect(
      !Object.prototype.hasOwnProperty.call(extractItem(listFavoritesResponse) ?? {}, 'policy'),
      'favorites list should not expose policy metadata'
    );

    const reserveFavoriteAnimal = await updateAnimalStatus(
      'alpha-renamed-beagle-dog',
      {
        status: 'reserved',
      },
      null,
      {
        allowSystemManagedStatuses: true,
      }
    );
    expect(reserveFavoriteAnimal?.status === 'reserved', 'system update should reserve the favorited animal');

    const reservedListFavoritesResponse = await clientSession.get('/api/favorites');
    expectStatus(reservedListFavoritesResponse, 200, 'client list favorites with reserved favorite');
    expect(
      extractItems(reservedListFavoritesResponse)[0]?.status === 'reserved',
      'favorites list should keep active reserved favorite animals visible'
    );

    const reservedDuplicateFavoriteResponse = await clientSession.post('/api/favorites/alpha-renamed-beagle-dog', {});
    expectStatus(reservedDuplicateFavoriteResponse, 404, 'client cannot create favorite for reserved animal');

    const removeFavoriteResponse = await clientSession.delete(`/api/favorites/${createdFavoriteId}`);
    expectStatus(removeFavoriteResponse, 200, 'client remove favorite by stable favoriteId after slug change');
    expect(extractItem(removeFavoriteResponse)?.removed === true, 'favorite remove should confirm removal');
    expect(
      extractItem(removeFavoriteResponse)?.favoriteId === createdFavoriteId,
      'favorite remove should confirm the removed favoriteId'
    );

    const restoreFavoriteAnimalStatus = await updateAnimalStatus(
      'alpha-renamed-beagle-dog',
      {
        status: 'available',
      },
      null,
      {
        allowSystemManagedStatuses: true,
      }
    );
    expect(restoreFavoriteAnimalStatus?.status === 'available', 'system update should restore favorite animal status');

    const restoredFavoriteAnimal = await Animal.findOneAndUpdate(
      { slug: 'alpha-renamed-beagle-dog' },
      { $set: { slug: 'alpha-beagle-dog' } },
      { returnDocument: 'after', runValidators: true }
    ).lean();
    expect(
      restoredFavoriteAnimal?.slug === 'alpha-beagle-dog',
      'favorite regression fixture should restore its original slug'
    );

    const emptyFavoritesResponse = await clientSession.get('/api/favorites');
    expectStatus(emptyFavoritesResponse, 200, 'client list favorites after removal');
    expect(extractItems(emptyFavoritesResponse).length === 0, 'favorites list should be empty after removal');

    const unavailableFavoriteResponse = await clientSession.post('/api/favorites/gamma-holland-lop-rabbit', {});
    expectStatus(unavailableFavoriteResponse, 404, 'client cannot favorite a non-available animal');

    const inactiveAnimalResponse = await adminSession.patch('/api/animals/beta-maine-coon-cat/deactivate', {
      status: 'inactive',
    });
    expectStatus(inactiveAnimalResponse, 200, 'admin temporarily deactivates animal for favorite guard');

    const inactiveFavoriteResponse = await clientSession.post('/api/favorites/beta-maine-coon-cat', {});
    expectStatus(inactiveFavoriteResponse, 404, 'client cannot favorite inactive animal');

    const restoreInactiveAnimalResponse = await adminSession.patch('/api/animals/beta-maine-coon-cat/status', {
      status: 'available',
    });
    expectStatus(restoreInactiveAnimalResponse, 200, 'admin restores inactive favorite guard fixture');
  });

  await recordStep('Reports: admin overview and master data', async () => {
    const employeeReportsResponse = await employeeSession.get('/api/reports/overview');
    expectStatus(employeeReportsResponse, 403, 'employee reports overview guard');

    const adminReportsResponse = await adminSession.get('/api/reports/overview');
    expectStatus(adminReportsResponse, 200, 'admin reports overview');
    expect(extractItem(adminReportsResponse)?.dashboard?.totalAnimals === 3, 'reports overview should expose total animals');
    expect(extractItem(adminReportsResponse)?.dashboard?.availableAnimals === 2, 'reports overview should expose available animals');
    expect(extractItem(adminReportsResponse)?.dashboard?.reservedAnimals === 0, 'reports overview should expose reserved animals');
    expect(extractItem(adminReportsResponse)?.dashboard?.adoptedAnimals === 0, 'reports overview should expose adopted animals');
    expect(extractItem(adminReportsResponse)?.dashboard?.pendingRequests === 0, 'reports overview should expose pending requests');
    expect(extractItem(adminReportsResponse)?.dashboard?.totalUsers === 5, 'reports overview should expose total users');
    expect(extractItem(adminReportsResponse)?.dashboard?.employeeUsers === 1, 'reports overview should expose employee users');
    expect(extractItem(adminReportsResponse)?.dashboard?.adminUsers === 1, 'reports overview should expose admin users');
    expect(
      typeof extractItem(adminReportsResponse)?.dashboard?.pendingVolunteerApplications === 'number',
      'reports overview should include volunteer application summary'
    );
    expect(
      typeof extractItem(adminReportsResponse)?.dashboard?.openRescueReports === 'number',
      'reports overview should include rescue report summary'
    );
    expect(
      typeof extractItem(adminReportsResponse)?.dashboard?.pendingContactInquiries === 'number',
      'reports overview should include contact inquiry summary'
    );
    expect(
      typeof extractItem(adminReportsResponse)?.dashboard?.donationRecords === 'number',
      'reports overview should include donation count summary'
    );
    expect(
      typeof extractItem(adminReportsResponse)?.dashboard?.donationAmountTotal === 'number',
      'reports overview should include donation amount summary'
    );
    expect(
      typeof extractItem(adminReportsResponse)?.dashboard?.receivedDonationRecords === 'number',
      'reports overview should include received donation count summary'
    );
    expect(
      typeof extractItem(adminReportsResponse)?.dashboard?.receivedDonationAmountTotal === 'number',
      'reports overview should include received donation amount summary'
    );
    expect(
      Array.isArray(extractItem(adminReportsResponse)?.reports?.volunteerApplicationsByStatus),
      'reports overview should include volunteer applications by status'
    );
    expect(
      Array.isArray(extractItem(adminReportsResponse)?.reports?.rescueReportsByStatus),
      'reports overview should include rescue reports by status'
    );
    expect(
      Array.isArray(extractItem(adminReportsResponse)?.reports?.rescueReportsByUrgency),
      'reports overview should include rescue reports by urgency'
    );
    expect(
      Array.isArray(extractItem(adminReportsResponse)?.reports?.contactInquiriesByStatus),
      'reports overview should include contact inquiries by status'
    );
    expect(
      Array.isArray(extractItem(adminReportsResponse)?.reports?.donationsByStatus),
      'reports overview should include donations by status'
    );
    expect(extractItem(adminReportsResponse)?.activity?.newAnimals === 3, 'reports overview should expose period activity for animals');
    expect((extractItem(adminReportsResponse)?.reports?.usersByRole ?? []).length === 3, 'reports overview should include users by role breakdown');

    const filteredOverviewResponse = await adminSession.get('/api/reports/overview?period=custom&dateFrom=2026-02-01&dateTo=2026-02-28');
    expectStatus(filteredOverviewResponse, 200, 'admin reports overview with custom range');
    expect(extractItem(filteredOverviewResponse)?.filters?.period === 'custom', 'reports overview should expose the custom period');
    expect(
      extractItem(filteredOverviewResponse)?.filters?.label ===
        'Персонализиран диапазон: 2026-02-01 - 2026-02-28',
      'custom reports range should preserve the submitted local dates in its label'
    );
    expect(extractItem(filteredOverviewResponse)?.activity?.newAnimals === 1, 'custom range should narrow new animals to February intake');
    expect(extractItem(filteredOverviewResponse)?.reports?.adoptions?.totalRequests === 0, 'custom range should keep requests empty before adoptions are created');

    const defaultAnimalMasterDataResponse = await adminSession.get(
      '/api/reports/animal-master-data'
    );
    expectStatus(defaultAnimalMasterDataResponse, 200, 'admin animal master data default period');
    expect(
      extractItem(defaultAnimalMasterDataResponse)?.filters?.period === '30d',
      'animal master data should default to the last 30 days'
    );
    expect(
      !Object.prototype.hasOwnProperty.call(
        extractItem(defaultAnimalMasterDataResponse) ?? {},
        'generatedAt'
      ),
      'animal master data should omit unused generatedAt metadata'
    );

    const adminAnimalMasterDataResponse = await adminSession.get(
      '/api/reports/animal-master-data?period=custom&dateFrom=1900-01-01&dateTo=2099-12-31'
    );
    expectStatus(adminAnimalMasterDataResponse, 200, 'admin animal master data');
    expect(extractItem(adminAnimalMasterDataResponse)?.totals?.totalAnimals === 3, 'animal master data should expose total animals');
    expect(
      (extractItem(adminAnimalMasterDataResponse)?.animalSpeciesBreakdown ?? []).length === ANIMAL_SPECIES_VALUES.length,
      'animal master data should include species breakdown'
    );
    expect(
      (extractItem(adminAnimalMasterDataResponse)?.overallIntakeByPeriod ?? []).length === 3,
      'animal master data should include global intake windows'
    );

    const filteredAnimalMasterDataResponse = await adminSession.get('/api/reports/animal-master-data?period=custom&dateFrom=2026-02-01&dateTo=2026-02-28');
    expectStatus(filteredAnimalMasterDataResponse, 200, 'admin filtered animal master data');
    expect(extractItem(filteredAnimalMasterDataResponse)?.totals?.totalAnimals === 1, 'filtered animal master data should narrow the animal slice');
    expect(extractItem(filteredAnimalMasterDataResponse)?.overallTotals?.totalAnimals === 3, 'filtered animal master data should preserve overall totals');

    const emptyAnimalMasterDataResponse = await adminSession.get(
      '/api/reports/animal-master-data?period=custom&dateFrom=1900-01-01&dateTo=1900-01-31'
    );
    expectStatus(emptyAnimalMasterDataResponse, 200, 'admin empty filtered animal master data');
    expect(
      extractItem(emptyAnimalMasterDataResponse)?.totals?.totalAnimals === 0,
      'empty animal master data range should have no filtered animals'
    );
    expect(
      extractItem(emptyAnimalMasterDataResponse)?.updatedAt === null,
      'empty animal master data range should not fall back to a global update date'
    );
    expect(
      Boolean(extractItem(emptyAnimalMasterDataResponse)?.overallUpdatedAt),
      'empty animal master data range should expose the separate global update date'
    );
    expect(
      (extractItem(emptyAnimalMasterDataResponse)?.overallIntakeByPeriod ?? []).length === 3,
      'global intake windows should remain available independently of the report filter'
    );
  });

  await recordStep('Users: admin management rules', async () => {
    const employeeCreateGuardResponse = await employeeSession.post('/api/users/employees', {
      firstName: 'Blocked',
      lastName: 'Creator',
      username: 'blocked-creator',
      email: 'blocked-creator@example.com',
      password: 'Employee1234',
      confirmPassword: 'Employee1234',
    });
    expectStatus(employeeCreateGuardResponse, 403, 'employee create employee guard');

    const employeeRolePayloadResponse = await adminSession.post('/api/users/employees', {
      firstName: 'Role',
      lastName: 'Payload',
      username: 'role-payload',
      email: 'role-payload@example.com',
      password: 'Employee1234',
      confirmPassword: 'Employee1234',
      role: 'client',
    });
    expectStatus(employeeRolePayloadResponse, 400, 'admin create employee should reject role payload');

    const createdEmployeeResponse = await adminSession.post('/api/users/employees', {
      firstName: 'Nina',
      lastName: 'Manager',
      username: 'nina-manager',
      email: 'nina-manager@example.com',
      password: 'Employee1234',
      confirmPassword: 'Employee1234',
    });
    expectStatus(createdEmployeeResponse, 201, 'admin create employee');
    expect(extractItem(createdEmployeeResponse)?.role === 'employee', 'admin create employee should assign employee role');

    const createdEmployeeId = extractItem(createdEmployeeResponse)?.id;
    expect(Boolean(createdEmployeeId), 'admin create employee should expose the created user id');

    const editedEmployeeResponse = await adminSession.patch(`/api/users/${createdEmployeeId}`, {
      firstName: 'Nina',
      lastName: 'Coordinator',
      email: 'nina.coordinator@example.com',
      role: 'employee',
    });
    expectStatus(editedEmployeeResponse, 200, 'admin edit employee');
    expect(
      extractItem(editedEmployeeResponse)?.lastName === 'Coordinator',
      'admin edit employee should update profile fields'
    );
    expect(
      extractItem(editedEmployeeResponse)?.email === 'nina.coordinator@example.com',
      'admin edit employee should update email'
    );

    const roleChangeResponse = await adminSession.patch(`/api/users/${createdEmployeeId}`, {
      firstName: 'Nina',
      lastName: 'Coordinator',
      email: 'nina.coordinator@example.com',
      role: 'client',
    });
    expectStatus(roleChangeResponse, 200, 'admin change another user role');
    expect(extractItem(roleChangeResponse)?.role === 'client', 'admin should be able to change another user role');

    const ownRoleChangeResponse = await adminSession.patch(`/api/users/${adminUserId}`, {
      firstName: 'System',
      lastName: 'Admin',
      email: 'admin@animalshelter.local',
      role: 'client',
    });
    expectStatus(ownRoleChangeResponse, 409, 'admin self role change guard');

    const ownProfileEmailBypassResponse = await adminSession.patch(`/api/users/${adminUserId}`, {
      firstName: 'System',
      lastName: 'Admin',
      email: 'admin-bypass@example.com',
      role: 'admin',
    });
    expectStatus(ownProfileEmailBypassResponse, 409, 'admin self profile email bypass guard');

    const ownDeactivateResponse = await adminSession.patch(`/api/users/${adminUserId}/status`, {
      isActive: false,
    });
    expectStatus(ownDeactivateResponse, 409, 'admin self deactivation guard');

    const statusAliasResponse = await adminSession.patch(`/api/users/${createdEmployeeId}/status`, {
      status: 'inactive',
    });
    expectStatus(statusAliasResponse, 400, 'admin user status alias should be rejected');

    const statusStringResponse = await adminSession.patch(`/api/users/${createdEmployeeId}/status`, {
      isActive: 'inactive',
    });
    expectStatus(statusStringResponse, 400, 'admin user isActive string should be rejected');

    const duplicateEmailResponse = await adminSession.post('/api/users/employees', {
      firstName: 'Duplicate',
      lastName: 'Email',
      username: 'duplicate-email-user',
      email: 'employee@animalshelter.local',
      password: 'Employee1234',
      confirmPassword: 'Employee1234',
    });
    expectStatus(duplicateEmailResponse, 409, 'admin create employee duplicate email');

    const sameNameUserOneResponse = await adminSession.post('/api/users/employees', {
      firstName: 'Same',
      lastName: 'Person',
      username: 'same-pagination-one',
      email: 'same-pagination-one@example.com',
      password: 'Employee1234',
      confirmPassword: 'Employee1234',
    });
    expectStatus(sameNameUserOneResponse, 201, 'admin create first same-name employee');

    const sameNameUserTwoResponse = await adminSession.post('/api/users/employees', {
      firstName: 'Same',
      lastName: 'Person',
      username: 'same-pagination-two',
      email: 'same-pagination-two@example.com',
      password: 'Employee1234',
      confirmPassword: 'Employee1234',
    });
    expectStatus(sameNameUserTwoResponse, 201, 'admin create second same-name employee');

    const sameNameFirstPageResponse = await adminSession.get('/api/users?search=same-pagination&page=1&limit=1');
    const sameNameSecondPageResponse = await adminSession.get('/api/users?search=same-pagination&page=2&limit=1');
    expectStatus(sameNameFirstPageResponse, 200, 'admin users same-name first page');
    expectStatus(sameNameSecondPageResponse, 200, 'admin users same-name second page');
    expect(
      extractItem(sameNameFirstPageResponse)?.total === 2,
      'same-name users search should report both matching users'
    );

    const sameNameFirstItem = extractItems(sameNameFirstPageResponse)[0];
    const sameNameSecondItem = extractItems(sameNameSecondPageResponse)[0];
    expect(
      sameNameFirstItem?.id && sameNameSecondItem?.id && sameNameFirstItem.id !== sameNameSecondItem.id,
      'same-name users should paginate without returning the same record twice'
    );
    expect(
      [sameNameFirstItem, sameNameSecondItem].every(
        (user) => user?.firstName === 'Same' && user?.lastName === 'Person'
      ),
      'same-name pagination should preserve users with identical display names'
    );
  });

  await recordStep('Users: deactivated employee loses access', async () => {
    const staleEmployeeSession = new ApiSession(baseUrl, 'stale-employee-before-deactivate');
    const staleEmployeeLoginResponse = await staleEmployeeSession.post('/api/auth/login', {
      identifier: 'employee',
      password: 'Employee1234',
    });
    expectStatus(staleEmployeeLoginResponse, 200, 'stale employee session setup');

    const deactivateResponse = await adminSession.patch(`/api/users/${employeeUserId}/status`, {
      isActive: false,
    });
    expectStatus(deactivateResponse, 200, 'admin deactivate employee');
    expect(extractItem(deactivateResponse)?.isActive === false, 'employee should become inactive');

    const inactiveStatusResponse = await staleEmployeeSession.get('/api/auth/status');
    expectStatus(inactiveStatusResponse, 200, 'deactivated employee auth status');
    expect(
      extractItem(inactiveStatusResponse)?.authenticated === false,
      'deactivated employee should appear logged out in auth status'
    );
    expect(
      String(extractItem(inactiveStatusResponse)?.authNotice ?? '').includes('деактивиран'),
      'auth status should surface inactive profile notice'
    );

    const inactiveStaffActionResponse = await employeeSession.post('/api/animals', {
      slug: 'inactive-employee-animal',
      name: 'Inactive Attempt',
      species: 'dog',
      breed: 'Mixed',
      age: 1,
      gender: 'male',
      size: 'small',
      status: 'available',
      intakeDate: iso('2026-04-07T00:00:00Z'),
      healthStatus: 'Healthy',
      vaccinated: true,
      neutered: false,
      description: 'This create should be blocked because the employee is inactive.',
      imageUrls: ['images/animals/dog.png'],
    });
    expectStatus(inactiveStaffActionResponse, 401, 'deactivated employee staff guard');
    expect(
      String(inactiveStaffActionResponse.body?.message ?? '').includes('деактивиран'),
      'deactivated employee guard should explain that the profile is inactive'
    );

    const inactiveLoginSession = new ApiSession(baseUrl, 'employee-login-check');
    const loginAfterDeactivateResponse = await inactiveLoginSession.post('/api/auth/login', {
      identifier: 'employee',
      password: 'Employee1234',
    });
    expectStatus(loginAfterDeactivateResponse, 403, 'deactivated employee login guard');
    expect(
      String(loginAfterDeactivateResponse.body?.message ?? '').includes('деактивиран'),
      'deactivated employee login should explain that the profile is inactive'
    );

    const reactivateResponse = await adminSession.patch(`/api/users/${employeeUserId}/status`, {
      isActive: true,
    });
    expectStatus(reactivateResponse, 200, 'admin reactivate employee');
    expect(extractItem(reactivateResponse)?.isActive === true, 'employee should become active again');

    const staleStatusAfterReactivateResponse = await staleEmployeeSession.get('/api/auth/status');
    expectStatus(staleStatusAfterReactivateResponse, 200, 'stale employee auth status after reactivation');
    expect(
      extractItem(staleStatusAfterReactivateResponse)?.authenticated === false,
      'reactivation should not revive a token issued before deactivation'
    );

    const loginAfterReactivateResponse = await inactiveLoginSession.post('/api/auth/login', {
      identifier: 'employee',
      password: 'Employee1234',
    });
    expectStatus(loginAfterReactivateResponse, 200, 'reactivated employee login');
    expect(
      extractItem(loginAfterReactivateResponse)?.authenticated === true,
      'reactivated employee should be able to log in again'
    );
    employeeSession.cookieHeader = inactiveLoginSession.cookieHeader;
  });

  await recordStep('Animals: list, details, filters and sort', async () => {
    const publicCareAnimals = await Animal.create([
      {
        slug: 'care-fox-public-list',
        name: 'Care Fox',
        displayName: 'Лиса под грижа',
        species: 'fox',
        breed: 'Red Fox',
        age: 1,
        gender: 'female',
        size: 'medium',
        status: 'under-care',
        intakeDate: iso('2026-03-05T00:00:00Z'),
        healthStatus: 'Under shelter care',
        vaccinated: false,
        neutered: false,
        description: 'Under-care animal used for public visibility checks.',
        imageUrls: [],
        isActive: true,
      },
      {
        slug: 'protected-owl-public-list',
        name: 'Protected Owl',
        displayName: 'Сова в защитена грижа',
        species: 'owl',
        breed: 'Barn Owl',
        age: 1,
        gender: 'unknown',
        size: 'small',
        status: 'protected-care',
        intakeDate: iso('2026-03-06T00:00:00Z'),
        healthStatus: 'Protected care',
        vaccinated: false,
        neutered: false,
        description: 'Protected-care animal used for public visibility checks.',
        imageUrls: [],
        isActive: true,
      },
    ]);
    const listResponse = await guestSession.get('/api/animals');
    expectStatus(listResponse, 200, 'animals list');
    expect(extractItems(listResponse).length === 4, 'guest animals list should return all public fixtures');
    expect(
      extractItems(listResponse).every((animal) =>
        PUBLIC_ANIMAL_LIST_STATUS_VALUES.includes(animal.status)
      ),
      'guest animals list should expose only public list statuses'
    );
    expect(
      !Object.prototype.hasOwnProperty.call(extractItems(listResponse)[0] ?? {}, 'isActive'),
      'guest animals list should hide internal activity fields'
    );

    const employeeMedicalCareListResponse = await employeeSession.get('/api/animals?status=medical-care');
    expectStatus(employeeMedicalCareListResponse, 200, 'employee animals status filter');
    expect(
      extractItems(employeeMedicalCareListResponse)[0]?.slug === 'gamma-holland-lop-rabbit',
      'employee animals list should allow management status filters'
    );
    expect(
      Object.prototype.hasOwnProperty.call(extractItems(employeeMedicalCareListResponse)[0] ?? {}, 'isActive'),
      'employee animals list should include management activity fields'
    );

    const guestMedicalCareDetailResponse = await guestSession.get('/api/animals/gamma-holland-lop-rabbit');
    expectStatus(guestMedicalCareDetailResponse, 200, 'guest medical-care animal detail');
    expect(
      extractItem(guestMedicalCareDetailResponse)?.status === 'medical-care',
      'guest animal detail should allow active non-available statuses'
    );

    const guestUnderCareFilterResponse = await guestSession.get('/api/animals?status=under-care');
    expectStatus(guestUnderCareFilterResponse, 200, 'guest under-care animals filter');
    expect(
      extractItems(guestUnderCareFilterResponse)[0]?.slug === 'care-fox-public-list',
      'guest animals list should expose under-care animals'
    );

    const guestProtectedCareFilterResponse = await guestSession.get('/api/animals?status=protected-care');
    expectStatus(guestProtectedCareFilterResponse, 200, 'guest protected-care animals filter');
    expect(
      extractItems(guestProtectedCareFilterResponse)[0]?.slug === 'protected-owl-public-list',
      'guest animals list should expose protected-care animals'
    );

    const guestProtectedCareDetailResponse = await guestSession.get(
      '/api/animals/protected-owl-public-list'
    );
    expectStatus(guestProtectedCareDetailResponse, 200, 'guest protected-care animal detail');

    const employeeMedicalCareDetailResponse = await employeeSession.get('/api/animals/gamma-holland-lop-rabbit');
    expectStatus(employeeMedicalCareDetailResponse, 200, 'employee medical-care animal detail');
    expect(
      extractItem(employeeMedicalCareDetailResponse)?.status === 'medical-care',
      'employee animal detail should allow management-only statuses'
    );

    const detailsResponse = await guestSession.get('/api/animals/alpha-beagle-dog');
    expectStatus(detailsResponse, 200, 'animal details');
    expect(extractItem(detailsResponse)?.slug === 'alpha-beagle-dog', 'animal details should resolve by slug');

    const filterResponse = await guestSession.get('/api/animals?species=dog');
    expectStatus(filterResponse, 200, 'animals filter');
    expect(extractItems(filterResponse).length === 1, 'species filter should reduce the list to one dog');

    const searchResponse = await guestSession.get('/api/animals?query=maine');
    expectStatus(searchResponse, 200, 'animals search');
    expect(extractItems(searchResponse).length === 1, 'search should find the Maine Coon record');

    const breedAliasResponse = await guestSession.get(`/api/animals?query=${encodeURIComponent('бийгъл')}`);
    expectStatus(breedAliasResponse, 200, 'animals breed alias search');
    expect(
      extractItems(breedAliasResponse)[0]?.slug === 'alpha-beagle-dog',
      'search should find Beagle by controlled Bulgarian alias'
    );

    const maineAliasResponse = await guestSession.get(`/api/animals?query=${encodeURIComponent('мейн кун')}`);
    expectStatus(maineAliasResponse, 200, 'animals Maine Coon alias search');
    expect(
      extractItems(maineAliasResponse)[0]?.slug === 'beta-maine-coon-cat',
      'search should find Maine Coon by controlled Bulgarian alias'
    );

    const rabbitAliasResponse = await employeeSession.get(`/api/animals?query=${encodeURIComponent('клепоухо зайче')}`);
    expectStatus(rabbitAliasResponse, 200, 'animals rabbit alias search');
    expect(
      extractItems(rabbitAliasResponse)[0]?.slug === 'gamma-holland-lop-rabbit',
      'search should find Holland Lop by controlled Bulgarian alias'
    );

    const sortResponse = await guestSession.get('/api/animals?sort=age-desc');
    expectStatus(sortResponse, 200, 'animals sort');
    expect(extractItems(sortResponse)[0]?.slug === 'beta-maine-coon-cat', 'age-desc sort should place the oldest animal first');

    await Animal.deleteMany({
      _id: { $in: publicCareAnimals.map((animal) => animal._id) },
    });
  });

  await recordStep('Animals: create, edit, status change, archive/deactivate', async () => {
    const clientCreateResponse = await clientSession.post('/api/animals', {
      slug: 'forbidden-client-animal',
      name: 'Forbidden',
      species: 'dog',
      breed: 'Mixed',
      age: 1,
      gender: 'male',
      size: 'small',
      status: 'available',
      intakeDate: iso('2026-04-01T00:00:00Z'),
      healthStatus: 'Healthy',
      vaccinated: true,
      neutered: false,
      description: 'Should not be created by client.',
      imageUrls: ['images/animals/dog.png'],
    });
    expectStatus(clientCreateResponse, 403, 'client create animal guard');

    const createReservedResponse = await employeeSession.post('/api/animals', {
      slug: 'reserved-create-dog',
      name: 'Reserved Create',
      species: 'dog',
      breed: 'Mixed',
      age: 2,
      gender: 'female',
      size: 'medium',
      status: 'reserved',
      intakeDate: iso('2026-04-02T00:00:00Z'),
      healthStatus: 'Healthy',
      vaccinated: true,
      neutered: true,
      description: 'Should not start as reserved without an adoption request.',
      imageUrls: ['images/animals/dog.png'],
    });
    expectStatus(createReservedResponse, 400, 'employee create reserved animal guard');

    const tooManyImagesResponse = await employeeSession.post('/api/animals', {
      slug: 'too-many-images-dog',
      name: 'Too Many Images',
      species: 'dog',
      breed: 'Mixed',
      age: 2,
      gender: 'female',
      size: 'medium',
      status: 'available',
      intakeDate: iso('2026-04-03T00:00:00Z'),
      healthStatus: 'Healthy',
      vaccinated: true,
      neutered: true,
      description: 'Should fail because too many images are attached.',
      imageUrls: [
        'images/animals/dog-one.png',
        'images/animals/dog-two.png',
        'images/animals/dog-three.png',
        'images/animals/dog-four.png',
      ],
    });
    expectStatus(tooManyImagesResponse, 400, 'employee create animal image count guard');

    const invalidBlobImageResponse = await employeeSession.post('/api/animals', {
      slug: 'blob-image-dog',
      name: 'Blob Image',
      species: 'dog',
      breed: 'Mixed',
      age: 2,
      gender: 'female',
      size: 'medium',
      status: 'available',
      intakeDate: iso('2026-04-03T00:00:00Z'),
      healthStatus: 'Healthy',
      vaccinated: true,
      neutered: true,
      description: 'Should fail because blob URLs cannot be stored.',
      imageUrls: ['blob:http://example.com/image'],
    });
    expectStatus(invalidBlobImageResponse, 400, 'employee create animal blob image guard');

    const unsupportedUploadPathResponse = await employeeSession.post('/api/animals', {
      slug: 'unsupported-upload-path-dog',
      name: 'Unsupported Upload Path',
      species: 'dog',
      breed: 'Mixed',
      age: 2,
      gender: 'female',
      size: 'medium',
      status: 'available',
      intakeDate: iso('2026-04-03T00:00:00Z'),
      healthStatus: 'Healthy',
      vaccinated: true,
      neutered: true,
      description: 'Should fail because uploads are not served as static assets.',
      imageUrls: ['uploads/animals/dog.png'],
    });
    expectStatus(
      unsupportedUploadPathResponse,
      400,
      'employee create animal unsupported upload path guard'
    );

    const invalidDataImageResponse = await employeeSession.post('/api/animals', {
      slug: 'text-data-image-dog',
      name: 'Text Data Image',
      species: 'dog',
      breed: 'Mixed',
      age: 2,
      gender: 'female',
      size: 'medium',
      status: 'available',
      intakeDate: iso('2026-04-03T00:00:00Z'),
      healthStatus: 'Healthy',
      vaccinated: true,
      neutered: true,
      description: 'Should fail because non-image data URLs cannot be stored.',
      imageUrls: ['data:text/plain;base64,SGVsbG8='],
    });
    expectStatus(invalidDataImageResponse, 400, 'employee create animal non-image data URL guard');

    const futureIntakeDateResponse = await employeeSession.post('/api/animals', {
      slug: 'future-intake-dog',
      name: 'Future Intake',
      species: 'dog',
      breed: 'Mixed',
      age: 2,
      gender: 'female',
      size: 'medium',
      status: 'available',
      intakeDate: iso('2099-04-03T00:00:00Z'),
      healthStatus: 'Healthy',
      vaccinated: true,
      neutered: true,
      description: 'Should fail because intake date cannot be in the future.',
      imageUrls: ['images/animals/dog.png'],
    });
    expectStatus(futureIntakeDateResponse, 400, 'employee create animal future intake date guard');

    const tooLongDescriptionResponse = await employeeSession.post('/api/animals', {
      slug: 'long-description-dog',
      name: 'Long Description',
      species: 'dog',
      breed: 'Mixed',
      age: 2,
      gender: 'female',
      size: 'medium',
      status: 'available',
      intakeDate: iso('2026-04-03T00:00:00Z'),
      healthStatus: 'Healthy',
      vaccinated: true,
      neutered: true,
      description: 'x'.repeat(ANIMAL_TEXT_LIMITS.description + 1),
      imageUrls: ['images/animals/dog.png'],
    });
    expectStatus(tooLongDescriptionResponse, 400, 'employee create animal text length guard');

    const createResponse = await employeeSession.post('/api/animals', {
      slug: 'delta-labrador-dog',
      name: 'Delta',
      species: 'dog',
      breed: 'Labrador',
      age: 3,
      gender: 'female',
      size: 'large',
      status: 'available',
      intakeDate: iso('2026-04-05T00:00:00Z'),
      healthStatus: 'Excellent condition',
      vaccinated: true,
      neutered: true,
      description: 'Created during regression testing.',
      story: 'Delta was created with a public story during regression testing.',
      historyAndCharacter: 'Delta is calm and friendly in the regression fixture.',
      details: 'Delta has extra management-visible details from the form.',
      careConditions: 'Delta needs regular walks and a stable daily routine.',
      imageUrls: ['images/animals/dog.png'],
    });
    expectStatus(createResponse, 201, 'employee create animal');
    createdAnimalId = extractItem(createResponse)?.slug;
    expect(createdAnimalId === 'delta-labrador-dog', 'created animal should preserve explicit slug');
    expect(
      extractItem(createResponse)?.historyAndCharacter ===
        'Delta is calm and friendly in the regression fixture.',
      'created animal should persist history and character'
    );
    expect(
      !Object.prototype.hasOwnProperty.call(extractItem(createResponse), 'policy'),
      'created animal response should not expose debug policy metadata'
    );
    expect(
      !Object.prototype.hasOwnProperty.call(extractItem(createResponse), 'ageYears'),
      'created animal response should not expose legacy ageYears alias'
    );
    expect(
      !Object.prototype.hasOwnProperty.call(extractItem(createResponse), 'shortDescription'),
      'created animal response should not expose legacy shortDescription alias'
    );
    expect(
      !Object.prototype.hasOwnProperty.call(extractItem(createResponse), 'image'),
      'created animal response should not expose legacy image alias'
    );

    const editResponse = await employeeSession.patch(`/api/animals/${createdAnimalId}`, {
      healthStatus: 'Needs grooming',
      description: 'Updated during regression testing.',
      careConditions: 'Updated care conditions during regression testing.',
    });
    expectStatus(editResponse, 200, 'employee edit animal');
    expect(extractItem(editResponse)?.healthStatus === 'Needs grooming', 'edit should update health status');
    expect(
      extractItem(editResponse)?.careConditions === 'Updated care conditions during regression testing.',
      'edit should update care conditions'
    );

    const employeePatchSlugResponse = await employeeSession.patch(`/api/animals/${createdAnimalId}`, {
      slug: 'delta-labrador-renamed',
    });
    expectStatus(employeePatchSlugResponse, 400, 'employee animal edit slug field guard');

    const statusResponse = await employeeSession.patch(`/api/animals/${createdAnimalId}/status`, {
      status: 'reserved',
    });
    expectStatus(statusResponse, 409, 'employee manual reserved status guard');

    const medicalCareStatusResponse = await employeeSession.patch(`/api/animals/${createdAnimalId}/status`, {
      status: 'medical-care',
    });
    expectStatus(medicalCareStatusResponse, 200, 'employee change animal status to manual status');
    expect(extractItem(medicalCareStatusResponse)?.status === 'medical-care', 'employee should change status to medical-care');

    const employeeStatusEndpointInactiveResponse = await employeeSession.patch(
      `/api/animals/${createdAnimalId}/status`,
      {
        status: 'inactive',
      }
    );
    expectStatus(
      employeeStatusEndpointInactiveResponse,
      403,
      'employee animal status endpoint inactive guard'
    );

    const adminInactiveResponse = await adminSession.patch(
      `/api/animals/${createdAnimalId}/deactivate`,
      {
        status: 'inactive',
      }
    );
    expectStatus(adminInactiveResponse, 200, 'admin marks animal inactive');

    const employeeEditInactiveResponse = await employeeSession.patch(
      `/api/animals/${createdAnimalId}`,
      {
        description: 'Employee must not edit an inactive animal.',
      }
    );
    expectStatus(employeeEditInactiveResponse, 403, 'employee inactive animal edit guard');

    const employeeReactivateResponse = await employeeSession.patch(
      `/api/animals/${createdAnimalId}/status`,
      {
        status: 'medical-care',
      }
    );
    expectStatus(employeeReactivateResponse, 403, 'employee inactive animal reactivation guard');

    const adminReactivateResponse = await adminSession.patch(
      `/api/animals/${createdAnimalId}/status`,
      {
        status: 'medical-care',
      }
    );
    expectStatus(adminReactivateResponse, 200, 'admin reactivates inactive animal');

    const employeePatchArchivedResponse = await employeeSession.patch(`/api/animals/${createdAnimalId}`, {
      status: 'archived',
    });
    expectStatus(employeePatchArchivedResponse, 400, 'employee animal edit status field guard');

    const employeePatchInactiveFlagResponse = await employeeSession.patch(`/api/animals/${createdAnimalId}`, {
      isActive: false,
    });
    expectStatus(employeePatchInactiveFlagResponse, 400, 'employee animal edit active flag guard');

    const employeeDeactivateResponse = await employeeSession.patch(`/api/animals/${createdAnimalId}/deactivate`, {
      status: 'archived',
    });
    expectStatus(employeeDeactivateResponse, 403, 'employee deactivate guard');

    const legacyDeactivateModeResponse = await adminSession.patch(`/api/animals/${createdAnimalId}/deactivate`, {
      mode: 'archived',
    });
    expectStatus(legacyDeactivateModeResponse, 400, 'admin deactivate legacy mode field guard');

    const adminDeactivateResponse = await adminSession.patch(`/api/animals/${createdAnimalId}/deactivate`, {
      status: 'archived',
    });
    expectStatus(adminDeactivateResponse, 200, 'admin deactivate animal');
    expect(
      adminDeactivateResponse.body?.message === 'Животното е архивирано успешно.',
      'admin archive response should use archive-specific message'
    );
    expect(extractItem(adminDeactivateResponse)?.status === 'archived', 'admin deactivate should archive the animal');
    expect(extractItem(adminDeactivateResponse)?.isActive === false, 'archived animal should be inactive');

    const employeeRestoreArchivedResponse = await employeeSession.patch(
      `/api/animals/${createdAnimalId}/status`,
      {
        status: 'available',
      }
    );
    expectStatus(employeeRestoreArchivedResponse, 403, 'employee archived animal reactivation guard');

    const employeeEditArchivedResponse = await employeeSession.patch(
      `/api/animals/${createdAnimalId}`,
      {
        description: 'Employee must not edit an archived animal.',
      }
    );
    expectStatus(employeeEditArchivedResponse, 403, 'employee archived animal edit guard');

    const guestArchivedDetailResponse = await guestSession.get(`/api/animals/${createdAnimalId}`);
    expectStatus(guestArchivedDetailResponse, 404, 'guest archived animal detail guard');

    const guestArchivedFilterResponse = await guestSession.get('/api/animals?status=archived');
    expectStatus(guestArchivedFilterResponse, 200, 'guest archived animals filter guard');
    expect(
      extractItems(guestArchivedFilterResponse).every((animal) => animal.status === 'available'),
      'guest archived status filter should still return only available animals'
    );

    const adoptedLifecycleAnimal = await Animal.create({
      slug: 'adopted-lifecycle-dog',
      name: 'Adopted Lifecycle',
      displayName: 'Adopted Lifecycle',
      species: 'dog',
      breed: 'Mixed',
      age: 4,
      gender: 'female',
      size: 'medium',
      status: 'adopted',
      isActive: true,
      intakeDate: iso('2026-04-06T00:00:00Z'),
      healthStatus: 'Healthy',
      vaccinated: true,
      neutered: true,
      description: 'Adopted animal used to verify lifecycle archiving.',
      imageUrls: ['images/animals/dog.png'],
    });

    const employeeArchiveAdoptedResponse = await employeeSession.patch(
      `/api/animals/${adoptedLifecycleAnimal.slug}/status`,
      {
        status: 'archived',
      }
    );
    expectStatus(employeeArchiveAdoptedResponse, 403, 'employee adopted-to-archived guard');

    const adminArchiveAdoptedResponse = await adminSession.patch(
      `/api/animals/${adoptedLifecycleAnimal.slug}/status`,
      {
        status: 'archived',
      }
    );
    expectStatus(adminArchiveAdoptedResponse, 200, 'admin adopted-to-archived lifecycle transition');
    expect(
      extractItem(adminArchiveAdoptedResponse)?.status === 'archived',
      'admin should archive adopted animal through lifecycle transition'
    );
    expect(
      extractItem(adminArchiveAdoptedResponse)?.isActive === false,
      'archived adopted animal should become inactive'
    );
  });

  await recordStep('Adoptions: submit, my requests, cancel, staff processing, animal sync', async () => {
    const guestCreateResponse = await guestSession.post('/api/adoptions', {
      ...buildRegressionAdoptionPayload({
        motivation: 'Guest should not submit.',
        contactPhone: '+359888000000',
      }),
      animalId: 'alpha-beagle-dog',
    });
    expectStatus(guestCreateResponse, 401, 'guest adoption guard');

    const invalidAdoptionPayloads = [
      {
        scenario: 'adoption validation requires yard answer for house',
        payload: buildRegressionAdoptionPayload({
          animalId: 'alpha-beagle-dog',
          housingType: 'house',
          hasYard: null,
          yardSecurity: null,
          animalLivingPlace: 'indoors',
        }),
      },
      {
        scenario: 'adoption validation requires yard security',
        payload: buildRegressionAdoptionPayload({
          animalId: 'alpha-beagle-dog',
          housingType: 'house',
          hasYard: true,
          yardSecurity: null,
          animalLivingPlace: 'indoors',
        }),
      },
      {
        scenario: 'adoption validation requires other housing description',
        payload: buildRegressionAdoptionPayload({
          animalId: 'alpha-beagle-dog',
          housingType: 'other',
          housingTypeOther: '',
        }),
      },
      {
        scenario: 'adoption validation rejects empty other pets list',
        payload: buildRegressionAdoptionPayload({
          animalId: 'alpha-beagle-dog',
          hasOtherPets: true,
          otherPets: [],
        }),
      },
      {
        scenario: 'adoption validation requires other pet species description',
        payload: buildRegressionAdoptionPayload({
          animalId: 'alpha-beagle-dog',
          hasOtherPets: true,
          otherPets: [
            {
              species: 'other',
              otherSpecies: '',
              sex: 'unknown',
              neuteringStatus: 'unknown',
              vaccinationStatus: 'unknown',
              approximateAge: '',
            },
          ],
        }),
      },
      {
        scenario: 'adoption validation rejects short motivation',
        payload: buildRegressionAdoptionPayload({
          animalId: 'alpha-beagle-dog',
          motivation: 'Too short',
        }),
      },
      {
        scenario: 'adoption validation rejects invalid transport',
        payload: buildRegressionAdoptionPayload({
          animalId: 'alpha-beagle-dog',
          animalTransport: 'bike',
        }),
      },
      {
        scenario: 'adoption validation rejects invalid phone',
        payload: buildRegressionAdoptionPayload({
          animalId: 'alpha-beagle-dog',
          contactPhone: 'not-a-phone',
        }),
      },
      {
        scenario: 'adoption validation rejects phone without enough digits',
        payload: buildRegressionAdoptionPayload({
          animalId: 'alpha-beagle-dog',
          contactPhone: '------',
        }),
      },
      {
        scenario: 'adoption validation requires strict boolean values',
        payload: buildRegressionAdoptionPayload({
          animalId: 'alpha-beagle-dog',
          hasOtherPets: 'yes',
        }),
      },
      {
        scenario: 'adoption validation rejects secured yard without secured house yard',
        payload: buildRegressionAdoptionPayload({
          animalId: 'alpha-beagle-dog',
          housingType: 'apartment',
          hasYard: null,
          yardSecurity: null,
          animalLivingPlace: 'secured-yard',
        }),
      },
      {
        scenario: 'adoption validation rejects too many other pets',
        payload: buildRegressionAdoptionPayload({
          animalId: 'alpha-beagle-dog',
          hasOtherPets: true,
          otherPets: Array.from({ length: 11 }, () => ({
            species: 'cat',
            otherSpecies: '',
            sex: 'unknown',
            neuteringStatus: 'unknown',
            vaccinationStatus: 'unknown',
            approximateAge: '',
          })),
        }),
      },
    ];

    for (const { scenario, payload } of invalidAdoptionPayloads) {
      const invalidAdoptionResponse = await clientSession.post('/api/adoptions', payload);
      expectStatus(invalidAdoptionResponse, 400, scenario);
    }

    const createRequestResponse = await clientSession.post('/api/adoptions', {
      ...buildRegressionAdoptionPayload({
        motivation: 'Stable home and previous experience with dogs.',
        contactPhone: '+359888111222',
      }),
      animalId: 'alpha-beagle-dog',
    });
    expectStatus(createRequestResponse, 201, 'client submit adoption request');
    const createdAdoptionRequest = extractItem(createRequestResponse);
    adoptionRequestId = createdAdoptionRequest?.id;
    expect(createdAdoptionRequest?.status === 'pending', 'new adoption request should start as pending');
    expect(createdAdoptionRequest?.housingType === 'apartment', 'new adoption request should store housing type');
    expect(
      createdAdoptionRequest?.householdMembersCount === 2,
      'new adoption request should store household member count'
    );
    expect(
      createdAdoptionRequest?.motivation === 'Stable home and previous experience with dogs.',
      'new adoption request should expose motivation'
    );
    expect(
      !Object.prototype.hasOwnProperty.call(createdAdoptionRequest ?? {}, 'adoptionMotivation') &&
        !Object.prototype.hasOwnProperty.call(createdAdoptionRequest ?? {}, 'message') &&
        !Object.prototype.hasOwnProperty.call(createdAdoptionRequest ?? {}, 'policy'),
      'new adoption request should expose canonical response fields only'
    );
    expect(
      createdAdoptionRequest?.acceptsUnexpectedMedicalCosts === true,
      'new adoption request should expose medical cost readiness'
    );

    const pendingAdoptionFavoriteResponse = await clientSession.post(
      '/api/favorites/alpha-beagle-dog',
      {}
    );
    expectStatus(
      pendingAdoptionFavoriteResponse,
      201,
      'pending adoption should still allow the animal to be favorited'
    );
    const adoptionFavoriteId = extractItem(pendingAdoptionFavoriteResponse)?.item?.favoriteId;
    expect(Boolean(adoptionFavoriteId), 'pending adoption favorite should expose its stable id');

    const pendingAdoptionFavoritesResponse = await clientSession.get('/api/favorites');
    expectStatus(pendingAdoptionFavoritesResponse, 200, 'favorites after pending adoption request');
    expect(
      extractItems(pendingAdoptionFavoritesResponse).some(
        (entry) => entry.favoriteId === adoptionFavoriteId && entry.status === 'available'
      ),
      'pending adoption should keep the animal in favorites'
    );

    const backdatedAdoptionCreatedAt = new Date('2020-01-01T10:00:00.000Z');
    await AdoptionRequest.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(adoptionRequestId) },
      {
        $set: {
          createdAt: backdatedAdoptionCreatedAt,
        },
      }
    );
    const backdatedAdoptionRequest = await AdoptionRequest.findById(adoptionRequestId)
      .select('createdAt')
      .lean();
    expect(
      new Date(backdatedAdoptionRequest?.createdAt).getTime() === backdatedAdoptionCreatedAt.getTime(),
      'adoption regression fixture should persist its backdated createdAt value'
    );

    const myRequestsResponse = await clientSession.get('/api/adoptions/my');
    expectStatus(myRequestsResponse, 200, 'client my requests');
    expect(extractItems(myRequestsResponse).some((entry) => entry.id === adoptionRequestId), 'client should see the newly created request');

    const clientAllRequestsResponse = await clientSession.get('/api/adoptions');
    expectStatus(clientAllRequestsResponse, 403, 'client all requests guard');

    const allRequestsResponse = await employeeSession.get('/api/adoptions');
    expectStatus(allRequestsResponse, 200, 'staff all requests');
    expect(extractItems(allRequestsResponse).some((entry) => entry.id === adoptionRequestId), 'staff should see all adoption requests');

    const employeeNotificationsResponse = await employeeSession.get('/api/notifications?limit=10');
    expectStatus(employeeNotificationsResponse, 200, 'employee notifications list');
    const employeeAdoptionNotification = findNotification(
      extractItems(employeeNotificationsResponse),
      'adoption-created',
      'adoption-request',
      adoptionRequestId
    );
    expect(Boolean(employeeAdoptionNotification), 'new adoption request should notify employees');

    const adminAdoptionNotificationsResponse = await adminSession.get('/api/notifications?limit=20');
    expectStatus(adminAdoptionNotificationsResponse, 200, 'admin adoption notification list');
    expect(
      Boolean(findNotification(extractItems(adminAdoptionNotificationsResponse), 'adoption-created', 'adoption-request', adoptionRequestId)),
      'new adoption request should notify admins'
    );

    const employeeReadAllNotificationsResponse = await employeeSession.patch('/api/notifications/read-all', {});
    expectStatus(employeeReadAllNotificationsResponse, 200, 'employee read all notifications');

    const adoptionUserSearchResponse = await employeeSession.get(
      `/api/adoptions?search=${encodeURIComponent('regression-client@example.com')}`
    );
    expectStatus(adoptionUserSearchResponse, 200, 'staff adoption search by user email');
    expect(
      extractItems(adoptionUserSearchResponse).some((entry) => entry.id === adoptionRequestId),
      'staff adoption search should match the applicant email'
    );

    const adoptionAnimalSearchResponse = await employeeSession.get(
      `/api/adoptions?search=${encodeURIComponent('Alpha')}`
    );
    expectStatus(adoptionAnimalSearchResponse, 200, 'staff adoption search by animal name');
    expect(
      extractItems(adoptionAnimalSearchResponse).some((entry) => entry.id === adoptionRequestId),
      'staff adoption search should match the animal name'
    );

    const pendingToApprovedResponse = await employeeSession.patch(`/api/adoptions/${adoptionRequestId}/status`, {
      status: 'approved',
      internalNote: 'Trying to approve without review.',
    });
    expectStatus(pendingToApprovedResponse, 409, 'adoption pending to approved should require under-review first');

    const underReviewResponse = await employeeSession.patch(`/api/adoptions/${adoptionRequestId}/status`, {
      status: 'under-review',
      internalNote: 'Initial review completed.',
    });
    expectStatus(underReviewResponse, 200, 'staff adoption under-review');
    expect(extractItem(underReviewResponse)?.status === 'under-review', 'request should move to under-review');
    expect((extractItem(underReviewResponse)?.internalNotes ?? []).length === 1, 'staff note should be stored');

    const underReviewFavoritesResponse = await clientSession.get('/api/favorites');
    expectStatus(underReviewFavoritesResponse, 200, 'favorites while adoption is under review');
    expect(
      extractItems(underReviewFavoritesResponse).some(
        (entry) => entry.favoriteId === adoptionFavoriteId && entry.status === 'reserved'
      ),
      'under-review adoption should keep the reserved animal in favorites'
    );

    const sameStatusNoteResponse = await employeeSession.patch(`/api/adoptions/${adoptionRequestId}/status`, {
      status: 'under-review',
      internalNote: 'This standalone note should not be accepted through the status endpoint.',
    });
    expectStatus(sameStatusNoteResponse, 409, 'adoption same-status note should be rejected');

    const clientUnreadNotificationsResponse = await clientSession.get('/api/notifications/unread-count');
    expectStatus(clientUnreadNotificationsResponse, 200, 'client unread notifications count');
    expect(
      extractItem(clientUnreadNotificationsResponse)?.unreadCount === 1,
      'adoption status update should create one unread client notification'
    );

    const clientNotificationsResponse = await clientSession.get('/api/notifications?limit=10');
    expectStatus(clientNotificationsResponse, 200, 'client notifications list');
    const clientAdoptionNotification = findNotification(
      extractItems(clientNotificationsResponse),
      'adoption-status-updated',
      'adoption-request',
      adoptionRequestId
    );
    expect(Boolean(clientAdoptionNotification), 'adoption status update should notify the request owner');

    const clientReadNotificationResponse = await clientSession.patch(
      `/api/notifications/${clientAdoptionNotification.id}/read`,
      {}
    );
    expectStatus(clientReadNotificationResponse, 200, 'client read one notification');
    expect(extractItem(clientReadNotificationResponse)?.isRead === true, 'read notification should be marked read');

    const clientUnreadAfterReadResponse = await clientSession.get('/api/notifications/unread-count');
    expectStatus(clientUnreadAfterReadResponse, 200, 'client unread notifications after read');
    expect(
      extractItem(clientUnreadAfterReadResponse)?.unreadCount === 0,
      'reading the only client notification should clear the unread count'
    );

    const secondClientSession = new ApiSession(baseUrl, 'client-two');
    const secondClientRegisterResponse = await secondClientSession.post('/api/auth/register', {
      firstName: 'Mila',
      lastName: 'Regression',
      username: 'regression-second-client',
      email: 'regression-second-client@example.com',
      password: 'Client1234',
      confirmPassword: 'Client1234',
      acceptTerms: true,
    });
    expectStatus(secondClientRegisterResponse, 201, 'second client register for notification ownership');
    const secondClientUser = await User.findOne({ username: 'regression-second-client' }).lean();
    const secondClientNotification = await Notification.create({
      recipient: secondClientUser._id,
      type: 'adoption-status-updated',
      title: 'Ownership regression notification',
      message: 'This notification belongs to another client.',
      resourceType: 'adoption-request',
      resourceId: adoptionRequestId,
    });
    const crossClientReadResponse = await clientSession.patch(
      `/api/notifications/${secondClientNotification._id}/read`,
      {}
    );
    expectStatus(crossClientReadResponse, 404, 'client cannot read another user notification');

    const reservedAnimalStaffResponse = await employeeSession.get('/api/animals/alpha-beagle-dog');
    expectStatus(reservedAnimalStaffResponse, 200, 'staff animal details after under-review');
    expect(
      extractItem(reservedAnimalStaffResponse)?.status === 'reserved',
      'animal should become reserved when request enters under-review'
    );

    const reservedAnimalPublicResponse = await guestSession.get('/api/animals/alpha-beagle-dog');
    expectStatus(reservedAnimalPublicResponse, 200, 'guest reserved animal detail');
    expect(
      extractItem(reservedAnimalPublicResponse)?.status === 'reserved',
      'guest animal detail should remain visible after reservation'
    );

    const tooLongAdoptionNoteResponse = await employeeSession.patch(`/api/adoptions/${adoptionRequestId}/status`, {
      status: 'approved',
      internalNote: 'x'.repeat(ADOPTION_TEXT_LIMITS.internalNote + 1),
    });
    expectStatus(tooLongAdoptionNoteResponse, 400, 'adoption internal note length guard');

    const approvedResponse = await employeeSession.patch(`/api/adoptions/${adoptionRequestId}/status`, {
      status: 'approved',
      internalNote: 'Approved for completion.',
    });
    expectStatus(approvedResponse, 200, 'staff adoption approved');
    expect(extractItem(approvedResponse)?.status === 'approved', 'request should move to approved');

    const approvedFavoritesResponse = await clientSession.get('/api/favorites');
    expectStatus(approvedFavoritesResponse, 200, 'favorites while adoption is approved');
    expect(
      extractItems(approvedFavoritesResponse).some(
        (entry) => entry.favoriteId === adoptionFavoriteId && entry.status === 'reserved'
      ),
      'approved adoption should keep the reserved animal in favorites'
    );

    const completedResponse = await employeeSession.patch(`/api/adoptions/${adoptionRequestId}/status`, {
      status: 'completed',
      internalNote: 'Adoption finalized.',
    });
    expectStatus(completedResponse, 200, 'staff adoption completed');
    expect(extractItem(completedResponse)?.status === 'completed', 'request should move to completed');
    expect(
      extractItem(completedResponse)?.statusHistory?.some((entry) => entry.toStatus === 'completed'),
      'completed adoption should record status history'
    );

    const completedAdoptionFavoritesResponse = await clientSession.get('/api/favorites');
    expectStatus(completedAdoptionFavoritesResponse, 200, 'favorites after completed adoption');
    expect(
      !extractItems(completedAdoptionFavoritesResponse).some(
        (entry) => entry.favoriteId === adoptionFavoriteId
      ),
      'completed adoption should remove the adopted animal from active favorites'
    );
    const adoptedFavoriteAnimal = await Animal.findOne({ slug: 'alpha-beagle-dog' })
      .select('_id')
      .lean();
    expect(Boolean(adoptedFavoriteAnimal), 'adopted favorite animal should still exist');
    const adoptedAnimalFavoriteCount = await Favorite.countDocuments({
      animalId: adoptedFavoriteAnimal?._id,
    });
    expect(
      adoptedAnimalFavoriteCount === 0,
      'completed adoption should delete stored favorites for the adopted animal'
    );

    const adoptionCompletionDate = formatLocalDateOnly();
    const adoptionCompletionReportResponse = await adminSession.get(
      `/api/reports/overview?period=custom&dateFrom=${adoptionCompletionDate}&dateTo=${adoptionCompletionDate}`
    );
    expectStatus(adoptionCompletionReportResponse, 200, 'reports completed adoption event date');
    expect(
      extractItem(adoptionCompletionReportResponse)?.activity?.completedAdoptions === 1,
      'reports should count a completed adoption by its completed status-history date'
    );
    expect(
      extractItem(adoptionCompletionReportResponse)?.activity?.newRequests === 0,
      'reports should not count the backdated adoption request as newly created'
    );

    const adoptedAnimalStaffResponse = await employeeSession.get('/api/animals/alpha-beagle-dog');
    expectStatus(adoptedAnimalStaffResponse, 200, 'staff animal details after completed');
    expect(
      extractItem(adoptedAnimalStaffResponse)?.status === 'adopted',
      'animal should become adopted when request is completed'
    );

    const adoptedAnimalPublicResponse = await guestSession.get('/api/animals/alpha-beagle-dog');
    expectStatus(adoptedAnimalPublicResponse, 200, 'guest adopted animal detail');
    expect(
      extractItem(adoptedAnimalPublicResponse)?.status === 'adopted',
      'guest animal detail should remain visible after adoption'
    );

    const unavailableAnimalRequestResponse = await clientSession.post('/api/adoptions', {
      ...buildRegressionAdoptionPayload({
        motivation: 'Should fail because the animal is no longer available.',
        contactPhone: '+359888111223',
      }),
      animalId: 'alpha-beagle-dog',
    });
    expectStatus(unavailableAnimalRequestResponse, 409, 'unavailable animal adoption guard');

    const cancellableResponse = await clientSession.post('/api/adoptions', {
      ...buildRegressionAdoptionPayload({
        motivation: 'Prepared home for a calm cat.',
        contactPhone: '+359888222333',
      }),
      animalId: 'beta-maine-coon-cat',
    });
    expectStatus(cancellableResponse, 201, 'client submit cancellable request');
    cancellableRequestId = extractItem(cancellableResponse)?.id;

    const cancelReasonResponse = await clientSession.patch(`/api/adoptions/${cancellableRequestId}/cancel`, {
      reason: 'Personal circumstances changed.',
    });
    expectStatus(cancelReasonResponse, 400, 'client cancel reason payload should be rejected');

    const cancelResponse = await clientSession.patch(`/api/adoptions/${cancellableRequestId}/cancel`, {});
    expectStatus(cancelResponse, 200, 'client cancel own request');
    expect(extractItem(cancelResponse)?.status === 'cancelled', 'cancel should change request status to cancelled');

    const cancelledFilterResponse = await employeeSession.get('/api/adoptions?status=cancelled');
    expectStatus(cancelledFilterResponse, 200, 'staff filter cancelled requests');
    expect(extractItems(cancelledFilterResponse).some((entry) => entry.id === cancellableRequestId), 'staff filter should include the cancelled request');

    const unaffectedAnimalResponse = await guestSession.get('/api/animals/beta-maine-coon-cat');
    expectStatus(unaffectedAnimalResponse, 200, 'animal details after cancel');
    expect(extractItem(unaffectedAnimalResponse)?.status === 'available', 'pending request cancellation should keep the animal available');
  });

  await recordStep('Pagination wiring: adoption endpoints', async () => {
    const allAdoptionsPaginationResponse = await adminSession.get('/api/adoptions?page=2&limit=1');
    expectStatus(allAdoptionsPaginationResponse, 200, 'all adoptions pagination wiring');
    expect(extractItems(allAdoptionsPaginationResponse).length === 1, 'all adoptions should honor limit=1');
    expect(extractItem(allAdoptionsPaginationResponse)?.total === 2, 'all adoptions should expose total requests');
    expectPagination(
      allAdoptionsPaginationResponse,
      {
        page: 2,
        limit: 1,
        maxLimit: 50,
        total: 2,
        totalPages: 2,
        hasNextPage: false,
        hasPreviousPage: true,
      },
      'all adoptions pagination wiring'
    );

    const ownAdoptionsPaginationResponse = await clientSession.get('/api/adoptions/my?page=2&limit=1');
    expectStatus(ownAdoptionsPaginationResponse, 200, 'own adoptions pagination wiring');
    expect(extractItems(ownAdoptionsPaginationResponse).length === 1, 'own adoptions should honor limit=1');
    expect(extractItem(ownAdoptionsPaginationResponse)?.total === 2, 'own adoptions should expose client request total');
    expectPagination(
      ownAdoptionsPaginationResponse,
      {
        page: 2,
        limit: 1,
        maxLimit: 30,
        total: 2,
        totalPages: 2,
        hasNextPage: false,
        hasPreviousPage: true,
      },
      'own adoptions pagination wiring'
    );
  });

  await recordStep('Pagination wiring: volunteers and rescue report endpoints', async () => {
    const createVolunteerNotificationResponse = await guestSession.post('/api/volunteers', {
      firstName: 'Notification',
      lastName: 'Volunteer',
      email: 'notification-volunteer@example.com',
      phone: '+359887771111',
      age: 27,
      preferredPositions: ['animal-care'],
      motivation: 'Regression notification generator check.',
      experience: '',
      availability: 'Weekends',
    });
    expectStatus(createVolunteerNotificationResponse, 201, 'public volunteer notification fixture');
    const notificationVolunteerId = extractItem(createVolunteerNotificationResponse)?.id;

    const employeeVolunteerNotificationsResponse = await employeeSession.get('/api/notifications?limit=50');
    expectStatus(employeeVolunteerNotificationsResponse, 200, 'employee volunteer notifications');
    expect(
      Boolean(
        findNotification(
          extractItems(employeeVolunteerNotificationsResponse),
          'volunteer-application-created',
          'volunteer-application',
          notificationVolunteerId
        )
      ),
      'new volunteer application should notify employees'
    );

    const adminVolunteerNotificationsResponse = await adminSession.get('/api/notifications?limit=50');
    expectStatus(adminVolunteerNotificationsResponse, 200, 'admin volunteer notifications');
    expect(
      Boolean(
        findNotification(
          extractItems(adminVolunteerNotificationsResponse),
          'volunteer-application-created',
          'volunteer-application',
          notificationVolunteerId
        )
      ),
      'new volunteer application should notify admins'
    );

    await seedVolunteerPaginationFixtures();

    const volunteersPaginationResponse = await adminSession.get('/api/volunteers?page=2&limit=1');
    expectStatus(volunteersPaginationResponse, 200, 'volunteers pagination wiring');
    expect(extractItems(volunteersPaginationResponse).length === 1, 'volunteers should honor limit=1');
    expect(extractItem(volunteersPaginationResponse)?.total === 3, 'volunteers should expose total applications');
    expect(
      !Object.prototype.hasOwnProperty.call(extractItem(volunteersPaginationResponse) ?? {}, 'policy'),
      'volunteers list should not expose policy metadata'
    );
    expectPagination(
      volunteersPaginationResponse,
      {
        page: 2,
        limit: 1,
        maxLimit: 50,
        total: 3,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      },
      'volunteers pagination wiring'
    );

    const volunteersTransitionResponse = await adminSession.get('/api/volunteers?page=1&limit=1');
    expectStatus(volunteersTransitionResponse, 200, 'volunteers compact list response');
    const volunteerListItem = extractItems(volunteersTransitionResponse)[0] ?? {};
    expect(
      volunteerListItem.motivation === undefined &&
        volunteerListItem.experience === undefined &&
        volunteerListItem.guardianName === undefined &&
        volunteerListItem.guardianContact === undefined &&
        volunteerListItem.guardianConsentVerified === undefined &&
        volunteerListItem.internalNotes === undefined &&
        volunteerListItem.statusHistory === undefined,
      'volunteers list should omit detail-only application fields'
    );
    const volunteerDetailResponse = await adminSession.get(`/api/volunteers/${volunteerListItem.id}`);
    expectStatus(volunteerDetailResponse, 200, 'volunteers detail status transitions response');
    expect(
      !Object.prototype.hasOwnProperty.call(extractItem(volunteerDetailResponse) ?? {}, 'policy'),
      'volunteers detail should not expose policy metadata'
    );
    expect(
      Array.isArray(extractItem(volunteerDetailResponse)?.allowedStatusTransitions) &&
        extractItem(volunteerDetailResponse).allowedStatusTransitions.length === 0,
      'approved volunteer application should not expose next status transitions in detail'
    );

    const pendingVolunteerResponse = await adminSession.get('/api/volunteers?page=3&limit=1');
    expectStatus(pendingVolunteerResponse, 200, 'pending volunteer transitions response');
    const pendingVolunteerListItem = extractItems(pendingVolunteerResponse)[0] ?? {};
    const pendingVolunteerDetailResponse = await adminSession.get(`/api/volunteers/${pendingVolunteerListItem.id}`);
    expectStatus(pendingVolunteerDetailResponse, 200, 'pending volunteer detail transitions response');
    expect(
      extractItem(pendingVolunteerDetailResponse)?.allowedStatusTransitions.length === 1 &&
        extractItem(pendingVolunteerDetailResponse).allowedStatusTransitions.includes('under-review'),
      'pending volunteer application should only expose under-review as next status in detail'
    );

    const invalidVolunteerPhoneResponse = await guestSession.post('/api/volunteers', {
      firstName: 'Invalid',
      lastName: 'Phone',
      email: 'invalid-volunteer-phone@example.com',
      phone: '------',
      age: 27,
      preferredPositions: ['animal-care'],
      motivation: 'Regression invalid phone check.',
      experience: '',
      availability: 'Weekends',
    });
    expectStatus(invalidVolunteerPhoneResponse, 400, 'volunteer application should reject phone without digits');

    const invalidVolunteerAgeResponse = await guestSession.post('/api/volunteers', {
      firstName: 'Invalid',
      lastName: 'Age',
      email: 'invalid-volunteer-age@example.com',
      phone: '+359887771115',
      age: 13,
      preferredPositions: ['animal-care'],
      motivation: 'Regression invalid age check.',
      experience: '',
      availability: 'Weekends',
    });
    expectStatus(invalidVolunteerAgeResponse, 400, 'volunteer application should reject age below minimum');

    const oversizedVolunteerTextResponse = await guestSession.post('/api/volunteers', {
      firstName: 'A'.repeat(81),
      lastName: 'Oversized',
      email: 'oversized-volunteer@example.com',
      phone: '+359887771116',
      age: 27,
      preferredPositions: ['animal-care'],
      motivation: 'Regression oversized text check.',
      experience: '',
      availability: 'Weekends',
    });
    expectStatus(oversizedVolunteerTextResponse, 400, 'volunteer application should reject oversized text fields');

    const missingMinorGuardianResponse = await guestSession.post('/api/volunteers', {
      firstName: 'Minor',
      lastName: 'MissingGuardian',
      email: 'minor-missing-guardian@example.com',
      phone: '+359887771112',
      age: 16,
      preferredPositions: ['animal-care'],
      motivation: 'Minor volunteer regression check.',
      experience: '',
      availability: 'Weekends',
    });
    expectStatus(
      missingMinorGuardianResponse,
      400,
      'minor volunteer application should require guardian contact data'
    );

    const createMinorVolunteerResponse = await guestSession.post('/api/volunteers', {
      firstName: 'Minor',
      lastName: 'Volunteer',
      email: 'minor-volunteer@example.com',
      phone: '+359887771113',
      age: 16,
      guardianName: 'Minor Guardian',
      guardianContact: '+359887771114',
      preferredPositions: ['animal-care'],
      motivation: 'Minor volunteer regression check.',
      experience: '',
      availability: 'Weekends',
    });
    expectStatus(createMinorVolunteerResponse, 201, 'minor volunteer application with guardian contact data');
    expect(
      !Object.prototype.hasOwnProperty.call(extractItem(createMinorVolunteerResponse) ?? {}, 'policy'),
      'volunteer create response should not expose policy metadata'
    );
    expect(
      extractItem(createMinorVolunteerResponse)?.guardianConsentVerified === false,
      'minor volunteer application should start with unverified guardian consent'
    );
    expect(
      extractItem(createMinorVolunteerResponse)?.statusHistory?.some((entry) => entry.toStatus === 'pending'),
      'new volunteer application should record initial pending status history'
    );

    const duplicateActiveVolunteerResponse = await guestSession.post('/api/volunteers', {
      firstName: 'Minor',
      lastName: 'Duplicate',
      email: 'minor-volunteer@example.com',
      phone: '+359887771119',
      age: 16,
      guardianName: 'Minor Guardian',
      guardianContact: '+359887771114',
      preferredPositions: ['animal-care'],
      motivation: 'Duplicate active volunteer regression check.',
      experience: '',
      availability: 'Weekends',
    });
    expectStatus(
      duplicateActiveVolunteerResponse,
      409,
      'volunteer application should reject duplicate active email'
    );

    const volunteerPendingToReviewId = await createVolunteerTransitionFixture('pending', 1);
    const volunteerPendingToReviewResponse = await adminSession.patch(
      `/api/volunteers/${volunteerPendingToReviewId}/review`,
      {
        status: 'under-review',
        notes: 'Allowed transition regression check.',
      }
    );
    expectStatus(volunteerPendingToReviewResponse, 200, 'volunteers pending to under-review transition');
    expect(
      !Object.prototype.hasOwnProperty.call(extractItem(volunteerPendingToReviewResponse) ?? {}, 'policy'),
      'volunteer review response should not expose policy metadata'
    );
    expect(
      extractItem(volunteerPendingToReviewResponse)?.status === 'under-review',
      'volunteers pending to under-review should update status'
    );
    expect(
      extractItem(volunteerPendingToReviewResponse)?.internalNotes?.[0]?.text ===
        'Allowed transition regression check.',
      'volunteers pending to under-review should append internal notes'
    );
    expect(
      extractItem(volunteerPendingToReviewResponse)?.statusHistory?.some(
        (entry) => entry.fromStatus === 'pending' && entry.toStatus === 'under-review'
      ),
      'volunteers pending to under-review should record status history'
    );

    const volunteerSameStatusNoChangeResponse = await adminSession.patch(
      `/api/volunteers/${volunteerPendingToReviewId}/review`,
      {
        status: 'under-review',
      }
    );
    expectStatus(
      volunteerSameStatusNoChangeResponse,
      400,
      'volunteers same-status review without notes or consent change should be rejected'
    );

    const oversizedVolunteerNoteId = await createVolunteerTransitionFixture('pending', 8);
    const oversizedVolunteerNoteResponse = await adminSession.patch(
      `/api/volunteers/${oversizedVolunteerNoteId}/review`,
      {
        notes: 'A'.repeat(1501),
      }
    );
    expectStatus(oversizedVolunteerNoteResponse, 400, 'volunteers should reject oversized internal notes');

    const volunteerNotesPreservedResponse = await adminSession.patch(
      `/api/volunteers/${volunteerPendingToReviewId}/review`,
      {
        status: 'approved',
      }
    );
    expectStatus(volunteerNotesPreservedResponse, 200, 'volunteers status update should preserve omitted notes');
    expect(
      extractItem(volunteerNotesPreservedResponse)?.internalNotes?.[0]?.text ===
        'Allowed transition regression check.',
      'volunteers status update without notes should preserve existing internal notes'
    );
    expect(
      extractItem(volunteerNotesPreservedResponse)?.statusHistory?.some(
        (entry) => entry.fromStatus === 'under-review' && entry.toStatus === 'approved'
      ),
      'volunteers status update should append status history'
    );

    const volunteerUnderReviewToApprovedId = await createVolunteerTransitionFixture('under-review', 2);
    const volunteerUnderReviewToApprovedResponse = await adminSession.patch(
      `/api/volunteers/${volunteerUnderReviewToApprovedId}/review`,
      {
        status: 'approved',
        notes: 'Allowed transition regression check.',
      }
    );
    expectStatus(volunteerUnderReviewToApprovedResponse, 200, 'volunteers under-review to approved transition');
    expect(
      extractItem(volunteerUnderReviewToApprovedResponse)?.status === 'approved',
      'volunteers under-review to approved should update status'
    );
    expect(
      extractItem(volunteerUnderReviewToApprovedResponse)?.internalNotes?.[0]?.text ===
        'Allowed transition regression check.',
      'volunteers under-review to approved should append internal notes'
    );
    expect(
      extractItem(volunteerUnderReviewToApprovedResponse)?.statusHistory?.some(
        (entry) => entry.fromStatus === 'under-review' && entry.toStatus === 'approved'
      ),
      'volunteers under-review to approved should record status history'
    );

    const volunteerUnderReviewToRejectedId = await createVolunteerTransitionFixture('under-review', 3);
    const volunteerUnderReviewToRejectedResponse = await adminSession.patch(
      `/api/volunteers/${volunteerUnderReviewToRejectedId}/review`,
      {
        status: 'rejected',
        notes: 'Allowed transition regression check.',
      }
    );
    expectStatus(volunteerUnderReviewToRejectedResponse, 200, 'volunteers under-review to rejected transition');
    expect(
      extractItem(volunteerUnderReviewToRejectedResponse)?.status === 'rejected',
      'volunteers under-review to rejected should update status'
    );
    expect(
      extractItem(volunteerUnderReviewToRejectedResponse)?.statusHistory?.some(
        (entry) => entry.fromStatus === 'under-review' && entry.toStatus === 'rejected'
      ),
      'volunteers under-review to rejected should record status history'
    );

    const adultVolunteerGuardianConsentId = await createVolunteerTransitionFixture('under-review', 7);
    const adultVolunteerGuardianConsentResponse = await adminSession.patch(
      `/api/volunteers/${adultVolunteerGuardianConsentId}/review`,
      {
        guardianConsentVerified: true,
      }
    );
    expectStatus(
      adultVolunteerGuardianConsentResponse,
      400,
      'adult volunteer should reject guardian consent verification'
    );

    const minorVolunteerStringConsentId = await createMinorVolunteerTransitionFixture('under-review', 9);
    const minorVolunteerStringConsentResponse = await adminSession.patch(
      `/api/volunteers/${minorVolunteerStringConsentId}/review`,
      {
        guardianConsentVerified: 'true',
      }
    );
    expectStatus(
      minorVolunteerStringConsentResponse,
      400,
      'minor volunteer guardian consent verification should require a boolean value'
    );

    const minorVolunteerUnderReviewId = await createMinorVolunteerTransitionFixture('under-review', 6);
    const minorVolunteerBeforeConsentResponse = await adminSession.get(
      `/api/volunteers/${minorVolunteerUnderReviewId}`
    );
    expectStatus(
      minorVolunteerBeforeConsentResponse,
      200,
      'minor volunteer under-review detail before guardian consent'
    );
    expect(
      !extractItem(minorVolunteerBeforeConsentResponse)?.allowedStatusTransitions.includes('approved'),
      'minor volunteer should not expose approved transition before guardian consent is verified'
    );

    const minorVolunteerApprovalWithoutConsentResponse = await adminSession.patch(
      `/api/volunteers/${minorVolunteerUnderReviewId}/review`,
      {
        status: 'approved',
      }
    );
    expectStatus(
      minorVolunteerApprovalWithoutConsentResponse,
      409,
      'minor volunteer approval should require verified guardian consent'
    );

    const minorVolunteerConsentResponse = await adminSession.patch(
      `/api/volunteers/${minorVolunteerUnderReviewId}/review`,
      {
        guardianConsentVerified: true,
      }
    );
    expectStatus(minorVolunteerConsentResponse, 200, 'minor volunteer guardian consent verification');
    expect(
      extractItem(minorVolunteerConsentResponse)?.guardianConsentVerified === true,
      'minor volunteer guardian consent should be stored as verified'
    );
    expect(
      extractItem(minorVolunteerConsentResponse)?.status === 'under-review',
      'minor volunteer guardian consent update should preserve status'
    );
    expect(
      Boolean(extractItem(minorVolunteerConsentResponse)?.guardianConsentVerifiedAt) &&
        Boolean(extractItem(minorVolunteerConsentResponse)?.guardianConsentVerifiedByName),
      'minor volunteer guardian consent update should record verification audit data'
    );
    expect(
      extractItem(minorVolunteerConsentResponse)?.allowedStatusTransitions.includes('approved'),
      'minor volunteer verified consent should expose approved transition'
    );

    const concurrentConsentVolunteerId = await createMinorVolunteerTransitionFixture(
      'under-review',
      10
    );
    const originalFindVolunteerById = VolunteerApplication.findById;
    const staleVolunteerSnapshot = await originalFindVolunteerById
      .call(VolunteerApplication, concurrentConsentVolunteerId)
      .lean();

    VolunteerApplication.findById = () => ({
      lean: async () => staleVolunteerSnapshot,
    });

    let concurrentConsentResults;

    try {
      concurrentConsentResults = await Promise.allSettled([
        updateVolunteerApplicationReview(
          concurrentConsentVolunteerId,
          { guardianConsentVerified: true },
          {
            id: adminUserId,
            role: 'admin',
            firstName: 'System',
            lastName: 'Admin',
          }
        ),
        updateVolunteerApplicationReview(
          concurrentConsentVolunteerId,
          { guardianConsentVerified: true },
          {
            id: employeeUserId,
            role: 'employee',
            firstName: 'Eva',
            lastName: 'Employee',
          }
        ),
      ]);
    } finally {
      VolunteerApplication.findById = originalFindVolunteerById;
    }

    const successfulConsentUpdates = concurrentConsentResults.filter(
      (result) => result.status === 'fulfilled'
    );
    const conflictingConsentUpdates = concurrentConsentResults.filter(
      (result) => result.status === 'rejected' && result.reason?.status === 409
    );

    expect(
      successfulConsentUpdates.length === 1 && conflictingConsentUpdates.length === 1,
      'concurrent guardian consent updates should allow one CAS update and reject the stale update'
    );

    const minorVolunteerApprovalResponse = await adminSession.patch(
      `/api/volunteers/${minorVolunteerUnderReviewId}/review`,
      {
        status: 'approved',
      }
    );
    expectStatus(minorVolunteerApprovalResponse, 200, 'minor volunteer approved after verified guardian consent');
    expect(
      extractItem(minorVolunteerApprovalResponse)?.status === 'approved',
      'minor volunteer should be approved after guardian consent is verified'
    );

    const invalidVolunteerPendingToApprovedId = await createVolunteerTransitionFixture('pending', 4);
    const invalidVolunteerPendingToApprovedResponse = await adminSession.patch(
      `/api/volunteers/${invalidVolunteerPendingToApprovedId}/review`,
      {
        status: 'approved',
        notes: '',
      }
    );
    expectStatus(
      invalidVolunteerPendingToApprovedResponse,
      409,
      'volunteers pending to approved should require under-review first'
    );

    const invalidVolunteerPendingToRejectedId = await createVolunteerTransitionFixture('pending', 5);
    const invalidVolunteerPendingToRejectedResponse = await adminSession.patch(
      `/api/volunteers/${invalidVolunteerPendingToRejectedId}/review`,
      {
        status: 'rejected',
        notes: '',
      }
    );
    expectStatus(
      invalidVolunteerPendingToRejectedResponse,
      409,
      'volunteers pending to rejected should require under-review first'
    );

    const invalidVolunteerTransitionResponse = await adminSession.patch(
      `/api/volunteers/${volunteerListItem.id}/review`,
      {
        status: 'pending',
        notes: '',
      }
    );
    expectStatus(invalidVolunteerTransitionResponse, 409, 'volunteers invalid status transition');

    const invalidRescuePhoneResponse = await guestSession.post('/api/rescue-reports', {
      name: 'Invalid Phone Reporter',
      email: 'invalid-phone-reporter@example.com',
      phone: '------',
      location: 'Validation regression location',
      species: 'dog',
      urgency: 'medium',
      description: 'Regression phone validation check.',
      imageUrl: '',
    });
    expectStatus(invalidRescuePhoneResponse, 400, 'public rescue report phone digit guard');

    const remoteRescueImageResponse = await guestSession.post('/api/rescue-reports', {
      name: 'Remote Image Reporter',
      email: 'remote-image-reporter@example.com',
      phone: '+359886661112',
      location: 'Validation regression location',
      species: 'cat',
      urgency: 'medium',
      description: 'Regression remote image validation check.',
      imageUrl: 'https://example.com/report.jpg',
    });
    expectStatus(remoteRescueImageResponse, 400, 'public rescue report remote image guard');

    const nonImageDataResponse = await guestSession.post('/api/rescue-reports', {
      name: 'Non Image Reporter',
      email: 'non-image-reporter@example.com',
      phone: '+359886661113',
      location: 'Validation regression location',
      species: 'cat',
      urgency: 'medium',
      description: 'Regression data URL validation check.',
      imageUrl: 'data:text/plain;base64,SGVsbG8=',
    });
    expectStatus(nonImageDataResponse, 400, 'public rescue report non-image data URL guard');

    const createRescueReportNotificationResponse = await guestSession.post('/api/rescue-reports', {
      name: 'Notification Reporter',
      email: 'notification-reporter@example.com',
      phone: '+359886661111',
      location: 'Notification regression location',
      species: 'dog',
      urgency: 'critical',
      description: 'Regression notification generator check.',
      imageUrl: '',
    });
    expectStatus(createRescueReportNotificationResponse, 201, 'public rescue report notification fixture');
    const publicRescueReportSubmission = extractItem(createRescueReportNotificationResponse) ?? {};
    const notificationReportId = publicRescueReportSubmission.id;
    expect(
      ['policy', 'email', 'phone', 'location', 'description', 'imageUrl', 'allowedStatusTransitions', 'internalNotes', 'statusHistory']
        .every((fieldName) => !Object.prototype.hasOwnProperty.call(publicRescueReportSubmission, fieldName)),
      'public rescue report response should not expose staff workflow or contact details'
    );

    const employeeReportNotificationsResponse = await employeeSession.get('/api/notifications?limit=50');
    expectStatus(employeeReportNotificationsResponse, 200, 'employee rescue report notifications');
    expect(
      Boolean(
        findNotification(
          extractItems(employeeReportNotificationsResponse),
          'rescue-report-created',
          'rescue-report',
          notificationReportId
        )
      ),
      'new rescue report should notify employees'
    );

    const adminReportNotificationsResponse = await adminSession.get('/api/notifications?limit=50');
    expectStatus(adminReportNotificationsResponse, 200, 'admin rescue report notifications');
    expect(
      Boolean(
        findNotification(
          extractItems(adminReportNotificationsResponse),
          'rescue-report-created',
          'rescue-report',
          notificationReportId
        )
      ),
      'new rescue report should notify admins'
    );

    await seedRescueReportPaginationFixtures();

    const rescueReportsPaginationResponse = await adminSession.get('/api/rescue-reports?page=2&limit=1');
    expectStatus(rescueReportsPaginationResponse, 200, 'rescue reports pagination wiring');
    expect(
      !Object.prototype.hasOwnProperty.call(extractItem(rescueReportsPaginationResponse) ?? {}, 'policy'),
      'rescue reports list should not expose policy metadata'
    );
    expect(extractItems(rescueReportsPaginationResponse).length === 1, 'rescue reports should honor limit=1');
    expect(extractItem(rescueReportsPaginationResponse)?.total === 3, 'rescue reports should expose total reports');
    expectPagination(
      rescueReportsPaginationResponse,
      {
        page: 2,
        limit: 1,
        maxLimit: 50,
        total: 3,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      },
      'rescue reports pagination wiring'
    );

    const rescueReportsListShapeResponse = await adminSession.get('/api/rescue-reports?page=1&limit=1');
    expectStatus(rescueReportsListShapeResponse, 200, 'rescue reports minimal list response');
    const rescueReportListItem = extractItems(rescueReportsListShapeResponse)[0] ?? {};
    expect(
      ['email', 'description', 'imageUrl', 'hasImage', 'allowedStatusTransitions', 'internalNotes', 'statusHistory']
        .every((fieldName) => !Object.prototype.hasOwnProperty.call(rescueReportListItem, fieldName)),
      'rescue reports list should return only fields required by the list UI'
    );

    const rescueReportsUrgencyFilterResponse = await adminSession.get('/api/rescue-reports?urgency=high&page=1&limit=10');
    expectStatus(rescueReportsUrgencyFilterResponse, 200, 'rescue reports urgency filter');
    expect(extractItems(rescueReportsUrgencyFilterResponse).length === 1, 'rescue reports urgency filter should return one item');
    expect(extractItem(rescueReportsUrgencyFilterResponse)?.total === 1, 'rescue reports urgency filter should expose filtered total');
    expect(
      extractItems(rescueReportsUrgencyFilterResponse)[0]?.urgency === 'high',
      'rescue reports urgency filter should return high urgency reports'
    );

    const rescueReportsEmailSearchResponse = await adminSession.get(
      `/api/rescue-reports?search=${encodeURIComponent('reporter-pagination-03@example.com')}`
    );
    expectStatus(rescueReportsEmailSearchResponse, 200, 'rescue reports search by email');
    expect(extractItems(rescueReportsEmailSearchResponse).length === 1, 'rescue reports email search should return one item');
    expect(
      extractItems(rescueReportsEmailSearchResponse)[0]?.name === 'Reporter 03',
      'rescue reports email search should match the report without exposing email in list data'
    );

    const rescuePendingToReviewId = await createRescueReportTransitionFixture('pending', 1);
    const rescueReportDetailResponse = await adminSession.get(
      `/api/rescue-reports/${rescuePendingToReviewId}`
    );
    expectStatus(rescueReportDetailResponse, 200, 'rescue report detail response');
    expect(
      !Object.prototype.hasOwnProperty.call(extractItem(rescueReportDetailResponse) ?? {}, 'policy'),
      'rescue report detail should not expose policy metadata'
    );

    const rescuePendingToReviewResponse = await adminSession.patch(
      `/api/rescue-reports/${rescuePendingToReviewId}/review`,
      {
        status: 'under-review',
        notes: 'Allowed transition regression check.',
      }
    );
    expectStatus(rescuePendingToReviewResponse, 200, 'rescue reports pending to under-review transition');
    expect(
      !Object.prototype.hasOwnProperty.call(extractItem(rescuePendingToReviewResponse) ?? {}, 'policy'),
      'rescue report review should not expose policy metadata'
    );
    expect(
      extractItem(rescuePendingToReviewResponse)?.status === 'under-review',
      'rescue reports pending to under-review should update status'
    );

    const rescuePendingToAcceptedId = await createRescueReportTransitionFixture('pending', 2);
    const rescuePendingToAcceptedResponse = await adminSession.patch(
      `/api/rescue-reports/${rescuePendingToAcceptedId}/review`,
      {
        status: 'accepted',
        notes: 'Allowed transition regression check.',
      }
    );
    expectStatus(rescuePendingToAcceptedResponse, 200, 'rescue reports pending to accepted transition');
    expect(
      extractItem(rescuePendingToAcceptedResponse)?.status === 'accepted',
      'rescue reports pending to accepted should update status'
    );
    expect(
      extractItem(rescuePendingToAcceptedResponse)?.internalNotes?.[0]?.text ===
        'Allowed transition regression check.',
      'rescue reports should append internal notes'
    );
    expect(
      extractItem(rescuePendingToAcceptedResponse)?.statusHistory?.some(
        (entry) => entry.toStatus === 'accepted'
      ),
      'rescue reports should record status history'
    );

    const rescueNotesPreservedResponse = await adminSession.patch(
      `/api/rescue-reports/${rescuePendingToAcceptedId}/review`,
      {
        status: 'resolved',
      }
    );
    expectStatus(rescueNotesPreservedResponse, 200, 'rescue reports status update should preserve existing internal notes');
    expect(
      extractItem(rescueNotesPreservedResponse)?.internalNotes?.[0]?.text ===
        'Allowed transition regression check.',
      'rescue reports status update without notes should preserve existing internal notes'
    );
    expect(
      extractItem(rescueNotesPreservedResponse)?.statusHistory?.some(
        (entry) => entry.fromStatus === 'accepted' && entry.toStatus === 'resolved'
      ),
      'rescue reports should append status history for later transitions'
    );

    const rescuePendingToRejectedId = await createRescueReportTransitionFixture('pending', 3);
    const rescuePendingToRejectedResponse = await adminSession.patch(
      `/api/rescue-reports/${rescuePendingToRejectedId}/review`,
      {
        status: 'rejected',
        notes: 'Allowed transition regression check.',
      }
    );
    expectStatus(rescuePendingToRejectedResponse, 200, 'rescue reports pending to rejected transition');
    expect(
      extractItem(rescuePendingToRejectedResponse)?.status === 'rejected',
      'rescue reports pending to rejected should update status'
    );

    const rescueUnderReviewToAcceptedId = await createRescueReportTransitionFixture('under-review', 4);
    const rescueUnderReviewToAcceptedResponse = await adminSession.patch(
      `/api/rescue-reports/${rescueUnderReviewToAcceptedId}/review`,
      {
        status: 'accepted',
        notes: 'Allowed transition regression check.',
      }
    );
    expectStatus(rescueUnderReviewToAcceptedResponse, 200, 'rescue reports under-review to accepted transition');
    expect(
      extractItem(rescueUnderReviewToAcceptedResponse)?.status === 'accepted',
      'rescue reports under-review to accepted should update status'
    );

    const rescueUnderReviewToRejectedId = await createRescueReportTransitionFixture('under-review', 5);
    const rescueUnderReviewToRejectedResponse = await adminSession.patch(
      `/api/rescue-reports/${rescueUnderReviewToRejectedId}/review`,
      {
        status: 'rejected',
        notes: 'Allowed transition regression check.',
      }
    );
    expectStatus(rescueUnderReviewToRejectedResponse, 200, 'rescue reports under-review to rejected transition');
    expect(
      extractItem(rescueUnderReviewToRejectedResponse)?.status === 'rejected',
      'rescue reports under-review to rejected should update status'
    );

    const rescueAcceptedToResolvedId = await createRescueReportTransitionFixture('accepted', 6);
    const rescueAcceptedToResolvedResponse = await adminSession.patch(
      `/api/rescue-reports/${rescueAcceptedToResolvedId}/review`,
      {
        status: 'resolved',
        notes: 'Allowed transition regression check.',
      }
    );
    expectStatus(rescueAcceptedToResolvedResponse, 200, 'rescue reports accepted to resolved transition');
    expect(
      extractItem(rescueAcceptedToResolvedResponse)?.status === 'resolved',
      'rescue reports accepted to resolved should update status'
    );

    const invalidRescueUnderReviewToResolvedId = await createRescueReportTransitionFixture('under-review', 7);
    const invalidRescueUnderReviewToResolvedResponse = await adminSession.patch(
      `/api/rescue-reports/${invalidRescueUnderReviewToResolvedId}/review`,
      {
        status: 'resolved',
        notes: '',
      }
    );
    expectStatus(
      invalidRescueUnderReviewToResolvedResponse,
      409,
      'rescue reports under-review to resolved should require accepted first'
    );

    const invalidRescueResolvedToAcceptedId = await createRescueReportTransitionFixture('resolved', 8);
    const invalidRescueResolvedToAcceptedResponse = await adminSession.patch(
      `/api/rescue-reports/${invalidRescueResolvedToAcceptedId}/review`,
      {
        status: 'accepted',
        notes: '',
      }
    );
    expectStatus(
      invalidRescueResolvedToAcceptedResponse,
      409,
      'rescue reports resolved to accepted should be forbidden'
    );

    const invalidRescueRejectedToAcceptedId = await createRescueReportTransitionFixture('rejected', 9);
    const invalidRescueRejectedToAcceptedResponse = await adminSession.patch(
      `/api/rescue-reports/${invalidRescueRejectedToAcceptedId}/review`,
      {
        status: 'accepted',
        notes: '',
      }
    );
    expectStatus(
      invalidRescueRejectedToAcceptedResponse,
      409,
      'rescue reports rejected to accepted should be forbidden'
    );

    const invalidRescueReportTransitionResponse = await adminSession.patch(
      `/api/rescue-reports/${rescueReportListItem.id}/review`,
      {
        status: 'pending',
        notes: '',
      }
    );
    expectStatus(invalidRescueReportTransitionResponse, 409, 'rescue reports invalid status transition');

    const rescueSameStatusId = await createRescueReportTransitionFixture('accepted', 10);
    const rescueSameStatusResponse = await adminSession.patch(
      `/api/rescue-reports/${rescueSameStatusId}/review`,
      {
        status: 'accepted',
      }
    );
    expectStatus(rescueSameStatusResponse, 400, 'rescue reports same status without note');

    const rescueStandaloneNoteResponse = await adminSession.patch(
      `/api/rescue-reports/${rescueSameStatusId}/review`,
      {
        status: 'accepted',
        notes: 'Standalone internal note regression check.',
      }
    );
    expectStatus(rescueStandaloneNoteResponse, 200, 'rescue reports same status with note');
    expect(
      extractItem(rescueStandaloneNoteResponse)?.internalNotes?.some(
        (note) => note.text === 'Standalone internal note regression check.'
      ),
      'rescue reports same status should allow appending an internal note'
    );

    let rescueRateLimitResponse = null;

    for (let attempt = 0; attempt < 16; attempt += 1) {
      rescueRateLimitResponse = await guestSession.post('/api/rescue-reports', {});

      if (rescueRateLimitResponse.status === 429) {
        break;
      }
    }

    expectStatus(rescueRateLimitResponse, 429, 'public rescue report rate limiter');
  });

  await recordStep('Contact inquiries: create, staff review and status transitions', async () => {
    const specialCareAnimal = await Animal.create({
      slug: 'contact-special-care-owl',
      name: 'Contact Care Owl',
      displayName: 'Сова в защитена грижа',
      species: 'owl',
      breed: 'Barn Owl',
      age: 1,
      gender: 'unknown',
      size: 'small',
      status: 'protected-care',
      intakeDate: iso('2026-03-07T00:00:00Z'),
      healthStatus: 'Protected care',
      vaccinated: false,
      neutered: false,
      description: 'Protected-care animal used for contact inquiry relation checks.',
      imageUrls: [],
      isActive: true,
    });
    const guestListInquiriesResponse = await guestSession.get('/api/contact-inquiries');
    expectStatus(guestListInquiriesResponse, 401, 'guest contact inquiries list guard');

    const clientListInquiriesResponse = await clientSession.get('/api/contact-inquiries');
    expectStatus(clientListInquiriesResponse, 403, 'client contact inquiries list guard');

    const invalidContactInquiryModelFixtures = [
      new ContactInquiry({
        type: 'adoption',
        name: 'Invalid Model Adoption',
        email: 'invalid-model-adoption@example.com',
        phone: '+359888191919',
        subject: 'banana',
        animalName: 'Alpha',
        description: 'Invalid model adoption subject fixture.',
      }),
      new ContactInquiry({
        type: 'general',
        name: 'Invalid Model General',
        email: 'invalid-model-general@example.com',
        phone: '+359888181818',
        subject: 'General question',
        animalName: 'Alpha',
        description: 'Invalid model type-specific field fixture.',
      }),
      new ContactInquiry({
        type: 'donation',
        name: 'Invalid Model Donation',
        email: 'invalid-model-donation@example.com',
        phone: '+359888171717',
        subject: 'Donation question',
        donationTopic: 'banana',
        description: 'Invalid model donation topic fixture.',
      }),
      new ContactInquiry({
        type: 'special-care',
        name: 'Invalid Model Special Care',
        email: 'invalid-model-special-care@example.com',
        phone: '+359888161616',
        subject: 'banana',
        animal: specialCareAnimal._id,
        animalName: 'Сова в защитена грижа',
        assistanceType: 'transport',
        hasRelevantExperience: false,
        description: 'Invalid model special-care subject fixture.',
      }),
      new ContactInquiry({
        type: 'special-care',
        name: 'Invalid Model Informational Assistance',
        email: 'invalid-model-informational-assistance@example.com',
        phone: '+359888151515',
        subject: 'care-information',
        animal: specialCareAnimal._id,
        animalName: 'Сова в защитена грижа',
        assistanceType: 'transport',
        description: 'Informational inquiry must not contain assistance details.',
      }),
    ];

    for (const invalidModelFixture of invalidContactInquiryModelFixtures) {
      let validationFailed = false;

      try {
        await invalidModelFixture.validate();
      } catch (error) {
        validationFailed = error?.name === 'ValidationError';
      }

      expect(
        validationFailed,
        'contact inquiry model should enforce type-specific values'
      );
    }

    const missingPhoneInquiryResponse = await guestSession.post('/api/contact-inquiries', {
      type: 'general',
      name: 'Missing Phone',
      email: 'missing-phone@example.com',
      subject: 'General question',
      description: 'Regression inquiry without phone.',
    });
    expectStatus(missingPhoneInquiryResponse, 400, 'contact inquiry should require phone');

    const invalidPhoneInquiryResponse = await guestSession.post('/api/contact-inquiries', {
      type: 'general',
      name: 'Invalid Phone',
      email: 'invalid-phone-inquiry@example.com',
      phone: '------',
      subject: 'General question',
      description: 'Regression inquiry with an invalid phone.',
    });
    expectStatus(
      invalidPhoneInquiryResponse,
      400,
      'contact inquiry should require seven to fifteen phone digits'
    );

    const rescueFieldsInquiryResponse = await guestSession.post('/api/contact-inquiries', {
      type: 'general',
      name: 'Wrong Domain Fields',
      email: 'wrong-domain-fields@example.com',
      phone: '+359888212121',
      subject: 'General question',
      description: 'Regression inquiry with rescue-report fields.',
      species: 'dog',
    });
    expectStatus(
      rescueFieldsInquiryResponse,
      400,
      'contact inquiry should reject rescue report fields'
    );

    const unrelatedTypeFieldResponse = await guestSession.post('/api/contact-inquiries', {
      type: 'general',
      name: 'Unrelated Field',
      email: 'unrelated-field@example.com',
      phone: '+359888222222',
      subject: 'General question',
      description: 'Regression inquiry with a field from another inquiry type.',
      animalName: 'Alpha',
    });
    expectStatus(
      unrelatedTypeFieldResponse,
      400,
      'contact inquiry should reject fields that do not apply to its type'
    );

    const missingAdoptionFieldsResponse = await guestSession.post('/api/contact-inquiries', {
      type: 'adoption',
      name: 'Missing Adoption Fields',
      email: 'missing-adoption@example.com',
      phone: '+359888202020',
      description: 'Regression adoption inquiry without animal name or subject.',
    });
    expectStatus(
      missingAdoptionFieldsResponse,
      400,
      'adoption contact inquiry should require animal name and subject'
    );

    const invalidAdoptionSubjectResponse = await guestSession.post('/api/contact-inquiries', {
      type: 'adoption',
      name: 'Invalid Adoption Subject',
      email: 'invalid-adoption-subject@example.com',
      phone: '+359888232323',
      subject: 'banana',
      animalName: 'Alpha',
      description: 'Regression inquiry with an unsupported adoption subject.',
    });
    expectStatus(
      invalidAdoptionSubjectResponse,
      400,
      'adoption contact inquiry should enforce subject values'
    );

    const missingSpecialCareAnimalResponse = await guestSession.post('/api/contact-inquiries', {
      type: 'special-care',
      name: 'Missing Special Care Animal',
      email: 'missing-special-care@example.com',
      phone: '+359888272727',
      subject: 'special-request',
      assistanceType: 'material-help',
      hasRelevantExperience: false,
      description: 'Regression special-care inquiry without an animal.',
    });
    expectStatus(
      missingSpecialCareAnimalResponse,
      400,
      'special-care contact inquiry should require an animal'
    );

    const ineligibleSpecialCareAnimalResponse = await guestSession.post('/api/contact-inquiries', {
      type: 'special-care',
      name: 'Ineligible Special Care Animal',
      email: 'ineligible-special-care@example.com',
      phone: '+359888282828',
      subject: 'special-request',
      animalId: 'alpha-beagle-dog',
      assistanceType: 'transport',
      hasRelevantExperience: false,
      description: 'Regression special-care inquiry for an available adoption animal.',
    });
    expectStatus(
      ineligibleSpecialCareAnimalResponse,
      409,
      'special-care contact inquiry should enforce animal eligibility'
    );

    const careInformationInquiryResponse = await guestSession.post('/api/contact-inquiries', {
      type: 'special-care',
      name: 'Special Care Information Contact',
      email: 'special-care-information@example.com',
      phone: '+359888292929',
      subject: 'care-information',
      animalId: specialCareAnimal.slug,
      description: 'Искам да науча повече за състоянието и грижата за животното.',
    });
    expectStatus(
      careInformationInquiryResponse,
      201,
      'special-care information inquiry without assistance details'
    );
    const careInformationInquiryId = extractItem(careInformationInquiryResponse)?.id;
    const storedCareInformationInquiry = await ContactInquiry.findById(
      careInformationInquiryId
    ).lean();
    expect(
      storedCareInformationInquiry?.subject === 'care-information' &&
        storedCareInformationInquiry?.assistanceType == null &&
        storedCareInformationInquiry?.hasRelevantExperience == null &&
        storedCareInformationInquiry?.experienceDetails == null &&
        storedCareInformationInquiry?.availability == null,
      'care-information inquiry should not require or persist assistance details'
    );

    const supportOptionsInquiryResponse = await guestSession.post('/api/contact-inquiries', {
      type: 'special-care',
      name: 'Special Care Support Options Contact',
      email: 'special-care-support-options@example.com',
      phone: '+359888303030',
      subject: 'support-options',
      animalId: specialCareAnimal.slug,
      description: 'Искам да науча какви възможности за подкрепа предлага приютът.',
    });
    expectStatus(
      supportOptionsInquiryResponse,
      201,
      'special-care support options inquiry without assistance details'
    );
    const supportOptionsInquiryId = extractItem(supportOptionsInquiryResponse)?.id;

    const missingSpecialRequestAssistanceResponse = await guestSession.post(
      '/api/contact-inquiries',
      {
        type: 'special-care',
        name: 'Missing Special Request Assistance',
        email: 'missing-special-request-assistance@example.com',
        phone: '+359888313131',
        subject: 'special-request',
        animalId: specialCareAnimal.slug,
        hasRelevantExperience: false,
        description: 'Искам да подам специална заявка без избран вид помощ.',
      }
    );
    expectStatus(
      missingSpecialRequestAssistanceResponse,
      400,
      'special request should require assistance type'
    );

    const missingSpecialRequestExperienceResponse = await guestSession.post(
      '/api/contact-inquiries',
      {
        type: 'special-care',
        name: 'Missing Special Request Experience',
        email: 'missing-special-request-experience@example.com',
        phone: '+359888323232',
        subject: 'special-request',
        animalId: specialCareAnimal.slug,
        assistanceType: 'transport',
        description: 'Искам да подам специална заявка без отговор за опита.',
      }
    );
    expectStatus(
      missingSpecialRequestExperienceResponse,
      400,
      'special request should require an experience answer'
    );

    const missingSpecialRequestExperienceDetailsResponse = await guestSession.post(
      '/api/contact-inquiries',
      {
        type: 'special-care',
        name: 'Missing Special Request Experience Details',
        email: 'missing-special-request-experience-details@example.com',
        phone: '+359888333333',
        subject: 'special-request',
        animalId: specialCareAnimal.slug,
        assistanceType: 'professional-help',
        hasRelevantExperience: true,
        description: 'Искам да подам специална заявка без описание на опита.',
      }
    );
    expectStatus(
      missingSpecialRequestExperienceDetailsResponse,
      400,
      'special request should require details when relevant experience is confirmed'
    );

    const missingSpecialRequestAvailabilityResponse = await guestSession.post(
      '/api/contact-inquiries',
      {
        type: 'special-care',
        name: 'Missing Special Request Availability',
        email: 'missing-special-request-availability@example.com',
        phone: '+359888343333',
        subject: 'special-request',
        animalId: specialCareAnimal.slug,
        assistanceType: 'transport',
        hasRelevantExperience: false,
        description: 'Искам да подам специална заявка без избрана наличност.',
      }
    );
    expectStatus(
      missingSpecialRequestAvailabilityResponse,
      400,
      'special request should require availability'
    );

    const specialCareInquiryResponse = await guestSession.post('/api/contact-inquiries', {
      type: 'special-care',
      name: 'Special Care Contact',
      email: 'special-request-contact@example.com',
      phone: '+359888343434',
      subject: 'special-request',
      animalId: specialCareAnimal.slug,
      animalName: 'Подменено име от клиента',
      assistanceType: 'professional-help',
      hasRelevantExperience: true,
      experienceDetails: 'Две години опит с птици в спасителен център.',
      availability: 'weekends',
      description: 'Искам да науча как мога да подкрепя грижата за това животно.',
    });
    expectStatus(specialCareInquiryResponse, 201, 'public special request create');
    expect(
      extractItem(specialCareInquiryResponse)?.type === 'special-care',
      'special-care inquiry should preserve its specific type'
    );
    const specialCareInquiryId = extractItem(specialCareInquiryResponse)?.id;
    const storedSpecialCareInquiry = await ContactInquiry.findById(specialCareInquiryId).lean();
    expect(
      storedSpecialCareInquiry?.animalName === 'Сова в защитена грижа' &&
        String(storedSpecialCareInquiry?.animal) === String(specialCareAnimal._id) &&
        storedSpecialCareInquiry?.subject === 'special-request' &&
        storedSpecialCareInquiry?.assistanceType === 'professional-help' &&
        storedSpecialCareInquiry?.hasRelevantExperience === true &&
        storedSpecialCareInquiry?.experienceDetails ===
          'Две години опит с птици в спасителен център.' &&
        storedSpecialCareInquiry?.availability === 'weekends',
      'special-care inquiry should persist its animal, assistance, experience and availability'
    );
    await Promise.all([
      ContactInquiry.deleteMany({
        _id: {
          $in: [
            careInformationInquiryId,
            supportOptionsInquiryId,
            specialCareInquiryId,
          ],
        },
      }),
      Animal.findByIdAndDelete(specialCareAnimal._id),
      Notification.deleteMany({
        resourceType: 'contact-inquiry',
        resourceId: {
          $in: [
            careInformationInquiryId,
            supportOptionsInquiryId,
            specialCareInquiryId,
          ],
        },
      }),
    ]);

    const missingVolunteerFieldsResponse = await guestSession.post('/api/contact-inquiries', {
      type: 'volunteering',
      name: 'Missing Volunteer Fields',
      email: 'missing-volunteer@example.com',
      phone: '+359888303030',
      subject: 'animal-care',
      description: 'Regression volunteering inquiry without availability.',
    });
    expectStatus(
      missingVolunteerFieldsResponse,
      400,
      'volunteering contact inquiry should require availability and subject'
    );

    const invalidVolunteerSubjectResponse = await guestSession.post('/api/contact-inquiries', {
      type: 'volunteering',
      name: 'Invalid Volunteer Subject',
      email: 'invalid-volunteer-subject@example.com',
      phone: '+359888242424',
      subject: 'banana',
      availability: 'Уикенд',
      description: 'Regression inquiry with an unsupported volunteer subject.',
    });
    expectStatus(
      invalidVolunteerSubjectResponse,
      400,
      'volunteering contact inquiry should enforce subject values'
    );

    const missingDonationFieldsResponse = await guestSession.post('/api/contact-inquiries', {
      type: 'donation',
      name: 'Missing Donation Fields',
      email: 'missing-donation@example.com',
      phone: '+359888404040',
      subject: 'Food',
      description: 'Regression donation inquiry without donation topic.',
    });
    expectStatus(
      missingDonationFieldsResponse,
      400,
      'donation contact inquiry should require donation topic and subject'
    );

    const invalidDonationTopicResponse = await guestSession.post('/api/contact-inquiries', {
      type: 'donation',
      name: 'Invalid Donation Topic',
      email: 'invalid-donation-topic@example.com',
      phone: '+359888252525',
      subject: 'Donation question',
      donationTopic: 'banana',
      description: 'Regression inquiry with an unsupported donation topic.',
    });
    expectStatus(
      invalidDonationTopicResponse,
      400,
      'donation contact inquiry should enforce donation topic values'
    );

    const longSubjectInquiryResponse = await guestSession.post('/api/contact-inquiries', {
      type: 'general',
      name: 'Long Subject',
      email: 'long-subject-inquiry@example.com',
      phone: '+359888262626',
      subject: 'x'.repeat(201),
      description: 'Regression inquiry with an oversized subject.',
    });
    expectStatus(
      longSubjectInquiryResponse,
      400,
      'contact inquiry should enforce text limits'
    );

    const createInquiryResponse = await guestSession.post('/api/contact-inquiries', {
      type: 'adoption',
      name: 'Contact Regression',
      email: 'contact-regression@example.com',
      phone: '+359888101010',
      subject: 'animal-details',
      animalName: 'Alpha',
      description: 'Regression inquiry for adoption details.',
    });
    expectStatus(createInquiryResponse, 201, 'public contact inquiry create');
    expect(extractItem(createInquiryResponse)?.status === 'pending', 'created contact inquiry should be pending');
    expect(
      extractItem(createInquiryResponse)?.description === undefined &&
        extractItem(createInquiryResponse)?.allowedStatusTransitions === undefined &&
        extractItem(createInquiryResponse)?.statusHistory === undefined &&
        extractItem(createInquiryResponse)?.resolvedAt === undefined &&
        extractItem(createInquiryResponse)?.policy === undefined,
      'public contact inquiry create should return only submission metadata'
    );
    const createdInquiryId = extractItem(createInquiryResponse)?.id;
    const storedInquiry = await ContactInquiry.findById(createdInquiryId).lean();
    expect(
      storedInquiry?.location === undefined &&
        storedInquiry?.species === undefined &&
        storedInquiry?.imageUrl === undefined,
      'contact inquiry should not persist rescue report fields'
    );
    expect(
      storedInquiry?.statusHistory?.some(
        (entry) => entry.fromStatus === '' && entry.toStatus === 'pending'
      ),
      'created contact inquiry should record its initial pending status'
    );

    const employeeInquiryNotificationsResponse = await employeeSession.get('/api/notifications?limit=50');
    expectStatus(employeeInquiryNotificationsResponse, 200, 'employee contact inquiry notifications');
    expect(
      Boolean(
        findNotification(
          extractItems(employeeInquiryNotificationsResponse),
          'contact-inquiry-created',
          'contact-inquiry',
          createdInquiryId
        )
      ),
      'new contact inquiry should notify employees'
    );

    const adminInquiryNotificationsResponse = await adminSession.get('/api/notifications?limit=50');
    expectStatus(adminInquiryNotificationsResponse, 200, 'admin contact inquiry notifications');
    expect(
      Boolean(
        findNotification(
          extractItems(adminInquiryNotificationsResponse),
          'contact-inquiry-created',
          'contact-inquiry',
          createdInquiryId
        )
      ),
      'new contact inquiry should notify admins'
    );

    const employeeListInquiriesResponse = await employeeSession.get(
      '/api/contact-inquiries?type=adoption&status=pending&page=1&limit=10'
    );
    expectStatus(employeeListInquiriesResponse, 200, 'employee contact inquiries list');
    expect(extractItems(employeeListInquiriesResponse).length === 1, 'filtered contact inquiries list should contain one record');
    expect(extractItem(employeeListInquiriesResponse)?.total === 1, 'filtered contact inquiries total should be one');
    expect(
      extractItems(employeeListInquiriesResponse)[0]?.subject === 'animal-details' &&
        extractItems(employeeListInquiriesResponse)[0]?.description === undefined &&
        extractItems(employeeListInquiriesResponse)[0]?.allowedStatusTransitions === undefined,
      'contact inquiry list should expose subject without full detail fields'
    );
    expectPagination(
      employeeListInquiriesResponse,
      {
        page: 1,
        limit: 10,
        maxLimit: 50,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
      'contact inquiries pagination wiring'
    );

    const employeeInquiryDetailResponse = await employeeSession.get(`/api/contact-inquiries/${createdInquiryId}`);
    expectStatus(employeeInquiryDetailResponse, 200, 'employee contact inquiry detail');
    expect(
      extractItem(employeeInquiryDetailResponse)?.allowedStatusTransitions?.includes('under-review'),
      'pending contact inquiry should expose under-review transition'
    );
    expect(
      extractItem(employeeInquiryDetailResponse)?.statusHistory?.some(
        (entry) => entry.fromStatus === '' && entry.toStatus === 'pending'
      ),
      'contact inquiry detail should expose the initial status history entry'
    );

    const inquiryPendingToReviewResponse = await employeeSession.patch(
      `/api/contact-inquiries/${createdInquiryId}/status`,
      {
        status: 'under-review',
      }
    );
    expectStatus(inquiryPendingToReviewResponse, 200, 'contact inquiries pending to under-review transition');
    expect(
      extractItem(inquiryPendingToReviewResponse)?.status === 'under-review',
      'contact inquiries pending to under-review should update status'
    );
    expect(
      extractItem(inquiryPendingToReviewResponse)?.statusHistory?.some(
        (entry) =>
          entry.fromStatus === 'pending' &&
          entry.toStatus === 'under-review' &&
          Boolean(entry.changedBy) &&
          Boolean(entry.changedByName)
      ),
      'contact inquiry status history should record the staff actor'
    );

    const sameInquiryStatusResponse = await employeeSession.patch(
      `/api/contact-inquiries/${createdInquiryId}/status`,
      {
        status: 'under-review',
      }
    );
    expectStatus(
      sameInquiryStatusResponse,
      409,
      'contact inquiry same status update should be rejected'
    );

    const inquiryReviewToResolvedResponse = await employeeSession.patch(
      `/api/contact-inquiries/${createdInquiryId}/status`,
      {
        status: 'resolved',
      }
    );
    expectStatus(inquiryReviewToResolvedResponse, 200, 'contact inquiries under-review to resolved transition');
    expect(
      extractItem(inquiryReviewToResolvedResponse)?.status === 'resolved',
      'contact inquiries under-review to resolved should update status'
    );
    expect(
      Boolean(extractItem(inquiryReviewToResolvedResponse)?.resolvedAt),
      'resolved contact inquiry should expose resolvedAt'
    );
    expect(
      extractItem(inquiryReviewToResolvedResponse)?.statusHistory?.some(
        (entry) => entry.fromStatus === 'under-review' && entry.toStatus === 'resolved'
      ),
      'resolved contact inquiry should record its terminal transition'
    );

    const invalidInquiryPendingToResolvedId = await createContactInquiryTransitionFixture('pending', 1);
    const invalidInquiryPendingToResolvedResponse = await adminSession.patch(
      `/api/contact-inquiries/${invalidInquiryPendingToResolvedId}/status`,
      {
        status: 'resolved',
      }
    );
    expectStatus(
      invalidInquiryPendingToResolvedResponse,
      409,
      'contact inquiries pending to resolved should require under-review first'
    );

    const invalidInquiryResolvedToReviewId = await createContactInquiryTransitionFixture('resolved', 2);
    const invalidInquiryResolvedToReviewResponse = await adminSession.patch(
      `/api/contact-inquiries/${invalidInquiryResolvedToReviewId}/status`,
      {
        status: 'under-review',
      }
    );
    expectStatus(
      invalidInquiryResolvedToReviewResponse,
      409,
      'contact inquiries resolved to under-review should be forbidden'
    );

    const workflowOrderMarker = 'workflow-order-regression';
    const workflowOrderNow = Date.now();
    const workflowOrderFixtures = await ContactInquiry.create([
      {
        type: 'general',
        name: `${workflowOrderMarker} terminal`,
        email: 'workflow-order-terminal@example.com',
        phone: '+359885570101',
        subject: 'Workflow ordering',
        description: 'Terminal record created after the active records.',
        status: 'resolved',
        createdAt: new Date(workflowOrderNow),
      },
      {
        type: 'general',
        name: `${workflowOrderMarker} pending`,
        email: 'workflow-order-pending@example.com',
        phone: '+359885570102',
        subject: 'Workflow ordering',
        description: 'Newest active workflow record.',
        status: 'pending',
        createdAt: new Date(workflowOrderNow - 60 * 60 * 1000),
      },
      {
        type: 'general',
        name: `${workflowOrderMarker} review`,
        email: 'workflow-order-review@example.com',
        phone: '+359885570103',
        subject: 'Workflow ordering',
        description: 'Older active workflow record.',
        status: 'under-review',
        createdAt: new Date(workflowOrderNow - 2 * 60 * 60 * 1000),
      },
    ]);
    const workflowOrderFixtureIds = workflowOrderFixtures.map((entry) => entry._id);

    try {
      const workflowOrderFirstPage = await employeeSession.get(
        `/api/contact-inquiries?search=${workflowOrderMarker}&page=1&limit=2`
      );
      expectStatus(workflowOrderFirstPage, 200, 'workflow ordering first page');
      expect(
        extractItems(workflowOrderFirstPage).map((entry) => entry.status).join(',') ===
          'pending,under-review',
        'active workflow records should be ordered before newer terminal records'
      );

      const workflowOrderSecondPage = await employeeSession.get(
        `/api/contact-inquiries?search=${workflowOrderMarker}&page=2&limit=2`
      );
      expectStatus(workflowOrderSecondPage, 200, 'workflow ordering second page');
      expect(
        extractItems(workflowOrderSecondPage).map((entry) => entry.status).join(',') ===
          'resolved',
        'terminal workflow records should continue after all active records'
      );
    } finally {
      await ContactInquiry.deleteMany({ _id: { $in: workflowOrderFixtureIds } });
    }

    let contactInquiryRateLimitResponse = null;

    for (let attempt = 0; attempt < 16; attempt += 1) {
      contactInquiryRateLimitResponse = await guestSession.post('/api/contact-inquiries', {});

      if (contactInquiryRateLimitResponse.status === 429) {
        break;
      }
    }

    expectStatus(
      contactInquiryRateLimitResponse,
      429,
      'public contact inquiry rate limiter'
    );
  });

  await recordStep('Pagination: donations pages, limits and filtered totals', async () => {
    const invalidDonationPhoneResponse = await guestSession.post('/api/donations', {
      name: 'Invalid Phone Donor',
      email: 'invalid-phone-donor@example.com',
      phone: '------',
      amount: 20,
      message: 'Invalid phone regression check.',
    });
    expectStatus(invalidDonationPhoneResponse, 400, 'public donation phone digit validation guard');

    const createDonationNotificationResponse = await guestSession.post('/api/donations', {
      name: 'Notification Donor',
      email: 'notification-donor@example.com',
      phone: '+359885551111',
      amount: 20,
      message: 'Regression notification generator check.',
    });
    expectStatus(createDonationNotificationResponse, 201, 'public donation notification fixture');
    const notificationDonationId = extractItem(createDonationNotificationResponse)?.id;
    expect(extractItem(createDonationNotificationResponse)?.amountCents === 2000, 'created donation should expose amount cents');
    expect(
      extractItem(createDonationNotificationResponse)?.statusHistory?.some((entry) => entry.toStatus === 'pledged'),
      'created donation should record initial pledged status history'
    );
    const storedDonation = await Donation.findById(notificationDonationId).lean();
    expect(storedDonation?.amountCents === 2000, 'created donation should persist canonical amount cents');
    expect(
      storedDonation?.amount === undefined,
      'created donation should not persist derived amount field'
    );

    const employeeDonationNotificationsResponse = await employeeSession.get('/api/notifications?limit=50');
    expectStatus(employeeDonationNotificationsResponse, 200, 'employee donation notifications');
    expect(
      Boolean(
        findNotification(
          extractItems(employeeDonationNotificationsResponse),
          'donation-created',
          'donation',
          notificationDonationId
        )
      ),
      'new donation should notify employees'
    );

    const adminDonationNotificationsResponse = await adminSession.get('/api/notifications?limit=50');
    expectStatus(adminDonationNotificationsResponse, 200, 'admin donation notifications');
    expect(
      Boolean(
        findNotification(
          extractItems(adminDonationNotificationsResponse),
          'donation-created',
          'donation',
          notificationDonationId
        )
      ),
      'new donation should notify admins'
    );

    await seedDonationPaginationFixtures();

    const pledgedDonationsResponse = await adminSession.get('/api/donations?status=pledged&limit=5');
    expectStatus(pledgedDonationsResponse, 200, 'donations pledged status filter');
    expect(extractItem(pledgedDonationsResponse)?.total === 25, 'pledged donations should include all fresh fixtures');

    const donationStatusFixtureId = extractItems(pledgedDonationsResponse)[0]?.id;
    const donationStatusFixtureAmount = extractItems(pledgedDonationsResponse)[0]?.amount;
    expect(Boolean(donationStatusFixtureId), 'donations status test should pick a fixture id');

    const employeeDonationStatusResponse = await employeeSession.patch(
      `/api/donations/${donationStatusFixtureId}/status`,
      {
        status: 'confirmed',
      }
    );
    expectStatus(employeeDonationStatusResponse, 403, 'employee donation status update guard');

    const confirmedDonationResponse = await adminSession.patch(
      `/api/donations/${donationStatusFixtureId}/status`,
      {
        status: 'confirmed',
      }
    );
    expectStatus(confirmedDonationResponse, 200, 'admin donation pledged to confirmed');
    expect(
      extractItem(confirmedDonationResponse)?.status === 'confirmed',
      'donation status should become confirmed'
    );
    expect(
      extractItem(confirmedDonationResponse)?.statusHistory?.some(
        (entry) => entry.fromStatus === 'pledged' && entry.toStatus === 'confirmed'
      ),
      'donation confirmed transition should record status history'
    );

    const sameDonationStatusResponse = await adminSession.patch(
      `/api/donations/${donationStatusFixtureId}/status`,
      {
        status: 'confirmed',
      }
    );
    expectStatus(sameDonationStatusResponse, 409, 'donation same status update should be rejected');

    const receivedDonationResponse = await adminSession.patch(
      `/api/donations/${donationStatusFixtureId}/status`,
      {
        status: 'received',
      }
    );
    expectStatus(receivedDonationResponse, 200, 'admin donation confirmed to received');
    expect(
      extractItem(receivedDonationResponse)?.status === 'received',
      'donation status should become received'
    );
    expect(Boolean(extractItem(receivedDonationResponse)?.receivedAt), 'received donation should expose receivedAt');
    expect(
      extractItem(receivedDonationResponse)?.statusHistory?.some(
        (entry) => entry.fromStatus === 'confirmed' && entry.toStatus === 'received'
      ),
      'donation received transition should record status history'
    );

    const donationReceivedDate = formatLocalDateOnly();
    const donationReceivedReportResponse = await adminSession.get(
      `/api/reports/overview?period=custom&dateFrom=${donationReceivedDate}&dateTo=${donationReceivedDate}`
    );
    expectStatus(donationReceivedReportResponse, 200, 'reports received donation event date');
    expect(
      extractItem(donationReceivedReportResponse)?.activity?.receivedDonations === 1,
      'reports should count a donation by its received event date'
    );
    expect(
      extractItem(donationReceivedReportResponse)?.activity?.receivedDonationAmountTotal ===
        donationStatusFixtureAmount,
      'reports should total the donation received during the selected period'
    );

    const invalidDonationTransitionResponse = await adminSession.patch(
      `/api/donations/${donationStatusFixtureId}/status`,
      {
        status: 'confirmed',
      }
    );
    expectStatus(invalidDonationTransitionResponse, 409, 'received donation should not move back to confirmed');

    const receivedDonationsResponse = await adminSession.get('/api/donations?status=received&limit=10');
    expectStatus(receivedDonationsResponse, 200, 'donations received status filter');
    expect(extractItem(receivedDonationsResponse)?.total === 1, 'received donations filter should count only received records');
    expect(
      extractItems(receivedDonationsResponse)[0]?.id === donationStatusFixtureId,
      'received donations filter should include the updated donation'
    );

    const invalidStatusFilterResponse = await adminSession.get('/api/donations?status=unknown');
    expectStatus(invalidStatusFilterResponse, 400, 'donations invalid status filter');

    const pageTwoResponse = await adminSession.get('/api/donations?page=2&limit=10');
    expectStatus(pageTwoResponse, 200, 'donations page 2');
    expect(extractItems(pageTwoResponse).length === 10, 'donations page 2 should return 10 items');
    expect(extractItem(pageTwoResponse)?.total === 25, 'donations page 2 should expose total 25');
    expect(extractPagination(pageTwoResponse).page === 2, 'donations page 2 should expose page 2');
    expect(extractPagination(pageTwoResponse).totalPages === 3, 'donations page 2 should expose 3 total pages');
    expect(extractPagination(pageTwoResponse).hasNextPage === true, 'donations page 2 should have next page');
    expect(extractPagination(pageTwoResponse).hasPreviousPage === true, 'donations page 2 should have previous page');

    const lastPageResponse = await adminSession.get('/api/donations?page=3&limit=10');
    expectStatus(lastPageResponse, 200, 'donations last page');
    expect(extractItems(lastPageResponse).length === 5, 'donations last page should return remaining 5 items');
    expect(extractPagination(lastPageResponse).hasNextPage === false, 'donations last page should not have next page');
    expect(extractPagination(lastPageResponse).hasPreviousPage === true, 'donations last page should have previous page');

    const invalidPaginationQueries = [
      'page=0',
      'page=-1',
      'page=abc',
      'limit=0',
      'limit=2.5',
    ];

    for (const invalidQuery of invalidPaginationQueries) {
      const invalidResponse = await adminSession.get(`/api/donations?${invalidQuery}`);
      expectStatus(invalidResponse, 400, `invalid donations pagination ${invalidQuery}`);
    }

    const maxLimitResponse = await adminSession.get('/api/donations?limit=500');
    expectStatus(maxLimitResponse, 200, 'donations max limit clamp');
    expect(extractPagination(maxLimitResponse).limit === 50, 'donations max limit should clamp to 50');
    expect(extractPagination(maxLimitResponse).maxLimit === 50, 'donations max limit metadata should expose 50');
    expect(extractItems(maxLimitResponse).length === 25, 'donations max limit should return all 25 fixtures');

    const filteredResponse = await adminSession.get('/api/donations?search=Filtered&limit=5');
    expectStatus(filteredResponse, 200, 'filtered donations pagination');
    expect(extractItem(filteredResponse)?.total === 12, 'filtered donations total should count only matches');
    expect(extractItems(filteredResponse).length === 5, 'filtered donations first page should return 5 items');
    expect(extractPagination(filteredResponse).totalPages === 3, 'filtered donations should expose 3 pages');
    expect(extractPagination(filteredResponse).hasNextPage === true, 'filtered donations first page should have next page');
    expect(extractPagination(filteredResponse).hasPreviousPage === false, 'filtered donations first page should not have previous page');
  });

  console.log('');
  console.log(`Regression check passed: ${results.length} scenario groups completed successfully.`);
} finally {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  if (mongoose.connection.readyState !== 0) {
    try {
      if (regressionDatabaseValidated) {
        await clearRegressionCollections();
      }
    } finally {
      await mongoose.disconnect();
    }
  }
}
