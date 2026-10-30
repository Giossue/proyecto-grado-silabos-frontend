import { describe, expect, it } from 'vitest';
import { latestRequest } from '@/lib/latestRequest';

describe('latestRequest', () => {
  it('solo la última petición iniciada sigue vigente', () => {
    const requests = latestRequest();
    const first = requests.begin();
    const second = requests.begin();

    expect(requests.isCurrent(first)).toBe(false);
    expect(requests.isCurrent(second)).toBe(true);
  });
});
