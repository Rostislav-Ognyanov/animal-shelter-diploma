import mongoose from 'mongoose';

import {
  ANIMAL_GENDER_VALUES,
  ANIMAL_SIZE_VALUES,
  ANIMAL_SPECIES_VALUES,
  ANIMAL_STATUS_VALUES,
} from '../modules/animals/animal.constants.js';

const animalSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    displayName: {
      type: String,
      trim: true,
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
    },
    healthStatus: {
      type: String,
      required: true,
      trim: true,
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
    },
    imageUrls: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Animal || mongoose.model('Animal', animalSchema);
