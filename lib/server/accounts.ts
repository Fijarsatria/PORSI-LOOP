import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { DomainError, DEMO_OUTLETS } from './engine';

export function accountFields(data: Record<string, unknown>) {
  const name =
    typeof data.name === 'string' ? data.name.trim().slice(0, 100) : '';
  const email =
    typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  const password = typeof data.password === 'string' ? data.password : '';
  if (name.length < 2)
    throw new DomainError('Isi nama panggilan sedikitnya 2 karakter.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    throw new DomainError('Masukkan alamat email yang valid.');
  if (password.length < 8 || password.length > 128)
    throw new DomainError('Gunakan kata sandi 8–128 karakter.');
  return { name, email, password };
}
export function isReservedEmail(email: string) {
  return [
    ...DEMO_OUTLETS.map((o) => o.email),
    'admin@porsiloop.local',
    'student@porsiloop.local',
    process.env.DEMO_ADMIN_EMAIL,
    process.env.DEMO_SELLER_EMAIL,
    process.env.DEMO_STUDENT_EMAIL,
  ].some((value) => value?.toLowerCase() === email);
}
export function passwordHash(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password: string, stored: string) {
  if (password.length > 128) return false;
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, 64);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
