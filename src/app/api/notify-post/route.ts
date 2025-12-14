import { NextRequest, NextResponse } from 'next/server';

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_LIST_ID = process.env.BREVO_LIST_ID;
const BREVO_TEMPLATE_ID = process.env.BREVO_TEMPLATE_ID;
const BREVO_NOTIFY_SECRET = process.env.BREVO_NOTIFY_SECRET;
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.SITE_URL ??
  process.env.VERCEL_PROJECT_PRODUCTION_URL ??
  'https://example.com';

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, '');

const DEFAULT_LOCALE = 'sq';
const FALLBACK_LOCALES: readonly string[] = ['sq', 'en'];

const resolveLocalizedString = (value: unknown, locale = DEFAULT_LOCALE) => {
  if (!value) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }
  if (typeof value === 'object') {
    const localized = value as Record<string, unknown>;
    const preferredLocales = [locale, ...FALLBACK_LOCALES.filter((code) => code !== locale)];
    for (const code of preferredLocales) {
      const candidate = localized[code];
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate;
      }
    }
  }
  return undefined;
};

type IncomingPostPayload = {
  title?: string | Record<string, unknown>;
  slug?: string | { current?: string };
  excerpt?: string | Record<string, unknown>;
  summary?: string | Record<string, unknown>;
  publishedAt?: string;
  _updatedAt?: string;
  url?: string;
  mainImageUrl?: string;
  heroImageUrl?: string;
  [key: string]: unknown;
};

const getSecretFromRequest = (request: NextRequest) => {
  if (!BREVO_NOTIFY_SECRET) {
    return BREVO_NOTIFY_SECRET;
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return request.nextUrl.searchParams.get('secret');
};

const resolveSlug = (value: IncomingPostPayload['slug']) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value.current === 'string') return value.current;
  return null;
};

const resolveExcerpt = (payload: IncomingPostPayload, locale = DEFAULT_LOCALE) =>
  resolveLocalizedString(payload.excerpt, locale) ?? resolveLocalizedString(payload.summary, locale);

const resolveImageUrl = (payload: IncomingPostPayload) =>
  typeof payload.mainImageUrl === 'string'
    ? payload.mainImageUrl
    : typeof payload.heroImageUrl === 'string'
      ? payload.heroImageUrl
      : undefined;

type BrevoContact = {
  email?: string;
  attributes?: Record<string, unknown>;
};

const fetchBrevoRecipients = async (listId: number) => {
  const recipients: { email: string; name?: string }[] = [];
  const limit = 500;
  let offset = 0;

  // Loop in case the list has more contacts than our per-request limit
  while (true) {
    const response = await fetch(
      `https://api.brevo.com/v3/contacts/lists/${listId}/contacts?limit=${limit}&offset=${offset}`,
      {
        headers: {
          'api-key': BREVO_API_KEY as string,
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const message =
        (errorBody && typeof errorBody?.message === 'string' && errorBody.message) ||
        'Nuk u lexuan dot kontaktet nga Brevo.';
      throw new Error(message);
    }

    const data = (await response.json()) as { contacts?: BrevoContact[] } | null;
    const contacts = data?.contacts ?? [];

    for (const contact of contacts) {
      if (!contact?.email) continue;
      const nameAttribute =
        (typeof contact.attributes?.FIRSTNAME === 'string' && contact.attributes?.FIRSTNAME) ||
        (typeof contact.attributes?.NAME === 'string' && contact.attributes?.NAME) ||
        undefined;
      recipients.push({
        email: contact.email,
        name: nameAttribute,
      });
    }

    if (contacts.length < limit) {
      break;
    }

    offset += limit;
  }

  return recipients;
};

export async function POST(request: NextRequest) {
  try {
    if (!BREVO_API_KEY || !BREVO_LIST_ID || !BREVO_TEMPLATE_ID) {
      console.error(
        '[notify-post] Missing BREVO_API_KEY, BREVO_LIST_ID, or BREVO_TEMPLATE_ID environment variables.'
      );
      return NextResponse.json(
        { message: 'Konfigurimi i shërbimit të email-it mungon.' },
        { status: 500 }
      );
    }

    if (BREVO_NOTIFY_SECRET) {
      const providedSecret = getSecretFromRequest(request);
      if (providedSecret !== BREVO_NOTIFY_SECRET) {
        return NextResponse.json({ message: 'I paautorizuar.' }, { status: 401 });
      }
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

    if (!body) {
      return NextResponse.json({ message: 'Trupi i kërkesës është i pavlefshëm.' }, { status: 400 });
    }

    const payload: IncomingPostPayload =
      (body.post as IncomingPostPayload) ||
      (body.document as IncomingPostPayload) ||
      (body.data as IncomingPostPayload) ||
      (body as IncomingPostPayload);

    const slug = resolveSlug(payload.slug);

    if (!slug) {
      return NextResponse.json({ message: 'Slug i postimit mungon.' }, { status: 400 });
    }

    const title = resolveLocalizedString(payload.title) ?? 'Artikull i ri nga INTERNO';

    const excerpt = resolveExcerpt(payload);

    const publishedAt =
      (typeof payload.publishedAt === 'string' && payload.publishedAt) ||
      (typeof payload._updatedAt === 'string' && payload._updatedAt) ||
      new Date().toISOString();

    const imageUrl = resolveImageUrl(payload);

    const baseUrl = normalizeBaseUrl(SITE_URL);
    const postUrl = payload.url
      ? payload.url
      : `${baseUrl}${slug.startsWith('/') ? slug : `/post/${slug}`}`;

    const listIdNumber = Number(BREVO_LIST_ID);
    const templateIdNumber = Number(BREVO_TEMPLATE_ID);

    if (Number.isNaN(listIdNumber) || Number.isNaN(templateIdNumber)) {
      console.error('[notify-post] BREVO_LIST_ID or BREVO_TEMPLATE_ID is not numeric.');
      return NextResponse.json(
        { message: 'Konfigurimi i shabllonit të email-it është i pavlefshëm.' },
        { status: 500 }
      );
    }

    let publishedDate = new Date(publishedAt);
    if (Number.isNaN(publishedDate.getTime())) {
      publishedDate = new Date();
    }

    const params: Record<string, string> = {
      title,
      url: postUrl,
      publishedAt: publishedDate.toLocaleDateString('sq-AL', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      year: String(publishedDate.getFullYear()),
    };

    if (excerpt) {
      params.excerpt = excerpt;
    }

    if (imageUrl) {
      params.imageUrl = imageUrl;
    }

    const recipients = await fetchBrevoRecipients(listIdNumber);

    if (recipients.length === 0) {
      console.warn('[notify-post] No contacts found in Brevo list; skipping send.');
      return NextResponse.json({ ok: true, skipped: true });
    }

    const MAX_RECIPIENTS_PER_CALL = 100; // safety chunking
    const chunkCount = Math.ceil(recipients.length / MAX_RECIPIENTS_PER_CALL);

    for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
      const chunk = recipients.slice(
        chunkIndex * MAX_RECIPIENTS_PER_CALL,
        (chunkIndex + 1) * MAX_RECIPIENTS_PER_CALL
      );

      const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          templateId: templateIdNumber,
          to: chunk,
          params,
        }),
      });

      if (!brevoResponse.ok) {
        const errorBody = await brevoResponse.json().catch(() => null);
        const message =
          (errorBody && typeof errorBody?.message === 'string' && errorBody.message) ||
          'Dërgesa e email-it dështoi.';
        console.error(
          '[notify-post] Brevo send error:',
          brevoResponse.status,
          brevoResponse.statusText,
          message
        );
        return NextResponse.json({ message }, { status: 502 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[notify-post] Unexpected error:', error);
    return NextResponse.json(
      { message: 'Dërgesa e njoftimit dështoi.' },
      { status: 500 }
    );
  }
}
