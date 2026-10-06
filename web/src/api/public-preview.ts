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
import type { SupportRequest } from './types';

export const publicPreview = import.meta.env.VITE_PUBLIC_PREVIEW === 'true' && !import.meta.env.VITE_API_URL;

type Status = SupportRequest['status'];
interface JourneyState {
  status: Status;
  helperId: string | null;
  sessionId: string | null;
}
interface PreviewMessage {
  id: number;
  sessionId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl: string | null;
  content: string | null;
  imageUrl: string | null;
  sentAt: string;
  readAt: string | null;
}
interface PreviewReview {
  id: string;
  rating: number;
  comment: string | null;
  reviewerName: string;
  revieweeId: string;
  createdAt: string;
}

const JOURNEY_KEY = 'carelink-preview-journey-v1';
const MSG_KEY = 'carelink-preview-messages-v1';
const REVIEW_KEY = 'carelink-preview-reviews-v1';
const DEMO_SESSION_2 = 'preview-session-demo-2';

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
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    const out: Record<string, string> = {};
    body.forEach((value, key) => {
      if (typeof value === 'string') out[key] = value;
    });
    return out;
  }
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as Record<string, string>;
    } catch {
      return {};
    }
  }
  return body as Record<string, string>;
}

function loadJourney(): Record<string, JourneyState> {
  const seed: Record<string, JourneyState> = {
    [previewRequests[0].id]: { status: 'Open', helperId: null, sessionId: null },
    [previewRequests[1].id]: { status: 'InProgress', helperId: previewHelper.id, sessionId: DEMO_SESSION_2 },
  };
  try {
    const raw = localStorage.getItem(JOURNEY_KEY);
    if (!raw) return seed;
    const parsed = JSON.parse(raw) as Record<string, JourneyState>;
    return { ...seed, ...parsed };
  } catch {
    return seed;
  }
}

function saveJourney(state: Record<string, JourneyState>) {
  try {
    localStorage.setItem(JOURNEY_KEY, JSON.stringify(state));
  } catch {
    /* demo storage may be unavailable */
  }
}

function liveRequest(id: string): SupportRequest {
  const base = previewRequests.find((r) => r.id === id) ?? previewRequests[0];
  const state = loadJourney()[base.id];
  if (!state) return base;
  const helper =
    state.helperId === previewHelper.id
      ? {
          id: previewHelper.id,
          fullName: previewHelper.fullName,
          role: previewHelper.role,
          avatarUrl: null,
          averageRating: 4.8,
          reviewCount: 12,
        }
      : null;
  return { ...base, status: state.status, helper, sessionId: state.sessionId };
}

function liveRequests(): SupportRequest[] {
  return previewRequests.map((r) => liveRequest(r.id));
}

function buildHistory(request: SupportRequest) {
  const items: Array<{
    id: string;
    fromStatus: Status | null;
    toStatus: Status;
    changedByName: string;
    changedAt: string;
    note: string;
  }> = [
    {
      id: `${request.id}-open`,
      fromStatus: null,
      toStatus: 'Open' as Status,
      changedByName: request.requester.fullName,
      changedAt: request.createdAt,
      note: 'Yêu cầu demo được tạo.',
    },
  ];
  if (request.status !== 'Open') {
    items.push({
      id: `${request.id}-accepted`,
      fromStatus: 'Open' as Status,
      toStatus: 'Accepted' as Status,
      changedByName: request.helper?.fullName ?? previewHelper.fullName,
      changedAt: request.updatedAt,
      note: 'Người hỗ trợ demo đã nhận yêu cầu.',
    });
  }
  if (request.status === 'InProgress' || request.status === 'Completed') {
    items.push({
      id: `${request.id}-progress`,
      fromStatus: 'Accepted' as Status,
      toStatus: 'InProgress' as Status,
      changedByName: request.helper?.fullName ?? previewHelper.fullName,
      changedAt: request.updatedAt,
      note: 'Bắt đầu hỗ trợ demo.',
    });
  }
  if (request.status === 'Completed') {
    items.push({
      id: `${request.id}-completed`,
      fromStatus: 'InProgress' as Status,
      toStatus: 'Completed' as Status,
      changedByName: request.requester.fullName,
      changedAt: request.updatedAt,
      note: 'Đã xác nhận hoàn thành demo.',
    });
  }
  return items;
}

function loadMessages(): Record<string, PreviewMessage[]> {
  try {
    return JSON.parse(localStorage.getItem(MSG_KEY) ?? '{}') as Record<string, PreviewMessage[]>;
  } catch {
    return {};
  }
}

function saveMessages(all: Record<string, PreviewMessage[]>) {
  try {
    localStorage.setItem(MSG_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

function sessionMessages(sessionId: string): PreviewMessage[] {
  const all = loadMessages();
  if (!all[sessionId]) {
    all[sessionId] = [
      {
        id: 1,
        sessionId,
        senderId: previewHelper.id,
        senderName: previewHelper.fullName,
        senderAvatarUrl: null,
        content: 'Chào bạn, mình đã nhận hỗ trợ demo. Hai bên thống nhất thời gian giúp mình nhé!',
        imageUrl: null,
        sentAt: new Date().toISOString(),
        readAt: null,
      },
    ];
    saveMessages(all);
  }
  return all[sessionId];
}

function findSessionRequest(sessionId: string): SupportRequest | null {
  return liveRequests().find((r) => r.sessionId === sessionId) ?? null;
}

export const previewAdapter: AxiosAdapter = async (config) => {
  const rawUrl = config.url ?? '';
  const [path, queryString] = rawUrl.split('?');
  const query = new URLSearchParams(queryString ?? '');
  const method = (config.method ?? 'get').toLowerCase();

  if (method === 'get' && path === '/public/categories') {
    const response = await fetch(`${import.meta.env.BASE_URL}catalog.json`);
    if (!response.ok) throw new Error(vi.common.network);
    return ok(config, await response.json());
  }
  if (method === 'get' && path === '/public/stats') {
    return ok(config, { completedRequests: 128, helpers: 45, openRequests: 12, categories: 45 });
  }
  if (method === 'get' && path === '/categories') {
    const response = await fetch(`${import.meta.env.BASE_URL}catalog.json`);
    if (!response.ok) throw new Error(vi.common.network);
    return ok(config, await response.json());
  }

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

  const me = userForToken(config.headers?.Authorization);
  if (path.startsWith('/auth/me')) {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    return ok(config, me);
  }

  // ---- Journey actions (demo, persisted in localStorage) ----
  const actionMatch = path.match(/^\/requests\/(.+)\/(accept|start|complete)$/);
  if (actionMatch && method === 'post') {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    const [, id, action] = actionMatch;
    const journey = loadJourney();
    const state = journey[id] ?? { status: liveRequest(id).status, helperId: null, sessionId: null };
    const now = new Date().toISOString();

    if (action === 'accept') {
      if (me.role !== 'Helper') return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
      if (state.status !== 'Open')
        return fail(config, 409, 'REQUEST_NOT_OPEN', vi.errors.REQUEST_NOT_OPEN);
      const sessionId = state.sessionId ?? `preview-session-${id.slice(0, 8)}`;
      journey[id] = { status: 'Accepted', helperId: me.id, sessionId };
      saveJourney(journey);
      return ok(config, { sessionId, requestId: id });
    }
    if (action === 'start') {
      if (me.role !== 'Helper') return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
      if (state.status !== 'Accepted')
        return fail(config, 409, 'INVALID_TRANSITION', vi.errors.INVALID_TRANSITION);
      journey[id] = { ...state, status: 'InProgress' };
      saveJourney(journey);
      void now;
      return ok(config, liveRequest(id));
    }
    if (state.status === 'Completed') return ok(config, liveRequest(id));
    if (me.role !== 'Requester') return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
    if (state.status !== 'InProgress')
      return fail(config, 409, 'INVALID_TRANSITION', vi.errors.INVALID_TRANSITION);
    journey[id] = { ...state, status: 'Completed' };
    saveJourney(journey);
    return ok(config, liveRequest(id));
  }

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
      previewPage(liveRequests(), Number(query.get('page') ?? 1), Number(query.get('pageSize') ?? 12)),
    );
  }

  if (/^\/admin\/requests\/.+\/(hide|unhide|status)$/.test(path) && method === 'post') {
    if (me?.role !== 'Admin') return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
    return ok(config, liveRequests()[0]);
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
    return ok(config, previewReports.find((r) => r.id === reportMatch[1]) ?? previewReports[0]);
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

  // ---- Authenticated request browsing (demo) ----
  if ((path === '/requests' || path === '/requests/mine') && method === 'get') {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    if (me.role === 'Admin') return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
    let items = liveRequests();
    const status = query.get('status') ?? '';
    const keyword = (query.get('keyword') ?? '').toLowerCase();
    if (status) items = items.filter((r) => r.status === status);
    if (keyword)
      items = items.filter((r) => `${r.title} ${r.description}`.toLowerCase().includes(keyword));
    if (path === '/requests/mine') {
      items = items.filter((r) =>
        me.role === 'Requester' ? r.requester.id === me.id : r.helper?.id === me.id,
      );
    }
    return ok(config, previewPage(items, Number(query.get('page') ?? 1), Number(query.get('pageSize') ?? 12)));
  }

  const historyMatch = path.match(/^\/requests\/(.+)\/history$/);
  if (historyMatch && method === 'get') {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    return ok(config, buildHistory(liveRequest(historyMatch[1])));
  }

  const reqMatch = path.match(/^\/requests\/([^/]+)$/);
  if (reqMatch && method === 'get' && !path.endsWith('/summary')) {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    return ok(config, liveRequest(reqMatch[1]));
  }

  if (path === '/requests/summary' && method === 'get') {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    return ok(config, { total: 2, open: 1, accepted: 0, inProgress: 1, completed: 1, unreadMessages: 0 });
  }

  // ---- Demo sessions + chat ----
  if (path === '/sessions' && method === 'get') {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    if (me.role === 'Admin') return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
    const mine = liveRequests().filter(
      (r) => r.sessionId && (r.requester.id === me.id || r.helper?.id === me.id),
    );
    return ok(
      config,
      previewPage(
        mine.map((r) => ({
          id: r.sessionId as string,
          requestId: r.id,
          requestTitle: r.title,
          requestStatus: r.status,
          status: r.status === 'Completed' ? 'Closed' : 'Active',
          counterpart: r.requester.id === me.id ? (r.helper ?? r.requester) : r.requester,
          lastMessage: 'Bản demo: tin nhắn mẫu.',
          lastMessageAt: r.updatedAt,
          unreadCount: 0,
          createdAt: r.createdAt,
        })),
        Number(query.get('page') ?? 1),
        Number(query.get('pageSize') ?? 12),
      ),
    );
  }

  if (path === '/sessions/unread' && method === 'get') {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    return ok(config, { count: 0 });
  }

  const sessionMatch = path.match(/^\/sessions\/([^/]+)$/);
  if (sessionMatch && method === 'get') {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    if (me.role === 'Admin') return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
    const found = findSessionRequest(sessionMatch[1]);
    if (!found) return fail(config, 404, 'NOT_FOUND', vi.errors.NOT_FOUND);
    const isMember = found.requester.id === me.id || found.helper?.id === me.id;
    if (!isMember) return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
    const counterpart = found.requester.id === me.id ? (found.helper ?? found.requester) : found.requester;
    const active = found.status !== 'Completed';
    return ok(config, {
      id: sessionMatch[1],
      status: active ? 'Active' : 'Closed',
      request: found,
      counterpart,
      counterpartPhone: active ? '0901234567' : null,
      counterpartAddress: active ? 'Demo: địa chỉ liên hệ khi phiên đang hoạt động.' : null,
      createdAt: found.createdAt,
    });
  }

  const msgListMatch = path.match(/^\/sessions\/([^/]+)\/messages$/);
  if (msgListMatch && method === 'get') {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    const found = findSessionRequest(msgListMatch[1]);
    if (!found) return fail(config, 404, 'NOT_FOUND', vi.errors.NOT_FOUND);
    const items = sessionMessages(msgListMatch[1]);
    const before = query.get('before');
    const limit = Math.min(50, Math.max(1, Number(query.get('limit') ?? 30)));
    const filtered = before ? items.filter((m) => m.id < Number(before)) : items;
    const sliced = filtered.slice(-limit);
    return ok(config, { items: sliced, nextCursor: null, hasMore: false });
  }

  if (msgListMatch && method === 'post') {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    const found = findSessionRequest(msgListMatch[1]);
    if (!found) return fail(config, 404, 'NOT_FOUND', vi.errors.NOT_FOUND);
    if (found.status === 'Completed')
      return fail(config, 409, 'SESSION_CLOSED', vi.errors.SESSION_CLOSED);
    const body = parseBody(config.data);
    const content = String(body.content ?? '').trim().slice(0, 2000);
    if (!content) return fail(config, 400, 'VALIDATION_ERROR', vi.errors.VALIDATION_ERROR);
    const all = loadMessages();
    const list = sessionMessages(msgListMatch[1]);
    const message: PreviewMessage = {
      id: Date.now(),
      sessionId: msgListMatch[1],
      senderId: me.id,
      senderName: me.fullName,
      senderAvatarUrl: null,
      content,
      imageUrl: null,
      sentAt: new Date().toISOString(),
      readAt: null,
    };
    all[msgListMatch[1]] = [...list, message];
    saveMessages(all);
    return ok(config, message);
  }

  const readMatch = path.match(/^\/sessions\/([^/]+)\/messages\/read$/);
  if (readMatch && method === 'post') {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    return ok(config, null, 204);
  }

  const reviewMatch = path.match(/^\/sessions\/([^/]+)\/review$/);
  if (reviewMatch && method === 'get') {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    try {
      const raw = localStorage.getItem(REVIEW_KEY);
      const all = (raw ? JSON.parse(raw) : {}) as Record<string, PreviewReview>;
      return ok(config, all[reviewMatch[1]] ?? null);
    } catch {
      return ok(config, null);
    }
  }

  if (reviewMatch && method === 'post') {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    if (me.role !== 'Requester') return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
    const body = parseBody(config.data);
    const rating = Number(body.rating ?? 5);
    const review: PreviewReview = {
      id: `preview-review-${Date.now()}`,
      rating: Math.min(5, Math.max(1, rating)),
      comment: String(body.comment ?? '').slice(0, 500) || null,
      reviewerName: me.fullName,
      revieweeId: previewHelper.id,
      createdAt: new Date().toISOString(),
    };
    try {
      const raw = localStorage.getItem(REVIEW_KEY);
      const all = (raw ? JSON.parse(raw) : {}) as Record<string, PreviewReview>;
      all[reviewMatch[1]] = review;
      localStorage.setItem(REVIEW_KEY, JSON.stringify(all));
    } catch {
      /* ignore */
    }
    return ok(config, review, 201);
  }

  return fail(config, 503, 'BACKEND_UNAVAILABLE', vi.catalog.backendPending);
};
