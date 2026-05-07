import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { buildAnimalsSearchPath } from '../../pages/animals/animalsListQuery.js';

const SPECIES_SHOWCASE_ITEMS = [
  {
    value: 'dog',
    tabLabel: 'Куче',
    title: 'Кучетата често попадат в приюта след изоставяне или улични инциденти.',
    description:
      'При кучетата най-често виждаме натрупване на случаи след импулсивно осиновяване, липса на дългосрочна грижа или инциденти в градска среда. Част от тях пристигат изплашени, ранени или без изградени навици за дом.',
    issues: [
      'Често се изоставят след преместване, финансов натиск или подценяване на ежедневната нужда от активност и обучение.',
      'Сред уличните случаи най-чести са блъскания, наранявания и дълъг период на възстановяване преди животното отново да е готово за дом.',
      'Неконтролираното размножаване и липсата на ранна кастрация водят до постоянен приток на нови случаи.',
    ],
    imageSrc: '/images/animals/Dogs/Beagle_Lily.jpg',
    imageAlt: 'Лили - куче от приюта',
  },
  {
    value: 'cat',
    tabLabel: 'Котка',
    title: 'При котките често се преплитат изоставяне, уличен живот и скрити здравни проблеми.',
    description:
      'Много котки достигат до приюта след период на живот навън, където рискът от травми, болести и недохранване е висок. Други са оставени след нежелано поколение или промяна в домакинството.',
    issues: [
      'Често остават навън след преместване, конфликт у дома или подценяване на отговорността по грижата.',
      'Котките на улицата са изложени на инфекции, отравяния, сблъсъци с автомобили и липса на постоянна храна.',
      'Без контрол върху размножаването броят на котките без сигурна среда се увеличава много бързо.',
    ],
    imageSrc: '/images/animals/Cats/Domestic_Shorthair_Ginger_Garfield.jpeg',
    imageAlt: 'Гарфийлд - котка от приюта',
  },
  {
    value: 'rabbit',
    tabLabel: 'Зайче',
    title: 'Зайчетата често стават жертва на импулсивно вземане и неподготвена грижа.',
    description:
      'Домашните зайчета нерядко се оказват изоставени, когато се разбере, че имат нужда от постоянна хигиена, безопасна среда и внимателно хранене. При пускане навън рискът за тях рязко се увеличава.',
    issues: [
      'Често се вземат като лесен домашен любимец, а после се оказва, че ежедневната грижа е по-сложна от очакваното.',
      'При домашно зайче, оставено навън, рискът от травми, хищници и заболявания е много висок.',
      'Без подходяща среда и ветеринарно наблюдение състоянието им може да се влоши бързо и почти без външни признаци.',
    ],
    imageSrc: '/images/animals/Rabbits/Holland_Lop_Minny.jpg',
    imageAlt: 'Мини - зайче от приюта',
  },
  {
    value: 'fox',
    tabLabel: 'Лисица',
    title: 'Лисиците по-често стават жертва на инциденти при намаляване на безопасната среда или лов.',
    description:
      'Лисиците попадат в обсега на приюта основно при наранявания, конфликт с градска среда или когато безопасните им местообитания намаляват. Това е вид с по-специфични нужди и по-внимателен процес на преценка.',
    issues: [
      'Често става дума за удар, нараняване или изтощение след контакт с пътища и урбанизирани зони.',
      'При недостиг на безопасни пространства се увеличават рисковете от глад, стрес и опасни срещи с хора и машини.',
      'Свиването на спокойните местообитания прави възстановяването и правилното настаняване значително по-трудни.',
    ],
    imageSrc: '/images/animals/Foxes/Sidney.webp',
    imageAlt: 'Сидни - лисица от приюта',
  },
];

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
                <img src={selectedSpecies.imageSrc} alt={selectedSpecies.imageAlt} />
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
