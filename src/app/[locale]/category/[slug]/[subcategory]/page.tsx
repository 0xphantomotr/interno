import Image from 'next/image';
import {getTranslations} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {cache} from 'react';

import {Link} from '@/i18n/navigation';
import {routing} from '@/i18n/routing';
import {client, urlFor} from '@/lib/sanity';
import {localizedFieldProjection, normalizeLocale} from '@/sanity/lib/localization';

import pageStyles from '@/app/page.module.css';
import styles from '../category.module.css';

type Params = Promise<{locale: string; slug: string; subcategory: string}>;

type SubcategoryPayload = {
  _id: string;
  title: string;
  description?: string;
  slug: {current: string};
  parent: {
    _id: string;
    title: string;
    slug: {current: string};
  };
  posts: Array<{
    _id: string;
    title: string;
    slug: {current: string};
    mainImage: unknown;
    excerpt?: string;
  }>;
};

const getSubcategoryData = cache(async ({
  categorySlug,
  subcategorySlug,
  locale,
}: {
  categorySlug: string;
  subcategorySlug: string;
  locale: string;
}): Promise<SubcategoryPayload | null> => {
  const query = `*[_type == "subcategory" && slug.current == $subcategorySlug && parent->slug.current == $categorySlug][0] {
    _id,
    "title": ${localizedFieldProjection('title')},
    "description": ${localizedFieldProjection('description')},
    slug,
    parent->{
      _id,
      "title": ${localizedFieldProjection('title')},
      slug
    },
    "posts": *[_type == "post" && references(^._id) && defined(slug.current)]
      | order(_createdAt desc) {
        _id,
        "title": ${localizedFieldProjection('title')},
        slug,
        mainImage,
        "excerpt": ${localizedFieldProjection('excerpt')}
      }
  }`;

  return client.fetch(query, {categorySlug, subcategorySlug, locale}, {cache: 'no-store'});
});

export async function generateStaticParams() {
  const query = `*[_type == "subcategory" && defined(slug.current) && defined(parent->slug.current)]{
    "slug": parent->slug.current,
    "subcategory": slug.current
  }`;
  const combos: {slug: string; subcategory: string}[] = await client.fetch(query);

  return routing.locales.flatMap((locale) =>
    combos.map(({slug, subcategory}) => ({locale, slug, subcategory})),
  );
}

export default async function SubcategoryPage({params}: {params: Params}) {
  const {locale, slug: categorySlug, subcategory: subcategorySlug} = await params;
  const normalizedLocale = normalizeLocale(locale);

  const [subcategory, t, common] = await Promise.all([
    getSubcategoryData({categorySlug, subcategorySlug, locale: normalizedLocale}),
    getTranslations({locale: normalizedLocale, namespace: 'Category'}),
    getTranslations({locale: normalizedLocale, namespace: 'Common'}),
  ]);

  if (!subcategory) {
    notFound();
  }

  const title = subcategory.title && subcategory.title.trim().length > 0
    ? subcategory.title
    : subcategory.slug.current;

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <p className={styles.breadcrumb}>
          <Link href={{pathname: '/category/[slug]', params: {slug: subcategory.parent.slug.current}}}>
            {subcategory.parent.title}
          </Link>
        </p>
        <h1 className={`${styles.title} font-serif`}>{title}</h1>
        {subcategory.description && subcategory.description.trim().length > 0 ? (
          <p className={styles.description}>{subcategory.description}</p>
        ) : null}
      </div>

      <div className={pageStyles.container}>
        <div className={pageStyles.postsGrid}>
          {subcategory.posts && subcategory.posts.length > 0 ? (
            subcategory.posts.map((post) => (
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
