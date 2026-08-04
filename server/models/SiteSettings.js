import mongoose from 'mongoose';

const socialLinkSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: '' },
    url: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const publicBannerSchema = new mongoose.Schema(
  {
    isVisible: { type: Boolean, default: false },
    text: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const siteSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'main',
      immutable: true,
    },
    siteName: { type: String, trim: true, default: 'Animal Shelter' },
    logoUrl: { type: String, trim: true, default: 'images/logo.jpg' },
    copyright: { type: String, trim: true, default: '© 2026 Animal Shelter' },
    footerSecondary: { type: String, trim: true, default: 'Всички права запазени.' },
    phone: { type: String, trim: true, default: '+359 888 123 456' },
    email: { type: String, trim: true, default: 'contact@animal-shelter.bg' },
    address: { type: String, trim: true, default: 'гр. София, ул. Зелена грижа 12' },
    workingHours: { type: String, trim: true, default: 'Понеделник - събота, 09:00 - 18:00' },
    socialLinks: { type: [socialLinkSchema], default: [] },
    publicBanner: { type: publicBannerSchema, default: () => ({}) },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export default mongoose.models.SiteSettings ||
  mongoose.model('SiteSettings', siteSettingsSchema);
