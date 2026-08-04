import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { fetchJson, patchJson } from '../../lib/api.js';
import { DEFAULT_SPECIES_CONTENT, getDefaultSpeciesContent } from './speciesContentData.js';

function splitLines(value) {
  return String(value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function joinLines(value) {
  return Array.isArray(value) ? value.join('\n') : '';
}

function Field({ label, children }) {
  return (
    <label className="page-content-admin-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function TextInput({ label, value, onChange }) {
  return (
    <Field label={label}>
      <input value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
    </Field>
  );
}

function TextareaInput({ label, value, onChange, rows = 4 }) {
  return (
    <label className="page-content-admin-field page-content-admin-field-wide">
      <span>{label}</span>
      <textarea value={value ?? ''} rows={rows} onChange={(event) => onChange(event.target.value)} />
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

export function SpeciesContentManagementPage({ role }) {
  const [selectedSpecies, setSelectedSpecies] = useState(DEFAULT_SPECIES_CONTENT[0].species);
  const defaultContent = useMemo(() => getDefaultSpeciesContent(selectedSpecies), [selectedSpecies]);
  const [draft, setDraft] = useState(defaultContent);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const dashboardPath = role === 'admin' ? '/admin' : '/staff';
  const canPublish = role === 'admin';

  useEffect(() => {
    let isMounted = true;

    setStatusMessage('');
    setErrorMessage('');
    setDraft(defaultContent);

    fetchJson(`/api/species-content/drafts/${selectedSpecies}`)
      .then((payload) => {
        if (!isMounted) {
          return;
        }

        setDraft({
          ...defaultContent,
          ...(payload?.draft ?? {}),
          species: selectedSpecies,
        });
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(error.message);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [defaultContent, selectedSpecies]);

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
    setIsSaving(true);
    setStatusMessage('');
    setErrorMessage('');

    try {
      const payload = await patchJson(`/api/species-content/drafts/${selectedSpecies}`, draft);
      setDraft({
        ...defaultContent,
        ...(payload?.draft ?? {}),
        species: selectedSpecies,
      });
      setStatusMessage('Черновата е запазена успешно.');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function publishDraft() {
    setIsSaving(true);
    setStatusMessage('');
    setErrorMessage('');

    try {
      await patchJson(`/api/species-content/drafts/${selectedSpecies}`, draft);
      const payload = await patchJson(`/api/species-content/drafts/${selectedSpecies}/publish`, {});
      setDraft({
        ...defaultContent,
        ...(payload?.draft ?? {}),
        species: selectedSpecies,
      });
      setStatusMessage('Информацията е публикувана успешно.');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="route-shell page-content-admin-shell">
      <section className="route-card page-content-admin-hero">
        <div>
          <p className="route-meta">Структурирано съдържание</p>
          <h1>Информация за видовете</h1>
          <p>Служител редактира чернова, а администратор публикува публичната версия.</p>
        </div>
        <Link className="animals-secondary-action" to={dashboardPath}>
          Назад
        </Link>
      </section>

      <section className="page-content-admin-layout">
        <aside className="page-content-admin-sidebar">
          <Field label="Вид">
            <select value={selectedSpecies} onChange={(event) => setSelectedSpecies(event.target.value)}>
              {DEFAULT_SPECIES_CONTENT.map((species) => (
                <option key={species.species} value={species.species}>
                  {species.displayName}
                </option>
              ))}
            </select>
          </Field>
          <button type="button" onClick={saveDraft} disabled={isSaving}>
            {isSaving ? 'Запазване...' : 'Запази чернова'}
          </button>
          {canPublish ? (
            <button type="button" onClick={publishDraft} disabled={isSaving}>
              Публикувай
            </button>
          ) : null}
          {statusMessage ? <p className="form-success-message">{statusMessage}</p> : null}
          {errorMessage ? <p className="form-error-message">{errorMessage}</p> : null}
        </aside>

        <div className="page-content-admin-editor">
          <section className="page-content-admin-card">
            <h2>Основна информация</h2>
            <div className="page-content-admin-form-grid">
              <TextInput label="Име на вида" value={draft.displayName} onChange={(value) => updateDraft({ displayName: value })} />
              <TextInput label="Заглавие" value={draft.title} onChange={(value) => updateDraft({ title: value })} />
              <TextInput label="Подзаглавие" value={draft.subtitle} onChange={(value) => updateDraft({ subtitle: value })} />
              <TextInput label="Card снимка" value={draft.cardImageUrl} onChange={(value) => updateDraft({ cardImageUrl: value })} />
              <TextInput label="Card alt" value={draft.cardImageAlt} onChange={(value) => updateDraft({ cardImageAlt: value })} />
              <TextInput label="Hero снимка" value={draft.heroImageUrl} onChange={(value) => updateDraft({ heroImageUrl: value })} />
              <TextareaInput label="Въведение" value={draft.introduction} onChange={(value) => updateDraft({ introduction: value })} />
              <TextareaInput
                label="Основни проблеми/акценти, всеки на нов ред"
                value={joinLines(draft.issues)}
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
                    <TextInput label="Заглавие" value={section.title} onChange={(value) => updateSection(index, { title: value })} />
                    <Field label="Позиция на снимката">
                      <select
                        value={section.imagePosition ?? 'right'}
                        onChange={(event) => updateSection(index, { imagePosition: event.target.value })}
                      >
                        <option value="right">Дясно</option>
                        <option value="left">Ляво</option>
                      </select>
                    </Field>
                    <TextInput label="Снимка" value={section.imageUrl} onChange={(value) => updateSection(index, { imageUrl: value })} />
                    <TextInput label="Alt текст" value={section.imageAlt} onChange={(value) => updateSection(index, { imageAlt: value })} />
                    <TextareaInput
                      label="Параграфи, всеки на нов ред"
                      value={joinLines(section.paragraphs)}
                      onChange={(value) => updateSection(index, { paragraphs: splitLines(value) })}
                    />
                    <TextareaInput
                      label="Списък, всеки елемент на нов ред"
                      value={joinLines(section.items)}
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
              onClick={() => updateDraft({ sections: [...(draft.sections ?? []), buildEmptySection()] })}
            >
              Добави секция
            </button>
          </section>
        </div>
      </section>
    </main>
  );
}
