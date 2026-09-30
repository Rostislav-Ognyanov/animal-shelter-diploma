import { PageErrorState, PageLoadingState } from '../../components/common/PageStatusStates.jsx';
import { HeroSection } from './sections/HeroSection.jsx';
import { AboutSection } from './sections/AboutSection.jsx';
import { HelpSection } from './sections/HelpSection.jsx';
import { SpeciesShowcaseSection } from './sections/SpeciesShowcaseSection.jsx';
import { RescueStoriesSection } from './sections/RescueStoriesSection.jsx';
import { usePageContent } from '../page-content/pageContentUtils.js';

export function HomePage() {
  const { content: pageContent, error, isLoading, reload } = usePageContent('home');

  if (isLoading) {
    return <PageLoadingState />;
  }

  if (error) {
    return <PageErrorState message={error} onRetry={reload} />;
  }

  return (
    <main className="page-main">
      <HeroSection hero={pageContent.hero} />
      <AboutSection about={pageContent.about} />
      <SpeciesShowcaseSection />
      <HelpSection cards={pageContent.helpCards} />
      <RescueStoriesSection section={pageContent.rescueStoriesSection} />
    </main>
  );
}
