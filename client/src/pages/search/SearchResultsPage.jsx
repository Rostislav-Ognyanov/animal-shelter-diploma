import { AnimalsListPage } from '../animals/AnimalsListPage.jsx';

export function SearchResultsPage({ role }) {
  return <AnimalsListPage role={role} variant="search" />;
}
