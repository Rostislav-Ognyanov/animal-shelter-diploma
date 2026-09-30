import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';

import { useAuth } from '../../auth/AuthProvider.jsx';
import { PageErrorState, PageLoadingState } from '../../components/common/PageStatusStates.jsx';
import { createEmptyFeedback, createErrorFeedback, createSuccessFeedback } from '../../lib/feedback.js';
import { postJson } from '../../lib/api.js';
import { focusErrorFeedback, focusFirstInvalidField } from '../../lib/formFocus.js';
import { buildPublicAssetPath } from '../../lib/publicAssetPath.js';
import { isValidPhone } from '../../../../shared/domain/contactValidation.js';
import { EMAIL_PATTERN } from '../../../../shared/domain/userConstants.js';
import {
  CONTACT_INQUIRY_ADOPTION_SUBJECT_VALUES,
  CONTACT_INQUIRY_DONATION_TOPIC_VALUES,
  CONTACT_INQUIRY_SPECIAL_CARE_ASSISTANCE_TYPE_VALUES,
  CONTACT_INQUIRY_SPECIAL_CARE_AVAILABILITY_VALUES,
  CONTACT_INQUIRY_SPECIAL_CARE_SUBJECT_VALUES,
  CONTACT_INQUIRY_TEXT_LIMITS,
  CONTACT_INQUIRY_VOLUNTEER_SUBJECT_VALUES,
} from '../../../../shared/domain/contactInquiryConstants.js';
import {
  RESCUE_REPORT_IMAGE_MAX_BYTES,
  RESCUE_REPORT_IMAGE_MIME_TYPES,
  RESCUE_REPORT_TEXT_LIMITS,
} from '../../../../shared/domain/rescueReportConstants.js';
import {
  buildHeroBackgroundStyle,
  getVisibleContentItems,
  splitContentText,
  usePageContent,
} from '../page-content/pageContentUtils.js';
import { useSiteSettings } from '../site-settings/useSiteSettings.js';
import {
  CONTACT_INQUIRY_ADOPTION_SUBJECT_OPTIONS,
  CONTACT_INQUIRY_DONATION_TOPIC_OPTIONS,
  CONTACT_INQUIRY_SPECIAL_CARE_ASSISTANCE_TYPE_OPTIONS,
  CONTACT_INQUIRY_SPECIAL_CARE_AVAILABILITY_OPTIONS,
  CONTACT_INQUIRY_SPECIAL_CARE_SUBJECT_OPTIONS,
  CONTACT_INQUIRY_VOLUNTEER_SUBJECT_OPTIONS,
} from './contactInquiryUi.js';
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
    value: 'special-care',
    label: 'Запитване за специална грижа',
    description: 'За конкретно животно под грижа или в защитен режим.',
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
  species: '',
  urgency: '',
  animalId: '',
  animalName: '',
  assistanceType: '',
  hasRelevantExperience: '',
  experienceDetails: '',
  availability: '',
  donationTopic: '',
  description: '',
  imageUrl: '',
};

function RequiredLabel({ children }) {
  return (
    <span className="volunteer-field-label">
      {children}
      <span className="volunteer-required-marker" aria-hidden="true" title="Задължително поле">
        *
      </span>
    </span>
  );
}

function buildInitialFormValues(currentUser, inquiryType = 'animal', preset = {}) {
  return {
    ...EMPTY_FORM,
    name:
      [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ').trim() ||
      currentUser?.username ||
      '',
    email: currentUser?.email ?? '',
    ...preset,
    inquiryType,
  };
}

function readInquiryPreset(searchParams) {
  if (searchParams.get('type') !== 'special-care') {
    return null;
  }

  return {
    inquiryType: 'special-care',
    animalId: String(searchParams.get('animalId') ?? '').trim(),
    animalName: String(searchParams.get('animal') ?? '')
      .trim()
      .slice(0, CONTACT_INQUIRY_TEXT_LIMITS.animalName),
    subject: 'special-request',
  };
}

function getDescriptionFieldContent(inquiryType, subject) {
  if (inquiryType === 'animal') {
    return {
      label: 'Описание на случая',
      placeholder: 'Опиши какво се е случило, как изглежда животното и защо смяташ, че е в нужда.',
    };
  }

  if (inquiryType === 'special-care') {
    switch (subject) {
      case 'care-information':
        return {
          label: 'Какво искаш да научиш?',
          placeholder: 'Опиши каква информация търсиш за състоянието и грижата за животното.',
        };
      case 'support-options':
        return {
          label: 'Каква информация за подкрепата търсиш?',
          placeholder: 'Опиши какво искаш да научиш за възможностите да подкрепиш животното.',
        };
      case 'special-request':
        return {
          label: 'Опиши специалната си заявка',
          placeholder: 'Опиши предложението си и как можеш да съдействаш за конкретното животно.',
        };
      default:
        return {
          label: 'Описание / съобщение',
          placeholder: 'Опиши въпроса или заявката си за конкретното животно.',
        };
    }
  }

  return {
    label: 'Описание / съобщение',
    placeholder: 'Опиши въпроса си и как екипът може да ти помогне.',
  };
}

function validateContactForm(values) {
  const errors = {};
  const isAnimalReport = values.inquiryType === 'animal';
  const textLimits = isAnimalReport
    ? RESCUE_REPORT_TEXT_LIMITS
    : CONTACT_INQUIRY_TEXT_LIMITS;
  const name = String(values.name ?? '').trim();
  const email = String(values.email ?? '').trim();
  const phone = String(values.phone ?? '').trim();
  const description = String(values.description ?? '').trim();

  if (!name) {
    errors.name = 'Името е задължително.';
  } else if (name.length > textLimits.name) {
    errors.name = `Името може да съдържа най-много ${textLimits.name} символа.`;
  }

  if (!email) {
    errors.email = 'Имейлът е задължителен.';
  } else if (email.length > textLimits.email) {
    errors.email = `Имейлът може да съдържа най-много ${textLimits.email} символа.`;
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Въведи валиден имейл адрес.';
  }

  if (!phone) {
    errors.phone = 'Телефонът е задължителен.';
  } else if (!isValidPhone(phone)) {
    errors.phone = 'Въведи валиден телефонен номер.';
  }

  if (!description) {
    errors.description = 'Опиши накратко случая или въпроса си.';
  } else if (description.length > textLimits.description) {
    errors.description = `Описанието може да съдържа най-много ${textLimits.description} символа.`;
  }

  if (values.inquiryType === 'animal') {
    const location = String(values.location ?? '').trim();

    if (!location) {
      errors.location = 'Посочи мястото на животното.';
    } else if (location.length > RESCUE_REPORT_TEXT_LIMITS.location) {
      errors.location = `Местоположението може да съдържа най-много ${RESCUE_REPORT_TEXT_LIMITS.location} символа.`;
    }

    if (!String(values.species ?? '').trim()) {
      errors.species = 'Избери вид животно.';
    }

    if (!String(values.urgency ?? '').trim()) {
      errors.urgency = 'Избери ниво на спешност.';
    }
  }

  if (values.inquiryType === 'general') {
    const subject = String(values.subject ?? '').trim();

    if (!subject) {
      errors.subject = 'Посочи тема на запитването.';
    } else if (subject.length > CONTACT_INQUIRY_TEXT_LIMITS.subject) {
      errors.subject = `Темата може да съдържа най-много ${CONTACT_INQUIRY_TEXT_LIMITS.subject} символа.`;
    }
  }

  if (values.inquiryType === 'adoption') {
    const animalName = String(values.animalName ?? '').trim();
    const subject = String(values.subject ?? '').trim();

    if (!animalName) {
      errors.animalName = 'Посочи животното, за което се отнася запитването.';
    } else if (animalName.length > CONTACT_INQUIRY_TEXT_LIMITS.animalName) {
      errors.animalName = `Името на животното може да съдържа най-много ${CONTACT_INQUIRY_TEXT_LIMITS.animalName} символа.`;
    }

    if (!subject) {
      errors.subject = 'Избери тип въпрос.';
    } else if (!CONTACT_INQUIRY_ADOPTION_SUBJECT_VALUES.includes(subject)) {
      errors.subject = 'Избери валиден тип въпрос.';
    }
  }

  if (values.inquiryType === 'special-care') {
    const animalId = String(values.animalId ?? '').trim();
    const animalName = String(values.animalName ?? '').trim();
    const subject = String(values.subject ?? '').trim();
    const assistanceType = String(values.assistanceType ?? '').trim();
    const hasRelevantExperience = String(values.hasRelevantExperience ?? '').trim();
    const experienceDetails = String(values.experienceDetails ?? '').trim();
    const availability = String(values.availability ?? '').trim();
    const isSpecialRequest = subject === 'special-request';

    if (!animalId || !animalName) {
      errors.animalName = 'Отвори животно под специална грижа и използвай действието за запитване от неговия профил.';
    } else if (animalName.length > CONTACT_INQUIRY_TEXT_LIMITS.animalName) {
      errors.animalName = `Името на животното може да съдържа най-много ${CONTACT_INQUIRY_TEXT_LIMITS.animalName} символа.`;
    }

    if (!subject) {
      errors.subject = 'Избери тип запитване.';
    } else if (!CONTACT_INQUIRY_SPECIAL_CARE_SUBJECT_VALUES.includes(subject)) {
      errors.subject = 'Избери валиден тип запитване.';
    }

    if (isSpecialRequest) {
      if (!assistanceType) {
        errors.assistanceType = 'Избери как желаеш да помогнеш.';
      } else if (!CONTACT_INQUIRY_SPECIAL_CARE_ASSISTANCE_TYPE_VALUES.includes(assistanceType)) {
        errors.assistanceType = 'Избери валиден вид помощ.';
      }

      if (!['yes', 'no'].includes(hasRelevantExperience)) {
        errors.hasRelevantExperience = 'Посочи дали имаш предишен релевантен опит.';
      }

      if (hasRelevantExperience === 'yes' && !experienceDetails) {
        errors.experienceDetails = 'Опиши накратко предишния си опит.';
      } else if (experienceDetails.length > CONTACT_INQUIRY_TEXT_LIMITS.experienceDetails) {
        errors.experienceDetails = `Описанието на опита може да съдържа най-много ${CONTACT_INQUIRY_TEXT_LIMITS.experienceDetails} символа.`;
      }

      if (!availability) {
        errors.availability = 'Избери наличност.';
      } else if (!CONTACT_INQUIRY_SPECIAL_CARE_AVAILABILITY_VALUES.includes(availability)) {
        errors.availability = 'Избери валидна наличност.';
      }
    }
  }

  if (values.inquiryType === 'volunteering') {
    const availability = String(values.availability ?? '').trim();
    const subject = String(values.subject ?? '').trim();

    if (!availability) {
      errors.availability = 'Посочи кога имаш възможност да помагаш.';
    } else if (availability.length > CONTACT_INQUIRY_TEXT_LIMITS.availability) {
      errors.availability = `Наличността може да съдържа най-много ${CONTACT_INQUIRY_TEXT_LIMITS.availability} символа.`;
    }

    if (!subject) {
      errors.subject = 'Избери дейност.';
    } else if (!CONTACT_INQUIRY_VOLUNTEER_SUBJECT_VALUES.includes(subject)) {
      errors.subject = 'Избери валидна дейност.';
    }
  }

  if (values.inquiryType === 'donation') {
    const donationTopic = String(values.donationTopic ?? '').trim();
    const subject = String(values.subject ?? '').trim();

    if (!donationTopic) {
      errors.donationTopic = 'Избери вид дарение.';
    } else if (!CONTACT_INQUIRY_DONATION_TOPIC_VALUES.includes(donationTopic)) {
      errors.donationTopic = 'Избери валиден вид дарение.';
    }

    if (!subject) {
      errors.subject = 'Посочи тема.';
    } else if (subject.length > CONTACT_INQUIRY_TEXT_LIMITS.subject) {
      errors.subject = `Темата може да съдържа най-много ${CONTACT_INQUIRY_TEXT_LIMITS.subject} символа.`;
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
  const { hash } = useLocation();
  const [searchParams] = useSearchParams();
  const { content, error, isLoading, reload } = usePageContent('contact');
  const {
    settings,
    isLoading: areSettingsLoading,
    error: settingsError,
    reload: reloadSettings,
  } = useSiteSettings();
  const imageInputRef = useRef(null);
  const contactFormRef = useRef(null);
  const errorFeedbackRef = useRef(null);
  const [formValues, setFormValues] = useState(() => {
    const preset = readInquiryPreset(searchParams);
    return buildInitialFormValues(
      currentUser,
      preset?.inquiryType ?? 'animal',
      preset ?? {}
    );
  });
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

  useEffect(() => {
    if (isLoading || hash !== '#contact-inquiry-form') {
      return undefined;
    }

    const animationFrameId = window.requestAnimationFrame(() => {
      contactFormRef.current?.scrollIntoView({ block: 'start' });
    });

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [hash, isLoading]);

  const contactTypes = useMemo(
    () =>
      CONTACT_TYPES.map((type) => {
        const savedType = content.contactTypeLabels?.[type.value] ?? {};

        return {
          ...type,
          label: savedType.label || type.label,
          description: savedType.description || type.description,
        };
      }),
    [content.contactTypeLabels]
  );

  const selectedContactType = useMemo(
    () => contactTypes.find((type) => type.value === formValues.inquiryType) ?? contactTypes[0],
    [contactTypes, formValues.inquiryType]
  );
  const activeTextLimits = formValues.inquiryType === 'animal'
    ? RESCUE_REPORT_TEXT_LIMITS
    : CONTACT_INQUIRY_TEXT_LIMITS;
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

  if (isLoading) {
    return <PageLoadingState className="rescue-shell contact-page-shell" />;
  }

  if (error) {
    return <PageErrorState className="rescue-shell contact-page-shell" message={error} onRetry={reload} />;
  }

  function clearFormFields(nextInquiryType = formValues.inquiryType) {
    const preset = nextInquiryType === 'special-care' ? readInquiryPreset(searchParams) : null;
    setFormValues(buildInitialFormValues(currentUser, nextInquiryType, preset ?? {}));
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

  function handleSpecialCareSubjectChange(nextSubject) {
    setFormValues((currentValue) => ({
      ...currentValue,
      subject: nextSubject,
      ...(nextSubject === 'special-request'
        ? {}
        : {
            assistanceType: '',
            hasRelevantExperience: '',
            experienceDetails: '',
            availability: '',
          }),
    }));
    setFormErrors((currentValue) => {
      const nextErrors = { ...currentValue };
      ['subject', 'assistanceType', 'hasRelevantExperience', 'experienceDetails', 'availability'].forEach(
        (fieldName) => delete nextErrors[fieldName]
      );
      return nextErrors;
    });
  }

  function getFieldErrorProps(fieldName) {
    return {
      name: fieldName,
      'aria-invalid': Boolean(formErrors[fieldName]),
    };
  }

  async function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      handleFieldChange('imageUrl', '');
      return;
    }

    if (!RESCUE_REPORT_IMAGE_MIME_TYPES.includes(file.type)) {
      setFormErrors((currentValue) => ({
        ...currentValue,
        imageUrl: 'Избери JPEG, PNG или WebP изображение.',
      }));
      return;
    }

    if (file.size > RESCUE_REPORT_IMAGE_MAX_BYTES) {
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
    const commonPayload = {
      type: formValues.inquiryType,
      name: formValues.name,
      email: formValues.email,
      phone: formValues.phone,
      description: formValues.description,
    };

    switch (formValues.inquiryType) {
      case 'adoption':
        return {
          ...commonPayload,
          subject: formValues.subject,
          animalName: formValues.animalName,
        };
      case 'special-care':
        return {
          ...commonPayload,
          subject: formValues.subject,
          animalId: formValues.animalId,
          ...(formValues.subject === 'special-request'
            ? {
                assistanceType: formValues.assistanceType,
                hasRelevantExperience: formValues.hasRelevantExperience === 'yes',
                ...(formValues.hasRelevantExperience === 'yes'
                  ? { experienceDetails: formValues.experienceDetails }
                  : {}),
                availability: formValues.availability,
              }
            : {}),
        };
      case 'volunteering':
        return {
          ...commonPayload,
          subject: formValues.subject,
          availability: formValues.availability,
        };
      case 'donation':
        return {
          ...commonPayload,
          subject: formValues.subject,
          donationTopic: formValues.donationTopic,
        };
      default:
        return {
          ...commonPayload,
          subject: formValues.subject,
        };
    }
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
      focusFirstInvalidField(event.currentTarget, validationErrors);
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
      focusErrorFeedback(errorFeedbackRef);
    }
  }

  return (
    <main className="route-shell rescue-shell contact-page-shell">
      <section className="contact-page-hero" style={buildHeroBackgroundStyle(content.hero?.imagePath)}>
        <div>
          <h1>{content.hero?.title}</h1>
        </div>
      </section>

      <section className="about-page-story-block">
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
                settingsError ? (
                  <div className="feedback-message feedback-message-error" role="alert">
                    <p>{settingsError}</p>
                    <button type="button" className="app-secondary-action" onClick={reloadSettings}>
                      Опитай отново
                    </button>
                  </div>
                ) : areSettingsLoading ? (
                  <p className="content-state-message" role="status">
                    Зареждане на контактната информация...
                  </p>
                ) : (
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
                )
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

      <section
        ref={contactFormRef}
        id="contact-inquiry-form"
        className="rescue-card contact-type-section"
      >
        <p className="contact-type-transition">
          {content.typeSelectorIntro}
        </p>

        <div className="contact-special-care-note">
          <div>
            <strong>Интересуваш се от животно под специална или защитена грижа?</strong>
            <p>
              Запитванията за такива животни се подават директно от профила на конкретното
              животно, за да разполагаме с необходимия контекст.
            </p>
          </div>
          <Link to="/animals">Разгледай животните</Link>
        </div>

        <div>
          <h2>{content.typeSelectorTitle}</h2>
        </div>

        <div className="contact-type-grid">
          {contactTypes
            .filter(
              (type) => type.value !== 'special-care' || formValues.inquiryType === 'special-care'
            )
            .map((type) => {
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
        <div
          ref={errorFeedbackRef}
          className={`feedback-message ${submitState.feedback.type === 'error' ? 'feedback-message-error' : 'feedback-message-info'}`}
          role={submitState.feedback.type === 'error' ? 'alert' : 'status'}
          tabIndex={submitState.feedback.type === 'error' ? -1 : undefined}
        >
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
            Благодарим ти, че се свърза с нас. Екипът ни ще прегледа информацията и ще използва посочените контакти,
            ако е необходимо допълнително уточнение.
          </p>
          <div className="route-actions rescue-inline-actions">
            <button type="button" className="app-primary-action" onClick={resetForm}>
              Ново запитване
            </button>
            <Link className="app-secondary-action" to="/">
              Към началото
            </Link>
          </div>
        </section>
      ) : null}

      {!submitState.submittedRecord ? (
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
              {...getFieldErrorProps('name')}
              maxLength={activeTextLimits.name}
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
              {...getFieldErrorProps('email')}
              maxLength={activeTextLimits.email}
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
              {...getFieldErrorProps('phone')}
              maxLength={activeTextLimits.phone}
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
                {...getFieldErrorProps('subject')}
                maxLength={CONTACT_INQUIRY_TEXT_LIMITS.subject}
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
                  {...getFieldErrorProps('location')}
                  maxLength={RESCUE_REPORT_TEXT_LIMITS.location}
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
                  {...getFieldErrorProps('species')}
                  onChange={(event) => handleFieldChange('species', event.target.value)}
                  disabled={submitState.isSubmitting || isReadingImage}
                  required
                  aria-required="true"
                >
                  <option value="" disabled>
                    Избери вид животно
                  </option>
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
                  {...getFieldErrorProps('urgency')}
                  onChange={(event) => handleFieldChange('urgency', event.target.value)}
                  disabled={submitState.isSubmitting || isReadingImage}
                  required
                  aria-required="true"
                >
                  <option value="" disabled>
                    Избери ниво на спешност
                  </option>
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
                  {...getFieldErrorProps('animalName')}
                  maxLength={CONTACT_INQUIRY_TEXT_LIMITS.animalName}
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
                  {...getFieldErrorProps('subject')}
                  onChange={(event) => handleFieldChange('subject', event.target.value)}
                  disabled={submitState.isSubmitting || isReadingImage}
                  required
                  aria-required="true"
                >
                  <option value="" disabled>Избери тема</option>
                  {CONTACT_INQUIRY_ADOPTION_SUBJECT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {formErrors.subject ? <span>{formErrors.subject}</span> : null}
              </label>
            </>
          ) : null}

          {formValues.inquiryType === 'special-care' ? (
            <>
              <label>
                <RequiredLabel>Животно</RequiredLabel>
                <input
                  type="text"
                  value={formValues.animalName}
                  {...getFieldErrorProps('animalName')}
                  readOnly
                  disabled={submitState.isSubmitting || isReadingImage}
                />
                {formErrors.animalName ? <span>{formErrors.animalName}</span> : null}
              </label>
              <label>
                <RequiredLabel>Тип запитване</RequiredLabel>
                <select
                  value={formValues.subject}
                  {...getFieldErrorProps('subject')}
                  onChange={(event) => handleSpecialCareSubjectChange(event.target.value)}
                  disabled={submitState.isSubmitting || isReadingImage}
                  required
                  aria-required="true"
                >
                  <option value="" disabled>Избери тема</option>
                  {CONTACT_INQUIRY_SPECIAL_CARE_SUBJECT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {formErrors.subject ? <span>{formErrors.subject}</span> : null}
              </label>

              {formValues.subject === 'special-request' ? (
                <>
                  <label>
                    <RequiredLabel>Как желаеш да помогнеш?</RequiredLabel>
                <select
                  value={formValues.assistanceType}
                  {...getFieldErrorProps('assistanceType')}
                  onChange={(event) => handleFieldChange('assistanceType', event.target.value)}
                  disabled={submitState.isSubmitting || isReadingImage}
                  required
                  aria-required="true"
                >
                  <option value="" disabled>Избери вид помощ</option>
                  {CONTACT_INQUIRY_SPECIAL_CARE_ASSISTANCE_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {formErrors.assistanceType ? <span>{formErrors.assistanceType}</span> : null}
                  </label>

                  <label>
                    <RequiredLabel>
                      Имаш ли предишен опит с животни, изискващи специални грижи?
                    </RequiredLabel>
                <select
                  value={formValues.hasRelevantExperience}
                  {...getFieldErrorProps('hasRelevantExperience')}
                  onChange={(event) => handleFieldChange('hasRelevantExperience', event.target.value)}
                  disabled={submitState.isSubmitting || isReadingImage}
                  required
                  aria-required="true"
                >
                  <option value="" disabled>Избери отговор</option>
                  <option value="yes">Да</option>
                  <option value="no">Не</option>
                </select>
                {formErrors.hasRelevantExperience ? (
                  <span>{formErrors.hasRelevantExperience}</span>
                ) : null}
                  </label>

                  {formValues.hasRelevantExperience === 'yes' ? (
                    <label className="rescue-form-grid-wide">
                      <RequiredLabel>Опиши накратко опита си</RequiredLabel>
                  <textarea
                    value={formValues.experienceDetails}
                    {...getFieldErrorProps('experienceDetails')}
                    maxLength={CONTACT_INQUIRY_TEXT_LIMITS.experienceDetails}
                    onChange={(event) => handleFieldChange('experienceDetails', event.target.value)}
                    disabled={submitState.isSubmitting || isReadingImage}
                    placeholder="Какъв вид животни, в какъв контекст и приблизително колко време?"
                    required
                    aria-required="true"
                  />
                  {formErrors.experienceDetails ? (
                    <span>{formErrors.experienceDetails}</span>
                  ) : null}
                    </label>
                  ) : null}

                  <label>
                    <RequiredLabel>Кога имаш възможност да окажеш съдействие?</RequiredLabel>
                <select
                  value={formValues.availability}
                  {...getFieldErrorProps('availability')}
                  onChange={(event) => handleFieldChange('availability', event.target.value)}
                  disabled={submitState.isSubmitting || isReadingImage}
                  required
                  aria-required="true"
                >
                  <option value="" disabled>Избери наличност...</option>
                  {CONTACT_INQUIRY_SPECIAL_CARE_AVAILABILITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {formErrors.availability ? <span>{formErrors.availability}</span> : null}
                  </label>
                </>
              ) : null}
            </>
          ) : null}

          {formValues.inquiryType === 'volunteering' ? (
            <>
              <label>
                <RequiredLabel>Наличност</RequiredLabel>
                <input
                  type="text"
                  value={formValues.availability}
                  {...getFieldErrorProps('availability')}
                  maxLength={CONTACT_INQUIRY_TEXT_LIMITS.availability}
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
                  {...getFieldErrorProps('subject')}
                  onChange={(event) => handleFieldChange('subject', event.target.value)}
                  disabled={submitState.isSubmitting || isReadingImage}
                  required
                  aria-required="true"
                >
                  <option value="" disabled>Избери дейност</option>
                  {CONTACT_INQUIRY_VOLUNTEER_SUBJECT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
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
                  {...getFieldErrorProps('donationTopic')}
                  onChange={(event) => handleFieldChange('donationTopic', event.target.value)}
                  disabled={submitState.isSubmitting || isReadingImage}
                  required
                  aria-required="true"
                >
                  <option value="" disabled>Избери вид</option>
                  {CONTACT_INQUIRY_DONATION_TOPIC_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {formErrors.donationTopic ? <span>{formErrors.donationTopic}</span> : null}
              </label>
              <label>
                <RequiredLabel>Тема</RequiredLabel>
                <input
                  type="text"
                  value={formValues.subject}
                  {...getFieldErrorProps('subject')}
                  maxLength={CONTACT_INQUIRY_TEXT_LIMITS.subject}
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
              {getDescriptionFieldContent(formValues.inquiryType, formValues.subject).label}
            </RequiredLabel>
            <textarea
              value={formValues.description}
              {...getFieldErrorProps('description')}
              maxLength={activeTextLimits.description}
              onChange={(event) => handleFieldChange('description', event.target.value)}
              disabled={submitState.isSubmitting || isReadingImage}
              required
              aria-required="true"
              placeholder={getDescriptionFieldContent(formValues.inquiryType, formValues.subject).placeholder}
            />
            {formErrors.description ? <span>{formErrors.description}</span> : null}
          </label>

          {formValues.inquiryType === 'animal' ? (
            <div className="rescue-form-grid-wide rescue-photo-field">
              <span>Снимка (по желание)</span>
              <input
                ref={imageInputRef}
                type="file"
                name="imageUrl"
                accept={RESCUE_REPORT_IMAGE_MIME_TYPES.join(',')}
                aria-invalid={Boolean(formErrors.imageUrl)}
                onChange={handleImageChange}
                disabled={submitState.isSubmitting || isReadingImage}
              />
              {formErrors.imageUrl ? <p className="rescue-field-error">{formErrors.imageUrl}</p> : null}
              {formValues.imageUrl ? (
                <div className="rescue-photo-preview">
                  <img src={formValues.imageUrl} alt="Преглед на качената снимка" />
                  <button
                    type="button"
                    className="app-secondary-action"
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
            <button type="submit" className="app-primary-action" disabled={submitState.isSubmitting || isReadingImage}>
              {submitState.isSubmitting ? 'Изпращане...' : isReadingImage ? 'Качване...' : 'Изпрати'}
            </button>
            <button
              type="button"
              className="app-secondary-action"
              disabled={submitState.isSubmitting || isReadingImage}
              onClick={resetForm}
            >
              Изчисти полетата
            </button>
          </div>
        </form>
        </section>
      ) : null}
    </main>
  );
}
