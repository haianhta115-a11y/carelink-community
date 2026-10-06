import { AxiosError, AxiosHeaders, type AxiosAdapter } from 'axios';
import { vi } from '../locales/vi';
import {
  previewAdmin,
  previewAudits,
  previewHelper,
  previewPage,
  previewReports,
  previewRequester,
  previewRequests,
  previewUsers,
} from './preview-data';
import type { Role, SupportRequest, User } from './types';
import type { AdminUser } from '../features/admin/types';

export const publicPreview = import.meta.env.VITE_PUBLIC_PREVIEW === 'true' && !import.meta.env.VITE_API_URL;

type Status = SupportRequest['status'];
type Urgency = SupportRequest['urgency'];
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
interface DemoUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  status: 'Active' | 'Locked';
  phone: string | null;
  address: string | null;
  createdAt: string;
  passwordHash: string;
  lockedReason: string | null;
  avatarDataUrl: string | null;
}
interface DemoRequest {
  id: string;
  requesterId: string;
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  groupKey: string;
  title: string;
  description: string;
  location: string;
  urgency: Urgency;
  status: Status;
  isHidden: boolean;
  hiddenReason: string | null;
  createdAt: string;
  updatedAt: string;
  helperId: string | null;
  sessionId: string | null;
}
interface DemoReport {
  id: string;
  reporterId: string;
  targetType: 'Request' | 'User';
  targetRequestId: string | null;
  targetUserId: string | null;
  reason: string;
  description: string;
  status: 'Pending' | 'Reviewing' | 'Resolved' | 'Rejected';
  adminNote: string | null;
  handledById: string | null;
  handledAt: string | null;
  createdAt: string;
}
interface DemoAudit {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  createdAt: string;
}
interface DemoDB {
  users: DemoUser[];
  requests: DemoRequest[];
  messages: Record<string, PreviewMessage[]>;
  reviews: Record<string, PreviewReview>;
  reports: DemoReport[];
  audits: DemoAudit[];
  tokens: Record<string, string>;
  seq: number;
}
interface CatalogItem {
  id: number;
  name: string;
  icon: string;
  slug: string;
  groupKey: string;
  description: string;
}

const DB_KEY = 'carelink-preview-db-v4';
const DEMO_SESSION_2 = 'preview-session-demo-2';
let catalogCache: CatalogItem[] | null = null;

function ok(config: Parameters<AxiosAdapter>[0], data: unknown, status = 200) {
  return { config, data, status, statusText: status === 200 ? 'OK' : 'NoContent', headers: new AxiosHeaders() };
}

function fail(
  config: Parameters<AxiosAdapter>[0],
  status: number,
  code: string,
  message: string,
  errors?: Record<string, string[]>,
): never {
  throw new AxiosError(message, String(status), config, undefined, {
    config,
    data: { code, title: message, errors },
    status,
    statusText: message,
    headers: new AxiosHeaders(),
  });
}

// Demo-only password obfuscation (NOT real security). Production uses BCrypt server-side.
function demoHash(password: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  const s = `carelink-demo:${password}`;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `d1:${(h2 >>> 0).toString(16)}${(h1 >>> 0).toString(16)}`;
}

function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  } catch {
    /* fallback below */
  }
  return `00000000-0000-4000-8000-${String(Date.now()).slice(-12).padStart(12, '0')}`;
}

function seedDb(): DemoDB {
  const now = new Date().toISOString();
  const users: DemoUser[] = [
    { id: previewAdmin.id, email: previewAdmin.email, fullName: previewAdmin.fullName, role: 'Admin', status: 'Active', phone: null, address: null, createdAt: now, passwordHash: demoHash('Admin@12345'), lockedReason: null, avatarDataUrl: null },
    { id: previewRequester.id, email: previewRequester.email, fullName: previewRequester.fullName, role: 'Requester', status: 'Active', phone: previewRequester.phone, address: previewRequester.address, createdAt: now, passwordHash: demoHash('Demo@12345'), lockedReason: null, avatarDataUrl: null },
    { id: previewHelper.id, email: previewHelper.email, fullName: previewHelper.fullName, role: 'Helper', status: 'Active', phone: previewHelper.phone, address: previewHelper.address, createdAt: now, passwordHash: demoHash('Demo@12345'), lockedReason: null, avatarDataUrl: null },
    { id: previewUsers[3].id, email: previewUsers[3].email, fullName: previewUsers[3].fullName, role: 'Helper', status: 'Locked', phone: null, address: null, createdAt: now, passwordHash: demoHash('Demo@12345'), lockedReason: 'Vi phạm quy định cộng đồng.', avatarDataUrl: null },
  ];
  const requests: DemoRequest[] = previewRequests.map((r, i) =>
    i === 0
      ? { id: r.id, requesterId: previewRequester.id, categoryId: r.categoryId, categoryName: r.categoryName, categoryIcon: r.categoryIcon, groupKey: 'health', title: r.title, description: r.description, location: r.location, urgency: r.urgency, status: 'Open' as Status, isHidden: false, hiddenReason: null, createdAt: r.createdAt, updatedAt: r.updatedAt, helperId: null, sessionId: null }
      : { id: r.id, requesterId: previewRequester.id, categoryId: r.categoryId, categoryName: r.categoryName, categoryIcon: r.categoryIcon, groupKey: 'education', title: r.title, description: r.description, location: r.location, urgency: r.urgency, status: 'InProgress' as Status, isHidden: false, hiddenReason: null, createdAt: r.createdAt, updatedAt: r.updatedAt, helperId: previewHelper.id, sessionId: DEMO_SESSION_2 },
  );
  const reports: DemoReport[] = previewReports.map((r) => ({
    id: r.id, reporterId: r.reporterId, targetType: r.targetType, targetRequestId: r.targetRequestId, targetUserId: r.targetUserId, reason: r.reason, description: r.description, status: r.status, adminNote: r.adminNote, handledById: r.status === 'Resolved' ? previewAdmin.id : null, handledAt: r.handledAt, createdAt: r.createdAt,
  }));
  const audits: DemoAudit[] = previewAudits.map((a) => ({
    id: a.id, actorId: previewAdmin.id, actorName: a.actorName, action: a.action, entityType: a.entityType, entityId: a.entityId, oldValue: a.oldValue, newValue: a.newValue, reason: a.reason, createdAt: a.createdAt,
  }));
  return {
    users, requests,
    messages: {
      [DEMO_SESSION_2]: [
        { id: 1, sessionId: DEMO_SESSION_2, senderId: previewHelper.id, senderName: previewHelper.fullName, senderAvatarUrl: null, content: 'Chào bạn, mình đã nhận hỗ trợ. Hai bên thống nhất thời gian giúp mình nhé!', imageUrl: null, sentAt: now, readAt: null },
      ],
    },
    reviews: {},
    reports,
    audits,
    tokens: { 'preview-admin-token': previewAdmin.id, 'preview-requester-token': previewRequester.id, 'preview-helper-token': previewHelper.id },
    seq: 100,
  };
}

function loadDb(): DemoDB {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoDB;
      if (parsed.users && parsed.requests && parsed.tokens) return parsed;
    }
  } catch {
    /* fall through to seed */
  }
  const db = seedDb();
  saveDb(db);
  return db;
}

function saveDb(db: DemoDB) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    /* quota or privacy mode: demo continues in memory for this tab */
  }
}

async function getCatalog(): Promise<CatalogItem[]> {
  if (catalogCache) return catalogCache;
  const response = await fetch(`${import.meta.env.BASE_URL}catalog.json`);
  if (!response.ok) throw new Error(vi.common.network);
  catalogCache = (await response.json()) as CatalogItem[];
  return catalogCache;
}

function val(body: Record<string, unknown>, ...names: string[]): string {
  for (const name of names) {
    const v = body[name];
    if (typeof v === 'string') return v;
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  }
  return '';
}

function parseBody(body: unknown): Record<string, unknown> {
  if (!body) return {};
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    const out: Record<string, unknown> = {};
    body.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return body as Record<string, unknown>;
}

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254;
function passwordOk(p: string): boolean {
  if (p.length < 8) return false;
  try {
    if (new TextEncoder().encode(p).length > 72) return false;
  } catch {
    if (p.length > 72) return false;
  }
  return /\p{L}/u.test(p) && /\p{N}/u.test(p);
}
const phoneOk = (p: string) => /^(0|\+84)\d{9,10}$/.test(p);

function toUserDto(u: DemoUser) {
  return { id: u.id, email: u.email, fullName: u.fullName, role: u.role, status: u.status, avatarUrl: u.avatarDataUrl ? `/api/users/${u.id}/avatar` : null, phone: u.phone, address: u.address, createdAt: u.createdAt };
}

function ratingStats(db: DemoDB, userId: string): { average: number | null; count: number } {
  const list = Object.values(db.reviews).filter((r) => r.revieweeId === userId);
  if (!list.length) return { average: null, count: 0 };
  return { average: list.reduce((s, r) => s + r.rating, 0) / list.length, count: list.length };
}

function toPublicUser(db: DemoDB, id: string) {
  const u = db.users.find((x) => x.id === id);
  const stats = ratingStats(db, id);
  return {
    id,
    fullName: u?.fullName ?? 'Người dùng CareLink',
    role: (u?.role ?? 'Requester') as User['role'],
    avatarUrl: u?.avatarDataUrl ? `/api/users/${id}/avatar` : null,
    averageRating: stats.average,
    reviewCount: stats.count,
  };
}

function toRequestDto(db: DemoDB, r: DemoRequest) {
  return {
    id: r.id, title: r.title, description: r.description, categoryId: r.categoryId, categoryName: r.categoryName, categoryIcon: r.categoryIcon, location: r.location, urgency: r.urgency, status: r.status,
    requester: toPublicUser(db, r.requesterId), createdAt: r.createdAt, updatedAt: r.updatedAt, sessionId: r.sessionId,
    helper: r.helperId ? toPublicUser(db, r.helperId) : null, isHidden: r.isHidden, hiddenReason: r.hiddenReason,
  };
}

function toReportDto(db: DemoDB, r: DemoReport) {
  const reporter = db.users.find((u) => u.id === r.reporterId);
  const handled = r.handledById ? db.users.find((u) => u.id === r.handledById) : null;
  const targetName =
    r.targetType === 'Request'
      ? (db.requests.find((x) => x.id === r.targetRequestId)?.title ?? 'Yêu cầu hỗ trợ')
      : (db.users.find((u) => u.id === r.targetUserId)?.fullName ?? 'Người dùng');
  return { id: r.id, reporterId: r.reporterId, reporterName: reporter?.fullName ?? 'Người dùng', targetType: r.targetType, targetRequestId: r.targetRequestId, targetUserId: r.targetUserId, targetName, reason: r.reason, description: r.description, status: r.status, adminNote: r.adminNote, handledByName: handled?.fullName ?? null, handledAt: r.handledAt, createdAt: r.createdAt };
}

function addAudit(db: DemoDB, actor: DemoUser, action: string, entityType: string, entityId: string, oldValue: string | null, newValue: string | null, reason: string | null) {
  db.audits.unshift({ id: newId(), actorId: actor.id, actorName: actor.fullName, action, entityType, entityId, oldValue, newValue, reason, createdAt: new Date().toISOString() });
}

function buildHistoryDb(db: DemoDB, r: DemoRequest) {
  const requester = db.users.find((u) => u.id === r.requesterId);
  const helper = r.helperId ? db.users.find((u) => u.id === r.helperId) : null;
  const items = [{ id: `${r.id}-open`, fromStatus: null as Status | null, toStatus: 'Open' as Status, changedByName: requester?.fullName ?? 'Người dùng', changedAt: r.createdAt, note: 'Yêu cầu được tạo.' }];
  if (r.status !== 'Open')
    items.push({ id: `${r.id}-accepted`, fromStatus: 'Open' as Status, toStatus: 'Accepted' as Status, changedByName: helper?.fullName ?? 'Người hỗ trợ', changedAt: r.updatedAt, note: 'Người hỗ trợ đã nhận yêu cầu.' });
  if (r.status === 'InProgress' || r.status === 'Completed')
    items.push({ id: `${r.id}-progress`, fromStatus: 'Accepted' as Status, toStatus: 'InProgress' as Status, changedByName: helper?.fullName ?? 'Người hỗ trợ', changedAt: r.updatedAt, note: 'Bắt đầu hỗ trợ.' });
  if (r.status === 'Completed')
    items.push({ id: `${r.id}-completed`, fromStatus: 'InProgress' as Status, toStatus: 'Completed' as Status, changedByName: requester?.fullName ?? 'Người dùng', changedAt: r.updatedAt, note: 'Đã xác nhận hoàn thành.' });
  return items;
}

async function imageFileError(file: File, maxBytes: number): Promise<boolean> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return true;
  if (file.size <= 0 || file.size > maxBytes) return true;
  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    const isJpeg = buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    const isPng = buf.length >= 8 && buf[0] === 137 && buf[1] === 80 && buf[2] === 78 && buf[3] === 71 && buf[4] === 13 && buf[5] === 10 && buf[6] === 26 && buf[7] === 10;
    const isWebp = buf.length >= 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50;
    return !(isJpeg || isPng || isWebp);
  } catch {
    return true;
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const URGENCY_RANK: Record<string, number> = { Critical: 3, High: 2, Normal: 1, Low: 0 };

export const previewAdapter: AxiosAdapter = async (config) => {
  const rawUrl = config.url ?? '';
  const [path, queryString] = rawUrl.split('?');
  const q = new URLSearchParams(queryString ?? '');
  const params = (config.params ?? {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === '') continue;
    q.set(k, String(v));
  }
  const method = (config.method ?? 'get').toLowerCase();
  const body = parseBody(config.data);

  if (method === 'get' && path === '/public/categories') return ok(config, await getCatalog());
  if (method === 'get' && path === '/public/stats') {
    const db = loadDb();
    return ok(config, {
      completedRequests: 128 + db.requests.filter((r) => r.status === 'Completed').length,
      helpers: db.users.filter((u) => u.role === 'Helper' && u.status === 'Active').length + 43,
      openRequests: db.requests.filter((r) => r.status === 'Open' && !r.isHidden).length + 10,
      categories: 45,
    });
  }
  if (method === 'get' && path === '/categories') return ok(config, await getCatalog());

  // ---- Auth ----
  if (method === 'post' && path === '/auth/register') {
    const db = loadDb();
    const fullName = val(body, 'fullName', 'FullName').trim();
    const email = val(body, 'email', 'Email').trim().toLowerCase();
    const password = val(body, 'password', 'Password');
    const confirm = val(body, 'confirmPassword', 'ConfirmPassword');
    const role = val(body, 'role', 'Role') as Role;
    const phone = val(body, 'phone', 'Phone').trim();
    const errors: Record<string, string[]> = {};
    if (fullName.length < 2 || fullName.length > 80) errors.fullName = ['Họ tên cần từ 2 đến 80 ký tự.'];
    if (!emailOk(email)) errors.email = ['Vui lòng nhập email hợp lệ.'];
    if (!passwordOk(password)) errors.password = ['Mật khẩu cần ít nhất 8 ký tự, có chữ và số, tối đa 72 byte.'];
    if (confirm !== password) errors.confirmPassword = ['Mật khẩu xác nhận chưa khớp.'];
    if (role !== 'Requester' && role !== 'Helper') errors.role = ['Chỉ có thể đăng ký vai trò Người cần hỗ trợ hoặc Người hỗ trợ.'];
    if (phone && !phoneOk(phone)) errors.phone = ['Số điện thoại cần bắt đầu bằng 0 hoặc +84 và có 10–11 số.'];
    if (Object.keys(errors).length) return fail(config, 400, 'VALIDATION_ERROR', vi.errors.VALIDATION_ERROR, errors);
    if (db.users.some((u) => u.email === email)) return fail(config, 409, 'EMAIL_TAKEN', vi.errors.EMAIL_TAKEN);
    const now = new Date().toISOString();
    const user: DemoUser = { id: newId(), email, fullName, role, status: 'Active', phone: phone || null, address: null, createdAt: now, passwordHash: demoHash(password), lockedReason: null, avatarDataUrl: null };
    db.users.push(user);
    saveDb(db);
    return ok(config, toUserDto(user), 201);
  }

  if (method === 'post' && path === '/auth/login') {
    const db = loadDb();
    const email = val(body, 'email', 'Email').trim().toLowerCase();
    const password = val(body, 'password', 'Password');
    const user = db.users.find((u) => u.email === email);
    if (!user || user.passwordHash !== demoHash(password))
      return fail(config, 401, 'INVALID_CREDENTIALS', vi.errors.INVALID_CREDENTIALS);
    if (user.status === 'Locked')
      return fail(config, 403, 'ACCOUNT_LOCKED', `${vi.errors.ACCOUNT_LOCKED} ${user.lockedReason ?? ''}`.trim());
    const token = `preview-${user.id}`;
    db.tokens[token] = user.id;
    saveDb(db);
    return ok(config, { token, expiresAt: new Date(Date.now() + 120 * 60 * 1000).toISOString(), user: toUserDto(user) });
  }

  const db = loadDb();
  const authHeader = config.headers?.Authorization;
  const token = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : '';
  const me = db.users.find((u) => db.tokens[token] === u.id) ?? null;

  const needAuth = !path.startsWith('/public/');
  if (needAuth && !me && (path.startsWith('/auth/me') || path.startsWith('/admin/') || path.startsWith('/requests') || path.startsWith('/sessions') || path.startsWith('/reports') || path.startsWith('/profile') || path.startsWith('/users/') || path.startsWith('/categories'))) {
    if (path.startsWith('/auth/me') || path === '/profile' || path.startsWith('/requests') || path.startsWith('/sessions') || path === '/reports' || path.startsWith('/users/'))
      return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
  }

  if (path === '/auth/me' && method === 'get') {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    return ok(config, toUserDto(me));
  }

  // ---- Profile ----
  if (path === '/profile' && method === 'get') {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    return ok(config, toUserDto(me));
  }
  if (path === '/profile' && method === 'put') {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    const fullName = val(body, 'fullName', 'FullName').trim();
    const phone = val(body, 'phone', 'Phone').trim();
    const address = val(body, 'address', 'Address').trim();
    const errors: Record<string, string[]> = {};
    if (fullName.length < 2 || fullName.length > 80) errors.fullName = ['Họ tên cần từ 2 đến 80 ký tự.'];
    if (phone && !phoneOk(phone)) errors.phone = ['Số điện thoại cần bắt đầu bằng 0 hoặc +84 và có 10–11 số.'];
    if (address.length > 200) errors.address = ['Địa chỉ tối đa 200 ký tự.'];
    if (Object.keys(errors).length) return fail(config, 400, 'VALIDATION_ERROR', vi.errors.VALIDATION_ERROR, errors);
    me.fullName = fullName;
    me.phone = phone || null;
    me.address = address || null;
    saveDb(db);
    return ok(config, toUserDto(me));
  }
  if (path === '/profile/password' && method === 'put') {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    const current = val(body, 'currentPassword', 'CurrentPassword');
    const next = val(body, 'newPassword', 'NewPassword');
    const confirm = val(body, 'confirmPassword', 'ConfirmPassword');
    if (me.passwordHash !== demoHash(current))
      return fail(config, 401, 'INVALID_CREDENTIALS', 'Mật khẩu hiện tại không đúng.');
    if (!passwordOk(next) || confirm !== next)
      return fail(config, 400, 'VALIDATION_ERROR', vi.errors.VALIDATION_ERROR);
    me.passwordHash = demoHash(next);
    for (const t of Object.keys(db.tokens)) if (db.tokens[t] === me.id) delete db.tokens[t];
    const fresh = `preview-${me.id}-${Date.now()}`;
    db.tokens[fresh] = me.id;
    saveDb(db);
    return ok(config, { token: fresh, expiresAt: new Date(Date.now() + 120 * 60 * 1000).toISOString(), user: toUserDto(me) });
  }
  if (path === '/profile/avatar' && method === 'put') {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    const file = config.data instanceof FormData ? (config.data.get('image') as File | null) : null;
    if (!file || !(file instanceof File) || (await imageFileError(file, 2 * 1024 * 1024)))
      return fail(config, 400, 'FILE_INVALID', vi.errors.FILE_INVALID);
    try {
      me.avatarDataUrl = await fileToDataUrl(file);
    } catch {
      return fail(config, 400, 'FILE_INVALID', vi.errors.FILE_INVALID);
    }
    saveDb(db);
    return ok(config, toUserDto(me));
  }

  const publicMatch = path.match(/^\/users\/(.+)\/public$/);
  if (publicMatch && method === 'get') {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    const target = db.users.find((u) => u.id === publicMatch[1]);
    if (!target) return fail(config, 404, 'NOT_FOUND', vi.errors.NOT_FOUND);
    return ok(config, toPublicUser(db, target.id));
  }
  const avatarMatch = path.match(/^\/users\/(.+)\/avatar$/);
  if (avatarMatch && method === 'get') {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    const target = db.users.find((u) => u.id === avatarMatch[1]);
    if (!target?.avatarDataUrl) return fail(config, 404, 'NOT_FOUND', vi.errors.NOT_FOUND);
    return ok(config, await (await fetch(target.avatarDataUrl)).blob());
  }

  // ---- Requests ----
  if (path === '/requests' && method === 'post') {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    if (me.role !== 'Requester') return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
    const title = val(body, 'title', 'Title').trim();
    const description = val(body, 'description', 'Description').trim();
    const location = val(body, 'location', 'Location').trim();
    const categoryId = Number(val(body, 'categoryId', 'CategoryId') || NaN);
    const urgency = val(body, 'urgency', 'Urgency') as Urgency;
    const errors: Record<string, string[]> = {};
    if (title.length < 5 || title.length > 120) errors.title = ['Tiêu đề cần từ 5 đến 120 ký tự.'];
    if (description.length < 20 || description.length > 2000) errors.description = ['Mô tả cần từ 20 đến 2.000 ký tự.'];
    if (location.length < 3 || location.length > 200) errors.location = ['Địa điểm cần từ 3 đến 200 ký tự.'];
    if (!Number.isInteger(categoryId) || categoryId < 1) errors.categoryId = ['Vui lòng chọn danh mục.'];
    if (!['Low', 'Normal', 'High', 'Critical'].includes(urgency)) errors.urgency = ['Mức độ chưa hợp lệ.'];
    if (Object.keys(errors).length) return fail(config, 400, 'VALIDATION_ERROR', vi.errors.VALIDATION_ERROR, errors);
    const catalog = await getCatalog();
    const cat = catalog.find((c) => c.id === categoryId);
    if (!cat) return fail(config, 400, 'VALIDATION_ERROR', vi.errors.VALIDATION_ERROR);
    const now = new Date().toISOString();
    const req: DemoRequest = { id: newId(), requesterId: me.id, categoryId, categoryName: cat.name, categoryIcon: cat.icon, groupKey: cat.groupKey, title, description, location, urgency, status: 'Open', isHidden: false, hiddenReason: null, createdAt: now, updatedAt: now, helperId: null, sessionId: null };
    db.requests.unshift(req);
    saveDb(db);
    return ok(config, toRequestDto(db, req), 201);
  }

  if ((path === '/requests' || path === '/requests/mine') && method === 'get') {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    if (me.role === 'Admin') return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
    let items = [...db.requests];
    items = items.filter((r) => !r.isHidden && (r.status === 'Open' || r.requesterId === me.id || r.helperId === me.id));
    if (path === '/requests/mine')
      items = items.filter((r) => (me.role === 'Requester' ? r.requesterId === me.id : r.helperId === me.id));
    const status = q.get('status') ?? '';
    const categoryId = q.get('categoryId') ?? '';
    const urgency = q.get('urgency') ?? '';
    const group = q.get('group') ?? '';
    const keyword = (q.get('keyword') ?? '').trim().toLowerCase();
    const location = (q.get('location') ?? '').trim().toLowerCase();
    if (status) items = items.filter((r) => r.status === status);
    if (categoryId) items = items.filter((r) => r.categoryId === Number(categoryId));
    if (urgency) items = items.filter((r) => r.urgency === urgency);
    if (group) items = items.filter((r) => r.groupKey === group);
    if (keyword) items = items.filter((r) => `${r.title} ${r.description}`.toLowerCase().includes(keyword));
    if (location) items = items.filter((r) => r.location.toLowerCase().includes(location));
    const sort = q.get('sort') ?? 'newest';
    items.sort((a, b) =>
      sort === 'urgency'
        ? URGENCY_RANK[b.urgency] - URGENCY_RANK[a.urgency] || b.createdAt.localeCompare(a.createdAt)
        : b.createdAt.localeCompare(a.createdAt),
    );
    return ok(config, previewPage(items.map((r) => toRequestDto(db, r)), Number(q.get('page') ?? 1), Number(q.get('pageSize') ?? 12)));
  }

  if (path === '/requests/summary' && method === 'get') {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    if (me.role === 'Admin') return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
    const mine = db.requests.filter((r) => !r.isHidden && (me.role === 'Requester' ? r.requesterId === me.id : r.helperId === me.id));
    const count = (s: Status) => mine.filter((r) => r.status === s).length;
    const unread = Object.values(db.messages).flat().filter((m) => {
      const req = db.requests.find((r) => r.sessionId === m.sessionId);
      return req && m.senderId !== me.id && !m.readAt && (req.requesterId === me.id || req.helperId === me.id);
    }).length;
    return ok(config, { total: mine.length, open: count('Open'), accepted: count('Accepted'), inProgress: count('InProgress'), completed: count('Completed'), unreadMessages: unread });
  }

  const actionMatch = path.match(/^\/requests\/(.+)\/(accept|start|complete)$/);
  if (actionMatch && method === 'post') {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    const [, id, action] = actionMatch;
    const req = db.requests.find((r) => r.id === id);
    if (!req || (req.isHidden && me.role !== 'Admin')) return fail(config, 404, 'NOT_FOUND', vi.errors.NOT_FOUND);
    const now = new Date().toISOString();
    if (action === 'accept') {
      if (me.role !== 'Helper') return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
      if (req.status !== 'Open' || req.isHidden) return fail(config, 409, 'REQUEST_NOT_OPEN', vi.errors.REQUEST_NOT_OPEN);
      req.status = 'Accepted';
      req.helperId = me.id;
      req.sessionId = req.sessionId ?? `preview-session-${req.id.slice(0, 8)}`;
      req.updatedAt = now;
      addAudit(db, me, 'REQUEST_STATUS_CHANGED', 'SupportRequest', req.id, 'Open', 'Accepted', 'Nhận hỗ trợ yêu cầu.');
      saveDb(db);
      return ok(config, { sessionId: req.sessionId, requestId: req.id });
    }
    if (action === 'start') {
      if (me.role !== 'Helper' || req.helperId !== me.id) return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
      if (req.status !== 'Accepted') return fail(config, 409, 'INVALID_TRANSITION', vi.errors.INVALID_TRANSITION);
      req.status = 'InProgress';
      req.updatedAt = now;
      addAudit(db, me, 'REQUEST_STATUS_CHANGED', 'SupportRequest', req.id, 'Accepted', 'InProgress', 'Bắt đầu hỗ trợ.');
      saveDb(db);
      return ok(config, toRequestDto(db, req));
    }
    if (req.status === 'Completed') {
      saveDb(db);
      return ok(config, toRequestDto(db, req));
    }
    if (me.role !== 'Requester' || req.requesterId !== me.id) return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
    if (req.status !== 'InProgress') return fail(config, 409, 'INVALID_TRANSITION', vi.errors.INVALID_TRANSITION);
    req.status = 'Completed';
    req.updatedAt = now;
    addAudit(db, me, 'REQUEST_STATUS_CHANGED', 'SupportRequest', req.id, 'InProgress', 'Completed', 'Xác nhận hoàn thành.');
    saveDb(db);
    return ok(config, toRequestDto(db, req));
  }

  const historyMatch = path.match(/^\/requests\/(.+)\/history$/);
  if (historyMatch && method === 'get') {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    const req = db.requests.find((r) => r.id === historyMatch[1]);
    if (!req) return fail(config, 404, 'NOT_FOUND', vi.errors.NOT_FOUND);
    if (me.role !== 'Admin' && req.requesterId !== me.id && req.helperId !== me.id)
      return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
    return ok(config, buildHistoryDb(db, req));
  }

  const reqMatch = path.match(/^\/requests\/([^/]+)$/);
  if (reqMatch && method === 'get') {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    const req = db.requests.find((r) => r.id === reqMatch[1]);
    if (!req) return fail(config, 404, 'NOT_FOUND', vi.errors.NOT_FOUND);
    if (me.role !== 'Admin') {
      if (req.isHidden) return fail(config, 404, 'NOT_FOUND', vi.errors.NOT_FOUND);
      if (req.requesterId !== me.id && req.status !== 'Open' && req.helperId !== me.id)
        return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
    }
    return ok(config, toRequestDto(db, req));
  }

  // ---- Sessions & chat ----
  const sessionOf = (sessionId: string) => db.requests.find((r) => r.sessionId === sessionId) ?? null;
  const memberOf = (req: DemoRequest, userId: string) => req.requesterId === userId || req.helperId === userId;

  if (path === '/sessions' && method === 'get') {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    if (me.role === 'Admin') return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
    const mine = db.requests.filter((r) => r.sessionId && !r.isHidden && memberOf(r, me.id));
    return ok(config, previewPage(mine.map((r) => {
      const counterpart = r.requesterId === me.id ? toPublicUser(db, r.helperId ?? r.requesterId) : toPublicUser(db, r.requesterId);
      const msgs = db.messages[r.sessionId as string] ?? [];
      const last = msgs[msgs.length - 1];
      return { id: r.sessionId as string, requestId: r.id, requestTitle: r.title, requestStatus: r.status, status: r.status === 'Completed' ? 'Closed' : 'Active', counterpart, lastMessage: last?.content ?? null, lastMessageAt: last?.sentAt ?? r.updatedAt, unreadCount: msgs.filter((m) => m.senderId !== me.id && !m.readAt).length, createdAt: r.createdAt };
    }), Number(q.get('page') ?? 1), Number(q.get('pageSize') ?? 12)));
  }

  if (path === '/sessions/unread' && method === 'get') {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    const count = Object.values(db.messages).flat().filter((m) => {
      const req = sessionOf(m.sessionId);
      return req && m.senderId !== me.id && !m.readAt && memberOf(req, me.id);
    }).length;
    return ok(config, { count });
  }

  const sessionMatch = path.match(/^\/sessions\/([^/]+)$/);
  if (sessionMatch && method === 'get') {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    if (me.role === 'Admin') return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
    const req = sessionOf(sessionMatch[1]);
    if (!req) return fail(config, 404, 'NOT_FOUND', vi.errors.NOT_FOUND);
    if (!memberOf(req, me.id)) return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
    if (req.isHidden) return fail(config, 404, 'NOT_FOUND', vi.errors.NOT_FOUND);
    const counterpartId = req.requesterId === me.id ? (req.helperId ?? req.requesterId) : req.requesterId;
    const contact = db.users.find((u) => u.id === counterpartId);
    const active = req.status !== 'Completed';
    return ok(config, {
      id: sessionMatch[1], status: active ? 'Active' : 'Closed', request: toRequestDto(db, req),
      counterpart: toPublicUser(db, counterpartId),
      counterpartPhone: active ? (contact?.phone ?? null) : null,
      counterpartAddress: active ? (contact?.address ?? null) : null,
      createdAt: req.createdAt,
    });
  }

  const msgListMatch = path.match(/^\/sessions\/([^/]+)\/messages$/);
  if (msgListMatch && method === 'get') {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    const req = sessionOf(msgListMatch[1]);
    if (!req || !memberOf(req, me.id)) return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
    const limit = Number(q.get('limit') ?? 30);
    const before = q.get('before');
    if (limit < 1 || limit > 50 || (before && Number(before) <= 0))
      return fail(config, 400, 'VALIDATION_ERROR', vi.errors.VALIDATION_ERROR);
    let items = db.messages[msgListMatch[1]] ?? [];
    if (before) items = items.filter((m) => m.id < Number(before));
    const sliced = items.slice(-limit);
    return ok(config, { items: sliced, nextCursor: null, hasMore: false });
  }

  if (msgListMatch && method === 'post') {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    const req = sessionOf(msgListMatch[1]);
    if (!req || !memberOf(req, me.id)) return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
    if (req.status === 'Completed') return fail(config, 409, 'SESSION_CLOSED', vi.errors.SESSION_CLOSED);
    const isForm = typeof FormData !== 'undefined' && config.data instanceof FormData;
    const content = val(body, 'content', 'Content').trim().slice(0, 2000);
    const hasImage = isForm && (config.data as FormData).get('image') instanceof File;
    if (!content && !hasImage) return fail(config, 400, 'VALIDATION_ERROR', vi.errors.VALIDATION_ERROR);
    if (content.length > 2000) return fail(config, 400, 'VALIDATION_ERROR', vi.errors.VALIDATION_ERROR);
    db.seq += 1;
    const message: PreviewMessage = { id: db.seq, sessionId: msgListMatch[1], senderId: me.id, senderName: me.fullName, senderAvatarUrl: me.avatarDataUrl ? `/api/users/${me.id}/avatar` : null, content: content || '(Đã gửi 1 ảnh)', imageUrl: null, sentAt: new Date().toISOString(), readAt: null };
    (db.messages[msgListMatch[1]] ??= []).push(message);
    saveDb(db);
    return ok(config, message);
  }

  const readMatch = path.match(/^\/sessions\/([^/]+)\/messages\/read$/);
  if (readMatch && method === 'post') {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    const req = sessionOf(readMatch[1]);
    if (!req || !memberOf(req, me.id)) return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
    const now = new Date().toISOString();
    for (const m of db.messages[readMatch[1]] ?? []) if (m.senderId !== me.id && !m.readAt) m.readAt = now;
    saveDb(db);
    return ok(config, null, 204);
  }

  const reviewMatch = path.match(/^\/sessions\/([^/]+)\/review$/);
  if (reviewMatch && method === 'get') {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    const req = sessionOf(reviewMatch[1]);
    if (!req || !memberOf(req, me.id)) return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
    return ok(config, db.reviews[reviewMatch[1]] ?? null);
  }
  if (reviewMatch && method === 'post') {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    const req = sessionOf(reviewMatch[1]);
    if (!req || req.requesterId !== me.id || me.role !== 'Requester')
      return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
    if (req.status !== 'Completed') return fail(config, 409, 'INVALID_TRANSITION', vi.errors.INVALID_TRANSITION);
    if (db.reviews[reviewMatch[1]]) return fail(config, 409, 'CONCURRENCY_CONFLICT', vi.errors.CONCURRENCY_CONFLICT);
    const rating = Number(val(body, 'rating', 'Rating') || 0);
    const comment = val(body, 'comment', 'Comment').trim().slice(0, 500) || null;
    if (!Number.isInteger(rating) || rating < 1 || rating > 5)
      return fail(config, 400, 'VALIDATION_ERROR', vi.errors.VALIDATION_ERROR);
    if (comment && comment.length > 500) return fail(config, 400, 'VALIDATION_ERROR', vi.errors.VALIDATION_ERROR);
    const review: PreviewReview = { id: newId(), rating, comment, reviewerName: me.fullName, revieweeId: req.helperId ?? '', createdAt: new Date().toISOString() };
    db.reviews[reviewMatch[1]] = review;
    saveDb(db);
    return ok(config, review, 201);
  }

  // ---- Reports ----
  if (path === '/reports' && method === 'post') {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    if (me.role !== 'Requester' && me.role !== 'Helper') return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
    const targetType = val(body, 'targetType', 'TargetType') as 'Request' | 'User';
    const targetRequestId = val(body, 'targetRequestId', 'TargetRequestId') || null;
    const targetUserId = val(body, 'targetUserId', 'TargetUserId') || null;
    const reason = val(body, 'reason', 'Reason');
    const description = val(body, 'description', 'Description').trim();
    if ((targetType !== 'Request' && targetType !== 'User') || !['FakeRequest', 'Inappropriate', 'Harassment', 'Spam', 'PersonalDataLeak', 'Other'].includes(reason))
      return fail(config, 400, 'VALIDATION_ERROR', vi.errors.VALIDATION_ERROR);
    if (description.length < 10 || description.length > 1000)
      return fail(config, 400, 'VALIDATION_ERROR', vi.errors.VALIDATION_ERROR, { description: ['Mô tả cần từ 10 đến 1.000 ký tự.'] });
    if (targetType === 'Request') {
      if (!db.requests.some((r) => r.id === targetRequestId))
        return fail(config, 404, 'NOT_FOUND', vi.errors.NOT_FOUND);
    } else if (!db.users.some((u) => u.id === targetUserId)) {
      return fail(config, 404, 'NOT_FOUND', vi.errors.NOT_FOUND);
    }
    const report: DemoReport = { id: newId(), reporterId: me.id, targetType, targetRequestId: targetType === 'Request' ? targetRequestId : null, targetUserId: targetType === 'User' ? targetUserId : null, reason, description, status: 'Pending', adminNote: null, handledById: null, handledAt: null, createdAt: new Date().toISOString() };
    db.reports.unshift(report);
    saveDb(db);
    return ok(config, { id: report.id }, 201);
  }

  // ---- Admin ----
  const needAdmin = path.startsWith('/admin/');
  if (needAdmin && me?.role !== 'Admin') {
    if (!me) return fail(config, 401, 'UNAUTHORIZED', vi.errors.UNAUTHORIZED);
    return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
  }

  if (path === '/admin/dashboard' && method === 'get') {
    const byStatus = { Open: 0, Accepted: 0, InProgress: 0, Completed: 0 } as Record<Status, number>;
    for (const r of db.requests) byStatus[r.status] += 1;
    const recent = [...db.reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
    return ok(config, {
      totalUsers: db.users.length,
      helpers: db.users.filter((u) => u.role === 'Helper').length,
      requestsByStatus: byStatus,
      pendingReports: db.reports.filter((r) => r.status === 'Pending' || r.status === 'Reviewing').length,
      recentReports: recent.map((r) => toReportDto(db, r)),
    });
  }

  if (path === '/admin/users' && method === 'get') {
    const keyword = (q.get('keyword') ?? '').toLowerCase();
    const role = q.get('role') ?? '';
    const status = q.get('status') ?? '';
    const filtered = db.users.filter((u) => (!keyword || `${u.fullName} ${u.email}`.toLowerCase().includes(keyword)) && (!role || u.role === role) && (!status || u.status === status));
    const toAdmin = (u: DemoUser): AdminUser => ({ id: u.id, email: u.email, fullName: u.fullName, role: u.role, status: u.status, avatarUrl: u.avatarDataUrl ? `/api/users/${u.id}/avatar` : null, lockedReason: u.lockedReason, createdAt: u.createdAt });
    return ok(config, previewPage(filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(toAdmin), Number(q.get('page') ?? 1), Number(q.get('pageSize') ?? 12)));
  }

  const lockMatch = path.match(/^\/admin\/users\/(.+)\/(lock|unlock)$/);
  if (lockMatch && method === 'post') {
    const reason = val(body, 'reason', 'Reason').trim();
    if (reason.length < 3 || reason.length > 1000)
      return fail(config, 400, 'VALIDATION_ERROR', vi.errors.VALIDATION_ERROR);
    const target = db.users.find((u) => u.id === lockMatch[1]);
    if (!target) return fail(config, 404, 'NOT_FOUND', vi.errors.NOT_FOUND);
    if (target.id === (me as DemoUser).id || target.role === 'Admin')
      return fail(config, 403, 'FORBIDDEN', vi.errors.FORBIDDEN);
    const locking = lockMatch[2] === 'lock';
    const old = target.status;
    target.status = locking ? 'Locked' : 'Active';
    target.lockedReason = locking ? reason : null;
    for (const t of Object.keys(db.tokens)) if (db.tokens[t] === target.id) delete db.tokens[t];
    addAudit(db, me as DemoUser, locking ? 'USER_LOCKED' : 'USER_UNLOCKED', 'User', target.id, old, target.status, reason);
    saveDb(db);
    return ok(config, null, 204);
  }

  if (path === '/admin/requests' && method === 'get') {
    return ok(config, previewPage(db.requests.map((r) => toRequestDto(db, r)), Number(q.get('page') ?? 1), Number(q.get('pageSize') ?? 12)));
  }

  const hideMatch = path.match(/^\/admin\/requests\/(.+)\/(hide|unhide)$/);
  if (hideMatch && method === 'post') {
    const reason = val(body, 'reason', 'Reason').trim();
    if (reason.length < 3 || reason.length > 1000)
      return fail(config, 400, 'VALIDATION_ERROR', vi.errors.VALIDATION_ERROR);
    const req = db.requests.find((r) => r.id === hideMatch[1]);
    if (!req) return fail(config, 404, 'NOT_FOUND', vi.errors.NOT_FOUND);
    const hiding = hideMatch[2] === 'hide';
    const old = String(req.isHidden);
    req.isHidden = hiding;
    req.hiddenReason = hiding ? reason : null;
    addAudit(db, me as DemoUser, hiding ? 'REQUEST_HIDDEN' : 'REQUEST_UNHIDDEN', 'SupportRequest', req.id, old, String(hiding), reason);
    saveDb(db);
    return ok(config, null, 204);
  }

  const forceMatch = path.match(/^\/admin\/requests\/(.+)\/status$/);
  if (forceMatch && method === 'post') {
    const reason = val(body, 'reason', 'Reason').trim();
    if (reason.length < 3 || reason.length > 1000)
      return fail(config, 400, 'VALIDATION_ERROR', vi.errors.VALIDATION_ERROR);
    const req = db.requests.find((r) => r.id === forceMatch[1]);
    if (!req) return fail(config, 404, 'NOT_FOUND', vi.errors.NOT_FOUND);
    if (req.status !== 'Accepted' && req.status !== 'InProgress')
      return fail(config, 409, 'INVALID_TRANSITION', vi.errors.INVALID_TRANSITION);
    const old = req.status;
    req.status = 'Completed';
    req.updatedAt = new Date().toISOString();
    addAudit(db, me as DemoUser, 'ADMIN_FORCE_STATUS', 'SupportRequest', req.id, old, 'Completed', reason);
    saveDb(db);
    return ok(config, toRequestDto(db, req));
  }

  if (path === '/admin/reports' && method === 'get') {
    const status = q.get('status') ?? '';
    const keyword = (q.get('keyword') ?? '').trim().toLowerCase();
    let list = [...db.reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (status) list = list.filter((r) => r.status === status);
    if (keyword) list = list.filter((r) => r.description.toLowerCase().includes(keyword));
    return ok(config, previewPage(list.map((r) => toReportDto(db, r)), Number(q.get('page') ?? 1), Number(q.get('pageSize') ?? 12)));
  }

  const adminReportMatch = path.match(/^\/admin\/reports\/(.+)$/);
  if (adminReportMatch && method === 'get' && !path.endsWith('/resolve')) {
    const found = db.reports.find((r) => r.id === adminReportMatch[1]);
    if (!found) return fail(config, 404, 'NOT_FOUND', vi.errors.NOT_FOUND);
    return ok(config, toReportDto(db, found));
  }

  if (path.match(/^\/admin\/reports\/.+\/resolve$/) && method === 'post') {
    const id = path.split('/')[3];
    const found = db.reports.find((r) => r.id === id);
    if (!found) return fail(config, 404, 'NOT_FOUND', vi.errors.NOT_FOUND);
    const status = val(body, 'status', 'Status') as DemoReport['status'];
    const adminNote = val(body, 'adminNote', 'AdminNote').trim();
    const action = val(body, 'action', 'Action');
    if (!['Reviewing', 'Resolved', 'Rejected'].includes(status) || adminNote.length < 3 || adminNote.length > 1000)
      return fail(config, 400, 'VALIDATION_ERROR', vi.errors.VALIDATION_ERROR);
    const valid = (found.status === 'Pending' && status === 'Reviewing') || (found.status === 'Reviewing' && (status === 'Resolved' || status === 'Rejected'));
    if (!valid) return fail(config, 409, 'INVALID_TRANSITION', vi.errors.INVALID_TRANSITION);
    if (action && action !== 'HideRequest' && action !== 'LockUser')
      return fail(config, 400, 'VALIDATION_ERROR', vi.errors.VALIDATION_ERROR);
    if (action && status !== 'Resolved') return fail(config, 400, 'VALIDATION_ERROR', vi.errors.VALIDATION_ERROR);
    const old = found.status;
    found.status = status;
    found.adminNote = adminNote;
    found.handledById = (me as DemoUser).id;
    found.handledAt = new Date().toISOString();
    if (action === 'HideRequest' && found.targetRequestId) {
      const t = db.requests.find((r) => r.id === found.targetRequestId);
      if (t) {
        t.isHidden = true;
        t.hiddenReason = adminNote;
      }
    }
    if (action === 'LockUser') {
      const targetId = found.targetUserId ?? (found.targetRequestId ? (db.requests.find((r) => r.id === found.targetRequestId)?.requesterId ?? null) : null);
      const target = targetId ? db.users.find((u) => u.id === targetId) : null;
      if (target && target.role !== 'Admin' && target.id !== (me as DemoUser).id) {
        target.status = 'Locked';
        target.lockedReason = adminNote;
        for (const t of Object.keys(db.tokens)) if (db.tokens[t] === target.id) delete db.tokens[t];
      }
    }
    addAudit(db, me as DemoUser, status === 'Resolved' ? 'REPORT_RESOLVED' : status === 'Rejected' ? 'REPORT_REJECTED' : 'REPORT_REVIEWING', 'Report', found.id, old, status, adminNote);
    saveDb(db);
    return ok(config, toReportDto(db, found));
  }

  if (path === '/admin/audit-logs' && method === 'get') {
    const action = q.get('action') ?? '';
    const from = q.get('from') ?? '';
    const to = q.get('to') ?? '';
    let list = [...db.audits].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (action) list = list.filter((a) => a.action === action);
    if (from) list = list.filter((a) => a.createdAt >= from);
    if (to) list = list.filter((a) => a.createdAt <= to);
    return ok(config, previewPage(list.map((a) => ({ id: a.id, actorName: a.actorName, action: a.action, entityType: a.entityType, entityId: a.entityId, oldValue: a.oldValue, newValue: a.newValue, reason: a.reason, createdAt: a.createdAt })), Number(q.get('page') ?? 1), Number(q.get('pageSize') ?? 12)));
  }

  if (path === '/admin/categories' && method === 'get') {
    const items = (await getCatalog()).slice(0, 12).map((c, i) => ({ ...c, isActive: true, sortOrder: i }));
    return ok(config, previewPage(items, Number(q.get('page') ?? 1), Number(q.get('pageSize') ?? 12)));
  }

  if ((path === '/admin/categories' && method === 'post') || (path.startsWith('/admin/categories/') && method === 'put')) {
    return fail(config, 400, 'VALIDATION_ERROR', 'Danh mục chỉ xem trên bản web này. Hãy chạy bản đầy đủ trên máy tính để thêm/sửa lĩnh vực.');
  }

  return fail(config, 503, 'BACKEND_UNAVAILABLE', vi.catalog.backendPending);
};
