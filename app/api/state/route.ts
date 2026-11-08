import { NextRequest, NextResponse } from 'next/server';
import {
  errorResponse,
  ensureUser,
  requestSpace,
} from '../../../lib/server/http';
import { getSnapshot } from '../../../lib/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(
      await getSnapshot(await ensureUser(requestSpace(request))),
      {
        headers: { 'Cache-Control': 'no-store, private' },
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
