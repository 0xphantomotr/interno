import {defineField, defineType} from 'sanity'

import {hasAnyLocalizedValue} from './localization'

export const subcategoryType = defineType({
  name: 'subcategory',
  title: 'Subcategory',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'localizedString',
      validation: (rule) =>
        rule.required().custom((value) => {
          if (!hasAnyLocalizedValue(value)) {
            return 'Provide at least one translation'
          }
          return true
        }),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title.sq',
        maxLength: 96,
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'parent',
      title: 'Parent Category',
      type: 'reference',
      to: [{type: 'category'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'localizedText',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      parent: 'parent.title',
    },
    prepare({title, parent}) {
      const resolvedTitle =
        typeof title === 'object' && title !== null
          ? title.sq || title.en || 'Untitled subcategory'
          : (title as string) || 'Untitled subcategory'
      const parentTitle =
        typeof parent === 'object' && parent !== null
          ? parent.sq || parent.en
          : parent
      return {
        title: resolvedTitle,
        subtitle: parentTitle ? `in ${parentTitle}` : undefined,
      }
    },
  },
})
