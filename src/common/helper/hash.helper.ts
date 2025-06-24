import { createHash } from 'crypto';

export function hashCardCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}
