import {
  Activity,
  AlertCircle,
  ArrowRight,
  Check,
  Circle,
  Clock3,
  HandHeart,
  MapPin,
  Sparkles,
  CircleCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import type { Status, SupportRequest, Urgency } from '../api/types';
import { Avatar } from './AuthImage';
import { vi } from '../locales/vi';
import { relativeTime, fullTime } from '../lib/time';
import { categoryIcons } from './category-icons';
export function CategoryIcon({ name, size = 20 }: { name: string; size?: number }) {
  const Icon = categoryIcons[name as keyof typeof categoryIcons] ?? Sparkles;
  return <Icon size={size} strokeWidth={1.7} />;
}
export function StatusBadge({ status }: { status: Status }) {
  const Icon = { Open: Circle, Accepted: HandHeart, InProgress: Activity, Completed: CircleCheck }[status];
  return (
    <span className={`badge status-${status}`}>
      <Icon size={12} />
      {vi.statuses[status]}
    </span>
  );
}
export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  return (
    <span className={`badge urgency-${urgency}`}>
      {urgency === 'High' || urgency === 'Critical' ? (
        <AlertCircle size={12} />
      ) : (
        <span className="badge-dot" />
      )}
      {vi.urgencies[urgency]}
    </span>
  );
}
export function StatusStepper({ status }: { status: Status }) {
  const statuses = Object.keys(vi.statuses) as Status[];
  const index = statuses.indexOf(status);
  return (
    <ol className="status-stepper" aria-label={vi.requests.progress}>
      {statuses.map((value, i) => (
        <li
          className={clsx(i < index && 'done', i === index && 'current')}
          key={value}
          aria-current={i === index ? 'step' : undefined}
        >
          <span className="step-number">{i < index ? <Check size={13} /> : i + 1}</span>
          <span>{vi.statuses[value]}</span>
        </li>
      ))}
    </ol>
  );
}
export function RequestCard({ request }: { request: SupportRequest }) {
  return (
    <article className="request-card panel">
      <div className="request-card-top">
        <span className={`request-category category-bg-${request.categoryId}`}>
          <CategoryIcon name={request.categoryIcon} />
        </span>
        <UrgencyBadge urgency={request.urgency} />
      </div>
      <span className="request-category-name">{request.categoryName}</span>
      <h3>
        <Link to={`/requests/${request.id}`}>{request.title}</Link>
      </h3>
      <p className="request-description">{request.description}</p>
      <div className="request-location">
        <MapPin size={14} />
        <span>{request.location}</span>
      </div>
      <div className="request-meta">
        <StatusBadge status={request.status} />
        <time title={fullTime(request.createdAt)}>
          <Clock3 size={12} />
          {relativeTime(request.createdAt)}
        </time>
      </div>
      <div className="request-card-footer">
        <div className="request-author">
          <Avatar user={request.requester} size="small" />
          <span>{request.requester.fullName}</span>
        </div>
        <Link
          to={`/requests/${request.id}`}
          className="card-detail"
          aria-label={`${vi.common.view}: ${request.title}`}
        >
          <ArrowRight size={17} />
        </Link>
      </div>
    </article>
  );
}
export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label={vi.requests.pagination}>
      <button disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label={vi.common.previous}>
        ←
      </button>
      <span>
        {vi.common.page} <strong>{page}</strong> {vi.common.of} {totalPages}
      </span>
      <button disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label={vi.common.next}>
        →
      </button>
    </nav>
  );
}
