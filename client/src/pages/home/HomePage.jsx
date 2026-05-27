import { HeroSection } from '../../components/sections/HeroSection.jsx';
import { AboutSection } from '../../components/sections/AboutSection.jsx';
import { HomeHelpSection } from '../../components/sections/HomeHelpSection.jsx';
import { SpeciesShowcaseSection } from '../../components/sections/SpeciesShowcaseSection.jsx';
import { RescueStoriesSection } from '../../components/sections/RescueStoriesSection.jsx';

export function HomePage({ homeData }) {
  return (
    <div className="home-page">
      <main className="page-main">
        <HeroSection hero={homeData.hero} />
        <AboutSection about={homeData.about} />
        <SpeciesShowcaseSection />
        <HomeHelpSection />
        <RescueStoriesSection />
      </main>
    </div>
  );
}
