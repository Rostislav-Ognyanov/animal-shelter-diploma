import mongoose from 'mongoose';

import {
  SITE_SETTINGS_DEFAULTS,
  SITE_SETTINGS_KEY,
  SITE_SETTINGS_LIMITS,
  isValidSiteSettingsExternalUrl,
  isValidSiteSettingsPhone,
} from '../../shared/domain/siteSettingsConstants.js';
import { EMAIL_PATTERN } from '../../shared/domain/userConstants.js';

const socialLinkSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: SITE_SETTINGS_LIMITS.socialLinkLabel,
    },
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: SITE_SETTINGS_LIMITS.socialLinkUrl,
      validate: {
        validator: isValidSiteSettingsExternalUrl,
        message: 'URL адресът на социалния профил не е валиден.',
      },
    },
  },
  { _id: false }
);

const publicBannerSchema = new mongoose.Schema(
  {
    isVisible: { type: Boolean, default: false },
    text: {
      type: String,
      trim: true,
      maxlength: SITE_SETTINGS_LIMITS.bannerText,
      default: '',
      validate: {
        validator(value) {
          return !this.isVisible || Boolean(String(value ?? '').trim());
        },
        message: 'Видимият публичен банер трябва да има текст.',
      },
    },
  },
  { _id: false }
);

const siteSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: SITE_SETTINGS_KEY,
      immutable: true,
    },
    siteName: {
      type: String,
      required: true,
      trim: true,
      maxlength: SITE_SETTINGS_LIMITS.siteName,
      default: SITE_SETTINGS_DEFAULTS.siteName,
    },
    logoUrl: {
      type: String,
      trim: true,
      maxlength: SITE_SETTINGS_LIMITS.logoUrl,
      default: SITE_SETTINGS_DEFAULTS.logoUrl,
    },
    copyright: {
      type: String,
      trim: true,
      maxlength: SITE_SETTINGS_LIMITS.copyright,
      default: SITE_SETTINGS_DEFAULTS.copyright,
    },
    footerSecondary: {
      type: String,
      trim: true,
      maxlength: SITE_SETTINGS_LIMITS.footerSecondary,
      default: SITE_SETTINGS_DEFAULTS.footerSecondary,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: SITE_SETTINGS_LIMITS.phone,
      default: SITE_SETTINGS_DEFAULTS.phone,
      validate: {
        validator: isValidSiteSettingsPhone,
        message: 'Въведи валиден телефонен номер.',
      },
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: SITE_SETTINGS_LIMITS.email,
      default: SITE_SETTINGS_DEFAULTS.email,
      validate: {
        validator: (value) => !value || EMAIL_PATTERN.test(value),
        message: 'Въведи валиден имейл адрес.',
      },
    },
    address: {
      type: String,
      trim: true,
      maxlength: SITE_SETTINGS_LIMITS.address,
      default: SITE_SETTINGS_DEFAULTS.address,
    },
    workingHours: {
      type: String,
      trim: true,
      maxlength: SITE_SETTINGS_LIMITS.workingHours,
      default: SITE_SETTINGS_DEFAULTS.workingHours,
    },
    socialLinks: {
      type: [socialLinkSchema],
      default: [],
      validate: {
        validator: (links) => Array.isArray(links) && links.length <= SITE_SETTINGS_LIMITS.socialLinks,
        message: `Могат да бъдат добавени най-много ${SITE_SETTINGS_LIMITS.socialLinks} социални профила.`,
      },
    },
    publicBanner: { type: publicBannerSchema, default: () => ({}) },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export default mongoose.models.SiteSettings ||
  mongoose.model('SiteSettings', siteSettingsSchema);
