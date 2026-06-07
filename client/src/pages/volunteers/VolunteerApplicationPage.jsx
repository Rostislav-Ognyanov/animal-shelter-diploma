import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../auth/AuthProvider.jsx';
import { createEmptyFeedback, createErrorFeedback, createSuccessFeedback } from '../../lib/feedback.js';
import { postJson } from '../../lib/api.js';
import { buildPublicAssetPath } from '../../lib/publicAssetPath.js';
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
  isMinorDeclaration: false,
  guardianConsent: false,
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
  return Number.isInteger(age) && age > 0 && age < 18;
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
  const email = String(values.email ?? '').trim();
  const age = Number(values.age);
  const guardianName = String(values.guardianName ?? '').trim();
  const guardianContact = String(values.guardianContact ?? '').trim();
  const preferredPositions = Array.isArray(values.preferredPositions) ? values.preferredPositions : [];
  const otherPosition = String(values.otherPosition ?? '').trim();
  const isMinor = isMinorAgeValue(values.age);
  const hasMinorDeclaration = Boolean(values.isMinorDeclaration);
  const needsGuardianSection = isMinor && hasMinorDeclaration;
  const hasMissingGuardianInfo =
    !hasMinorDeclaration ||
    !values.guardianConsent ||
    !guardianName ||
    !guardianContact ||
    (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardianContact) && !/^[0-9+\s().-]{6,32}$/.test(guardianContact));

  if (!String(values.firstName ?? '').trim()) {
    errors.firstName = 'Името е задължително.';
  }

  if (!String(values.lastName ?? '').trim()) {
    errors.lastName = 'Фамилията е задължителна.';
  }

  if (!email) {
    errors.email = 'Имейлът е задължителен.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Въведи валиден имейл адрес.';
  }

  if (!String(values.phone ?? '').trim()) {
    errors.phone = 'Телефонът е задължителен.';
  }

  if (!Number.isInteger(age) || age <= 0 || age > 120) {
    errors.age = 'Въведи валидна възраст.';
  }

  if (isMinor && hasMissingGuardianInfo) {
    errors.minorRequirements = 'Ако не сте навършили 18 години, моля попълнете нужната информация';
  }

  if (needsGuardianSection) {
    if (!values.guardianConsent) {
      errors.guardianConsent = 'За кандидат под 18 години е нужно съгласие от родител или настойник.';
    }

    if (!guardianName) {
      errors.guardianName = 'Името на родител/настойник е задължително.';
    }

    if (!guardianContact) {
      errors.guardianContact = 'Телефонът или имейлът на родител/настойник е задължителен.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardianContact) && !/^[0-9+\s().-]{6,32}$/.test(guardianContact)) {
      errors.guardianContact = 'Въведи валиден телефон или имейл на родител/настойник.';
    }
  }

  if (preferredPositions.length === 0) {
    errors.preferredPositions = 'Избери поне една доброволческа позиция.';
  }

  if (preferredPositions.includes('other') && !otherPosition) {
    errors.otherPosition = 'Опиши накратко избраната друга дейност.';
  }

  if (!String(values.motivation ?? '').trim()) {
    errors.motivation = 'Кратката мотивация е задължителна.';
  }

  if (!String(values.availability ?? '').trim()) {
    errors.availability = 'Посочи кога имаш възможност да помагаш.';
  }

  return errors;
}

export function VolunteerApplicationPage() {
  const { currentUser } = useAuth();
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
  const showGuardianFields = useMemo(
    () => isMinor && Boolean(formValues.isMinorDeclaration),
    [formValues.isMinorDeclaration, isMinor]
  );
  const hasOtherPosition = useMemo(
    () => formValues.preferredPositions.includes('other'),
    [formValues.preferredPositions]
  );

  function handleFieldChange(fieldName, value) {
    setFormValues((currentValue) => {
      const nextFormValues = {
        ...currentValue,
        [fieldName]: value,
      };

      if (fieldName === 'age' && !isMinorAgeValue(value)) {
        nextFormValues.isMinorDeclaration = false;
        nextFormValues.guardianConsent = false;
        nextFormValues.guardianName = '';
        nextFormValues.guardianContact = '';
      }

      if (fieldName === 'isMinorDeclaration' && !value) {
        nextFormValues.guardianConsent = false;
        nextFormValues.guardianName = '';
        nextFormValues.guardianContact = '';
      }

      return nextFormValues;
    });

    setFormErrors((currentValue) => {
      const nextErrors = { ...currentValue };
      delete nextErrors[fieldName];

      if (['age', 'isMinorDeclaration', 'guardianConsent', 'guardianName', 'guardianContact'].includes(fieldName)) {
        delete nextErrors.minorRequirements;
      }

      if (fieldName === 'age' && !isMinorAgeValue(value)) {
        delete nextErrors.guardianConsent;
        delete nextErrors.guardianName;
        delete nextErrors.guardianContact;
      }

      if (fieldName === 'isMinorDeclaration' && !value) {
        delete nextErrors.guardianConsent;
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
        guardianConsent: formValues.guardianConsent,
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
    }
  }

  return (
    <main className="route-shell volunteers-shell volunteers-page-shell">
      <section className="volunteers-hero volunteers-page-hero">
        <div>
          <h1>Кандидатствай за доброволец</h1>
        </div>
      </section>

      <section className="about volunteers-reason-about">
        <div className="section-container about-content">
          <div className="about-layout volunteers-reason-layout">
            <div className="about-text">
              <h2>Обичаш животните и искаш да помогнеш с грижи?</h2>
              <div className="about-copy">
                <p>
                  Като доброволец можеш да станеш истинска част от ежедневната грижа за животните в приюта и да
                  помогнеш там, където има най-голяма нужда. С времето, вниманието и желанието си за помощ ще допринесеш
                  за по-добра среда, повече спокойствие и повече шанс за възстановяване на животните, които разчитат на
                  нас. Независимо дали участваш в пряката грижа, в организацията на дейности или в подкрепата на екипа,
                  твоето присъствие има реално значение. Доброволчеството е възможност не само да помогнеш, но и да
                  бъдеш част от кауза, която променя животи.
                </p>
              </div>
              <a className="about-page-contact-link volunteers-reason-action" href="#volunteer-personal-info">
                Стани доброволец
              </a>
            </div>

            <figure className="about-image-wrap">
              <img
                src={buildPublicAssetPath('images/page_images/volunteering_hero.png')}
                alt="Доброволец в подкрепа на животните в приюта"
              />
            </figure>
          </div>
        </div>
      </section>

      {submitState.feedback.message ? (
        <div
          className={`auth-status ${submitState.feedback.type === 'error' ? 'auth-status-error' : 'auth-status-info'}`}
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
            <button type="button" className="animals-primary-action" onClick={resetForm}>
              Нова кандидатура
            </button>
            <Link className="animals-secondary-action" to="/">
              Към началото
            </Link>
          </div>
        </section>
      ) : null}

      <section className="volunteers-card" id="volunteer-form">
        <form className="volunteer-form-grid" id="volunteer-personal-info" onSubmit={handleSubmit} noValidate>
          <p className="volunteer-form-intro volunteer-form-grid-wide">
            Попълни формата по-долу, за да ни разкажеш с какво и кога би искал да помагаш.
          </p>

          <label>
            <RequiredLabel>Име</RequiredLabel>
            <input
              type="text"
              value={formValues.firstName}
              onChange={(event) => handleFieldChange('firstName', event.target.value)}
              disabled={submitState.isSubmitting}
              autoComplete="given-name"
              required
              aria-required="true"
            />
            {formErrors.firstName ? <span>{formErrors.firstName}</span> : null}
          </label>

          <label>
            <RequiredLabel>Фамилия</RequiredLabel>
            <input
              type="text"
              value={formValues.lastName}
              onChange={(event) => handleFieldChange('lastName', event.target.value)}
              disabled={submitState.isSubmitting}
              autoComplete="family-name"
              required
              aria-required="true"
            />
            {formErrors.lastName ? <span>{formErrors.lastName}</span> : null}
          </label>

          <label>
            <RequiredLabel>Имейл</RequiredLabel>
            <input
              type="email"
              value={formValues.email}
              onChange={(event) => handleFieldChange('email', event.target.value)}
              disabled={submitState.isSubmitting}
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
              disabled={submitState.isSubmitting}
              autoComplete="tel"
              required
              aria-required="true"
            />
            {formErrors.phone ? <span>{formErrors.phone}</span> : null}
          </label>

          <section className="volunteer-context-panel volunteer-age-context-panel" aria-label="Възраст и данни за родител или настойник">
            <label className="volunteer-age-field">
              <RequiredLabel>Възраст</RequiredLabel>
              <input
                type="number"
                min="1"
                max="120"
                value={formValues.age}
                onChange={(event) => handleFieldChange('age', event.target.value)}
                disabled={submitState.isSubmitting}
                required
                aria-required="true"
              />
              {formErrors.age ? <span>{formErrors.age}</span> : null}
            </label>

            {isMinor ? (
              <>
                {formErrors.minorRequirements ? (
                  <p className="volunteer-field-error volunteer-minor-warning">{formErrors.minorRequirements}</p>
                ) : null}

                <label className="volunteer-checkbox-row volunteer-form-grid-wide volunteer-underage-toggle">
                  <input
                    type="checkbox"
                    checked={Boolean(formValues.isMinorDeclaration)}
                    onChange={(event) => handleFieldChange('isMinorDeclaration', event.target.checked)}
                    disabled={submitState.isSubmitting}
                    required={isMinor}
                    aria-required={isMinor ? 'true' : undefined}
                  />
                  <RequiredLabel>Нямам навършени 18 години</RequiredLabel>
                </label>

                {showGuardianFields ? (
                  <section className="volunteers-guardian-section" aria-label="Данни за родител или настойник">
                    <div className="volunteers-guardian-intro">
                      <h3>Данни за родител или настойник</h3>
                      <p>За кандидат под 18 години са нужни съгласие и контакт на родител или настойник.</p>
                    </div>

                    <label className="volunteer-checkbox-row volunteer-form-grid-wide">
                      <input
                        type="checkbox"
                        checked={Boolean(formValues.guardianConsent)}
                        onChange={(event) => handleFieldChange('guardianConsent', event.target.checked)}
                        disabled={submitState.isSubmitting}
                        required={showGuardianFields}
                        aria-required={showGuardianFields ? 'true' : undefined}
                      />
                      <RequiredLabel>Имам съгласие от родител или настойник</RequiredLabel>
                    </label>
                    {formErrors.guardianConsent ? <p className="volunteer-field-error">{formErrors.guardianConsent}</p> : null}

                    <div className="volunteer-form-grid volunteer-form-grid-nested">
                      <label>
                        <RequiredLabel>Име на родител/настойник</RequiredLabel>
                        <input
                          type="text"
                          value={formValues.guardianName}
                          onChange={(event) => handleFieldChange('guardianName', event.target.value)}
                          disabled={submitState.isSubmitting}
                          autoComplete="name"
                          required={showGuardianFields}
                          aria-required={showGuardianFields ? 'true' : undefined}
                        />
                        {formErrors.guardianName ? <span>{formErrors.guardianName}</span> : null}
                      </label>

                      <label>
                        <RequiredLabel>Телефон или имейл на родител/настойник</RequiredLabel>
                        <input
                          type="text"
                          value={formValues.guardianContact}
                          onChange={(event) => handleFieldChange('guardianContact', event.target.value)}
                          disabled={submitState.isSubmitting}
                          placeholder="Например: +359 888 123 456 или parent@example.com"
                          required={showGuardianFields}
                          aria-required={showGuardianFields ? 'true' : undefined}
                        />
                        {formErrors.guardianContact ? <span>{formErrors.guardianContact}</span> : null}
                      </label>
                    </div>
                  </section>
                ) : null}
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
                    checked={formValues.preferredPositions.includes(option.value)}
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
                  value={formValues.otherPosition}
                  onChange={(event) => handleFieldChange('otherPosition', event.target.value)}
                  disabled={submitState.isSubmitting}
                  placeholder="Опиши с няколко думи как искаш да помагаш"
                  required
                  aria-required="true"
                />
                {formErrors.otherPosition ? <span>{formErrors.otherPosition}</span> : null}
              </label>
            ) : null}
          </div>

          <label className="volunteer-form-grid-wide">
            <RequiredLabel>Наличност</RequiredLabel>
            <input
              type="text"
              value={formValues.availability}
              placeholder="Например: делнични дни, уикенди, 2-3 пъти месечно"
              onChange={(event) => handleFieldChange('availability', event.target.value)}
              disabled={submitState.isSubmitting}
              required
              aria-required="true"
            />
            {formErrors.availability ? <span>{formErrors.availability}</span> : null}
          </label>

          <label className="volunteer-form-grid-wide">
            <RequiredLabel>Мотивация</RequiredLabel>
            <textarea
              value={formValues.motivation}
              placeholder="Разкажи накратко защо искаш да помагаш на приюта."
              onChange={(event) => handleFieldChange('motivation', event.target.value)}
              disabled={submitState.isSubmitting}
              required
              aria-required="true"
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
            />
          </label>

          <div className="profile-form-actions volunteer-form-grid-wide">
            <button type="submit" className="animals-primary-action" disabled={submitState.isSubmitting}>
              {submitState.isSubmitting ? 'Изпращане...' : 'Изпрати кандидатура'}
            </button>
            <button
              type="button"
              className="animals-secondary-action"
              disabled={submitState.isSubmitting}
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



