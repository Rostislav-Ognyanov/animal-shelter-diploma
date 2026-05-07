import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useAuth } from '../../auth/AuthProvider.jsx';
import { fetchJson } from '../../lib/api.js';
import {
  formatDonationAmount,
  formatDonationDate,
  getDonationDisplayName,
  getDonationManagementPath,
} from './donationUi.js';

export function DonationDetailsPage() {
  const { donationId } = useParams();
  const { role } = useAuth();
  const [reloadToken, setReloadToken] = useState(0);
  const [pageState, setPageState] = useState({
    item: null,
    isLoading: true,
    error: '',
  });

  const managementPath = useMemo(() => getDonationManagementPath(role), [role]);

  useEffect(() => {
    let isMounted = true;

    async function loadDonation() {
      try {
        setPageState({
          item: null,
          isLoading: true,
          error: '',
        });

        const payload = await fetchJson(`/api/donations/${donationId}`);

        if (!isMounted) {
          return;
        }

        setPageState({
          item: payload,
          isLoading: false,
          error: '',
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPageState({
          item: null,
          isLoading: false,
          error: error.message,
        });
      }
    }

    loadDonation();

    return () => {
      isMounted = false;
    };
  }, [donationId, reloadToken]);

  if (pageState.isLoading) {
    return (
      <main className="route-shell donations-shell">
        <section className="route-card profile-loading-card">
                    <h1>Зареждане на дарението</h1>
          <p>Подготвяме детайлите.</p>
        </section>
      </main>
    );
  }

  if (pageState.error) {
    return (
      <main className="route-shell donations-shell">
        <section className="route-card profile-loading-card">
                    <h1>Дарението не може да се зареди</h1>
          <p>{pageState.error}</p>
          <div className="route-actions donations-inline-actions">
            <button
              type="button"
              className="animals-primary-action"
              onClick={() => setReloadToken((currentValue) => currentValue + 1)}
            >
              Опитай отново
            </button>
            <Link className="animals-secondary-action" to={managementPath}>
              Назад към списъка
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const donation = pageState.item;

  return (
    <main className="route-shell donations-shell">
      <div className="route-actions">
        <Link className="animals-secondary-action" to={managementPath}>
          Назад към даренията
        </Link>
        <Link className="animals-primary-action" to="/donations">
          Страницата за дарения
        </Link>
      </div>

      <section className="donations-hero donations-hero-detail">
        <div>
                    <h1>{getDonationDisplayName(donation)}</h1>
          <p>Запис за дарение</p>
        </div>

        <div className="donations-hero-card donations-hero-amount-card">
          <strong>Сума</strong>
          <span className="donation-amount-pill">{formatDonationAmount(donation.amount)}</span>
        </div>
      </section>

      <section className="profile-grid donations-details-grid">
        <article className="route-card profile-summary-card donations-summary-card">
          <div className="profile-summary-top">
            <div>
              <p className="route-meta">Donation Overview</p>
              <h2>{getDonationDisplayName(donation)}</h2>
              <p>{donation.email}</p>
            </div>
          </div>

          <dl className="profile-summary-list">
            <div>
              <dt>Сума</dt>
              <dd>{formatDonationAmount(donation.amount)}</dd>
            </div>
            <div>
              <dt>Имейл</dt>
              <dd>{donation.email}</dd>
            </div>
            <div>
              <dt>Телефон</dt>
              <dd>{donation.phone || 'Няма данни'}</dd>
            </div>
            <div>
              <dt>Подадено</dt>
              <dd>{formatDonationDate(donation.createdAt)}</dd>
            </div>
            <div>
              <dt>Последна промяна</dt>
              <dd>{formatDonationDate(donation.updatedAt)}</dd>
            </div>
          </dl>
        </article>

        <article className="route-card profile-panel-card donations-panel-card">
          <div className="profile-panel-heading">
            <div>
              <p className="route-meta">Message</p>
              <h2>Съобщение от дарителя</h2>
            </div>
          </div>

          <div className="donations-copy-block">
            <p>{donation.message || 'Дарителят не е оставил допълнително съобщение.'}</p>
          </div>
        </article>
      </section>
    </main>
  );
}



