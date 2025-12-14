import {defineField, defineType} from 'sanity';

export const figureType = defineType({
  name: 'figure',
  title: 'Figure',
  type: 'object',
  fields: [
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {hotspot: true},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'alt',
      title: 'Alternative text',
      type: 'string',
      description: 'Short description used for accessibility and SEO.',
      validation: (rule) => rule.required().warning('Provide alt text for accessibility'),
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
      description: 'Optional caption displayed under the image.',
    }),
    defineField({
      name: 'attribution',
      title: 'Attribution',
      type: 'string',
      description: 'Credit for the image source (optional).',
    }),
  ],
  preview: {
    select: {
      media: 'image',
      title: 'caption',
      subtitle: 'alt',
    },
    prepare({media, title, subtitle}) {
      return {
        media,
        title: title || subtitle || 'Figure',
        subtitle: subtitle || undefined,
      };
    },
  },
});
