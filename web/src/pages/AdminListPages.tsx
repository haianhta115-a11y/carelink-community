import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, LockKeyhole, UnlockKeyhole, CheckCheck } from 'lucide-react';
import type { Page, SupportRequest } from '../api/types';
import type { AdminUser, Audit, Report } from '../features/admin/types';
import { useAdminQuery } from '../features/admin/hooks';
import { AdminToolbar, ReasonDialog, ReportBadge, type AdminAction } from '../features/admin/AdminComponents';
import { Avatar } from '../components/AuthImage';
import { EmptyState, ErrorState, LoadingCards } from '../components/ui';
import { Pagination, StatusBadge } from '../components/RequestComponents';
import { fullTime } from '../lib/time';
import { vi } from '../locales/vi';
function AdminPageHeading({ title, body }: { title: string; body: string }) {
  return (
    <div className="page-heading">
      <span className="eyebrow">{vi.admin.eyebrow}</span>
      <h1>{title}</h1>
      <p>{body}</p>
    </div>
  );
}
function useAdminPagination() {
  const [params, setParams] = useSearchParams();
  return {
    params,
    onPage: (page: number) =>
      setParams((previous) => {
        const next = new URLSearchParams(previous);
        next.set('page', String(page));
        return next;
      }),
  };
}
export function AdminUsersPage() {
  const { params, onPage } = useAdminPagination();
  const query = useAdminQuery<Page<AdminUser>>('users', params.toString());
  const [action, setAction] = useState<AdminAction | null>(null);
  return (
    <>
      <AdminPageHeading title={vi.admin.users} body={vi.admin.usersBody} />
      <section className="panel">
        <AdminToolbar
          filters={[
            { key: 'role', label: vi.admin.allRoles, options: vi.roles },
            { key: 'status', label: vi.admin.allAccountStatuses, options: vi.admin.userStatuses },
          ]}
        />
        {query.isPending ? (
          <LoadingCards />
        ) : query.isError ? (
          <ErrorState retry={() => void query.refetch()} />
        ) : query.data.items.length === 0 ? (
          <EmptyState title={vi.admin.noUsers} />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{vi.admin.account}</th>
                  <th>{vi.admin.role}</th>
                  <th>{vi.requests.status}</th>
                  <th>{vi.admin.createdAt}</th>
                  <th>{vi.admin.action}</th>
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((user) => (
                  <tr key={user.id}>
                    <td data-label={vi.admin.account}>
                      <div className="table-person">
                        <Avatar user={user} size="small" />
                        <div>
                          <strong>{user.fullName}</strong>
                          <span>{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td data-label={vi.admin.role}>{vi.roles[user.role]}</td>
                    <td data-label={vi.requests.status}>
                      <span className={`badge account-${user.status}`}>
                        {vi.admin.userStatuses[user.status]}
                      </span>
                      {user.lockedReason && <small className="table-note">{user.lockedReason}</small>}
                    </td>
                    <td data-label={vi.admin.createdAt}>{fullTime(user.createdAt)}</td>
                    <td data-label={vi.admin.action}>
                      {user.role !== 'Admin' && (
                        <button
                          className={user.status === 'Locked' ? 'table-link' : 'table-link danger'}
                          onClick={() =>
                            setAction({
                              path: `users/${user.id}/${user.status === 'Locked' ? 'unlock' : 'lock'}`,
                              targetName: user.fullName,
                              title: user.status === 'Locked' ? vi.admin.unlockTitle : vi.admin.lockTitle,
                              button: user.status === 'Locked' ? vi.admin.unlock : vi.admin.lock,
                              danger: user.status !== 'Locked',
                            })
                          }
                        >
                          {user.status === 'Locked' ? <UnlockKeyhole size={14} /> : <LockKeyhole size={14} />}
                          {user.status === 'Locked' ? vi.admin.unlock : vi.admin.lock}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {query.data && (
        <Pagination page={query.data.page} totalPages={query.data.totalPages} onChange={onPage} />
      )}
      <ReasonDialog action={action} onClose={() => setAction(null)} />
    </>
  );
}
export function AdminRequestsPage() {
  const { params, onPage } = useAdminPagination();
  const query = useAdminQuery<Page<SupportRequest>>('requests', params.toString());
  const [action, setAction] = useState<AdminAction | null>(null);
  return (
    <>
      <AdminPageHeading title={vi.admin.requests} body={vi.admin.requestsBody} />
      <section className="panel">
        <AdminToolbar filters={[{ key: 'status', label: vi.requests.allStatuses, options: vi.statuses }]} />
        {query.isPending ? (
          <LoadingCards />
        ) : query.isError ? (
          <ErrorState retry={() => void query.refetch()} />
        ) : query.data.items.length === 0 ? (
          <EmptyState title={vi.requests.emptyTitle} />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{vi.admin.request}</th>
                  <th>{vi.requests.requester}</th>
                  <th>{vi.requests.status}</th>
                  <th>{vi.admin.visibility}</th>
                  <th>{vi.admin.action}</th>
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((request) => (
                  <tr key={request.id}>
                    <td data-label={vi.admin.request}>
                      <Link className="table-title" to={`/requests/${request.id}`}>
                        {request.title}
                      </Link>
                      <small className="table-note">
                        {request.categoryName} · {request.location}
                      </small>
                    </td>
                    <td data-label={vi.requests.requester}>{request.requester.fullName}</td>
                    <td data-label={vi.requests.status}>
                      <StatusBadge status={request.status} />
                    </td>
                    <td data-label={vi.admin.visibility}>
                      <span className={`badge ${request.isHidden ? 'account-Locked' : 'account-Active'}`}>
                        {request.isHidden ? vi.admin.hidden : vi.admin.visible}
                      </span>
                      {request.hiddenReason && <small className="table-note">{request.hiddenReason}</small>}
                    </td>
                    <td data-label={vi.admin.action}>
                      <div className="table-actions">
                        <button
                          className="table-link"
                          onClick={() =>
                            setAction({
                              path: `requests/${request.id}/${request.isHidden ? 'unhide' : 'hide'}`,
                              targetName: request.title,
                              title: request.isHidden ? vi.admin.unhideTitle : vi.admin.hideTitle,
                              button: request.isHidden ? vi.admin.unhide : vi.admin.hide,
                              danger: !request.isHidden,
                            })
                          }
                        >
                          {request.isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                          {request.isHidden ? vi.admin.unhide : vi.admin.hide}
                        </button>
                        {(request.status === 'Accepted' || request.status === 'InProgress') && (
                          <button
                            className="table-link muted"
                            onClick={() =>
                              setAction({
                                path: `requests/${request.id}/status`,
                                targetName: request.title,
                                title: vi.admin.forceTitle,
                                button: vi.admin.forceComplete,
                                danger: true,
                              })
                            }
                          >
                            <CheckCheck size={14} />
                            {vi.admin.intervene}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {query.data && (
        <Pagination page={query.data.page} totalPages={query.data.totalPages} onChange={onPage} />
      )}
      <ReasonDialog action={action} onClose={() => setAction(null)} />
    </>
  );
}
export function AdminReportsPage() {
  const { params, onPage } = useAdminPagination();
  const query = useAdminQuery<Page<Report>>('reports', params.toString());
  return (
    <>
      <AdminPageHeading title={vi.admin.reports} body={vi.admin.reportsBody} />
      <section className="panel">
        <AdminToolbar
          filters={[{ key: 'status', label: vi.admin.allReportStatuses, options: vi.reports.statuses }]}
        />
        {query.isPending ? (
          <LoadingCards />
        ) : query.isError ? (
          <ErrorState retry={() => void query.refetch()} />
        ) : query.data.items.length === 0 ? (
          <EmptyState title={vi.admin.noReports} />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{vi.admin.target}</th>
                  <th>{vi.admin.reporter}</th>
                  <th>{vi.reports.reason}</th>
                  <th>{vi.requests.status}</th>
                  <th>{vi.admin.createdAt}</th>
                  <th>{vi.admin.action}</th>
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((report) => (
                  <tr key={report.id}>
                    <td data-label={vi.admin.target}>
                      <strong className="table-title">{report.targetName}</strong>
                      <small className="table-note">{vi.reports.targetTypes[report.targetType]}</small>
                    </td>
                    <td data-label={vi.admin.reporter}>{report.reporterName}</td>
                    <td data-label={vi.reports.reason}>
                      {vi.reports.reasons[report.reason as keyof typeof vi.reports.reasons]}
                    </td>
                    <td data-label={vi.requests.status}>
                      <ReportBadge status={report.status} />
                    </td>
                    <td data-label={vi.admin.createdAt}>{fullTime(report.createdAt)}</td>
                    <td data-label={vi.admin.action}>
                      <Link className="table-link" to={`/admin/reports/${report.id}`}>
                        {vi.admin.process}
                        <ArrowRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {query.data && (
        <Pagination page={query.data.page} totalPages={query.data.totalPages} onChange={onPage} />
      )}
    </>
  );
}
export function AdminAuditPage() {
  const { params, onPage } = useAdminPagination();
  const query = useAdminQuery<Page<Audit>>('audit-logs', params.toString());
  return (
    <>
      <AdminPageHeading title={vi.admin.audit} body={vi.admin.auditBody} />
      <section className="panel">
        <AdminToolbar
          search={false}
          dates
          filters={[{ key: 'action', label: vi.admin.allActions, options: vi.admin.actions }]}
        />
        {query.isPending ? (
          <LoadingCards />
        ) : query.isError ? (
          <ErrorState retry={() => void query.refetch()} />
        ) : query.data.items.length === 0 ? (
          <EmptyState title={vi.admin.noAudit} />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table audit-table">
              <thead>
                <tr>
                  <th>{vi.admin.createdAt}</th>
                  <th>{vi.admin.actor}</th>
                  <th>{vi.admin.action}</th>
                  <th>{vi.admin.change}</th>
                  <th>{vi.admin.reason}</th>
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((log) => (
                  <tr key={log.id}>
                    <td data-label={vi.admin.createdAt}>{fullTime(log.createdAt)}</td>
                    <td data-label={vi.admin.actor}>{log.actorName}</td>
                    <td data-label={vi.admin.action}>
                      <span className="audit-action">
                        {vi.admin.actions[log.action as keyof typeof vi.admin.actions] ?? log.action}
                      </span>
                      <small className="table-note entity-id">{log.entityId}</small>
                    </td>
                    <td data-label={vi.admin.change}>
                      {log.oldValue && (
                        <span>
                          {vi.statuses[log.oldValue as keyof typeof vi.statuses] ?? log.oldValue} →{' '}
                        </span>
                      )}
                      {vi.statuses[log.newValue as keyof typeof vi.statuses] ?? log.newValue}
                    </td>
                    <td data-label={vi.admin.reason}>{log.reason ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {query.data && (
        <Pagination page={query.data.page} totalPages={query.data.totalPages} onChange={onPage} />
      )}
    </>
  );
}
