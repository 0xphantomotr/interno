import type {Metadata} from 'next';
import {Inter, Playfair_Display, Roboto_Mono, Tinos} from 'next/font/google';
import {ReactNode} from 'react';
import {getLocale} from 'next-intl/server';

import {routing} from '@/i18n/routing';

import './globals.css';

const inter = Inter({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
});

const playfair = Playfair_Display({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['400', '500', '600', '700', '800', '900'],
});

const robotoMono = Roboto_Mono({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600', '700'],
});

const tinos = Tinos({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-tinos',
  weight: ['400', '700'],
});

export const metadata: Metadata = {
  description: 'Award-winning architectural design studio creating innovative spaces',
  title: 'INTERNO | Architecture Magazine',
};

export default async function RootLayout({children}: {children: ReactNode}) {
  const locale = (await getLocale()) ?? routing.defaultLocale;

  return (
    <html lang={locale}>
      <body className={`${playfair.variable} ${inter.variable} ${robotoMono.variable} ${tinos.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
