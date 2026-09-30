import 'dotenv/config';

import mongoose from 'mongoose';

import PageContent from '../models/PageContent.js';
import LegalContent from '../models/LegalContent.js';
import RescueStory from '../models/RescueStory.js';
import SiteSettings from '../models/SiteSettings.js';
import SpeciesContent from '../models/SpeciesContent.js';
import { connectToDatabase } from '../config/db.js';
import { DEFAULT_RESCUE_STORIES } from '../../shared/content-defaults/rescueStoriesData.js';
import { DEFAULT_SPECIES_CONTENT } from '../../shared/content-defaults/speciesContentData.js';
import { DEFAULT_PAGE_CONTENT } from '../../shared/content-defaults/pageContentDefaults.js';
import { DEFAULT_LEGAL_CONTENT } from '../../shared/content-defaults/legalContentDefaults.js';
import {
  SITE_SETTINGS_DEFAULTS,
  SITE_SETTINGS_KEY,
} from '../../shared/domain/siteSettingsConstants.js';

const PAGE_CONTENT_TEXT_MIGRATIONS = new Map([
  ['Дарете, за да спасите животи', 'Дари, за да спасиш животи'],
  ['Как можете да бъдете съпричастни', 'Как можеш да си съпричастен'],
  [
    'С всяко дарение помагате на приюта да осигури храна, лечение, подслон и ежедневна грижа за животните в нужда.',
    'С всяко дарение помагаш на приюта да осигури храна, лечение, подслон и ежедневна грижа за животните в нужда.',
  ],
  [
    'Като доброволец можете да станете активна част от ежедневната грижа за животните и работата на приюта.',
    'Като доброволец можеш да станеш активна част от ежедневната грижа за животните и работата на приюта.',
  ],
  [
    'В приюта живеят различни видове животни, всяко със своя характер, нужди и история. На тази страница можете да научите повече за основните видове животни в приюта, за техния начин на живот, поведение и нужди. Целта на тази информация е да помогне на всеки посетител по-лесно да се ориентира и да направи по-отговорен избор.',
    'В приюта живеят различни видове животни, всяко със своя характер, нужди и история. На тази страница можеш да научиш повече за основните видове животни в приюта, за техния начин на живот, поведение и нужди. Целта на тази информация е да помогне на всеки посетител по-лесно да се ориентира и да направи по-отговорен избор.',
  ],
  [
    'Разгледайте основните видове животни в приюта и научете повече за техните особености, поведение и нужди.',
    'Разгледай основните видове животни в приюта и научи повече за техните особености, поведение и нужди.',
  ],
  ['Вижте повече', 'Виж повече'],
  ['Искате ли да научите повече за животните?', 'Искаш ли да научиш повече за животните?'],
  [
    'В страниците с факти за животните ще научите много любопитни факти за живота и поведението на всеки вид, в домашни условия или в природата.',
    'В страниците с факти за животните ще научиш много любопитни факти за живота и поведението на всеки вид, в домашни условия или в природата.',
  ],
  [
    'Няма истории, които да съвпадат с избраните филтри. Опитайте с друг вид животно или статус.',
    'Няма истории, които да съвпадат с избраните филтри. Опитай с друг вид животно или статус.',
  ],
  ['Искате ли и вие да помогнете?', 'Искаш ли и ти да помогнеш?'],
  ['Вижте как', 'Виж как'],
  ['Кандидатствайте за доброволец', 'Кандидатствай за доброволец'],
  ['Обичате животните и искате да помогнете с грижи?', 'Обичаш животните и искаш да помогнеш с грижи?'],
  [
    'Като доброволец можете да станете истинска част от ежедневната грижа за животните в приюта и да помогнете там, където има най-голяма нужда. С времето, вниманието и желанието си за помощ ще допринесете за по-добра среда, повече спокойствие и повече шанс за възстановяване на животните, които разчитат на нас.',
    'Като доброволец можеш да станеш истинска част от ежедневната грижа за животните в приюта и да помогнеш там, където има най-голяма нужда. С времето, вниманието и желанието си за помощ ще допринесеш за по-добра среда, повече спокойствие и повече шанс за възстановяване на животните, които разчитат на нас.',
  ],
  [
    'Попълнете формата по-долу, за да ни разкажете с какво и кога бихте искали да помагате.',
    'Попълни формата по-долу, за да ни разкажеш с какво и кога би искал да помагаш.',
  ],
  [
    'Всяко дарение към {siteName} е подкрепа не само за животните, но и за ежедневните усилия на хората, които се грижат за тях с внимание, търпение и истинска отдаденост. Когато дарявате, вие помагате тази грижа да продължи и давате възможност на приюта да достига до още повече животни в нужда.',
    'Всяко дарение към {siteName} е подкрепа не само за животните, но и за ежедневните усилия на хората, които се грижат за тях с внимание, търпение и истинска отдаденост. Когато даряваш, ти помагаш тази грижа да продължи и даваш възможност на приюта да достига до още повече животни в нужда.',
  ],
  [
    'Ако имате въпрос, нужда от съдействие или искате да подадете сигнал за животно в нужда, можете да се свържете с нас по всяко време чрез тази страница. За нас е важно всяко съобщение да достигне до правилното място, за да може помощта да бъде по-бърза и по-ефективна.',
    'Ако имаш въпрос, нужда от съдействие или искаш да подадеш сигнал за животно в нужда, можеш да се свържеш с нас по всяко време чрез тази страница. За нас е важно всяко съобщение да достигне до правилното място, за да може помощта да бъде по-бърза и по-ефективна.',
  ],
  [
    'Можете да се свържете с нас по телефон, имейл или чрез формата на тази страница. При необходимост от по-бърза реакция е препоръчително да предоставите възможно най-точни данни за случая.',
    'Можеш да се свържеш с нас по телефон, имейл или чрез формата на тази страница. При необходимост от по-бърза реакция е препоръчително да предоставиш възможно най-точни данни за случая.',
  ],
  [
    'Изберете най-подходящия тип запитване, за да ни помогнете да насочим информацията по-бързо към правилния екип.',
    'Избери най-подходящия тип запитване, за да ни помогнеш да насочим информацията по-бързо към правилния екип.',
  ],
  ['Изберете с какво е свързана нуждата', 'Избери с какво е свързана нуждата'],
  [
    'Попълнете формата по-долу с възможно най-точна информация, за да можем да реагираме по-подходящо и навреме.',
    'Попълни формата по-долу с възможно най-точна информация, за да можем да реагираме по-подходящо и навреме.',
  ],
]);

const SPECIES_CONTENT_TEXT_MIGRATIONS = new Map([
  [
    'Ако животното е в тежко състояние, приютът може да насочи случая към по-бърза реакция. Подайте сигнал с точно местоположение, описание на състоянието и по възможност снимка.',
    'Ако животното е в тежко състояние, приютът може да насочи случая към по-бърза реакция. Подай сигнал с точно местоположение, описание на състоянието и по възможност снимка.',
  ],
  [
    'Ако откриете малко коте само, първо наблюдавайте внимателно дали майката не е наблизо.',
    'Ако откриеш малко коте само, първо наблюдавай внимателно дали майката не е наблизо.',
  ],
  [
    'Ако изглежда дезориентирано или не бяга, най-вероятно не може да се справи само. Подайте сигнал с местоположение и описание на състоянието. Приютът може да помогне с временно настаняване, грижа и търсене на дом.',
    'Ако изглежда дезориентирано или не бяга, най-вероятно не може да се справи само. Подай сигнал с местоположение и описание на състоянието. Приютът може да помогне с временно настаняване, грижа и търсене на дом.',
  ],
  [
    'Ако е обезводнен или се намира в неподходяща среда, не поемайте грижата без реална подготовка за неговия вид. Осигурявайте правилна температура, светлина, влажност и терариум.',
    'Ако е обезводнен или се намира в неподходяща среда, не поемай грижата без реална подготовка за неговия вид. Осигурявай правилна температура, светлина, влажност и терариум.',
  ],
  [
    'Приютът или спасителният екип могат да насочат действията според случая. Можете да помогнете чрез дарения и подкрепа за рехабилитация и лечение на диви птици.',
    'Приютът или спасителният екип могат да насочат действията според случая. Можеш да помогнеш чрез дарения и подкрепа за рехабилитация и лечение на диви птици.',
  ],
  [
    'При нужда от транспорт или придвижване това трябва да се случва внимателно и при възможност с помощ от подготвени хора. Осигурявайте подходящи условия, движение, поддръжка и ветеринарна грижа.',
    'При нужда от транспорт или придвижване това трябва да се случва внимателно и при възможност с помощ от подготвени хора. Осигурявай подходящи условия, движение, поддръжка и ветеринарна грижа.',
  ],
  [
    'Ако е без надзор на неподходящо място или изглежда занемарен, това също е сериозен знак за риск. Не поемайте грижа за кон без реални възможности за пространство, ресурси и дългосрочна поддръжка.',
    'Ако е без надзор на неподходящо място или изглежда занемарен, това също е сериозен знак за риск. Не поемай грижа за кон без реални възможности за пространство, ресурси и дългосрочна поддръжка.',
  ],
  [
    'Избягвайте опасни мрежи, капани и неподходящи практики в дворове и градини. Оставяйте безопасни укрития и проходи в зелените пространства. Бъдете внимателни при използване на градинска техника и химикали.',
    'Избягвай опасни мрежи, капани и неподходящи практики в дворове и градини. Оставяй безопасни укрития и проходи в зелените пространства. Бъди внимателен при използване на градинска техника и химикали.',
  ],
  [
    'Ако кучето е ранено, не се опитвайте да го принуждавате да става. Не го притискайте и не правете резки движения, а му осигурете спокойствие, вода и храна, ако това е безопасно.',
    'Ако кучето е ранено, не се опитвай да го принуждаваш да става. Не го притискай и не прави резки движения, а му осигури спокойствие, вода и храна, ако това е безопасно.',
  ],
  [
    'Ако кучето позволява контакт, може да му дадете малко подходяща храна. При нужда от транспорт използвайте спокойни движения и защитено пространство, без да насилвате животното.',
    'Ако кучето позволява контакт, може да му дадеш малко подходяща храна. При нужда от транспорт използвай спокойни движения и защитено пространство, без да насилваш животното.',
  ],
  [
    'Не изоставяйте животно при промяна в житейската ситуация. Търсете отговорно решение и помощ навреме, осигурявайте редовна грижа, кастрация и безопасна среда и не допускайте кучето да се движи безконтролно край пътища и опасни места.',
    'Не изоставяй животно при промяна в житейската ситуация. Търси отговорно решение и помощ навреме, осигурявай редовна грижа, кастрация и безопасна среда и не допускай кучето да се движи безконтролно край пътища и опасни места.',
  ],
  [
    'Ако срещнете навън наранена или болна котка, осигурете вода, тихо място и защитена кутия или преносител, ако животното позволява.',
    'Ако срещнеш навън наранена или болна котка, осигури вода, тихо място и защитена кутия или преносител, ако животното позволява.',
  ],
  ['Давайте храна в малки количества и не насилвайте контакта.', 'Давай храна в малки количества и не насилвай контакта.'],
  [
    'Ако котката е видимо болна или не може да се движи добре, подайте сигнал възможно най-бързо. Приютът може да помогне при случаи на лечение, временна грижа или търсене на дом.',
    'Ако котката е видимо болна или не може да се движи добре, подай сигнал възможно най-бързо. Приютът може да помогне при случаи на лечение, временна грижа или търсене на дом.',
  ],
  [
    'Ако срещнете домашно зайче навън и то изглежда изтощено, намокрено, стои неподвижно или е видимо наранено, осигурете тихо място, вода и защитено пространство.',
    'Ако срещнеш домашно зайче навън и то изглежда изтощено, намокрено, стои неподвижно или е видимо наранено, осигури тихо място, вода и защитено пространство.',
  ],
  [
    'Не вземайте зайче импулсивно без подготовка за дългосрочна грижа. Не допускайте домашно зайче да бъде изоставено навън.',
    'Не вземай зайче импулсивно без подготовка за дългосрочна грижа. Не допускай домашно зайче да бъде изоставено навън.',
  ],
  [
    'Ако срещнете диво зайче навън, не го вдигайте грубо и не го плашете. Осигурете му спокойствие и храна, ако видимо се нуждае.',
    'Ако срещнеш диво зайче навън, не го вдигай грубо и не го плаши. Осигури му спокойствие и храна, ако видимо се нуждае.',
  ],
  [
    'Ако срещнете лисица навън, която е наранена, блъсната или стои дезориентирана, тя вероятно има нужда от помощ. Най-често най-добрата временна помощ е дистанция, спокойствие и липса на излишен контакт.',
    'Ако срещнеш лисица навън, която е наранена, блъсната или стои дезориентирана, тя вероятно има нужда от помощ. Най-често най-добрата временна помощ е дистанция, спокойствие и липса на излишен контакт.',
  ],
  [
    'Дори и да е изтощена или да изглежда необичайно близо до хора, не я хранете и не я дръжте като домашно животно. Не се опитвайте да я хващате без нужда.',
    'Дори и да е изтощена или да изглежда необичайно близо до хора, не я храни и не я дръж като домашно животно. Не се опитвай да я хващаш без нужда.',
  ],
  [
    'Не оставяйте лесен достъп до отпадъци и храна, които приближават дивите животни към опасна човешка среда. Уважавайте естественото местообитание и не поощрявайте привикването на диви животни към хора.',
    'Не оставяй лесен достъп до отпадъци и храна, които приближават дивите животни към опасна човешка среда. Уважавай естественото местообитание и не поощрявай привикването на диви животни към хора.',
  ],
  [
    'Ако не може да се отдалечи, добра идея е да подадете сигнал. Приютът или спасителният екип могат да преценят дали е нужна намеса и рехабилитация.',
    'Ако не може да се отдалечи, добра идея е да подадеш сигнал. Приютът или спасителният екип могат да преценят дали е нужна намеса и рехабилитация.',
  ],
  [
    'Рядко ще срещнете някой от описаните видове навън в България, но в подобни случаи най-често става дума за изоставяне или бягство. В подобна ситуация най-добре е да подадете сигнал в приют.',
    'Рядко ще срещнеш някой от описаните видове навън в България, но в подобни случаи най-често става дума за изоставяне или бягство. В подобна ситуация най-добре е да подадеш сигнал в приют.',
  ],
  [
    'Ако срещнете гущер навън и той изглежда ранен или не може да се движи нормално, не го оставяйте изложен на жега, студ или стрес.',
    'Ако срещнеш гущер навън и той изглежда ранен или не може да се движи нормално, не го оставяй изложен на жега, студ или стрес.',
  ],
  [
    'Не допускайте изоставяне или освобождаване на екзотични животни в неподходяща среда. Приютът може да насочи случая към правилна временна грижа или специализиран подход.',
    'Не допускай изоставяне или освобождаване на екзотични животни в неподходяща среда. Приютът може да насочи случая към правилна временна грижа или специализиран подход.',
  ],
  [
    'Ако срещнете сова навън и тя е ранена и не отлита, не се опитвайте да я държите дълго или да я стресирате. Осигурете тишина, сигурност и минимален контакт.',
    'Ако срещнеш сова навън и тя е ранена и не отлита, не се опитвай да я държиш дълго или да я стресираш. Осигури тишина, сигурност и минимален контакт.',
  ],
  [
    'Ако птицата е отслабена и не реагира нормално, не я хранете произволно и не я излагайте на светлина, шум и допълнителен стрес. Първо се уверете, че храната и нейното количество са правилни за ситуацията. При липса на знания и подготовка се обадете в приют и потърсете помощ.',
    'Ако птицата е отслабена и не реагира нормално, не я храни произволно и не я излагай на светлина, шум и допълнителен стрес. Първо се увери, че храната и нейното количество са правилни за ситуацията. При липса на знания и подготовка се обади в приют и потърси помощ.',
  ],
  [
    'Намалявайте рисковете от удари в стъкла и опасни съоръжения, когато това е възможно. Подкрепяйте опазването на естествени и спокойни пространства и не се доближавайте излишно до диви птици в съмнително състояние.',
    'Намалявай рисковете от удари в стъкла и опасни съоръжения, когато това е възможно. Подкрепяй опазването на естествени и спокойни пространства и не се доближавай излишно до диви птици в съмнително състояние.',
  ],
  [
    'Ако срещнете кон навън, който е наранен или много отслабнал, осигурете спокойствие, безопасно пространство и вода.',
    'Ако срещнеш кон навън, който е наранен или много отслабнал, осигури спокойствие, безопасно пространство и вода.',
  ],
  [
    'Ако конят е дезориентиран или в опасна среда, подайте сигнал. Приютът може да помогне при оценка на случая, временно настаняване или лечение. Подкрепата чрез дарения за храна, рехабилитация и поддръжка е особено важна за големи животни като конете.',
    'Ако конят е дезориентиран или в опасна среда, подай сигнал. Приютът може да помогне при оценка на случая, временно настаняване или лечение. Подкрепата чрез дарения за храна, рехабилитация и поддръжка е особено важна за големи животни като конете.',
  ],
  [
    'Ако срещнете таралеж навън, който е ранен и се движи трудно, осигурете спокойствие, защитено място и, ако е нужно, вода.',
    'Ако срещнеш таралеж навън, който е ранен и се движи трудно, осигури спокойствие, защитено място и, ако е нужно, вода.',
  ],
  [
    'Ако е много малък, слаб или не реагира нормално, това също е знак за риск. Ако е необходимо временно прибиране, използвайте безопасна кутия и потърсете помощ възможно най-скоро.',
    'Ако е много малък, слаб или не реагира нормално, това също е знак за риск. Ако е необходимо временно прибиране, използвай безопасна кутия и потърси помощ възможно най-скоро.',
  ],
  [
    'Ако таралежът стои на открито дълго време или изглежда изтощен, подайте сигнал в приют. Не го местете излишно и не го излагайте на шум и стрес. Приютът или спасителният екип могат да преценят нуждата от рехабилитация и грижа.',
    'Ако таралежът стои на открито дълго време или изглежда изтощен, подай сигнал в приют. Не го мести излишно и не го излагай на шум и стрес. Приютът или спасителният екип могат да преценят нуждата от рехабилитация и грижа.',
  ],
]);

const LEGAL_CONTENT_TEXT_MIGRATIONS = new Map([
  [
    'В зависимост от начина, по който използвате платформата, могат да бъдат събирани следните данни:',
    'В зависимост от начина, по който използваш платформата, могат да бъдат събирани следните данни:',
  ],
  [
    'При въпроси относно поверителността или обработката на данни можете да се свържете с екипа чрез страницата „Свържете се с нас“.',
    'При въпроси относно поверителността или обработката на данни можеш да се свържеш с екипа чрез страницата „Свържи се с нас“.',
  ],
  [
    'При въпроси относно използването на платформата можете да се свържете с екипа чрез страницата „Свържете се с нас“.',
    'При въпроси относно използването на платформата можеш да се свържеш с екипа чрез страницата „Свържи се с нас“.',
  ],
]);

const LEGACY_LEGAL_CONTACT_SECTION_TITLES = Object.freeze({
  privacy: '9. Контакт',
  terms: '12. Контакт',
});

function toPublishedSpeciesSnapshot(speciesContent) {
  return {
    displayName: speciesContent.displayName,
    title: speciesContent.title,
    subtitle: speciesContent.subtitle,
    cardImageUrl: speciesContent.cardImageUrl,
    cardImageAlt: speciesContent.cardImageAlt,
    heroImageUrl: speciesContent.heroImageUrl,
    introduction: speciesContent.introduction,
    issues: speciesContent.issues,
    sections: speciesContent.sections,
  };
}

function toPublishedLegalSnapshot(legalContent) {
  return {
    title: legalContent.title,
    lastUpdatedLabel: legalContent.lastUpdatedLabel,
    intro: legalContent.intro,
    sections: legalContent.sections.map((section, index) => ({
      title: section.title,
      paragraphs: section.paragraphs ?? [],
      items: section.items ?? [],
      closing: section.closing ?? [],
      order: Number.isFinite(Number(section.order)) ? Number(section.order) : index,
      isVisible: section.isVisible !== false,
    })),
  };
}

function replaceLegacySearchLink(value) {
  if (value === '/search') {
    return { value: '/animals', changed: true };
  }

  if (Array.isArray(value)) {
    let changed = false;
    const nextValue = value.map((item) => {
      const result = replaceLegacySearchLink(item);
      changed = changed || result.changed;
      return result.value;
    });

    return { value: nextValue, changed };
  }

  if (value && typeof value === 'object') {
    let changed = false;
    const nextValue = Object.fromEntries(
      Object.entries(value).map(([key, item]) => {
        const result = replaceLegacySearchLink(item);
        changed = changed || result.changed;
        return [key, result.value];
      })
    );

    return { value: nextValue, changed };
  }

  return { value, changed: false };
}

function replaceMappedContentText(value, replacements) {
  if (typeof value === 'string' && replacements.has(value)) {
    return { value: replacements.get(value), changed: true };
  }

  if (Array.isArray(value)) {
    let changed = false;
    const nextValue = value.map((item) => {
      const result = replaceMappedContentText(item, replacements);
      changed = changed || result.changed;
      return result.value;
    });

    return { value: nextValue, changed };
  }

  if (value && typeof value === 'object') {
    let changed = false;
    const nextValue = Object.fromEntries(
      Object.entries(value).map(([key, item]) => {
        const result = replaceMappedContentText(item, replacements);
        changed = changed || result.changed;
        return [key, result.value];
      })
    );

    return { value: nextValue, changed };
  }

  return { value, changed: false };
}

async function seedPageContent() {
  await Promise.all(
    Object.entries(DEFAULT_PAGE_CONTENT).map(([pageKey, content]) =>
      PageContent.findOneAndUpdate(
        { pageKey },
        { $setOnInsert: { pageKey, content } },
        { upsert: true, runValidators: true }
      )
    )
  );
}

async function migrateLegacyPageContentLinks() {
  const records = await PageContent.find({}).lean();
  let migratedCount = 0;

  await Promise.all(
    records.map((record) => {
      const result = replaceLegacySearchLink(record.content);

      if (!result.changed) {
        return null;
      }

      migratedCount += 1;
      return PageContent.updateOne(
        { _id: record._id },
        { $set: { content: result.value } },
        { runValidators: true }
      );
    })
  );

  return migratedCount;
}

async function migrateLegacyPageContentTone() {
  const records = await PageContent.find({}).lean();
  let migratedCount = 0;

  await Promise.all(
    records.map((record) => {
      const result = replaceMappedContentText(record.content, PAGE_CONTENT_TEXT_MIGRATIONS);

      if (!result.changed) {
        return null;
      }

      migratedCount += 1;
      return PageContent.updateOne(
        { _id: record._id },
        { $set: { content: result.value } },
        { runValidators: true }
      );
    })
  );

  return migratedCount;
}

async function migrateSpeciesContentTone() {
  const records = await SpeciesContent.find({}).lean();
  let migratedCount = 0;

  await Promise.all(
    records.map((record) => {
      const draftResult = replaceMappedContentText(
        toPublishedSpeciesSnapshot(record),
        SPECIES_CONTENT_TEXT_MIGRATIONS
      );
      const publishedResult = replaceMappedContentText(
        record.publishedSnapshot,
        SPECIES_CONTENT_TEXT_MIGRATIONS
      );

      if (!draftResult.changed && !publishedResult.changed) {
        return null;
      }

      migratedCount += 1;
      const updatePayload = { ...draftResult.value };

      if (record.publishedSnapshot) {
        updatePayload.publishedSnapshot = publishedResult.value;
      }

      return SpeciesContent.updateOne(
        { _id: record._id },
        { $set: updatePayload },
        { runValidators: true }
      );
    })
  );

  return migratedCount;
}

async function migrateLegalContentTone() {
  const records = await LegalContent.find({}).lean();
  let migratedCount = 0;

  await Promise.all(
    records.map((record) => {
      const draftResult = replaceMappedContentText(
        {
          title: record.title,
          lastUpdatedLabel: record.lastUpdatedLabel,
          intro: record.intro,
          sections: record.sections,
        },
        LEGAL_CONTENT_TEXT_MIGRATIONS
      );
      const publishedResult = replaceMappedContentText(
        record.publishedSnapshot,
        LEGAL_CONTENT_TEXT_MIGRATIONS
      );

      if (!draftResult.changed && !publishedResult.changed) {
        return null;
      }

      migratedCount += 1;
      const updatePayload = { ...draftResult.value };

      if (record.publishedSnapshot) {
        updatePayload.publishedSnapshot = publishedResult.value;
      }

      return LegalContent.updateOne(
        { _id: record._id },
        { $set: updatePayload },
        { runValidators: true }
      );
    })
  );

  return migratedCount;
}

function removeLegacyLegalContactSection(snapshot, legacyTitle) {
  if (!snapshot || !Array.isArray(snapshot.sections)) {
    return { changed: false, value: snapshot };
  }

  const sections = snapshot.sections.filter((section) => section?.title !== legacyTitle);

  return {
    changed: sections.length !== snapshot.sections.length,
    value: {
      ...snapshot,
      sections,
    },
  };
}

async function migrateLegacyLegalContactSections() {
  const records = await LegalContent.find({
    legalKey: { $in: Object.keys(LEGACY_LEGAL_CONTACT_SECTION_TITLES) },
  }).lean();
  let migratedCount = 0;

  await Promise.all(
    records.map((record) => {
      const legacyTitle = LEGACY_LEGAL_CONTACT_SECTION_TITLES[record.legalKey];
      const draftResult = removeLegacyLegalContactSection(
        {
          title: record.title,
          lastUpdatedLabel: record.lastUpdatedLabel,
          intro: record.intro,
          sections: record.sections,
        },
        legacyTitle
      );
      const publishedResult = removeLegacyLegalContactSection(
        record.publishedSnapshot,
        legacyTitle
      );

      if (!draftResult.changed && !publishedResult.changed) {
        return null;
      }

      migratedCount += 1;
      const updatePayload = { ...draftResult.value };

      if (record.publishedSnapshot) {
        updatePayload.publishedSnapshot = publishedResult.value;
      }

      return LegalContent.updateOne(
        { _id: record._id },
        { $set: updatePayload },
        { runValidators: true }
      );
    })
  );

  return migratedCount;
}

async function migrateSpecialCareContactLabel() {
  const contactPage = await PageContent.findOne({ pageKey: 'contact' }).lean();
  const currentLabel = contactPage?.content?.contactTypeLabels?.['special-care']?.label;

  if (!['Специална грижа', 'Специална заявка'].includes(currentLabel)) {
    return false;
  }

  await PageContent.updateOne(
    { _id: contactPage._id },
    {
      $set: {
        'content.contactTypeLabels.special-care.label': 'Запитване за специална грижа',
      },
    },
    { runValidators: true }
  );

  return true;
}

async function seedLegalContent() {
  const now = new Date();

  await Promise.all(
    Object.values(DEFAULT_LEGAL_CONTENT).map((legalContent) => {
      const snapshot = toPublishedLegalSnapshot(legalContent);

      return LegalContent.findOneAndUpdate(
        { legalKey: legalContent.legalKey },
        {
          $setOnInsert: {
            ...snapshot,
            legalKey: legalContent.legalKey,
            status: 'published',
            version: 1,
            publishedSnapshot: snapshot,
            publishedAt: now,
          },
        },
        { upsert: true, runValidators: true }
      );
    })
  );
}

async function seedSpeciesContent() {
  const now = new Date();

  await Promise.all(
    DEFAULT_SPECIES_CONTENT.map((speciesContent) =>
      SpeciesContent.findOneAndUpdate(
        { species: speciesContent.species },
        {
          $setOnInsert: {
            ...toPublishedSpeciesSnapshot(speciesContent),
            species: speciesContent.species,
            isPublished: true,
            publishedSnapshot: toPublishedSpeciesSnapshot(speciesContent),
            publishedAt: now,
          },
        },
        { upsert: true, runValidators: true }
      )
    )
  );
}

async function seedRescueStories() {
  const now = new Date();

  await Promise.all(
    DEFAULT_RESCUE_STORIES.map((story) => {
      const { animalType, slug, ...insertFields } = story;

      return RescueStory.findOneAndUpdate(
        {
          $or: [{ slug }, { title: story.title }],
        },
        {
          $set: {
            animalType,
            slug,
          },
          $setOnInsert: {
            ...insertFields,
            publishedAt: story.isPublished ? now : null,
          },
        },
        { upsert: true, runValidators: true }
      );
    })
  );
}

async function seedSiteSettings() {
  await SiteSettings.findOneAndUpdate(
    { key: SITE_SETTINGS_KEY },
    { $setOnInsert: { key: SITE_SETTINGS_KEY, ...SITE_SETTINGS_DEFAULTS } },
    { upsert: true, runValidators: true }
  );
}

async function seedContent() {
  await connectToDatabase();
  await seedSiteSettings();
  await seedPageContent();
  const migratedPageContentCount = await migrateLegacyPageContentLinks();
  const migratedPageContentToneCount = await migrateLegacyPageContentTone();
  const migratedSpecialCareLabel = await migrateSpecialCareContactLabel();
  await seedLegalContent();
  const migratedLegalContentToneCount = await migrateLegalContentTone();
  const migratedLegalContactSectionCount = await migrateLegacyLegalContactSections();
  await seedSpeciesContent();
  const migratedSpeciesContentToneCount = await migrateSpeciesContentTone();
  await seedRescueStories();
  if (migratedPageContentCount > 0) {
    console.log(`Migrated ${migratedPageContentCount} page content record(s) from /search to /animals.`);
  }
  if (migratedPageContentToneCount > 0) {
    console.log(`Migrated ${migratedPageContentToneCount} page content record(s) to the informal public tone.`);
  }
  if (migratedLegalContentToneCount > 0) {
    console.log(`Migrated ${migratedLegalContentToneCount} legal content record(s) to the informal public tone.`);
  }
  if (migratedLegalContactSectionCount > 0) {
    console.log(`Removed duplicate contact sections from ${migratedLegalContactSectionCount} legal content record(s).`);
  }
  if (migratedSpeciesContentToneCount > 0) {
    console.log(`Migrated ${migratedSpeciesContentToneCount} species content record(s) to the informal public tone.`);
  }
  if (migratedSpecialCareLabel) {
    console.log('Migrated the legacy special-care contact label.');
  }
  console.log('Content seed completed.');
}

seedContent()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
