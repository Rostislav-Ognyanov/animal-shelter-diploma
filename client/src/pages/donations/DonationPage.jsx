import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../auth/AuthProvider.jsx';
import { createEmptyFeedback, createErrorFeedback, createSuccessFeedback } from '../../lib/feedback.js';
import { postJson } from '../../lib/api.js';
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
  const email = String(values.email ?? '').trim();
  const phone = String(values.phone ?? '').trim();
  const amount = Number(values.amount);

  if (!String(values.name ?? '').trim()) {
    errors.name = 'Името е задължително.';
  }

  if (!email) {
    errors.email = 'Имейлът е задължителен.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Въведи валиден имейл адрес.';
  }

  if (phone && !/^[0-9+\s().-]{6,32}$/.test(phone)) {
    errors.phone = 'Въведи валиден телефонен номер.';
  }

  if (!Number.isFinite(amount) || amount < 1) {
    errors.amount = 'Въведи валидна сума на дарението.';
  }

  return errors;
}

export function DonationPage() {
  const { currentUser } = useAuth();
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
        feedback: createSuccessFeedback('Дарението беше записано успешно.'),
      });
      setFormValues({ ...EMPTY_FORM });
      setFormErrors({});
    } catch (error) {
      setSubmitState({
        isSubmitting: false,
        submittedDonation: null,
        feedback: createErrorFeedback(error.message),
      });
    }
  }

  return (
    <main className="route-shell donations-shell">
      <section className="donations-hero">
        <div>
          <h1>Дарения</h1>
        </div>
      </section>

      <div className="route-actions">
        <Link className="animals-secondary-action" to="/search">
          Към животните
        </Link>
        <Link className="animals-primary-action" to="/volunteers">
          Доброволчество
        </Link>
      </div>

      {submitState.feedback.message ? (
        <div
          className={`auth-status ${submitState.feedback.type === 'error' ? 'auth-status-error' : 'auth-status-info'}`}
        >
          {submitState.feedback.message}
        </div>
      ) : null}

      {submitState.submittedDonation ? (
        <section className="donations-card donations-success-card">
          <div className="donations-success-heading">
            <h2>{donorName}</h2>
            <span className="donation-amount-pill">
              {formatDonationAmount(submitState.submittedDonation.amount)}
            </span>
          </div>
          <p>Благодарим за подкрепата към приюта.</p>
          <div className="route-actions donations-inline-actions">
            <button type="button" className="animals-primary-action" onClick={resetForm}>
              Ново дарение
            </button>
            <Link className="animals-secondary-action" to="/">
              Към началото
            </Link>
          </div>
        </section>
      ) : null}

      <section className="donations-card">
        <form className="donation-form-grid" onSubmit={handleSubmit}>
          <div className="donation-form-grid-wide donation-amount-block">
            <div className="donation-amount-heading">
              <h2>Избери сума</h2>
              <p>Можеш да избереш готова стойност или да въведеш собствена.</p>
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
                min="1"
                step="0.01"
                value={formValues.amount}
                onChange={(event) => handleFieldChange('amount', event.target.value)}
                disabled={submitState.isSubmitting}
                placeholder="Например: 35"
              />
              {formErrors.amount ? <span>{formErrors.amount}</span> : null}
            </label>
          </div>

          <label>
            <span>Име</span>
            <input
              type="text"
              value={formValues.name}
              onChange={(event) => handleFieldChange('name', event.target.value)}
              disabled={submitState.isSubmitting}
              autoComplete="name"
            />
            {formErrors.name ? <span>{formErrors.name}</span> : null}
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

          <label className="donation-form-grid-wide">
            <span>Телефон</span>
            <input
              type="tel"
              value={formValues.phone}
              onChange={(event) => handleFieldChange('phone', event.target.value)}
              disabled={submitState.isSubmitting}
              autoComplete="tel"
              placeholder="По желание"
            />
            {formErrors.phone ? <span>{formErrors.phone}</span> : null}
          </label>

          <label className="donation-form-grid-wide">
            <span>Кратко съобщение</span>
            <textarea
              value={formValues.message}
              onChange={(event) => handleFieldChange('message', event.target.value)}
              disabled={submitState.isSubmitting}
              placeholder="По желание"
            />
          </label>

          <div className="profile-form-actions donation-form-grid-wide">
            <button type="submit" className="animals-primary-action" disabled={submitState.isSubmitting}>
              {submitState.isSubmitting ? 'Записване...' : 'Запази дарението'}
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






