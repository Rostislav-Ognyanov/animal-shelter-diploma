import { HeroSection } from '../../components/sections/HeroSection.jsx';
import { AboutSection } from '../../components/sections/AboutSection.jsx';
import { HomeHelpSection } from '../../components/sections/HomeHelpSection.jsx';
import { SpeciesShowcaseSection } from '../../components/sections/SpeciesShowcaseSection.jsx';
import { RescueStoriesSection } from '../../components/sections/RescueStoriesSection.jsx';
import { DEFAULT_PAGE_CONTENT } from '../page-content/pageContentDefaults.js';
import { usePageContent } from '../page-content/pageContentUtils.js';

export function HomePage({ homeData }) {
  const { content: pageContent } = usePageContent('home', DEFAULT_PAGE_CONTENT.home);

  return (
    <div className="home-page">
      <main className="page-main">
        <HeroSection hero={pageContent.hero ?? homeData.hero} />
        <AboutSection about={pageContent.about ?? homeData.about} />
        <SpeciesShowcaseSection />
        <HomeHelpSection cards={pageContent.helpCards} />
        <RescueStoriesSection section={pageContent.rescueStoriesSection} />
      </main>
    </div>
  );
}
