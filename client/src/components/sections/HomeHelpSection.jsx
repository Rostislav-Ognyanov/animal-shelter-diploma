import { Link } from 'react-router-dom';

function VolunteerIcon() {
  return (
    <svg className="home-help-icon" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M17 39c5-2 10-1 15 3 5-4 10-5 15-3" />
      <path d="M19 42c2 8 8 12 13 12s11-4 13-12" />
      <path d="M32 38c-4-7-14-5-14 3" />
      <path d="M32 38c4-7 14-5 14 3" />
      <path d="M25 24c0 3-2 5-5 5s-5-2-5-5 2-5 5-5 5 2 5 5Z" />
      <path d="M49 24c0 3-2 5-5 5s-5-2-5-5 2-5 5-5 5 2 5 5Z" />
      <path d="M36 18c0 3-2 5-4 5s-4-2-4-5 2-5 4-5 4 2 4 5Z" />
    </svg>
  );
}

function DonationIcon() {
  return (
    <svg className="home-help-icon" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M20 34h24" />
      <path d="M23 34v17h18V34" />
      <path d="M18 26h28v8H18z" />
      <path d="M32 26v25" />
      <path d="M32 17c-2-6-11-4-11 2 0 7 11 11 11 11s11-4 11-11c0-6-9-8-11-2Z" />
      <path d="M47 41c4 1 7 3 7 6 0 4-6 7-14 7" />
      <path d="M17 41c-4 1-7 3-7 6 0 4 6 7 14 7" />
    </svg>
  );
}

export function HomeHelpSection() {
  return (
    <section className="home-help-section" aria-label="Начини за помощ">
      <div className="section-container">
        <div className="home-help-grid">
          <article className="home-help-panel home-help-panel-volunteer">
            <VolunteerIcon />
            <h2>Доброволствай при нас</h2>
            <p>
              Доброволците помагат с грижа за животните, разходки, транспорт, кампании и ежедневна поддръжка.
              Ако искаш да отделиш време и внимание, ще намерим подходяща дейност според възможностите ти.
            </p>
            <Link className="about-page-contact-link home-help-link" to="/volunteers">
              Стани доброволец
            </Link>
          </article>

          <article className="home-help-panel home-help-panel-donation">
            <DonationIcon />
            <h2>Дари, за да спасиш животи</h2>
            <p>
              Даренията покриват храна, лекарства, консумативи и спешна грижа за животни в нужда. Дори малък
              принос помага на екипа да реагира по-бързо и да осигури по-добри условия.
            </p>
            <Link className="about-page-contact-link home-help-link" to="/donations">
              Заяви дарение
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}
