import { describe, expect, it } from 'vitest';
import { errorMessage } from '../locales/vi';
describe('Vietnamese API error mapping', () => {
  it('explains an acceptance race with a useful refresh message', () => {
    expect(errorMessage('REQUEST_NOT_OPEN')).toContain('đã có người nhận');
  });
  it('provides a Vietnamese fallback for unknown network errors', () => {
    expect(errorMessage('UNRECOGNIZED')).toContain('kết nối');
  });
});
