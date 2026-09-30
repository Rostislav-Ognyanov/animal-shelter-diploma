import mongoose from 'mongoose';

import { ANIMAL_SPECIES_VALUES } from '../modules/animals/animal.constants.js';
import {
  SPECIES_CONTENT_IMAGE_POSITION_VALUES,
  SPECIES_CONTENT_LIMITS,
} from '../../shared/domain/speciesContentConstants.js';

function limitedText(maxlength) {
  return { type: String, trim: true, maxlength, default: '' };
}

function limitedTextList(maxlength, maximumItems, message) {
  return {
    type: [{ type: String, trim: true, maxlength }],
    default: [],
    validate: {
      validator: (items) => Array.isArray(items) && items.length <= maximumItems,
      message,
    },
  };
}

function sectionListDefinition() {
  return {
    type: [speciesContentSectionSchema],
    default: [],
    validate: {
      validator: (sections) =>
        Array.isArray(sections) && sections.length <= SPECIES_CONTENT_LIMITS.sections,
      message: `Съдържанието може да има най-много ${SPECIES_CONTENT_LIMITS.sections} секции.`,
    },
  };
}

const speciesContentSectionSchema = new mongoose.Schema(
  {
    title: limitedText(SPECIES_CONTENT_LIMITS.sectionTitle),
    paragraphs: limitedTextList(
      SPECIES_CONTENT_LIMITS.paragraph,
      SPECIES_CONTENT_LIMITS.paragraphsPerSection,
      `Една секция може да има най-много ${SPECIES_CONTENT_LIMITS.paragraphsPerSection} параграфа.`
    ),
    items: limitedTextList(
      SPECIES_CONTENT_LIMITS.item,
      SPECIES_CONTENT_LIMITS.itemsPerSection,
      `Една секция може да има най-много ${SPECIES_CONTENT_LIMITS.itemsPerSection} елемента.`
    ),
    imageUrl: limitedText(SPECIES_CONTENT_LIMITS.imageUrl),
    imageAlt: limitedText(SPECIES_CONTENT_LIMITS.imageAlt),
    imagePosition: {
      type: String,
      enum: SPECIES_CONTENT_IMAGE_POSITION_VALUES,
      default: 'right',
    },
    order: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Редът на секцията трябва да бъде цяло число.',
      },
    },
    isVisible: { type: Boolean, default: true },
    centered: { type: Boolean, default: false },
  },
  { _id: false }
);

const speciesContentSnapshotSchema = new mongoose.Schema(
  {
    displayName: limitedText(SPECIES_CONTENT_LIMITS.displayName),
    title: limitedText(SPECIES_CONTENT_LIMITS.title),
    subtitle: limitedText(SPECIES_CONTENT_LIMITS.subtitle),
    cardImageUrl: limitedText(SPECIES_CONTENT_LIMITS.imageUrl),
    cardImageAlt: limitedText(SPECIES_CONTENT_LIMITS.imageAlt),
    heroImageUrl: limitedText(SPECIES_CONTENT_LIMITS.imageUrl),
    introduction: limitedText(SPECIES_CONTENT_LIMITS.introduction),
    issues: limitedTextList(
      SPECIES_CONTENT_LIMITS.issue,
      SPECIES_CONTENT_LIMITS.issues,
      `Съдържанието може да има най-много ${SPECIES_CONTENT_LIMITS.issues} основни проблема или акцента.`
    ),
    sections: sectionListDefinition(),
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
      trim: true,
      lowercase: true,
    },
    displayName: limitedText(SPECIES_CONTENT_LIMITS.displayName),
    title: limitedText(SPECIES_CONTENT_LIMITS.title),
    subtitle: limitedText(SPECIES_CONTENT_LIMITS.subtitle),
    cardImageUrl: limitedText(SPECIES_CONTENT_LIMITS.imageUrl),
    cardImageAlt: limitedText(SPECIES_CONTENT_LIMITS.imageAlt),
    heroImageUrl: limitedText(SPECIES_CONTENT_LIMITS.imageUrl),
    introduction: limitedText(SPECIES_CONTENT_LIMITS.introduction),
    issues: limitedTextList(
      SPECIES_CONTENT_LIMITS.issue,
      SPECIES_CONTENT_LIMITS.issues,
      `Съдържанието може да има най-много ${SPECIES_CONTENT_LIMITS.issues} основни проблема или акцента.`
    ),
    sections: sectionListDefinition(),
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
