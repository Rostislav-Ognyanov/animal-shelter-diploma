import { getProfileMenu } from '../shared/profileMenus.js';
import { normalizeRole } from '../shared/rolePolicies.js';
import { getSiteSettings } from '../site-settings/siteSettings.service.js';

const HOME_PAGE_DATA = {
  siteName: 'Animal Shelter',
  navItems: [
    {
      label: 'Начало',
      href: '/#home-top',
    },
    {
      label: 'Животни',
      href: '/animals',
    },
    {
      label: 'За приюта',
      href: '/#about-section',
    },
    {
      label: 'Контакти',
      href: '/#site-footer',
    },
  ],
  hero: {
    eyebrow: '',
    title: 'Място за грижа, надежда и ново начало.',
    description:
      'Приютът ни подкрепя животни в риск, като им дава защита, медицинска помощ и възможност да бъдат осиновени в любяща среда. Тук всеки може да помогне чрез осиновяване, доброволчество, дарение или подаден сигнал за животно в нужда.',
    searchPlaceholder: 'Търсене по име, порода или вид...',
    searchButton: 'Търси',
  },
  about: {
    title: 'За приюта',
    paragraphs: [
      'Нашият приют е място, в което животните получават не само подслон, но и шанс за възстановяване, доверие и нов живот. Работим всеки ден, за да осигурим грижа, лечение и безопасна среда за животни, които са преживели изоставяне, насилие или дълъг живот без дом. Мисията ни е да свързваме хората с реални начини да помогнат чрез осиновяване, доброволчество, дарения или навременен сигнал за животно в нужда.',
    ],
    cta: {
      label: 'Свържи се с нас',
      to: '/svurji-se-s-nas',
    },
  },
  filterPanel: {
    title: 'Филтър',
    description: 'Избери критерии и намери подходящото животно по-бързо.',
    submitLabel: 'Приложи филтъра',
    types: [
      {
        value: '',
        label: 'Всички',
      },
      {
        value: 'dog',
        label: 'Куче',
      },
      {
        value: 'cat',
        label: 'Котка',
      },
      {
        value: 'rabbit',
        label: 'Зайче',
      },
      {
        value: 'fox',
        label: 'Лисица',
      },
    ],
    sizes: [
      {
        value: '',
        label: 'Всички',
      },
      {
        value: 'small',
        label: 'Малка',
      },
      {
        value: 'medium',
        label: 'Средна',
      },
      {
        value: 'large',
        label: 'Голяма',
      },
      {
        value: 'extra-large',
        label: 'Много голяма',
      },
    ],
  },
  animalsSection: {
    title: 'Налични животни',
    emptyState: 'Няма животни, които да съвпадат с въведените критерии.',
  },
  footer: {
    copyright: '© 2026 Animal Shelter',
    secondary: 'Всички права запазени.',
    links: [
      {
        label: 'Политика за поверителност',
        href: '/privacy',
      },
      {
        label: 'Общи условия',
        href: '/terms',
      },
    ],
  },
};

function normalizeHomeNavigation(navItems = []) {
  return navItems.map((item) => {
    if (item.href === '/#animals-section') {
      return {
        ...item,
        href: '/animals',
      };
    }

    return item;
  });
}

export async function getHomePageData(roleCandidate) {
  const role = normalizeRole(roleCandidate);
  const siteSettings = await getSiteSettings();

  return {
    ...HOME_PAGE_DATA,
    siteName: siteSettings.siteName,
    logoUrl: siteSettings.logoUrl,
    siteSettings,
    publicBanner: siteSettings.publicBanner,
    footer: {
      ...HOME_PAGE_DATA.footer,
      logoUrl: siteSettings.logoUrl,
      copyright: siteSettings.copyright || `© 2026 ${siteSettings.siteName}`,
      secondary: siteSettings.footerSecondary,
      socialLinks: siteSettings.socialLinks,
      contactInfo: {
        phone: siteSettings.phone,
        email: siteSettings.email,
        address: siteSettings.address,
        workingHours: siteSettings.workingHours,
      },
    },
    navItems: normalizeHomeNavigation(HOME_PAGE_DATA.navItems),
    userRole: role,
    roleLabel: getProfileMenu(role).roleLabel,
    profileMenu: getProfileMenu(role),
  };
}
