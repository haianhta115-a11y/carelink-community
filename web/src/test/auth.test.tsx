import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { api } from '../api/client';
import { LoginPage, RegisterPage } from '../pages/AuthPages';
import { vi as text } from '../locales/vi';
import { safeReturnPath } from '../lib/auth-storage';
const { signIn } = vi.hoisted(() => ({ signIn: vi.fn() }));
vi.mock('../features/auth/AuthProvider', () => ({
  useAuth: () => ({ signIn }),
  roleHome: (role: string) => (role === 'Helper' ? '/requests' : '/my-requests'),
}));
describe('authentication forms and safe routing', () => {
  it('shows field errors and prevents an invalid registration', async () => {
    const post = vi.spyOn(api, 'post');
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: text.auth.registerButton }));
    expect(await screen.findByText(text.auth.emailInvalid)).toBeVisible();
    expect(screen.getByText(text.auth.nameInvalid)).toBeVisible();
    expect(post).not.toHaveBeenCalled();
    post.mockRestore();
  });
  it('logs in and routes the helper after a validated response', async () => {
    const post = vi
      .spyOn(api, 'post')
      .mockResolvedValue({ data: { token: 'jwt', expiresAt: '2099-01-01', user: { role: 'Helper' } } });
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/requests" element={<div>{text.nav.requests}</div>} />
        </Routes>
      </MemoryRouter>,
    );
    await user.type(screen.getByLabelText(text.common.email), 'helper@example.vn');
    await user.type(screen.getByLabelText(text.common.password), 'Test@12345');
    await user.click(screen.getByRole('button', { name: text.nav.login }));
    await waitFor(() => expect(signIn).toHaveBeenCalled());
    expect(await screen.findByText(text.nav.requests)).toBeVisible();
    post.mockRestore();
  });
  it('rejects external, protocol-relative and backslash return URLs', () => {
    for (const url of ['https://evil.test', '//evil.test', '/\\evil.test', '/path\\evil'])
      expect(safeReturnPath(url, '/requests')).toBe('/requests');
    expect(safeReturnPath('/requests?keyword=test', '/')).toBe('/requests?keyword=test');
  });
});
