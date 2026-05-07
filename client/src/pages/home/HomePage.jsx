import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { FilterRail } from '../../components/sections/FilterRail.jsx';
import { HeroSection } from '../../components/sections/HeroSection.jsx';
import { AboutSection } from '../../components/sections/AboutSection.jsx';
import { SpeciesShowcaseSection } from '../../components/sections/SpeciesShowcaseSection.jsx';
import { RescueStoriesSection } from '../../components/sections/RescueStoriesSection.jsx';
import { buildAnimalsSearchPath } from '../animals/animalsListQuery.js';

const INITIAL_FILTERS = {
  species: '',
  size: '',
};

export function HomePage({ homeData, role }) {
  const navigate = useNavigate();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [draftFilters, setDraftFilters] = useState(INITIAL_FILTERS);

  function navigateToSearch(nextFilters = {}) {
    navigate(
      buildAnimalsSearchPath({
        query: searchValue.trim(),
        species: draftFilters.species,
        size: draftFilters.size,
        ...nextFilters,
      })
    );
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    navigateToSearch({ query: searchValue.trim() });
  }

  function handleFilterChange(field, value) {
    setDraftFilters((currentValue) => ({
      ...currentValue,
      [field]: value,
    }));
  }

  function handleFilterSubmit(event) {
    event.preventDefault();
    navigateToSearch();
  }

  return (
    <div className={`home-page ${isFilterOpen ? 'filters-open' : ''}`}>
      <div className="page-shell">
        <FilterRail
          filterPanel={homeData.filterPanel}
          filters={draftFilters}
          isOpen={isFilterOpen}
          onFilterChange={handleFilterChange}
          onSubmit={handleFilterSubmit}
          onToggle={() => setIsFilterOpen((currentValue) => !currentValue)}
        />

        <div className="page-content">
          <main className="page-main">
            <HeroSection
              hero={homeData.hero}
              role={role}
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              onSearchSubmit={handleSearchSubmit}
            />
            <AboutSection about={homeData.about} />
            <SpeciesShowcaseSection />
            <RescueStoriesSection />
          </main>
        </div>
      </div>
    </div>
  );
}
