import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, ShieldCheck } from 'lucide-react';
import { api } from '../../api/client';
import type { PublicUser } from '../../api/types';
import { Avatar } from '../../components/AuthImage';
import { Modal } from '../../components/Modal';
import { ErrorState } from '../../components/ui';
import { vi } from '../../locales/vi';
import { ReportButton } from '../requests/ReportButton';
export function PublicProfile({ user, children }: { user: PublicUser; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const query = useQuery<PublicUser>({
    queryKey: ['public-user', user.id],
    queryFn: async () => (await api.get(`/users/${user.id}/public`)).data,
    enabled: open,
  });
  return (
    <>
      <button
        className="public-profile-button"
        onClick={() => setOpen(true)}
        aria-label={`${vi.review.publicProfile}: ${user.fullName}`}
      >
        {children ?? user.fullName}
      </button>
      <Modal open={open} title={vi.review.publicProfile} onClose={() => setOpen(false)}>
        {query.isPending ? (
          <p>{vi.common.loading}</p>
        ) : query.isError ? (
          <ErrorState retry={() => void query.refetch()} />
        ) : (
          <div className="public-profile">
            <Avatar user={query.data} size="large" />
            <h3>{query.data.fullName}</h3>
            <span className="role-badge">{vi.roles[query.data.role]}</span>
            {query.data.role === 'Helper' && (
              <div className="public-rating">
                <Star size={21} fill="currentColor" />
                <strong>
                  {query.data.averageRating === null
                    ? '—'
                    : query.data.averageRating.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
                </strong>
                <span>
                  {query.data.reviewCount} {vi.review.reviews}
                </span>
              </div>
            )}
            <p>
              <ShieldCheck size={16} />
              {vi.profile.privacy}
            </p>
            <ReportButton targetType="User" id={user.id} />
          </div>
        )}
      </Modal>
    </>
  );
}
