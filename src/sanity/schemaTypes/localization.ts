import {defineField, defineType} from 'sanity';

type LocaleDefinition = {
  id: 'sq' | 'en';
  title: string;
};

export const supportedLocales: LocaleDefinition[] = [
  {id: 'sq', title: 'Shqip'},
  {id: 'en', title: 'English'},
];

export type SupportedLocaleId = (typeof supportedLocales)[number]['id'];

export const hasAnyLocalizedValue = (
  value: unknown,
): value is Partial<Record<SupportedLocaleId, string>> => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  return supportedLocales.some(({id}) => {
    const localizedValue = (value as Record<string, unknown>)[id];
    return typeof localizedValue === 'string' && localizedValue.trim().length > 0;
  });
};

const localeFields = (fieldFactory: (locale: LocaleDefinition) => ReturnType<typeof defineField>) =>
  supportedLocales.map((locale) => fieldFactory(locale));

export const localizedStringType = defineType({
  name: 'localizedString',
  title: 'Localized String',
  type: 'object',
  options: {
    columns: supportedLocales.length,
  },
  fields: localeFields(({id, title}) =>
    defineField({
      name: id,
      title,
      type: 'string',
    }),
  ),
});

export const localizedTextType = defineType({
  name: 'localizedText',
  title: 'Localized Text',
  type: 'object',
  options: {
    columns: supportedLocales.length,
  },
  fields: localeFields(({id, title}) =>
    defineField({
      name: id,
      title,
      type: 'text',
      rows: 4,
    }),
  ),
});

export const localizedBlockContentType = defineType({
  name: 'localizedBlockContent',
  title: 'Localized Portable Text',
  type: 'object',
  options: {
    columns: supportedLocales.length,
  },
  fields: localeFields(({id, title}) =>
    defineField({
      name: id,
      title,
      type: 'blockContent',
    }),
  ),
});
