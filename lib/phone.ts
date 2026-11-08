export function normalizePhone(input: unknown): string | null {
  if (typeof input !== 'string' || input.length > 30) return null;
  const compact = input.trim().replace(/[\s()-]/g, '');
  if (!/^\+?\d+$/.test(compact)) return null;
  const international = compact.startsWith('0')
    ? `+62${compact.slice(1)}`
    : compact.startsWith('+')
      ? compact
      : `+${compact}`;
  return /^\+[1-9]\d{8,14}$/.test(international) ? international : null;
}
