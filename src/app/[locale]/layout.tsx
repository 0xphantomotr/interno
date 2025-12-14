import {NextIntlClientProvider} from 'next-intl';
import {getMessages, unstable_setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {ReactNode} from 'react';
import NextTopLoader from 'nextjs-toploader';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import {routing} from '@/i18n/routing';
import {normalizeLocale} from '@/sanity/lib/localization';
import {getAllCategories} from '@/sanity/lib/queries';

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{locale: string}>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

export default async function LocaleLayout({children, params}: LocaleLayoutProps) {
  const {locale} = await params;
  const normalizedLocale = normalizeLocale(locale) as (typeof routing.locales)[number];

  if (!routing.locales.includes(normalizedLocale)) {
    notFound();
  }

  unstable_setRequestLocale(normalizedLocale);

  const messages = await getMessages({locale: normalizedLocale});
  const categories = await getAllCategories(normalizedLocale);

  return (
    <>
      <NextTopLoader
        color="#FFFFFF"
        crawl
        crawlSpeed={200}
        easing="ease"
        height={3}
        initialPosition={0.08}
        showSpinner={false}
        speed={200}
      />
      <NextIntlClientProvider locale={normalizedLocale} messages={messages}>
        <Header locale={normalizedLocale} />
        {children}
        <Footer categories={categories} />
      </NextIntlClientProvider>
    </>
  );
}
