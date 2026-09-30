import mongoose from 'mongoose';

import { EMAIL_PATTERN } from '../../shared/domain/userConstants.js';
import { isValidPhone } from '../../shared/domain/contactValidation.js';
import {
  CONTACT_INQUIRY_ADOPTION_SUBJECT_VALUES,
  CONTACT_INQUIRY_DONATION_TOPIC_VALUES,
  CONTACT_INQUIRY_SPECIAL_CARE_ASSISTANCE_TYPE_VALUES,
  CONTACT_INQUIRY_SPECIAL_CARE_AVAILABILITY_VALUES,
  CONTACT_INQUIRY_SPECIAL_CARE_SUBJECT_VALUES,
  CONTACT_INQUIRY_STATUS_VALUES,
  CONTACT_INQUIRY_TEXT_LIMITS,
  CONTACT_INQUIRY_TYPE_VALUES,
  CONTACT_INQUIRY_VOLUNTEER_SUBJECT_VALUES,
} from '../../shared/domain/contactInquiryConstants.js';

function isValidSubjectForInquiryType(value) {
  if (this.type === 'adoption') {
    return CONTACT_INQUIRY_ADOPTION_SUBJECT_VALUES.includes(value);
  }

  if (this.type === 'special-care') {
    return CONTACT_INQUIRY_SPECIAL_CARE_SUBJECT_VALUES.includes(value);
  }

  if (this.type === 'volunteering') {
    return CONTACT_INQUIRY_VOLUNTEER_SUBJECT_VALUES.includes(value);
  }

  return true;
}

function isSpecialRequestInquiry(inquiry) {
  return inquiry.type === 'special-care' && inquiry.subject === 'special-request';
}

const contactInquiryStatusHistorySchema = new mongoose.Schema(
  {
    fromStatus: {
      type: String,
      enum: ['', ...CONTACT_INQUIRY_STATUS_VALUES],
      default: '',
    },
    toStatus: {
      type: String,
      enum: CONTACT_INQUIRY_STATUS_VALUES,
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
      maxlength: CONTACT_INQUIRY_TEXT_LIMITS.actorName,
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

const contactInquirySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: CONTACT_INQUIRY_TYPE_VALUES,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: CONTACT_INQUIRY_TEXT_LIMITS.name,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: CONTACT_INQUIRY_TEXT_LIMITS.email,
      match: EMAIL_PATTERN,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: CONTACT_INQUIRY_TEXT_LIMITS.phone,
      validate: {
        validator: isValidPhone,
        message: 'Въведи валиден телефонен номер.',
      },
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: CONTACT_INQUIRY_TEXT_LIMITS.subject,
      validate: {
        validator: isValidSubjectForInquiryType,
        message: 'Темата не е валидна за избрания тип запитване.',
      },
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: CONTACT_INQUIRY_TEXT_LIMITS.description,
    },
    animalName: {
      type: String,
      trim: true,
      maxlength: CONTACT_INQUIRY_TEXT_LIMITS.animalName,
      required() {
        return ['adoption', 'special-care'].includes(this.type);
      },
      validate: {
        validator(value) {
          return ['adoption', 'special-care'].includes(this.type) ? Boolean(value) : !value;
        },
        message: 'Животно може да бъде посочено само при запитване за осиновяване или специална грижа.',
      },
    },
    animal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
      default: null,
      index: true,
      required() {
        return this.type === 'special-care';
      },
      validate: {
        validator(value) {
          return this.type === 'special-care' ? Boolean(value) : !value;
        },
        message: 'Конкретно животно може да бъде свързано само със запитване за специална грижа.',
      },
    },
    assistanceType: {
      type: String,
      trim: true,
      required() {
        return isSpecialRequestInquiry(this);
      },
      validate: {
        validator(value) {
          return isSpecialRequestInquiry(this)
            ? CONTACT_INQUIRY_SPECIAL_CARE_ASSISTANCE_TYPE_VALUES.includes(value)
            : !value;
        },
        message: 'Видът помощ е невалиден за избрания тип запитване.',
      },
    },
    hasRelevantExperience: {
      type: Boolean,
      required() {
        return isSpecialRequestInquiry(this);
      },
      validate: {
        validator(value) {
          return isSpecialRequestInquiry(this) ? typeof value === 'boolean' : value == null;
        },
        message: 'Предишен опит може да бъде посочен само при специална заявка.',
      },
    },
    experienceDetails: {
      type: String,
      trim: true,
      maxlength: CONTACT_INQUIRY_TEXT_LIMITS.experienceDetails,
      required() {
        return isSpecialRequestInquiry(this) && this.hasRelevantExperience === true;
      },
      validate: {
        validator(value) {
          if (!isSpecialRequestInquiry(this) || this.hasRelevantExperience !== true) {
            return !value;
          }

          return Boolean(value);
        },
        message: 'Описание на опита се изисква само при потвърден предишен опит.',
      },
    },
    availability: {
      type: String,
      trim: true,
      maxlength: CONTACT_INQUIRY_TEXT_LIMITS.availability,
      required() {
        return this.type === 'volunteering' || isSpecialRequestInquiry(this);
      },
      validate: {
        validator(value) {
          if (this.type === 'volunteering') {
            return Boolean(value);
          }

          if (isSpecialRequestInquiry(this)) {
            return CONTACT_INQUIRY_SPECIAL_CARE_AVAILABILITY_VALUES.includes(value);
          }

          return !value;
        },
        message: 'Наличността е невалидна за избрания тип запитване.',
      },
    },
    donationTopic: {
      type: String,
      trim: true,
      maxlength: CONTACT_INQUIRY_TEXT_LIMITS.donationTopic,
      required() {
        return this.type === 'donation';
      },
      validate: {
        validator(value) {
          if (this.type === 'donation') {
            return CONTACT_INQUIRY_DONATION_TOPIC_VALUES.includes(value);
          }

          return !value;
        },
        message: 'Видът дарение не е валиден за избрания тип запитване.',
      },
    },
    status: {
      type: String,
      required: true,
      enum: CONTACT_INQUIRY_STATUS_VALUES,
      default: 'pending',
      index: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
      index: true,
    },
    statusHistory: {
      type: [contactInquiryStatusHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.ContactInquiry || mongoose.model('ContactInquiry', contactInquirySchema);
