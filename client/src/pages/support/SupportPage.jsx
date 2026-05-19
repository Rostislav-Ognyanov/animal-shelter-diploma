import { Link } from 'react-router-dom';

const SUPPORT_OPTIONS = [
  {
    title: 'Дарение',
    description:
      'Даренията помагат за храна, лекарства, консумативи, транспорт и спешна ветеринарна грижа. Дори малка сума може да покрие част от лечението или ежедневната грижа за животно в нужда.',
    actionLabel: 'Заяви дарение',
    to: '/donations',
  },
  {
    title: 'Осиновяване',
    description:
      'Осиновяването дава дом на конкретно животно и освобождава място за следващ случай. Така помощта е двойна: едно животно получава семейство, а приютът може да приеме друго в риск.',
    actionLabel: 'Към осиновяване',
    to: '/search',
  },
  {
    title: 'Доброволчество',
    description:
      'Доброволците помагат с разходки, почистване, транспорт, събития, административна подкрепа и грижа за животните. Това спестява време на екипа и прави ежедневната работа по-стабилна.',
    actionLabel: 'Стани доброволец',
    to: '/volunteers',
  },
];

export function SupportPage() {
  return (
    <main className="route-shell support-page-shell">
      <section className="support-page-hero">
        <div>
          <h1>Подкрепа</h1>
          <p>
            Помощта към приюта може да бъде финансова, практическа или чрез осиновяване. Всяко действие подкрепя
            ежедневната грижа, лечението и намирането на сигурен дом за животните.
          </p>
        </div>
      </section>

      <section className="support-page-impact">
        <article>
          <strong>Десетки до стотици случаи годишно</strong>
          <p>
            Приютите получават сигнали за изоставени, пострадали, болни или изгубени животни през цялата година. Част
            от тях имат нужда от бърза реакция, транспорт, преглед и временно настаняване.
          </p>
        </article>

        <article>
          <strong>Как приютът помага</strong>
          <p>
            Екипът приема сигналите, преценява спешността, организира грижа, лечение и наблюдение, а след възстановяване
            подготвя животните за осиновяване или подходящо дългосрочно решение.
          </p>
        </article>
      </section>

      <section className="support-page-grid">
        {SUPPORT_OPTIONS.map((option) => (
          <article key={option.title} className="support-page-card">
            <h2>{option.title}</h2>
            <p>{option.description}</p>
            <Link className="animals-primary-action" to={option.to}>
              {option.actionLabel}
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
