import crypto from 'node:crypto';

import { isDatabaseConnected } from '../../config/db.js';
import ContactInquiry from '../../models/ContactInquiry.js';
import { createHttpError } from '../../utils/httpError.js';
import { loadJsonFile } from '../../utils/loadJsonFile.js';
import { saveJsonFile } from '../../utils/saveJsonFile.js';

const CONTACT_INQUIRIES_DATA_PATH = 'data/contact-inquiries.json';
const CONTACT_INQUIRY_TYPES = ['adoption', 'volunteering', 'donation', 'general'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+\s().-]{6,32}$/;

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeLookupText(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeDateOutput(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function serializeId(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'object') {
    if (value._id) {
      return String(value._id);
    }

    if (value.id) {
      return String(value.id);
    }
  }

  return String(value);
}

function assertBodyObject(payload) {
  if (!isPlainObject(payload)) {
    throw createHttpError(400, 'Тялото на заявката трябва да бъде JSON обект.');
  }

  if (Object.keys(payload).length === 0) {
    throw createHttpError(400, 'Тялото на заявката не може да бъде празно.');
  }
}

function assertAllowedFields(payload, allowedFields) {
  const allowedFieldSet = new Set(allowedFields);
  const invalidFields = Object.keys(payload).filter((fieldName) => !allowedFieldSet.has(fieldName));

  if (invalidFields.length > 0) {
    throw createHttpError(400, 'Запитването съдържа неподдържани полета.', {
      invalidFields,
      allowedFields,
    });
  }
}

function normalizeInquiryType(value) {
  const normalizedType = normalizeLookupText(value);

  if (!CONTACT_INQUIRY_TYPES.includes(normalizedType)) {
    throw createHttpError(400, 'Избраният тип запитване е невалиден.', {
      allowedTypes: CONTACT_INQUIRY_TYPES,
    });
  }

  return normalizedType;
}

function normalizeOptionalImageUrl(value) {
  const imageUrl = normalizeText(value);

  if (!imageUrl) {
    return '';
  }

  if (imageUrl.length > 6_000_000) {
    throw createHttpError(400, 'Качената снимка е твърде голяма за изпращане.');
  }

  return imageUrl;
}

function normalizeCreatePayload(payload) {
  assertBodyObject(payload);
  assertAllowedFields(payload, [
    'type',
    'name',
    'email',
    'phone',
    'subject',
    'description',
    'location',
    'species',
    'animalName',
    'availability',
    'donationTopic',
    'imageUrl',
  ]);

  const type = normalizeInquiryType(payload.type);
  const name = normalizeText(payload.name);
  const email = normalizeLookupText(payload.email);
  const phone = normalizeText(payload.phone);
  const description = normalizeText(payload.description);

  if (!name || !email || !description) {
    throw createHttpError(400, 'Попълни име, имейл и описание на запитването.');
  }

  if (!EMAIL_PATTERN.test(email)) {
    throw createHttpError(400, 'Въведи валиден имейл адрес.');
  }

  if (phone && !PHONE_PATTERN.test(phone)) {
    throw createHttpError(400, 'Въведи валиден телефонен номер.');
  }

  return {
    type,
    name,
    email,
    phone,
    subject: normalizeText(payload.subject),
    description,
    location: normalizeText(payload.location),
    species: normalizeText(payload.species),
    animalName: normalizeText(payload.animalName),
    availability: normalizeText(payload.availability),
    donationTopic: normalizeText(payload.donationTopic),
    imageUrl: normalizeOptionalImageUrl(payload.imageUrl),
    status: 'pending',
  };
}

function serializeContactInquiry(inquiry) {
  return {
    id: serializeId(inquiry),
    type: inquiry.type ?? '',
    name: inquiry.name ?? '',
    email: inquiry.email ?? '',
    phone: inquiry.phone ?? '',
    subject: inquiry.subject ?? '',
    description: inquiry.description ?? '',
    location: inquiry.location ?? '',
    species: inquiry.species ?? '',
    animalName: inquiry.animalName ?? '',
    availability: inquiry.availability ?? '',
    donationTopic: inquiry.donationTopic ?? '',
    imageUrl: inquiry.imageUrl ?? '',
    status: inquiry.status ?? 'pending',
    createdAt: normalizeDateOutput(inquiry.createdAt),
    updatedAt: normalizeDateOutput(inquiry.updatedAt),
  };
}

async function readMockContactInquiries() {
  return loadJsonFile(CONTACT_INQUIRIES_DATA_PATH);
}

async function writeMockContactInquiries(inquiries) {
  return saveJsonFile(CONTACT_INQUIRIES_DATA_PATH, inquiries);
}

export async function createContactInquiry(payload) {
  const normalizedPayload = normalizeCreatePayload(payload);

  if (isDatabaseConnected()) {
    const createdInquiry = await ContactInquiry.create(normalizedPayload);
    return serializeContactInquiry(createdInquiry.toObject());
  }

  const inquiries = await readMockContactInquiries();
  const now = new Date().toISOString();
  const inquiryRecord = {
    id: crypto.randomUUID(),
    ...normalizedPayload,
    createdAt: now,
    updatedAt: now,
  };

  inquiries.push(inquiryRecord);
  await writeMockContactInquiries(inquiries);

  return serializeContactInquiry(inquiryRecord);
}
