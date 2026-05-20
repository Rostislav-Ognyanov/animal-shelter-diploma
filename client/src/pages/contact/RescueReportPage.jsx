import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../auth/AuthProvider.jsx';
import { createEmptyFeedback, createErrorFeedback, createSuccessFeedback } from '../../lib/feedback.js';
import { postJson } from '../../lib/api.js';
import {
  RESCUE_REPORT_SPECIES_OPTIONS,
  RESCUE_REPORT_URGENCY_OPTIONS,
  getRescueReportDisplayName,
  getRescueReportStatusGuidance,
  getRescueReportStatusLabel,
} from './rescueReportUi.js';

const CONTACT_TYPES = [
  {
    value: 'animal',
    label: 'Животно в нужда',
    description: 'За намерено, пострадало или изоставено животно.',
  },
  {
    value: 'adoption',
    label: 'Осиновяване',
    description: 'За въпрос относно животно, заявка или следваща стъпка.',
  },
  {
    value: 'volunteering',
    label: 'Доброволчество',
    description: 'За участие, наличност или подходяща дейност.',
  },
  {
    value: 'donation',
    label: 'Дарение',
    description: 'За материална подкрепа, сума или конкретна нужда.',
  },
  {
    value: 'general',
    label: 'Общо запитване',
    description: 'За всичко останало, свързано с приюта.',
  },
];

const CONTACT_INFO = [
  { label: 'Телефон', value: '+359 888 123 456' },
  { label: 'Email', value: 'contact@animal-shelter.bg' },
  { label: 'Адрес', value: 'гр. София, ул. Зелена грижа 12' },
  { label: 'Работно време', value: 'Понеделник - събота, 09:00 - 18:00' },
];

const EMPTY_FORM = {
  inquiryType: 'animal',
  name: '',
  email: '',
  phone: '',
  subject: '',
  location: '',
  species: 'dog',
  urgency: 'medium',
  animalName: '',
  availability: '',
  donationTopic: '',
  description: '',
  imageUrl: '',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+\s().-]{6,32}$/;

function buildInitialFormValues(currentUser, inquiryType = 'animal') {
  return {
    ...EMPTY_FORM,
    inquiryType,
    name:
      [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ').trim() ||
      currentUser?.username ||
      '',
    email: currentUser?.email ?? '',
  };
}

function validateContactForm(values) {
  const errors = {};
  const name = String(values.name ?? '').trim();
  const email = String(values.email ?? '').trim();
  const phone = String(values.phone ?? '').trim();
  const description = String(values.description ?? '').trim();

  if (!name) {
    errors.name = 'Името е задължително.';
  }

  if (!email) {
    errors.email = 'Имейлът е задължителен.';
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Въведи валиден имейл адрес.';
  }

  if (values.inquiryType === 'animal' && !phone) {
    errors.phone = 'Телефонът е задължителен при сигнал за животно.';
  } else if (phone && !PHONE_PATTERN.test(phone)) {
    errors.phone = 'Въведи валиден телефонен номер.';
  }

  if (!description) {
    errors.description = 'Опиши накратко случая или въпроса си.';
  }

  if (values.inquiryType === 'animal') {
    if (!String(values.location ?? '').trim()) {
      errors.location = 'Посочи мястото на животното.';
    }

    if (!String(values.species ?? '').trim()) {
      errors.species = 'Избери вид животно.';
    }

    if (!String(values.urgency ?? '').trim()) {
      errors.urgency = 'Избери ниво на спешност.';
    }
  }

  if (values.inquiryType === 'general' && !String(values.subject ?? '').trim()) {
    errors.subject = 'Посочи тема на запитването.';
  }

  return errors;
}

function readImageFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Снимката не можа да се зареди.'));
    reader.readAsDataURL(file);
  });
}

export function RescueReportPage() {
  const { currentUser } = useAuth();
  const imageInputRef = useRef(null);
  const [formValues, setFormValues] = useState(() => buildInitialFormValues(currentUser));
  const [formErrors, setFormErrors] = useState({});
  const [isReadingImage, setIsReadingImage] = useState(false);
  const [submitState, setSubmitState] = useState({
    isSubmitting: false,
    submittedRecord: null,
    submittedType: '',
    feedback: createEmptyFeedback(),
  });

  useEffect(() => {
    setFormValues((currentValue) => ({
      ...currentValue,
      name:
        currentValue.name ||
        [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ').trim() ||
        currentUser?.username ||
        '',
      email: currentValue.email || currentUser?.email || '',
    }));
  }, [currentUser]);

  const selectedContactType = useMemo(
    () => CONTACT_TYPES.find((type) => type.value === formValues.inquiryType) ?? CONTACT_TYPES[0],
    [formValues.inquiryType]
  );

  const submittedReportName = useMemo(
    () => getRescueReportDisplayName(submitState.submittedRecord),
    [submitState.submittedRecord]
  );

  function clearFormFields(nextInquiryType = formValues.inquiryType) {
    setFormValues(buildInitialFormValues(currentUser, nextInquiryType));
    setFormErrors({});
    setIsReadingImage(false);

    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  }

  function handleFieldChange(fieldName, value) {
    setFormValues((currentValue) => ({
      ...currentValue,
      [fieldName]: value,
    }));

    setFormErrors((currentValue) => {
      const nextErrors = { ...currentValue };
      delete nextErrors[fieldName];
      return nextErrors;
    });
  }

  function handleInquiryTypeChange(nextInquiryType) {
    setSubmitState((currentValue) => ({
      ...currentValue,
      submittedRecord: null,
      submittedType: '',
      feedback: createEmptyFeedback(),
    }));
    clearFormFields(nextInquiryType);
  }

  async function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      handleFieldChange('imageUrl', '');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setFormErrors((currentValue) => ({
        ...currentValue,
        imageUrl: 'Избери валиден image файл.',
      }));
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setFormErrors((currentValue) => ({
        ...currentValue,
        imageUrl: 'Снимката трябва да бъде до 4 MB.',
      }));
      return;
    }

    try {
      setIsReadingImage(true);
      const imageDataUrl = await readImageFileAsDataUrl(file);
      handleFieldChange('imageUrl', imageDataUrl);
    } catch (error) {
      setFormErrors((currentValue) => ({
        ...currentValue,
        imageUrl: error.message,
      }));
    } finally {
      setIsReadingImage(false);
    }
  }

  function resetForm() {
    clearFormFields();
    setSubmitState({
      isSubmitting: false,
      submittedRecord: null,
      submittedType: '',
      feedback: createEmptyFeedback(),
    });
  }

  function buildRescueReportPayload() {
    return {
      name: formValues.name,
      email: formValues.email,
      phone: formValues.phone,
      location: formValues.location,
      species: formValues.species,
      urgency: formValues.urgency,
      description: formValues.description,
      imageUrl: formValues.imageUrl,
    };
  }

  function buildContactInquiryPayload() {
    return {
      type: formValues.inquiryType,
      name: formValues.name,
      email: formValues.email,
      phone: formValues.phone,
      subject: formValues.subject,
      description: formValues.description,
      location: formValues.location,
      species: formValues.species,
      animalName: formValues.animalName,
      availability: formValues.availability,
      donationTopic: formValues.donationTopic,
      imageUrl: formValues.imageUrl,
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitState.isSubmitting || isReadingImage) {
      return;
    }

    const validationErrors = validateContactForm(formValues);

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      setSubmitState((currentValue) => ({
        ...currentValue,
        feedback: createErrorFeedback('Попълни коректно задължителните полета преди изпращане.'),
      }));
      return;
    }

    try {
      setSubmitState({
        isSubmitting: true,
        submittedRecord: null,
        submittedType: '',
        feedback: createEmptyFeedback(),
      });

      const isAnimalReport = formValues.inquiryType === 'animal';
      const createdRecord = isAnimalReport
        ? await postJson('/api/rescue-reports', buildRescueReportPayload())
        : await postJson('/api/contact-inquiries', buildContactInquiryPayload());

      setSubmitState({
        isSubmitting: false,
        submittedRecord: createdRecord,
        submittedType: formValues.inquiryType,
        feedback: createSuccessFeedback(
          isAnimalReport ? 'Сигналът беше изпратен успешно.' : 'Запитването беше изпратено успешно.'
        ),
      });
      clearFormFields(formValues.inquiryType);
    } catch (error) {
      setSubmitState({
        isSubmitting: false,
        submittedRecord: null,
        submittedType: '',
        feedback: createErrorFeedback(error.message),
      });
    }
  }

  return (
    <main className="route-shell rescue-shell">
      <section className="rescue-hero contact-intro-hero">
        <div>
          <p className="route-meta">Свържи се с нас</p>
          <h1>Как можем да помогнем?</h1>
          <p>
            Можеш да се свържеш с приюта при намерено животно в нужда, въпроси за осиновяване,
            доброволчество, дарения или общи запитвания. Всеки сигнал и всяко съобщение се преглеждат
            от екипа и при нужда ще се свържем обратно с теб.
          </p>
        </div>

        <div className="contact-info-grid" aria-label="Контактна информация">
          {CONTACT_INFO.map((item) => (
            <article key={item.label} className="contact-info-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="rescue-card contact-type-section">
        <div>
          <p className="route-meta">Тип запитване</p>
          <h2>Избери с какво е свързана нуждата</h2>
        </div>

        <div className="contact-type-grid">
          {CONTACT_TYPES.map((type) => {
            const isSelected = type.value === formValues.inquiryType;

            return (
              <button
                key={type.value}
                type="button"
                className={`contact-type-card ${isSelected ? 'is-selected' : ''}`}
                onClick={() => handleInquiryTypeChange(type.value)}
                disabled={submitState.isSubmitting || isReadingImage}
              >
                <strong>{type.label}</strong>
                <span>{type.description}</span>
              </button>
            );
          })}
        </div>
      </section>

      {submitState.feedback.message ? (
        <div className={`auth-status ${submitState.feedback.type === 'error' ? 'auth-status-error' : 'auth-status-info'}`}>
          {submitState.feedback.message}
        </div>
      ) : null}

      {submitState.submittedRecord ? (
        <section className="rescue-card rescue-success-card">
          <div className="rescue-success-heading">
            {submitState.submittedType === 'animal' ? (
              <span className={`rescue-status is-${submitState.submittedRecord.status}`}>
                {getRescueReportStatusLabel(submitState.submittedRecord.status)}
              </span>
            ) : (
              <span className="rescue-status is-pending">В очакване</span>
            )}
            <h2>
              {submitState.submittedType === 'animal'
                ? submittedReportName
                : `Запитване: ${selectedContactType.label}`}
            </h2>
          </div>
          <p>
            {submitState.submittedType === 'animal'
              ? getRescueReportStatusGuidance(submitState.submittedRecord.status)
              : 'Запитването е записано и очаква преглед от екипа.'}
          </p>
          <p>Ще използваме посочените контакти, ако е необходима допълнителна информация.</p>
          <div className="route-actions rescue-inline-actions">
            <button type="button" className="animals-primary-action" onClick={resetForm}>
              Ново запитване
            </button>
            <Link className="animals-secondary-action" to="/">
              Към началото
            </Link>
          </div>
        </section>
      ) : null}

      <section className="rescue-card">
        <form className="rescue-form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Име</span>
            <input
              type="text"
              value={formValues.name}
              onChange={(event) => handleFieldChange('name', event.target.value)}
              disabled={submitState.isSubmitting || isReadingImage}
              autoComplete="name"
            />
            {formErrors.name ? <span>{formErrors.name}</span> : null}
          </label>

          <label>
            <span>Email</span>
            <input
              type="email"
              value={formValues.email}
              onChange={(event) => handleFieldChange('email', event.target.value)}
              disabled={submitState.isSubmitting || isReadingImage}
              autoComplete="email"
            />
            {formErrors.email ? <span>{formErrors.email}</span> : null}
          </label>

          <label>
            <span>Телефон</span>
            <input
              type="tel"
              value={formValues.phone}
              onChange={(event) => handleFieldChange('phone', event.target.value)}
              disabled={submitState.isSubmitting || isReadingImage}
              autoComplete="tel"
            />
            {formErrors.phone ? <span>{formErrors.phone}</span> : null}
          </label>

          {formValues.inquiryType === 'general' ? (
            <label>
              <span>Тема</span>
              <input
                type="text"
                value={formValues.subject}
                onChange={(event) => handleFieldChange('subject', event.target.value)}
                disabled={submitState.isSubmitting || isReadingImage}
                placeholder="Напр. въпрос към екипа"
              />
              {formErrors.subject ? <span>{formErrors.subject}</span> : null}
            </label>
          ) : null}

          {formValues.inquiryType === 'animal' ? (
            <>
              <label className="rescue-form-grid-wide">
                <span>Местоположение</span>
                <input
                  type="text"
                  value={formValues.location}
                  onChange={(event) => handleFieldChange('location', event.target.value)}
                  disabled={submitState.isSubmitting || isReadingImage}
                  placeholder="Адрес, ориентир или квартал"
                />
                {formErrors.location ? <span>{formErrors.location}</span> : null}
              </label>

              <label>
                <span>Вид животно</span>
                <select
                  value={formValues.species}
                  onChange={(event) => handleFieldChange('species', event.target.value)}
                  disabled={submitState.isSubmitting || isReadingImage}
                >
                  {RESCUE_REPORT_SPECIES_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {formErrors.species ? <span>{formErrors.species}</span> : null}
              </label>

              <label>
                <span>Спешност</span>
                <select
                  value={formValues.urgency}
                  onChange={(event) => handleFieldChange('urgency', event.target.value)}
                  disabled={submitState.isSubmitting || isReadingImage}
                >
                  {RESCUE_REPORT_URGENCY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {formErrors.urgency ? <span>{formErrors.urgency}</span> : null}
              </label>
            </>
          ) : null}

          {formValues.inquiryType === 'adoption' ? (
            <>
              <label>
                <span>Животно, ако има конкретно</span>
                <input
                  type="text"
                  value={formValues.animalName}
                  onChange={(event) => handleFieldChange('animalName', event.target.value)}
                  disabled={submitState.isSubmitting || isReadingImage}
                  placeholder="Напр. Лили, Макс..."
                />
              </label>
              <label>
                <span>Тип въпрос</span>
                <select
                  value={formValues.subject}
                  onChange={(event) => handleFieldChange('subject', event.target.value)}
                  disabled={submitState.isSubmitting || isReadingImage}
                >
                  <option value="">Избери тема</option>
                  <option value="adoption-process">Процес на осиновяване</option>
                  <option value="animal-details">Въпрос за конкретно животно</option>
                  <option value="submitted-request">Вече подадена заявка</option>
                  <option value="other">Друго</option>
                </select>
              </label>
            </>
          ) : null}

          {formValues.inquiryType === 'volunteering' ? (
            <>
              <label>
                <span>Наличност</span>
                <input
                  type="text"
                  value={formValues.availability}
                  onChange={(event) => handleFieldChange('availability', event.target.value)}
                  disabled={submitState.isSubmitting || isReadingImage}
                  placeholder="Напр. делнични дни, уикенд..."
                />
              </label>
              <label>
                <span>Интерес към дейност</span>
                <select
                  value={formValues.subject}
                  onChange={(event) => handleFieldChange('subject', event.target.value)}
                  disabled={submitState.isSubmitting || isReadingImage}
                >
                  <option value="">Избери дейност</option>
                  <option value="animal-care">Грижа за животни</option>
                  <option value="walking">Разходки</option>
                  <option value="transport">Транспорт</option>
                  <option value="events">Събития и кампании</option>
                  <option value="other">Друго</option>
                </select>
              </label>
            </>
          ) : null}

          {formValues.inquiryType === 'donation' ? (
            <>
              <label>
                <span>Вид дарение</span>
                <select
                  value={formValues.donationTopic}
                  onChange={(event) => handleFieldChange('donationTopic', event.target.value)}
                  disabled={submitState.isSubmitting || isReadingImage}
                >
                  <option value="">Избери вид</option>
                  <option value="money">Парично дарение</option>
                  <option value="food">Храна</option>
                  <option value="medicine">Лекарства и консумативи</option>
                  <option value="materials">Материали и оборудване</option>
                  <option value="other">Друго</option>
                </select>
              </label>
              <label>
                <span>Тема</span>
                <input
                  type="text"
                  value={formValues.subject}
                  onChange={(event) => handleFieldChange('subject', event.target.value)}
                  disabled={submitState.isSubmitting || isReadingImage}
                  placeholder="Напр. храна, транспорт, медикаменти"
                />
              </label>
            </>
          ) : null}

          <label className="rescue-form-grid-wide">
            <span>{formValues.inquiryType === 'animal' ? 'Описание на случая' : 'Описание / съобщение'}</span>
            <textarea
              value={formValues.description}
              onChange={(event) => handleFieldChange('description', event.target.value)}
              disabled={submitState.isSubmitting || isReadingImage}
              placeholder={
                formValues.inquiryType === 'animal'
                  ? 'Опиши какво се е случило, как изглежда животното и защо смяташ, че е в нужда.'
                  : 'Опиши въпроса си и как екипът може да ти помогне.'
              }
            />
            {formErrors.description ? <span>{formErrors.description}</span> : null}
          </label>

          {formValues.inquiryType === 'animal' ? (
            <div className="rescue-form-grid-wide rescue-photo-field">
              <span>Снимка по желание</span>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                disabled={submitState.isSubmitting || isReadingImage}
              />
              {formErrors.imageUrl ? <p className="rescue-field-error">{formErrors.imageUrl}</p> : null}
              {formValues.imageUrl ? (
                <div className="rescue-photo-preview">
                  <img src={formValues.imageUrl} alt="Преглед на качената снимка" />
                  <button
                    type="button"
                    className="animals-secondary-action"
                    onClick={() => handleFieldChange('imageUrl', '')}
                    disabled={submitState.isSubmitting || isReadingImage}
                  >
                    Премахни снимката
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="profile-form-actions rescue-form-grid-wide">
            <button type="submit" className="animals-primary-action" disabled={submitState.isSubmitting || isReadingImage}>
              {submitState.isSubmitting ? 'Изпращане...' : isReadingImage ? 'Качване...' : 'Изпрати'}
            </button>
            <button
              type="button"
              className="animals-secondary-action"
              disabled={submitState.isSubmitting || isReadingImage}
              onClick={resetForm}
            >
              Изчисти полетата
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
