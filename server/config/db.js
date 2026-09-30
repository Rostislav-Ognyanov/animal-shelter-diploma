import mongoose from 'mongoose';

export const DEFAULT_MONGO_URI = 'mongodb://127.0.0.1:27017/animal_shelter?replicaSet=rs0';

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
    throw new Error('DB_URL is empty. MongoDB connection is required.');
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log('MongoDB connection established.');
    return true;
  } catch (error) {
    throw new Error(`MongoDB connection failed. ${error.message}`);
  }
}

export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}
