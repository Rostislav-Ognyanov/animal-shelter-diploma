import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { buildPublicAssetPath } from '../../lib/publicAssetPath.js';
import { buildAnimalsSearchPath } from '../../pages/animals/animalsListQuery.js';
import { usePublishedSpeciesContentList } from '../../pages/animals/useSpeciesContent.js';

export function SpeciesShowcaseSection() {
  const { speciesContent } = usePublishedSpeciesContentList();
  const [selectedSpeciesValue, setSelectedSpeciesValue] = useState('');

  useEffect(() => {
    if (speciesContent.length === 0) {
      return;
    }

    const selectedSpeciesExists = speciesContent.some((item) => item.species === selectedSpeciesValue);

    if (!selectedSpeciesValue || !selectedSpeciesExists) {
      setSelectedSpeciesValue(speciesContent[0].species);
    }
  }, [selectedSpeciesValue, speciesContent]);

  const selectedSpecies = useMemo(
    () => speciesContent.find((item) => item.species === selectedSpeciesValue) ?? speciesContent[0],
    [selectedSpeciesValue, speciesContent]
  );

  const adoptionPath = useMemo(
    () => buildAnimalsSearchPath({ species: selectedSpecies?.species }),
    [selectedSpecies?.species]
  );

  const adoptionActionLabel = useMemo(
    () => `Осинови ${selectedSpecies?.displayName?.toLowerCase() ?? 'животно'}`,
    [selectedSpecies?.displayName]
  );

  if (!selectedSpecies) {
    return null;
  }

  return (
    <section className="species-showcase" id="species-showcase-section">
      <div className="section-container species-showcase-container">
        <div className="species-showcase-layout">
          <div className="species-showcase-list" role="tablist" aria-label="Видове животни">
            {speciesContent.map((item) => {
              const isSelected = item.species === selectedSpecies.species;

              return (
                <button
                  key={item.species}
                  type="button"
                  className={`species-showcase-tab ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => setSelectedSpeciesValue(item.species)}
                >
                  <span className="species-showcase-tab-label">{item.displayName}</span>
                </button>
              );
            })}
          </div>

          <article className={`species-showcase-panel is-${selectedSpecies.species}`}>
            <div className="species-showcase-panel-layout">
              <div className="species-showcase-panel-content">
                <div className="species-showcase-panel-top">
                  <h3>{selectedSpecies.title}</h3>
                  <p>{selectedSpecies.introduction}</p>
                </div>

                <div className="species-showcase-issues">
                  {(selectedSpecies.issues ?? []).map((issue) => (
                    <article key={issue} className="species-showcase-issue-card">
                      <p>{issue}</p>
                    </article>
                  ))}
                </div>

                <div className="species-showcase-actions">
                  <Link
                    className="animals-primary-action"
                    to={adoptionPath}
                    title={adoptionActionLabel}
                    aria-label={adoptionActionLabel}
                  >
                    {adoptionActionLabel}
                  </Link>
                </div>
              </div>

              <div className="species-showcase-figure">
                <img
                  src={buildPublicAssetPath(selectedSpecies.cardImageUrl)}
                  alt={selectedSpecies.cardImageAlt}
                />
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
