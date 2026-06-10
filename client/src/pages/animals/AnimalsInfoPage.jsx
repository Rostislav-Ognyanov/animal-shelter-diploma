import { Link } from 'react-router-dom';

import { buildPublicAssetPath } from '../../lib/publicAssetPath.js';
import { SPECIES_SHOWCASE_ITEMS } from './animalAwarenessData.js';

export function AnimalsInfoPage() {
  return (
    <main className="route-shell animals-overview-shell animals-page-shell animals-info-page-shell">
      <section className="animals-info-page-hero">
        <div>
          <h1>Запознай се повече с животните в приюта</h1>
        </div>
      </section>

      <section className="animals-overview-species-section" id="species-showcase-section">
        <div className="animals-overview-species-intro">
          <h1>Искаш ли да научиш повече за животните?</h1>
          <p>
            В страниците с факти за животните ще научиш много любопитни факти за живота и поведението на всеки вид, в
            домашни условия или в природата.
          </p>
          <strong>Кликни върху вид по-долу за повече информация</strong>
        </div>

        <div className="animals-overview-species-grid">
          {SPECIES_SHOWCASE_ITEMS.map((species) => (
            <Link
              key={species.value}
              className="animals-overview-species-card"
              to={`/za-zhivotnite/${species.value}`}
            >
              <img src={buildPublicAssetPath(species.imageSrc)} alt={species.imageAlt} />
              <span>{species.tabLabel}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
