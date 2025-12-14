import {unstable_noStore as noStore} from 'next/cache';

import {getAllCategories} from '@/sanity/lib/queries';
import {normalizeLocale} from '@/sanity/lib/localization';

import type {NavLink} from './HeaderClient';
import {HeaderClient} from './HeaderClient';

type HeaderProps = {
  locale: string;
};

export default async function Header({locale}: HeaderProps) {
  noStore();
  const normalizedLocale = normalizeLocale(locale);
  const categories = await getAllCategories(normalizedLocale);

  const navLinks: NavLink[] = categories.map((category) => {
    const slug = category.slug?.current ?? '';
    const name = (category.title && category.title.trim().length > 0 ? category.title : slug).toUpperCase();

    const subcategories = category.subcategories
      ?.filter((sub) => sub.slug?.current)
      .map((sub): NonNullable<NavLink['subcategories']>[number] => {
        const subSlug = sub.slug?.current ?? '';
        const subFallback = subSlug;
        const subName = sub.title && sub.title.trim().length > 0 ? sub.title : subFallback;
        return {
          key: `${slug}-${subSlug || 'sub'}`,
          name: subName,
          href: {
            pathname: '/category/[slug]/[subcategory]',
            params: {slug, subcategory: subSlug},
          },
        };
      });

    return {
      key: slug,
      name,
      href: {
        pathname: '/category/[slug]',
        params: {slug},
      },
      subcategories,
    } satisfies NavLink;
  });

  return <HeaderClient navLinks={navLinks} />;
}
