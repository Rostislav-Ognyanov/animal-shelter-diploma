import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { buildPublicAssetPath } from '../../lib/publicAssetPath.js';
import { SPECIES_SHOWCASE_ITEMS } from '../../pages/animals/animalAwarenessData.js';
import { buildAnimalsSearchPath } from '../../pages/animals/animalsListQuery.js';

export function SpeciesShowcaseSection() {
  const [selectedSpeciesValue, setSelectedSpeciesValue] = useState(SPECIES_SHOWCASE_ITEMS[0].value);

  const selectedSpecies = useMemo(
    () =>
      SPECIES_SHOWCASE_ITEMS.find((item) => item.value === selectedSpeciesValue) ??
      SPECIES_SHOWCASE_ITEMS[0],
    [selectedSpeciesValue]
  );

  const adoptionPath = useMemo(
    () => buildAnimalsSearchPath({ species: selectedSpecies.value }),
    [selectedSpecies.value]
  );

  const adoptionActionLabel = useMemo(
    () => `Осинови ${selectedSpecies.tabLabel.toLowerCase()}`,
    [selectedSpecies.tabLabel]
  );

  return (
    <section className="species-showcase" id="species-showcase-section">
      <div className="section-container species-showcase-container">
        <div className="species-showcase-layout">
          <div className="species-showcase-list" role="tablist" aria-label="Видове животни">
            {SPECIES_SHOWCASE_ITEMS.map((item) => {
              const isSelected = item.value === selectedSpecies.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  className={`species-showcase-tab ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => setSelectedSpeciesValue(item.value)}
                >
                  <span className="species-showcase-tab-label">{item.tabLabel}</span>
                </button>
              );
            })}
          </div>

          <article className={`species-showcase-panel is-${selectedSpecies.value}`}>
            <div className="species-showcase-panel-layout">
              <div className="species-showcase-panel-content">
                <div className="species-showcase-panel-top">
                  <h3>{selectedSpecies.title}</h3>
                  <p>{selectedSpecies.description}</p>
                </div>

                <div className="species-showcase-issues">
                  {selectedSpecies.issues.map((issue) => (
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
                  src={buildPublicAssetPath(selectedSpecies.imageSrc)}
                  alt={selectedSpecies.imageAlt}
                />
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
