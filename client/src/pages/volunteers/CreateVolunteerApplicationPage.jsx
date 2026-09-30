import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../auth/AuthProvider.jsx';
import { PageErrorState, PageLoadingState } from '../../components/common/PageStatusStates.jsx';
import { createEmptyFeedback, createErrorFeedback, createSuccessFeedback } from '../../lib/feedback.js';
import { postJson } from '../../lib/api.js';
import { focusErrorFeedback, focusFirstInvalidField } from '../../lib/formFocus.js';
import { buildPublicAssetPath } from '../../lib/publicAssetPath.js';
import { isValidPhone } from '../../../../shared/domain/contactValidation.js';
import { PageContentLink } from '../page-content/PageContentLink.jsx';
import { buildHeroBackgroundStyle, splitContentText, usePageContent } from '../page-content/pageContentUtils.js';
import {
  MAX_VOLUNTEER_AGE,
  MIN_VOLUNTEER_AGE,
  VOLUNTEER_TEXT_LIMITS,
} from '../../../../shared/domain/volunteerConstants.js';
import {
  VOLUNTEER_POSITION_OPTIONS,
  getVolunteerDisplayName,
  getVolunteerStatusGuidance,
  getVolunteerStatusLabel,
} from './volunteerUi.js';

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  age: '',
  guardianName: '',
  guardianContact: '',
  preferredPositions: [],
  otherPosition: '',
  motivation: '',
  experience: '',
  availability: '',
};

function isMinorAgeValue(value) {
  const age = Number(value);
  return Number.isInteger(age) && age >= MIN_VOLUNTEER_AGE && age < 18;
}

function normalizeFormText(value) {
  return String(value ?? '').trim();
}

function isValidGuardianContact(value) {
  const normalizedValue = normalizeFormText(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedValue) || isValidPhone(normalizedValue);
}

function validateTextLength(errors, fieldName, value, maxLength, label) {
  if (normalizeFormText(value).length > maxLength) {
    errors[fieldName] = `${label} може да съдържа най-много ${maxLength} символа.`;
  }
}

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

function validateVolunteerForm(values) {
  const errors = {};
  const firstName = normalizeFormText(values.firstName);
  const lastName = normalizeFormText(values.lastName);
  const email = normalizeFormText(values.email).toLowerCase();
  const phone = normalizeFormText(values.phone);
  const age = Number(values.age);
  const guardianName = normalizeFormText(values.guardianName);
  const guardianContact = normalizeFormText(values.guardianContact);
  const preferredPositions = Array.isArray(values.preferredPositions) ? values.preferredPositions : [];
  const otherPosition = normalizeFormText(values.otherPosition);
  const motivation = normalizeFormText(values.motivation);
  const experience = normalizeFormText(values.experience);
  const availability = normalizeFormText(values.availability);
  const isMinor = isMinorAgeValue(values.age);
  const hasMissingGuardianInfo =
    !guardianName ||
    !guardianContact ||
    !isValidGuardianContact(guardianContact);

  validateTextLength(errors, 'firstName', firstName, VOLUNTEER_TEXT_LIMITS.firstName, 'Името');
  validateTextLength(errors, 'lastName', lastName, VOLUNTEER_TEXT_LIMITS.lastName, 'Фамилията');
  validateTextLength(errors, 'email', email, VOLUNTEER_TEXT_LIMITS.email, 'Имейлът');
  validateTextLength(errors, 'phone', phone, VOLUNTEER_TEXT_LIMITS.phone, 'Телефонът');
  validateTextLength(errors, 'guardianName', guardianName, VOLUNTEER_TEXT_LIMITS.guardianName, 'Името на родител/настойник');
  validateTextLength(errors, 'guardianContact', guardianContact, VOLUNTEER_TEXT_LIMITS.guardianContact, 'Контактът на родител/настойник');
  validateTextLength(errors, 'otherPosition', otherPosition, VOLUNTEER_TEXT_LIMITS.otherPosition, 'Полето "Друго"');
  validateTextLength(errors, 'availability', availability, VOLUNTEER_TEXT_LIMITS.availability, 'Наличността');
  validateTextLength(errors, 'motivation', motivation, VOLUNTEER_TEXT_LIMITS.motivation, 'Мотивацията');
  validateTextLength(errors, 'experience', experience, VOLUNTEER_TEXT_LIMITS.experience, 'Опитът');

  if (!firstName) {
    errors.firstName = 'Името е задължително.';
  }

  if (!lastName) {
    errors.lastName = 'Фамилията е задължителна.';
  }

  if (!email) {
    errors.email = 'Имейлът е задължителен.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Въведи валиден имейл адрес.';
  }

  if (!phone) {
    errors.phone = 'Телефонът е задължителен.';
  } else if (!isValidPhone(phone)) {
    errors.phone = 'Въведи валиден телефонен номер.';
  }

  if (!Number.isInteger(age) || age < MIN_VOLUNTEER_AGE || age > MAX_VOLUNTEER_AGE) {
    errors.age = `Възрастта трябва да бъде между ${MIN_VOLUNTEER_AGE} и ${MAX_VOLUNTEER_AGE} години.`;
  }

  if (isMinor && hasMissingGuardianInfo) {
    errors.minorRequirements = 'За кандидат под 18 години са нужни данни за родител или настойник.';
  }

  if (isMinor) {
    if (!guardianName) {
      errors.guardianName = 'Името на родител/настойник е задължително.';
    }

    if (!guardianContact) {
      errors.guardianContact = 'Телефонът или имейлът на родител/настойник е задължителен.';
    } else if (!isValidGuardianContact(guardianContact)) {
      errors.guardianContact = 'Въведи валиден телефон или имейл на родител/настойник.';
    }
  }

  if (preferredPositions.length === 0) {
    errors.preferredPositions = 'Избери поне една доброволческа позиция.';
  }

  if (preferredPositions.includes('other') && !otherPosition) {
    errors.otherPosition = 'Опиши накратко избраната друга дейност.';
  }

  if (!motivation) {
    errors.motivation = 'Кратката мотивация е задължителна.';
  }

  if (!availability) {
    errors.availability = 'Посочи кога имаш възможност да помагаш.';
  }

  return errors;
}

export function CreateVolunteerApplicationPage() {
  const { currentUser } = useAuth();
  const { content, error, isLoading, reload } = usePageContent('volunteering');
  const errorFeedbackRef = useRef(null);
  const [formValues, setFormValues] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitState, setSubmitState] = useState({
    isSubmitting: false,
    submittedApplication: null,
    feedback: createEmptyFeedback(),
  });

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    setFormValues((currentValue) => ({
      ...currentValue,
      firstName: currentValue.firstName || currentUser.firstName || '',
      lastName: currentValue.lastName || currentUser.lastName || '',
      email: currentValue.email || currentUser.email || '',
    }));
  }, [currentUser]);

  const applicantName = useMemo(
    () => getVolunteerDisplayName(submitState.submittedApplication),
    [submitState.submittedApplication]
  );
  const isMinor = useMemo(() => isMinorAgeValue(formValues.age), [formValues.age]);
  const hasOtherPosition = useMemo(
    () => formValues.preferredPositions.includes('other'),
    [formValues.preferredPositions]
  );
  const reasonParagraphs = splitContentText(content.reasonBlock?.text);

  if (isLoading) {
    return <PageLoadingState className="volunteers-shell volunteers-page-shell" />;
  }

  if (error) {
    return <PageErrorState className="volunteers-shell volunteers-page-shell" message={error} onRetry={reload} />;
  }

  function handleFieldChange(fieldName, value) {
    setFormValues((currentValue) => {
      const nextFormValues = {
        ...currentValue,
        [fieldName]: value,
      };

      if (fieldName === 'age' && !isMinorAgeValue(value)) {
        nextFormValues.guardianName = '';
        nextFormValues.guardianContact = '';
      }

      return nextFormValues;
    });

    setFormErrors((currentValue) => {
      const nextErrors = { ...currentValue };
      delete nextErrors[fieldName];

      if (['age', 'guardianName', 'guardianContact'].includes(fieldName)) {
        delete nextErrors.minorRequirements;
      }

      if (fieldName === 'age' && !isMinorAgeValue(value)) {
        delete nextErrors.guardianName;
        delete nextErrors.guardianContact;
      }

      return nextErrors;
    });
  }

  function handlePositionToggle(positionValue, isChecked) {
    setFormValues((currentValue) => {
      const nextPositionSet = new Set(currentValue.preferredPositions);

      if (isChecked) {
        nextPositionSet.add(positionValue);
      } else {
        nextPositionSet.delete(positionValue);
      }

      const nextPreferredPositions = VOLUNTEER_POSITION_OPTIONS.map((option) => option.value).filter((value) =>
        nextPositionSet.has(value)
      );

      return {
        ...currentValue,
        preferredPositions: nextPreferredPositions,
        otherPosition: positionValue === 'other' && !isChecked ? '' : currentValue.otherPosition,
      };
    });

    setFormErrors((currentValue) => {
      const nextErrors = { ...currentValue };
      delete nextErrors.preferredPositions;

      if (positionValue === 'other' && !isChecked) {
        delete nextErrors.otherPosition;
      }

      return nextErrors;
    });
  }

  function resetForm() {
    setFormValues({
      ...EMPTY_FORM,
      firstName: currentUser?.firstName ?? '',
      lastName: currentUser?.lastName ?? '',
      email: currentUser?.email ?? '',
    });
    setFormErrors({});
    setSubmitState({
      isSubmitting: false,
      submittedApplication: null,
      feedback: createEmptyFeedback(),
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitState.isSubmitting) {
      return;
    }

    const validationErrors = validateVolunteerForm(formValues);

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      setSubmitState((currentValue) => ({
        ...currentValue,
        feedback: createErrorFeedback('Попълни коректно задължителните полета преди изпращане.'),
      }));
      focusFirstInvalidField(event.currentTarget, validationErrors, {
        minorRequirements: 'age',
      });
      return;
    }

    try {
      setSubmitState({
        isSubmitting: true,
        submittedApplication: null,
        feedback: createEmptyFeedback(),
      });

      const createdApplication = await postJson('/api/volunteers', {
        firstName: formValues.firstName,
        lastName: formValues.lastName,
        email: formValues.email,
        phone: formValues.phone,
        age: Number(formValues.age),
        guardianName: formValues.guardianName,
        guardianContact: formValues.guardianContact,
        preferredPositions: formValues.preferredPositions,
        otherPosition: formValues.otherPosition,
        motivation: formValues.motivation,
        experience: formValues.experience,
        availability: formValues.availability,
      });

      setSubmitState({
        isSubmitting: false,
        submittedApplication: createdApplication,
        feedback: createSuccessFeedback('Кандидатурата беше изпратена успешно.'),
      });
      setFormValues({ ...EMPTY_FORM });
      setFormErrors({});
    } catch (error) {
      setSubmitState({
        isSubmitting: false,
        submittedApplication: null,
        feedback: createErrorFeedback(error.message),
      });
      focusErrorFeedback(errorFeedbackRef);
    }
  }

  return (
    <main className="route-shell volunteers-shell volunteers-page-shell">
      <section
        className="volunteers-hero volunteers-page-hero"
        style={buildHeroBackgroundStyle(content.hero?.imagePath)}
      >
        <div>
          <h1>{content.hero?.title}</h1>
        </div>
      </section>

      <section className="about volunteers-reason-about">
        <div className="section-container about-content">
          <div className="about-layout volunteers-reason-layout">
            <div className="about-text">
              <h2>{content.reasonBlock?.title}</h2>
              <div className="about-copy">
                {reasonParagraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              <PageContentLink
                className="page-contact-link"
                to={content.reasonBlock?.ctaTo}
              >
                {content.reasonBlock?.ctaLabel}
              </PageContentLink>
            </div>

            {content.reasonBlock?.imagePath ? (
              <figure className="about-image-wrap">
                <img
                  src={buildPublicAssetPath(content.reasonBlock.imagePath)}
                  alt={content.reasonBlock.imageAlt ?? ''}
                />
              </figure>
            ) : null}
          </div>
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

      {submitState.submittedApplication ? (
        <section className="volunteers-card volunteers-success-card">
          <div className="volunteers-success-heading">
            <span className={`volunteer-status is-${submitState.submittedApplication.status}`}>
              {getVolunteerStatusLabel(submitState.submittedApplication.status)}
            </span>
            <h2>{applicantName}</h2>
          </div>
          <p>{getVolunteerStatusGuidance(submitState.submittedApplication.status)}</p>
          <p>
            Благодарим ти за желанието да помогнеш. Екипът ни ще прегледа кандидатурата и ще се свърже с теб при нужда
            от допълнителна информация.
          </p>
          <div className="route-actions volunteers-inline-actions">
            <button type="button" className="app-primary-action" onClick={resetForm}>
              Нова кандидатура
            </button>
            <Link className="app-secondary-action" to="/">
              Към началото
            </Link>
          </div>
        </section>
      ) : null}

      {!submitState.submittedApplication ? (
        <section className="volunteers-card" id="volunteer-form">
          <form className="volunteer-form-grid" id="volunteer-personal-info" onSubmit={handleSubmit} noValidate>
            <p className="volunteer-form-intro volunteer-form-grid-wide">
              {content.formIntro}
            </p>
            {content.instructions ? (
              <p className="volunteer-form-intro volunteer-form-grid-wide">{content.instructions}</p>
            ) : null}

            <label>
              <RequiredLabel>Име</RequiredLabel>
              <input
                type="text"
                name="firstName"
                value={formValues.firstName}
                onChange={(event) => handleFieldChange('firstName', event.target.value)}
                disabled={submitState.isSubmitting}
                autoComplete="given-name"
                maxLength={VOLUNTEER_TEXT_LIMITS.firstName}
                required
                aria-required="true"
                aria-invalid={Boolean(formErrors.firstName)}
              />
              {formErrors.firstName ? <span>{formErrors.firstName}</span> : null}
            </label>

            <label>
              <RequiredLabel>Фамилия</RequiredLabel>
              <input
                type="text"
                name="lastName"
                value={formValues.lastName}
                onChange={(event) => handleFieldChange('lastName', event.target.value)}
                disabled={submitState.isSubmitting}
                autoComplete="family-name"
                maxLength={VOLUNTEER_TEXT_LIMITS.lastName}
                required
                aria-required="true"
                aria-invalid={Boolean(formErrors.lastName)}
              />
              {formErrors.lastName ? <span>{formErrors.lastName}</span> : null}
            </label>

            <label>
              <RequiredLabel>Имейл</RequiredLabel>
              <input
                type="email"
                name="email"
                value={formValues.email}
                onChange={(event) => handleFieldChange('email', event.target.value)}
                disabled={submitState.isSubmitting}
                autoComplete="email"
                maxLength={VOLUNTEER_TEXT_LIMITS.email}
                required
                aria-required="true"
                aria-invalid={Boolean(formErrors.email)}
              />
              {formErrors.email ? <span>{formErrors.email}</span> : null}
            </label>

            <label>
              <RequiredLabel>Телефон</RequiredLabel>
              <input
                type="tel"
                name="phone"
                value={formValues.phone}
                onChange={(event) => handleFieldChange('phone', event.target.value)}
                disabled={submitState.isSubmitting}
                autoComplete="tel"
                maxLength={VOLUNTEER_TEXT_LIMITS.phone}
                required
                aria-required="true"
                aria-invalid={Boolean(formErrors.phone)}
              />
              {formErrors.phone ? <span>{formErrors.phone}</span> : null}
            </label>

            <section className="volunteer-context-panel volunteer-age-context-panel" aria-label="Възраст и данни за родител или настойник">
              <label className="volunteer-age-field">
                <RequiredLabel>Възраст</RequiredLabel>
                <input
                  type="number"
                  name="age"
                  min={MIN_VOLUNTEER_AGE}
                  max={MAX_VOLUNTEER_AGE}
                  value={formValues.age}
                  onChange={(event) => handleFieldChange('age', event.target.value)}
                  disabled={submitState.isSubmitting}
                  required
                  aria-required="true"
                  aria-invalid={Boolean(formErrors.age || formErrors.minorRequirements)}
                  aria-describedby="volunteer-age-hint"
                />
                <p className="volunteer-field-hint" id="volunteer-age-hint">
                  Минимална възраст за кандидатстване: {MIN_VOLUNTEER_AGE} години.
                </p>
                {formErrors.age ? <span>{formErrors.age}</span> : null}
              </label>

              {isMinor ? (
                <>
                  {formErrors.minorRequirements ? (
                    <p className="volunteer-field-error volunteer-minor-warning">{formErrors.minorRequirements}</p>
                  ) : null}

                  <section className="volunteers-guardian-section" aria-label="Данни за родител или настойник">
                    <div className="volunteers-guardian-intro">
                      <h3>Данни за родител или настойник</h3>
                      <p>
                        Кандидатът е под 18 години. Екипът ще се свърже с родител или настойник,
                        за да потвърди съгласието преди евентуално одобрение.
                      </p>
                    </div>

                    <div className="volunteer-form-grid volunteer-form-grid-nested">
                      <label>
                        <RequiredLabel>Име на родител/настойник</RequiredLabel>
                        <input
                          type="text"
                          name="guardianName"
                          value={formValues.guardianName}
                          onChange={(event) => handleFieldChange('guardianName', event.target.value)}
                          disabled={submitState.isSubmitting}
                          autoComplete="name"
                          maxLength={VOLUNTEER_TEXT_LIMITS.guardianName}
                          required
                          aria-required="true"
                          aria-invalid={Boolean(formErrors.guardianName)}
                        />
                        {formErrors.guardianName ? <span>{formErrors.guardianName}</span> : null}
                      </label>

                      <label>
                        <RequiredLabel>Телефон или имейл на родител/настойник</RequiredLabel>
                        <input
                          type="text"
                          name="guardianContact"
                          value={formValues.guardianContact}
                          onChange={(event) => handleFieldChange('guardianContact', event.target.value)}
                          disabled={submitState.isSubmitting}
                          placeholder="Например: +359 888 123 456 или parent@example.com"
                          maxLength={VOLUNTEER_TEXT_LIMITS.guardianContact}
                          required
                          aria-required="true"
                          aria-invalid={Boolean(formErrors.guardianContact)}
                        />
                        {formErrors.guardianContact ? <span>{formErrors.guardianContact}</span> : null}
                      </label>
                    </div>
                  </section>
                </>
              ) : null}
            </section>

            <div
              className={`volunteer-form-grid-wide volunteer-positions-field${hasOtherPosition ? ' is-highlighted' : ''}`}
            >
              <RequiredLabel>Предпочитани дейности</RequiredLabel>
              <div
                className="volunteer-position-grid"
                role="group"
                aria-label="Избор на доброволчески позиции"
                aria-required="true"
              >
                {VOLUNTEER_POSITION_OPTIONS.map((option) => (
                  <label key={option.value} className="volunteer-position-option">
                    <input
                      type="checkbox"
                      name="preferredPositions"
                      checked={formValues.preferredPositions.includes(option.value)}
                      aria-invalid={Boolean(formErrors.preferredPositions)}
                      onChange={(event) => handlePositionToggle(option.value, event.target.checked)}
                      disabled={submitState.isSubmitting}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>

              {formErrors.preferredPositions ? (
                <p className="volunteer-field-error">{formErrors.preferredPositions}</p>
              ) : null}

              {hasOtherPosition ? (
                <label className="volunteer-position-other">
                  <RequiredLabel>Друго</RequiredLabel>
                  <input
                    type="text"
                    name="otherPosition"
                    value={formValues.otherPosition}
                    onChange={(event) => handleFieldChange('otherPosition', event.target.value)}
                    disabled={submitState.isSubmitting}
                    placeholder="Опиши с няколко думи как искаш да помагаш"
                    maxLength={VOLUNTEER_TEXT_LIMITS.otherPosition}
                    required
                    aria-required="true"
                    aria-invalid={Boolean(formErrors.otherPosition)}
                  />
                  {formErrors.otherPosition ? <span>{formErrors.otherPosition}</span> : null}
                </label>
              ) : null}
            </div>

            <label className="volunteer-form-grid-wide">
              <RequiredLabel>Наличност</RequiredLabel>
              <input
                type="text"
                name="availability"
                value={formValues.availability}
                placeholder="Например: делнични дни, уикенди, 2-3 пъти месечно"
                onChange={(event) => handleFieldChange('availability', event.target.value)}
                disabled={submitState.isSubmitting}
                maxLength={VOLUNTEER_TEXT_LIMITS.availability}
                required
                aria-required="true"
                aria-invalid={Boolean(formErrors.availability)}
              />
              {formErrors.availability ? <span>{formErrors.availability}</span> : null}
            </label>

            <label className="volunteer-form-grid-wide">
              <RequiredLabel>Мотивация</RequiredLabel>
              <textarea
                name="motivation"
                value={formValues.motivation}
                placeholder="Разкажи накратко защо искаш да помагаш на приюта."
                onChange={(event) => handleFieldChange('motivation', event.target.value)}
                disabled={submitState.isSubmitting}
                maxLength={VOLUNTEER_TEXT_LIMITS.motivation}
                required
                aria-required="true"
                aria-invalid={Boolean(formErrors.motivation)}
              />
              {formErrors.motivation ? <span>{formErrors.motivation}</span> : null}
            </label>

            <label className="volunteer-form-grid-wide">
              <span>Опит (по желание)</span>
              <textarea
                value={formValues.experience}
                placeholder="Предишен опит с животни, доброволчество, транспорт, грижи и др."
                onChange={(event) => handleFieldChange('experience', event.target.value)}
                disabled={submitState.isSubmitting}
                maxLength={VOLUNTEER_TEXT_LIMITS.experience}
              />
            </label>

            <div className="profile-form-actions volunteer-form-grid-wide">
              <button type="submit" className="app-primary-action" disabled={submitState.isSubmitting}>
                {submitState.isSubmitting ? 'Изпращане...' : 'Изпрати кандидатура'}
              </button>
              <button
                type="button"
                className="app-secondary-action"
                disabled={submitState.isSubmitting}
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



