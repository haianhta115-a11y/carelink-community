import { useParams, Link } from 'react-router-dom';
import { Clock3, MapPin, ShieldCheck, MessageCircle } from 'lucide-react';
import { useRequest, useHistory } from '../features/requests/hooks';
import { useAuth } from '../features/auth/AuthProvider';
import { BackLink, ErrorState, LoadingCards } from '../components/ui';
import { CategoryIcon, StatusBadge, StatusStepper, UrgencyBadge } from '../components/RequestComponents';
import { Avatar } from '../components/AuthImage';
import { fullTime } from '../lib/time';
import { vi } from '../locales/vi';
import { RequestActions } from '../features/requests/RequestActions';
import { ReviewPanel } from '../features/sessions/ReviewPanel';
import { PublicProfile } from '../features/profile/PublicProfile';
import { ReportButton } from '../features/requests/ReportButton';
export function RequestDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const query = useRequest(id);
  const request = query.data;
  const canHistory = Boolean(
    request &&
    (user?.role === 'Admin' || request.requester.id === user?.id || request.helper?.id === user?.id),
  );
  const history = useHistory(id, canHistory);
  if (query.isPending)
    return (
      <main className="container page">
        <LoadingCards />
      </main>
    );
  if (query.isError || !request)
    return (
      <main className="container page">
        <BackLink to="/requests" />
        <ErrorState retry={() => void query.refetch()} />
      </main>
    );
  return (
    <main className="container page">
      <BackLink to="/requests" />
      <div className="detail-grid">
        <section className="detail-main">
          <article className="panel detail-card">
            <div className="detail-badges">
              <StatusBadge status={request.status} />
              <UrgencyBadge urgency={request.urgency} />
            </div>
            <h1>{request.title}</h1>
            <div className="detail-meta">
              <span>
                <CategoryIcon name={request.categoryIcon} size={16} />
                {request.categoryName}
              </span>
              <span>
                <MapPin size={16} />
                {request.location}
              </span>
              <time>
                <Clock3 size={16} />
                {fullTime(request.createdAt)}
              </time>
            </div>
            <div className="detail-divider" />
            <h2>{vi.requests.descriptionLabel}</h2>
            <p className="detail-description">{request.description}</p>
            <div className="inline-notice">
              <ShieldCheck size={18} />
              <p>{vi.requests.detailSafety}</p>
            </div>
          </article>
          <section className="panel progress-card">
            <h2>{vi.requests.progress}</h2>
            <StatusStepper status={request.status} />
            {history.data && (
              <div className="history-timeline">
                {history.data.map((item) => (
                  <div key={item.id}>
                    <span className={`timeline-dot status-${item.toStatus}`} />
                    <div>
                      <strong>{vi.statuses[item.toStatus]}</strong>
                      <p>
                        {item.changedByName} · {fullTime(item.changedAt)}
                      </p>
                      {item.note && <small>{item.note}</small>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="journey-actions">
              <RequestActions request={request} user={user} />
            </div>
          </section>
        </section>
        <aside className="detail-aside">
          <section className="panel detail-person">
            <h3>{vi.requests.requester}</h3>
            <div>
              <Avatar user={request.requester} />
              <p>
                <PublicProfile user={request.requester}>
                  <strong>{request.requester.fullName}</strong>
                </PublicProfile>
                <span>{vi.roles.Requester}</span>
              </p>
            </div>
            {request.helper && (
              <>
                <h3>{vi.requests.assignedHelper}</h3>
                <div>
                  <Avatar user={request.helper} />
                  <p>
                    <PublicProfile user={request.helper}>
                      <strong>{request.helper.fullName}</strong>
                    </PublicProfile>
                    <span>{vi.roles.Helper}</span>
                  </p>
                </div>
              </>
            )}
            <p className="person-privacy">
              <ShieldCheck size={15} />
              {vi.requests.contactPrivacy}
            </p>
          </section>
          <RequestActions request={request} user={user} />
          <ReportButton targetType="Request" id={request.id} />
          {request.sessionId && user?.role !== 'Admin' && (
            <Link className="btn btn-primary w-full" to={`/sessions/${request.sessionId}`}>
              <MessageCircle size={17} />
              {vi.requests.openSession}
            </Link>
          )}
          {request.sessionId && request.status === 'Completed' && user?.role !== 'Admin' && (
            <ReviewPanel sessionId={request.sessionId} canReview={user?.id === request.requester.id} />
          )}
        </aside>
      </div>
    </main>
  );
}
