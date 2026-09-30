import mongoose from 'mongoose';

import {
  LEGAL_CONTENT_KEY_VALUES,
  LEGAL_CONTENT_LIMITS,
  LEGAL_CONTENT_STATUS_VALUES,
} from '../../shared/domain/legalContentConstants.js';

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

const legalSectionSchema = new mongoose.Schema(
  {
    title: limitedText(LEGAL_CONTENT_LIMITS.sectionTitle),
    paragraphs: limitedTextList(
      LEGAL_CONTENT_LIMITS.paragraph,
      LEGAL_CONTENT_LIMITS.paragraphsPerSection,
      `Една секция може да има най-много ${LEGAL_CONTENT_LIMITS.paragraphsPerSection} параграфа.`
    ),
    items: limitedTextList(
      LEGAL_CONTENT_LIMITS.item,
      LEGAL_CONTENT_LIMITS.itemsPerSection,
      `Една секция може да има най-много ${LEGAL_CONTENT_LIMITS.itemsPerSection} елемента.`
    ),
    closing: limitedTextList(
      LEGAL_CONTENT_LIMITS.paragraph,
      LEGAL_CONTENT_LIMITS.closingParagraphsPerSection,
      `Една секция може да има най-много ${LEGAL_CONTENT_LIMITS.closingParagraphsPerSection} заключителни параграфа.`
    ),
    order: {
      type: Number,
      min: 0,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Редът на секцията трябва да бъде цяло число.',
      },
    },
    isVisible: { type: Boolean, default: true },
  },
  { _id: false }
);

function legalSectionListDefinition() {
  return {
    type: [legalSectionSchema],
    default: [],
    validate: {
      validator: (sections) =>
        Array.isArray(sections) && sections.length <= LEGAL_CONTENT_LIMITS.sections,
      message: `Юридическото съдържание може да има най-много ${LEGAL_CONTENT_LIMITS.sections} секции.`,
    },
  };
}

const legalSnapshotSchema = new mongoose.Schema(
  {
    title: limitedText(LEGAL_CONTENT_LIMITS.title),
    lastUpdatedLabel: limitedText(LEGAL_CONTENT_LIMITS.lastUpdatedLabel),
    intro: limitedTextList(
      LEGAL_CONTENT_LIMITS.introParagraph,
      LEGAL_CONTENT_LIMITS.introParagraphs,
      `Юридическото съдържание може да има най-много ${LEGAL_CONTENT_LIMITS.introParagraphs} въвеждащи параграфа.`
    ),
    sections: legalSectionListDefinition(),
  },
  { _id: false }
);

const legalHistorySchema = new mongoose.Schema(
  {
    version: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'Версията трябва да бъде цяло число.',
      },
    },
    snapshot: { type: legalSnapshotSchema, required: true },
    publishedAt: { type: Date, default: null },
    replacedAt: { type: Date, default: Date.now },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false }
);

const legalContentSchema = new mongoose.Schema(
  {
    legalKey: {
      type: String,
      required: true,
      trim: true,
      enum: LEGAL_CONTENT_KEY_VALUES,
      unique: true,
    },
    title: limitedText(LEGAL_CONTENT_LIMITS.title),
    lastUpdatedLabel: limitedText(LEGAL_CONTENT_LIMITS.lastUpdatedLabel),
    intro: limitedTextList(
      LEGAL_CONTENT_LIMITS.introParagraph,
      LEGAL_CONTENT_LIMITS.introParagraphs,
      `Юридическото съдържание може да има най-много ${LEGAL_CONTENT_LIMITS.introParagraphs} въвеждащи параграфа.`
    ),
    sections: legalSectionListDefinition(),
    status: {
      type: String,
      enum: LEGAL_CONTENT_STATUS_VALUES,
      default: 'draft',
    },
    version: {
      type: Number,
      min: 0,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Версията трябва да бъде цяло число.',
      },
    },
    publishedSnapshot: { type: legalSnapshotSchema, default: null },
    publishedAt: { type: Date, default: null },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    history: { type: [legalHistorySchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.LegalContent ||
  mongoose.model('LegalContent', legalContentSchema);
