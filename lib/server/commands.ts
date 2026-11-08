import { randomUUID } from 'node:crypto';
import type { Action, User } from '../domain';
import {
  applyAction,
  createState,
  createMarketplaceState,
  DomainError,
  expire,
  serverNow,
  type StoreState,
} from './engine';

// One command engine is shared by local and hosted demo persistence.
export function applyDemoCommand(
  state: StoreState,
  user: User,
  action: Action,
  realNow = Date.now(),
): StoreState {
  const key =
    typeof action.idempotencyKey === 'string'
      ? `${user.id}:${action.idempotencyKey.trim().slice(0, 100)}`
      : '';
  if (key && state.idempotency.includes(key)) return state;
  if (action.type === 'reset_demo') {
    if (user.role !== 'admin')
      throw new DomainError(
        'Hanya pengelola yang dapat mengatur ulang simulasi.',
        403,
      );
    const next = state.kitchens
      ? createMarketplaceState(realNow)
      : createState(realNow);
    if (key) next.idempotency.push(key);
    return next;
  }
  if (action.type === 'advance_demo') {
    if (user.role !== 'admin')
      throw new DomainError(
        'Hanya pengelola yang dapat mengubah jam simulasi.',
        403,
      );
    if (
      typeof action.minutes !== 'number' ||
      !Number.isSafeInteger(action.minutes) ||
      action.minutes < 1 ||
      action.minutes > 240
    )
      throw new DomainError('Majukan jam simulasi antara 1–240 menit.');
    state.demoClock = new Date(
      Date.parse(state.demoClock) + action.minutes * 60000,
    ).toISOString();
    for (const kitchen of state.kitchens ?? [])
      kitchen.demoClock = new Date(
        Date.parse(kitchen.demoClock) + action.minutes * 60000,
      ).toISOString();
    const now = serverNow(state, 'demo', realNow);
    expire(state, now);
    state.logs.unshift({
      id: randomUUID(),
      action: 'Jam simulasi dimajukan',
      detail: `+${action.minutes} menit · tidak mengubah pengambilan menjadi berhasil`,
      actor: user.name,
      at: new Date(now).toISOString(),
    });
    if (key) state.idempotency = [...state.idempotency.slice(-999), key];
    return state;
  }
  return applyAction(state, user, action, serverNow(state, 'demo', realNow));
}
