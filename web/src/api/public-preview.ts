import { AxiosError, AxiosHeaders, type AxiosAdapter } from 'axios';
import { vi } from '../locales/vi';
import {
  previewAdmin,
  previewAudits,
  previewDashboard,
  previewHelper,
  previewPage,
  previewReports,
  previewRequester,
  previewRequests,
  previewUsers,
} from './preview-data';

export const publicPreview = import.meta.env.VITE_PUBLIC_PREVIEW === 'true' && !import.meta.env.VITE_API_URL;

function ok(config: Parameters<AxiosAdapter>[0], data: unknown, status = 200) {
  return { config, data, status, statusText: status === 200 ? 'OK' : 'NoContent', headers: new AxiosHeaders() };
}

function fail(config: Parameters<AxiosAdapter>[0], status: number, code: string, message: string): never {
  throw new AxiosError(message, String(status), config, undefined, {
    config,
    data: { code, title: message },
    status,
    statusText: message,
    headers: new AxiosHeaders(),
  });
}

function tokenFor(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  if (normalized === 'admin@carelink.vn') return 'preview-admin-token';
  if (normalized === 'requester1@carelink.vn') return 'preview-requester-token';
  if (normalized === 'helper1@carelink.vn') return 'preview-helper-token';
  return null;
}

function userForToken(authHeader: unknown) {
  const header = typeof authHeader === 'string' ? authHeader : '';
  const token = header.replace(/^Bearer\s+/i, '');
  if (token === 'preview-admin-token') return previewAdmin;
  if (token === 'preview-requester-token') return previewRequester;
  if (token === 'preview-helper-token') return previewHelper;
  return null;
}

function parseBody(body: unknown): Record<string, string> {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as Record<string, string>;
    } catch {
      return {};
    }
  }
  return body as Record<string, string>;
}

export const previewAdapter: AxiosAdapter = async (config) => {
  const rawUrl = config.url ?? '';
  const [path, queryString] = rawUrl.split('?');
  const query = new URLSearchParams(queryString ?? '');
  const method = (config.method ?? 'get').toLowerCase();

  // Public catalog + stats (no login needed).
  if (method === 'get' && path === '/public/categories') {
    const response = await fetch(`${import.meta.env.BASE_URL}catalog.json`);
    if (!response.ok) throw new Error(vi.common.network);
    return ok(config, await response.json());
  }
  if (method === 'get' && path === '/public/stats') {
    return ok(config, {
      completedRequests: 128,
      helpers: 45,
      openRequests: 12,
      categories: 45,
    });
  }
  if (method === 'get' && path === '/categories') {
    const response = await fetch(`${import.meta.env.BASE_URL}catalog.json`);
    if (!response.ok) throw new Error(vi.common.network);
    return ok(config, await response.json());
  }

  // Demo login. Only demo accounts work on public preview.
  if (method === 'post' && path === '/auth/login') {
    const body = parseBody(config.data);
    const token = tokenFor(String(body.email ?? ''));
    const password = String(body.password ?? '');
    const valid =
      (token === 'preview-admin-token' && password === 'Admin@12345') ||
      (token === 'preview-requester-token' && password === 'Demo@12345') ||
      (token === 'preview-helper-token' && password === 'Demo@12345');
    if (!token || !valid) return fail(config, 401, 'INVALID_CREDENTIALS', vi.errors.INVALID_CREDENTIALS);
    const user =
      token === 'preview-admin-token'
        ? previewAdmin
        : token === 'preview-requester-token'
          ? previewRequester
          : previewHelper;
    return ok(config, {
      token,
      expiresAt: new Date(Date.now() + 120 * 60 * 1000).toISOString(),
      user,
    });
  }

  // Everything below needs a demo token.
  const me = userForToken(config.headers?.Authorization);
  if (path.startsWith('/auth/me')) {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    return ok(config, me);
  }

  // Admin demo data.
  if (path === '/admin/dashboard' && method === 'get') {
    if (me?.role !== 'Admin') return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
    return ok(config, previewDashboard);
  }

  if (path === '/admin/users' && method === 'get') {
    if (me?.role !== 'Admin') return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
    const keyword = (query.get('keyword') ?? '').toLowerCase();
    const role = query.get('role') ?? '';
    const status = query.get('status') ?? '';
    const filtered = previewUsers.filter(
      (u) =>
        (!keyword || `${u.fullName} ${u.email}`.toLowerCase().includes(keyword)) &&
        (!role || u.role === role) &&
        (!status || u.status === status),
    );
    return ok(
      config,
      previewPage(filtered, Number(query.get('page') ?? 1), Number(query.get('pageSize') ?? 12)),
    );
  }

  const lockMatch = path.match(/^\/admin\/users\/(.+)\/(lock|unlock)$/);
  if (lockMatch && method === 'post') {
    if (me?.role !== 'Admin') return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
    return ok(config, null, 204);
  }

  if (path === '/admin/requests' && method === 'get') {
    if (me?.role !== 'Admin') return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
    return ok(
      config,
      previewPage(previewRequests, Number(query.get('page') ?? 1), Number(query.get('pageSize') ?? 12)),
    );
  }

  if (/^\/admin\/requests\/.+\/(hide|unhide|status)$/.test(path) && method === 'post') {
    if (me?.role !== 'Admin') return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
    return ok(config, previewRequests[0]);
  }

  if (path === '/admin/reports' && method === 'get') {
    if (me?.role !== 'Admin') return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
    return ok(
      config,
      previewPage(previewReports, Number(query.get('page') ?? 1), Number(query.get('pageSize') ?? 12)),
    );
  }

  const reportMatch = path.match(/^\/admin\/reports\/(.+)$/);
  if (reportMatch && method === 'get' && !path.endsWith('/resolve')) {
    if (me?.role !== 'Admin') return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
    const found = previewReports.find((r) => r.id === reportMatch[1]) ?? previewReports[0];
    return ok(config, found);
  }

  if (path.match(/^\/admin\/reports\/.+\/resolve$/) && method === 'post') {
    if (me?.role !== 'Admin') return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
    return ok(config, { ...previewReports[0], status: 'Resolved' });
  }

  if (path === '/admin/audit-logs' && method === 'get') {
    if (me?.role !== 'Admin') return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
    return ok(
      config,
      previewPage(previewAudits, Number(query.get('page') ?? 1), Number(query.get('pageSize') ?? 12)),
    );
  }

  if (path === '/admin/categories' && method === 'get') {
    if (me?.role !== 'Admin') return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
    const response = await fetch(`${import.meta.env.BASE_URL}catalog.json`);
    if (!response.ok) throw new Error(vi.common.network);
    const all = (await response.json()) as Array<Record<string, unknown>>;
    const items = all.slice(0, 12).map((c, i) => ({ ...c, isActive: true, sortOrder: i }));
    return ok(config, previewPage(items, Number(query.get('page') ?? 1), Number(query.get('pageSize') ?? 12)));
  }

  if (path === '/admin/categories' && method === 'post') {
    if (me?.role !== 'Admin') return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
    return fail(
      config,
      400,
      'VALIDATION_ERROR',
      'Bản public demo chỉ xem danh mục. Hãy chạy local để thêm/sửa lĩnh vực.',
    );
  }

  if (path.startsWith('/admin/categories/') && method === 'put') {
    if (me?.role !== 'Admin') return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
    return fail(
      config,
      400,
      'VALIDATION_ERROR',
      'Bản public demo chỉ xem danh mục. Hãy chạy local để thêm/sửa lĩnh vực.',
    );
  }

  // Admin clicks request title -> /requests/:id
  const reqMatch = path.match(/^\/requests\/(.+)$/);
  if (reqMatch && method === 'get' && !path.endsWith('/history') && !path.endsWith('/summary')) {
    const found = previewRequests.find((r) => r.id === reqMatch[1]) ?? previewRequests[0];
    return ok(config, found);
  }

  if (path === '/requests/summary' && method === 'get') {
    return ok(config, { total: 2, open: 1, accepted: 0, inProgress: 1, completed: 0, unreadMessages: 0 });
  }

  if (path === '/sessions/unread' && method === 'get') {
    return ok(config, { count: 0 });
  }

  return fail(config, 503, 'BACKEND_UNAVAILABLE', vi.catalog.backendPending);
};
