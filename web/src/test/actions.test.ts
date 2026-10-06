import { describe, it, expect } from 'vitest';
import { allowedAction } from '../features/requests/RequestActions';
import type { SupportRequest } from '../api/types';
const request = {
  status: 'Open',
  requester: { id: 'requester' },
  helper: { id: 'helper' },
  isHidden: false,
} as SupportRequest;
describe('role-aware request actions', () => {
  it('allows only helpers to accept an open request', () => {
    expect(allowedAction(request, { id: 'helper', role: 'Helper' })).toBe('accept');
    expect(allowedAction(request, { id: 'requester', role: 'Requester' })).toBeNull();
    expect(allowedAction(request, { id: 'admin', role: 'Admin' })).toBeNull();
  });
  it('limits start to assigned helper and completion to owner at the right stage', () => {
    expect(allowedAction({ ...request, status: 'Accepted' }, { id: 'helper', role: 'Helper' })).toBe('start');
    expect(allowedAction({ ...request, status: 'Accepted' }, { id: 'other', role: 'Helper' })).toBeNull();
    expect(allowedAction({ ...request, status: 'InProgress' }, { id: 'requester', role: 'Requester' })).toBe(
      'complete',
    );
    expect(
      allowedAction({ ...request, status: 'Completed' }, { id: 'requester', role: 'Requester' }),
    ).toBeNull();
  });
});
