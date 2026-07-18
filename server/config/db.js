import mongoose from 'mongoose';

export const DEFAULT_MONGO_URI = 'mongodb://127.0.0.1:27017/animal_shelter';

function normalizeBooleanEnv(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const normalizedValue = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalizedValue);
}

export function isAnimalsMockFallbackEnabled() {
  return normalizeBooleanEnv(process.env.ANIMALS_ALLOW_MOCK_FALLBACK, false);
}

export function getAnimalsPersistenceMode() {
  if (isDatabaseConnected()) {
    return 'mongodb';
  }

  if (isAnimalsMockFallbackEnabled()) {
    return 'mock-fallback';
  }

  return 'database-required';
}

export function describeAnimalsPersistenceMode() {
  const persistenceMode = getAnimalsPersistenceMode();

  if (persistenceMode === 'mongodb') {
    return 'MongoDB primary';
  }

  if (persistenceMode === 'mock-fallback') {
    return 'Mock fallback enabled';
  }

  return 'MongoDB required (mock fallback disabled)';
}

export function getConfiguredMongoUri() {
  if (process.env.DB_URL !== undefined) {
    return process.env.DB_URL.trim();
  }

  if (process.env.MONGO_URI !== undefined) {
    return process.env.MONGO_URI.trim();
  }

  if (process.env.MONGODB_URI !== undefined) {
    return process.env.MONGODB_URI.trim();
  }

  return DEFAULT_MONGO_URI;
}

export async function connectToDatabase() {
  const mongoUri = getConfiguredMongoUri();

  if (!mongoUri) {
    if (isAnimalsMockFallbackEnabled()) {
      console.warn(
        'DB_URL is not set. MongoDB is unavailable, but Animals mock fallback remains enabled for development or emergency use.'
      );
    } else {
      console.warn(
        'DB_URL is not set. Animals module is configured for MongoDB-first mode and will return 503 until the database is configured.'
      );
    }

    return false;
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log('MongoDB connection established.');
    return true;
  } catch (error) {
    if (isAnimalsMockFallbackEnabled()) {
      console.warn(
        `MongoDB connection failed. Animals mock fallback remains available for development or emergency use. ${error.message}`
      );
    } else {
      console.warn(
        `MongoDB connection failed. Animals module remains in MongoDB-first mode and will be unavailable until the database is restored. ${error.message}`
      );
    }

    return false;
  }
}

export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}
