import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, FileCheck2, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { api, applyFormError } from '../api/client';
import type { Report } from '../features/admin/types';
import { useAdminQuery } from '../features/admin/hooks';
import { ReportBadge } from '../features/admin/AdminComponents';
import { BackLink, Button, ErrorState, LoadingCards } from '../components/ui';
import { Field, FormError } from '../components/forms';
import { ConfirmModal } from '../components/Modal';
import { fullTime } from '../lib/time';
import { vi } from '../locales/vi';
const schema = z.object({
  status: z.enum(['Reviewing', 'Resolved', 'Rejected']),
  adminNote: z.string().trim().min(3, vi.admin.reasonInvalid).max(1000, vi.admin.reasonInvalid),
  action: z.enum(['', 'HideRequest', 'LockUser']),
});
type Values = z.infer<typeof schema>;
export function AdminReportDetailPage() {
  const { id } = useParams();
  const query = useAdminQuery<Report>(`reports/${id}`);
  const client = useQueryClient();
  const [confirmation, setConfirmation] = useState<Values | null>(null);
  const [busy, setBusy] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'Reviewing', adminNote: '', action: '' },
  });
  const reportStatus = query.data?.status;
  useEffect(() => {
    if (reportStatus)
      form.reset({
        status: reportStatus === 'Pending' ? 'Reviewing' : 'Resolved',
        adminNote: '',
        action: '',
      });
  }, [reportStatus, form]);
  if (query.isPending) return <LoadingCards />;
  if (query.isError || !query.data) return <ErrorState retry={() => void query.refetch()} />;
  const report = query.data;
  const closed = report.status === 'Resolved' || report.status === 'Rejected';
  async function resolve() {
    if (!confirmation) return;
    setBusy(true);
    try {
      await api.post(`/admin/reports/${id}/resolve`, {
        ...confirmation,
        action: confirmation.status === 'Resolved' ? confirmation.action || null : null,
      });
      void client.invalidateQueries({ queryKey: ['admin'] });
      toast.success(vi.admin.reportSaved);
      setConfirmation(null);
    } catch (error) {
      applyFormError(error, form.setError);
      setConfirmation(null);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <BackLink to="/admin/reports" />
      <div className="page-heading">
        <span className="eyebrow">{vi.admin.eyebrow}</span>
        <h1>{vi.admin.reportDetail}</h1>
        <p>{vi.admin.reportDetailBody}</p>
      </div>
      <div className="report-detail-grid">
        <section className="panel report-detail">
          <div className="report-detail-top">
            <span className="report-icon">
              <Flag size={22} />
            </span>
            <ReportBadge status={report.status} />
          </div>
          <h2>{report.targetName}</h2>
          <dl>
            <div>
              <dt>{vi.admin.target}</dt>
              <dd>{vi.reports.targetTypes[report.targetType]}</dd>
            </div>
            <div>
              <dt>{vi.admin.reporter}</dt>
              <dd>{report.reporterName}</dd>
            </div>
            <div>
              <dt>{vi.reports.reason}</dt>
              <dd>{vi.reports.reasons[report.reason as keyof typeof vi.reports.reasons]}</dd>
            </div>
            <div>
              <dt>{vi.admin.createdAt}</dt>
              <dd>{fullTime(report.createdAt)}</dd>
            </div>
          </dl>
          <h3>{vi.reports.description}</h3>
          <p className="report-description">{report.description}</p>
          <Link
            className="text-link"
            to={
              report.targetRequestId
                ? `/requests/${report.targetRequestId}`
                : `/admin/users?keyword=${encodeURIComponent(report.targetName)}`
            }
          >
            {vi.admin.viewTarget}
            <ArrowUpRight size={16} />
          </Link>
          {report.adminNote && (
            <div className="handled-report">
              <h3>{vi.admin.previousNote}</h3>
              <p>{report.adminNote}</p>
              <small>
                {report.handledByName} · {report.handledAt && fullTime(report.handledAt)}
              </small>
            </div>
          )}
        </section>
        <section className="panel report-resolve">
          <FileCheck2 size={29} />
          <h2>{closed ? vi.admin.reportClosed : vi.admin.processReport}</h2>
          {closed ? (
            <p>{vi.admin.reportClosedBody}</p>
          ) : (
            <form onSubmit={form.handleSubmit((value) => setConfirmation(value))} noValidate>
              <Field htmlFor="resolve-status" label={vi.admin.newStatus}>
                <select id="resolve-status" {...form.register('status')}>
                  {report.status === 'Pending' ? (
                    <option value="Reviewing">{vi.reports.statuses.Reviewing}</option>
                  ) : (
                    <>
                      <option value="Resolved">{vi.reports.statuses.Resolved}</option>
                      <option value="Rejected">{vi.reports.statuses.Rejected}</option>
                    </>
                  )}
                </select>
              </Field>
              <Field
                htmlFor="adminNote"
                label={vi.admin.adminNote}
                error={form.formState.errors.adminNote?.message}
              >
                <textarea
                  id="adminNote"
                  rows={5}
                  maxLength={1000}
                  placeholder={vi.admin.noteHint}
                  {...form.register('adminNote')}
                />
              </Field>
              {report.status === 'Reviewing' && form.watch('status') === 'Resolved' && (
                <Field htmlFor="resolve-action" label={vi.admin.moderationAction}>
                  <select id="resolve-action" {...form.register('action')}>
                    <option value="">{vi.admin.noAdditionalAction}</option>
                    {report.targetRequestId && <option value="HideRequest">{vi.admin.hide}</option>}
                    <option value="LockUser">{vi.admin.lockTarget}</option>
                  </select>
                </Field>
              )}
              <FormError message={form.formState.errors.root?.message} />
              <Button type="submit" className="w-full">
                {vi.admin.saveProcessing}
              </Button>
            </form>
          )}
        </section>
      </div>
      <ConfirmModal
        open={Boolean(confirmation)}
        title={vi.admin.confirmProcessing}
        body={vi.admin.resolveConfirmation}
        onClose={() => setConfirmation(null)}
        loading={busy}
        onConfirm={() => void resolve()}
        confirmLabel={vi.admin.saveProcessing}
      />
    </>
  );
}
