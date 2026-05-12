import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { HeroSection } from '../../components/sections/HeroSection.jsx';
import { AboutSection } from '../../components/sections/AboutSection.jsx';
import { SpeciesShowcaseSection } from '../../components/sections/SpeciesShowcaseSection.jsx';
import { RescueStoriesSection } from '../../components/sections/RescueStoriesSection.jsx';
import { buildAnimalsSearchPath } from '../animals/animalsListQuery.js';

export function HomePage({ homeData, role }) {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');

  function handleSearchSubmit(event) {
    event.preventDefault();
    navigate(
      buildAnimalsSearchPath({
        query: searchValue.trim(),
      })
    );
  }

  return (
    <div className="home-page">
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
  );
}
