import { NextRequest, NextResponse } from 'next/server';
import type { Action } from '../../../lib/domain';
import { DomainError } from '../../../lib/server/engine';
import {
  body,
  checkOrigin,
  errorResponse,
  readUser,
  requestSpace,
} from '../../../lib/server/http';
import { mutate } from '../../../lib/server/store';

export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const user = await readUser(requestSpace(request));
    if (!user)
      throw new DomainError('Masuk terlebih dahulu untuk melanjutkan.', 401);
    const data = await body(request);
    if (typeof data.type !== 'string')
      throw new DomainError('Pilih tindakan yang ingin dilakukan.');
    return NextResponse.json(await mutate(user, data as Action), {
      headers: { 'Cache-Control': 'no-store, private' },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
