import { loadJsonFile } from '../../utils/loadJsonFile.js';
import { getProfileMenu } from '../shared/profileMenus.js';
import { normalizeRole } from '../shared/rolePolicies.js';

const HOME_PAGE_DATA_PATH = 'data/home-page.json';

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
  const homePage = await loadJsonFile(HOME_PAGE_DATA_PATH);

  return {
    ...homePage,
    navItems: normalizeHomeNavigation(homePage.navItems),
    userRole: role,
    roleLabel: getProfileMenu(role).roleLabel,
    profileMenu: getProfileMenu(role),
  };
}