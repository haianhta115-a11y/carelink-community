import { Link } from 'react-router-dom';
import { ArrowRight, CheckCheck, Flag, HandHeart, Users } from 'lucide-react';
import { useAdminQuery } from '../features/admin/hooks';
import type { Dashboard } from '../features/admin/types';
import { ReportBadge } from '../features/admin/AdminComponents';
import { ErrorState, LoadingCards } from '../components/ui';
import { fullTime } from '../lib/time';
import { vi } from '../locales/vi';
export function AdminDashboardPage() {
  const query = useAdminQuery<Dashboard>('dashboard');
  if (query.isPending) return <LoadingCards />;
  if (query.isError) return <ErrorState retry={() => void query.refetch()} />;
  const data = query.data,
    total = Object.values(data.requestsByStatus).reduce((sum, count) => sum + count, 0);
  const stats = [
    { label: vi.admin.totalUsers, value: data.totalUsers, icon: Users },
    { label: vi.admin.helpers, value: data.helpers, icon: HandHeart },
    { label: vi.admin.completedRequests, value: data.requestsByStatus.Completed, icon: CheckCheck },
    { label: vi.admin.pendingReports, value: data.pendingReports, icon: Flag },
  ];
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">{vi.admin.eyebrow}</span>
        <h1>{vi.admin.overviewTitle}</h1>
        <p>{vi.admin.overviewBody}</p>
      </div>
      <div className="admin-stats">
        {stats.map((stat, i) => (
          <article className={`panel admin-stat admin-stat-${i}`} key={stat.label}>
            <span>
              <stat.icon size={21} />
            </span>
            <p>{stat.label}</p>
            <strong>{stat.value.toLocaleString('vi-VN')}</strong>
          </article>
        ))}
      </div>
      <section className="panel admin-progress">
        <div>
          <h2>{vi.admin.requestOverview}</h2>
          <span>
            {total} {vi.admin.totalRequests}
          </span>
        </div>
        <div className="admin-progress-items">
          {Object.entries(data.requestsByStatus).map(([status, count]) => (
            <div key={status}>
              <span className={`badge status-${status}`}>
                {vi.statuses[status as keyof typeof vi.statuses]}
              </span>
              <strong>{count}</strong>
              <div className="progress-track">
                <span
                  className={`progress-fill fill-${status}`}
                  style={{ width: total ? `${(count / total) * 100}%` : '0%' }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="panel admin-recent">
        <div className="panel-heading">
          <h2>{vi.admin.recentReports}</h2>
          <Link className="text-link" to="/admin/reports">
            {vi.common.more}
            <ArrowRight size={15} />
          </Link>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{vi.admin.target}</th>
                <th>{vi.reports.reason}</th>
                <th>{vi.requests.status}</th>
                <th>{vi.admin.createdAt}</th>
                <th>{vi.admin.action}</th>
              </tr>
            </thead>
            <tbody>
              {data.recentReports.map((report) => (
                <tr key={report.id}>
                  <td data-label={vi.admin.target}>{report.targetName}</td>
                  <td data-label={vi.reports.reason}>
                    {vi.reports.reasons[report.reason as keyof typeof vi.reports.reasons]}
                  </td>
                  <td data-label={vi.requests.status}>
                    <ReportBadge status={report.status} />
                  </td>
                  <td data-label={vi.admin.createdAt}>{fullTime(report.createdAt)}</td>
                  <td data-label={vi.admin.action}>
                    <Link className="table-link" to={`/admin/reports/${report.id}`}>
                      {vi.common.view}
                      <ArrowRight size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.recentReports.length && <p className="table-empty">{vi.admin.noReports}</p>}
        </div>
      </section>
    </>
  );
}
