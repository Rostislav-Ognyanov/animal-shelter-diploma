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
    to: '/search',
    label: 'За животните',
    items: [
      { href: '/#species-showcase-section', label: 'Информация за животните ни' },
      { href: '/#rescue-stories-section', label: 'Истории за спасявания' },
    ],
  },
  { to: '/svurji-se-s-nas', label: 'Свържи се с нас' },
];

export function getMainNavigation() {
  return MAIN_NAVIGATION;
}
