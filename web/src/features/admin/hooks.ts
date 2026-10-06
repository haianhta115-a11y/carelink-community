import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
export function useAdminQuery<T>(path: string, query = '') {
  return useQuery<T>({
    queryKey: ['admin', path, query],
    queryFn: async () => (await api.get(`/admin/${path}?${query}`)).data,
  });
}
