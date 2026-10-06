import axios from 'axios';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { errorMessage, vi } from '../locales/vi';
import { readAuth } from '../lib/auth-storage';
import { publicPreview, previewAdapter } from './public-preview';
const server = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? '';
export const api = axios.create({ baseURL: server ? `${server}/api` : '/api', timeout: 15000, ...(publicPreview ? { adapter: previewAdapter } : {}) });
api.interceptors.request.use((config) => {
  const token = readAuth()?.token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !error.config?.url?.startsWith('/auth/') &&
      error.response.data?.code !== 'INVALID_CREDENTIALS'
    )
      window.dispatchEvent(new Event('carelink:unauthorized'));
    return Promise.reject(error);
  },
);
export function apiError(error: unknown) {
  return axios.isAxiosError(error) ? errorMessage(error.response?.data?.code) : vi.common.network;
}
export function applyFormError<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>) {
  if (axios.isAxiosError(error) && error.response?.data?.errors) {
    for (const [field, messages] of Object.entries(error.response.data.errors as Record<string, string[]>))
      setError(field as Path<T>, { message: messages[0] });
  }
  setError('root', { message: apiError(error) });
}
