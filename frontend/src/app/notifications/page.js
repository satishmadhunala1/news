'use client';

import { useEffect, useState } from 'react';
import { api, formatDate } from '@/lib/api';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await api.notificationHistory({ limit: 40 });
      setItems(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section>
      <header className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Notification History
        </h1>
        <p className="mt-2 text-[var(--muted)]">Telegram delivery log for your articles.</p>
      </header>

      {error ? <ErrorState message={error} onRetry={load} /> : null}
      {loading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : null}
      {!loading && !items.length ? (
        <EmptyState title="No notifications yet" description="Send a test message from Settings." />
      ) : null}

      <ul className="divide-y divide-[var(--border)]">
        {items.map((item) => (
          <li key={item._id} className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{item.newsId?.title || item.messagePreview || 'Article'}</p>
              <span
                className={`rounded px-2 py-0.5 text-xs ${
                  item.status === 'sent'
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {item.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {formatDate(item.sentAt)} · chat {item.telegramChatId}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
