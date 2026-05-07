import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../auth/AuthProvider.jsx';
import { createEmptyFeedback, createErrorFeedback, createSuccessFeedback } from '../../lib/feedback.js';
import { postJson } from '../../lib/api.js';
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
    <main className="route-shell volunteers-shell">
      <section className="volunteers-hero">
        <div>
          <h1>Кандидатстване за доброволец</h1>
        </div>
      </section>

      <div className="route-actions">
        <Link className="animals-secondary-action" to="/search">
          Към животните
        </Link>
        <Link className="animals-primary-action" to="/search">
          Търсене
        </Link>
      </div>

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
          <p>Ще използваме посочените контакти, ако е нужна допълнителна информация.</p>
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

      <section className="volunteers-card">
        <form className="volunteer-form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Име</span>
            <input
              type="text"
              value={formValues.firstName}
              onChange={(event) => handleFieldChange('firstName', event.target.value)}
              disabled={submitState.isSubmitting}
              autoComplete="given-name"
            />
            {formErrors.firstName ? <span>{formErrors.firstName}</span> : null}
          </label>

          <label>
            <span>Фамилия</span>
            <input
              type="text"
              value={formValues.lastName}
              onChange={(event) => handleFieldChange('lastName', event.target.value)}
              disabled={submitState.isSubmitting}
              autoComplete="family-name"
            />
            {formErrors.lastName ? <span>{formErrors.lastName}</span> : null}
          </label>

          <label>
            <span>Имейл</span>
            <input
              type="email"
              value={formValues.email}
              onChange={(event) => handleFieldChange('email', event.target.value)}
              disabled={submitState.isSubmitting}
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
              disabled={submitState.isSubmitting}
              autoComplete="tel"
            />
            {formErrors.phone ? <span>{formErrors.phone}</span> : null}
          </label>

          <section className="volunteer-context-panel volunteer-age-context-panel" aria-label="Възраст и данни за родител или настойник">
            <label className="volunteer-age-field">
              <span>Възраст</span>
              <input
                type="number"
                min="1"
                max="120"
                value={formValues.age}
                onChange={(event) => handleFieldChange('age', event.target.value)}
                disabled={submitState.isSubmitting}
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
                  />
                  <span>Нямам навършени 18 години</span>
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
                      />
                      <span>Имам съгласие от родител или настойник</span>
                    </label>
                    {formErrors.guardianConsent ? <p className="volunteer-field-error">{formErrors.guardianConsent}</p> : null}

                    <div className="volunteer-form-grid volunteer-form-grid-nested">
                      <label>
                        <span>Име на родител/настойник</span>
                        <input
                          type="text"
                          value={formValues.guardianName}
                          onChange={(event) => handleFieldChange('guardianName', event.target.value)}
                          disabled={submitState.isSubmitting}
                          autoComplete="name"
                        />
                        {formErrors.guardianName ? <span>{formErrors.guardianName}</span> : null}
                      </label>

                      <label>
                        <span>Телефон или имейл на родител/настойник</span>
                        <input
                          type="text"
                          value={formValues.guardianContact}
                          onChange={(event) => handleFieldChange('guardianContact', event.target.value)}
                          disabled={submitState.isSubmitting}
                          placeholder="Например: +359 888 123 456 или parent@example.com"
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
            <span>Предпочитани дейности</span>
            <div className="volunteer-position-grid" role="group" aria-label="Избор на доброволчески позиции">
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
                <span>Друго</span>
                <input
                  type="text"
                  value={formValues.otherPosition}
                  onChange={(event) => handleFieldChange('otherPosition', event.target.value)}
                  disabled={submitState.isSubmitting}
                  placeholder="Опиши с няколко думи как искаш да помагаш"
                />
                {formErrors.otherPosition ? <span>{formErrors.otherPosition}</span> : null}
              </label>
            ) : null}
          </div>

          <label className="volunteer-form-grid-wide">
            <span>Наличност</span>
            <input
              type="text"
              value={formValues.availability}
              placeholder="Например: делнични вечери, уикенди, 2-3 пъти месечно"
              onChange={(event) => handleFieldChange('availability', event.target.value)}
              disabled={submitState.isSubmitting}
            />
            {formErrors.availability ? <span>{formErrors.availability}</span> : null}
          </label>

          <label className="volunteer-form-grid-wide">
            <span>Мотивация</span>
            <textarea
              value={formValues.motivation}
              placeholder="Разкажи накратко защо искаш да помагаш на приюта."
              onChange={(event) => handleFieldChange('motivation', event.target.value)}
              disabled={submitState.isSubmitting}
            />
            {formErrors.motivation ? <span>{formErrors.motivation}</span> : null}
          </label>

          <label className="volunteer-form-grid-wide">
            <span>Опит</span>
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



