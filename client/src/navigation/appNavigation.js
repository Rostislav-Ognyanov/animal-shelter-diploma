const MAIN_NAVIGATION = [
  { href: '/#about-section', label: 'За нас' },
  {
    to: '/donations',
    label: 'Подкрепа',
    items: [
      { to: '/donations', label: 'Дарения' },
      { to: '/search', label: 'Осиновяване' },
    ],
  },
  { to: '/volunteers', label: 'Доброволец' },
  {
    to: '/za-zhivotnite',
    label: 'За животните',
    items: [
      { to: '/informacia-za-zhivotnite', label: 'Информация за животните ни' },
      { to: '/istorii-za-spasyavaniya', label: 'Истории за спасявания' },
    ],
  },
  { to: '/svurji-se-s-nas', label: 'Свържи се с нас' },
];

export function getMainNavigation() {
  return MAIN_NAVIGATION;
}
