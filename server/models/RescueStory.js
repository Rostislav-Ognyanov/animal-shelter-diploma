import mongoose from 'mongoose';

export const RESCUE_STORY_OUTCOME_STATUS_VALUES = [
  'adopted',
  'recovered',
  'released',
];

const rescueStorySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    animalName: { type: String, required: true, trim: true },
    animalType: { type: String, required: true, trim: true },
    submittedBy: { type: String, required: true, trim: true },
    outcomeStatus: {
      type: String,
      enum: RESCUE_STORY_OUTCOME_STATUS_VALUES,
      required: true,
      default: 'recovered',
      index: true,
    },
    summary: { type: String, trim: true, default: '' },
    content: { type: String, required: true, trim: true },
    imageUrl: { type: String, trim: true, default: '' },
    imageAlt: { type: String, trim: true, default: '' },
    isPublished: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    featuredOrder: { type: Number, default: 0 },
    publishedAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export default mongoose.models.RescueStory || mongoose.model('RescueStory', rescueStorySchema);
