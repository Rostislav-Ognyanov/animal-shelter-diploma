import {
  CONTACT_INQUIRY_ADOPTION_SUBJECT_LABELS,
  CONTACT_INQUIRY_DONATION_TOPIC_LABELS,
  CONTACT_INQUIRY_SPECIAL_CARE_ASSISTANCE_TYPE_LABELS,
  CONTACT_INQUIRY_SPECIAL_CARE_AVAILABILITY_LABELS,
  CONTACT_INQUIRY_SPECIAL_CARE_SUBJECT_LABELS,
  CONTACT_INQUIRY_STATUS_LABELS,
  CONTACT_INQUIRY_STATUS_TRANSITIONS,
  CONTACT_INQUIRY_TYPE_LABELS,
  CONTACT_INQUIRY_VOLUNTEER_SUBJECT_LABELS,
} from '../../../../shared/domain/contactInquiryConstants.js';
import { isTerminalWorkflowStatus } from '../../../../shared/domain/workflowStatus.js';

export {
  CONTACT_INQUIRY_STATUS_LABELS,
  CONTACT_INQUIRY_STATUS_TRANSITIONS,
  CONTACT_INQUIRY_TYPE_LABELS,
};

export const CONTACT_INQUIRY_STATUS_OPTIONS = Object.entries(CONTACT_INQUIRY_STATUS_LABELS).map(
  ([value, label]) => ({ value, label })
);

export const CONTACT_INQUIRY_TYPE_OPTIONS = Object.entries(CONTACT_INQUIRY_TYPE_LABELS).map(
  ([value, label]) => ({ value, label })
);

export const CONTACT_INQUIRY_ADOPTION_SUBJECT_OPTIONS = Object.entries(
  CONTACT_INQUIRY_ADOPTION_SUBJECT_LABELS
).map(([value, label]) => ({ value, label }));

export const CONTACT_INQUIRY_SPECIAL_CARE_SUBJECT_OPTIONS = Object.entries(
  CONTACT_INQUIRY_SPECIAL_CARE_SUBJECT_LABELS
).map(([value, label]) => ({ value, label }));

export const CONTACT_INQUIRY_SPECIAL_CARE_ASSISTANCE_TYPE_OPTIONS = Object.entries(
  CONTACT_INQUIRY_SPECIAL_CARE_ASSISTANCE_TYPE_LABELS
).map(([value, label]) => ({ value, label }));

export const CONTACT_INQUIRY_SPECIAL_CARE_AVAILABILITY_OPTIONS = Object.entries(
  CONTACT_INQUIRY_SPECIAL_CARE_AVAILABILITY_LABELS
).map(([value, label]) => ({ value, label }));

export const CONTACT_INQUIRY_VOLUNTEER_SUBJECT_OPTIONS = Object.entries(
  CONTACT_INQUIRY_VOLUNTEER_SUBJECT_LABELS
).map(([value, label]) => ({ value, label }));

export const CONTACT_INQUIRY_DONATION_TOPIC_OPTIONS = Object.entries(
  CONTACT_INQUIRY_DONATION_TOPIC_LABELS
).map(([value, label]) => ({ value, label }));

export function getContactInquiryStatusLabel(status) {
  return CONTACT_INQUIRY_STATUS_LABELS[status] ?? 'В очакване';
}

export function getContactInquiryTypeLabel(type) {
  return CONTACT_INQUIRY_TYPE_LABELS[type] ?? 'Общо запитване';
}

export function getContactInquirySubjectLabel(type, subject) {
  if (type === 'adoption') {
    return CONTACT_INQUIRY_ADOPTION_SUBJECT_LABELS[subject] ?? subject;
  }

  if (type === 'special-care') {
    return CONTACT_INQUIRY_SPECIAL_CARE_SUBJECT_LABELS[subject] ?? subject;
  }

  if (type === 'volunteering') {
    return CONTACT_INQUIRY_VOLUNTEER_SUBJECT_LABELS[subject] ?? subject;
  }

  return subject;
}

export function getContactInquiryDonationTopicLabel(topic) {
  return CONTACT_INQUIRY_DONATION_TOPIC_LABELS[topic] ?? topic;
}

export function getContactInquirySpecialCareAssistanceTypeLabel(assistanceType) {
  return CONTACT_INQUIRY_SPECIAL_CARE_ASSISTANCE_TYPE_LABELS[assistanceType] ?? assistanceType;
}

export function getContactInquirySpecialCareAvailabilityLabel(availability) {
  return CONTACT_INQUIRY_SPECIAL_CARE_AVAILABILITY_LABELS[availability] ?? availability;
}

export function getContactInquiryStatusTransitions(status, allowedTransitions) {
  if (Array.isArray(allowedTransitions)) {
    return [...allowedTransitions];
  }

  return [...(CONTACT_INQUIRY_STATUS_TRANSITIONS[status] ?? [])];
}

export function isContactInquiryTerminalStatus(status) {
  return isTerminalWorkflowStatus(status, CONTACT_INQUIRY_STATUS_TRANSITIONS);
}

export function getContactInquiryStatusTransitionOptions(
  status,
  allowedTransitions,
  { includeCurrent = false } = {}
) {
  const transitionValues = getContactInquiryStatusTransitions(status, allowedTransitions);
  const values = includeCurrent ? [status, ...transitionValues] : transitionValues;

  return [...new Set(values.filter(Boolean))].map((value) => ({
    value,
    label: getContactInquiryStatusLabel(value),
  }));
}

export function getContactInquiryDisplayName(inquiry) {
  return String(inquiry?.name ?? '').trim() || 'Подател';
}

export function formatContactInquiryDate(dateValue) {
  if (!dateValue) {
    return 'Няма дата';
  }

  const parsedDate = new Date(dateValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Невалидна дата';
  }

  return new Intl.DateTimeFormat('bg-BG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsedDate);
}

export function getContactInquiryStatusGuidance(status) {
  switch (status) {
    case 'pending':
      return 'Запитването очаква първоначален преглед от екипа.';
    case 'under-review':
      return 'Екипът преглежда подадената информация.';
    case 'resolved':
      return 'Запитването е обработено и отбелязано като приключено.';
    default:
      return 'Няма допълнителни указания.';
  }
}

export function buildContactInquiryListQuery(type, status, search, page, limit) {
  const params = new URLSearchParams();

  if (type) {
    params.set('type', type);
  }

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

export function getContactInquiryManagementPath(role) {
  return role === 'admin' ? '/admin/inquiries' : '/staff/inquiries';
}
