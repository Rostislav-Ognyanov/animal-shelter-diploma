import { AnimalCard } from '../animals/AnimalCard.jsx';

export function AnimalsSection({ sectionData, animals, isLoading, error, summary }) {
  return (
    <section className="animals" id="animals-section">
      <div className="section-container">
        <div className="section-heading">
          <div>
            <h2>{sectionData.title}</h2>
            <p>{summary}</p>
          </div>
        </div>

        {error ? <div className="section-message error">{error}</div> : null}
        {isLoading ? <div className="section-message">Зареждане на животни...</div> : null}

        {!isLoading && !error && animals.length === 0 ? (
          <div className="section-message">{sectionData.emptyState}</div>
        ) : null}

        {!isLoading && !error && animals.length > 0 ? (
          <div className="animals-grid">
            {animals.map((animal) => (
              <AnimalCard key={animal.id} animal={animal} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
