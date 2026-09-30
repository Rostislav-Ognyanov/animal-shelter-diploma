import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../auth/AuthProvider.jsx';
import { PageErrorState, PageLoadingState } from '../../components/common/PageStatusStates.jsx';
import { buildPublicAssetPath } from '../../lib/publicAssetPath.js';
import { createEmptyFeedback, createErrorFeedback, createSuccessFeedback } from '../../lib/feedback.js';
import { focusErrorFeedback, focusFirstInvalidField } from '../../lib/formFocus.js';
import { postJson } from '../../lib/api.js';
import { isValidPhone } from '../../../../shared/domain/contactValidation.js';
import {
  DONATION_AMOUNT_LIMITS,
  DONATION_TEXT_LIMITS,
} from '../../../../shared/domain/donationConstants.js';
import { PageContentLink } from '../page-content/PageContentLink.jsx';
import { buildHeroBackgroundStyle, splitContentText, usePageContent } from '../page-content/pageContentUtils.js';
import {
  DONATION_PRESET_AMOUNTS,
  formatDonationAmount,
  getDonationDisplayName,
} from './donationUi.js';

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  amount: '',
  message: '',
};

function validateDonationForm(values) {
  const errors = {};
  const name = String(values.name ?? '').trim();
  const email = String(values.email ?? '').trim();
  const phone = String(values.phone ?? '').trim();
  const amount = Number(values.amount);
  const message = String(values.message ?? '').trim();

  if (!name) {
    errors.name = 'Името е задължително.';
  } else if (name.length > DONATION_TEXT_LIMITS.name) {
    errors.name = `Името не може да бъде по-дълго от ${DONATION_TEXT_LIMITS.name} символа.`;
  }

  if (!email) {
    errors.email = 'Имейлът е задължителен.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Въведи валиден имейл адрес.';
  } else if (email.length > DONATION_TEXT_LIMITS.email) {
    errors.email = `Имейлът не може да бъде по-дълъг от ${DONATION_TEXT_LIMITS.email} символа.`;
  }

  if (phone && !isValidPhone(phone)) {
    errors.phone = 'Въведи валиден телефонен номер.';
  } else if (phone.length > DONATION_TEXT_LIMITS.phone) {
    errors.phone = `Телефонът не може да бъде по-дълъг от ${DONATION_TEXT_LIMITS.phone} символа.`;
  }

  if (!Number.isFinite(amount) || amount < DONATION_AMOUNT_LIMITS.min) {
    errors.amount = 'Въведи валидна сума на заявката за дарение.';
  } else if (amount > DONATION_AMOUNT_LIMITS.max) {
    errors.amount = `Сумата не може да надвишава ${DONATION_AMOUNT_LIMITS.max} евро.`;
  }

  if (message.length > DONATION_TEXT_LIMITS.message) {
    errors.message = `Съобщението не може да бъде по-дълго от ${DONATION_TEXT_LIMITS.message} символа.`;
  }

  return errors;
}

export function DonationPage({ siteName = 'Animal Shelter' }) {
  const { currentUser } = useAuth();
  const { content, error, isLoading, reload } = usePageContent('donations');
  const errorFeedbackRef = useRef(null);
  const [formValues, setFormValues] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitState, setSubmitState] = useState({
    isSubmitting: false,
    submittedDonation: null,
    feedback: createEmptyFeedback(),
  });

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    setFormValues((currentValue) => ({
      ...currentValue,
      name: currentValue.name || [currentUser.firstName, currentUser.lastName].filter(Boolean).join(' ').trim(),
      email: currentValue.email || currentUser.email || '',
    }));
  }, [currentUser]);

  const donorName = useMemo(
    () => getDonationDisplayName(submitState.submittedDonation),
    [submitState.submittedDonation]
  );
  const selectedPresetAmount = useMemo(() => {
    const numericAmount = Number(formValues.amount);
    return DONATION_PRESET_AMOUNTS.includes(numericAmount) ? numericAmount : null;
  }, [formValues.amount]);
  const reasonTitle = String(content.reasonBlock?.title ?? '').replaceAll('{siteName}', siteName);
  const reasonText = String(content.reasonBlock?.text ?? '').replaceAll('{siteName}', siteName);
  const reasonParagraphs = splitContentText(reasonText);

  if (isLoading) {
    return <PageLoadingState className="donations-shell donations-page-shell" />;
  }

  if (error) {
    return <PageErrorState className="donations-shell donations-page-shell" message={error} onRetry={reload} />;
  }

  function handleFieldChange(fieldName, value) {
    setFormValues((currentValue) => ({
      ...currentValue,
      [fieldName]: value,
    }));

    setFormErrors((currentValue) => {
      if (!currentValue[fieldName]) {
        return currentValue;
      }

      const nextErrors = { ...currentValue };
      delete nextErrors[fieldName];
      return nextErrors;
    });
  }

  function selectPresetAmount(amount) {
    handleFieldChange('amount', String(amount));
  }

  function resetForm() {
    setFormValues({
      ...EMPTY_FORM,
      name: [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ').trim(),
      email: currentUser?.email ?? '',
    });
    setFormErrors({});
    setSubmitState({
      isSubmitting: false,
      submittedDonation: null,
      feedback: createEmptyFeedback(),
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitState.isSubmitting) {
      return;
    }

    const validationErrors = validateDonationForm(formValues);

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      setSubmitState((currentValue) => ({
        ...currentValue,
        feedback: createErrorFeedback('Попълни коректно задължителните полета преди запис.'),
      }));
      focusFirstInvalidField(event.currentTarget, validationErrors);
      return;
    }

    try {
      setSubmitState({
        isSubmitting: true,
        submittedDonation: null,
        feedback: createEmptyFeedback(),
      });

      const createdDonation = await postJson('/api/donations', {
        ...formValues,
        amount: Number(formValues.amount),
      });

      setSubmitState({
        isSubmitting: false,
        submittedDonation: createdDonation,
        feedback: createSuccessFeedback('Заявката за дарение беше записана успешно.'),
      });
      setFormValues({ ...EMPTY_FORM });
      setFormErrors({});
    } catch (error) {
      setSubmitState({
        isSubmitting: false,
        submittedDonation: null,
        feedback: createErrorFeedback(error.message),
      });
      focusErrorFeedback(errorFeedbackRef);
    }
  }

  return (
    <main className="route-shell donations-shell donations-page-shell">
      <section
        className="donations-hero donations-page-hero"
        style={buildHeroBackgroundStyle(content.hero?.imagePath)}
      >
        <div>
          <h1>{content.hero?.title}</h1>
        </div>
      </section>

      <section className="about donations-reason-about">
        <div className="section-container about-content">
          <div className="about-layout">
            <div className="about-text">
              <h2>{reasonTitle}</h2>
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

      {submitState.submittedDonation ? (
        <section className="donations-card">
          <div className="donations-success-heading">
            <h2>{donorName}</h2>
            <span className="donation-amount-pill">
              {formatDonationAmount(submitState.submittedDonation.amount)}
            </span>
          </div>
          <p>Благодарим за заявената подкрепа. Екипът ще проследи заявката и ще я отбележи като получена след реално потвърждение.</p>
          <div className="route-actions donations-inline-actions">
            <button type="button" className="app-primary-action" onClick={resetForm}>
              Нова заявка
            </button>
            <Link className="app-secondary-action" to="/">
              Към началото
            </Link>
          </div>
        </section>
      ) : null}

      {!submitState.submittedDonation ? (
        <section id="donation-form" className="donations-card">
        <form className="donation-form-grid" onSubmit={handleSubmit} noValidate>
          <div className="donation-form-grid-wide donation-amount-block">
            <div className="donation-amount-heading">
              <h2>Избери сума</h2>
              <p>Можеш да избереш готова стойност или да въведеш собствена.</p>
              {content.useOfDonations ? <p>{content.useOfDonations}</p> : null}
              {content.campaignNote ? <p>{content.campaignNote}</p> : null}
            </div>

            <div className="donation-preset-grid">
              {DONATION_PRESET_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  className={`donation-preset-button ${selectedPresetAmount === amount ? 'is-selected' : ''}`}
                  onClick={() => selectPresetAmount(amount)}
                  disabled={submitState.isSubmitting}
                >
                  {formatDonationAmount(amount)}
                </button>
              ))}
            </div>

            <label>
              <span>Собствена сума</span>
              <input
                type="number"
                name="amount"
                min={DONATION_AMOUNT_LIMITS.min}
                max={DONATION_AMOUNT_LIMITS.max}
                step="0.01"
                value={formValues.amount}
                onChange={(event) => handleFieldChange('amount', event.target.value)}
                disabled={submitState.isSubmitting}
                required
                aria-invalid={Boolean(formErrors.amount)}
                placeholder="Например: 35"
              />
              {formErrors.amount ? <span className="form-field-error">{formErrors.amount}</span> : null}
            </label>
          </div>

          <label>
            <span>Име</span>
            <input
              type="text"
              name="name"
              value={formValues.name}
              onChange={(event) => handleFieldChange('name', event.target.value)}
              disabled={submitState.isSubmitting}
              autoComplete="name"
              required
              aria-invalid={Boolean(formErrors.name)}
              maxLength={DONATION_TEXT_LIMITS.name}
            />
            {formErrors.name ? <span className="form-field-error">{formErrors.name}</span> : null}
          </label>

          <label>
            <span>Имейл</span>
            <input
              type="email"
              name="email"
              value={formValues.email}
              onChange={(event) => handleFieldChange('email', event.target.value)}
              disabled={submitState.isSubmitting}
              autoComplete="email"
              required
              aria-invalid={Boolean(formErrors.email)}
              maxLength={DONATION_TEXT_LIMITS.email}
            />
            {formErrors.email ? <span className="form-field-error">{formErrors.email}</span> : null}
          </label>

          <label className="donation-form-grid-wide">
            <span>Телефон</span>
            <input
              type="tel"
              name="phone"
              value={formValues.phone}
              onChange={(event) => handleFieldChange('phone', event.target.value)}
              disabled={submitState.isSubmitting}
              autoComplete="tel"
              maxLength={DONATION_TEXT_LIMITS.phone}
              placeholder="По желание"
              aria-invalid={Boolean(formErrors.phone)}
            />
            {formErrors.phone ? <span className="form-field-error">{formErrors.phone}</span> : null}
          </label>

          <label className="donation-form-grid-wide">
            <span>Кратко съобщение</span>
            <textarea
              name="message"
              value={formValues.message}
              onChange={(event) => handleFieldChange('message', event.target.value)}
              disabled={submitState.isSubmitting}
              maxLength={DONATION_TEXT_LIMITS.message}
              placeholder="По желание"
              aria-invalid={Boolean(formErrors.message)}
            />
            {formErrors.message ? <span className="form-field-error">{formErrors.message}</span> : null}
          </label>

          <div className="profile-form-actions donation-form-grid-wide">
            <button type="submit" className="app-primary-action" disabled={submitState.isSubmitting}>
              {submitState.isSubmitting ? 'Записване...' : 'Заяви дарение'}
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






