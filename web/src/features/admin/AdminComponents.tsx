import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, applyFormError } from '../../api/client';
import { Modal } from '../../components/Modal';
import { Field, FormError } from '../../components/forms';
import { Button } from '../../components/ui';
import { vi } from '../../locales/vi';
import type { ReportStatus } from './types';
export function ReportBadge({ status }: { status: ReportStatus }) {
  return (
    <span className={`badge report-${status}`}>
      <span className="badge-dot" />
      {vi.reports.statuses[status]}
    </span>
  );
}
export function AdminToolbar({
  filters = [],
  search = true,
  dates = false,
}: {
  filters?: { key: string; label: string; options: Record<string, string> }[];
  search?: boolean;
  dates?: boolean;
}) {
  const [params, setParams] = useSearchParams();
  const [keyword, setKeyword] = useState(params.get('keyword') ?? '');
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const current = params.get('keyword') ?? '';
  useEffect(() => {
    setKeyword(current);
    return () => clearTimeout(timer.current);
  }, [current]);
  function update(key: string, value: string) {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete('page');
      return next;
    });
  }
  return (
    <div className="admin-toolbar">
      {search && (
        <div className="search-input">
          <Search size={17} />
          <input
            aria-label={vi.common.search}
            placeholder={vi.admin.searchHint}
            value={keyword}
            onChange={(event) => {
              const value = event.target.value;
              setKeyword(value);
              clearTimeout(timer.current);
              timer.current = setTimeout(() => update('keyword', value), 400);
            }}
          />
        </div>
      )}
      {filters.map((filter) => (
        <div key={filter.key}>
          <label className="sr-only" htmlFor={`admin-filter-${filter.key}`}>
            {filter.label}
          </label>
          <select
            id={`admin-filter-${filter.key}`}
            value={params.get(filter.key) ?? ''}
            onChange={(event) => update(filter.key, event.target.value)}
          >
            <option value="">{filter.label}</option>
            {Object.entries(filter.options).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      ))}
      {dates && (
        <>
          <div className="date-filter">
            <label htmlFor="filter-from">{vi.admin.fromDate}</label>
            <input
              id="filter-from"
              type="date"
              value={params.get('from')?.slice(0, 10) ?? ''}
              onChange={(event) =>
                update('from', event.target.value ? `${event.target.value}T00:00:00+07:00` : '')
              }
            />
          </div>
          <div className="date-filter">
            <label htmlFor="filter-to">{vi.admin.toDate}</label>
            <input
              id="filter-to"
              type="date"
              value={params.get('to')?.slice(0, 10) ?? ''}
              onChange={(event) =>
                update('to', event.target.value ? `${event.target.value}T23:59:59+07:00` : '')
              }
            />
          </div>
        </>
      )}
      {params.toString() && (
        <Button variant="ghost" onClick={() => setParams({})}>
          {vi.requests.clearFilters}
        </Button>
      )}
    </div>
  );
}
const reasonSchema = z.object({
  reason: z.string().trim().min(3, vi.admin.reasonInvalid).max(1000, vi.admin.reasonInvalid),
});
export interface AdminAction {
  path: string;
  title: string;
  targetName: string;
  button: string;
  danger?: boolean;
}
export function ReasonDialog({ action, onClose }: { action: AdminAction | null; onClose: () => void }) {
  const form = useForm<z.infer<typeof reasonSchema>>({
    resolver: zodResolver(reasonSchema),
    defaultValues: { reason: '' },
  });
  const client = useQueryClient();
  useEffect(() => {
    form.reset({ reason: '' });
  }, [action, form]);
  async function submit(input: z.infer<typeof reasonSchema>) {
    if (!action) return;
    try {
      await api.post(`/admin/${action.path}`, input);
      void client.invalidateQueries({ queryKey: ['admin'] });
      void client.invalidateQueries({ queryKey: ['requests'] });
      void client.invalidateQueries({ queryKey: ['request'] });
      toast.success(vi.admin.actionSuccess);
      onClose();
    } catch (error) {
      applyFormError(error, form.setError);
    }
  }
  return (
    <Modal
      open={Boolean(action)}
      title={action?.title ?? ''}
      onClose={() => {
        if (!form.formState.isSubmitting) onClose();
      }}
    >
      <form onSubmit={form.handleSubmit(submit)} noValidate>
        <p>
          {vi.admin.confirmTarget} <strong>{action?.targetName}</strong>
        </p>
        <p className="admin-action-note">
          <ShieldCheck size={14} />
          {vi.admin.auditNotice}
        </p>
        <Field htmlFor="admin-reason" label={vi.admin.reason} error={form.formState.errors.reason?.message}>
          <textarea
            id="admin-reason"
            rows={4}
            maxLength={1000}
            {...form.register('reason')}
            placeholder={vi.admin.reasonHint}
          />
        </Field>
        <FormError message={form.formState.errors.root?.message} />
        <div className="modal-actions">
          <Button type="button" variant="secondary" disabled={form.formState.isSubmitting} onClick={onClose}>
            {vi.common.cancel}
          </Button>
          <Button
            type="submit"
            variant={action?.danger ? 'danger' : 'primary'}
            loading={form.formState.isSubmitting}
          >
            {action?.button}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
