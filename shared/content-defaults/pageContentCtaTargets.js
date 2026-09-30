function freezeOptions(options) {
  return Object.freeze(options.map((option) => Object.freeze({ ...option })));
}

export const PUBLIC_CTA_TARGETS = freezeOptions([
  {
    value: '/',
    label: 'Начална страница',
  },
  {
    value: '/za-nas',
    label: 'За нас',
  },
  {
    value: '/podkrepa',
    label: 'Подкрепа',
  },
  {
    value: '/za-zhivotnite',
    label: 'За животните',
  },
  {
    value: '/informacia-za-zhivotnite',
    label: 'Информация за животните',
  },
  {
    value: '/istorii-za-spasyavaniya',
    label: 'Истории за спасявания',
  },
  {
    value: '/animals',
    label: 'Животни за осиновяване',
  },
  {
    value: '/volunteers',
    label: 'Доброволчество',
  },
  {
    value: '/donations',
    label: 'Дарения',
  },
  {
    value: '/svurji-se-s-nas',
    label: 'Свържи се с нас',
  },
]);

export const PAGE_ANCHOR_OPTIONS = Object.freeze({
  'animals-overview': freezeOptions([
    {
      value: '#species-showcase-section',
      label: 'Секция „Видове животни“',
    },
    {
      value: '#rescue-stories-section',
      label: 'Секция „Истории“',
    },
  ]),
  volunteering: freezeOptions([
    {
      value: '#volunteer-personal-info',
      label: 'Формуляр за доброволец',
    },
  ]),
  donations: freezeOptions([
    {
      value: '#donation-form',
      label: 'Формуляр за дарение',
    },
  ]),
});

export function getPageContentCtaTargetOptions(pageKey) {
  return [
    ...PUBLIC_CTA_TARGETS,
    ...(PAGE_ANCHOR_OPTIONS[pageKey] ?? []),
  ];
}

export function isAllowedPageContentCtaTarget(pageKey, value) {
  if (!value) {
    return true;
  }

  return getPageContentCtaTargetOptions(pageKey).some((option) => option.value === value);
}
