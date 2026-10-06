import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Flag } from 'lucide-react';
import { toast } from 'sonner';
import { api, applyFormError } from '../../api/client';
import { useAuth } from '../auth/AuthProvider';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/ui';
import { Field, FormError } from '../../components/forms';
import { vi } from '../../locales/vi';
const schema = z.object({
  reason: z.enum(['FakeRequest', 'Inappropriate', 'Harassment', 'Spam', 'PersonalDataLeak', 'Other']),
  description: z
    .string()
    .trim()
    .min(10, vi.reports.descriptionInvalid)
    .max(1000, vi.reports.descriptionInvalid),
});
export function ReportButton({ targetType, id }: { targetType: 'Request' | 'User'; id: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { reason: 'Other', description: '' },
  });
  if (!user || user.role === 'Admin' || (targetType === 'User' && user.id === id)) return null;
  async function submit(input: z.infer<typeof schema>) {
    try {
      await api.post('/reports', {
        ...input,
        targetType,
        targetRequestId: targetType === 'Request' ? id : null,
        targetUserId: targetType === 'User' ? id : null,
      });
      toast.success(vi.reports.sent);
      form.reset();
      setOpen(false);
    } catch (error) {
      applyFormError(error, form.setError);
    }
  }
  return (
    <>
      <button className="report-button" onClick={() => setOpen(true)}>
        <Flag size={14} />
        {targetType === 'User' ? vi.reports.reportUser : vi.reports.reportRequest}
      </button>
      <Modal
        open={open}
        title={vi.reports.title}
        onClose={() => {
          if (!form.formState.isSubmitting) setOpen(false);
        }}
      >
        <p>{vi.reports.body}</p>
        <form onSubmit={form.handleSubmit(submit)} noValidate>
          <Field htmlFor="report-reason" label={vi.reports.reason}>
            <select id="report-reason" {...form.register('reason')}>
              {Object.entries(vi.reports.reasons).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            htmlFor="report-description"
            label={vi.reports.description}
            error={form.formState.errors.description?.message}
          >
            <textarea id="report-description" rows={4} maxLength={1000} {...form.register('description')} />
          </Field>
          <FormError message={form.formState.errors.root?.message} />
          <div className="modal-actions">
            <Button
              variant="secondary"
              type="button"
              disabled={form.formState.isSubmitting}
              onClick={() => setOpen(false)}
            >
              {vi.common.cancel}
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              {vi.reports.send}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
