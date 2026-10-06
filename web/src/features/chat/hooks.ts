import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import type { Page, Session, SessionSummary, MessagePage } from '../../api/types';
export function useSessions(page = 1) {
  return useQuery<Page<SessionSummary>>({
    queryKey: ['sessions', page],
    queryFn: async () => (await api.get(`/sessions?page=${page}`)).data,
  });
}
export function useSession(id?: string) {
  return useQuery<Session>({
    queryKey: ['session', id],
    queryFn: async () => (await api.get(`/sessions/${id}`)).data,
    enabled: Boolean(id),
  });
}
export function useMessages(id: string) {
  return useInfiniteQuery({
    queryKey: ['messages', id],
    initialPageParam: null as number | null,
    queryFn: async ({ pageParam }) =>
      (await api.get<MessagePage>(`/sessions/${id}/messages`, { params: { before: pageParam, limit: 30 } }))
        .data,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}
