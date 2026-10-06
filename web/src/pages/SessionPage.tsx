import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowUpRight, MapPin, Phone, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';
import { useSession } from '../features/chat/hooks';
import { ChatPanel } from '../features/chat/ChatPanel';
import { useAuth } from '../features/auth/AuthProvider';
import { RequestActions } from '../features/requests/RequestActions';
import { BackLink, ErrorState, LoadingCards } from '../components/ui';
import { StatusBadge, StatusStepper, UrgencyBadge } from '../components/RequestComponents';
import { vi } from '../locales/vi';
import { ReviewPanel } from '../features/sessions/ReviewPanel';
import { ReportButton } from '../features/requests/ReportButton';
export function SessionPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const query = useSession(id);
  const [tab, setTab] = useState('chat');
  if (query.isPending)
    return (
      <main className="container page">
        <LoadingCards />
      </main>
    );
  if (query.isError || !query.data)
    return (
      <main className="container page">
        <BackLink to="/sessions" />
        <ErrorState retry={() => void query.refetch()} />
      </main>
    );
  const session = query.data;
  return (
    <main className="container page session-page">
      <BackLink to="/sessions" />
      <div className="session-title">
        <div>
          <span className="eyebrow">{vi.chat.workspace}</span>
          <h1>{session.request.title}</h1>
        </div>
        <StatusBadge status={session.request.status} />
      </div>
      <div className="session-mobile-tabs">
        <button className={tab === 'chat' ? 'active' : ''} onClick={() => setTab('chat')}>
          {vi.chat.chatTab}
        </button>
        <button className={tab === 'detail' ? 'active' : ''} onClick={() => setTab('detail')}>
          {vi.chat.detailTab}
        </button>
      </div>
      <div className={`workspace-grid workspace-${tab}`}>
        <div className={clsx('workspace-chat', tab === 'chat' && 'mobile-active')}>
          <ChatPanel key={session.id} session={session} />
        </div>
        <aside className={clsx('workspace-aside', tab === 'detail' && 'mobile-active')}>
          <section className="panel session-request-info">
            <div>
              <span>{vi.chat.requestInfo}</span>
              <UrgencyBadge urgency={session.request.urgency} />
            </div>
            <h2>{session.request.title}</h2>
            <p>
              <MapPin size={15} />
              {session.request.location}
            </p>
            <StatusStepper status={session.request.status} />
            <Link className="text-link" to={`/requests/${session.request.id}`}>
              {vi.common.view}
              <ArrowUpRight size={16} />
            </Link>
            <div className="journey-actions">
              <RequestActions request={session.request} user={user} />
            </div>
          </section>
          <RequestActions request={session.request} user={user} />
          <ReportButton targetType="User" id={session.counterpart.id} />
          {session.status === 'Closed' && (
            <ReviewPanel sessionId={session.id} canReview={user?.id === session.request.requester.id} />
          )}
          <section className="panel session-contact">
            <h3>{vi.chat.contactTitle}</h3>
            {session.status === 'Active' ? (
              <>
                <strong>{session.counterpart.fullName}</strong>
                {session.counterpartPhone ? (
                  <a href={`tel:${session.counterpartPhone}`}>
                    <Phone size={14} />
                    {session.counterpartPhone}
                  </a>
                ) : (
                  <span className="contact-missing">{vi.chat.noPhone}</span>
                )}
                {session.counterpartAddress && (
                  <p>
                    <MapPin size={14} />
                    {session.counterpartAddress}
                  </p>
                )}
              </>
            ) : (
              <p className="contact-missing">{vi.chat.closedContact}</p>
            )}
            <small>
              <ShieldCheck size={13} />
              {vi.chat.contactPrivacy}
            </small>
          </section>
        </aside>
      </div>
    </main>
  );
}
