import {defineRouting} from 'next-intl/routing';

const config = defineRouting({
  defaultLocale: 'sq',
  localePrefix: 'always',
  locales: ['sq', 'en'],
  pathnames: {
    '/': '/',
    '/articles': '/articles',
    '/post/[slug]': '/post/[slug]',
    '/category/[slug]': '/category/[slug]',
    '/category/[slug]/[subcategory]': '/category/[slug]/[subcategory]',
  },
});

export default config;
