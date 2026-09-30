import mongoose from 'mongoose';

import {
  DONATION_AMOUNT_LIMITS,
  DONATION_STATUS_VALUES,
  DONATION_TEXT_LIMITS,
} from '../../shared/domain/donationConstants.js';
import { isValidPhone } from '../../shared/domain/contactValidation.js';

const donationStatusHistorySchema = new mongoose.Schema(
  {
    fromStatus: {
      type: String,
      enum: ['', ...DONATION_STATUS_VALUES],
      default: '',
    },
    toStatus: {
      type: String,
      enum: DONATION_STATUS_VALUES,
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

const donationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: DONATION_TEXT_LIMITS.name,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: DONATION_TEXT_LIMITS.email,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      maxlength: DONATION_TEXT_LIMITS.phone,
      validate: {
        validator: (value) => isValidPhone(value, { allowEmpty: true }),
        message: 'Въведи валиден телефонен номер.',
      },
    },
    amountCents: {
      type: Number,
      required: true,
      min: DONATION_AMOUNT_LIMITS.minCents,
      max: DONATION_AMOUNT_LIMITS.maxCents,
      validate: {
        validator: Number.isInteger,
        message: 'Сумата на заявката за дарение трябва да бъде записана като цели центове.',
      },
    },
    message: {
      type: String,
      trim: true,
      default: '',
      maxlength: DONATION_TEXT_LIMITS.message,
    },
    status: {
      type: String,
      enum: DONATION_STATUS_VALUES,
      default: 'pledged',
      index: true,
    },
    receivedAt: {
      type: Date,
      default: null,
      index: true,
    },
    statusHistory: {
      type: [donationStatusHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

donationSchema.index({ createdAt: -1, _id: -1 });
donationSchema.index({ status: 1, createdAt: -1, _id: -1 });

export default mongoose.models.Donation || mongoose.model('Donation', donationSchema);
