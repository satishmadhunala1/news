import { NextResponse } from 'next/server';

export async function POST() {
  const backend = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  const secret = process.env.INTERNAL_API_SECRET;

  if (!secret) {
    return NextResponse.json(
      { success: false, error: 'INTERNAL_API_SECRET is not configured on the frontend server' },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`${backend}/news/fetch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-secret': secret,
      },
      body: JSON.stringify({ useAi: true }),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 502 });
  }
}
