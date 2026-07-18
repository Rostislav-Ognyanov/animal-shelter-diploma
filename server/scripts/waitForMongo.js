import 'dotenv/config';

import mongoose from 'mongoose';

import { getConfiguredMongoUri } from '../config/db.js';

const DEFAULT_ATTEMPTS = 30;
const DEFAULT_DELAY_MS = 1000;

function parsePositiveInteger(value, fallback) {
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function wait(delayMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

async function waitForMongo() {
  const mongoUri = getConfiguredMongoUri();
  const maxAttempts = parsePositiveInteger(process.env.MONGO_WAIT_ATTEMPTS, DEFAULT_ATTEMPTS);
  const delayMs = parsePositiveInteger(process.env.MONGO_WAIT_DELAY_MS, DEFAULT_DELAY_MS);

  if (!mongoUri) {
    throw new Error('DB_URL is empty. Configure DB_URL before waiting for MongoDB.');
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 1000,
      });
      await mongoose.disconnect();
      console.log(`MongoDB is ready at ${mongoUri}.`);
      return;
    } catch (error) {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }

      if (attempt === maxAttempts) {
        throw new Error(`MongoDB was not ready after ${maxAttempts} attempts. ${error.message}`);
      }

      console.log(`Waiting for MongoDB (${attempt}/${maxAttempts})...`);
      await wait(delayMs);
    }
  }
}

waitForMongo().catch(async (error) => {
  console.error(error.message || error);

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  process.exit(1);
});
