import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';
import { useErrorFeedbackFocus } from '../../hooks/useErrorFeedbackFocus.js';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard.js';
import { fetchJson, patchJson } from '../../lib/api.js';
import {
  SPECIES_CONTENT_EDITABLE_FIELDS,
  SPECIES_CONTENT_LIMITS,
} from '../../../../shared/domain/speciesContentConstants.js';
import {
  ANIMAL_SPECIES_LABELS,
  ANIMAL_SPECIES_VALUES,
} from '../../../../shared/domain/animalConstants.js';
import { getDefaultSpeciesContent } from './speciesContentData.js';

function splitLines(value) {
  return String(value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function joinLines(value) {
  return Array.isArray(value) ? value.join('\n') : '';
}

function cloneDraft(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildEditableDraft(defaultContent, savedDraft, species) {
  return cloneDraft({
    ...defaultContent,
    ...(savedDraft ?? {}),
    species,
  });
}

function buildDraftPayload(draft) {
  return SPECIES_CONTENT_EDITABLE_FIELDS.reduce((payload, fieldName) => {
    payload[fieldName] = draft[fieldName];
    return payload;
  }, {});
}

function validateTextLength(value, fieldName, maximumLength) {
  return String(value ?? '').trim().length > maximumLength
    ? `${fieldName} не може да надвишава ${maximumLength} символа.`
    : '';
}

function validateTextList(items, { fieldName, itemName, maxItems, maxItemLength }) {
  if (!Array.isArray(items)) {
    return `${fieldName} трябва да бъде списък.`;
  }

  if (items.length > maxItems) {
    return `${fieldName} може да съдържа най-много ${maxItems} елемента.`;
  }

  return items
    .map((item) => validateTextLength(item, itemName, maxItemLength))
    .find(Boolean) ?? '';
}

function validateSpeciesDraft(draft, { forPublish = false } = {}) {
  const rootFields = [
    ['Името на вида', draft.displayName, SPECIES_CONTENT_LIMITS.displayName],
    ['Заглавието', draft.title, SPECIES_CONTENT_LIMITS.title],
    ['Подзаглавието', draft.subtitle, SPECIES_CONTENT_LIMITS.subtitle],
    ['Пътят до снимката на картата', draft.cardImageUrl, SPECIES_CONTENT_LIMITS.imageUrl],
    ['Alt текстът на снимката на картата', draft.cardImageAlt, SPECIES_CONTENT_LIMITS.imageAlt],
    ['Пътят до hero снимката', draft.heroImageUrl, SPECIES_CONTENT_LIMITS.imageUrl],
    ['Въведението', draft.introduction, SPECIES_CONTENT_LIMITS.introduction],
  ];

  for (const [fieldName, value, maximumLength] of rootFields) {
    const error = validateTextLength(value, fieldName, maximumLength);

    if (error) {
      return error;
    }
  }

  if (draft.cardImageUrl && !String(draft.cardImageAlt ?? '').trim()) {
    return 'Alt текстът на снимката на картата е задължителен, когато има снимка.';
  }

  const issuesError = validateTextList(draft.issues, {
    fieldName: 'Основните проблеми и акценти',
    itemName: 'Проблемът или акцентът',
    maxItems: SPECIES_CONTENT_LIMITS.issues,
    maxItemLength: SPECIES_CONTENT_LIMITS.issue,
  });

  if (issuesError) {
    return issuesError;
  }

  if (!Array.isArray(draft.sections)) {
    return 'Секциите трябва да бъдат списък.';
  }

  if (draft.sections.length > SPECIES_CONTENT_LIMITS.sections) {
    return `Съдържанието може да има най-много ${SPECIES_CONTENT_LIMITS.sections} секции.`;
  }

  for (const section of draft.sections) {
    const sectionFields = [
      ['Заглавието на секцията', section.title, SPECIES_CONTENT_LIMITS.sectionTitle],
      ['Пътят до снимката в секцията', section.imageUrl, SPECIES_CONTENT_LIMITS.imageUrl],
      ['Alt текстът на снимката в секцията', section.imageAlt, SPECIES_CONTENT_LIMITS.imageAlt],
    ];

    for (const [fieldName, value, maximumLength] of sectionFields) {
      const error = validateTextLength(value, fieldName, maximumLength);

      if (error) {
        return error;
      }
    }

    if (section.imageUrl && !String(section.imageAlt ?? '').trim()) {
      return 'Alt текстът на снимката в секцията е задължителен, когато има снимка.';
    }

    const paragraphsError = validateTextList(section.paragraphs, {
      fieldName: 'Параграфите в секцията',
      itemName: 'Параграфът',
      maxItems: SPECIES_CONTENT_LIMITS.paragraphsPerSection,
      maxItemLength: SPECIES_CONTENT_LIMITS.paragraph,
    });
    const itemsError = validateTextList(section.items, {
      fieldName: 'Елементите в секцията',
      itemName: 'Елементът от списъка',
      maxItems: SPECIES_CONTENT_LIMITS.itemsPerSection,
      maxItemLength: SPECIES_CONTENT_LIMITS.item,
    });

    if (paragraphsError || itemsError) {
      return paragraphsError || itemsError;
    }
  }

  if (forPublish) {
    const requiredFields = [
      ['Името на вида', draft.displayName],
      ['Заглавието', draft.title],
      ['Въведението', draft.introduction],
      ['Снимката на картата', draft.cardImageUrl],
      ['Alt текстът на снимката на картата', draft.cardImageAlt],
    ];
    const missingField = requiredFields.find(([, value]) => !String(value ?? '').trim());

    if (missingField) {
      return `${missingField[0]} е задължително преди публикуване.`;
    }

    const hasVisibleContentSection = draft.sections.some(
      (section) =>
        section.isVisible !== false &&
        (section.title || section.paragraphs.length > 0 || section.items.length > 0)
    );

    if (!hasVisibleContentSection) {
      return 'Преди публикуване е необходима поне една видима съдържателна секция.';
    }
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

function TextInput({ label, value, onChange, maxLength }) {
  return (
    <Field label={label}>
      <input
        value={value ?? ''}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

function TextareaInput({ label, value, onChange, rows = 4, maxLength }) {
  return (
    <label className="page-content-admin-field page-content-admin-field-wide">
      <span>{label}</span>
      <textarea
        value={value ?? ''}
        rows={rows}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function buildEmptySection() {
  return {
    title: 'Нова секция',
    paragraphs: [],
    items: [],
    imageUrl: '',
    imageAlt: '',
    imagePosition: 'right',
    order: Date.now(),
    isVisible: true,
    centered: false,
  };
}

function getKnownSpecies(value) {
  return ANIMAL_SPECIES_VALUES.includes(value) ? value : ANIMAL_SPECIES_VALUES[0];
}

function getSpeciesFallbackContent(species) {
  return (
    getDefaultSpeciesContent(species) ?? {
      species,
      displayName: ANIMAL_SPECIES_LABELS[species] ?? species,
      title: '',
      subtitle: '',
      cardImageUrl: '',
      cardImageAlt: '',
      heroImageUrl: '',
      introduction: '',
      issues: [],
      sections: [],
    }
  );
}

export function SpeciesContentManagementPage({ role }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedSpecies, setSelectedSpecies] = useState(() => getKnownSpecies(searchParams.get('species')));
  const [reloadToken, setReloadToken] = useState(0);
  const defaultContent = useMemo(() => getSpeciesFallbackContent(selectedSpecies), [selectedSpecies]);
  const [draft, setDraft] = useState(() => cloneDraft(defaultContent));
  const [lastSavedDraft, setLastSavedDraft] = useState(() => cloneDraft(defaultContent));
  const [currentRecord, setCurrentRecord] = useState(null);
  const [pendingSpecies, setPendingSpecies] = useState('');
  const [pendingAction, setPendingAction] = useState('');
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
  const canUseDraft = !loadState.isLoading && !loadState.error;
  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(lastSavedDraft),
    [draft, lastSavedDraft]
  );
  const { pendingNavigationPath, confirmNavigation, cancelNavigation } =
    useUnsavedChangesGuard(hasUnsavedChanges);

  useEffect(() => {
    const nextSpecies = getKnownSpecies(searchParams.get('species'));

    if (nextSpecies !== selectedSpecies) {
      setSelectedSpecies(nextSpecies);
    }
  }, [searchParams, selectedSpecies]);

  function applySpeciesSelection(nextSpecies) {
    const normalizedSpecies = getKnownSpecies(nextSpecies);

    setSelectedSpecies(normalizedSpecies);
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      nextParams.set('species', normalizedSpecies);
      return nextParams;
    });
  }

  function selectSpecies(nextSpecies) {
    const normalizedSpecies = getKnownSpecies(nextSpecies);

    if (normalizedSpecies === selectedSpecies) {
      return;
    }

    if (hasUnsavedChanges) {
      setPendingSpecies(normalizedSpecies);
      return;
    }

    applySpeciesSelection(normalizedSpecies);
  }

  function confirmSpeciesSelection() {
    if (!pendingSpecies) {
      return;
    }

    const nextSpecies = pendingSpecies;
    setPendingSpecies('');
    applySpeciesSelection(nextSpecies);
  }

  useEffect(() => {
    let isMounted = true;

    setStatusMessage('');
    setErrorMessage('');
    setLoadState({
      isLoading: true,
      error: '',
    });
    const initialDraft = buildEditableDraft(defaultContent, null, selectedSpecies);
    setDraft(initialDraft);
    setLastSavedDraft(cloneDraft(initialDraft));
    setCurrentRecord(null);
    setPendingSpecies('');

    fetchJson(`/api/species-content/drafts/${selectedSpecies}`)
      .then((payload) => {
        if (!isMounted) {
          return;
        }

        const nextDraft = buildEditableDraft(defaultContent, payload?.draft, selectedSpecies);
        setDraft(nextDraft);
        setLastSavedDraft(cloneDraft(nextDraft));
        setCurrentRecord(payload ?? null);
        setLoadState({
          isLoading: false,
          error: '',
        });
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
  }, [defaultContent, reloadToken, selectedSpecies]);

  function updateDraft(patch) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      ...patch,
    }));
  }

  function updateSection(index, patch) {
    setDraft((currentDraft) => {
      const sections = [...(currentDraft.sections ?? [])];
      sections[index] = {
        ...sections[index],
        ...patch,
      };

      return {
        ...currentDraft,
        sections,
      };
    });
  }

  function moveSection(index, direction) {
    setDraft((currentDraft) => {
      const sections = [...(currentDraft.sections ?? [])];
      const nextIndex = index + direction;

      if (nextIndex < 0 || nextIndex >= sections.length) {
        return currentDraft;
      }

      [sections[index], sections[nextIndex]] = [sections[nextIndex], sections[index]];

      return {
        ...currentDraft,
        sections: sections.map((section, sectionIndex) => ({ ...section, order: sectionIndex })),
      };
    });
  }

  async function saveDraft() {
    if (!canUseDraft) {
      return;
    }

    const validationError = validateSpeciesDraft(draft);

    if (validationError) {
      setStatusMessage('');
      setErrorMessage(validationError);
      return;
    }

    setIsSaving(true);
    setStatusMessage('');
    setErrorMessage('');

    try {
      const payload = await patchJson(
        `/api/species-content/drafts/${selectedSpecies}`,
        buildDraftPayload(draft)
      );
      const nextDraft = buildEditableDraft(defaultContent, payload?.draft, selectedSpecies);
      setDraft(nextDraft);
      setLastSavedDraft(cloneDraft(nextDraft));
      setCurrentRecord(payload ?? null);
      setStatusMessage('Черновата е запазена успешно.');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function publishDraft() {
    if (!canUseDraft) {
      return;
    }

    setIsSaving(true);
    setStatusMessage('');
    setErrorMessage('');

    try {
      await patchJson(
        `/api/species-content/drafts/${selectedSpecies}`,
        buildDraftPayload(draft)
      );
      const payload = await patchJson(`/api/species-content/drafts/${selectedSpecies}/publish`, {});
      const nextDraft = buildEditableDraft(defaultContent, payload?.draft, selectedSpecies);
      setDraft(nextDraft);
      setLastSavedDraft(cloneDraft(nextDraft));
      setCurrentRecord(payload ?? null);
      setStatusMessage('Информацията е публикувана успешно.');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSaving(false);
      setPendingAction('');
    }
  }

  function requestPublish() {
    const validationError = validateSpeciesDraft(draft, { forPublish: true });

    if (validationError) {
      setStatusMessage('');
      setErrorMessage(validationError);
      return;
    }

    setPendingAction('publish');
  }

  async function archiveDraft() {
    if (!canUseDraft) {
      return;
    }

    setIsSaving(true);
    setStatusMessage('');
    setErrorMessage('');

    try {
      const payload = await patchJson(`/api/species-content/drafts/${selectedSpecies}/archive`, {});
      setCurrentRecord(payload ?? null);
      setStatusMessage('Публичната информация за вида е скрита успешно.');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSaving(false);
      setPendingAction('');
    }
  }

  return (
    <main className="route-shell page-content-admin-shell">
      <section className="route-card page-content-admin-hero page-content-admin-hero-wide">
        <div>
          <p className="route-meta">Структурирано съдържание</p>
          <h1>Информация за видовете</h1>
          <p>Служител редактира чернова, а администратор публикува публичната версия.</p>
        </div>
        <Link className="app-secondary-action" to={contentDashboardPath}>
          Към управление на съдържанието
        </Link>
      </section>

      <section className="page-content-admin-layout">
        <aside className="page-content-admin-sidebar">
          <Field label="Вид">
            <select
              value={selectedSpecies}
              disabled={isSaving || loadState.isLoading}
              onChange={(event) => selectSpecies(event.target.value)}
            >
              {ANIMAL_SPECIES_VALUES.map((species) => (
                <option key={species} value={species}>
                  {ANIMAL_SPECIES_LABELS[species] ?? species}
                </option>
              ))}
            </select>
          </Field>
          <button type="button" onClick={saveDraft} disabled={isSaving || !canUseDraft}>
            {loadState.isLoading ? 'Зареждане...' : isSaving ? 'Запазване...' : 'Запази чернова'}
          </button>
          {canPublish ? (
            <button type="button" onClick={requestPublish} disabled={isSaving || !canUseDraft}>
              Публикувай
            </button>
          ) : null}
          {canPublish && currentRecord?.isPublished ? (
            <button
              type="button"
              className="page-content-admin-secondary-action"
              onClick={() => setPendingAction('archive')}
              disabled={isSaving || !canUseDraft}
            >
              Скрий публичната информация
            </button>
          ) : null}
          {loadState.isLoading ? (
            <p className="content-state-message" role="status">
              Зареждане на черновата...
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
          <div className="page-content-admin-meta">
            <p>
              Публичен статус:{' '}
              {currentRecord?.isPublished
                ? 'Публикувано'
                : currentRecord?.published
                  ? 'Скрито'
                  : 'Чернова'}
            </p>
            <p>
              Чернова:{' '}
              {hasUnsavedChanges
                ? 'Има незапазени промени'
                : currentRecord?.hasUnpublishedChanges
                  ? 'Има непубликувани промени'
                  : currentRecord?.published
                    ? 'Съвпада с публикуваната версия'
                    : 'Все още не е публикувана'}
            </p>
            <p>
              Публикувано:{' '}
              {currentRecord?.publishedAt
                ? new Date(currentRecord.publishedAt).toLocaleString('bg-BG')
                : 'няма'}
            </p>
            <p>
              Обновено:{' '}
              {currentRecord?.updatedAt ? new Date(currentRecord.updatedAt).toLocaleString('bg-BG') : 'няма'}
            </p>
          </div>
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

        {canUseDraft ? (
          <div className="page-content-admin-editor">
          <section className="page-content-admin-card">
            <h2>Основна информация</h2>
            <div className="page-content-admin-form-grid">
              <TextInput
                label="Име на вида"
                value={draft.displayName}
                maxLength={SPECIES_CONTENT_LIMITS.displayName}
                onChange={(value) => updateDraft({ displayName: value })}
              />
              <TextInput
                label="Заглавие"
                value={draft.title}
                maxLength={SPECIES_CONTENT_LIMITS.title}
                onChange={(value) => updateDraft({ title: value })}
              />
              <TextInput
                label="Подзаглавие"
                value={draft.subtitle}
                maxLength={SPECIES_CONTENT_LIMITS.subtitle}
                onChange={(value) => updateDraft({ subtitle: value })}
              />
              <TextInput
                label="Card снимка"
                value={draft.cardImageUrl}
                maxLength={SPECIES_CONTENT_LIMITS.imageUrl}
                onChange={(value) => updateDraft({ cardImageUrl: value })}
              />
              <TextInput
                label="Card alt"
                value={draft.cardImageAlt}
                maxLength={SPECIES_CONTENT_LIMITS.imageAlt}
                onChange={(value) => updateDraft({ cardImageAlt: value })}
              />
              <TextInput
                label="Hero снимка"
                value={draft.heroImageUrl}
                maxLength={SPECIES_CONTENT_LIMITS.imageUrl}
                onChange={(value) => updateDraft({ heroImageUrl: value })}
              />
              <TextareaInput
                label="Въведение"
                value={draft.introduction}
                maxLength={SPECIES_CONTENT_LIMITS.introduction}
                onChange={(value) => updateDraft({ introduction: value })}
              />
              <TextareaInput
                label="Основни проблеми/акценти, всеки на нов ред"
                value={joinLines(draft.issues)}
                maxLength={SPECIES_CONTENT_LIMITS.issues * (SPECIES_CONTENT_LIMITS.issue + 1)}
                onChange={(value) => updateDraft({ issues: splitLines(value) })}
              />
            </div>
          </section>

          <section className="page-content-admin-card">
            <h2>Секции</h2>
            <div className="page-content-admin-block-list">
              {(draft.sections ?? []).map((section, index) => (
                <article key={`${section.title}-${index}`} className="page-content-admin-block">
                  <div className="page-content-admin-block-toolbar">
                    <label className="page-content-admin-checkbox">
                      <input
                        type="checkbox"
                        checked={section.isVisible !== false}
                        onChange={(event) => updateSection(index, { isVisible: event.target.checked })}
                      />
                      <span>Показвай секцията</span>
                    </label>
                    <div className="page-content-admin-block-actions">
                      <button type="button" onClick={() => moveSection(index, -1)} disabled={index === 0}>
                        Нагоре
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSection(index, 1)}
                        disabled={index === (draft.sections ?? []).length - 1}
                      >
                        Надолу
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateDraft({
                            sections: (draft.sections ?? []).filter((_, sectionIndex) => sectionIndex !== index),
                          })
                        }
                      >
                        Премахни
                      </button>
                    </div>
                  </div>

                  <div className="page-content-admin-form-grid">
                    <TextInput
                      label="Заглавие"
                      value={section.title}
                      maxLength={SPECIES_CONTENT_LIMITS.sectionTitle}
                      onChange={(value) => updateSection(index, { title: value })}
                    />
                    <Field label="Позиция на снимката">
                      <select
                        value={section.imagePosition ?? 'right'}
                        onChange={(event) => updateSection(index, { imagePosition: event.target.value })}
                      >
                        <option value="right">Дясно</option>
                        <option value="left">Ляво</option>
                      </select>
                    </Field>
                    <TextInput
                      label="Снимка"
                      value={section.imageUrl}
                      maxLength={SPECIES_CONTENT_LIMITS.imageUrl}
                      onChange={(value) => updateSection(index, { imageUrl: value })}
                    />
                    <TextInput
                      label="Alt текст"
                      value={section.imageAlt}
                      maxLength={SPECIES_CONTENT_LIMITS.imageAlt}
                      onChange={(value) => updateSection(index, { imageAlt: value })}
                    />
                    <TextareaInput
                      label="Параграфи, всеки на нов ред"
                      value={joinLines(section.paragraphs)}
                      maxLength={
                        SPECIES_CONTENT_LIMITS.paragraphsPerSection *
                        (SPECIES_CONTENT_LIMITS.paragraph + 1)
                      }
                      onChange={(value) => updateSection(index, { paragraphs: splitLines(value) })}
                    />
                    <TextareaInput
                      label="Списък, всеки елемент на нов ред"
                      value={joinLines(section.items)}
                      maxLength={
                        SPECIES_CONTENT_LIMITS.itemsPerSection *
                        (SPECIES_CONTENT_LIMITS.item + 1)
                      }
                      onChange={(value) => updateSection(index, { items: splitLines(value) })}
                    />
                    <label className="page-content-admin-checkbox">
                      <input
                        type="checkbox"
                        checked={Boolean(section.centered)}
                        onChange={(event) => updateSection(index, { centered: event.target.checked })}
                      />
                      <span>Центриран блок</span>
                    </label>
                  </div>
                </article>
              ))}
            </div>
            <button
              type="button"
              className="page-content-admin-secondary-action"
              disabled={(draft.sections ?? []).length >= SPECIES_CONTENT_LIMITS.sections}
              onClick={() => updateDraft({ sections: [...(draft.sections ?? []), buildEmptySection()] })}
            >
              Добави секция
            </button>
          </section>
          </div>
        ) : (
          <div className="page-content-admin-editor">
            <section className="page-content-admin-card">
              <p className="content-state-message">
                {loadState.isLoading
                  ? 'Черновата се зарежда и редакторът временно е заключен.'
                  : 'Редакторът ще бъде достъпен след успешно зареждане на черновата.'}
              </p>
            </section>
          </div>
        )}
      </section>

      <ConfirmDialog
        isOpen={Boolean(pendingNavigationPath)}
        title="Незапазени промени"
        description="Промените по текущия вид не са запазени. Сигурен ли си, че искаш да напуснеш страницата?"
        confirmLabel="Продължи без запазване"
        tone="default"
        isSubmitting={isSaving}
        onConfirm={confirmNavigation}
        onClose={cancelNavigation}
      />

      <ConfirmDialog
        isOpen={Boolean(pendingSpecies)}
        title="Незапазени промени"
        description="Промените по текущия вид не са запазени. Да преминем ли към другия вид?"
        confirmLabel="Продължи без запазване"
        tone="default"
        isSubmitting={isSaving}
        onConfirm={confirmSpeciesSelection}
        onClose={() => setPendingSpecies('')}
      />

      <ConfirmDialog
        isOpen={pendingAction === 'publish'}
        title="Публикуване на информацията"
        description="Сигурен ли си, че искаш текущата чернова да стане публична?"
        confirmLabel="Публикувай"
        tone="default"
        isSubmitting={isSaving}
        onConfirm={publishDraft}
        onClose={() => setPendingAction('')}
      />

      <ConfirmDialog
        isOpen={pendingAction === 'archive'}
        title="Скриване на публичната информация"
        description="Сигурен ли си, че искаш да скриеш публичната информация за вида?"
        confirmLabel="Скрий информацията"
        isSubmitting={isSaving}
        onConfirm={archiveDraft}
        onClose={() => setPendingAction('')}
      />
    </main>
  );
}
