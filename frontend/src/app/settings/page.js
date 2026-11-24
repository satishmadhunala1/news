'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ErrorState } from '@/components/ErrorState';

export default function SettingsPage() {
  const [prefs, setPrefs] = useState(null);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [customLocation, setCustomLocation] = useState('');

  async function load() {
    setError('');
    try {
      const res = await api.preferences();
      setPrefs(res.data);
      setMeta(res.meta);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function toggleList(field, id) {
    setPrefs((prev) => {
      const set = new Set(prev[field] || []);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...prev, [field]: Array.from(set) };
    });
  }

  async function save() {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const res = await api.updatePreferences({
        selectedLocations: prefs.selectedLocations,
        selectedCategories: prefs.selectedCategories,
        customLocations: prefs.customLocations,
        preferredLanguage: prefs.preferredLanguage,
        notificationFrequency: prefs.notificationFrequency,
        notificationEnabled: prefs.notificationEnabled,
        breakingNewsAlerts: prefs.breakingNewsAlerts,
        morningBriefingTime: prefs.morningBriefingTime,
        afternoonBriefingTime: prefs.afternoonBriefingTime,
        eveningBriefingTime: prefs.eveningBriefingTime,
        maxArticlesPerBriefing: Number(prefs.maxArticlesPerBriefing),
        telegramPaused: prefs.telegramPaused,
      });
      setPrefs(res.data);
      setMessage('Settings saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function runFetch() {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const res = await api.fetchNews();
      setMessage(`Fetch complete. Saved ${res.saved ?? 0} new articles.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function testTelegram() {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      await api.testNotification();
      setMessage('Test Telegram message sent.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function runEnrichImages() {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const res = await api.enrichImages();
      setMessage(`Images updated for ${res.updated ?? 0} of ${res.checked ?? 0} articles.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function addCustomLocation() {
    const label = customLocation.trim();
    if (!label) return;
    const id = label.toLowerCase().replace(/\s+/g, '-');
    setPrefs((prev) => ({
      ...prev,
      customLocations: [...(prev.customLocations || []), { id, label, query: label }],
      selectedLocations: Array.from(new Set([...(prev.selectedLocations || []), id])),
    }));
    setCustomLocation('');
  }

  if (!prefs) {
    return (
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">Settings</h1>
        {error ? <ErrorState message={error} onRetry={load} /> : <p className="mt-4 text-sm text-[var(--muted)]">Loading…</p>}
      </div>
    );
  }

  return (
    <section className="space-y-8">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Settings
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          Configure locations, categories, language, and Telegram briefings.
        </p>
      </header>

      {error ? <ErrorState message={error} /> : null}
      {message ? (
        <div className="rounded-md border border-[var(--border)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent)]">
          {message}
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <fieldset className="space-y-3">
          <legend className="text-lg font-semibold">Locations</legend>
          <div className="flex flex-wrap gap-2">
            {(meta?.availableLocations || []).map((loc) => (
              <label key={loc.id} className="inline-flex items-center gap-2 rounded-md bg-[var(--chip)] px-3 py-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={prefs.selectedLocations?.includes(loc.id)}
                  onChange={() => toggleList('selectedLocations', loc.id)}
                />
                {loc.label}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={customLocation}
              onChange={(e) => setCustomLocation(e.target.value)}
              placeholder="Add city or country"
              className="flex-1 rounded-md border border-[var(--border)] px-3 py-2 text-sm"
            />
            <button type="button" onClick={addCustomLocation} className="rounded-md border border-[var(--border)] px-3 py-2 text-sm">
              Add
            </button>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-lg font-semibold">Categories</legend>
          <div className="flex flex-wrap gap-2">
            {(meta?.availableCategories || []).map((cat) => (
              <label key={cat.id} className="inline-flex items-center gap-2 rounded-md bg-[var(--chip)] px-3 py-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={prefs.selectedCategories?.includes(cat.id)}
                  onChange={() => toggleList('selectedCategories', cat.id)}
                />
                {cat.label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Preferred language">
          <select
            value={prefs.preferredLanguage}
            onChange={(e) => setPrefs({ ...prefs, preferredLanguage: e.target.value })}
            className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
          >
            <option value="en">English</option>
            <option value="te">Telugu</option>
            <option value="both">English + Telugu</option>
          </select>
        </Field>
        <Field label="Notification frequency">
          <select
            value={prefs.notificationFrequency}
            onChange={(e) => setPrefs({ ...prefs, notificationFrequency: e.target.value })}
            className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </Field>
        <Field label="Max articles per briefing">
          <input
            type="number"
            min={1}
            max={30}
            value={prefs.maxArticlesPerBriefing}
            onChange={(e) => setPrefs({ ...prefs, maxArticlesPerBriefing: e.target.value })}
            className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Morning briefing">
          <input
            type="time"
            value={prefs.morningBriefingTime}
            onChange={(e) => setPrefs({ ...prefs, morningBriefingTime: e.target.value })}
            className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Afternoon briefing">
          <input
            type="time"
            value={prefs.afternoonBriefingTime}
            onChange={(e) => setPrefs({ ...prefs, afternoonBriefingTime: e.target.value })}
            className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Evening briefing">
          <input
            type="time"
            value={prefs.eveningBriefingTime}
            onChange={(e) => setPrefs({ ...prefs, eveningBriefingTime: e.target.value })}
            className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
          />
        </Field>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <Toggle
          label="Telegram notifications"
          checked={prefs.notificationEnabled && !prefs.telegramPaused}
          onChange={(v) =>
            setPrefs({ ...prefs, notificationEnabled: v, telegramPaused: !v })
          }
        />
        <Toggle
          label="Breaking news alerts"
          checked={!!prefs.breakingNewsAlerts}
          onChange={(v) => setPrefs({ ...prefs, breakingNewsAlerts: v })}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="rounded-md bg-[#1a1a1a] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          Save settings
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={runFetch}
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-medium disabled:opacity-60"
        >
          Fetch news now
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={runEnrichImages}
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-medium disabled:opacity-60"
        >
          Fetch card images
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={testTelegram}
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-medium disabled:opacity-60"
        >
          Test Telegram
        </button>
      </div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="inline-flex items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
