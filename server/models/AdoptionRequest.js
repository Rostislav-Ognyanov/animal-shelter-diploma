import mongoose from 'mongoose';

import { ADOPTION_REQUEST_STATUS_VALUES } from '../modules/shared/rolePolicies.js';

const internalNoteSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    authorName: {
      type: String,
      trim: true,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

const adoptionRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    animal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ADOPTION_REQUEST_STATUS_VALUES,
      required: true,
      default: 'pending',
      index: true,
    },
    motivation: {
      type: String,
      required: true,
      trim: true,
    },
    contactPhone: {
      type: String,
      required: true,
      trim: true,
    },
    internalNotes: {
      type: [internalNoteSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

adoptionRequestSchema.index({ user: 1, animal: 1, status: 1 });

export default mongoose.models.AdoptionRequest ||
  mongoose.model('AdoptionRequest', adoptionRequestSchema);
