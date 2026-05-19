import { useState } from 'react';
import { Link } from 'react-router-dom';

const ABOUT_TOGGLES = [
  {
    key: 'goal',
    title: 'Крайна цел',
    text:
      'Крайната ни цел е всяко животно, което преминава през приюта, да получи сигурна грижа, възстановяване и реален шанс за подходящ дом. Работим така, че помощта да не приключва само с настаняването, а да води до устойчиво решение за животното.',
  },
  {
    key: 'mission',
    title: 'Мисия',
    text:
      'Мисията ни е да реагираме навреме при животни в нужда, да осигуряваме спокойна среда и да свързваме хората с отговорни начини за помощ. Вярваме, че добрата грижа започва с внимание, постоянство и ясна отговорност.',
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

      <section className="about-page-intro">
        <article>
          <h2>За приюта</h2>
          <p>
            Animal Shelter е приют, който приема животни в нужда, осигурява временна грижа, медицинско наблюдение и
            спокойна среда за възстановяване. Екипът има опит с различни случаи и е подготвен да реагира при сигнали за
            пострадали, изоставени или рискови животни.
          </p>

          <Link className="animals-primary-action about-page-contact-button" to="/svurji-se-s-nas">
            Свържи се с нас
          </Link>
        </article>
      </section>

      <section className="about-page-work-card">
        <h2>Работа и грижа</h2>
        <p>
          В приюта животните получават храна, подслон, наблюдение и индивидуална грижа според състоянието си. Работата
          включва първоначална оценка, лечение, социализация и подготовка за осиновяване. Условията са организирани така,
          че всяко животно да има безопасно място, чиста среда и достатъчно внимание. Когато случаят го изисква, екипът
          координира транспорт, прегледи и последваща грижа.
        </p>
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
