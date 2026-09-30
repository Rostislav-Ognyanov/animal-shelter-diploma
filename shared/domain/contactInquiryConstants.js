export const CONTACT_INQUIRY_TYPE_VALUES = Object.freeze([
  'adoption',
  'special-care',
  'volunteering',
  'donation',
  'general',
]);

export const CONTACT_INQUIRY_TYPE_LABELS = Object.freeze({
  adoption: 'Осиновяване',
  'special-care': 'Запитване за специална грижа',
  volunteering: 'Доброволчество',
  donation: 'Дарение',
  general: 'Общо запитване',
});

export const CONTACT_INQUIRY_STATUS_VALUES = Object.freeze([
  'pending',
  'under-review',
  'resolved',
]);

export const CONTACT_INQUIRY_STATUS_LABELS = Object.freeze({
  pending: 'В очакване',
  'under-review': 'В преглед',
  resolved: 'Решено',
});

export const CONTACT_INQUIRY_STATUS_TRANSITIONS = Object.freeze({
  pending: Object.freeze(['under-review']),
  'under-review': Object.freeze(['resolved']),
  resolved: Object.freeze([]),
});

export const CONTACT_INQUIRY_ADOPTION_SUBJECT_VALUES = Object.freeze([
  'adoption-process',
  'animal-details',
  'submitted-request',
  'other',
]);

export const CONTACT_INQUIRY_ADOPTION_SUBJECT_LABELS = Object.freeze({
  'adoption-process': 'Процес на осиновяване',
  'animal-details': 'Въпрос за конкретно животно',
  'submitted-request': 'Вече подадена заявка',
  other: 'Друго',
});

export const CONTACT_INQUIRY_SPECIAL_CARE_SUBJECT_VALUES = Object.freeze([
  'care-information',
  'support-options',
  'special-request',
]);

export const CONTACT_INQUIRY_SPECIAL_CARE_SUBJECT_LABELS = Object.freeze({
  'care-information': 'Информация за грижата',
  'support-options': 'Възможности за подкрепа',
  'special-request': 'Специална заявка',
});

export const CONTACT_INQUIRY_SPECIAL_CARE_ASSISTANCE_TYPE_VALUES = Object.freeze([
  'care-participation',
  'temporary-care',
  'transport',
  'professional-help',
  'material-help',
  'other',
]);

export const CONTACT_INQUIRY_SPECIAL_CARE_ASSISTANCE_TYPE_LABELS = Object.freeze({
  'care-participation': 'Участие в грижата за животното',
  'temporary-care': 'Временно настаняване / грижа',
  transport: 'Транспорт',
  'professional-help': 'Професионална или специализирана помощ',
  'material-help': 'Материална помощ',
  other: 'Друго',
});

export const CONTACT_INQUIRY_SPECIAL_CARE_AVAILABILITY_VALUES = Object.freeze([
  'weekdays',
  'weekends',
  'flexible',
  'one-time',
  'other',
]);

export const CONTACT_INQUIRY_SPECIAL_CARE_AVAILABILITY_LABELS = Object.freeze({
  weekdays: 'В делнични дни',
  weekends: 'През уикенда',
  flexible: 'Гъвкаво',
  'one-time': 'Еднократно',
  other: 'Друго',
});

export const CONTACT_INQUIRY_VOLUNTEER_SUBJECT_VALUES = Object.freeze([
  'animal-care',
  'walking',
  'transport',
  'events',
  'other',
]);

export const CONTACT_INQUIRY_VOLUNTEER_SUBJECT_LABELS = Object.freeze({
  'animal-care': 'Грижа за животни',
  walking: 'Разходки',
  transport: 'Транспорт',
  events: 'Събития и кампании',
  other: 'Друго',
});

export const CONTACT_INQUIRY_DONATION_TOPIC_VALUES = Object.freeze([
  'money',
  'food',
  'medicine',
  'materials',
  'other',
]);

export const CONTACT_INQUIRY_DONATION_TOPIC_LABELS = Object.freeze({
  money: 'Парично дарение',
  food: 'Храна',
  medicine: 'Лекарства и консумативи',
  materials: 'Материали и оборудване',
  other: 'Друго',
});

export const CONTACT_INQUIRY_TEXT_LIMITS = Object.freeze({
  name: 120,
  email: 254,
  phone: 32,
  subject: 200,
  description: 3000,
  animalName: 120,
  availability: 300,
  experienceDetails: 1500,
  donationTopic: 100,
  actorName: 161,
});
