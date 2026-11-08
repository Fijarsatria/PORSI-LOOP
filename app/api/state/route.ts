import { NextResponse } from 'next/server';
import { errorResponse, ensureUser } from '../../../lib/server/http';
import { getSnapshot } from '../../../lib/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    return NextResponse.json(await getSnapshot(await ensureUser()), {
      headers: { 'Cache-Control': 'no-store, private' },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
