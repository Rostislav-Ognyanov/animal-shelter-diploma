import mongoose from 'mongoose';

export const LEGAL_CONTENT_KEY_VALUES = ['privacy', 'terms'];
export const LEGAL_CONTENT_STATUS_VALUES = ['draft', 'published'];

const legalSectionSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: '' },
    paragraphs: { type: [String], default: [] },
    items: { type: [String], default: [] },
    closing: { type: [String], default: [] },
    order: { type: Number, default: 0 },
    isVisible: { type: Boolean, default: true },
  },
  { _id: false }
);

const legalSnapshotSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: '' },
    lastUpdatedLabel: { type: String, trim: true, default: '' },
    intro: { type: [String], default: [] },
    sections: { type: [legalSectionSchema], default: [] },
  },
  { _id: false }
);

const legalHistorySchema = new mongoose.Schema(
  {
    version: { type: Number, required: true },
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
      index: true,
    },
    title: { type: String, trim: true, default: '' },
    lastUpdatedLabel: { type: String, trim: true, default: '' },
    intro: { type: [String], default: [] },
    sections: { type: [legalSectionSchema], default: [] },
    status: {
      type: String,
      enum: LEGAL_CONTENT_STATUS_VALUES,
      default: 'draft',
    },
    version: { type: Number, default: 0 },
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
