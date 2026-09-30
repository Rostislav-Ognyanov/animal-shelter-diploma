import mongoose from 'mongoose';

import {
  ACTIVE_VOLUNTEER_STATUS_VALUES,
  MAX_VOLUNTEER_AGE,
  MIN_VOLUNTEER_AGE,
  VOLUNTEER_POSITION_VALUES,
  VOLUNTEER_STATUS_VALUES,
  VOLUNTEER_TEXT_LIMITS,
} from '../../shared/domain/volunteerConstants.js';
import { isValidPhone } from '../../shared/domain/contactValidation.js';
import { EMAIL_PATTERN } from '../../shared/domain/userConstants.js';

function isActiveVolunteerApplicationStatus(status) {
  return ACTIVE_VOLUNTEER_STATUS_VALUES.includes(status);
}

function isValidGuardianContact(value) {
  const normalizedValue = String(value ?? '').trim();
  return (
    !normalizedValue ||
    EMAIL_PATTERN.test(normalizedValue) ||
    isValidPhone(normalizedValue)
  );
}

function applyActiveApplicationEmail(application) {
  // Only active rows expose this key to the partial unique index, preserving history without active duplicates.
  application.activeApplicationEmail =
    isActiveVolunteerApplicationStatus(application.status) && application.email
      ? application.email
      : null;
}

const volunteerApplicationInternalNoteSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: VOLUNTEER_TEXT_LIMITS.internalNote,
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

const volunteerApplicationStatusHistorySchema = new mongoose.Schema(
  {
    fromStatus: {
      type: String,
      enum: ['', ...VOLUNTEER_STATUS_VALUES],
      default: '',
    },
    toStatus: {
      type: String,
      enum: VOLUNTEER_STATUS_VALUES,
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

const volunteerApplicationSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: VOLUNTEER_TEXT_LIMITS.firstName,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: VOLUNTEER_TEXT_LIMITS.lastName,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: VOLUNTEER_TEXT_LIMITS.email,
      match: EMAIL_PATTERN,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: VOLUNTEER_TEXT_LIMITS.phone,
      validate: {
        validator: isValidPhone,
        message: 'Въведи валиден телефонен номер.',
      },
    },
    age: {
      type: Number,
      required: true,
      min: MIN_VOLUNTEER_AGE,
      max: MAX_VOLUNTEER_AGE,
    },
    guardianConsentVerified: {
      type: Boolean,
      default: false,
    },
    guardianConsentVerifiedAt: {
      type: Date,
      default: null,
    },
    guardianConsentVerifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    guardianConsentVerifiedByName: {
      type: String,
      trim: true,
      default: '',
    },
    guardianName: {
      type: String,
      trim: true,
      default: '',
      maxlength: VOLUNTEER_TEXT_LIMITS.guardianName,
    },
    guardianContact: {
      type: String,
      trim: true,
      default: '',
      maxlength: VOLUNTEER_TEXT_LIMITS.guardianContact,
      validate: {
        validator: isValidGuardianContact,
        message: 'Въведи валиден телефон или имейл на родител/настойник.',
      },
    },
    motivation: {
      type: String,
      required: true,
      trim: true,
      maxlength: VOLUNTEER_TEXT_LIMITS.motivation,
    },
    experience: {
      type: String,
      trim: true,
      default: '',
      maxlength: VOLUNTEER_TEXT_LIMITS.experience,
    },
    availability: {
      type: String,
      required: true,
      trim: true,
      maxlength: VOLUNTEER_TEXT_LIMITS.availability,
    },
    preferredPositions: {
      type: [String],
      enum: VOLUNTEER_POSITION_VALUES,
      default: [],
    },
    otherPosition: {
      type: String,
      trim: true,
      default: '',
      maxlength: VOLUNTEER_TEXT_LIMITS.otherPosition,
    },
    status: {
      type: String,
      enum: VOLUNTEER_STATUS_VALUES,
      required: true,
      default: 'pending',
    },
    activeApplicationEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
      select: false,
    },
    internalNotes: {
      type: [volunteerApplicationInternalNoteSchema],
      default: [],
    },
    statusHistory: {
      type: [volunteerApplicationStatusHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

volunteerApplicationSchema.pre('validate', function syncActiveApplicationEmail() {
  applyActiveApplicationEmail(this);
});

volunteerApplicationSchema.pre('insertMany', function syncActiveApplicationEmails(applications) {
  if (Array.isArray(applications)) {
    applications.forEach(applyActiveApplicationEmail);
  }
});

volunteerApplicationSchema.index(
  { activeApplicationEmail: 1 },
  {
    unique: true,
    partialFilterExpression: {
      activeApplicationEmail: { $type: 'string' },
    },
  }
);

volunteerApplicationSchema.index({ createdAt: -1, _id: -1 });
volunteerApplicationSchema.index({ status: 1, createdAt: -1, _id: -1 });

export default mongoose.models.VolunteerApplication ||
  mongoose.model('VolunteerApplication', volunteerApplicationSchema);
