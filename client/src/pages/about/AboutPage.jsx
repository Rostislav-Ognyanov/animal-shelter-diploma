import { useState } from 'react';
import { Link } from 'react-router-dom';

import { buildPublicAssetPath } from '../../lib/publicAssetPath.js';

const ABOUT_TOGGLES = [
  {
    key: 'goal',
    title: 'Крайна цел',
    text:
      'Нашата крайна цел е да изградим среда, в която всяко животно в нужда да получи сигурност, грижа и реален шанс за нов дом. Стремим се не само да осигурим временно подслоняване, но и да създадем устойчив модел на подкрепа чрез осиновяване, доброволчество, дарения и активна връзка с обществото. Вярваме, че дългосрочната промяна идва тогава, когато повече хора се включат в защитата и доброто отношение към животните.',
  },
  {
    key: 'mission',
    title: 'Мисия',
    text:
      'Нашата мисия е да помагаме на изоставени, пострадали и уязвими животни, като им осигурим безопасност, лечение, грижа и възможност за по-добър живот. Работим, за да свързваме животните в приюта с хора, готови да им дадат дом, внимание и подкрепа. Чрез дейността си и чрез тази платформа се стремим да насърчаваме отговорното отношение към животните и активното участие на обществото в тяхната защита.',
  },
];

export function AboutPage() {
  const [openSections, setOpenSections] = useState({
    goal: false,
    mission: false,
  });

  function toggleSection(sectionKey) {
    setOpenSections((currentValue) => ({
      ...currentValue,
      [sectionKey]: !currentValue[sectionKey],
    }));
  }

  return (
    <main className="route-shell about-page-shell">
      <section className="about-page-hero">
        <h1>Animal Shelter</h1>
      </section>

      <section className="about-page-story-block">
        <div className="about-page-split-inner about-page-story-row">
          <article className="about-page-split-copy">
            <h2>За приюта</h2>
            <p>
              Нашият приют е създаден с мисията да осигурява защита, грижа и нов шанс за животни, останали без дом,
              сигурност и човешка подкрепа. Тук приемаме животни, които са били изоставени, пострадали или са живели
              дълго време в тежки условия, и им помагаме да възстановят здравето и доверието си. Вярваме, че всяко
              животно заслужава спокойна среда, внимание и възможност да бъде обичано. Чрез тази платформа искаме не само
              да представим животните в приюта, но и да дадем на хората лесен начин да помогнат — чрез осиновяване,
              доброволчество, дарения или подаден сигнал за животно в нужда.
            </p>

            <Link className="about-page-contact-link" to="/svurji-se-s-nas">
              Свържи се с нас
            </Link>
          </article>

          <figure className="about-page-split-image">
            <img src={buildPublicAssetPath('images/page_images/about_hero1.webp')} alt="Грижа за животно в приюта" />
          </figure>
        </div>

        <div className="about-page-story-divider" aria-hidden="true" />

        <div className="about-page-split-inner about-page-story-row about-page-story-row-reversed">
          <figure className="about-page-split-image">
            <img
              src={buildPublicAssetPath('images/page_images/about_hero2.webp')}
              alt="Ежедневна работа и грижа в приюта"
            />
          </figure>

          <article className="about-page-split-copy">
            <h2>Работа и грижа</h2>
            <p>
              Грижата за животните в приюта е ежедневен и отговорен процес, който включва хранене, почистване, медицинско
              наблюдение, социализация и подготовка за бъдещо осиновяване. Нашата работа е насочена не само към
              физическото възстановяване на животните, но и към това те да се почувстват спокойни, защитени и готови за
              ново начало. Всеки случай изисква индивидуален подход, търпение и внимание, защото зад всяко спасено
              животно стои различна история и различна нужда от подкрепа. Именно затова помощта на хората е толкова ценна
              — тя ни позволява да осигурим по-добра среда, повече грижа и повече възможности за животните, които
              разчитат на нас.
            </p>
          </article>
        </div>
      </section>

      <section className="about-page-toggle-grid">
        {ABOUT_TOGGLES.map((section) => {
          const isOpen = openSections[section.key];

          return (
            <article key={section.key} className={`about-page-toggle-card ${isOpen ? 'is-open' : ''}`}>
              <button type="button" onClick={() => toggleSection(section.key)} aria-expanded={isOpen}>
                <span>{section.title}</span>
                <strong>{isOpen ? '-' : '+'}</strong>
              </button>

              {isOpen ? <p>{section.text}</p> : null}
            </article>
          );
        })}
      </section>
    </main>
  );
}
