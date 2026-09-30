import mongoose from 'mongoose';

import { ANIMAL_SPECIES_VALUES } from '../../shared/domain/animalConstants.js';
import {
  RESCUE_STORY_OUTCOME_STATUS_VALUES,
  RESCUE_STORY_SLUG_PATTERN,
  RESCUE_STORY_TEXT_LIMITS,
} from '../../shared/domain/rescueStoryConstants.js';

const rescueStorySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: RESCUE_STORY_TEXT_LIMITS.title,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: RESCUE_STORY_TEXT_LIMITS.slug,
      match: RESCUE_STORY_SLUG_PATTERN,
    },
    animalName: {
      type: String,
      required: true,
      trim: true,
      maxlength: RESCUE_STORY_TEXT_LIMITS.animalName,
    },
    animalType: {
      type: String,
      enum: ANIMAL_SPECIES_VALUES,
      required: true,
      trim: true,
    },
    submittedBy: {
      type: String,
      required: true,
      trim: true,
      maxlength: RESCUE_STORY_TEXT_LIMITS.submittedBy,
    },
    outcomeStatus: {
      type: String,
      enum: RESCUE_STORY_OUTCOME_STATUS_VALUES,
      required: true,
      default: 'recovered',
      index: true,
    },
    summary: {
      type: String,
      trim: true,
      maxlength: RESCUE_STORY_TEXT_LIMITS.summary,
      default: '',
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: RESCUE_STORY_TEXT_LIMITS.content,
    },
    imageUrl: {
      type: String,
      trim: true,
      maxlength: RESCUE_STORY_TEXT_LIMITS.imageUrl,
      default: '',
    },
    imageAlt: {
      type: String,
      trim: true,
      maxlength: RESCUE_STORY_TEXT_LIMITS.imageAlt,
      default: '',
    },
    isPublished: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

rescueStorySchema.index({ isPublished: 1, publishedAt: -1, _id: 1 });

export default mongoose.models.RescueStory || mongoose.model('RescueStory', rescueStorySchema);
