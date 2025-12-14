import { type SchemaTypeDefinition } from 'sanity'

import {blockContentType} from './blockContentType'
import {categoryType} from './categoryType'
import {figureType} from './figureType'
import {subcategoryType} from './subcategoryType'
import {postType} from './postType'
import {authorType} from './authorType'
import { fontType } from './fontType'
import {
  localizedBlockContentType,
  localizedStringType,
  localizedTextType,
} from './localization'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    blockContentType,
    categoryType,
    figureType,
    subcategoryType,
    postType,
    authorType,
    fontType,
    localizedStringType,
    localizedTextType,
    localizedBlockContentType,
  ],
}
