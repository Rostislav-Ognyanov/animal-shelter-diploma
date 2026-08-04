import SiteSettings from '../../models/SiteSettings.js';
import { createHttpError } from '../../utils/httpError.js';
import { hasPermission } from '../shared/rolePolicies.js';

const SITE_SETTINGS_KEY = 'main';

export const DEFAULT_SITE_SETTINGS = {
  key: SITE_SETTINGS_KEY,
  siteName: 'Animal Shelter',
  logoUrl: 'images/logo.jpg',
  copyright: '© 2026 Animal Shelter',
  footerSecondary: 'Всички права запазени.',
  phone: '+359 888 123 456',
  email: 'contact@animal-shelter.bg',
  address: 'гр. София, ул. Зелена грижа 12',
  workingHours: 'Понеделник - събота, 09:00 - 18:00',
  socialLinks: [],
  publicBanner: {
    isVisible: false,
    text: '',
  },
};

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeSocialLinks(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((link) => ({
      label: normalizeText(link?.label),
      url: normalizeText(link?.url),
    }))
    .filter((link) => link.label && link.url);
}

function normalizePublicBanner(value = {}) {
  return {
    isVisible: Boolean(value?.isVisible),
    text: normalizeText(value?.text),
  };
}

function serializeSiteSettings(settings) {
  if (!settings) {
    return {
      ...DEFAULT_SITE_SETTINGS,
      id: null,
      createdAt: null,
      updatedAt: null,
      updatedBy: null,
    };
  }

  return {
    id: String(settings._id),
    key: settings.key,
    siteName: settings.siteName || DEFAULT_SITE_SETTINGS.siteName,
    logoUrl: settings.logoUrl || DEFAULT_SITE_SETTINGS.logoUrl,
    copyright: settings.copyright || `© 2026 ${settings.siteName || DEFAULT_SITE_SETTINGS.siteName}`,
    footerSecondary: settings.footerSecondary || DEFAULT_SITE_SETTINGS.footerSecondary,
    phone: settings.phone ?? DEFAULT_SITE_SETTINGS.phone,
    email: settings.email ?? DEFAULT_SITE_SETTINGS.email,
    address: settings.address ?? DEFAULT_SITE_SETTINGS.address,
    workingHours: settings.workingHours ?? DEFAULT_SITE_SETTINGS.workingHours,
    socialLinks: settings.socialLinks ?? [],
    publicBanner: {
      ...DEFAULT_SITE_SETTINGS.publicBanner,
      ...(settings.publicBanner ?? {}),
    },
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt,
    updatedBy: settings.updatedBy ? String(settings.updatedBy) : null,
  };
}

function assertPermission(currentUser, action) {
  if (!currentUser) {
    throw createHttpError(401, 'Необходимо е да влезеш в профила си, за да използваш този ресурс.');
  }

  if (!hasPermission(currentUser.role, 'content', action)) {
    throw createHttpError(403, 'Нямаш необходимите права за това действие.');
  }
}

function normalizeSettingsPayload(payload = {}) {
  const siteName = normalizeText(payload.siteName) || DEFAULT_SITE_SETTINGS.siteName;

  return {
    siteName,
    logoUrl: normalizeText(payload.logoUrl) || DEFAULT_SITE_SETTINGS.logoUrl,
    copyright: normalizeText(payload.copyright) || `© 2026 ${siteName}`,
    footerSecondary: normalizeText(payload.footerSecondary) || DEFAULT_SITE_SETTINGS.footerSecondary,
    phone: normalizeText(payload.phone),
    email: normalizeText(payload.email),
    address: normalizeText(payload.address),
    workingHours: normalizeText(payload.workingHours),
    socialLinks: normalizeSocialLinks(payload.socialLinks),
    publicBanner: normalizePublicBanner(payload.publicBanner),
  };
}

export async function getSiteSettings() {
  const settings = await SiteSettings.findOne({ key: SITE_SETTINGS_KEY }).lean();
  return serializeSiteSettings(settings);
}

export async function updateSiteSettings(payload, currentUser) {
  assertPermission(currentUser, 'manage-settings');

  const settingsPayload = normalizeSettingsPayload(payload);
  const settings = await SiteSettings.findOneAndUpdate(
    { key: SITE_SETTINGS_KEY },
    {
      $set: {
        ...settingsPayload,
        updatedBy: currentUser.id,
      },
    },
    {
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
      upsert: true,
    }
  ).lean();

  return serializeSiteSettings(settings);
}
