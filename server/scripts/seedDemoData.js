import 'dotenv/config';

import mongoose from 'mongoose';

import { connectToDatabase, isDatabaseConnected } from '../config/db.js';
import AdoptionRequest from '../models/AdoptionRequest.js';
import Animal from '../models/Animal.js';
import User from '../models/User.js';
import { hashPassword } from '../modules/auth/auth.security.js';
import { loadJsonFile } from '../utils/loadJsonFile.js';
import { saveJsonFile } from '../utils/saveJsonFile.js';

const USERS_DATA_PATH = 'data/users.json';
const ANIMALS_DATA_PATH = 'data/animals.json';
const ADOPTIONS_DATA_PATH = 'data/adoption-requests.json';
const JSON_ONLY = process.argv.includes('--json-only');
const DEMO_NOW = '2026-04-23T09:00:00.000Z';
const INACTIVE_ANIMAL_STATUSES = new Set(['inactive', 'archived']);

const DEMO_USERS = [
  {
    id: 'seed-admin-001',
    firstName: 'Системен',
    lastName: 'Администратор',
    username: 'admin',
    email: 'admin@animalshelter.local',
    password: 'Admin1234',
    role: 'admin',
    isActive: true,
    createdAt: '2026-04-01T09:00:00.000Z',
  },
  {
    id: 'seed-employee-001',
    firstName: 'Мария',
    lastName: 'Иванова',
    username: 'employee',
    email: 'employee@animalshelter.local',
    password: 'Employee1234',
    role: 'employee',
    isActive: true,
    createdAt: '2026-04-01T09:05:00.000Z',
  },
  {
    id: 'seed-client-001',
    firstName: 'Анна',
    lastName: 'Петрова',
    username: 'client',
    email: 'client@animalshelter.local',
    password: 'Client1234',
    role: 'client',
    isActive: true,
    createdAt: '2026-04-01T09:10:00.000Z',
  },
  {
    id: 'seed-client-002',
    firstName: 'Георги',
    lastName: 'Димитров',
    username: 'client2',
    email: 'client2@animalshelter.local',
    password: 'Client2345',
    role: 'client',
    isActive: true,
    createdAt: '2026-04-01T09:15:00.000Z',
  },
  {
    id: 'seed-employee-inactive-001',
    firstName: 'Петър',
    lastName: 'Стоянов',
    username: 'employee.inactive',
    email: 'employee.inactive@animalshelter.local',
    password: 'Inactive1234',
    role: 'employee',
    isActive: false,
    createdAt: '2026-04-01T09:20:00.000Z',
  },
];

const DEMO_ANIMAL_STATUS_BY_SLUG = {
  'hotdog-dachshund-dog': 'available',
  'lily-beagle-dog': 'reserved',
  'kiara-american-pitbull-dog': 'reserved',
  'max-golden-retriever-dog': 'adopted',
  'mona-munchkin-cat': 'available',
};

const DEMO_ADOPTION_BLUEPRINTS = [
  {
    id: 'demo-adoption-pending-001',
    userId: 'seed-client-001',
    animalSlug: 'hotdog-dachshund-dog',
    status: 'pending',
    motivation:
      'Имам стабилен дом и опит с малки кучета. Хотдог ще има ежедневни разходки и спокойна среда.',
    contactPhone: '+359888111222',
    internalNotes: [],
    createdAt: '2026-04-18T10:30:00.000Z',
    updatedAt: '2026-04-18T10:30:00.000Z',
  },
  {
    id: 'demo-adoption-under-review-001',
    userId: 'seed-client-002',
    animalSlug: 'lily-beagle-dog',
    status: 'under-review',
    motivation:
      'Лили изглежда подходяща за нашето семейство. Имаме двор и време за обучение и грижа.',
    contactPhone: '+359888222333',
    internalNotes: [
      {
        text: 'Първоначалният преглед е направен. Очаква се потвърждение за посещение.',
        authorId: 'seed-employee-001',
        authorName: 'Мария Иванова',
        createdAt: '2026-04-19T11:15:00.000Z',
      },
    ],
    createdAt: '2026-04-19T09:20:00.000Z',
    updatedAt: '2026-04-19T11:15:00.000Z',
  },
  {
    id: 'demo-adoption-approved-001',
    userId: 'seed-client-001',
    animalSlug: 'kiara-american-pitbull-dog',
    status: 'approved',
    motivation:
      'Искам да осиновя Киара и мога да осигуря активен режим, ветеринарна грижа и постоянен контакт с екипа.',
    contactPhone: '+359888333444',
    internalNotes: [
      {
        text: 'Заявката е одобрена след разговор с кандидата. Остава финална среща.',
        authorId: 'seed-employee-001',
        authorName: 'Мария Иванова',
        createdAt: '2026-04-20T14:00:00.000Z',
      },
    ],
    createdAt: '2026-04-20T08:45:00.000Z',
    updatedAt: '2026-04-20T14:00:00.000Z',
  },
  {
    id: 'demo-adoption-completed-001',
    userId: 'seed-client-002',
    animalSlug: 'max-golden-retriever-dog',
    status: 'completed',
    motivation:
      'Макс вече е преминал през среща с нашето семейство и сме готови да финализираме осиновяването.',
    contactPhone: '+359888444555',
    internalNotes: [
      {
        text: 'Осиновяването е финализирано. Документите са предадени.',
        authorId: 'seed-admin-001',
        authorName: 'Системен Администратор',
        createdAt: '2026-04-21T16:30:00.000Z',
      },
    ],
    createdAt: '2026-04-21T09:10:00.000Z',
    updatedAt: '2026-04-21T16:30:00.000Z',
  },
  {
    id: 'demo-adoption-cancelled-001',
    userId: 'seed-client-001',
    animalSlug: 'mona-munchkin-cat',
    status: 'cancelled',
    motivation:
      'Имах интерес към Мона, но временно не мога да поема ангажимента и отменям заявката.',
    contactPhone: '+359888555666',
    internalNotes: [],
    createdAt: '2026-04-22T12:00:00.000Z',
    updatedAt: '2026-04-22T13:00:00.000Z',
  },
];

function normalizeLookup(value) {
  return String(value ?? '').trim().toLowerCase();
}

function getPrimaryImageUrl(animal) {
  if (Array.isArray(animal.imageUrls) && animal.imageUrls.length > 0) {
    return animal.imageUrls[0];
  }

  return animal.imageUrl ?? '';
}

function serializeUserSnapshot(user) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    role: user.role,
  };
}

function serializeAnimalSnapshot(animal) {
  return {
    id: animal.slug,
    slug: animal.slug,
    name: animal.name,
    displayName: animal.displayName ?? animal.name,
    species: animal.species,
    breed: animal.breed,
    status: animal.status,
    imageUrl: getPrimaryImageUrl(animal),
  };
}

function normalizeSeedAnimal(entry) {
  const status = DEMO_ANIMAL_STATUS_BY_SLUG[entry.slug] ?? entry.status;
  const imageUrls = Array.isArray(entry.imageUrls)
    ? entry.imageUrls.filter(Boolean)
    : entry.imageUrl
      ? [entry.imageUrl]
      : [];

  return {
    ...entry,
    slug: normalizeLookup(entry.slug),
    species: normalizeLookup(entry.species),
    gender: normalizeLookup(entry.gender),
    size: normalizeLookup(entry.size),
    status,
    isActive: !INACTIVE_ANIMAL_STATUSES.has(status),
    imageUrls,
    updatedAt: DEMO_ANIMAL_STATUS_BY_SLUG[entry.slug] ? DEMO_NOW : entry.updatedAt,
  };
}

async function buildDemoUsers() {
  const users = [];

  for (const user of DEMO_USERS) {
    users.push({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: normalizeLookup(user.username),
      email: normalizeLookup(user.email),
      passwordHash: await hashPassword(user.password),
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: null,
      createdAt: user.createdAt,
      updatedAt: DEMO_NOW,
    });
  }

  return users;
}

function mergeDemoUsers(existingUsers, demoUsers) {
  const demoIds = new Set(demoUsers.map((user) => user.id));
  const demoUsernames = new Set(demoUsers.map((user) => normalizeLookup(user.username)));
  const demoEmails = new Set(demoUsers.map((user) => normalizeLookup(user.email)));
  const preservedUsers = existingUsers.filter((user) => {
    return (
      !demoIds.has(user.id) &&
      !demoUsernames.has(normalizeLookup(user.username)) &&
      !demoEmails.has(normalizeLookup(user.email))
    );
  });

  return [...demoUsers, ...preservedUsers];
}

function createAdoptionRequests(demoUsers, demoAnimals) {
  const usersById = new Map(demoUsers.map((user) => [user.id, user]));
  const animalsBySlug = new Map(demoAnimals.map((animal) => [animal.slug, animal]));

  return DEMO_ADOPTION_BLUEPRINTS.map((blueprint) => {
    const user = usersById.get(blueprint.userId);
    const animal = animalsBySlug.get(blueprint.animalSlug);

    if (!user || !animal) {
      throw new Error(`Missing demo relation for adoption request ${blueprint.id}.`);
    }

    return {
      id: blueprint.id,
      userId: user.id,
      user: serializeUserSnapshot(user),
      animalId: animal.slug,
      animal: serializeAnimalSnapshot(animal),
      status: blueprint.status,
      motivation: blueprint.motivation,
      contactPhone: blueprint.contactPhone,
      internalNotes: blueprint.internalNotes,
      createdAt: blueprint.createdAt,
      updatedAt: blueprint.updatedAt,
    };
  });
}

async function seedJsonDemoData() {
  const existingUsers = await loadJsonFile(USERS_DATA_PATH);
  const existingAnimals = await loadJsonFile(ANIMALS_DATA_PATH);
  const demoUsers = await buildDemoUsers();
  const demoAnimals = existingAnimals.map(normalizeSeedAnimal);
  const demoAdoptions = createAdoptionRequests(demoUsers, demoAnimals);

  await saveJsonFile(USERS_DATA_PATH, mergeDemoUsers(existingUsers, demoUsers));
  await saveJsonFile(ANIMALS_DATA_PATH, demoAnimals);
  await saveJsonFile(ADOPTIONS_DATA_PATH, demoAdoptions);

  return {
    demoUsers,
    demoAnimals,
    demoAdoptions,
  };
}

async function upsertMongoDemoUsers(demoUsers) {
  const userDocumentsByDemoId = new Map();

  for (const user of demoUsers) {
    const updatedUser = await User.findOneAndUpdate(
      {
        $or: [{ username: user.username }, { email: user.email }],
      },
      {
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        passwordHash: user.passwordHash,
        role: user.role,
        isActive: user.isActive,
        lastLoginAt: null,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    userDocumentsByDemoId.set(user.id, updatedUser);
  }

  return userDocumentsByDemoId;
}

async function upsertMongoDemoAnimals(demoAnimals) {
  const animalDocumentsBySlug = new Map();

  for (const animal of demoAnimals) {
    const updatedAnimal = await Animal.findOneAndUpdate(
      { slug: animal.slug },
      {
        slug: animal.slug,
        name: animal.name,
        displayName: animal.displayName ?? '',
        species: animal.species,
        breed: animal.breed,
        age: Number(animal.age ?? 0),
        gender: animal.gender,
        size: animal.size,
        status: animal.status,
        isActive: animal.isActive,
        intakeDate: animal.intakeDate,
        healthStatus: animal.healthStatus,
        vaccinated: animal.vaccinated ?? false,
        neutered: animal.neutered ?? false,
        description: animal.description,
        imageUrls: animal.imageUrls,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    animalDocumentsBySlug.set(animal.slug, updatedAnimal);
  }

  return animalDocumentsBySlug;
}

async function seedMongoDemoData(demoUsers, demoAnimals, demoAdoptions) {
  if (JSON_ONLY) {
    return {
      skipped: true,
      reason: 'json-only',
    };
  }

  await connectToDatabase();

  if (!isDatabaseConnected()) {
    return {
      skipped: true,
      reason: 'no-database-connection',
    };
  }

  const userDocumentsByDemoId = await upsertMongoDemoUsers(demoUsers);
  const animalDocumentsBySlug = await upsertMongoDemoAnimals(demoAnimals);
  const demoUserIds = [...userDocumentsByDemoId.values()].map((user) => user._id);
  const demoAnimalIds = DEMO_ADOPTION_BLUEPRINTS.map((blueprint) => {
    return animalDocumentsBySlug.get(blueprint.animalSlug)?._id;
  }).filter(Boolean);

  await AdoptionRequest.deleteMany({
    user: { $in: demoUserIds },
    animal: { $in: demoAnimalIds },
  });

  await AdoptionRequest.insertMany(
    demoAdoptions.map((adoptionRequest) => {
      const userDocument = userDocumentsByDemoId.get(adoptionRequest.userId);
      const animalDocument = animalDocumentsBySlug.get(adoptionRequest.animal.slug);

      return {
        user: userDocument._id,
        animal: animalDocument._id,
        status: adoptionRequest.status,
        motivation: adoptionRequest.motivation,
        contactPhone: adoptionRequest.contactPhone,
        internalNotes: adoptionRequest.internalNotes.map((note) => {
          const authorDocument = userDocumentsByDemoId.get(note.authorId);

          return {
            text: note.text,
            author: authorDocument?._id ?? null,
            authorName: note.authorName,
            createdAt: note.createdAt,
          };
        }),
        createdAt: adoptionRequest.createdAt,
        updatedAt: adoptionRequest.updatedAt,
      };
    })
  );

  return {
    skipped: false,
    users: userDocumentsByDemoId.size,
    animals: animalDocumentsBySlug.size,
    adoptions: demoAdoptions.length,
  };
}

function printCredentials() {
  console.log('');
  console.log('Demo credentials:');

  for (const user of DEMO_USERS) {
    const status = user.isActive ? 'active' : 'inactive';
    console.log(`- ${user.role} (${status}): ${user.username} / ${user.password}`);
  }
}

async function seedDemoData() {
  const { demoUsers, demoAnimals, demoAdoptions } = await seedJsonDemoData();
  const mongoResult = await seedMongoDemoData(demoUsers, demoAnimals, demoAdoptions);

  console.log(
    `JSON demo seed complete. Demo users: ${demoUsers.length}, animals: ${demoAnimals.length}, adoption requests: ${demoAdoptions.length}.`
  );

  if (mongoResult.skipped) {
    console.log(`MongoDB demo seed skipped (${mongoResult.reason}). JSON fallback data is ready.`);
  } else {
    console.log(
      `MongoDB demo seed complete. Users: ${mongoResult.users}, animals: ${mongoResult.animals}, adoption requests: ${mongoResult.adoptions}.`
    );
  }

  printCredentials();
}

seedDemoData()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
