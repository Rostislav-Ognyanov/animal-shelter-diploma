import 'dotenv/config';

import mongoose from 'mongoose';

import { connectToDatabase, isDatabaseConnected } from '../config/db.js';
import Animal from '../models/Animal.js';
import { loadJsonFile } from '../utils/loadJsonFile.js';

const INACTIVE_STATUSES = new Set(['inactive', 'archived']);

function normalizeSeedAnimal(entry) {
  const imageUrls = Array.isArray(entry.imageUrls)
    ? entry.imageUrls.filter(Boolean)
    : entry.imageUrl
      ? [entry.imageUrl]
      : [];

  return {
    slug: String(entry.slug ?? '').trim().toLowerCase(),
    name: entry.name,
    displayName: entry.displayName ?? '',
    species: entry.species,
    breed: entry.breed,
    age: Number(entry.age ?? 0),
    gender: entry.gender,
    size: entry.size,
    status: entry.status,
    isActive:
      typeof entry.isActive === 'boolean'
        ? entry.isActive
        : !INACTIVE_STATUSES.has(String(entry.status ?? '').trim().toLowerCase()),
    intakeDate: entry.intakeDate,
    healthStatus: entry.healthStatus,
    vaccinated: entry.vaccinated ?? false,
    neutered: entry.neutered ?? false,
    description: entry.description,
    imageUrls,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

async function seedAnimals() {
  await connectToDatabase();

  if (!isDatabaseConnected()) {
    throw new Error('MongoDB connection is required to seed animals. Configure DB_URL first.');
  }

  const mockAnimals = await loadJsonFile('data/animals.json');
  let insertedCount = 0;
  let updatedCount = 0;

  for (const entry of mockAnimals) {
    const normalizedAnimal = normalizeSeedAnimal(entry);
    const existingAnimal = await Animal.findOne({ slug: normalizedAnimal.slug }).lean();

    await Animal.findOneAndUpdate(
      { slug: normalizedAnimal.slug },
      normalizedAnimal,
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
        timestamps: false,
      }
    );

    if (existingAnimal) {
      updatedCount += 1;
    } else {
      insertedCount += 1;
    }
  }

  console.log(`Animals seed complete. Inserted: ${insertedCount}, updated: ${updatedCount}.`);
  await mongoose.disconnect();
}

seedAnimals().catch(async (error) => {
  console.error(error.message || error);

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  process.exit(1);
});
