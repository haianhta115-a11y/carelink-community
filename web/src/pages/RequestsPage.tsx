import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, HeartHandshake, Plus, Sparkles } from 'lucide-react';
import { useAuth } from '../features/auth/AuthProvider';
import { useCategories, useRequests } from '../features/requests/hooks';
import { FilterBar } from '../components/FilterBar';
import { Pagination, RequestCard } from '../components/RequestComponents';
import { Button, EmptyState, ErrorState, LoadingCards } from '../components/ui';
import { vi } from '../locales/vi';
import { PersonalOverview } from '../features/requests/PersonalOverview';
export function RequestsPage({ mine = false }: { mine?: boolean }) {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const categories = useCategories();
  const requests = useRequests(params.toString(), mine);
  const title = mine ? (user?.role === 'Requester' ? vi.nav.mine : vi.nav.jobs) : vi.requests.exploreTitle;
  return (
    <main className="container page requests-page">
      <div className="requests-welcome">
        <div>
          <span className="eyebrow">
            <Sparkles size={13} />
            {mine ? vi.requests.yourSpace : vi.requests.eyebrow}
          </span>
          <h1>{title}</h1>
          <p>{mine ? vi.requests.mineBody : vi.requests.exploreBody}</p>
        </div>
        {user?.role === 'Requester' ? (
          <Link className="btn btn-primary" to="/requests/new">
            <Plus size={18} />
            {vi.requests.create}
          </Link>
        ) : (
          <span className="welcome-heart">
            <HeartHandshake size={53} strokeWidth={1.4} />
          </span>
        )}
      </div>
      {mine && <PersonalOverview />}
      {!mine && <nav className="request-groups" aria-label={vi.catalog.groupsLabel}>
        <button className={!params.get('group') ? 'active' : ''} onClick={() => setParams(previous => { const next = new URLSearchParams(previous); next.delete('group'); next.delete('categoryId'); next.delete('page'); return next; })}>{vi.catalog.allGroups}</button>
        {Object.entries(vi.catalog.groups).map(([group, label]) => <button key={group} className={params.get('group') === group ? 'active' : ''} onClick={() => setParams(previous => { const next = new URLSearchParams(previous); next.set('group', group); next.delete('categoryId'); next.delete('page'); return next; })}>{label}</button>)}
      </nav>}
      {mine ? (
        <div className="request-tabs">
          <button className={!params.get('status') ? 'active' : ''} onClick={() => setParams({})}>
            {vi.common.all}
          </button>
          {Object.entries(vi.statuses).map(([value, label]) => (
            <button
              key={value}
              className={params.get('status') === value ? 'active' : ''}
              onClick={() => setParams({ status: value })}
            >
              {label}
            </button>
          ))}
        </div>
      ) : (
        <FilterBar categories={categories.data} defaultStatus={user?.role === 'Helper' ? 'Open' : ''} />
      )}
      <div className="results-bar">
        <p>
          {requests.data ? (
            <>
              <strong>{requests.data.totalItems}</strong> {vi.requests.resultLabel}
            </>
          ) : (
            vi.common.loading
          )}
        </p>
        <div>
          <label htmlFor="sort">{vi.requests.sort}</label>
          <select
            id="sort"
            value={params.get('sort') ?? 'newest'}
            onChange={(event) =>
              setParams((previous) => {
                const next = new URLSearchParams(previous);
                next.set('sort', event.target.value);
                next.delete('page');
                return next;
              })
            }
          >
            <option value="newest">{vi.requests.newest}</option>
            <option value="urgency">{vi.requests.urgentFirst}</option>
          </select>
        </div>
      </div>
      {requests.isPending ? (
        <LoadingCards />
      ) : requests.isError ? (
        <ErrorState retry={() => void requests.refetch()} />
      ) : requests.data.items.length === 0 ? (
        <EmptyState
          title={mine ? vi.requests.emptyMine : vi.requests.emptyTitle}
          body={mine ? vi.requests.emptyMineBody : vi.requests.emptyBody}
          action={
            mine ? (
              <Link
                className="btn btn-primary"
                to={user?.role === 'Requester' ? '/requests/new' : '/requests'}
              >
                {user?.role === 'Requester' ? vi.requests.create : vi.nav.requests}
                <ArrowUpRight size={17} />
              </Link>
            ) : (
              <Button variant="secondary" onClick={() => setParams({})}>
                {vi.requests.clearFilters}
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="request-grid" aria-busy={requests.isFetching}>
            {requests.data.items.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
          <Pagination
            page={requests.data.page}
            totalPages={requests.data.totalPages}
            onChange={(page) => {
              setParams((previous) => {
                const next = new URLSearchParams(previous);
                next.set('page', String(page));
                return next;
              });
            }}
          />
        </>
      )}
      <p className="requests-bottom-note">{vi.requests.bottomNote}</p>
    </main>
  );
}
