import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '../../api/client';
import type { Category, HistoryItem, Page, SupportRequest } from '../../api/types';
export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/categories')).data,
    staleTime: 3600000,
  });
}
export function useRequests(query: string, mine = false) {
  return useQuery<Page<SupportRequest>>({
    queryKey: ['requests', mine, query],
    queryFn: async () => (await api.get(`/requests${mine ? '/mine' : ''}?${query}`)).data,
    placeholderData: keepPreviousData,
  });
}
export function useRequest(id?: string) {
  return useQuery<SupportRequest>({
    queryKey: ['request', id],
    queryFn: async () => (await api.get(`/requests/${id}`)).data,
    enabled: Boolean(id),
  });
}
export function useHistory(id?: string, enabled = false) {
  return useQuery<HistoryItem[]>({
    queryKey: ['history', id],
    queryFn: async () => (await api.get(`/requests/${id}/history`)).data,
    enabled: Boolean(id) && enabled,
  });
}
