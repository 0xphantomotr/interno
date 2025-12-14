import { NextRequest, NextResponse } from 'next/server';
import { ratelimit } from '@/lib/ratelimit';

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_LIST_ID = process.env.BREVO_LIST_ID;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
    const { success } = await ratelimit.limit(ip);
    
    if (!success) {
      return NextResponse.json(
        { message: 'Ju lutem provoni përsëri më vonë.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim() : '';

    if (!email) {
      return NextResponse.json(
        { message: 'Email-i është i detyrueshëm.' },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { message: 'Adresë email e pavlefshme.' },
        { status: 400 }
      );
    }

    if (!BREVO_API_KEY || !BREVO_LIST_ID) {
      console.warn('[api/subscribe] Missing BREVO_API_KEY or BREVO_LIST_ID environment variable.');
      return NextResponse.json(
        {
          message:
            'Shërbimi i abonimit nuk është konfiguruar ende. Shtoni kredencialet në mjedisin e prodhimit.',
        },
        { status: 500 }
      );
    }

    const listIdNumber = Number(BREVO_LIST_ID);
    if (Number.isNaN(listIdNumber)) {
      console.error('[api/subscribe] BREVO_LIST_ID must be a numeric value.');
      return NextResponse.json(
        { message: 'Konfigurimi i listës së abonentëve është i pavlefshëm.' },
        { status: 500 }
      );
    }

    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        email,
        listIds: [listIdNumber],
        updateEnabled: true,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const errorCode = errorBody && typeof errorBody?.code === 'string' ? errorBody.code : null;

      // Brevo returns 400 with code duplicate_parameter when contact already exists.
      if (response.status === 400 && errorCode === 'duplicate_parameter') {
        return NextResponse.json({ ok: true });
      }

      const message =
        (errorBody && typeof errorBody?.message === 'string' && errorBody.message) ||
        'Shërbimi i email-it nuk u përgjigj siç duhet.';
      console.error('[api/subscribe] Brevo error:', response.status, message);
      return NextResponse.json({ message }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/subscribe] Unexpected error:', error);
    return NextResponse.json(
      { message: 'Diçka shkoi keq gjatë abonimit.' },
      { status: 500 }
    );
  }
}
