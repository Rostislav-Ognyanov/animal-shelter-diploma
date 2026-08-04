import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { fetchJson, patchJson, postJson } from '../../lib/api.js';
import { RESCUE_STORY_STATUS_LABELS } from './rescueStoriesData.js';

const EMPTY_STORY = {
  title: '',
  slug: '',
  animalName: '',
  animalType: '',
  submittedBy: '',
  outcomeStatus: 'recovered',
  summary: '',
  content: '',
  imageUrl: '',
  imageAlt: '',
  isPublished: true,
  isFeatured: false,
  featuredOrder: 0,
};

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

function TextareaInput({ label, value, onChange, rows = 5 }) {
  return (
    <label className="page-content-admin-field page-content-admin-field-wide">
      <span>{label}</span>
      <textarea value={value ?? ''} rows={rows} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function RescueStoriesManagementPage({ role }) {
  const [stories, setStories] = useState([]);
  const [selectedStoryId, setSelectedStoryId] = useState('');
  const [storyDraft, setStoryDraft] = useState(EMPTY_STORY);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const dashboardPath = role === 'admin' ? '/admin' : '/staff';

  const selectedStory = useMemo(
    () => stories.find((story) => story.id === selectedStoryId) ?? null,
    [selectedStoryId, stories]
  );

  useEffect(() => {
    let isMounted = true;

    fetchJson('/api/rescue-stories/records')
      .then((payload) => {
        if (isMounted) {
          setStories(Array.isArray(payload?.items) ? payload.items : []);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(error.message);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setStoryDraft(selectedStory ? { ...EMPTY_STORY, ...selectedStory } : EMPTY_STORY);
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
    setSelectedStoryId(nextSelectedId);
  }

  async function saveStory(event) {
    event.preventDefault();
    setIsSaving(true);
    setStatusMessage('');
    setErrorMessage('');

    try {
      const savedStory = selectedStoryId
        ? await patchJson(`/api/rescue-stories/${selectedStoryId}`, storyDraft)
        : await postJson('/api/rescue-stories', storyDraft);

      await reloadStories(savedStory.id);
      setStatusMessage('Историята е запазена успешно.');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function archiveStory() {
    if (!selectedStoryId) {
      return;
    }

    setIsSaving(true);
    setStatusMessage('');
    setErrorMessage('');

    try {
      await patchJson(`/api/rescue-stories/${selectedStoryId}/archive`, {});
      await reloadStories('');
      setSelectedStoryId('');
      setStoryDraft(EMPTY_STORY);
      setStatusMessage('Историята е архивирана успешно.');
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
          <h1>Истории за спасявания</h1>
          <p>Добавяне, редакция, архивиране и избор на featured истории.</p>
        </div>
        <Link className="animals-secondary-action" to={dashboardPath}>
          Назад
        </Link>
      </section>

      <form className="page-content-admin-layout" onSubmit={saveStory}>
        <aside className="page-content-admin-sidebar">
          <Field label="История">
            <select value={selectedStoryId} onChange={(event) => setSelectedStoryId(event.target.value)}>
              <option value="">Нова история</option>
              {stories.map((story) => (
                <option key={story.id} value={story.id}>
                  {story.title}
                </option>
              ))}
            </select>
          </Field>
          <button type="submit" disabled={isSaving}>
            {isSaving ? 'Запазване...' : 'Запази история'}
          </button>
          {selectedStoryId ? (
            <button type="button" className="page-content-admin-secondary-action" onClick={archiveStory} disabled={isSaving}>
              Архивирай
            </button>
          ) : null}
          {statusMessage ? <p className="form-success-message">{statusMessage}</p> : null}
          {errorMessage ? <p className="form-error-message">{errorMessage}</p> : null}
        </aside>

        <section className="page-content-admin-card">
          <h2>{selectedStoryId ? 'Редакция на история' : 'Нова история'}</h2>
          <div className="page-content-admin-form-grid">
            <TextInput label="Заглавие" value={storyDraft.title} onChange={(value) => updateStoryDraft({ title: value })} />
            <TextInput label="Slug" value={storyDraft.slug} onChange={(value) => updateStoryDraft({ slug: value })} />
            <TextInput label="Име на животното" value={storyDraft.animalName} onChange={(value) => updateStoryDraft({ animalName: value })} />
            <TextInput label="Вид животно" value={storyDraft.animalType} onChange={(value) => updateStoryDraft({ animalType: value })} />
            <TextInput label="От кого е историята" value={storyDraft.submittedBy} onChange={(value) => updateStoryDraft({ submittedBy: value })} />
            <Field label="Статус">
              <select
                value={storyDraft.outcomeStatus}
                onChange={(event) => updateStoryDraft({ outcomeStatus: event.target.value })}
              >
                {Object.entries(RESCUE_STORY_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <TextInput label="Снимка" value={storyDraft.imageUrl} onChange={(value) => updateStoryDraft({ imageUrl: value })} />
            <TextInput label="Alt текст" value={storyDraft.imageAlt} onChange={(value) => updateStoryDraft({ imageAlt: value })} />
            <TextareaInput label="Кратко резюме" value={storyDraft.summary} onChange={(value) => updateStoryDraft({ summary: value })} />
            <TextareaInput label="Пълна история" value={storyDraft.content} onChange={(value) => updateStoryDraft({ content: value })} rows={8} />
            <label className="page-content-admin-checkbox">
              <input
                type="checkbox"
                checked={Boolean(storyDraft.isPublished)}
                onChange={(event) => updateStoryDraft({ isPublished: event.target.checked })}
              />
              <span>Публикувана</span>
            </label>
            <label className="page-content-admin-checkbox">
              <input
                type="checkbox"
                checked={Boolean(storyDraft.isFeatured)}
                onChange={(event) => updateStoryDraft({ isFeatured: event.target.checked })}
              />
              <span>Featured на началната страница</span>
            </label>
            <Field label="Featured ред">
              <input
                type="number"
                value={storyDraft.featuredOrder ?? 0}
                onChange={(event) => updateStoryDraft({ featuredOrder: Number(event.target.value) })}
              />
            </Field>
          </div>
        </section>
      </form>
    </main>
  );
}
