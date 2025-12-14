import Image from 'next/image';
import {getTranslations} from 'next-intl/server';
import {FiArrowRight} from 'react-icons/fi';

import {Link} from '@/i18n/navigation';
import {client, urlFor} from '@/lib/sanity';
import {localizedFieldProjection, normalizeLocale} from '@/sanity/lib/localization';
import {Post} from '@/types';

import styles from '../page.module.css';

const localizedField = (field: string) => localizedFieldProjection(field);

type Translator = Awaited<ReturnType<typeof getTranslations>>;

type HomePageProps = {
  params: Promise<{locale: string}>;
};

type CategoryTagLink =
  | {pathname: '/category/[slug]'; params: {slug: string}}
  | {pathname: '/category/[slug]/[subcategory]'; params: {slug: string; subcategory: string}};

type CategoryTag = {
  key: string;
  href: CategoryTagLink;
  label: string;
};

async function getFeaturedPost(locale: string): Promise<Post | null> {
  const query = `*[_type == "post" && heroFeatured == true && defined(slug.current) && defined(mainImage)][0]{
    _id,
    "title": ${localizedField('title')},
    slug,
    mainImage,
    "excerpt": ${localizedField('excerpt')},
    "viewCount": coalesce(viewCount, 0),
    "categories": categories[]->{
      _id,
      "title": ${localizedField('title')},
      slug
    },
    "subcategories": subcategories[]->{
      _id,
      "title": ${localizedField('title')},
      slug,
      parent->{slug}
    },
    _createdAt,
    "font": font->cssClass
  }`;
  try {
    const post = await client.fetch(
      query,
      {locale},
      {cache: 'no-store'}
    );
    return post ?? null;
  } catch (error) {
    console.error("Failed to fetch featured post:", error);
    return null;
  }
}

// Fetches the 3 most recent posts (excluding the featured hero) from Sanity
async function getLatestPosts(locale: string): Promise<Post[]> {
  const query = `*[_type == "post" && defined(slug.current) && defined(mainImage) && heroFeatured != true]
    | order(_createdAt desc)[0...3] {
      _id,
      "title": ${localizedField('title')},
      slug,
      mainImage,
      "excerpt": ${localizedField('excerpt')},
      "viewCount": coalesce(viewCount, 0),
      "font": font->cssClass,
      "categories": categories[]->{
        _id,
        "title": ${localizedField('title')},
        slug
      },
      "subcategories": subcategories[]->{
        _id,
        "title": ${localizedField('title')},
        slug,
        parent->{slug}
      }
    }`;
  try {
    const posts = await client.fetch(
      query,
      {locale},
      {cache: 'no-store'}
    );
    return posts;
  } catch (error) {
    console.error("Failed to fetch Sanity posts:", error);
    return [];
  }
}

async function getMostReadPosts(locale: string): Promise<Post[]> {
  const query = `*[_type == "post" && defined(slug.current) && defined(mainImage)]
    | order(coalesce(viewCount, 0) desc, _createdAt desc)[0...3] {
      _id,
      "title": ${localizedField('title')},
      slug,
      mainImage,
      "excerpt": ${localizedField('excerpt')},
      "viewCount": coalesce(viewCount, 0),
      "font": font->cssClass,
      "categories": categories[]->{
        _id,
        "title": ${localizedField('title')},
        slug
      },
      "subcategories": subcategories[]->{
        _id,
        "title": ${localizedField('title')},
        slug,
        parent->{slug}
      }
    }`;
  try {
    const posts = await client.fetch(
      query,
      {locale},
      {cache: 'no-store'}
    );
    return posts;
  } catch (error) {
    console.error("Failed to fetch most read posts:", error);
    return [];
  }
}

type PostCardProps = {
  post: Post;
  highlightViews?: boolean;
  common: Translator;
};

const PostCard = ({post, highlightViews, common}: PostCardProps) => {
  const resolvedTitle = post.title && post.title.trim().length > 0 ? post.title : common('untitledPost');
  return (
    <article className={styles.postCard}>
      <Link
        href={{pathname: '/post/[slug]', params: {slug: post.slug.current}}}
        className={styles.postCardImageLink}
        aria-label={common('readArticleAria', {title: resolvedTitle})}
      >
        <div className={styles.postImageContainer}>
          <Image
            src={urlFor(post.mainImage).width(500).height(400).url()}
            alt={resolvedTitle || 'Post image'}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className={styles.postImage}
          />
        </div>
      </Link>
      <div className={styles.postCardContent}>
        {(post.categories && post.categories.length > 0) || (highlightViews && typeof post.viewCount === 'number') ? (
          <div className={styles.postMetaRow}>
            {(() => {
              const categoryTags: CategoryTag[] =
                post.categories?.flatMap((category) => {
                  const slugValue = category?.slug?.current;
                  if (!slugValue) {
                    return [];
                  }
                  const label = category?.title && category.title.trim().length > 0
                    ? category.title
                    : common('categoryFallback');
                  return [
                    {
                      key: `${post._id}-category-${slugValue}`,
                      href: {pathname: '/category/[slug]', params: {slug: slugValue}},
                      label,
                    } satisfies CategoryTag,
                  ];
                }) ?? [];

              const subcategoryTags: CategoryTag[] =
                post.subcategories?.flatMap((subcategory) => {
                  const subSlug = subcategory?.slug?.current;
                  const parentSlug = subcategory?.parent?.slug?.current;
                  if (!subSlug || !parentSlug) {
                    return [];
                  }
                  const label = subcategory?.title && subcategory.title.trim().length > 0
                    ? subcategory.title
                    : subSlug;
                  return [
                    {
                      key: `${post._id}-subcategory-${parentSlug}-${subSlug}`,
                      href: {
                        pathname: '/category/[slug]/[subcategory]',
                        params: {slug: parentSlug, subcategory: subSlug},
                      },
                      label,
                    } satisfies CategoryTag,
                  ];
                }) ?? [];

              const tags = [...categoryTags, ...subcategoryTags];
              if (tags.length === 0) {
                return <div />;
              }

              return (
                <div className={styles.categoryList}>
                  {tags.map((tag) => (
                    <Link key={tag.key} href={tag.href} className={styles.categoryBadge}>
                      {tag.label}
                    </Link>
                  ))}
                </div>
              );
            })()}
            {highlightViews && typeof post.viewCount === 'number' ? (
              <span className={styles.viewCount}>{common('viewsCount', {count: post.viewCount})}</span>
            ) : null}
          </div>
        ) : null}
        <Link
          href={{pathname: '/post/[slug]', params: {slug: post.slug.current}}}
          className={styles.postTitleLink}
        >
          <h3 className={`${styles.postTitle} font-serif`}>{resolvedTitle}</h3>
        </Link>
        {post.excerpt && post.excerpt.trim().length > 0 ? <p className={styles.postExcerpt}>{post.excerpt}</p> : null}
        <Link
          href={{pathname: '/post/[slug]', params: {slug: post.slug.current}}}
          className={styles.cardReadMore}
        >
          {common('readArticleCta')}
        </Link>
      </div>
    </article>
  );
};

// Updated EmptyPostCard to match the new design
const EmptyPostCard = () => (
  <div className={styles.postCard}>
    <div className={styles.postImageContainer} style={{ backgroundColor: '#f0f0f0' }}>
      {/* Placeholder for image */}
    </div>
    <div className={styles.postCardContent}>
       <div className={styles.placeholderTitle} />
       <div className={styles.placeholderExcerpt} />
    </div>
  </div>
);

// The Home page component
export default async function HomePage({params}: HomePageProps) {
  const {locale} = await params;
  const activeLocale = normalizeLocale(locale);
  const homeTranslationsPromise = getTranslations({locale: activeLocale, namespace: 'Home'});
  const commonTranslationsPromise = getTranslations({locale: activeLocale, namespace: 'Common'});

  const [featuredPost, latestPosts, mostReadPosts, t, common] = await Promise.all([
    getFeaturedPost(activeLocale),
    getLatestPosts(activeLocale),
    getMostReadPosts(activeLocale),
    homeTranslationsPromise,
    commonTranslationsPromise,
  ]);

  const postPlaceholders = Array.from({ length: Math.max(0, 3 - latestPosts.length) });
  const adjustedMostRead = featuredPost
    ? mostReadPosts.filter((post) => post._id !== featuredPost._id)
    : mostReadPosts;
  const mostReadPlaceholders = Array.from({ length: Math.max(0, 3 - adjustedMostRead.length) });
  const featuredDate = featuredPost?._createdAt
    ? new Date(featuredPost._createdAt).toLocaleDateString(activeLocale, {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;
  const featuredViews =
    typeof featuredPost?.viewCount === 'number'
      ? common('viewsCount', {count: featuredPost.viewCount})
      : null;
  const featuredTitle = featuredPost?.title && featuredPost.title.trim().length > 0
    ? featuredPost.title
    : common('untitledPost');
  const primaryCategory = featuredPost?.categories?.[0];
  const primarySubcategory = featuredPost?.subcategories?.[0];
  
  return (
    <main className={styles.main}>
      {/* Hero Section */}
      <section className={styles.hero}>
      {featuredPost ? (
          <article className={styles.heroHighlight}>
            <Link
              href={{pathname: '/post/[slug]', params: {slug: featuredPost.slug.current}}}
              aria-label={common('readArticleAria', {title: featuredTitle})}
              className={styles.heroBackdropLink}
            />
            <div className={styles.heroImageWrap}>
              <Image
                src={urlFor(featuredPost.mainImage).width(1800).height(1200).url()}
                alt={featuredTitle || 'Post image'}
                fill
                sizes="(max-width: 900px) 100vw, 1240px"
                className={styles.heroImage}
                priority
              />
            </div>
            <div className={styles.heroOverlay} />
            <div className={styles.heroContent}>
              <div className={styles.heroTagRow}>
                {primaryCategory?.slug?.current ? (
                  <Link
                    href={{pathname: '/category/[slug]', params: {slug: primaryCategory.slug.current}}}
                    className={styles.heroCategory}
                  >
                    {primaryCategory.title}
                  </Link>
                ) : primaryCategory?.title ? (
                  <span className={styles.heroCategory}>{primaryCategory.title}</span>
                ) : null}
                {primarySubcategory?.slug?.current && primarySubcategory.parent?.slug?.current ? (
                  <Link
                    href={{
                      pathname: '/category/[slug]/[subcategory]',
                      params: {
                        slug: primarySubcategory.parent.slug.current,
                        subcategory: primarySubcategory.slug.current,
                      },
                    }}
                    className={styles.heroCategory}
                  >
                    {primarySubcategory.title && primarySubcategory.title.trim().length > 0
                      ? primarySubcategory.title
                      : primarySubcategory.slug.current}
                  </Link>
                ) : null}
              </div>
              <Link
                href={{pathname: '/post/[slug]', params: {slug: featuredPost.slug.current}}}
                className={styles.heroTitleLink}
              >
                <h1 className={`${styles.heroTitle} font-serif`}>{featuredTitle}</h1>
              </Link>
              {(featuredDate || featuredViews) && (
                <div className={styles.heroMetaRow}>
                  {featuredDate && <span className={styles.heroMeta}>{featuredDate}</span>}
                  {featuredViews && <span className={styles.heroStat}>{featuredViews}</span>}
                </div>
              )}
              {featuredPost.excerpt && <p className={styles.heroSubtitle}>{featuredPost.excerpt}</p>}
              <Link
                href={{pathname: '/post/[slug]', params: {slug: featuredPost.slug.current}}}
                className={styles.heroCta}
              >
                {common('readArticleAction')} <FiArrowRight />
              </Link>
            </div>
          </article>
        ) : (
          <div className={styles.heroFallback}>
            <h1 className={`${styles.heroTitle} font-serif`}>{t('heroFallbackTitle')}</h1>
            <p className={styles.heroSubtitle}>{t('heroFallbackDescription')}</p>
          </div>
        )}
      </section>

      {/* Latest Posts Section */}
      <section className={styles.latestPostsSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{t('latestTitle')}</h2>
            <Link href={{pathname: '/articles'}} className={styles.seeAllLink}>
              {common('viewAll')} <FiArrowRight />
            </Link>
          </div>
          <div className={styles.postsGrid}>
            {latestPosts.map((post) => (
              <PostCard key={post._id} post={post} common={common} />
            ))}
            {postPlaceholders.map((_, index) => (
              <EmptyPostCard key={`placeholder-${index}`} />
            ))}
          </div>
        </div>
      </section>

      {/* Most Viewed Posts Section */}
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{t('mostReadTitle')}</h2>
            <Link href={{pathname: '/articles'}} className={styles.seeAllLink}>
              {common('viewAll')} <FiArrowRight />
            </Link>
          </div>
          <div className={styles.postsGrid}>
            {adjustedMostRead.map((post) => (
              <PostCard key={post._id} post={post} highlightViews common={common} />
            ))}
            {mostReadPlaceholders.map((_, index) => (
              <EmptyPostCard key={`most-read-placeholder-${index}`} />
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className={styles.studioSection}>
        <div className={styles.studioImageContainer}>
          <Image
            src="https://images.unsplash.com/photo-1431576901776-e539bd916ba2?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt={t('aboutImageAlt')}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className={styles.studioImage}
          />
        </div>
        <div className={styles.studioContent}>
          <h2 className={styles.studioTitle}>{t('aboutTitle')}</h2>
          {t.rich('aboutDescription', {
            paragraph: (chunks) => <p className={styles.studioText}>{chunks}</p>,
            bold: (chunks) => <strong>{chunks}</strong>,
          })}
        </div>
      </section>
    </main>
  );
}
