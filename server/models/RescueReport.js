import mongoose from 'mongoose';

import { EMAIL_PATTERN } from '../../shared/domain/userConstants.js';
import { isValidPhone } from '../../shared/domain/contactValidation.js';
import {
  RESCUE_REPORT_IMAGE_MAX_BYTES,
  RESCUE_REPORT_IMAGE_MAX_DATA_URL_LENGTH,
  RESCUE_REPORT_IMAGE_MIME_TYPES,
  RESCUE_REPORT_SPECIES_VALUES,
  RESCUE_REPORT_STATUS_VALUES,
  RESCUE_REPORT_TEXT_LIMITS,
  RESCUE_REPORT_URGENCY_VALUES,
} from '../../shared/domain/rescueReportConstants.js';
import { parseBase64DataUrl } from '../utils/dataUrl.js';

function isValidRescueReportImage(value) {
  if (!value) {
    return true;
  }

  const parsedImage = parseBase64DataUrl(value);

  return Boolean(
    parsedImage &&
      RESCUE_REPORT_IMAGE_MIME_TYPES.includes(parsedImage.mimeType) &&
      parsedImage.byteLength <= RESCUE_REPORT_IMAGE_MAX_BYTES
  );
}

const rescueReportInternalNoteSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: RESCUE_REPORT_TEXT_LIMITS.internalNote,
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
      maxlength: RESCUE_REPORT_TEXT_LIMITS.authorName,
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

const rescueReportStatusHistorySchema = new mongoose.Schema(
  {
    fromStatus: {
      type: String,
      enum: ['', ...RESCUE_REPORT_STATUS_VALUES],
      default: '',
    },
    toStatus: {
      type: String,
      enum: RESCUE_REPORT_STATUS_VALUES,
      required: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    changedByName: {
      type: String,
      trim: true,
      default: '',
      maxlength: RESCUE_REPORT_TEXT_LIMITS.authorName,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

const rescueReportSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: RESCUE_REPORT_TEXT_LIMITS.name,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: RESCUE_REPORT_TEXT_LIMITS.phone,
      validate: {
        validator: isValidPhone,
        message: 'Въведи валиден телефонен номер.',
      },
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: RESCUE_REPORT_TEXT_LIMITS.email,
      match: EMAIL_PATTERN,
    },
    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: RESCUE_REPORT_TEXT_LIMITS.location,
    },
    species: {
      type: String,
      required: true,
      enum: RESCUE_REPORT_SPECIES_VALUES,
      trim: true,
    },
    urgency: {
      type: String,
      required: true,
      enum: RESCUE_REPORT_URGENCY_VALUES,
      trim: true,
      default: 'medium',
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: RESCUE_REPORT_TEXT_LIMITS.description,
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
      maxlength: RESCUE_REPORT_IMAGE_MAX_DATA_URL_LENGTH,
      validate: {
        validator: isValidRescueReportImage,
        message: 'Снимката трябва да бъде JPEG, PNG или WebP файл до 4 MB.',
      },
    },
    status: {
      type: String,
      required: true,
      enum: RESCUE_REPORT_STATUS_VALUES,
      default: 'pending',
    },
    internalNotes: {
      type: [rescueReportInternalNoteSchema],
      default: [],
    },
    statusHistory: {
      type: [rescueReportStatusHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

rescueReportSchema.index({ createdAt: -1, _id: -1 });
rescueReportSchema.index({ status: 1, createdAt: -1, _id: -1 });
rescueReportSchema.index({ urgency: 1, createdAt: -1, _id: -1 });
rescueReportSchema.index({ species: 1, createdAt: -1, _id: -1 });

export default mongoose.models.RescueReport || mongoose.model('RescueReport', rescueReportSchema);
