import mongoose from 'mongoose';

import { PAGE_CONTENT_KEYS } from '../../shared/domain/pageContentConstants.js';

const pageContentSchema = new mongoose.Schema(
  {
    pageKey: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      enum: PAGE_CONTENT_KEYS,
    },
    content: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.PageContent || mongoose.model('PageContent', pageContentSchema);
