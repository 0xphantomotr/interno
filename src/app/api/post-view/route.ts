import { NextResponse } from 'next/server';
import { client } from '@/lib/sanity';
import { writeClient } from '@/lib/sanity.server';
import { ratelimit } from '@/lib/ratelimit';

export async function POST(request: Request) {
  if (!writeClient) {
    console.warn('[post-view] SANITY_API_TOKEN missing; skipping write.');
    return NextResponse.json(
      {
        viewCount: null,
        warning: 'View tracking inactive: SANITY_API_TOKEN not configured.',
      },
      { status: 200 },
    );
  }

  const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  let body: { slug?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const slug = body?.slug?.trim();

  if (!slug) {
    return NextResponse.json({ error: 'Missing post slug.' }, { status: 400 });
  }

  const post = await client.fetch<{ _id: string | null }>(
    `*[_type == "post" && slug.current == $slug][0]{ _id }`,
    { slug },
  );

  if (!post?._id) {
    return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
  }

  try {
    const updated = await writeClient
      .patch(post._id)
      .setIfMissing({ viewCount: 0 })
      .inc({ viewCount: 1 })
      .commit({ returnDocuments: true });

    const viewCount = typeof updated.viewCount === 'number' ? updated.viewCount : 0;

    return NextResponse.json({ viewCount });
  } catch (error) {
    console.error('Failed to increment post view count:', error);
    return NextResponse.json({ error: 'Failed to record view.' }, { status: 500 });
  }
}
