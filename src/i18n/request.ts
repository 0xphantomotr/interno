import {getRequestConfig, setRequestLocale} from 'next-intl/server';

import {routing} from './routing';

const importedMessages = {
  en: () => import('../../messages/en.json'),
  sq: () => import('../../messages/sq.json'),
} as const;

export default getRequestConfig(async ({requestLocale}) => {
  const locale = await requestLocale;
  const resolvedLocale = locale && (routing.locales as readonly string[]).includes(locale)
    ? (locale as (typeof routing.locales)[number])
    : routing.defaultLocale;

  setRequestLocale(resolvedLocale);

  const messagesModule = await importedMessages[resolvedLocale]();

  return {
    locale: resolvedLocale,
    messages: messagesModule.default,
  };
});
