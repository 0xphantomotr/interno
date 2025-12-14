import { createClient } from '@sanity/client';

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
const token = process.env.SANITY_API_TOKEN;

if (!projectId || !dataset) {
  console.error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID or NEXT_PUBLIC_SANITY_DATASET env vars.');
  process.exit(1);
}

if (!token) {
  console.error('SANITY_API_TOKEN env var is required to backfill view counts.');
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  token,
  useCdn: false,
  apiVersion: '2023-05-03',
});

async function backfillViewCounts() {
  const posts = await client.fetch(`*[_type == "post" && !defined(viewCount)]{ _id }`);

  if (!posts.length) {
    console.log('All posts already have a viewCount field.');
    return;
  }

  console.log(`Backfilling viewCount for ${posts.length} posts...`);

  for (const post of posts) {
    await client.patch(post._id).set({ viewCount: 0 }).commit();
    console.log(`✔ Set viewCount to 0 for ${post._id}`);
  }

  console.log('Backfill complete.');
}

backfillViewCounts().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
