import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useAuth } from '../../auth/AuthProvider.jsx';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';
import { fetchJson, patchJson } from '../../lib/api.js';
import {
  formatAdoptionDate,
  getAdoptionStatusGuidance,
  getAdoptionStatusLabel,
  getAdoptionStatusTransitions,
  getAnimalAllergyLabel,
  getAnimalDisplayName,
  getAnimalLivingPlaceLabel,
  getAnimalTransportLabel,
  getCareStatusLabel,
  getHousingTypeLabel,
  getOtherPetSpeciesLabel,
  getPetSexLabel,
  getUserDisplayName,
  getYardSecurityLabel,
  getYesNoLabel,
  isStaffRole,
} from './adoptionUi.js';
import { ADOPTION_TEXT_LIMITS } from '../../../../shared/domain/adoptionConstants.js';

const CONFIRM_STATUS_VALUES = new Set(['approved', 'rejected', 'cancelled', 'completed']);

function getStatusConfirmation(status) {
  switch (status) {
    case 'approved':
      return {
        title: 'Одобряване на заявка',
        description: 'Одобряването потвърждава, че кандидатът може да продължи към финалните стъпки по осиновяването.',
        confirmLabel: 'Одобри заявката',
        tone: 'default',
      };
    case 'rejected':
      return {
        title: 'Отхвърляне на заявка',
        description: 'Заявката ще бъде приключена с отказ и клиентът ще вижда този статус в профила си.',
        confirmLabel: 'Отхвърли заявката',
        tone: 'danger',
      };
    case 'cancelled':
      return {
        title: 'Отмяна на заявка',
        description: 'Заявката ще бъде отменена служебно и няма да участва в активния процес по осиновяване.',
        confirmLabel: 'Отмени заявката',
        tone: 'danger',
      };
    case 'completed':
      return {
        title: 'Завършване на осиновяване',
        description: 'Завършването на заявката ще отбележи животното като осиновено.',
        confirmLabel: 'Завърши осиновяването',
        tone: 'default',
      };
    default:
      return null;
  }
}

function formatOptionalValue(value) {
  const normalizedValue = String(value ?? '').trim();
  return normalizedValue || 'Няма данни';
}

function DetailInfoList({ items }) {
  return (
    <dl className="adoptions-info-list">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function OtherPetsList({ pets = [] }) {
  if (!Array.isArray(pets) || pets.length === 0) {
    return <p className="adoptions-muted-note">Не са посочени други животни в дома.</p>;
  }

  return (
    <div className="adoptions-pet-list">
      {pets.map((pet, index) => (
        <article key={`${pet.species}-${index}`} className="adoptions-pet-card">
          <div className="adoptions-pet-card-heading">
            <strong>{getOtherPetSpeciesLabel(pet.species, pet.otherSpecies)}</strong>
            {pet.approximateAge ? <span>{pet.approximateAge}</span> : null}
          </div>
          <DetailInfoList
            items={[
              { label: 'Пол', value: getPetSexLabel(pet.sex) },
              { label: 'Кастрация', value: getCareStatusLabel(pet.neuteringStatus) },
              { label: 'Ваксинации', value: getCareStatusLabel(pet.vaccinationStatus) },
            ]}
          />
        </article>
      ))}
    </div>
  );
}

function StatusHistoryList({ entries = [] }) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return <p>Няма записана история на статусите.</p>;
  }

  return (
    <div className="adoptions-notes-list">
      {entries.map((entry, index) => {
        const fromLabel = entry.fromStatus ? getAdoptionStatusLabel(entry.fromStatus) : 'Създадена';
        const toLabel = getAdoptionStatusLabel(entry.toStatus);

        return (
          <div key={`${entry.changedAt}-${index}`} className="adoptions-note-entry">
            <div className="adoptions-note-meta">
              <strong>
                {fromLabel} → {toLabel}
              </strong>
              <span>{entry.changedByName || 'Система'}</span>
            </div>
            <small>{formatAdoptionDate(entry.changedAt)}</small>
          </div>
        );
      })}
    </div>
  );
}

export function AdoptionRequestDetailsPage() {
  const { requestId } = useParams();
  const { role } = useAuth();
  const [reloadToken, setReloadToken] = useState(0);
  const [pageState, setPageState] = useState({
    item: null,
    isLoading: true,
    error: '',
  });
  const [statusForm, setStatusForm] = useState({
    status: '',
    internalNote: '',
  });
  const [submitState, setSubmitState] = useState({
    isSubmitting: false,
    error: '',
    success: '',
  });
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [pendingStatusSubmission, setPendingStatusSubmission] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadRequest() {
      try {
        setPageState({ item: null, isLoading: true, error: '' });
        setSubmitState({ isSubmitting: false, error: '', success: '' });
        const request = await fetchJson(`/api/adoptions/${requestId}`);

        if (!isMounted) {
          return;
        }

        setPageState({ item: request, isLoading: false, error: '' });
        setStatusForm({ status: '', internalNote: '' });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPageState({ item: null, isLoading: false, error: error.message });
      }
    }

    loadRequest();

    return () => {
      isMounted = false;
    };
  }, [requestId, reloadToken]);

  const request = pageState.item;
  const transitions = useMemo(() => getAdoptionStatusTransitions(request?.status), [request?.status]);
  const canManageRequest = isStaffRole(role);
  const canCancelOwnPending = role === 'client' && request?.status === 'pending';
  const statusGuidance = getAdoptionStatusGuidance(request?.status, canManageRequest ? 'staff' : 'client');
  const requestListPath = canManageRequest
    ? role === 'admin'
      ? '/admin/adoptions'
      : '/staff/adoptions'
    : '/adoptions/my';
  const adoptionMotivation = request?.motivation || '';
  const statusConfirmation = getStatusConfirmation(pendingStatusSubmission?.status);

  async function submitStatusChange(nextForm) {
    try {
      setSubmitState({ isSubmitting: true, error: '', success: '' });
      const updatedRequest = await patchJson(`/api/adoptions/${requestId}/status`, {
        status: nextForm.status,
        internalNote: nextForm.internalNote,
      });

      setPageState((currentValue) => ({ ...currentValue, item: updatedRequest }));
      setStatusForm({ status: '', internalNote: '' });
      setPendingStatusSubmission(null);
      setSubmitState({
        isSubmitting: false,
        error: '',
        success: `Статусът е обновен на „${getAdoptionStatusLabel(updatedRequest.status)}“.`,
      });
    } catch (error) {
      setSubmitState({ isSubmitting: false, error: error.message, success: '' });
      setPendingStatusSubmission(null);
    }
  }

  function handleStatusSubmit(event) {
    event.preventDefault();

    const nextForm = {
      status: statusForm.status,
      internalNote: statusForm.internalNote,
    };

    if (!nextForm.status) {
      setSubmitState({ isSubmitting: false, error: 'Избери нов статус.', success: '' });
      return;
    }

    if (CONFIRM_STATUS_VALUES.has(nextForm.status)) {
      setPendingStatusSubmission(nextForm);
      return;
    }

    submitStatusChange(nextForm);
  }

  async function handleCancel() {
    try {
      setSubmitState({ isSubmitting: true, error: '', success: '' });
      const updatedRequest = await patchJson(`/api/adoptions/${requestId}/cancel`, {});

      setPageState((currentValue) => ({ ...currentValue, item: updatedRequest }));
      setSubmitState({
        isSubmitting: false,
        error: '',
        success: 'Заявката е отменена успешно.',
      });
      setIsCancelDialogOpen(false);
    } catch (error) {
      setSubmitState({ isSubmitting: false, error: error.message, success: '' });
      setIsCancelDialogOpen(false);
    }
  }

  if (pageState.isLoading) {
    return (
      <main className="route-shell adoptions-shell">
        <section className="route-card adoptions-card">
                    <h1>Зареждане на заявката</h1>
          <p>Подготвяме детайлите за тази заявка.</p>
        </section>
      </main>
    );
  }

  if (pageState.error) {
    return (
      <main className="route-shell adoptions-shell">
        <section className="route-card adoptions-card">
                    <h1>Заявката не може да се зареди</h1>
          <p>{pageState.error}</p>
          <button
            type="button"
            className="app-primary-action"
            onClick={() => setReloadToken((currentValue) => currentValue + 1)}
          >
            Опитай отново
          </button>
        </section>
      </main>
    );
  }

  const progressMetaItems = canManageRequest
    ? [
        { label: 'Текущ статус', value: getAdoptionStatusLabel(request.status) },
        { label: 'Подадена', value: formatAdoptionDate(request.createdAt) },
        { label: 'Последна промяна', value: formatAdoptionDate(request.updatedAt) },
      ]
    : [{ label: 'Последна промяна', value: formatAdoptionDate(request.updatedAt) }];
  const requestInfoItems = canManageRequest
    ? [
        {
          label: 'Животно',
          value: <Link to={`/animals/${request.animalId}`}>{getAnimalDisplayName(request.animal)}</Link>,
        },
        { label: 'Клиент', value: getUserDisplayName(request.user) },
        { label: 'Имейл', value: formatOptionalValue(request.user?.email) },
        { label: 'Телефон', value: formatOptionalValue(request.contactPhone) },
        { label: 'Статус', value: getAdoptionStatusLabel(request.status) },
        { label: 'Създадена', value: formatAdoptionDate(request.createdAt) },
        { label: 'Последна промяна', value: formatAdoptionDate(request.updatedAt) },
      ]
    : [
        {
          label: 'Животно',
          value: <Link to={`/animals/${request.animalId}`}>{getAnimalDisplayName(request.animal)}</Link>,
        },
        { label: 'Имейл за контакт', value: formatOptionalValue(request.user?.email) },
        { label: 'Телефон за контакт', value: formatOptionalValue(request.contactPhone) },
      ];

  return (
    <main className="route-shell adoptions-shell">
      <div className="route-actions">
        <Link className="app-secondary-action" to={requestListPath}>
          Към списъка със заявки
        </Link>
        <Link className="app-primary-action" to={`/animals/${request.animalId}`}>
          Към животното
        </Link>
      </div>

      <section className="adoptions-hero">
        <div>
          <h1>Заявка за {getAnimalDisplayName(request.animal)}</h1>
          <p>Преглед на подадената информация, условията и текущия статус на заявката.</p>
        </div>

        <div className="adoptions-detail-status">
          <span className={`adoption-status is-${request.status}`}>
            {getAdoptionStatusLabel(request.status)}
          </span>
          <small>Подадена на {formatAdoptionDate(request.createdAt)}</small>
        </div>
      </section>

      {submitState.error ? <div className="feedback-message feedback-message-error">{submitState.error}</div> : null}
      {submitState.success ? <div className="feedback-message feedback-message-info">{submitState.success}</div> : null}

      <section className="adoptions-detail-grid">
        <article className="adoptions-card adoptions-progress-card">
          <h2>Текущ етап</h2>
          <p>{statusGuidance}</p>
          <div className="adoptions-progress-meta">
            {progressMetaItems.map((item) => (
              <div key={item.label}>
                <strong>{item.label}</strong>
                <span>{item.value}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="adoptions-card">
          <h2>Данни за заявката</h2>
          <DetailInfoList items={requestInfoItems} />
        </article>

        <article className="adoptions-card adoptions-detail-wide">
          <h2>Жилищни условия</h2>
          <DetailInfoList
            items={[
              {
                label: 'Тип жилище',
                value:
                  request.housingType === 'other'
                    ? formatOptionalValue(request.housingTypeOther)
                    : getHousingTypeLabel(request.housingType),
              },
              {
                label: 'Двор',
                value: request.housingType === 'house' ? getYesNoLabel(request.hasYard) : 'Не е приложимо',
              },
              {
                label: 'Обезопасен двор',
                value: request.hasYard ? getYardSecurityLabel(request.yardSecurity) : 'Не е приложимо',
              },
              {
                label: 'Място за животното',
                value:
                  request.animalLivingPlace === 'other'
                    ? formatOptionalValue(request.animalLivingPlaceOther)
                    : getAnimalLivingPlaceLabel(request.animalLivingPlace),
              },
            ]}
          />
        </article>

        <article className="adoptions-card adoptions-detail-wide">
          <h2>Домакинство</h2>
          <DetailInfoList
            items={[
              {
                label: 'Постоянно живеещи хора',
                value:
                  request.householdMembersCount || request.householdMembersCount === 0
                    ? `${request.householdMembersCount}`
                    : 'Няма данни',
              },
              { label: 'Човек с алергии към животни', value: getAnimalAllergyLabel(request.hasAnimalAllergies) },
              { label: 'Други животни', value: getYesNoLabel(request.hasOtherPets) },
            ]}
          />
          {request.hasOtherPets ? <OtherPetsList pets={request.otherPets} /> : null}
        </article>

        <article className="adoptions-card adoptions-detail-wide">
          <h2>Опит и готовност</h2>
          <DetailInfoList
            items={[
              { label: 'Предишен опит', value: getYesNoLabel(request.hasPreviousPetExperience) },
              {
                label: 'Непредвидени ветеринарномедицински разходи',
                value: getYesNoLabel(request.acceptsUnexpectedMedicalCosts),
              },
              { label: 'Транспорт', value: getAnimalTransportLabel(request.animalTransport) },
            ]}
          />
          {request.previousPetExperienceDetails ? (
            <div className="adoptions-detail-copy-block">
              <strong>Допълнение за опита</strong>
              <p>{request.previousPetExperienceDetails}</p>
            </div>
          ) : null}
          {adoptionMotivation ? (
            <div className="adoptions-detail-copy-block">
              <strong>Мотивация</strong>
              <p>{adoptionMotivation}</p>
            </div>
          ) : null}
          {canManageRequest && request.acceptsUnexpectedMedicalCosts === false ? (
            <p className="adoptions-warning-note">
              Кандидатът не е потвърдил готовност за непредвидени ветеринарномедицински разходи.
              Това не блокира заявката, но е добре да бъде обсъдено при следващ контакт.
            </p>
          ) : null}
        </article>

        {canManageRequest ? (
          <article className="adoptions-card">
            <h2>Промяна на статус</h2>
            <form className="adoption-form" onSubmit={handleStatusSubmit}>
              <label>
                Нов статус
                <select
                  value={statusForm.status}
                  disabled={transitions.length === 0 || submitState.isSubmitting}
                  onChange={(event) =>
                    setStatusForm((currentValue) => ({ ...currentValue, status: event.target.value }))
                  }
                >
                  <option value="" disabled>
                    {transitions.length > 0 ? 'Избери статус' : 'Няма разрешени преходи'}
                  </option>
                  {transitions.map((status) => (
                    <option key={status} value={status}>
                      {getAdoptionStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Вътрешна бележка
                <textarea
                  value={statusForm.internalNote}
                  maxLength={ADOPTION_TEXT_LIMITS.internalNote}
                  placeholder="Кратка служебна бележка към промяната, ако е нужна."
                  disabled={submitState.isSubmitting}
                  onChange={(event) =>
                    setStatusForm((currentValue) => ({ ...currentValue, internalNote: event.target.value }))
                  }
                />
              </label>

              <button
                type="submit"
                className="app-primary-action"
                disabled={transitions.length === 0 || submitState.isSubmitting}
              >
                {submitState.isSubmitting ? 'Запис...' : 'Запази статуса'}
              </button>
            </form>
          </article>
        ) : null}

        {canCancelOwnPending ? (
          <article className="adoptions-card adoptions-detail-wide">
            <h2>Отмяна</h2>
            <p>Само при статус „В очакване“.</p>
            <button
              type="button"
              className="app-secondary-action app-danger-action"
              disabled={submitState.isSubmitting}
              onClick={() => setIsCancelDialogOpen(true)}
            >
              {submitState.isSubmitting ? 'Отмяна...' : 'Отмени заявката'}
            </button>
          </article>
        ) : null}

        {canManageRequest ? (
          <article className="adoptions-card adoptions-notes-card">
            <h2>История на статусите</h2>
            <StatusHistoryList entries={request.statusHistory} />
          </article>
        ) : null}

        {canManageRequest ? (
          <article className="adoptions-card adoptions-notes-card">
            <h2>Вътрешни бележки</h2>
            {request.internalNotes?.length > 0 ? (
              <div className="adoptions-notes-list">
                {request.internalNotes.map((note, index) => (
                  <div key={`${note.createdAt}-${index}`} className="adoptions-note-entry">
                    <div className="adoptions-note-meta">
                      <strong>{note.authorName || 'Служител'}</strong>
                      <span>Вътрешна бележка</span>
                    </div>
                    <p className="adoptions-note-body">{note.text}</p>
                    <small>{formatAdoptionDate(note.createdAt)}</small>
                  </div>
                ))}
              </div>
            ) : (
              <p>Няма вътрешни бележки.</p>
            )}
          </article>
        ) : null}
      </section>

      <ConfirmDialog
        isOpen={isCancelDialogOpen}
        title="Отмяна на заявка"
        description={`Сигурен ли си, че искаш да отмениш заявката за ${getAnimalDisplayName(request.animal)}?`}
        confirmLabel="Отмени заявката"
        cancelLabel="Назад"
        tone="danger"
        isSubmitting={submitState.isSubmitting}
        onConfirm={handleCancel}
        onClose={() => {
          if (!submitState.isSubmitting) {
            setIsCancelDialogOpen(false);
          }
        }}
      />

      <ConfirmDialog
        isOpen={Boolean(pendingStatusSubmission)}
        title={statusConfirmation?.title ?? 'Промяна на статус'}
        description={statusConfirmation?.description ?? 'Потвърди промяната на статуса на заявката.'}
        confirmLabel={statusConfirmation?.confirmLabel ?? 'Потвърди'}
        cancelLabel="Назад"
        tone={statusConfirmation?.tone ?? 'default'}
        isSubmitting={submitState.isSubmitting}
        onConfirm={() => {
          if (pendingStatusSubmission) {
            submitStatusChange(pendingStatusSubmission);
          }
        }}
        onClose={() => {
          if (!submitState.isSubmitting) {
            setPendingStatusSubmission(null);
          }
        }}
      />
    </main>
  );
}



