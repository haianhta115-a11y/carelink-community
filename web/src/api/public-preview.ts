import { AxiosError, AxiosHeaders, type AxiosAdapter } from 'axios';
import { vi } from '../locales/vi';
export const publicPreview = import.meta.env.VITE_PUBLIC_PREVIEW === 'true' && !import.meta.env.VITE_API_URL;
export const previewAdapter: AxiosAdapter = async config => {
  let data: unknown;
  if (config.url === '/public/categories') {
    const response = await fetch(`${import.meta.env.BASE_URL}catalog.json`);
    if (!response.ok) throw new Error(vi.common.network);
    data = await response.json();
  } else if (config.url === '/public/stats') data = {};
  else throw new AxiosError(vi.catalog.backendPending, 'ERR_BACKEND_UNAVAILABLE', config, undefined, { config, data: { code: 'BACKEND_UNAVAILABLE' }, status: 503, statusText: 'Service Unavailable', headers: new AxiosHeaders() });
  return { config, data, status: 200, statusText: 'OK', headers: new AxiosHeaders() };
};
