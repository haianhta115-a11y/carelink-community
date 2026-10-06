import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Activity, CheckCheck, HandHeart, MessageCircle } from 'lucide-react';
import { api } from '../../api/client';
import { vi } from '../../locales/vi';
interface Summary {
  total: number;
  open: number;
  accepted: number;
  inProgress: number;
  completed: number;
  unreadMessages: number;
}
export function PersonalOverview() {
  const query = useQuery<Summary>({
    queryKey: ['personal-summary'],
    queryFn: async () => (await api.get('/requests/summary')).data,
  });
  const cards = [
    { label: vi.catalog.totalConnections, value: query.data?.total, icon: HandHeart, to: '' },
    {
      label: vi.statuses.InProgress,
      value: query.data?.inProgress,
      icon: Activity,
      to: '?status=InProgress',
    },
    { label: vi.statuses.Completed, value: query.data?.completed, icon: CheckCheck, to: '?status=Completed' },
    {
      label: vi.catalog.unreadMessages,
      value: query.data?.unreadMessages,
      icon: MessageCircle,
      to: '/sessions',
    },
  ];
  return (
    <div className="personal-overview">
      {cards.map((card) => (
        <Link className="panel" to={card.to || '.'} key={card.label}>
          <span>
            <card.icon size={20} />
          </span>
          <div>
            <strong>{query.isPending ? '—' : card.value}</strong>
            <p>{card.label}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
