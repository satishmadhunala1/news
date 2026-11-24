'use client';

import { Bookmark, ExternalLink } from 'lucide-react';
import { formatDate, labelize } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { getDisplayContent } from '@/lib/articleDisplay';

const PLACEHOLDER_COLORS = [
  '#dbeafe', // light blue
  '#dcfce7', // light green
  '#fef3c7', // light amber
  '#fce7f3', // light pink
  '#e0e7ff', // soft indigo
  '#ffedd5', // soft orange
  '#e0f2fe', // sky
  '#f3e8ff', // soft violet
];

const API_LABELS = {
  gnews: 'GNews API',
  newsapi: 'NewsAPI',
  'google-news-rss': 'Google News RSS',
  newsdata: 'NewsData.io',
  gdelt: 'GDELT DOC 2.0',
  'oneindia-telugu-rss': 'Oneindia Telugu RSS',
  'telugu-rss': 'Telugu RSS',
};

function placeholderColor(article) {
  const key = `${article._id || ''}${article.url || ''}${article.title || ''}`;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash + key.charCodeAt(i) * (i + 3)) % PLACEHOLDER_COLORS.length;
  return PLACEHOLDER_COLORS[hash];
}

function getChannelName(article) {
  const name = (article.sourceName || '').trim();
  if (!name || /^google-news-rss$/i.test(name) || /^gnews$/i.test(name) || /^newsapi$/i.test(name)) {
    // Fallback: parse "Headline - Publisher" from Google News titles
    const parts = (article.title || '').split(/\s+-\s+/);
    if (parts.length > 1) return parts[parts.length - 1].trim();
    return 'Unknown channel';
  }
  // Clean "Google News (Hyderabad)" style labels when a better publisher exists in title
  if (/^Google News/i.test(name)) {
    const parts = (article.title || '').split(/\s+-\s+/);
    if (parts.length > 1) return parts[parts.length - 1].trim();
  }
  return name;
}

function getApiLabel(article) {
  return API_LABELS[article.source] || article.source || 'Unknown API';
}

export function NewsCard({ article, onBookmark, featured = false }) {
  const { language } = useLanguage();
  const { title, oneLiner, story } = getDisplayContent(article, language);
  const hasImage = Boolean(article.imageUrl);
  const channel = getChannelName(article);
  const apiLabel = getApiLabel(article);
  const softBg = placeholderColor(article);

  function openArticle(e) {
    // Don't navigate when clicking Save
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
      className={`group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] ${
        featured ? 'sm:col-span-2 lg:col-span-2' : ''
      }`}
    >
      <div
        className={`relative ${featured ? 'h-64 sm:h-72' : 'h-48 sm:h-52'}`}
        style={{ backgroundColor: softBg }}
      >
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.imageUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : null}

        <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-2">
          <span className="rounded-md bg-white/95 px-2 py-1 text-[11px] font-semibold text-[#222] shadow-sm">
            {labelize(article.category)}
          </span>
          <span className="rounded-md bg-white/90 px-2 py-1 text-[11px] font-medium text-[#333] shadow-sm">
            {labelize(article.location)}
          </span>
        </div>

        <div className="absolute top-3 right-3">
          <span className="rounded-md bg-[#111]/80 px-2 py-1 text-[10px] font-semibold tracking-wide text-white uppercase">
            {apiLabel}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-[#f3f3f3] px-2.5 py-1 font-semibold text-[#111]">
            {channel}
          </span>
          <span className="text-[#888]">via {apiLabel}</span>
          <span className="text-[#bbb]">·</span>
          <time className="text-[#6b6b6b]">{formatDate(article.publishedAt)}</time>
        </div>

        <h3
          className={`font-[family-name:var(--font-display)] font-semibold leading-snug tracking-tight text-[#111] ${
            featured ? 'text-2xl' : 'text-lg'
          }`}
        >
          {title}
        </h3>

        <p className="text-sm font-medium text-[#333]">{oneLiner}</p>
        <p className="text-sm leading-relaxed text-[#555]">{story}</p>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[#efefef] pt-3">
          {onBookmark ? (
            <button
              type="button"
              data-stop-card-nav
              onClick={(e) => {
                e.stopPropagation();
                onBookmark(article);
              }}
              className={`inline-flex items-center gap-1.5 rounded-full border border-[#e5e5e5] px-3 py-1.5 text-xs ${
                article.bookmarked ? 'bg-[#f3f3f3] text-[#111]' : 'bg-white text-[#555]'
              }`}
            >
              <Bookmark size={14} fill={article.bookmarked ? 'currentColor' : 'none'} />
              {article.bookmarked ? 'Saved' : 'Save'}
            </button>
          ) : (
            <span />
          )}
          <span
            data-stop-card-nav
            className="inline-flex items-center gap-1.5 rounded-full border border-[#ddd] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#111] shadow-sm"
          >
            Read more <ExternalLink size={13} />
          </span>
        </div>
      </div>
    </article>
  );
}
