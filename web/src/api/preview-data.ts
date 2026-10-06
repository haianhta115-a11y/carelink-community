import type { User } from './types';
import type { AdminUser, Audit, Report, Dashboard } from '../features/admin/types';
import type { SupportRequest } from './types';

const now = new Date().toISOString();

export const previewAdmin: User = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'admin@carelink.vn',
  fullName: 'Quản trị CareLink (Demo)',
  role: 'Admin',
  status: 'Active',
  avatarUrl: null,
  phone: null,
  address: null,
  createdAt: now,
};

export const previewRequester: User = {
  id: '00000000-0000-4000-8000-000000000002',
  email: 'requester1@carelink.vn',
  fullName: 'Nguyễn Minh Anh (Demo)',
  role: 'Requester',
  status: 'Active',
  avatarUrl: null,
  phone: '0901234567',
  address: 'Cầu Giấy, Hà Nội',
  createdAt: now,
};

export const previewHelper: User = {
  id: '00000000-0000-4000-8000-000000000003',
  email: 'helper1@carelink.vn',
  fullName: 'Trần Thu Hà (Demo)',
  role: 'Helper',
  status: 'Active',
  avatarUrl: null,
  phone: '0901234568',
  address: 'Bình Thạnh, TP. Hồ Chí Minh',
  createdAt: now,
};

export const previewUsers: AdminUser[] = [
  {
    id: previewAdmin.id,
    email: previewAdmin.email,
    fullName: previewAdmin.fullName,
    role: 'Admin',
    status: 'Active',
    avatarUrl: null,
    lockedReason: null,
    createdAt: now,
  },
  {
    id: previewRequester.id,
    email: previewRequester.email,
    fullName: previewRequester.fullName,
    role: 'Requester',
    status: 'Active',
    avatarUrl: null,
    lockedReason: null,
    createdAt: now,
  },
  {
    id: previewHelper.id,
    email: previewHelper.email,
    fullName: previewHelper.fullName,
    role: 'Helper',
    status: 'Active',
    avatarUrl: null,
    lockedReason: null,
    createdAt: now,
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    email: 'helper2@carelink.vn',
    fullName: 'Lê Hoàng Nam (Demo)',
    role: 'Helper',
    status: 'Locked',
    avatarUrl: null,
    lockedReason: 'Demo: vi phạm quy định cộng đồng.',
    createdAt: now,
  },
];

export const previewReports: Report[] = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    reporterId: previewHelper.id,
    reporterName: previewHelper.fullName,
    targetType: 'Request',
    targetRequestId: '20000000-0000-4000-8000-000000000001',
    targetUserId: null,
    targetName: 'Cần người đồng hành đưa mẹ đi khám (Demo)',
    reason: 'Other',
    description: 'Báo cáo demo: nhờ quản trị viên kiểm tra lại nội dung và địa điểm.',
    status: 'Pending',
    adminNote: null,
    handledByName: null,
    handledAt: null,
    createdAt: now,
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    reporterId: previewRequester.id,
    reporterName: previewRequester.fullName,
    targetType: 'User',
    targetRequestId: null,
    targetUserId: previewUsers[3].id,
    targetName: previewUsers[3].fullName,
    reason: 'Spam',
    description: 'Báo cáo demo đã được xem xét và giải quyết.',
    status: 'Resolved',
    adminNote: 'Demo: đã nhắc nhở người dùng.',
    handledByName: previewAdmin.fullName,
    handledAt: now,
    createdAt: now,
  },
];

export const previewAudits: Audit[] = [
  {
    id: '30000000-0000-4000-8000-000000000001',
    actorName: previewAdmin.fullName,
    action: 'USER_LOCKED',
    entityType: 'User',
    entityId: previewUsers[3].id,
    oldValue: 'Active',
    newValue: 'Locked',
    reason: 'Demo: vi phạm quy định cộng đồng.',
    createdAt: now,
  },
  {
    id: '30000000-0000-4000-8000-000000000002',
    actorName: previewAdmin.fullName,
    action: 'REPORT_RESOLVED',
    entityType: 'Report',
    entityId: previewReports[1].id,
    oldValue: 'Reviewing',
    newValue: 'Resolved',
    reason: 'Demo: đã kiểm tra nội dung.',
    createdAt: now,
  },
];

export const previewRequests: SupportRequest[] = [
  {
    id: '20000000-0000-4000-8000-000000000001',
    title: 'Cần người đồng hành đưa mẹ đi khám (Demo)',
    description: 'Dữ liệu demo trên bản public. Bản local mới có dữ liệu thật và đầy đủ chức năng.',
    categoryId: 1,
    categoryName: 'Y tế & sức khỏe',
    categoryIcon: 'HeartPulse',
    location: 'Cầu Giấy, Hà Nội',
    urgency: 'High',
    status: 'Open',
    requester: {
      id: previewRequester.id,
      fullName: previewRequester.fullName,
      role: 'Requester',
      avatarUrl: null,
      averageRating: null,
      reviewCount: 0,
    },
    createdAt: now,
    updatedAt: now,
    sessionId: null,
    helper: null,
    isHidden: false,
    hiddenReason: null,
  },
  {
    id: '20000000-0000-4000-8000-000000000002',
    title: 'Nhờ hướng dẫn tin học cơ bản (Demo)',
    description: 'Dữ liệu demo trên bản public.',
    categoryId: 16,
    categoryName: 'Tin học & kỹ năng số',
    categoryIcon: 'Laptop',
    location: 'Bình Thạnh, TP. Hồ Chí Minh',
    urgency: 'Normal',
    status: 'InProgress',
    requester: {
      id: previewRequester.id,
      fullName: previewRequester.fullName,
      role: 'Requester',
      avatarUrl: null,
      averageRating: null,
      reviewCount: 0,
    },
    createdAt: now,
    updatedAt: now,
    sessionId: null,
    helper: {
      id: previewHelper.id,
      fullName: previewHelper.fullName,
      role: 'Helper',
      avatarUrl: null,
      averageRating: 4.8,
      reviewCount: 12,
    },
    isHidden: false,
    hiddenReason: null,
  },
];

export const previewDashboard: Dashboard = {
  totalUsers: previewUsers.length,
  helpers: 2,
  requestsByStatus: { Open: 1, Accepted: 0, InProgress: 1, Completed: 3 },
  pendingReports: 1,
  recentReports: previewReports,
};

export function previewPage<T>(items: T[], page: number, pageSize: number) {
  const safePage = Math.max(1, page || 1);
  const safeSize = Math.min(50, Math.max(1, pageSize || 12));
  const start = (safePage - 1) * safeSize;
  const sliced = items.slice(start, start + safeSize);
  return {
    items: sliced,
    page: safePage,
    pageSize: safeSize,
    totalItems: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / safeSize)),
  };
}
