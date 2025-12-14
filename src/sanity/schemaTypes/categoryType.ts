import {TagIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {hasAnyLocalizedValue} from './localization'

export const categoryType = defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  icon: TagIcon,
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
      type: 'slug',
      options: {
        source: 'title.sq',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'localizedText',
    }),
    defineField({
      name: 'subcategories',
      title: 'Subcategories',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'subcategory'}],
          options: {
            filter: ({document}) => ({
              filter: 'parent._ref == $parentId',
              params: {parentId: document?._id},
            }),
          },
        }),
      ],
      description: 'Optional list of subcategories displayed under this category.',
    }),
  ],
})
