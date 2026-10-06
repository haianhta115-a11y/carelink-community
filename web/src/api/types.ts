export type Role = 'Requester' | 'Helper' | 'Admin';
export type Status = 'Open' | 'Accepted' | 'InProgress' | 'Completed';
export type Urgency = 'Low' | 'Normal' | 'High' | 'Critical';
export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  status: 'Active' | 'Locked';
  avatarUrl: string | null;
  phone: string | null;
  address: string | null;
  createdAt: string;
}
export interface PublicUser {
  id: string;
  fullName: string;
  role: Role;
  avatarUrl: string | null;
  averageRating: number | null;
  reviewCount: number;
}
export interface Auth {
  token: string;
  expiresAt: string;
  user: User;
}
export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
export interface Category {
  id: number;
  name: string;
  icon: string;
  slug: string;
  groupKey: string;
  description: string;
}
export interface SupportRequest {
  id: string;
  title: string;
  description: string;
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  location: string;
  urgency: Urgency;
  status: Status;
  requester: PublicUser;
  createdAt: string;
  updatedAt: string;
  sessionId: string | null;
  helper: PublicUser | null;
  isHidden: boolean;
  hiddenReason: string | null;
}
export interface HistoryItem {
  id: string;
  fromStatus: Status | null;
  toStatus: Status;
  changedByName: string;
  changedAt: string;
  note: string | null;
}
export interface SessionSummary {
  id: string;
  requestId: string;
  requestTitle: string;
  requestStatus: Status;
  status: 'Active' | 'Closed';
  counterpart: PublicUser;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  createdAt: string;
}
export interface Session {
  id: string;
  status: 'Active' | 'Closed';
  request: SupportRequest;
  counterpart: PublicUser;
  counterpartPhone: string | null;
  counterpartAddress: string | null;
  createdAt: string;
}
export interface Message {
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
export interface MessagePage {
  items: Message[];
  nextCursor: number | null;
  hasMore: boolean;
}
