import {
  ADOPTION_ANIMAL_ALLERGY_LABELS,
  ADOPTION_ANIMAL_LIVING_PLACE_LABELS,
  ADOPTION_HOUSING_TYPE_LABELS,
  ADOPTION_OTHER_PET_CARE_STATUS_LABELS,
  ADOPTION_OTHER_PET_SEX_LABELS,
  ADOPTION_OTHER_PET_SPECIES_LABELS,
  ADOPTION_STATUS_LABELS,
  ADOPTION_STATUS_TRANSITIONS,
  ADOPTION_TRANSPORT_LABELS,
  ADOPTION_YARD_SECURITY_LABELS,
} from '../../../../shared/domain/adoptionConstants.js';
import { isTerminalWorkflowStatus } from '../../../../shared/domain/workflowStatus.js';

export { ADOPTION_STATUS_LABELS, ADOPTION_STATUS_TRANSITIONS };

export const ADOPTION_STATUS_OPTIONS = Object.entries(ADOPTION_STATUS_LABELS).map(
  ([value, label]) => ({ value, label })
);

const HOUSING_TYPE_LABELS = ADOPTION_HOUSING_TYPE_LABELS;
const YARD_SECURITY_LABELS = ADOPTION_YARD_SECURITY_LABELS;
const ANIMAL_LIVING_PLACE_LABELS = ADOPTION_ANIMAL_LIVING_PLACE_LABELS;
const ANIMAL_ALLERGY_LABELS = ADOPTION_ANIMAL_ALLERGY_LABELS;
const OTHER_PET_SPECIES_LABELS = ADOPTION_OTHER_PET_SPECIES_LABELS;
const PET_SEX_LABELS = ADOPTION_OTHER_PET_SEX_LABELS;
const CARE_STATUS_LABELS = ADOPTION_OTHER_PET_CARE_STATUS_LABELS;
const ANIMAL_TRANSPORT_LABELS = ADOPTION_TRANSPORT_LABELS;

export function buildAdoptionListQuery(status, page, limit, search = '') {
  const params = new URLSearchParams();

  if (status) {
    params.set('status', status);
  }

  if (search?.trim()) {
    params.set('search', search.trim());
  }

  if (page) {
    params.set('page', String(page));
  }

  if (limit) {
    params.set('limit', String(limit));
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

export function getAdoptionStatusLabel(status) {
  return ADOPTION_STATUS_LABELS[status] ?? status;
}

export function getAdoptionStatusTransitions(status) {
  return [...(ADOPTION_STATUS_TRANSITIONS[status] ?? [])];
}

export function isAdoptionTerminalStatus(status) {
  return isTerminalWorkflowStatus(status, ADOPTION_STATUS_TRANSITIONS);
}

export function getHousingTypeLabel(value) {
  return HOUSING_TYPE_LABELS[value] ?? value ?? 'Няма данни';
}

export function getYesNoLabel(value) {
  if (value === true || value === 'yes') {
    return 'Да';
  }

  if (value === false || value === 'no') {
    return 'Не';
  }

  return 'Няма данни';
}

export function getYardSecurityLabel(value) {
  return YARD_SECURITY_LABELS[value] ?? value ?? 'Няма данни';
}

export function getAnimalLivingPlaceLabel(value) {
  return ANIMAL_LIVING_PLACE_LABELS[value] ?? value ?? 'Няма данни';
}

export function getAnimalAllergyLabel(value) {
  return ANIMAL_ALLERGY_LABELS[value] ?? value ?? 'Няма данни';
}

export function getOtherPetSpeciesLabel(value, otherSpecies = '') {
  if (value === 'other' && otherSpecies) {
    return otherSpecies;
  }

  return OTHER_PET_SPECIES_LABELS[value] ?? value ?? 'Няма данни';
}

export function getPetSexLabel(value) {
  return PET_SEX_LABELS[value] ?? value ?? 'Няма данни';
}

export function getCareStatusLabel(value) {
  return CARE_STATUS_LABELS[value] ?? value ?? 'Няма данни';
}

export function getAnimalTransportLabel(value) {
  return ANIMAL_TRANSPORT_LABELS[value] ?? value ?? 'Няма данни';
}

export function formatAdoptionDate(value) {
  if (!value) {
    return 'Няма данни';
  }

  try {
    return new Intl.DateTimeFormat('bg-BG', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function getAnimalDisplayName(animal) {
  return animal?.displayName || animal?.name || 'Животно';
}

export function getUserDisplayName(user) {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  return fullName || user?.username || user?.email || 'Потребител';
}

export function isStaffRole(role) {
  return role === 'employee' || role === 'admin';
}

export function getAdoptionStatusGuidance(status, role = 'client') {
  if (role === 'client') {
    switch (status) {
      case 'pending':
        return 'Заявката е изпратена и очаква първоначален преглед от екипа на приюта.';
      case 'under-review':
        return 'Екипът разглежда данните ти и може да се свърже с теб за уточнения.';
      case 'approved':
        return 'Заявката е одобрена. Следва уточняване на финалните стъпки по осиновяването.';
      case 'rejected':
        return 'Заявката е приключила с отказ. При нужда можеш да разгледаш други животни и да подадеш нова заявка.';
      case 'cancelled':
        return 'Заявката е отменена и вече не участва в активния процес по осиновяване.';
      case 'completed':
        return 'Процесът е завършен успешно и осиновяването е отбелязано в системата.';
      default:
        return 'Следи статуса на заявката тук. При промяна ще виждаш актуалната информация в тази страница.';
    }
  }

  switch (status) {
    case 'pending':
      return 'Заявката е нова и очаква първично служебно разглеждане.';
    case 'under-review':
      return 'Заявката е в активен преглед. При нужда добави вътрешна бележка към статуса.';
    case 'approved':
      return 'Заявката е одобрена и очаква финализиране на осиновяването.';
    case 'rejected':
      return 'Заявката е приключила с отказ и не изисква допълнителни действия.';
    case 'cancelled':
      return 'Заявката е отменена от клиента или служебно и вече не е активна.';
    case 'completed':
      return 'Процесът е завършен и осиновяването е отбелязано като успешно.';
    default:
      return 'Прегледай детайлите и актуализирай статуса само когато има реална промяна в процеса.';
  }
}
