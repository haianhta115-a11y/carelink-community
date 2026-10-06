import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Send, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { api, applyFormError } from '../api/client';
import type { SupportRequest } from '../api/types';
import { useCategories } from '../features/requests/hooks';
import { Field, FormError } from '../components/forms';
import { BackLink, Button } from '../components/ui';
import { vi } from '../locales/vi';
const schema = z.object({
  title: z.string().trim().min(5, vi.requests.titleInvalid).max(120, vi.requests.titleInvalid),
  description: z
    .string()
    .trim()
    .min(20, vi.requests.descriptionInvalid)
    .max(2000, vi.requests.descriptionInvalid),
  categoryId: z.coerce.number().min(1, vi.requests.categoryInvalid),
  location: z.string().trim().min(3, vi.requests.locationInvalid).max(200, vi.requests.locationInvalid),
  urgency: z.enum(['Low', 'Normal', 'High', 'Critical']),
});
export function NewRequestPage() {
  const categories = useCategories();
  const navigate = useNavigate();
  const client = useQueryClient();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', description: '', categoryId: 0, location: '', urgency: 'Normal' },
  });
  const description = form.watch('description');
  async function submit(input: z.infer<typeof schema>) {
    try {
      const { data } = await api.post<SupportRequest>('/requests', input);
      void client.invalidateQueries({ queryKey: ['requests'] });
      toast.success(vi.requests.created);
      navigate(`/requests/${data.id}`);
    } catch (error) {
      applyFormError(error, form.setError);
    }
  }
  return (
    <main className="container page">
      <BackLink to="/my-requests" />
      <div className="page-heading">
        <div className="eyebrow">{vi.requests.newEyebrow}</div>
        <h1>{vi.requests.newTitle}</h1>
        <p>{vi.requests.newBody}</p>
      </div>
      <div className="new-request-grid">
        <form className="panel new-request-form" onSubmit={form.handleSubmit(submit)} noValidate>
          <Field htmlFor="title" label={vi.requests.titleLabel} error={form.formState.errors.title?.message}>
            <input
              id="title"
              placeholder={vi.requests.titleHint}
              maxLength={120}
              {...form.register('title')}
            />
          </Field>
          <div className="form-row">
            <Field
              htmlFor="categoryId"
              label={vi.requests.category}
              error={form.formState.errors.categoryId?.message}
            >
              <select id="categoryId" {...form.register('categoryId')}>
                <option value="0">{vi.requests.chooseCategory}</option>
                {categories.data?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field htmlFor="urgency" label={vi.requests.urgency}>
              <select id="urgency" {...form.register('urgency')}>
                {Object.entries(vi.urgencies).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field
            htmlFor="location"
            label={vi.requests.locationLabel}
            error={form.formState.errors.location?.message}
            hint={vi.requests.locationPrivacy}
          >
            <input id="location" placeholder={vi.requests.locationExample} {...form.register('location')} />
          </Field>
          <Field
            htmlFor="description"
            label={vi.requests.descriptionLabel}
            error={form.formState.errors.description?.message}
          >
            <textarea
              id="description"
              rows={7}
              placeholder={vi.requests.descriptionHint}
              maxLength={2000}
              {...form.register('description')}
            />
            <span className="field-hint char-count">{description.length}/2000</span>
          </Field>
          <div className="inline-notice">
            <ShieldCheck size={17} />
            <p>{vi.requests.sensitiveNote}</p>
          </div>
          <FormError message={form.formState.errors.root?.message} />
          <div className="form-actions">
            <Button type="button" variant="ghost" onClick={() => navigate('/my-requests')}>
              {vi.common.cancel}
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              <Send size={17} />
              {vi.requests.publish}
            </Button>
          </div>
        </form>
        <aside className="new-request-aside">
          <div className="tips-card panel">
            <span className="tip-icon">
              <ShieldCheck size={26} />
            </span>
            <h3>{vi.requests.tipsTitle}</h3>
            {vi.requests.tips.map((tip, i) => (
              <div className="tip-line" key={tip}>
                <span>0{i + 1}</span>
                <p>{tip}</p>
              </div>
            ))}
          </div>
          <div className="emergency-note">
            <AlertTriangle size={23} />
            <p>{vi.landing.safety}</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
