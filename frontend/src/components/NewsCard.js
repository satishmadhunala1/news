'use client';

import { Bookmark, ArrowUpRight } from 'lucide-react';
import { formatDate, labelize } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { getDisplayContent } from '@/lib/articleDisplay';

const PLACEHOLDER_TONES = ['#d7ebe9', '#dde7f0', '#e8e6df', '#e4efe6', '#ebe4e8'];

function placeholderTone(article) {
  const key = `${article._id || ''}${article.url || ''}${article.title || ''}`;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash + key.charCodeAt(i) * (i + 3)) % PLACEHOLDER_TONES.length;
  return PLACEHOLDER_TONES[hash];
}

function getChannelName(article) {
  const name = (article.sourceName || '').trim();
  if (!name || /^(google-news-rss|gnews|newsapi)$/i.test(name)) {
    const parts = (article.title || '').split(/\s+-\s+/);
    if (parts.length > 1) return parts[parts.length - 1].trim();
    return 'Unknown source';
  }
  if (/^Google News/i.test(name)) {
    const parts = (article.title || '').split(/\s+-\s+/);
    if (parts.length > 1) return parts[parts.length - 1].trim();
  }
  return name;
}

export function NewsCard({ article, onBookmark, featured = false }) {
  const { language } = useLanguage();
  const { title, oneLiner } = getDisplayContent(article, language);
  const hasImage = Boolean(article.imageUrl);
  const channel = getChannelName(article);
  const softBg = placeholderTone(article);

  function openArticle(e) {
    if (e.target.closest('[data-stop-card-nav]')) return;
    window.open(article.url, '_blank', 'noopener,noreferrer');
  }

  function onKeyOpen(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      window.open(article.url, '_blank', 'noopener,noreferrer');
    }
  }

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={openArticle}
      onKeyDown={onKeyOpen}
      className={`group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white/90 transition duration-300 hover:-translate-y-1 hover:border-[rgba(13,115,119,0.28)] ${
        featured ? 'sm:col-span-2' : ''
      }`}
      style={{ boxShadow: 'var(--shadow)' }}
    >
      <div
        className={`relative overflow-hidden ${featured ? 'h-60 sm:h-72' : 'h-44 sm:h-48'}`}
        style={{ backgroundColor: softBg }}
      >
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.imageUrl}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : null}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(16,42,46,0.55)] to-transparent p-3 pt-10">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium tracking-wide text-white/95">
            <span>{labelize(article.category)}</span>
            <span className="opacity-60">·</span>
            <span>{labelize(article.location)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--muted)]">
          <span className="font-medium text-[var(--brand-ink)]">{channel}</span>
          <span className="opacity-50">·</span>
          <time>{formatDate(article.publishedAt)}</time>
        </div>

        <h3
          className={`font-[family-name:var(--font-display)] leading-snug tracking-tight text-[var(--brand-ink)] ${
            featured ? 'text-[1.65rem] sm:text-[1.85rem]' : 'text-[1.25rem]'
          }`}
        >
          {title}
        </h3>

        <p className="line-clamp-3 text-sm leading-relaxed text-[var(--muted)]">{oneLiner}</p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          {onBookmark ? (
            <button
              type="button"
              data-stop-card-nav
              onClick={(e) => {
                e.stopPropagation();
                onBookmark(article);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition ${
                article.bookmarked
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'text-[var(--muted)] hover:bg-[var(--chip)] hover:text-[var(--brand-ink)]'
              }`}
            >
              <Bookmark size={14} fill={article.bookmarked ? 'currentColor' : 'none'} />
              {article.bookmarked ? 'Saved' : 'Save'}
            </button>
          ) : (
            <span />
          )}
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] transition group-hover:gap-1.5">
            Read <ArrowUpRight size={14} />
          </span>
        </div>
      </div>
    </article>
  );
}
