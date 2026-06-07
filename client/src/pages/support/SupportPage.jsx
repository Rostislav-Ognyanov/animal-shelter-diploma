import { Fragment } from 'react';
import { Link } from 'react-router-dom';

import { buildPublicAssetPath } from '../../lib/publicAssetPath.js';

const SUPPORT_OPTIONS = [
  {
    title: 'Дарение',
    description:
      'С всяко дарение помагате на приюта да осигури храна, лечение, подслон и ежедневна грижа за животните в нужда. Дори малката подкрепа има значение, защото ни позволява да реагираме по-бързо в трудни ситуации и да осигурим по-добри условия за животните, които разчитат на нас.',
    actionLabel: 'Заяви дарение',
    imageAlt: 'Дарение в подкрепа на животните в приюта',
    imagePath: 'images/page_images/support_donation.avif',
    to: '/donations',
  },
  {
    title: 'Осиновяване',
    description:
      'Осиновяването е един от най-ценните начини да помогнете, защото дава на животното сигурност, дом и шанс за ново начало. Когато осиновите животно, вие не само променяте неговия живот, но и освобождавате място за помощ към друго животно в нужда.',
    actionLabel: 'Към осиновяване',
    imageAlt: 'Осиновяване на животно от приюта',
    imagePath: 'images/page_images/support_adoption.webp',
    to: '/search',
  },
  {
    title: 'Доброволчество',
    description:
      'Като доброволец можете да станете активна част от грижата за животните и ежедневната работа на приюта. С време, внимание и желание за помощ вие подкрепяте дейности като хранене, разходки, почистване, организация на събития и създаване на по-добра среда за животните.',
    actionLabel: 'Стани доброволец',
    imageAlt: 'Доброволчество и грижа за животните',
    imagePath: 'images/page_images/support_volunteering.jpg',
    to: '/volunteers',
  },
];

export function SupportPage() {
  return (
    <main className="route-shell support-page-shell">
      <section className="support-page-hero">
        <div>
          <h1>Как можеш да си съпричастен</h1>
        </div>
      </section>

      <section className="support-page-story-block about-page-story-block">
        <div className="about-page-split-inner about-page-story-row">
          <article className="about-page-split-copy">
            <h2>Животни в нужда от приют</h2>
            <p>
              Много животни попадат в приют след изоставяне, живот на улицата, лоши условия, липса на грижа или след
              преживени травми и наранявания. Част от тях се нуждаят от спешна медицинска помощ, други — от спокойна
              среда, време и внимание, за да възвърнат доверието си към хората. Зад всеки такъв случай стои история на
              несигурност, страх или пренебрежение, но и възможност за ново начало, когато навременната помощ достигне
              до животното.
            </p>
          </article>

          <figure className="about-page-split-image">
            <img
              src={buildPublicAssetPath('images/page_images/support_hero1.jpg')}
              alt="Животно в нужда от грижа и приют"
            />
          </figure>
        </div>

        <div className="about-page-story-divider" aria-hidden="true" />

        <div className="about-page-split-inner about-page-story-row about-page-story-row-reversed">
          <figure className="about-page-split-image">
            <img
              src={buildPublicAssetPath('images/page_images/support_hero2.webp')}
              alt="Грижа и подкрепа за животни в приюта"
            />
          </figure>

          <article className="about-page-split-copy">
            <h2>Как приютът помага</h2>
            <p>
              Нашият приют помага на тези животни, като им осигурява безопасно място, ежедневна грижа, храна,
              медицинско наблюдение и подкрепа по пътя към възстановяването. Освен непосредствената помощ, ние работим
              и за това всяко животно да получи шанс за осиновяване, социализация и по-добър живот в спокойна и любяща
              среда. С подкрепата на доброволци, дарители и съпричастни хора можем да достигнем до повече случаи и да
              дадем реална възможност за промяна.
            </p>
          </article>
        </div>

        <div className="about-page-story-divider" aria-hidden="true" />

        {SUPPORT_OPTIONS.map((option, index) => (
          <Fragment key={option.title}>
            {index > 0 ? <div className="about-page-story-divider" aria-hidden="true" /> : null}
            <div className="about-page-split-inner about-page-story-row support-page-action-row">
              <article className="about-page-split-copy support-page-action-copy">
                <h2>{option.title}</h2>
                <p>{option.description}</p>
                <Link className="about-page-contact-link" to={option.to}>
                  {option.actionLabel}
                </Link>
              </article>

              <figure className="about-page-split-image support-page-action-image">
                <img src={buildPublicAssetPath(option.imagePath)} alt={option.imageAlt} />
              </figure>
            </div>
          </Fragment>
        ))}
      </section>
    </main>
  );
}
