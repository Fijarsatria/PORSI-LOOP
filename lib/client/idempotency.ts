// getRandomValues also works on local HTTP previews, where randomUUID may be absent.
export function createIdempotencyKey(
  random: Pick<Crypto, 'getRandomValues'> &
    Partial<Pick<Crypto, 'randomUUID'>> = globalThis.crypto,
): string {
  if (random.randomUUID) return random.randomUUID();
  return Array.from(random.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}
