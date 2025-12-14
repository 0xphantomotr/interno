import Image from 'next/image';
import {getTranslations} from 'next-intl/server';

import {Link} from '@/i18n/navigation';
import {client, urlFor} from '@/lib/sanity';
import {localizedFieldProjection, normalizeLocale} from '@/sanity/lib/localization';
import {Post} from '@/types';

import pageStyles from '@/app/page.module.css';
import styles from './articles.module.css';

async function getAllPosts(locale: string): Promise<Post[]> {
  const query = `*[_type == "post" && defined(slug.current) && defined(mainImage)] | order(_createdAt desc) {
    _id,
    "title": ${localizedFieldProjection('title')},
    slug,
    mainImage,
    "excerpt": ${localizedFieldProjection('excerpt')},
    _createdAt,
    "categories": categories[]->{
      _id,
      "title": ${localizedFieldProjection('title')},
      slug
    }
  }`;

  try {
    const posts = await client.fetch(
      query,
      {locale},
      {next: {revalidate: 60}}
    );
    return posts;
  } catch (error) {
    console.error('Failed to fetch Sanity posts:', error);
    return [];
  }
}

export const revalidate = 60;

type ArticlesPageProps = {
  params: Promise<{locale: string}>;
};

export default async function ArticlesPage({params}: ArticlesPageProps) {
  const {locale} = await params;
  const normalizedLocale = normalizeLocale(locale);
  const [posts, t, common] = await Promise.all([
    getAllPosts(normalizedLocale),
    getTranslations({locale: normalizedLocale, namespace: 'Articles'}),
    getTranslations({locale: normalizedLocale, namespace: 'Common'}),
  ]);

  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.breadcrumb}>{t('breadcrumb')}</p>
          <h1 className="font-serif">{t('title')}</h1>
          <p className={styles.heroSubtitle}>{t('subtitle')}</p>
        </div>
      </section>

      <section className={styles.postsSection}>
        <div className={pageStyles.container}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={`${styles.sectionTitle} font-serif`}>{t('sectionTitle')}</h2>
              <p className={styles.sectionSubtitle}>{t('sectionSubtitle')}</p>
            </div>
            <span className={styles.countBadge}>{t('countBadge', {count: posts.length})}</span>
          </div>

          {posts.length === 0 ? (
            <p className={styles.emptyState}>{t('emptyState')}</p>
          ) : (
            <div className={pageStyles.postsGrid}>
              {posts.map((post) => {
                const resolvedTitle = post.title && post.title.trim().length > 0 ? post.title : common('untitledPost');
                const formattedDate = post._createdAt
                  ? new Date(post._createdAt).toLocaleDateString(normalizedLocale, {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })
                  : null;

                return (
                  <article key={post._id} className={`${pageStyles.postCard} ${styles.postCard}`}>
                    <Link
                      href={{pathname: '/post/[slug]', params: {slug: post.slug.current}}}
                      className={styles.cardMedia}
                      aria-label={common('readArticleAria', {title: post.title})}
                    >
                      <div className={pageStyles.postImageContainer}>
                        {post.mainImage ? (
                          <Image
                            src={urlFor(post.mainImage).width(600).height(420).url()}
                            alt={resolvedTitle || 'Post image'}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className={pageStyles.postImage}
                          />
                        ) : (
                          <div className={styles.postImagePlaceholder}>{common('noImage')}</div>
                        )}
                      </div>
                    </Link>

                    <div className={styles.postMeta}>
                      <div className={styles.categoryRow}>
                        <div className={styles.categoryList}>
                          {post.categories && post.categories.length > 0 ? (
                            post.categories.map((category) =>
                              category?.slug?.current ? (
                                <Link
                                  key={category._id || category.slug.current}
                                  href={{pathname: '/category/[slug]', params: {slug: category.slug.current}}}
                                  className={styles.categoryPill}
                                >
                                  {category.title}
                                </Link>
                              ) : (
                                <span
                                  key={category?._id || category?.title}
                                  className={styles.categoryPillAlt}
                                >
                                  {category?.title || common('categoryFallback')}
                                </span>
                              ),
                            )
                          ) : (
                            <span className={styles.categoryPillMuted}>{common('noCategory')}</span>
                          )}
                        </div>
                        {formattedDate && <span className={styles.postDate}>{formattedDate}</span>}
                      </div>

                      <Link
                        href={{pathname: '/post/[slug]', params: {slug: post.slug.current}}}
                        className={styles.titleLink}
                        aria-label={common('openArticleAria', {title: resolvedTitle})}
                      >
                        <h3 className={`${pageStyles.postTitle} ${styles.postTitle} font-serif`}>
                          {resolvedTitle}
                        </h3>
                      </Link>
                      {post.excerpt && post.excerpt.trim().length > 0 ? (
                        <p className={`${pageStyles.postExcerpt} ${styles.postExcerpt}`}>{post.excerpt}</p>
                      ) : null}
                      <Link
                        href={{pathname: '/post/[slug]', params: {slug: post.slug.current}}}
                        className={styles.readMore}
                      >
                        {common('readArticleCta')}
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
