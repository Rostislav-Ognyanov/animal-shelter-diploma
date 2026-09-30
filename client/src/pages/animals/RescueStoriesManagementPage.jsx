import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';
import { useErrorFeedbackFocus } from '../../hooks/useErrorFeedbackFocus.js';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard.js';
import { fetchJson, patchJson, postJson } from '../../lib/api.js';
import {
  ANIMAL_SPECIES_LABELS,
  ANIMAL_SPECIES_VALUES,
} from '../../../../shared/domain/animalConstants.js';
import {
  RESCUE_STORY_EDITABLE_FIELDS,
  RESCUE_STORY_OUTCOME_STATUS_LABELS,
  RESCUE_STORY_OUTCOME_STATUS_VALUES,
  RESCUE_STORY_PUBLICATION_STATUS_LABELS,
  RESCUE_STORY_SLUG_PATTERN,
  RESCUE_STORY_TEXT_LIMITS,
} from '../../../../shared/domain/rescueStoryConstants.js';

const EMPTY_STORY = Object.freeze({
  title: '',
  slug: '',
  animalName: '',
  animalType: '',
  submittedBy: '',
  outcomeStatus: '',
  summary: '',
  content: '',
  imageUrl: '',
  imageAlt: '',
});

function cloneStoryDraft(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildStoryDraft(story) {
  return cloneStoryDraft({
    ...EMPTY_STORY,
    ...RESCUE_STORY_EDITABLE_FIELDS.reduce((draft, fieldName) => {
      if (story && Object.prototype.hasOwnProperty.call(story, fieldName)) {
        draft[fieldName] = story[fieldName];
      }

      return draft;
    }, {}),
  });
}

function buildStoryPayload(storyDraft) {
  return RESCUE_STORY_EDITABLE_FIELDS.reduce((payload, fieldName) => {
    payload[fieldName] = storyDraft[fieldName];
    return payload;
  }, {});
}

function validateText(value, fieldName, maxLength, { required = false } = {}) {
  const normalizedValue = String(value ?? '').trim();

  if (required && !normalizedValue) {
    return fieldName + ' е задължително поле.';
  }

  if (normalizedValue.length > maxLength) {
    return fieldName + ' не може да надвишава ' + maxLength + ' символа.';
  }

  return '';
}

function validateStoryDraft(storyDraft) {
  const fields = [
    ['Заглавието', storyDraft.title, RESCUE_STORY_TEXT_LIMITS.title, true],
    ['Името на животното', storyDraft.animalName, RESCUE_STORY_TEXT_LIMITS.animalName, true],
    ['Авторът', storyDraft.submittedBy, RESCUE_STORY_TEXT_LIMITS.submittedBy, true],
    ['Краткото резюме', storyDraft.summary, RESCUE_STORY_TEXT_LIMITS.summary, false],
    ['Пълната история', storyDraft.content, RESCUE_STORY_TEXT_LIMITS.content, true],
    ['Пътят до снимката', storyDraft.imageUrl, RESCUE_STORY_TEXT_LIMITS.imageUrl, false],
    ['Alt текстът', storyDraft.imageAlt, RESCUE_STORY_TEXT_LIMITS.imageAlt, false],
  ];

  for (const [fieldName, value, maxLength, required] of fields) {
    const error = validateText(value, fieldName, maxLength, { required });

    if (error) {
      return error;
    }
  }

  const slug = String(storyDraft.slug ?? '').trim();

  if (slug.length > RESCUE_STORY_TEXT_LIMITS.slug) {
    return 'Slug не може да надвишава ' + RESCUE_STORY_TEXT_LIMITS.slug + ' символа.';
  }

  if (slug && !RESCUE_STORY_SLUG_PATTERN.test(slug)) {
    return 'Slug може да съдържа само букви, цифри и единични тирета между тях.';
  }

  if (!ANIMAL_SPECIES_VALUES.includes(storyDraft.animalType)) {
    return 'Избери валиден вид животно.';
  }

  if (!RESCUE_STORY_OUTCOME_STATUS_VALUES.includes(storyDraft.outcomeStatus)) {
    return 'Избери валиден статус на историята.';
  }

  if (storyDraft.imageUrl && !String(storyDraft.imageAlt ?? '').trim()) {
    return 'Alt текстът е задължителен, когато има снимка.';
  }

  return '';
}

function Field({ label, children }) {
  return (
    <label className="page-content-admin-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function TextInput({
  label,
  value,
  onChange,
  disabled = false,
  maxLength,
  required = false,
}) {
  return (
    <Field label={label}>
      <input
        value={value ?? ''}
        disabled={disabled}
        maxLength={maxLength}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

function TextareaInput({
  label,
  value,
  onChange,
  rows = 5,
  disabled = false,
  maxLength,
  required = false,
}) {
  return (
    <label className="page-content-admin-field page-content-admin-field-wide">
      <span>{label}</span>
      <textarea
        value={value ?? ''}
        rows={rows}
        disabled={disabled}
        maxLength={maxLength}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function RescueStoriesManagementPage({ role }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedStoryId = searchParams.get('story') ?? '';
  const [stories, setStories] = useState([]);
  const [storyDraft, setStoryDraft] = useState(() => buildStoryDraft(null));
  const [lastSavedDraft, setLastSavedDraft] = useState(() => buildStoryDraft(null));
  const [pendingStoryId, setPendingStoryId] = useState(null);
  const [pendingAction, setPendingAction] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [loadState, setLoadState] = useState({
    isLoading: true,
    error: '',
  });
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const errorFeedbackRef = useErrorFeedbackFocus(errorMessage);
  const [isSaving, setIsSaving] = useState(false);
  const contentDashboardPath = role === 'admin' ? '/admin/content' : '/staff/content';
  const canPublish = role === 'admin';

  const selectedStory = useMemo(
    () => stories.find((story) => story.id === requestedStoryId) ?? null,
    [requestedStoryId, stories]
  );
  const selectedStoryId = selectedStory?.id ?? '';
  const publicationStatus = selectedStory?.publicationStatus ?? 'draft';
  const isPublished = publicationStatus === 'published';
  const isArchived = publicationStatus === 'archived';
  const canUseStoryForm = !loadState.isLoading && !loadState.error;
  const canEditStoryFields = canUseStoryForm && !isPublished && !isArchived;
  const canArchiveSelectedStory =
    Boolean(selectedStoryId) && !isArchived && (!isPublished || canPublish);
  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(storyDraft) !== JSON.stringify(lastSavedDraft),
    [lastSavedDraft, storyDraft]
  );
  const { pendingNavigationPath, confirmNavigation, cancelNavigation } =
    useUnsavedChangesGuard(hasUnsavedChanges);

  function applyStorySelection(storyId, { replace = false } = {}) {
    setSearchParams(
      (currentParams) => {
        const nextParams = new URLSearchParams(currentParams);

        if (storyId) {
          nextParams.set('story', storyId);
        } else {
          nextParams.delete('story');
        }

        return nextParams;
      },
      { replace }
    );
  }

  function requestStorySelection(storyId) {
    if (storyId === selectedStoryId) {
      return;
    }

    if (hasUnsavedChanges) {
      setPendingStoryId(storyId);
      return;
    }

    applyStorySelection(storyId);
  }

  function confirmStorySelection() {
    if (pendingStoryId === null) {
      return;
    }

    const nextStoryId = pendingStoryId;
    setPendingStoryId(null);
    applyStorySelection(nextStoryId);
  }

  useEffect(() => {
    let isMounted = true;

    setLoadState({
      isLoading: true,
      error: '',
    });
    setStatusMessage('');
    setErrorMessage('');

    fetchJson('/api/rescue-stories/records')
      .then((payload) => {
        if (isMounted) {
          setStories(Array.isArray(payload?.items) ? payload.items : []);
          setLoadState({
            isLoading: false,
            error: '',
          });
        }
      })
      .catch((error) => {
        if (isMounted) {
          setLoadState({
            isLoading: false,
            error: error.message,
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [reloadToken]);

  useEffect(() => {
    if (loadState.isLoading || !requestedStoryId || selectedStory) {
      return;
    }

    applyStorySelection('', { replace: true });
  }, [loadState.isLoading, requestedStoryId, selectedStory]);

  useEffect(() => {
    const nextDraft = buildStoryDraft(selectedStory);
    setStoryDraft(nextDraft);
    setLastSavedDraft(cloneStoryDraft(nextDraft));
    setPendingStoryId(null);
  }, [selectedStory]);

  function updateStoryDraft(patch) {
    setStoryDraft((currentDraft) => ({
      ...currentDraft,
      ...patch,
    }));
  }

  async function reloadStories(nextSelectedId = selectedStoryId) {
    const payload = await fetchJson('/api/rescue-stories/records');
    const items = Array.isArray(payload?.items) ? payload.items : [];
    setStories(items);
    applyStorySelection(nextSelectedId);
  }

  function setValidationError() {
    const validationError = validateStoryDraft(storyDraft);

    if (!validationError) {
      return false;
    }

    setStatusMessage('');
    setErrorMessage(validationError);
    return true;
  }

  async function saveStory(event) {
    event.preventDefault();

    if (!canEditStoryFields || setValidationError()) {
      return;
    }

    setIsSaving(true);
    setStatusMessage('');
    setErrorMessage('');

    try {
      const storyPayload = buildStoryPayload(storyDraft);
      const savedStory = selectedStoryId
        ? await patchJson(`/api/rescue-stories/${selectedStoryId}`, storyPayload)
        : await postJson('/api/rescue-stories', storyPayload);

      await reloadStories(savedStory.id);
      const nextDraft = buildStoryDraft(savedStory);
      setStoryDraft(nextDraft);
      setLastSavedDraft(cloneStoryDraft(nextDraft));
      setStatusMessage('Историята е запазена успешно.');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function archiveStory() {
    if (!selectedStoryId || !canUseStoryForm) {
      return;
    }

    setIsSaving(true);
    setStatusMessage('');
    setErrorMessage('');

    try {
      const savedStory = await patchJson(`/api/rescue-stories/${selectedStoryId}/archive`, {});
      await reloadStories(savedStory.id);
      setStatusMessage('Историята е архивирана успешно.');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSaving(false);
      setPendingAction('');
    }
  }

  function requestPublish() {
    if (!selectedStoryId || !canUseStoryForm || setValidationError()) {
      return;
    }

    setPendingAction('publish');
  }

  async function publishStory() {
    if (!selectedStoryId || !canUseStoryForm) {
      return;
    }

    setIsSaving(true);
    setStatusMessage('');
    setErrorMessage('');

    try {
      if (hasUnsavedChanges) {
        await patchJson(
          `/api/rescue-stories/${selectedStoryId}`,
          buildStoryPayload(storyDraft)
        );
      }

      const savedStory = await patchJson(`/api/rescue-stories/${selectedStoryId}/publish`, {});
      await reloadStories(savedStory.id);
      setStatusMessage('Историята е публикувана успешно.');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSaving(false);
      setPendingAction('');
    }
  }

  async function unpublishStory() {
    if (!selectedStoryId || !canUseStoryForm) {
      return;
    }

    setIsSaving(true);
    setStatusMessage('');
    setErrorMessage('');

    try {
      const savedStory = await patchJson(`/api/rescue-stories/${selectedStoryId}/unpublish`, {});
      await reloadStories(savedStory.id);
      setStatusMessage('Историята е скрита от публичната част успешно.');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSaving(false);
      setPendingAction('');
    }
  }

  const pendingStoryLabel =
    stories.find((story) => story.id === pendingStoryId)?.title ?? 'нова история';

  return (
    <main className="route-shell page-content-admin-shell">
      <section className="route-card page-content-admin-hero page-content-admin-hero-wide">
        <div>
          <p className="route-meta">Структурирано съдържание</p>
          <h1>Истории за спасявания</h1>
          <p>
            {role === 'admin'
              ? 'Добавяй, редактирай, публикувай и архивирай спасителни истории.'
              : 'Добавяй, редактирай и архивирай спасителни истории. Публикуването се извършва от администратор.'}
          </p>
        </div>
        <Link className="app-secondary-action" to={contentDashboardPath}>
          Към управление на съдържанието
        </Link>
      </section>

      <form className="page-content-admin-layout" onSubmit={saveStory}>
        <aside className="page-content-admin-sidebar">
          <Field label="История">
            <select
              value={selectedStoryId}
              disabled={isSaving || loadState.isLoading}
              onChange={(event) => requestStorySelection(event.target.value)}
            >
              <option value="">Нова история</option>
              {stories.map((story) => (
                <option key={story.id} value={story.id}>
                  {story.title} ({RESCUE_STORY_PUBLICATION_STATUS_LABELS[story.publicationStatus]})
                </option>
              ))}
            </select>
          </Field>
          <button type="submit" disabled={isSaving || !canEditStoryFields}>
            {isSaving ? 'Запазване...' : 'Запази история'}
          </button>
          {selectedStoryId && canPublish && !isPublished && !isArchived ? (
            <button type="button" onClick={requestPublish} disabled={isSaving || !canUseStoryForm}>
              Публикувай
            </button>
          ) : null}
          {selectedStoryId && canPublish && isPublished ? (
            <button
              type="button"
              className="page-content-admin-secondary-action"
              onClick={() => setPendingAction('unpublish')}
              disabled={isSaving || !canUseStoryForm}
            >
              Скрий публикацията
            </button>
          ) : null}
          {selectedStoryId && !isArchived ? (
            <button
              type="button"
              className="page-content-admin-secondary-action"
              onClick={() => setPendingAction('archive')}
              disabled={isSaving || !canUseStoryForm || !canArchiveSelectedStory}
            >
              Архивирай
            </button>
          ) : null}
          {loadState.isLoading ? (
            <p className="content-state-message" role="status">
              Зареждане на историите...
            </p>
          ) : null}
          {loadState.error ? (
            <div className="adoptions-empty-state">
              <p>{loadState.error}</p>
              <button
                type="button"
                className="app-primary-action"
                onClick={() => setReloadToken((currentValue) => currentValue + 1)}
              >
                Опитай отново
              </button>
            </div>
          ) : null}
          {selectedStory ? (
            <div className="page-content-admin-meta">
              <p>
                Статус:{' '}
                {RESCUE_STORY_PUBLICATION_STATUS_LABELS[publicationStatus] ?? publicationStatus}
              </p>
              <p>
                Публикувана:{' '}
                {selectedStory.publishedAt
                  ? new Date(selectedStory.publishedAt).toLocaleString('bg-BG')
                  : 'няма'}
              </p>
              <p>
                Обновена:{' '}
                {selectedStory.updatedAt ? new Date(selectedStory.updatedAt).toLocaleString('bg-BG') : 'няма'}
              </p>
            </div>
          ) : null}
          {selectedStory && isPublished ? (
            <p className="feedback-message feedback-message-info">
              Скрий публикацията, преди да редактираш историята.
            </p>
          ) : null}
          {selectedStory && isArchived ? (
            <p className="feedback-message feedback-message-info">
              Архивираните истории са достъпни само за преглед.
            </p>
          ) : null}
          {hasUnsavedChanges ? (
            <p className="feedback-message feedback-message-info">Има незапазени промени.</p>
          ) : null}
          {statusMessage ? <p className="feedback-message feedback-message-info">{statusMessage}</p> : null}
          {errorMessage ? (
            <p
              ref={errorFeedbackRef}
              className="feedback-message feedback-message-error"
              role="alert"
              tabIndex={-1}
            >
              {errorMessage}
            </p>
          ) : null}
        </aside>

        <section className="page-content-admin-card">
          <h2>
            {selectedStoryId
              ? canEditStoryFields
                ? 'Редакция на история'
                : 'Преглед на история'
              : 'Нова история'}
          </h2>
          <div className="page-content-admin-form-grid">
            <TextInput
              label="Заглавие"
              value={storyDraft.title}
              disabled={!canEditStoryFields}
              maxLength={RESCUE_STORY_TEXT_LIMITS.title}
              required
              onChange={(value) => updateStoryDraft({ title: value })}
            />
            <TextInput
              label="Slug"
              value={storyDraft.slug}
              disabled={!canEditStoryFields}
              maxLength={RESCUE_STORY_TEXT_LIMITS.slug}
              onChange={(value) => updateStoryDraft({ slug: value })}
            />
            <TextInput
              label="Име на животното"
              value={storyDraft.animalName}
              disabled={!canEditStoryFields}
              maxLength={RESCUE_STORY_TEXT_LIMITS.animalName}
              required
              onChange={(value) => updateStoryDraft({ animalName: value })}
            />
            <Field label="Вид животно">
              <select
                value={storyDraft.animalType}
                disabled={!canEditStoryFields}
                required
                onChange={(event) => updateStoryDraft({ animalType: event.target.value })}
              >
                <option value="" disabled>Избери вид</option>
                {ANIMAL_SPECIES_VALUES.map((animalType) => (
                  <option key={animalType} value={animalType}>
                    {ANIMAL_SPECIES_LABELS[animalType] ?? animalType}
                  </option>
                ))}
              </select>
            </Field>
            <TextInput
              label="От кого е историята"
              value={storyDraft.submittedBy}
              disabled={!canEditStoryFields}
              maxLength={RESCUE_STORY_TEXT_LIMITS.submittedBy}
              required
              onChange={(value) => updateStoryDraft({ submittedBy: value })}
            />
            <Field label="Резултат">
              <select
                value={storyDraft.outcomeStatus}
                disabled={!canEditStoryFields}
                required
                onChange={(event) => updateStoryDraft({ outcomeStatus: event.target.value })}
              >
                <option value="" disabled>Избери резултат</option>
                {RESCUE_STORY_OUTCOME_STATUS_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {RESCUE_STORY_OUTCOME_STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
            </Field>
            <TextInput
              label="Снимка"
              value={storyDraft.imageUrl}
              disabled={!canEditStoryFields}
              maxLength={RESCUE_STORY_TEXT_LIMITS.imageUrl}
              onChange={(value) => updateStoryDraft({ imageUrl: value })}
            />
            <TextInput
              label="Alt текст"
              value={storyDraft.imageAlt}
              disabled={!canEditStoryFields}
              maxLength={RESCUE_STORY_TEXT_LIMITS.imageAlt}
              onChange={(value) => updateStoryDraft({ imageAlt: value })}
            />
            <TextareaInput
              label="Кратко резюме"
              value={storyDraft.summary}
              disabled={!canEditStoryFields}
              maxLength={RESCUE_STORY_TEXT_LIMITS.summary}
              onChange={(value) => updateStoryDraft({ summary: value })}
            />
            <TextareaInput
              label="Пълна история"
              value={storyDraft.content}
              disabled={!canEditStoryFields}
              maxLength={RESCUE_STORY_TEXT_LIMITS.content}
              required
              onChange={(value) => updateStoryDraft({ content: value })}
              rows={8}
            />
          </div>
        </section>
      </form>

      <ConfirmDialog
        isOpen={Boolean(pendingNavigationPath)}
        title="Незапазени промени"
        description="Промените по текущата история не са запазени. Сигурен ли си, че искаш да напуснеш страницата?"
        confirmLabel="Продължи без запазване"
        tone="default"
        isSubmitting={isSaving}
        onConfirm={confirmNavigation}
        onClose={cancelNavigation}
      />

      <ConfirmDialog
        isOpen={pendingStoryId !== null}
        title="Незапазени промени"
        description={
          'Промените по текущата история не са запазени. Да преминем ли към „' +
          pendingStoryLabel +
          '“?'
        }
        confirmLabel="Продължи без запазване"
        tone="default"
        isSubmitting={isSaving}
        onConfirm={confirmStorySelection}
        onClose={() => setPendingStoryId(null)}
      />

      <ConfirmDialog
        isOpen={pendingAction === 'publish'}
        title="Публикуване на историята"
        description="Сигурен ли си, че искаш текущата версия на историята да стане публична?"
        confirmLabel="Публикувай"
        tone="default"
        isSubmitting={isSaving}
        onConfirm={publishStory}
        onClose={() => setPendingAction('')}
      />

      <ConfirmDialog
        isOpen={pendingAction === 'unpublish'}
        title="Скриване на публикацията"
        description="Сигурен ли си, че искаш историята да бъде скрита от публичната част?"
        confirmLabel="Скрий публикацията"
        isSubmitting={isSaving}
        onConfirm={unpublishStory}
        onClose={() => setPendingAction('')}
      />

      <ConfirmDialog
        isOpen={pendingAction === 'archive'}
        title="Архивиране на историята"
        description={
          'Сигурен ли си, че искаш да архивираш историята?' +
          (hasUnsavedChanges ? ' Незапазените промени няма да бъдат записани.' : '')
        }
        confirmLabel="Архивирай"
        isSubmitting={isSaving}
        onConfirm={archiveStory}
        onClose={() => setPendingAction('')}
      />
    </main>
  );
}
