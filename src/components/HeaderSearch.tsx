'use client';

import Image from 'next/image';
import {useLocale, useTranslations} from 'next-intl';
import {useEffect, useRef, useState} from 'react';
import {FiLoader, FiSearch, FiX} from 'react-icons/fi';
import type {SanityImageSource} from '@sanity/image-url/lib/types/types';

import {Link} from '@/i18n/navigation';
import {urlFor} from '@/lib/sanity';

import styles from './Header.module.css';

type SearchResult = {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt?: string;
  category?: { title?: string; slug?: { current: string } };
  mainImage?: SanityImageSource;
  _createdAt?: string;
};

const formatDate = (date?: string, locale?: string) => {
  if (!date) return null;
  try {
    return new Date(date).toLocaleDateString(locale ?? 'sq-AL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return null;
  }
};

export function HeaderSearch() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('Search');
  const locale = useLocale();

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const controller = new AbortController();
    const debounce = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          headers: {
            'x-next-intl-locale': locale,
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(response.statusText);
        }

        const data = await response.json();
        setResults(data.results ?? []);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError(t('fetchError'));
        console.warn('[HeaderSearch] Search failed:', err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(debounce);
      controller.abort();
    };
  }, [query, t, locale]);

  const onResultSelected = () => {
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div className={styles.searchContainer} ref={containerRef}>
      <FiSearch className={styles.searchIcon} />
      <input
        ref={inputRef}
        type="search"
        className={styles.searchInput}
        placeholder={t('placeholder')}
        value={query}
        aria-label={t('ariaLabel')}
        onChange={(event) => {
          setQuery(event.target.value);
          if (!isOpen) {
            setIsOpen(true);
          }
        }}
        onFocus={() => setIsOpen(true)}
      />
      {query && (
        <button
          type="button"
          className={styles.searchClear}
          aria-label={t('clear')}
          onClick={() => {
            setQuery('');
            setResults([]);
            inputRef.current?.focus();
          }}
        >
          <FiX size={14} />
        </button>
      )}

      {isOpen && (
        <div className={styles.searchResults} role="listbox">
          {query.trim().length < 2 ? (
            <p className={styles.searchMessage}>{t('tooShort')}</p>
          ) : isLoading ? (
            <div className={styles.searchMessage}>
              <FiLoader className={styles.searchSpinner} aria-hidden="true" />
              <span>{t('loading')}</span>
            </div>
          ) : error ? (
            <p className={styles.searchMessage}>{error}</p>
          ) : results.length === 0 ? (
            <p className={styles.searchMessage}>{t('noMatches', {query})}</p>
          ) : (
            <ul className={styles.searchList}>
              {results.map((item) => {
                const category = item.category?.title;
                const dateLabel = formatDate(item._createdAt, locale);
                const excerpt = item.excerpt?.trim();
                const snippet =
                  excerpt && excerpt.length > 120 ? `${excerpt.slice(0, 117)}…` : excerpt || null;
                return (
                  <li key={item._id}>
                    <Link
                      href={{pathname: '/post/[slug]', params: {slug: item.slug.current}}}
                      className={styles.searchResult}
                      onClick={onResultSelected}
                    >
                      <div className={styles.searchThumb}>
                        {item.mainImage ? (
                          <Image
                            src={urlFor(item.mainImage).width(160).height(120).fit('crop').url()}
                            alt={item.title}
                            fill
                            className={styles.searchThumbImage}
                            sizes="64px"
                          />
                        ) : (
                          <div className={styles.searchThumbPlaceholder}>{t('noImage')}</div>
                        )}
                      </div>
                      <div className={styles.searchResultBody}>
                        <div className={styles.searchResultMeta}>
                          {category && <span className={styles.searchResultCategory}>{category}</span>}
                          {dateLabel && <time className={styles.searchResultDate}>{dateLabel}</time>}
                        </div>
                        <p className={styles.searchResultTitle}>{item.title}</p>
                        {snippet && <p className={styles.searchResultExcerpt}>{snippet}</p>}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
