import 'dotenv/config';

import mongoose from 'mongoose';

import { connectToDatabase } from '../config/db.js';
import AdoptionRequest from '../models/AdoptionRequest.js';
import Animal from '../models/Animal.js';
import Favorite from '../models/Favorite.js';
import User from '../models/User.js';
import { hashPassword } from '../modules/auth/auth.security.js';
import { DEMO_ANIMALS } from '../seeds/demoAnimals.js';

// Fixed identities and timestamps make reruns deterministic while covering representative roles and workflows.
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

function buildDemoAdoptionDetails(blueprint) {
  const usesHouse = blueprint.animalSlug.includes('dog');

  return {
    housingType: usesHouse ? 'house' : 'apartment',
    housingTypeOther: '',
    hasYard: usesHouse,
    yardSecurity: usesHouse ? 'secured' : null,
    animalLivingPlace: usesHouse ? 'mostly-indoors' : 'indoors',
    animalLivingPlaceOther: '',
    householdMembersCount: usesHouse ? 4 : 2,
    hasAnimalAllergies: 'no',
    hasOtherPets: usesHouse,
    otherPets: usesHouse
      ? [
          {
            species: 'dog',
            otherSpecies: '',
            sex: 'female',
            neuteringStatus: 'yes',
            vaccinationStatus: 'yes',
            approximateAge: '5 години',
          },
        ]
      : [],
    hasPreviousPetExperience: true,
    previousPetExperienceDetails: usesHouse
      ? 'Семейството има предишен опит с кучета и ежедневни разходки.'
      : 'Кандидатът има предишен опит с домашни котки.',
    acceptsUnexpectedMedicalCosts: blueprint.status !== 'cancelled',
    animalTransport: usesHouse ? 'own' : 'can-arrange',
  };
}

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
      ...buildDemoAdoptionDetails(blueprint),
      internalNotes: blueprint.internalNotes,
      createdAt: blueprint.createdAt,
      updatedAt: blueprint.updatedAt,
    };
  });
}

function buildDemoAdoptionStatusHistory(adoptionRequest) {
  const statusHistory = [
    {
      fromStatus: '',
      toStatus: 'pending',
      changedBy: null,
      changedByName: 'Demo seed',
      changedAt: adoptionRequest.createdAt,
    },
  ];

  if (adoptionRequest.status !== 'pending') {
    statusHistory.push({
      fromStatus: 'pending',
      toStatus: adoptionRequest.status,
      changedBy: null,
      changedByName: 'Demo seed',
      changedAt: adoptionRequest.updatedAt,
    });
  }

  return statusHistory;
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
        returnDocument: 'after',
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
        strict: false,
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
        $set: {
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
          story: animal.story ?? '',
          historyAndCharacter: animal.historyAndCharacter ?? '',
          details: animal.details ?? '',
          careConditions: animal.careConditions ?? '',
          imageUrls: animal.imageUrls,
        },
      },
      {
        returnDocument: 'after',
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
  await connectToDatabase();

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

  await Favorite.deleteMany({
    userId: { $in: demoUserIds },
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
        housingType: adoptionRequest.housingType,
        housingTypeOther: adoptionRequest.housingTypeOther,
        hasYard: adoptionRequest.hasYard,
        yardSecurity: adoptionRequest.yardSecurity,
        animalLivingPlace: adoptionRequest.animalLivingPlace,
        animalLivingPlaceOther: adoptionRequest.animalLivingPlaceOther,
        householdMembersCount: adoptionRequest.householdMembersCount,
        hasAnimalAllergies: adoptionRequest.hasAnimalAllergies,
        hasOtherPets: adoptionRequest.hasOtherPets,
        otherPets: adoptionRequest.otherPets,
        hasPreviousPetExperience: adoptionRequest.hasPreviousPetExperience,
        previousPetExperienceDetails: adoptionRequest.previousPetExperienceDetails,
        acceptsUnexpectedMedicalCosts: adoptionRequest.acceptsUnexpectedMedicalCosts,
        animalTransport: adoptionRequest.animalTransport,
        internalNotes: adoptionRequest.internalNotes.map((note) => {
          const authorDocument = userDocumentsByDemoId.get(note.authorId);

          return {
            text: note.text,
            author: authorDocument?._id ?? null,
            authorName: note.authorName,
            createdAt: note.createdAt,
          };
        }),
        statusHistory: buildDemoAdoptionStatusHistory(adoptionRequest),
        createdAt: adoptionRequest.createdAt,
        updatedAt: adoptionRequest.updatedAt,
      };
    })
  );

  return {
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
  const demoUsers = await buildDemoUsers();
  const demoAnimals = DEMO_ANIMALS.map(normalizeSeedAnimal);
  const demoAdoptions = createAdoptionRequests(demoUsers, demoAnimals);
  const mongoResult = await seedMongoDemoData(demoUsers, demoAnimals, demoAdoptions);

  console.log(
    `MongoDB demo seed complete. Users: ${mongoResult.users}, animals: ${mongoResult.animals}, adoption requests: ${mongoResult.adoptions}.`
  );
  console.log('Demo favorites for seeded users were cleared so old slug-based records are not reused.');

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
