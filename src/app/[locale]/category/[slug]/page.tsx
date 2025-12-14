import Image from 'next/image';
import {getTranslations} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {cache} from 'react';

import {Link} from '@/i18n/navigation';
import {routing} from '@/i18n/routing';
import {client, urlFor} from '@/lib/sanity';
import {localizedFieldProjection, normalizeLocale} from '@/sanity/lib/localization';
import {Category} from '@/types';

import pageStyles from '@/app/page.module.css';
import styles from './category.module.css';

type Props = {
  params: Promise<{locale: string; slug: string}>;
};

const getCategoryData = cache(async ({slug, locale}: {slug: string; locale: string}): Promise<Category | null> => {
  const query = `*[_type == "category" && slug.current == $slug][0] {
    _id,
    "title": ${localizedFieldProjection('title')},
    "description": ${localizedFieldProjection('description')},
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
    ),
    "posts": *[_type == "post" && references(^._id) && defined(slug.current)]
      | order(_createdAt desc) {
        _id,
        "title": ${localizedFieldProjection('title')},
        slug,
        mainImage,
        "excerpt": ${localizedFieldProjection('excerpt')}
      }
  }`;
  const category = await client.fetch(query, {slug, locale}, {cache: 'no-store'});
  return category;
});

export async function generateStaticParams() {
  const query = `*[_type == "category" && defined(slug.current)]{"slug": slug.current}`;
  const slugs: {slug: string}[] = await client.fetch(query);

  return routing.locales.flatMap((locale) =>
    slugs.map((s) => ({
      locale,
      slug: s.slug,
    })),
  );
}

export default async function CategoryPage({params}: Props) {
  const {slug, locale} = await params;
  const normalizedLocale = normalizeLocale(locale);

  if (!slug) {
    notFound();
  }

  const [category, t, common] = await Promise.all([
    getCategoryData({slug, locale: normalizedLocale}),
    getTranslations({locale: normalizedLocale, namespace: 'Category'}),
    getTranslations({locale: normalizedLocale, namespace: 'Common'}),
  ]);

  if (!category) {
    notFound();
  }

  const categoryTitle = category.title && category.title.trim().length > 0 ? category.title : category.slug.current;

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className={`${styles.title} font-serif`}>{categoryTitle}</h1>
        {category.description && category.description.trim().length > 0 ? (
          <p className={styles.description}>{category.description}</p>
        ) : null}
        {category.subcategories && category.subcategories.length > 0 ? (
          <nav className={styles.subcategoryNav} aria-label={t('subcategoryNavLabel')}>
            <ul className={styles.subcategoryList}>
              {category.subcategories
                ?.filter((sub) => sub?.slug?.current)
                .map((sub) => {
                  const subSlug = sub.slug?.current ?? '';
                  const subTitle = sub.title && sub.title.trim().length > 0 ? sub.title : subSlug;
                  return (
                    <li key={`${category._id}-${subSlug}`} className={styles.subcategoryItem}>
                      <Link
                        href={{pathname: '/category/[slug]/[subcategory]', params: {slug: category.slug.current, subcategory: subSlug}}}
                        className={styles.subcategoryLink}
                      >
                        {subTitle}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </nav>
        ) : null}
      </div>

      <div className={pageStyles.container}>
        <div className={pageStyles.postsGrid}>
          {category.posts && category.posts.length > 0 ? (
            category.posts.map((post) => (
              <Link
                key={post._id}
                href={{pathname: '/post/[slug]', params: {slug: post.slug.current}}}
                className={pageStyles.postCard}
                aria-label={common('readArticleAria', {title: post.title})}
              >
                <div className={pageStyles.postImageContainer}>
                    {post.mainImage ? (
                      <Image
                        src={urlFor(post.mainImage).width(500).height(350).url()}
                        alt={(post.title && post.title.trim().length > 0 ? post.title : common('untitledPost')) || 'Post image'}
                        fill
                        sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
                        className={pageStyles.postImage}
                      />
                    ) : (
                    <div className={pageStyles.postImagePlaceholder}>{common('noImage')}</div>
                  )}
                </div>
                <div className={pageStyles.postContent}>
                  <h3 className={`${pageStyles.postTitle} font-serif`}>
                    {post.title && post.title.trim().length > 0 ? post.title : common('untitledPost')}
                  </h3>
                  {post.excerpt && post.excerpt.trim().length > 0 ? (
                    <p className={pageStyles.postExcerpt}>{post.excerpt}</p>
                  ) : null}
                  <span className={pageStyles.readMore}>{common('readMoreCta')}</span>
                </div>
              </Link>
            ))
          ) : (
            <p className={styles.noPosts}>{t('empty')}</p>
          )}
        </div>
      </div>
    </main>
  );
}
