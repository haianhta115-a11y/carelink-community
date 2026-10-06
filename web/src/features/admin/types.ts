import type { Role, User, Status } from '../../api/types';
export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  status: User['status'];
  avatarUrl: string | null;
  lockedReason: string | null;
  createdAt: string;
}
export type ReportStatus = 'Pending' | 'Reviewing' | 'Resolved' | 'Rejected';
export interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  targetType: 'Request' | 'User';
  targetRequestId: string | null;
  targetUserId: string | null;
  targetName: string;
  reason: string;
  description: string;
  status: ReportStatus;
  adminNote: string | null;
  handledByName: string | null;
  handledAt: string | null;
  createdAt: string;
}
export interface Audit {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  createdAt: string;
}
export interface Dashboard {
  totalUsers: number;
  helpers: number;
  requestsByStatus: Record<Status, number>;
  pendingReports: number;
  recentReports: Report[];
}
