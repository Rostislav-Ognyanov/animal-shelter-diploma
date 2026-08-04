import mongoose from 'mongoose';

import { ANIMAL_SPECIES_VALUES } from '../modules/animals/animal.constants.js';

const speciesContentSectionSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: '' },
    paragraphs: { type: [String], default: [] },
    items: { type: [String], default: [] },
    imageUrl: { type: String, trim: true, default: '' },
    imageAlt: { type: String, trim: true, default: '' },
    imagePosition: {
      type: String,
      enum: ['left', 'right'],
      default: 'right',
    },
    order: { type: Number, default: 0 },
    isVisible: { type: Boolean, default: true },
    centered: { type: Boolean, default: false },
  },
  { _id: false }
);

const speciesContentSnapshotSchema = new mongoose.Schema(
  {
    displayName: { type: String, trim: true, default: '' },
    title: { type: String, trim: true, default: '' },
    subtitle: { type: String, trim: true, default: '' },
    cardImageUrl: { type: String, trim: true, default: '' },
    cardImageAlt: { type: String, trim: true, default: '' },
    heroImageUrl: { type: String, trim: true, default: '' },
    introduction: { type: String, trim: true, default: '' },
    issues: { type: [String], default: [] },
    sections: { type: [speciesContentSectionSchema], default: [] },
  },
  { _id: false }
);

const speciesContentSchema = new mongoose.Schema(
  {
    species: {
      type: String,
      enum: ANIMAL_SPECIES_VALUES,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    displayName: { type: String, trim: true, default: '' },
    title: { type: String, trim: true, default: '' },
    subtitle: { type: String, trim: true, default: '' },
    cardImageUrl: { type: String, trim: true, default: '' },
    cardImageAlt: { type: String, trim: true, default: '' },
    heroImageUrl: { type: String, trim: true, default: '' },
    introduction: { type: String, trim: true, default: '' },
    issues: { type: [String], default: [] },
    sections: { type: [speciesContentSectionSchema], default: [] },
    isPublished: { type: Boolean, default: false, index: true },
    publishedSnapshot: { type: speciesContentSnapshotSchema, default: null },
    publishedAt: { type: Date, default: null },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export default mongoose.models.SpeciesContent ||
  mongoose.model('SpeciesContent', speciesContentSchema);
