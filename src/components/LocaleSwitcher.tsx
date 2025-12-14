'use client';

import {useTransition} from 'react';
import {useLocale, useTranslations} from 'next-intl';
import {useParams} from 'next/navigation';

import {usePathname, useRouter} from '@/i18n/navigation';
import type {NavHref} from './HeaderClient';

import styles from './Header.module.css';

type LocaleOption = {
  value: 'sq' | 'en';
  labelKey: 'localeOptionSq' | 'localeOptionEn';
  badge: 'AL' | 'EN';
};

const options: LocaleOption[] = [
  {labelKey: 'localeOptionSq', value: 'sq', badge: 'AL'},
  {labelKey: 'localeOptionEn', value: 'en', badge: 'EN'},
];

type LocaleSwitcherHref =
  | {pathname: '/'}
  | {pathname: '/articles'}
  | {pathname: '/post/[slug]'; params: {slug: string}}
  | NavHref;

export function LocaleSwitcher({className}: {className?: string}) {
  const locale = useLocale() as LocaleOption['value'];
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('Header');

  const changeLocale = (value: LocaleOption['value']) => {
    if (value === locale) {
      return;
    }
    startTransition(() => {
      const nextParams = Object.fromEntries(Object.entries(params)) as Record<string, string | string[]>;
      nextParams.locale = value;

      delete nextParams.locale;

      const ensureString = (input: string | string[] | undefined): string =>
        Array.isArray(input) ? input[0] ?? '' : input ?? '';

      const href: LocaleSwitcherHref = (() => {
        switch (pathname) {
          case '/':
          case '/articles':
            return {pathname};
          case '/post/[slug]':
            return {pathname, params: {slug: ensureString(nextParams.slug)}};
          case '/category/[slug]':
            return {
              pathname,
              params: {slug: ensureString(nextParams.slug)},
            };
          case '/category/[slug]/[subcategory]':
            return {
              pathname,
              params: {
                slug: ensureString(nextParams.slug),
                subcategory: ensureString(nextParams.subcategory),
              },
            };
          default:
            return {pathname: '/'};
        }
      })();

      router.replace(href, {locale: value});
    });
  };

  return (
    <div
      aria-label={t('localeSwitcherLabel')}
      className={`${styles.localeFlagGroup} ${className ?? ''}`.trim()}
      role="group"
    >
      {options.map(({labelKey, value, badge}) => {
        const isActive = value === locale;
        const buttonClass = `${styles.localeFlagButton} ${isActive ? styles.localeFlagActive : ''}`.trim();
        return (
          <button
            key={value}
            aria-pressed={isActive}
            className={buttonClass}
            disabled={isActive || isPending}
            onClick={() => changeLocale(value)}
            title={t(labelKey)}
            type="button"
          >
            <span aria-hidden="true" className={styles.localeFlagBadge}>
              {badge}
            </span>
            <span className={styles.localeFlagLabel}>{t(labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}
