import { Globe2, ArrowUpRight } from 'lucide-react';
import { publicPreview } from '../api/public-preview';
import { vi } from '../locales/vi';
export function PreviewNotice() {
  if (!publicPreview) return null;
  return <aside className="preview-notice"><div className="container"><span><Globe2 size={16} /><strong>{vi.catalog.publicPreview}</strong></span><p>{vi.catalog.backendPending}</p><a href={import.meta.env.VITE_SOURCE_URL || 'https://github.com/haianhta115-a11y/carelink-community'} target="_blank" rel="noreferrer">{vi.catalog.localLink}<ArrowUpRight size={14} /></a></div></aside>;
}
