import {NextRequest, NextResponse} from 'next/server';

import {client} from '@/lib/sanity';
import {FALLBACK_LOCALES, localizedFieldProjection, normalizeLocale} from '@/sanity/lib/localization';

const MAX_RESULTS = 8;

const sanitizeQuery = (input: string) =>
  input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim();

const buildMatchString = (query: string) => {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (!tokens.length) {
    return '';
  }

  return tokens.map((token) => `${token}*`).join(' ');
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const rawQuery = searchParams.get('q');
  const locale = normalizeLocale(request.headers.get('x-next-intl-locale'));

  if (!rawQuery) {
    return NextResponse.json({ results: [] });
  }

  const sanitized = sanitizeQuery(rawQuery);

  if (sanitized.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const matchString = buildMatchString(sanitized);

  if (!matchString) {
    return NextResponse.json({ results: [] });
  }

  const titleSelector = localizedFieldProjection('title');
  const excerptSelector = localizedFieldProjection('excerpt');
  const categoryTitleSelector = localizedFieldProjection('title');
  const altSelector = localizedFieldProjection('alt');

  const fallbackTitleConditions = Array.from(new Set([
    'title[$locale] match $term',
    ...FALLBACK_LOCALES.map((loc) => `title['${loc}'] match $term`),
  ]));

  const fallbackExcerptConditions = Array.from(new Set([
    'excerpt[$locale] match $term',
    ...FALLBACK_LOCALES.map((loc) => `excerpt['${loc}'] match $term`),
  ]));

  const fallbackBodyConditions = Array.from(new Set([
    'defined(body[$locale]) && pt::text(body[$locale]) match $term',
    ...FALLBACK_LOCALES.map((loc) => `defined(body['${loc}']) && pt::text(body['${loc}']) match $term`),
  ]));

  const filterConditions = [
    ...fallbackTitleConditions,
    ...fallbackExcerptConditions,
    ...fallbackBodyConditions,
  ].join(' || ');

  const scoreExpressions = [
    'boost(title[$locale] match $term, 4)',
    ...FALLBACK_LOCALES.map(
      (loc) => `boost($locale != '${loc}' && title['${loc}'] match $term, 1)`
    ),
    'boost(excerpt[$locale] match $term, 2)',
    ...FALLBACK_LOCALES.map(
      (loc) => `boost($locale != '${loc}' && excerpt['${loc}'] match $term, 0.5)`
    ),
    'boost(defined(body[$locale]) && pt::text(body[$locale]) match $term, 0.5)',
    ...FALLBACK_LOCALES.map(
      (loc) => `boost($locale != '${loc}' && defined(body['${loc}']) && pt::text(body['${loc}']) match $term, 0.25)`
    ),
  ];

  const query = `
    *[_type == "post" && defined(slug.current) && defined(mainImage) && (
      ${filterConditions}
    )]
    | score(
        ${scoreExpressions.join(',\n        ')}
      )
    | order(_score desc, _createdAt desc)[0...$limit] {
      _id,
      "title": ${titleSelector},
      slug,
      "excerpt": ${excerptSelector},
      _createdAt,
      "viewCount": coalesce(viewCount, 0),
      "category": categories[0]->{
        "title": ${categoryTitleSelector},
        slug
      },
      "mainImage": mainImage{
        ...,
        "alt": ${altSelector}
      }
    }
  `;

  try {
    const results = await client.fetch(
      query,
      { term: matchString, limit: MAX_RESULTS, locale },
      {cache: 'no-store'}
    );
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search query failed:', error);
    return NextResponse.json({ results: [], error: 'Search failed.' }, { status: 500 });
  }
}
