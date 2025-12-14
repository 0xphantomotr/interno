import config from '../../next-intl.config.mjs';

export const routing = config;

export type Locale = (typeof routing.locales)[number];
