import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { User } from '../domain';
import { DEMO_OUTLETS, DEMO_USERS, DomainError } from './engine';

export const createGuest = (): User => ({ id: `guest-${randomUUID()}`, role: 'student', name: 'Tamu Porsi', isGuest: true });
const matches = (actual: string, expected: string) => {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

export function authenticateDemo(data: Record<string, unknown>): User {
  if (typeof data.email !== 'string' || typeof data.password !== 'string' || data.email.length > 254 || data.password.length > 1024) throw new DomainError('Masukkan email dan kata sandi akun.', 401);
  const email = data.email.trim().toLowerCase();
  const production = process.env.NODE_ENV === 'production';
  const credentials = {
    admin: { email: process.env.DEMO_ADMIN_EMAIL ?? (!production ? 'admin@porsiloop.local' : ''), password: process.env.DEMO_ADMIN_PASSWORD ?? (!production ? 'PorsiAdmin2026!' : '') },
    student: { email: process.env.DEMO_STUDENT_EMAIL ?? (!production ? 'student@porsiloop.local' : ''), password: process.env.DEMO_STUDENT_PASSWORD ?? (!production ? 'PorsiStudent2026!' : '') },
    seller: { password: process.env.DEMO_SELLER_PASSWORD ?? (!production ? 'PorsiSeller2026!' : '') },
  };
  if (data.role === 'seller') {
    const outlet = DEMO_OUTLETS.find(o => email === (o.id === 'outlet-bu-ratna' ? process.env.DEMO_SELLER_EMAIL ?? o.email : o.email));
    if (outlet && credentials.seller.password && matches(data.password, credentials.seller.password)) return { ...DEMO_USERS.seller, id: `demo-seller-${outlet.id}`, name: outlet.name, email, outletId: outlet.id };
  } else if (data.role === 'admin' || data.role === 'student') {
    const credential = credentials[data.role];
    if (credential.email && credential.password && matches(email, credential.email.toLowerCase()) && matches(data.password, credential.password)) return { ...DEMO_USERS[data.role], email, isGuest: false };
  }
  throw new DomainError('Email, kata sandi, atau jenis akun belum sesuai.', 401);
}
