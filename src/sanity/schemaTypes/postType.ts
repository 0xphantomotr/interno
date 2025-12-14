import {DocumentTextIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {hasAnyLocalizedValue} from './localization'

export const postType = defineType({
  name: 'post',
  title: 'Post',
  type: 'document',
  icon: DocumentTextIcon,
  groups: [
    {name: 'content', title: 'Content'},
    {name: 'media', title: 'Media'},
    {name: 'metadata', title: 'Metadata'},
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'localizedString',
      group: 'content',
      validation: (rule) =>
        rule.required().custom((value) => {
          if (!hasAnyLocalizedValue(value)) {
            return 'Provide at least one translation';
          }
          return true;
        }),
    }),
    defineField({
      name: 'font',
      title: 'Post Font',
      type: 'reference',
      to: [{type: 'font'}],
      group: 'metadata',
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {
        source: 'title.sq',
      },
      group: 'metadata',
    }),
    defineField({
      name: 'author',
      type: 'reference',
      to: {type: 'author'},
      group: 'metadata',
    }),
    defineField({
      name: 'mainImage',
      type: 'image',
      group: 'media',
      options: {
        hotspot: true,
      },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt Text',
          type: 'localizedString',
        })
      ]
    }),
    defineField({
      name: 'categories',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: {type: 'category'}})],
      group: 'metadata',
    }),
    defineField({
      name: 'subcategories',
      title: 'Subcategories',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: {type: 'subcategory'}})],
      description: 'Optional subcategories for more granular grouping.',
      group: 'metadata',
    }),
    defineField({
      name: 'publishedAt',
      type: 'datetime',
      group: 'metadata',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'localizedBlockContent',
      group: 'content',
      options: {
        collapsible: true,
        collapsed: true,
      },
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'localizedText',
      description: 'A short summary of the post used in previews.',
      group: 'content',
      options: {
        collapsible: true,
        collapsed: true,
      },
    }),
    defineField({
      name: 'heroFeatured',
      title: 'Hero Highlight',
      type: 'boolean',
      initialValue: false,
      description: 'Enables this article to appear as the featured hero post on the homepage. Only mark one post at a time.',
      group: 'metadata',
    }),
    defineField({
      name: 'viewCount',
      title: 'View Count',
      type: 'number',
      initialValue: 0,
      readOnly: true,
      description: 'Automatically incremented when users read the article.',
      group: 'metadata',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      author: 'author.name',
      media: 'mainImage',
    },
    prepare(selection) {
      const {author, title, media} = selection
      const resolvedTitle =
        typeof title === 'object' && title !== null
          ? title.sq || title.en || 'Untitled post'
          : (title as string) || 'Untitled post'

      return {
        title: resolvedTitle,
        subtitle: author ? `by ${author}` : undefined,
        media,
      }
    },
  },
})
