import { Link } from 'react-router-dom';

import { RESCUE_STORIES, SPECIES_SHOWCASE_ITEMS } from './animalAwarenessData.js';

const FEATURED_SPECIES = SPECIES_SHOWCASE_ITEMS.slice(0, 4);

export function AnimalsOverviewPage() {
  return (
    <main className="route-shell animals-overview-shell">
      <section className="animals-overview-info-grid">
        <article className="animals-overview-info-card animals-overview-info-card-left">
          <h1>За животните</h1>
          <p>
            Най-честите случаи в приюта са свързани с изоставяне, улични инциденти, неподготвена грижа и липса на
            безопасна среда. При кучетата и котките това често означава живот навън след промяна в домакинството, при
            зайчетата и гущерите - неподготвена ежедневна грижа, при лисиците, совите и таралежите - рисков контакт с
            градска среда, а при конете - нужда от пространство, постоянство и дългосрочна грижа.
          </p>
          <p>
            При добавяне на нови видове тази информация ще се разширява, за да отразява реалните им нужди и причините,
            поради които попадат под грижата на приюта.
          </p>
        </article>

        <article className="animals-overview-info-card animals-overview-info-card-right">
          <h2>Осиновяването помага пряко</h2>
          <p>
            Когато човек осинови животно, освобождава място, време и ресурс за следващ случай в нужда. Това не е само
            нов дом за едно животно, а възможност екипът да приеме, лекува и подготви още едно за сигурна среда.
          </p>
          <p>
            Добре обмисленото осиновяване намалява риска от повторно изоставяне и дава на животното стабилност,
            внимание и шанс да изгради доверие отново.
          </p>
        </article>
      </section>

      <section className="animals-overview-species-section" id="species-showcase-section">
        <div className="animals-overview-section-heading animals-overview-stories-heading">
          <h2>Информация за животните ни</h2>
          <Link className="animals-secondary-action" to="/informacia-za-zhivotnite">
            Вижте повече
          </Link>
        </div>

        <div className="animals-overview-species-grid">
          {FEATURED_SPECIES.map((species) => (
            <Link
              key={species.value}
              className="animals-overview-species-card"
              to={`/za-zhivotnite/${species.value}`}
            >
              <img src={species.imageSrc} alt={species.imageAlt} />
              <span>{species.tabLabel}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="animals-overview-stories-section" id="rescue-stories-section">
        <div className="animals-overview-section-heading animals-overview-stories-heading">
          <h2>Истории за спасявания</h2>
          <Link className="animals-secondary-action" to="/istorii-za-spasyavaniya">
            Вижте повече
          </Link>
        </div>

        <div className="animals-overview-stories-grid">
          {RESCUE_STORIES.map((story) => (
            <article key={story.title} className="animals-overview-story-card">
              <small>от {story.submittedBy}</small>
              <h3>{story.title}</h3>
              <p>{story.text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
