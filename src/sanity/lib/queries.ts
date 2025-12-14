import {client} from './client';
import {DEFAULT_LOCALE, localizedFieldProjection, normalizeLocale} from './localization';

export interface Category {
  _id: string;
  title: string;
  slug: {
    current: string;
  };
  subcategories?: {
    _id: string;
    title: string;
    slug: {current: string};
  }[];
}

export async function getAllCategories(localeInput: string = DEFAULT_LOCALE): Promise<Category[]> {
  const locale = normalizeLocale(localeInput);
  const query = `*[_type == "category" && defined(slug.current)]
    | order(${localizedFieldProjection('title')} asc) {
      _id,
      "title": ${localizedFieldProjection('title')},
      slug,
      "subcategories": select(
        count(subcategories[]) > 0 => subcategories[]->{
          _id,
          "title": ${localizedFieldProjection('title')},
          slug
        },
        *[_type == "subcategory" && parent._ref == ^._id]{
          _id,
          "title": ${localizedFieldProjection('title')},
          slug
        }
      )
    }`;
  try {
    const categories: Category[] = await client.fetch(
      query,
      {locale},
      {cache: 'no-store'}
    );
    return categories.map((category) => {
      const normalizedSubcategories = category.subcategories
        ?.filter((subcategory): subcategory is NonNullable<typeof subcategory> => {
          return Boolean(subcategory && subcategory.slug && subcategory.slug.current);
        })
        .map((subcategory) => ({
          ...subcategory,
          title: subcategory.title ?? '',
        }))
        .sort((a, b) => a.title.localeCompare(b.title));

      return {
        ...category,
        title: category.title ?? '',
        subcategories: normalizedSubcategories && normalizedSubcategories.length > 0 ? normalizedSubcategories : undefined,
      };
    });
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return [];
  }
}
