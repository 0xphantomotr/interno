#!/usr/bin/env node

import {createClient} from '@sanity/client';

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? process.env.SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? process.env.SANITY_DATASET;
const token = process.env.SANITY_WRITE_TOKEN ?? process.env.SANITY_STUDIO_TOKEN;

if (!projectId || !dataset) {
  console.error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID or NEXT_PUBLIC_SANITY_DATASET environment variables.');
  process.exit(1);
}

if (!token) {
  console.error('This migration requires a SANITY_WRITE_TOKEN with write access.');
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  token,
  useCdn: false,
  apiVersion: '2023-05-03',
});

const DEFAULT_LOCALE = 'sq';
const SECONDARY_LOCALE = 'en';

const ensureLocalizedString = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const next = {...value};
    const fallback =
      typeof next[DEFAULT_LOCALE] === 'string' && next[DEFAULT_LOCALE].trim().length
        ? next[DEFAULT_LOCALE]
        : typeof next[SECONDARY_LOCALE] === 'string'
          ? next[SECONDARY_LOCALE]
          : '';
    if (typeof next[DEFAULT_LOCALE] !== 'string' || !next[DEFAULT_LOCALE].trim()) {
      next[DEFAULT_LOCALE] = fallback;
    }
    if (typeof next[SECONDARY_LOCALE] !== 'string') {
      next[SECONDARY_LOCALE] = fallback;
    }
    return next;
  }

  const base = typeof value === 'string' ? value : '';
  return {
    [DEFAULT_LOCALE]: base,
    [SECONDARY_LOCALE]: base,
  };
};

const ensureLocalizedText = ensureLocalizedString;

const ensureLocalizedBlocks = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const next = {...value};
    const fallback = Array.isArray(next[DEFAULT_LOCALE])
      ? next[DEFAULT_LOCALE]
      : Array.isArray(next[SECONDARY_LOCALE])
        ? next[SECONDARY_LOCALE]
        : [];
    if (!Array.isArray(next[DEFAULT_LOCALE])) {
      next[DEFAULT_LOCALE] = fallback;
    }
    if (!Array.isArray(next[SECONDARY_LOCALE])) {
      next[SECONDARY_LOCALE] = fallback;
    }
    return next;
  }

  if (Array.isArray(value)) {
    return {
      [DEFAULT_LOCALE]: value,
      [SECONDARY_LOCALE]: value,
    };
  }

  return {
    [DEFAULT_LOCALE]: [],
    [SECONDARY_LOCALE]: [],
  };
};

async function migrateCategories() {
  const documents = await client.fetch(`*[_type == "category"]{_id, title, description}`);

  for (const doc of documents) {
    const patch = {};

    if (doc.title === undefined || typeof doc.title === 'string' || Array.isArray(doc.title)) {
      patch.title = ensureLocalizedString(doc.title);
    } else {
      const normalized = ensureLocalizedString(doc.title);
      if (JSON.stringify(normalized) !== JSON.stringify(doc.title)) {
        patch.title = normalized;
      }
    }

    if (doc.description === undefined || typeof doc.description === 'string' || Array.isArray(doc.description)) {
      patch.description = ensureLocalizedText(doc.description);
    } else {
      const normalized = ensureLocalizedText(doc.description);
      if (JSON.stringify(normalized) !== JSON.stringify(doc.description)) {
        patch.description = normalized;
      }
    }

    if (Object.keys(patch).length > 0) {
      console.log(`→ Migrating category ${doc._id}`);
      await client.patch(doc._id).set(patch).commit({autoGenerateArrayKeys: true});
    }
  }
}

async function migratePosts() {
  const documents = await client.fetch(
    `*[_type == "post"]{_id, title, excerpt, body, "alt": mainImage.alt}`,
  );

  for (const doc of documents) {
    const patch: Record<string, unknown> = {};

    if (doc.title === undefined || typeof doc.title === 'string' || Array.isArray(doc.title)) {
      patch.title = ensureLocalizedString(doc.title);
    } else {
      const normalized = ensureLocalizedString(doc.title);
      if (JSON.stringify(normalized) !== JSON.stringify(doc.title)) {
        patch.title = normalized;
      }
    }

    if (doc.excerpt === undefined || typeof doc.excerpt === 'string' || Array.isArray(doc.excerpt)) {
      patch.excerpt = ensureLocalizedText(doc.excerpt);
    } else {
      const normalized = ensureLocalizedText(doc.excerpt);
      if (JSON.stringify(normalized) !== JSON.stringify(doc.excerpt)) {
        patch.excerpt = normalized;
      }
    }

    if (doc.body === undefined || Array.isArray(doc.body)) {
      patch.body = ensureLocalizedBlocks(doc.body);
    } else {
      const normalized = ensureLocalizedBlocks(doc.body);
      if (JSON.stringify(normalized) !== JSON.stringify(doc.body)) {
        patch.body = normalized;
      }
    }

    if (doc.alt === undefined || typeof doc.alt === 'string' || Array.isArray(doc.alt)) {
      patch['mainImage.alt'] = ensureLocalizedString(doc.alt);
    } else {
      const normalized = ensureLocalizedString(doc.alt);
      if (JSON.stringify(normalized) !== JSON.stringify(doc.alt)) {
        patch['mainImage.alt'] = normalized;
      }
    }

    if (Object.keys(patch).length > 0) {
      console.log(`→ Migrating post ${doc._id}`);
      await client.patch(doc._id).set(patch).commit({autoGenerateArrayKeys: true});
    }
  }
}

async function run() {
  try {
    console.log('Migrating categories…');
    await migrateCategories();
    console.log('Migrating posts…');
    await migratePosts();
    console.log('Done.');
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
