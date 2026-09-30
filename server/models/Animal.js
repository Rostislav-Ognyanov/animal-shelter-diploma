import mongoose from 'mongoose';

import {
  ANIMAL_GENDER_VALUES,
  ANIMAL_IMAGE_MAX_COUNT,
  ANIMAL_SIZE_VALUES,
  ANIMAL_SPECIES_VALUES,
  ANIMAL_STATUS_VALUES,
  ANIMAL_TEXT_LIMITS,
} from '../modules/animals/animal.constants.js';

function isPastOrTodayDate(value) {
  if (!value) {
    return false;
  }

  const dateValue = new Date(value);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  return !Number.isNaN(dateValue.getTime()) && dateValue <= todayEnd;
}

const animalSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: ANIMAL_TEXT_LIMITS.slug,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: ANIMAL_TEXT_LIMITS.name,
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: ANIMAL_TEXT_LIMITS.displayName,
    },
    species: {
      type: String,
      enum: ANIMAL_SPECIES_VALUES,
      required: true,
      trim: true,
      lowercase: true,
    },
    breed: {
      type: String,
      required: true,
      trim: true,
      maxlength: ANIMAL_TEXT_LIMITS.breed,
    },
    age: {
      type: Number,
      required: true,
      min: 0,
    },
    gender: {
      type: String,
      enum: ANIMAL_GENDER_VALUES,
      required: true,
      default: 'unknown',
    },
    size: {
      type: String,
      enum: ANIMAL_SIZE_VALUES,
      required: true,
    },
    status: {
      type: String,
      enum: ANIMAL_STATUS_VALUES,
      required: true,
      default: 'available',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    intakeDate: {
      type: Date,
      required: true,
      validate: {
        validator: isPastOrTodayDate,
        message: 'Датата на приемане не може да бъде бъдеща дата.',
      },
    },
    healthStatus: {
      type: String,
      required: true,
      trim: true,
      maxlength: ANIMAL_TEXT_LIMITS.healthStatus,
    },
    vaccinated: {
      type: Boolean,
      default: false,
    },
    neutered: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: ANIMAL_TEXT_LIMITS.description,
    },
    story: {
      type: String,
      trim: true,
      maxlength: ANIMAL_TEXT_LIMITS.story,
    },
    historyAndCharacter: {
      type: String,
      trim: true,
      maxlength: ANIMAL_TEXT_LIMITS.historyAndCharacter,
    },
    details: {
      type: String,
      trim: true,
      maxlength: ANIMAL_TEXT_LIMITS.details,
    },
    careConditions: {
      type: String,
      trim: true,
      maxlength: ANIMAL_TEXT_LIMITS.careConditions,
    },
    imageUrls: {
      type: [String],
      default: [],
      validate: {
        validator(value) {
          return !Array.isArray(value) || value.length <= ANIMAL_IMAGE_MAX_COUNT;
        },
        message: `Могат да бъдат добавени най-много ${ANIMAL_IMAGE_MAX_COUNT} снимки.`,
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Animal || mongoose.model('Animal', animalSchema);
