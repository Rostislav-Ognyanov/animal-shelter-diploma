import { getProfileMenu } from '../shared/profileMenus.js';
import { getSiteSettings } from '../site-settings/siteSettings.service.js';

const FOOTER_LINKS = [
  {
    label: 'Политика за поверителност',
    href: '/politika-za-poveritelnost',
  },
  {
    label: 'Общи условия',
    href: '/obshti-uslovia',
  },
];

export async function getHomePageData(roleCandidate) {
  const siteSettings = await getSiteSettings();
  const profileMenu = getProfileMenu(roleCandidate);

  return {
    siteName: siteSettings.siteName,
    logoUrl: siteSettings.logoUrl,
    publicBanner: siteSettings.publicBanner,
    footer: {
      logoUrl: siteSettings.logoUrl,
      copyright: siteSettings.copyright || `© 2026 ${siteSettings.siteName}`,
      secondary: siteSettings.footerSecondary,
      links: FOOTER_LINKS,
      socialLinks: siteSettings.socialLinks,
      contactInfo: {
        phone: siteSettings.phone,
        email: siteSettings.email,
        address: siteSettings.address,
        workingHours: siteSettings.workingHours,
      },
    },
    profileMenu,
  };
}
