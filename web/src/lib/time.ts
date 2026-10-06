import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
export function relativeTime(value: string) {
  return formatDistanceToNow(new Date(value), { addSuffix: true, locale: vi });
}
export function fullTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
export function chatTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
export function dateLabel(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}
