import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, MessageCircle } from 'lucide-react';
import { useSessions } from '../features/chat/hooks';
import { Avatar } from '../components/AuthImage';
import { EmptyState, ErrorState, LoadingCards } from '../components/ui';
import { Pagination, StatusBadge } from '../components/RequestComponents';
import { relativeTime } from '../lib/time';
import { vi } from '../locales/vi';
export function SessionsPage() {
  const [page, setPage] = useState(1);
  const query = useSessions(page);
  return (
    <main className="container page">
      <div className="page-heading">
        <span className="eyebrow">{vi.chat.inboxEyebrow}</span>
        <h1>{vi.chat.inboxTitle}</h1>
        <p>{vi.chat.inboxBody}</p>
      </div>
      {query.isPending ? (
        <LoadingCards />
      ) : query.isError ? (
        <ErrorState retry={() => void query.refetch()} />
      ) : !query.data.items.length ? (
        <EmptyState
          title={vi.chat.inboxEmpty}
          body={vi.chat.inboxEmptyBody}
          action={
            <Link className="btn btn-primary" to="/requests">
              {vi.nav.requests}
              <ArrowUpRight size={17} />
            </Link>
          }
        />
      ) : (
        <>
          <div className="sessions-grid">
            {query.data.items.map((session) => (
              <Link className="session-card panel" key={session.id} to={`/sessions/${session.id}`}>
                <div className="session-card-person">
                  <Avatar user={session.counterpart} />
                  <div>
                    <h3>{session.counterpart.fullName}</h3>
                    <span>{vi.roles[session.counterpart.role]}</span>
                  </div>
                  {session.unreadCount > 0 && <span className="unread-count">{session.unreadCount}</span>}
                </div>
                <h4>{session.requestTitle}</h4>
                <p className="last-message">
                  <MessageCircle size={14} />
                  <span>{session.lastMessage ?? vi.chat.sayHello}</span>
                </p>
                <div className="session-card-bottom">
                  <StatusBadge status={session.requestStatus} />
                  <time>{relativeTime(session.lastMessageAt ?? session.createdAt)}</time>
                  <ArrowUpRight size={16} />
                </div>
              </Link>
            ))}
          </div>
          <Pagination page={query.data.page} totalPages={query.data.totalPages} onChange={setPage} />
        </>
      )}
    </main>
  );
}
