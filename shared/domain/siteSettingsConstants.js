import { isValidPhone } from './contactValidation.js';

export const SITE_SETTINGS_KEY = 'main';

export const SITE_SETTINGS_LIMITS = Object.freeze({
  siteName: 120,
  logoUrl: 512,
  copyright: 200,
  footerSecondary: 300,
  phone: 32,
  email: 254,
  address: 300,
  workingHours: 200,
  socialLinkLabel: 80,
  socialLinkUrl: 512,
  socialLinks: 10,
  bannerText: 500,
});

export const SITE_SETTINGS_EDITABLE_FIELDS = Object.freeze([
  'siteName',
  'logoUrl',
  'copyright',
  'footerSecondary',
  'phone',
  'email',
  'address',
  'workingHours',
  'socialLinks',
  'publicBanner',
]);

export const SITE_SETTINGS_PUBLIC_BANNER_FIELDS = Object.freeze([
  'isVisible',
  'text',
]);

export const SITE_SETTINGS_SOCIAL_LINK_FIELDS = Object.freeze([
  'label',
  'url',
]);

export const SITE_SETTINGS_DEFAULTS = Object.freeze({
  siteName: 'Animal Shelter',
  logoUrl: 'images/logo.jpg',
  copyright: '© 2026 Animal Shelter',
  footerSecondary: 'Всички права запазени.',
  phone: '+359 888 123 456',
  email: 'contact@animal-shelter.bg',
  address: 'гр. София, ул. Зелена грижа 12',
  workingHours: 'Понеделник - събота, 09:00 - 18:00',
  socialLinks: Object.freeze([]),
  publicBanner: Object.freeze({
    isVisible: false,
    text: '',
  }),
});

export function isValidSiteSettingsPhone(value) {
  return isValidPhone(value, { allowEmpty: true });
}

export function isValidSiteSettingsExternalUrl(value) {
  try {
    const parsedUrl = new URL(String(value ?? '').trim());
    return ['http:', 'https:'].includes(parsedUrl.protocol) && Boolean(parsedUrl.hostname);
  } catch {
    return false;
  }
}
