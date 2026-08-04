import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../auth/AuthProvider.jsx';
import { createEmptyFeedback, createErrorFeedback, createSuccessFeedback } from '../../lib/feedback.js';
import { postJson } from '../../lib/api.js';
import { buildPublicAssetPath } from '../../lib/publicAssetPath.js';
import { DEFAULT_PAGE_CONTENT } from '../page-content/pageContentDefaults.js';
import {
  buildHeroBackgroundStyle,
  getVisibleContentItems,
  splitContentText,
  usePageContent,
} from '../page-content/pageContentUtils.js';
import { useSiteSettings } from '../site-settings/useSiteSettings.js';
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

function RequiredLabel({ children }) {
  return (
    <span className="contact-field-label">
      {children}
      <span className="volunteer-required-marker" aria-hidden="true" title="Задължително поле">
        *
      </span>
    </span>
  );
}

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

  if (!phone) {
    errors.phone = 'Телефонът е задължителен.';
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

  if (values.inquiryType === 'adoption') {
    if (!String(values.animalName ?? '').trim()) {
      errors.animalName = 'Посочи животното, за което се отнася запитването.';
    }

    if (!String(values.subject ?? '').trim()) {
      errors.subject = 'Избери тип въпрос.';
    }
  }

  if (values.inquiryType === 'volunteering') {
    if (!String(values.availability ?? '').trim()) {
      errors.availability = 'Посочи кога имаш възможност да помагаш.';
    }

    if (!String(values.subject ?? '').trim()) {
      errors.subject = 'Избери дейност.';
    }
  }

  if (values.inquiryType === 'donation') {
    if (!String(values.donationTopic ?? '').trim()) {
      errors.donationTopic = 'Избери вид дарение.';
    }

    if (!String(values.subject ?? '').trim()) {
      errors.subject = 'Посочи тема.';
    }
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
  const { content } = usePageContent('contact', DEFAULT_PAGE_CONTENT.contact);
  const { settings } = useSiteSettings();
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

  const contactTypes = useMemo(
    () =>
      CONTACT_TYPES.map((type) => ({
        ...type,
        ...(content.contactTypeLabels?.[type.value] ?? {}),
      })),
    [content.contactTypeLabels]
  );

  const selectedContactType = useMemo(
    () => contactTypes.find((type) => type.value === formValues.inquiryType) ?? contactTypes[0],
    [contactTypes, formValues.inquiryType]
  );
  const contactInfoItems = useMemo(
    () => [
      { icon: '☎', label: 'Телефон', value: settings.phone },
      { icon: '@', label: 'Email', value: settings.email },
      { icon: '◷', label: 'Работно време', value: settings.workingHours },
      { icon: '⌖', label: 'Адрес', value: settings.address },
    ],
    [settings.address, settings.email, settings.phone, settings.workingHours]
  );
  const infoBlocks = getVisibleContentItems(content.infoBlocks ?? []);

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
    <main className="route-shell rescue-shell contact-page-shell">
      <section className="contact-page-hero" style={buildHeroBackgroundStyle(content.hero?.imagePath)}>
        <div>
          <h1>{content.hero?.title}</h1>
        </div>
      </section>

      <section className="about-page-story-block contact-page-story-block">
        {infoBlocks.map((block, index) => {
          const paragraphs = splitContentText(block.text);
          const imageElement = block.imagePath ? (
            <figure className="about-page-split-image">
              <img src={buildPublicAssetPath(block.imagePath)} alt={block.imageAlt ?? ''} />
            </figure>
          ) : null;
          const copyElement = (
            <article className="about-page-split-copy contact-page-details-copy">
              <h2>{block.title}</h2>
              {paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {index === 1 ? (
                <div className="contact-info-grid" aria-label="Контактна информация">
                  {contactInfoItems.map((item) => (
                    <article key={item.label} className="contact-info-card">
                      <span className="contact-info-label">
                        <span className="contact-info-icon" aria-hidden="true">
                          {item.icon}
                        </span>
                        {item.label}
                      </span>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                </div>
              ) : null}
            </article>
          );

          return (
            <Fragment key={block.id ?? block.title}>
              {index > 0 ? <div className="about-page-story-divider" aria-hidden="true" /> : null}
              <div
                className={`about-page-split-inner about-page-story-row ${
                  block.imagePosition === 'left' ? 'about-page-story-row-reversed' : ''
                }`}
              >
                {block.imagePosition === 'left' ? imageElement : copyElement}
                {block.imagePosition === 'left' ? copyElement : imageElement}
              </div>
            </Fragment>
          );
        })}
      </section>

      <section className="rescue-card contact-type-section">
        <p className="contact-type-transition">
          {content.typeSelectorIntro}
        </p>

        <div>
          <h2>{content.typeSelectorTitle}</h2>
        </div>

        <div className="contact-type-grid">
          {contactTypes.map((type) => {
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
          <p>
            Благодарим ви, че се свързахте с нас. Екипът ни ще прегледа информацията и ще използва посочените контакти,
            ако е необходимо допълнително уточнение.
          </p>
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
        <form className="rescue-form-grid" onSubmit={handleSubmit} noValidate>
          <p className="contact-form-intro rescue-form-grid-wide">
            {content.formIntro}
          </p>

          <label>
            <RequiredLabel>Име</RequiredLabel>
            <input
              type="text"
              value={formValues.name}
              onChange={(event) => handleFieldChange('name', event.target.value)}
              disabled={submitState.isSubmitting || isReadingImage}
              autoComplete="name"
              required
              aria-required="true"
            />
            {formErrors.name ? <span>{formErrors.name}</span> : null}
          </label>

          <label>
            <RequiredLabel>Email</RequiredLabel>
            <input
              type="email"
              value={formValues.email}
              onChange={(event) => handleFieldChange('email', event.target.value)}
              disabled={submitState.isSubmitting || isReadingImage}
              autoComplete="email"
              required
              aria-required="true"
            />
            {formErrors.email ? <span>{formErrors.email}</span> : null}
          </label>

          <label>
            <RequiredLabel>Телефон</RequiredLabel>
            <input
              type="tel"
              value={formValues.phone}
              onChange={(event) => handleFieldChange('phone', event.target.value)}
              disabled={submitState.isSubmitting || isReadingImage}
              autoComplete="tel"
              required
              aria-required="true"
            />
            {formErrors.phone ? <span>{formErrors.phone}</span> : null}
          </label>

          {formValues.inquiryType === 'general' ? (
            <label>
              <RequiredLabel>Тема</RequiredLabel>
              <input
                type="text"
                value={formValues.subject}
                onChange={(event) => handleFieldChange('subject', event.target.value)}
                disabled={submitState.isSubmitting || isReadingImage}
                placeholder="Напр. въпрос към екипа"
                required
                aria-required="true"
              />
              {formErrors.subject ? <span>{formErrors.subject}</span> : null}
            </label>
          ) : null}

          {formValues.inquiryType === 'animal' ? (
            <>
              <label className="rescue-form-grid-wide">
                <RequiredLabel>Местоположение</RequiredLabel>
                <input
                  type="text"
                  value={formValues.location}
                  onChange={(event) => handleFieldChange('location', event.target.value)}
                  disabled={submitState.isSubmitting || isReadingImage}
                  placeholder="Адрес, ориентир или квартал"
                  required
                  aria-required="true"
                />
                {formErrors.location ? <span>{formErrors.location}</span> : null}
              </label>

              <label>
                <RequiredLabel>Вид животно</RequiredLabel>
                <select
                  value={formValues.species}
                  onChange={(event) => handleFieldChange('species', event.target.value)}
                  disabled={submitState.isSubmitting || isReadingImage}
                  required
                  aria-required="true"
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
                <RequiredLabel>Спешност</RequiredLabel>
                <select
                  value={formValues.urgency}
                  onChange={(event) => handleFieldChange('urgency', event.target.value)}
                  disabled={submitState.isSubmitting || isReadingImage}
                  required
                  aria-required="true"
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
                <RequiredLabel>Животно</RequiredLabel>
                <input
                  type="text"
                  value={formValues.animalName}
                  onChange={(event) => handleFieldChange('animalName', event.target.value)}
                  disabled={submitState.isSubmitting || isReadingImage}
                  placeholder="Напр. Лили, Макс..."
                  required
                  aria-required="true"
                />
                {formErrors.animalName ? <span>{formErrors.animalName}</span> : null}
              </label>
              <label>
                <RequiredLabel>Тип въпрос</RequiredLabel>
                <select
                  value={formValues.subject}
                  onChange={(event) => handleFieldChange('subject', event.target.value)}
                  disabled={submitState.isSubmitting || isReadingImage}
                  required
                  aria-required="true"
                >
                  <option value="">Избери тема</option>
                  <option value="adoption-process">Процес на осиновяване</option>
                  <option value="animal-details">Въпрос за конкретно животно</option>
                  <option value="submitted-request">Вече подадена заявка</option>
                  <option value="other">Друго</option>
                </select>
                {formErrors.subject ? <span>{formErrors.subject}</span> : null}
              </label>
            </>
          ) : null}

          {formValues.inquiryType === 'volunteering' ? (
            <>
              <label>
                <RequiredLabel>Наличност</RequiredLabel>
                <input
                  type="text"
                  value={formValues.availability}
                  onChange={(event) => handleFieldChange('availability', event.target.value)}
                  disabled={submitState.isSubmitting || isReadingImage}
                  placeholder="Напр. делнични дни, уикенд..."
                  required
                  aria-required="true"
                />
                {formErrors.availability ? <span>{formErrors.availability}</span> : null}
              </label>
              <label>
                <RequiredLabel>Интерес към дейност</RequiredLabel>
                <select
                  value={formValues.subject}
                  onChange={(event) => handleFieldChange('subject', event.target.value)}
                  disabled={submitState.isSubmitting || isReadingImage}
                  required
                  aria-required="true"
                >
                  <option value="">Избери дейност</option>
                  <option value="animal-care">Грижа за животни</option>
                  <option value="walking">Разходки</option>
                  <option value="transport">Транспорт</option>
                  <option value="events">Събития и кампании</option>
                  <option value="other">Друго</option>
                </select>
                {formErrors.subject ? <span>{formErrors.subject}</span> : null}
              </label>
            </>
          ) : null}

          {formValues.inquiryType === 'donation' ? (
            <>
              <label>
                <RequiredLabel>Вид дарение</RequiredLabel>
                <select
                  value={formValues.donationTopic}
                  onChange={(event) => handleFieldChange('donationTopic', event.target.value)}
                  disabled={submitState.isSubmitting || isReadingImage}
                  required
                  aria-required="true"
                >
                  <option value="">Избери вид</option>
                  <option value="money">Парично дарение</option>
                  <option value="food">Храна</option>
                  <option value="medicine">Лекарства и консумативи</option>
                  <option value="materials">Материали и оборудване</option>
                  <option value="other">Друго</option>
                </select>
                {formErrors.donationTopic ? <span>{formErrors.donationTopic}</span> : null}
              </label>
              <label>
                <RequiredLabel>Тема</RequiredLabel>
                <input
                  type="text"
                  value={formValues.subject}
                  onChange={(event) => handleFieldChange('subject', event.target.value)}
                  disabled={submitState.isSubmitting || isReadingImage}
                  placeholder="Напр. храна, транспорт, медикаменти"
                  required
                  aria-required="true"
                />
                {formErrors.subject ? <span>{formErrors.subject}</span> : null}
              </label>
            </>
          ) : null}

          <label className="rescue-form-grid-wide">
            <RequiredLabel>
              {formValues.inquiryType === 'animal' ? 'Описание на случая' : 'Описание / съобщение'}
            </RequiredLabel>
            <textarea
              value={formValues.description}
              onChange={(event) => handleFieldChange('description', event.target.value)}
              disabled={submitState.isSubmitting || isReadingImage}
              required
              aria-required="true"
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
              <span>Снимка (по желание)</span>
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
