import Image from 'next/image';
import {PortableText, PortableTextComponents} from '@portabletext/react';
import {getTranslations} from 'next-intl/server';
import {notFound} from 'next/navigation';

import {Link} from '@/i18n/navigation';
import {routing} from '@/i18n/routing';
import {client, urlFor} from '@/lib/sanity';
import {localizedFieldProjection, normalizeLocale} from '@/sanity/lib/localization';
import {PostViewTracker} from '@/components/PostViewTracker';
import {Post} from '@/types';

import styles from './post.module.css';

type Props = {
  params: Promise<{locale: string; slug: string}>;
};

type CategoryTagLink =
  | {pathname: '/category/[slug]'; params: {slug: string}}
  | {pathname: '/category/[slug]/[subcategory]'; params: {slug: string; subcategory: string}};

type CategoryTag = {
  key: string;
  href: CategoryTagLink;
  label: string;
};

async function getPost(slug: string, locale: string): Promise<Post | null> {
  const query = `*[_type == "post" && slug.current == $slug][0]{
    "title": ${localizedFieldProjection('title')},
    mainImage{
      ..., 
      "alt": ${localizedFieldProjection('alt', '$locale')}
    },
    "body": ${localizedFieldProjection('body')},
    "author": author->{name, image},
    "categories": categories[]->{
      "title": ${localizedFieldProjection('title')},
      slug
    },
    "subcategories": subcategories[]->{
      "title": ${localizedFieldProjection('title')},
      slug,
      parent->{slug}
    },
    _createdAt,
    "font": font->cssClass,
    "excerpt": ${localizedFieldProjection('excerpt')}
  }`;
  try {
    const post = await client.fetch(query, {slug, locale}, {cache: 'no-store'});
    return post;
  } catch (error) {
    console.error("Failed to fetch post:", error);
    return null;
  }
}


export async function generateStaticParams() {
  const query = `*[_type == "post" && defined(slug.current)]{"slug": slug.current}`;
  const slugs: {slug: string}[] = await client.fetch(query);

  return routing.locales.flatMap((locale) =>
    slugs.map((s) => ({
      locale,
      slug: s.slug,
    })),
  );
}

export default async function PostPage({params}: Props) {
  const {slug, locale} = await params;

  if (!slug) {
    notFound();
  }

  const activeLocale = normalizeLocale(locale);

  const [post, common] = await Promise.all([
    getPost(slug, activeLocale),
    getTranslations({locale: activeLocale, namespace: 'Common'}),
  ]);

  if (!post) {
    notFound();
  }

  const fontClass = post.font || 'font-tinos';
  const authorName = post.author?.name ?? common('anonymousAuthor');
  const resolvedTitle = post.title && post.title.trim().length > 0 ? post.title : common('untitledPost');
  const postDate = post._createdAt
    ? new Date(post._createdAt).toLocaleDateString(activeLocale, {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const components: PortableTextComponents = {
    types: {
      image: ({value}) => {
        if (!value?.asset?._ref) {
          return null;
        }
        return (
          <div className={styles.contentImageContainer}>
            <Image
              src={urlFor(value).width(1600).auto('format').quality(90).url()}
              alt={value.alt || common('postImageAlt')}
              width={1600}
              height={900}
              className={styles.contentImage}
            />
          </div>
        );
      },
      figure: ({value}) => {
        const imageValue = value?.image;
        if (!imageValue?.asset?._ref) {
          return null;
        }
        const altText = value?.alt || value?.caption || common('postImageAlt');
        return (
          <figure className={styles.contentFigure}>
            <Image
              src={urlFor(imageValue).width(1600).auto('format').quality(90).url()}
              alt={altText}
              width={1600}
              height={900}
              className={styles.contentFigureImage}
            />
            {(value?.caption || value?.attribution) && (
              <figcaption className={styles.contentFigureCaption}>
                {value.caption}
                {value.attribution ? (
                  <span className={styles.contentFigureAttribution}>{value.attribution}</span>
                ) : null}
              </figcaption>
            )}
          </figure>
        );
      },
    },
  };

  return (
    <article className={`${styles.article} ${fontClass}`}>
      <PostViewTracker slug={slug} />
      <div className={styles.header}>
        <h1 className={styles.title}>{resolvedTitle}</h1>
        <div className={styles.meta}>
          <div className={styles.authorInfo}>
            {post.author?.image && (
              <Image
                src={urlFor(post.author.image).width(40).height(40).url()}
                alt={common('authorImageAlt', {name: authorName})}
                width={40}
                height={40}
                className={styles.authorImage}
              />
            )}
            <span>{common('byAuthor', {name: authorName})}</span>
          </div>
          {postDate && <span className={styles.date}>{postDate}</span>}
        </div>

        {(() => {
          const categoryTags: CategoryTag[] =
            post.categories?.flatMap((category) => {
              const slugValue = category.slug?.current;
              if (!slugValue) {
                return [];
              }
              const label =
                category.title && category.title.trim().length > 0
                  ? category.title
                  : common('categoryFallback');
              return [
                {
                  key: `category-${slugValue}`,
                  href: {pathname: '/category/[slug]', params: {slug: slugValue}},
                  label,
                } satisfies CategoryTag,
              ];
            }) ?? [];

          const subcategoryTags: CategoryTag[] =
            post.subcategories?.flatMap((subcategory) => {
              const subSlug = subcategory.slug?.current;
              const parentSlug = subcategory.parent?.slug?.current;
              if (!subSlug || !parentSlug) {
                return [];
              }
              const label =
                subcategory.title && subcategory.title.trim().length > 0
                  ? subcategory.title
                  : subSlug;
              return [
                {
                  key: `subcategory-${parentSlug}-${subSlug}`,
                  href: {pathname: '/category/[slug]/[subcategory]', params: {slug: parentSlug, subcategory: subSlug}},
                  label,
                } satisfies CategoryTag,
              ];
            }) ?? [];

          const tags = [...categoryTags, ...subcategoryTags];
          if (tags.length === 0) {
            return null;
          }

          return (
            <div className={styles.categories}>
              {tags.map((tag) => (
                <Link key={tag.key} href={tag.href} className={styles.categoryLink}>
                  {tag.label}
                </Link>
              ))}
            </div>
          );
        })()}
      </div>

      {post.mainImage && (
        <div className={styles.mainImageOuter}>
          <div className={styles.mainImageContainer}>
            <Image
              src={urlFor(post.mainImage).url()}
              alt={resolvedTitle || 'Post image'}
              fill
              sizes="(max-width: 1024px) 100vw, 1400px"
              className={styles.mainImage}
              priority
            />
          </div>
        </div>
      )}

      <div className={styles.content}>
        {post.body && <PortableText value={post.body} components={components} />}
      </div>
    </article>
  );
}
