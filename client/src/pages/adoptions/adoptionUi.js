export const ADOPTION_STATUS_OPTIONS = [
  { value: 'pending', label: 'В очакване' },
  { value: 'under-review', label: 'В преглед' },
  { value: 'approved', label: 'Одобрена' },
  { value: 'rejected', label: 'Отхвърлена' },
  { value: 'cancelled', label: 'Отменена' },
  { value: 'completed', label: 'Завършена' },
];

export const ADOPTION_STATUS_TRANSITIONS = {
  pending: ['under-review', 'approved', 'rejected', 'cancelled'],
  'under-review': ['approved', 'rejected', 'cancelled'],
  approved: ['completed', 'cancelled'],
  rejected: [],
  cancelled: [],
  completed: [],
};

const STATUS_LABEL_MAP = Object.fromEntries(
  ADOPTION_STATUS_OPTIONS.map((option) => [option.value, option.label])
);

export function buildAdoptionStatusQuery(status) {
  return status ? `?status=${encodeURIComponent(status)}` : '';
}

export function getAdoptionStatusLabel(status) {
  return STATUS_LABEL_MAP[status] ?? status;
}

export function getAdoptionStatusTransitions(status) {
  return ADOPTION_STATUS_TRANSITIONS[status] ?? [];
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
