import {defineField, defineType} from 'sanity'

export const fontType = defineType({
  name: 'font',
  title: 'Font',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      description: 'The user-friendly name for the font (e.g., "Serif (Playfair Display)")',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'cssClass',
      title: 'CSS Class',
      description: 'The Tailwind CSS class to apply (e.g., "font-serif")',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
  ],
})