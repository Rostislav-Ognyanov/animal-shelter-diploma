import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const dataFiles = {
  users: path.join(projectRoot, 'server', 'data', 'users.json'),
  animals: path.join(projectRoot, 'server', 'data', 'animals.json'),
  adoptions: path.join(projectRoot, 'server', 'data', 'adoption-requests.json'),
  favorites: path.join(projectRoot, 'server', 'data', 'favorites.json'),
};

process.env.DB_URL = '';
process.env.ANIMALS_ALLOW_MOCK_FALLBACK = 'true';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'regression-test-secret';

const { hashPassword } = await import('../modules/auth/auth.security.js');
const { ANIMAL_SPECIES_VALUES } = await import('../modules/animals/animal.constants.js');
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

async function readTextFile(filePath) {
  return fs.readFile(filePath, 'utf8');
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function createFixtures() {
  const adminPasswordHash = await hashPassword('Admin1234');
  const employeePasswordHash = await hashPassword('Employee1234');
  const clientPasswordHash = await hashPassword('Client1234');

  return {
    users: [
      {
        id: 'seed-admin-001',
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
        id: 'seed-employee-001',
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
        id: 'seed-client-001',
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
    ],    adoptions: [],
    favorites: [],
  };
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

const backups = new Map();
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
  for (const filePath of Object.values(dataFiles)) {
    backups.set(filePath, await readTextFile(filePath));
  }

  const fixtures = await createFixtures();
  await writeJson(dataFiles.users, fixtures.users);
  await writeJson(dataFiles.animals, fixtures.animals);
  await writeJson(dataFiles.adoptions, fixtures.adoptions);
  await writeJson(dataFiles.favorites, fixtures.favorites);

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
    const deactivateResponse = await adminSession.patch('/api/users/seed-employee-001/status', {
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

    const reactivateResponse = await adminSession.patch('/api/users/seed-employee-001/status', {
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

  for (const [filePath, content] of backups.entries()) {
    await fs.writeFile(filePath, content, 'utf8');
  }
}






