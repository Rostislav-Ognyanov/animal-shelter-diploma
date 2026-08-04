process.env.DB_URL =
  process.env.REGRESSION_DB_URL || 'mongodb://127.0.0.1:27017/animal_shelter_regression';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'regression-test-secret';

const { connectToDatabase } = await import('../config/db.js');
const { hashPassword } = await import('../modules/auth/auth.security.js');
const { ANIMAL_SPECIES_VALUES } = await import('../modules/animals/animal.constants.js');
const { default: AdoptionRequest } = await import('../models/AdoptionRequest.js');
const { default: Animal } = await import('../models/Animal.js');
const { default: Donation } = await import('../models/Donation.js');
const { default: Favorite } = await import('../models/Favorite.js');
const { default: RescueReport } = await import('../models/RescueReport.js');
const { default: User } = await import('../models/User.js');
const { default: VolunteerApplication } = await import('../models/VolunteerApplication.js');
const { default: mongoose } = await import('mongoose');
const { default: app } = await import('../app.js');

function iso(dateValue) {
  return new Date(dateValue).toISOString();
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

function extractItems(response) {
  return response.body?.data?.items ?? [];
}

function extractItem(response) {
  return response.body?.data ?? null;
}

function extractPagination(response) {
  return response.body?.meta?.pagination ?? {};
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
  await Promise.all([
    AdoptionRequest.deleteMany({}),
    Animal.deleteMany({}),
    Donation.deleteMany({}),
    Favorite.deleteMany({}),
    RescueReport.deleteMany({}),
    User.deleteMany({}),
    VolunteerApplication.deleteMany({}),
  ]);
}

async function seedMongoFixtures(fixtures) {
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
      amount: number,
      message: isFilteredFixture ? 'filtered pagination fixture' : 'general pagination fixture',
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
        guardianConsent: false,
        preferredPositions: ['animal-care'],
        motivation: 'Regression pagination fixture.',
        experience: '',
        availability: 'Weekends',
        status: number === 1 ? 'pending' : number === 2 ? 'under-review' : 'approved',
        notes: '',
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
        imageUrl: number === 3 ? 'data:image/png;base64,fixture-image' : '',
        status: number === 1 ? 'pending' : number === 2 ? 'under-review' : 'accepted',
        notes: '',
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
    guardianConsent: false,
    preferredPositions: ['animal-care'],
    motivation: 'Regression status transition fixture.',
    experience: '',
    availability: 'Weekdays',
    status,
    notes: '',
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
    notes: '',
  });

  return String(createdReport._id);
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
    this.accessToken = '';
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

  captureAccessToken(payload) {
    if (payload?.data && Object.prototype.hasOwnProperty.call(payload.data, 'accessToken')) {
      this.accessToken = payload.data.accessToken || '';
    }
  }

  async request(method, pathname, { body } = {}) {
    const headers = {};

    if (this.cookieHeader) {
      headers.Cookie = this.cookieHeader;
    }

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
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
    this.captureAccessToken(payload);

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
  await connectToDatabase();
  const fixtures = await createFixtures();
  const seededFixtures = await seedMongoFixtures(fixtures);
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
    expect(Boolean(clientSession.accessToken), 'register should return access token');
    expect(Boolean(clientSession.cookieHeader), 'register should set auth cookie');

    const authStatusAfterRegister = await clientSession.get('/api/auth/status');
    expectStatus(authStatusAfterRegister, 200, 'auth status after register');
    expect(extractItem(authStatusAfterRegister)?.authenticated === true, 'status should be authenticated after register');

    const logoutResponse = await clientSession.post('/api/auth/logout', {});
    expectStatus(logoutResponse, 200, 'logout');
    expect(clientSession.accessToken === '', 'logout should clear access token payload');

    const authStatusAfterLogout = await clientSession.get('/api/auth/status');
    expectStatus(authStatusAfterLogout, 200, 'auth status after logout');
    expect(extractItem(authStatusAfterLogout)?.authenticated === false, 'status should be guest after logout');

    const loginResponse = await clientSession.post('/api/auth/login', {
      username: 'regression-client',
      password: 'Client1234',
      rememberMe: true,
    });

    expectStatus(loginResponse, 200, 'login');
    expect(extractItem(loginResponse)?.authenticated === true, 'login should authenticate the user');
    expect(extractItem(loginResponse)?.user?.username === 'regression-client', 'login should return the correct user');
  });

  await recordStep('Auth guards and role access', async () => {
    const loginEmployeeResponse = await employeeSession.post('/api/auth/login', {
      username: 'employee',
      password: 'Employee1234',
    });
    expectStatus(loginEmployeeResponse, 200, 'employee login');

    const loginAdminResponse = await adminSession.post('/api/auth/login', {
      username: 'admin',
      password: 'Admin1234',
    });
    expectStatus(loginAdminResponse, 200, 'admin login');

    const guestOwnRequestsResponse = await guestSession.get('/api/adoptions/my');
    expectStatus(guestOwnRequestsResponse, 401, 'guest own requests guard');

    const clientUsersResponse = await clientSession.get('/api/users');
    expectStatus(clientUsersResponse, 403, 'client admin users guard');

    const employeeUsersResponse = await employeeSession.get('/api/users');
    expectStatus(employeeUsersResponse, 403, 'employee admin users guard');

    const adminUsersResponse = await adminSession.get('/api/users');
    expectStatus(adminUsersResponse, 200, 'admin users access');
    expect(extractItems(adminUsersResponse).length === 4, 'admin users list should include the newly registered client');

    const employeeReportsResponse = await employeeSession.get('/api/reports/overview');
    expectStatus(employeeReportsResponse, 403, 'employee reports guard');

    const adminReportsResponse = await adminSession.get('/api/reports/overview');
    expectStatus(adminReportsResponse, 200, 'admin reports access');
  });

  await recordStep('Pagination wiring: animals and users endpoints', async () => {
    const animalsPaginationResponse = await guestSession.get('/api/animals?page=2&limit=1');
    expectStatus(animalsPaginationResponse, 200, 'animals pagination wiring');
    expect(extractItems(animalsPaginationResponse).length === 1, 'animals pagination should honor limit=1');
    expect(extractItem(animalsPaginationResponse)?.total === 3, 'animals pagination should expose filtered total');
    expectPagination(
      animalsPaginationResponse,
      {
        page: 2,
        limit: 1,
        maxLimit: 48,
        total: 3,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      },
      'animals pagination wiring'
    );

    const usersPaginationResponse = await adminSession.get('/api/users?page=2&limit=2');
    expectStatus(usersPaginationResponse, 200, 'users pagination wiring');
    expect(extractItems(usersPaginationResponse).length === 2, 'users pagination should honor limit=2');
    expect(extractItem(usersPaginationResponse)?.total === 4, 'users pagination should expose total users');
    expectPagination(
      usersPaginationResponse,
      {
        page: 2,
        limit: 2,
        maxLimit: 50,
        total: 4,
        totalPages: 2,
        hasNextPage: false,
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
    expect(extractItem(addFavoriteResponse)?.id === 'alpha-beagle-dog', 'favorite add should return the selected animal');

    const duplicateFavoriteResponse = await clientSession.post('/api/favorites/alpha-beagle-dog', {});
    expectStatus(duplicateFavoriteResponse, 200, 'client add duplicate favorite');

    const listFavoritesResponse = await clientSession.get('/api/favorites');
    expectStatus(listFavoritesResponse, 200, 'client list favorites');
    expect(extractItems(listFavoritesResponse).length === 1, 'favorites list should contain one record after add');
    expect(extractItems(listFavoritesResponse)[0]?.id === 'alpha-beagle-dog', 'favorites list should include the selected animal');

    const removeFavoriteResponse = await clientSession.delete('/api/favorites/alpha-beagle-dog');
    expectStatus(removeFavoriteResponse, 200, 'client remove favorite');
    expect(extractItem(removeFavoriteResponse)?.removed === true, 'favorite remove should confirm removal');

    const emptyFavoritesResponse = await clientSession.get('/api/favorites');
    expectStatus(emptyFavoritesResponse, 200, 'client list favorites after removal');
    expect(extractItems(emptyFavoritesResponse).length === 0, 'favorites list should be empty after removal');
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
    expect(extractItem(adminReportsResponse)?.dashboard?.totalUsers === 4, 'reports overview should expose total users');
    expect(extractItem(adminReportsResponse)?.dashboard?.employeeUsers === 1, 'reports overview should expose employee users');
    expect(extractItem(adminReportsResponse)?.dashboard?.adminUsers === 1, 'reports overview should expose admin users');
    expect(extractItem(adminReportsResponse)?.activity?.newAnimals === 3, 'reports overview should expose period activity for animals');
    expect((extractItem(adminReportsResponse)?.reports?.usersByRole ?? []).length === 3, 'reports overview should include users by role breakdown');

    const filteredOverviewResponse = await adminSession.get('/api/reports/overview?period=custom&dateFrom=2026-02-01&dateTo=2026-02-28');
    expectStatus(filteredOverviewResponse, 200, 'admin reports overview with custom range');
    expect(extractItem(filteredOverviewResponse)?.filters?.period === 'custom', 'reports overview should expose the custom period');
    expect(extractItem(filteredOverviewResponse)?.activity?.newAnimals === 1, 'custom range should narrow new animals to February intake');
    expect(extractItem(filteredOverviewResponse)?.reports?.adoptions?.totalRequests === 0, 'custom range should keep requests empty before adoptions are created');

    const adminAnimalMasterDataResponse = await adminSession.get('/api/reports/animal-master-data');
    expectStatus(adminAnimalMasterDataResponse, 200, 'admin animal master data');
    expect(extractItem(adminAnimalMasterDataResponse)?.totals?.totalAnimals === 3, 'animal master data should expose total animals');
    expect(
      (extractItem(adminAnimalMasterDataResponse)?.animalSpeciesBreakdown ?? []).length === ANIMAL_SPECIES_VALUES.length,
      'animal master data should include species breakdown'
    );
    expect((extractItem(adminAnimalMasterDataResponse)?.intakeByPeriod ?? []).length === 3, 'animal master data should include intake windows');

    const filteredAnimalMasterDataResponse = await adminSession.get('/api/reports/animal-master-data?period=custom&dateFrom=2026-02-01&dateTo=2026-02-28');
    expectStatus(filteredAnimalMasterDataResponse, 200, 'admin filtered animal master data');
    expect(extractItem(filteredAnimalMasterDataResponse)?.totals?.totalAnimals === 1, 'filtered animal master data should narrow the animal slice');
    expect(extractItem(filteredAnimalMasterDataResponse)?.overallTotals?.totalAnimals === 3, 'filtered animal master data should preserve overall totals');
  });

  await recordStep('Users: deactivated employee loses access', async () => {
    const deactivateResponse = await adminSession.patch(`/api/users/${employeeUserId}/status`, {
      isActive: false,
    });
    expectStatus(deactivateResponse, 200, 'admin deactivate employee');
    expect(extractItem(deactivateResponse)?.isActive === false, 'employee should become inactive');

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
      imageUrl: 'images/animals/dog.png',
    });
    expectStatus(inactiveStaffActionResponse, 401, 'deactivated employee staff guard');
    expect(
      String(inactiveStaffActionResponse.body?.message ?? '').includes('деактивиран'),
      'deactivated employee guard should explain that the profile is inactive'
    );

    const inactiveStatusResponse = await employeeSession.get('/api/auth/status');
    expectStatus(inactiveStatusResponse, 200, 'deactivated employee auth status');
    expect(
      extractItem(inactiveStatusResponse)?.authenticated === false,
      'deactivated employee should appear logged out in auth status'
    );
    expect(
      String(extractItem(inactiveStatusResponse)?.authNotice ?? '').includes('деактивиран'),
      'auth status should surface inactive profile notice'
    );

    const inactiveLoginSession = new ApiSession(baseUrl, 'employee-login-check');
    const loginAfterDeactivateResponse = await inactiveLoginSession.post('/api/auth/login', {
      username: 'employee',
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

    const loginAfterReactivateResponse = await inactiveLoginSession.post('/api/auth/login', {
      username: 'employee',
      password: 'Employee1234',
    });
    expectStatus(loginAfterReactivateResponse, 200, 'reactivated employee login');
    expect(
      extractItem(loginAfterReactivateResponse)?.authenticated === true,
      'reactivated employee should be able to log in again'
    );
  });

  await recordStep('Animals: list, details, filters and sort', async () => {
    const listResponse = await guestSession.get('/api/animals');
    expectStatus(listResponse, 200, 'animals list');
    expect(extractItems(listResponse).length === 3, 'animals list should return the seeded fixtures');

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

    const rabbitAliasResponse = await guestSession.get(`/api/animals?query=${encodeURIComponent('клепоухо зайче')}`);
    expectStatus(rabbitAliasResponse, 200, 'animals rabbit alias search');
    expect(
      extractItems(rabbitAliasResponse)[0]?.slug === 'gamma-holland-lop-rabbit',
      'search should find Holland Lop by controlled Bulgarian alias'
    );

    const sortResponse = await guestSession.get('/api/animals?sort=age-desc');
    expectStatus(sortResponse, 200, 'animals sort');
    expect(extractItems(sortResponse)[0]?.slug === 'beta-maine-coon-cat', 'age-desc sort should place the oldest animal first');
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
      imageUrl: 'images/animals/dog.png',
    });
    expectStatus(clientCreateResponse, 403, 'client create animal guard');

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
      imageUrl: 'images/animals/dog.png',
    });
    expectStatus(createResponse, 201, 'employee create animal');
    createdAnimalId = extractItem(createResponse)?.slug;
    expect(createdAnimalId === 'delta-labrador-dog', 'created animal should preserve explicit slug');

    const editResponse = await employeeSession.patch(`/api/animals/${createdAnimalId}`, {
      healthStatus: 'Needs grooming',
      description: 'Updated during regression testing.',
    });
    expectStatus(editResponse, 200, 'employee edit animal');
    expect(extractItem(editResponse)?.healthStatus === 'Needs grooming', 'edit should update health status');

    const statusResponse = await employeeSession.patch(`/api/animals/${createdAnimalId}/status`, {
      status: 'reserved',
    });
    expectStatus(statusResponse, 200, 'employee change animal status');
    expect(extractItem(statusResponse)?.status === 'reserved', 'employee should change status to reserved');

    const employeeDeactivateResponse = await employeeSession.patch(`/api/animals/${createdAnimalId}/deactivate`, {
      status: 'archived',
    });
    expectStatus(employeeDeactivateResponse, 403, 'employee deactivate guard');

    const adminDeactivateResponse = await adminSession.patch(`/api/animals/${createdAnimalId}/deactivate`, {
      status: 'archived',
    });
    expectStatus(adminDeactivateResponse, 200, 'admin deactivate animal');
    expect(extractItem(adminDeactivateResponse)?.status === 'archived', 'admin deactivate should archive the animal');
    expect(extractItem(adminDeactivateResponse)?.isActive === false, 'archived animal should be inactive');
  });

  await recordStep('Adoptions: submit, my requests, cancel, staff processing, animal sync', async () => {
    const guestCreateResponse = await guestSession.post('/api/adoptions', {
      animalId: 'alpha-beagle-dog',
      motivation: 'Guest should not submit.',
      contactPhone: '+359888000000',
    });
    expectStatus(guestCreateResponse, 401, 'guest adoption guard');

    const createRequestResponse = await clientSession.post('/api/adoptions', {
      animalId: 'alpha-beagle-dog',
      motivation: 'Stable home and previous experience with dogs.',
      contactPhone: '+359888111222',
    });
    expectStatus(createRequestResponse, 201, 'client submit adoption request');
    adoptionRequestId = extractItem(createRequestResponse)?.id;
    expect(extractItem(createRequestResponse)?.status === 'pending', 'new adoption request should start as pending');

    const myRequestsResponse = await clientSession.get('/api/adoptions/my');
    expectStatus(myRequestsResponse, 200, 'client my requests');
    expect(extractItems(myRequestsResponse).some((entry) => entry.id === adoptionRequestId), 'client should see the newly created request');

    const clientAllRequestsResponse = await clientSession.get('/api/adoptions');
    expectStatus(clientAllRequestsResponse, 403, 'client all requests guard');

    const allRequestsResponse = await employeeSession.get('/api/adoptions');
    expectStatus(allRequestsResponse, 200, 'staff all requests');
    expect(extractItems(allRequestsResponse).some((entry) => entry.id === adoptionRequestId), 'staff should see all adoption requests');

    const underReviewResponse = await employeeSession.patch(`/api/adoptions/${adoptionRequestId}/status`, {
      status: 'under-review',
      internalNote: 'Initial review completed.',
    });
    expectStatus(underReviewResponse, 200, 'staff adoption under-review');
    expect(extractItem(underReviewResponse)?.status === 'under-review', 'request should move to under-review');
    expect((extractItem(underReviewResponse)?.internalNotes ?? []).length === 1, 'staff note should be stored');

    const reservedAnimalResponse = await guestSession.get('/api/animals/alpha-beagle-dog');
    expectStatus(reservedAnimalResponse, 200, 'animal details after under-review');
    expect(extractItem(reservedAnimalResponse)?.status === 'reserved', 'animal should become reserved when request enters under-review');

    const approvedResponse = await employeeSession.patch(`/api/adoptions/${adoptionRequestId}/status`, {
      status: 'approved',
      internalNote: 'Approved for completion.',
    });
    expectStatus(approvedResponse, 200, 'staff adoption approved');
    expect(extractItem(approvedResponse)?.status === 'approved', 'request should move to approved');

    const completedResponse = await employeeSession.patch(`/api/adoptions/${adoptionRequestId}/status`, {
      status: 'completed',
      internalNote: 'Adoption finalized.',
    });
    expectStatus(completedResponse, 200, 'staff adoption completed');
    expect(extractItem(completedResponse)?.status === 'completed', 'request should move to completed');

    const adoptedAnimalResponse = await guestSession.get('/api/animals/alpha-beagle-dog');
    expectStatus(adoptedAnimalResponse, 200, 'animal details after completed');
    expect(extractItem(adoptedAnimalResponse)?.status === 'adopted', 'animal should become adopted when request is completed');

    const unavailableAnimalRequestResponse = await clientSession.post('/api/adoptions', {
      animalId: 'alpha-beagle-dog',
      motivation: 'Should fail because the animal is no longer available.',
      contactPhone: '+359888111223',
    });
    expectStatus(unavailableAnimalRequestResponse, 409, 'unavailable animal adoption guard');

    const cancellableResponse = await clientSession.post('/api/adoptions', {
      animalId: 'beta-maine-coon-cat',
      motivation: 'Prepared home for a calm cat.',
      contactPhone: '+359888222333',
    });
    expectStatus(cancellableResponse, 201, 'client submit cancellable request');
    cancellableRequestId = extractItem(cancellableResponse)?.id;

    const cancelResponse = await clientSession.patch(`/api/adoptions/${cancellableRequestId}/cancel`, {
      reason: 'Personal circumstances changed.',
    });
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
    await seedVolunteerPaginationFixtures();

    const volunteersPaginationResponse = await adminSession.get('/api/volunteers?page=2&limit=1');
    expectStatus(volunteersPaginationResponse, 200, 'volunteers pagination wiring');
    expect(extractItems(volunteersPaginationResponse).length === 1, 'volunteers should honor limit=1');
    expect(extractItem(volunteersPaginationResponse)?.total === 3, 'volunteers should expose total applications');
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
    expectStatus(volunteersTransitionResponse, 200, 'volunteers status transitions response');
    const volunteerListItem = extractItems(volunteersTransitionResponse)[0] ?? {};
    expect(
      Array.isArray(volunteerListItem.allowedStatusTransitions),
      'volunteers list should expose allowed status transitions'
    );
    expect(
      volunteerListItem.allowedStatusTransitions.length === 0,
      'approved volunteer application should not expose next status transitions'
    );

    const pendingVolunteerResponse = await adminSession.get('/api/volunteers?page=3&limit=1');
    expectStatus(pendingVolunteerResponse, 200, 'pending volunteer transitions response');
    const pendingVolunteerListItem = extractItems(pendingVolunteerResponse)[0] ?? {};
    expect(
      pendingVolunteerListItem.allowedStatusTransitions.length === 1 &&
        pendingVolunteerListItem.allowedStatusTransitions.includes('under-review'),
      'pending volunteer application should only expose under-review as next status'
    );

    const volunteerPendingToReviewId = await createVolunteerTransitionFixture('pending', 1);
    const volunteerPendingToReviewResponse = await adminSession.patch(
      `/api/volunteers/${volunteerPendingToReviewId}/status`,
      {
        status: 'under-review',
        notes: 'Allowed transition regression check.',
      }
    );
    expectStatus(volunteerPendingToReviewResponse, 200, 'volunteers pending to under-review transition');
    expect(
      extractItem(volunteerPendingToReviewResponse)?.status === 'under-review',
      'volunteers pending to under-review should update status'
    );

    const volunteerUnderReviewToApprovedId = await createVolunteerTransitionFixture('under-review', 2);
    const volunteerUnderReviewToApprovedResponse = await adminSession.patch(
      `/api/volunteers/${volunteerUnderReviewToApprovedId}/status`,
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

    const volunteerUnderReviewToRejectedId = await createVolunteerTransitionFixture('under-review', 3);
    const volunteerUnderReviewToRejectedResponse = await adminSession.patch(
      `/api/volunteers/${volunteerUnderReviewToRejectedId}/status`,
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

    const invalidVolunteerPendingToApprovedId = await createVolunteerTransitionFixture('pending', 4);
    const invalidVolunteerPendingToApprovedResponse = await adminSession.patch(
      `/api/volunteers/${invalidVolunteerPendingToApprovedId}/status`,
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
      `/api/volunteers/${invalidVolunteerPendingToRejectedId}/status`,
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
      `/api/volunteers/${volunteerListItem.id}/status`,
      {
        status: 'pending',
        notes: '',
      }
    );
    expectStatus(invalidVolunteerTransitionResponse, 409, 'volunteers invalid status transition');

    await seedRescueReportPaginationFixtures();

    const rescueReportsPaginationResponse = await adminSession.get('/api/rescue-reports?page=2&limit=1');
    expectStatus(rescueReportsPaginationResponse, 200, 'rescue reports pagination wiring');
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

    const rescueReportsImageFlagResponse = await adminSession.get('/api/rescue-reports?page=1&limit=1');
    expectStatus(rescueReportsImageFlagResponse, 200, 'rescue reports image flag list response');
    const rescueReportListItem = extractItems(rescueReportsImageFlagResponse)[0] ?? {};
    expect(rescueReportListItem.hasImage === true, 'rescue reports list should expose whether an image exists');
    expect(
      Array.isArray(rescueReportListItem.allowedStatusTransitions),
      'rescue reports list should expose allowed status transitions'
    );
    expect(
      rescueReportListItem.allowedStatusTransitions.includes('resolved'),
      'accepted rescue report should expose resolved as next status'
    );
    expect(
      !Object.prototype.hasOwnProperty.call(rescueReportListItem, 'imageUrl'),
      'rescue reports list should not return the full image payload'
    );

    const rescuePendingToReviewId = await createRescueReportTransitionFixture('pending', 1);
    const rescuePendingToReviewResponse = await adminSession.patch(
      `/api/rescue-reports/${rescuePendingToReviewId}/status`,
      {
        status: 'under-review',
        notes: 'Allowed transition regression check.',
      }
    );
    expectStatus(rescuePendingToReviewResponse, 200, 'rescue reports pending to under-review transition');
    expect(
      extractItem(rescuePendingToReviewResponse)?.status === 'under-review',
      'rescue reports pending to under-review should update status'
    );

    const rescuePendingToAcceptedId = await createRescueReportTransitionFixture('pending', 2);
    const rescuePendingToAcceptedResponse = await adminSession.patch(
      `/api/rescue-reports/${rescuePendingToAcceptedId}/status`,
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

    const rescuePendingToRejectedId = await createRescueReportTransitionFixture('pending', 3);
    const rescuePendingToRejectedResponse = await adminSession.patch(
      `/api/rescue-reports/${rescuePendingToRejectedId}/status`,
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
      `/api/rescue-reports/${rescueUnderReviewToAcceptedId}/status`,
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
      `/api/rescue-reports/${rescueUnderReviewToRejectedId}/status`,
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
      `/api/rescue-reports/${rescueAcceptedToResolvedId}/status`,
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
      `/api/rescue-reports/${invalidRescueUnderReviewToResolvedId}/status`,
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
      `/api/rescue-reports/${invalidRescueResolvedToAcceptedId}/status`,
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
      `/api/rescue-reports/${invalidRescueRejectedToAcceptedId}/status`,
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
      `/api/rescue-reports/${rescueReportListItem.id}/status`,
      {
        status: 'pending',
        notes: '',
      }
    );
    expectStatus(invalidRescueReportTransitionResponse, 409, 'rescue reports invalid status transition');
  });

  await recordStep('Pagination: donations pages, limits and filtered totals', async () => {
    await seedDonationPaginationFixtures();

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
    await clearRegressionCollections();
    await mongoose.disconnect();
  }
}

