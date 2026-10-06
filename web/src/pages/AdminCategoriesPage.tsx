import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api, applyFormError } from '../api/client';
import type { Category, Page } from '../api/types';
import { useAdminQuery } from '../features/admin/hooks';
import { AdminToolbar } from '../features/admin/AdminComponents';
import { Button, EmptyState, ErrorState, LoadingCards } from '../components/ui';
import { CategoryIcon, Pagination } from '../components/RequestComponents';
import { categoryIcons } from '../components/category-icons';
import { Modal } from '../components/Modal';
import { Field, FormError } from '../components/forms';
import { vi } from '../locales/vi';
interface AdminCategory extends Category {
  isActive: boolean;
  sortOrder: number;
}
const schema = z.object({
  name: z.string().trim().min(2, vi.catalog.nameInvalid).max(80, vi.catalog.nameInvalid),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, vi.catalog.slugInvalid),
  icon: z.string().min(2),
  groupKey: z.string().min(1),
  description: z
    .string()
    .trim()
    .min(10, vi.catalog.descriptionInvalid)
    .max(200, vi.catalog.descriptionInvalid),
  sortOrder: z.coerce.number().int().min(0).max(10000),
  isActive: z.boolean(),
});
export function AdminCategoriesPage() {
  const [params, setParams] = useSearchParams();
  const query = useAdminQuery<Page<AdminCategory>>('categories', params.toString());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategory>();
  const client = useQueryClient();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      slug: '',
      icon: 'Sparkles',
      groupKey: 'daily',
      description: '',
      sortOrder: 100,
      isActive: true,
    },
  });
  useEffect(() => {
    form.reset(
      editing ?? {
        name: '',
        slug: '',
        icon: 'Sparkles',
        groupKey: 'daily',
        description: '',
        sortOrder: 100,
        isActive: true,
      },
    );
  }, [editing, open, form]);
  async function submit(input: z.infer<typeof schema>) {
    try {
      if (editing) await api.put(`/admin/categories/${editing.id}`, input);
      else await api.post('/admin/categories', input);
      void client.invalidateQueries({ queryKey: ['admin'] });
      void client.invalidateQueries({ queryKey: ['categories'] });
      void client.invalidateQueries({ queryKey: ['public-categories'] });
      toast.success(vi.catalog.saved);
      setOpen(false);
    } catch (error) {
      applyFormError(error, form.setError);
    }
  }
  return (
    <>
      <div className="page-heading category-admin-heading">
        <div>
          <span className="eyebrow">{vi.admin.eyebrow}</span>
          <h1>{vi.catalog.adminTitle}</h1>
          <p>{vi.catalog.adminBody}</p>
        </div>
        <Button
          onClick={() => {
            setEditing(undefined);
            setOpen(true);
          }}
        >
          <Plus size={17} />
          {vi.catalog.add}
        </Button>
      </div>
      <section className="panel">
        <AdminToolbar filters={[{ key: 'group', label: vi.catalog.allGroups, options: vi.catalog.groups }]} />
        {query.isPending ? (
          <LoadingCards />
        ) : query.isError ? (
          <ErrorState retry={() => void query.refetch()} />
        ) : !query.data.items.length ? (
          <EmptyState title={vi.catalog.noResults} />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{vi.catalog.name}</th>
                  <th>{vi.catalog.groupLabel}</th>
                  <th>{vi.requests.status}</th>
                  <th>{vi.admin.action}</th>
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((category) => (
                  <tr key={category.id}>
                    <td data-label={vi.catalog.name}>
                      <div className="table-category">
                        <span>
                          <CategoryIcon name={category.icon} size={20} />
                        </span>
                        <div>
                          <strong>{category.name}</strong>
                          <small>{category.description}</small>
                        </div>
                      </div>
                    </td>
                    <td data-label={vi.catalog.groupLabel}>
                      {vi.catalog.groups[category.groupKey as keyof typeof vi.catalog.groups]}
                    </td>
                    <td data-label={vi.requests.status}>
                      <span className={`badge account-${category.isActive ? 'Active' : 'Locked'}`}>
                        {category.isActive ? vi.admin.userStatuses.Active : vi.admin.hidden}
                      </span>
                    </td>
                    <td data-label={vi.admin.action}>
                      <button
                        className="table-link"
                        onClick={() => {
                          setEditing(category);
                          setOpen(true);
                        }}
                      >
                        <Pencil size={14} />
                        {vi.catalog.edit}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {query.data && (
        <Pagination
          page={query.data.page}
          totalPages={query.data.totalPages}
          onChange={(page) =>
            setParams((previous) => {
              const next = new URLSearchParams(previous);
              next.set('page', String(page));
              return next;
            })
          }
        />
      )}
      <Modal
        open={open}
        title={editing ? vi.catalog.edit : vi.catalog.add}
        onClose={() => {
          if (!form.formState.isSubmitting) setOpen(false);
        }}
      >
        <form onSubmit={form.handleSubmit(submit)} noValidate>
          <Field label={vi.catalog.name} htmlFor="category-name" error={form.formState.errors.name?.message}>
            <input id="category-name" {...form.register('name')} />
          </Field>
          <Field label={vi.catalog.slug} htmlFor="category-slug" error={form.formState.errors.slug?.message}>
            <input id="category-slug" {...form.register('slug')} />
          </Field>
          <div className="form-row">
            <Field label={vi.catalog.groupLabel} htmlFor="category-group">
              <select id="category-group" {...form.register('groupKey')}>
                {Object.entries(vi.catalog.groups).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={vi.catalog.icon} htmlFor="category-icon">
              <select id="category-icon" {...form.register('icon')}>
                {Object.keys(categoryIcons).map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field
            label={vi.catalog.description}
            htmlFor="category-description"
            error={form.formState.errors.description?.message}
          >
            <textarea id="category-description" rows={3} maxLength={200} {...form.register('description')} />
          </Field>
          <Field
            label={vi.catalog.order}
            htmlFor="category-order"
            error={form.formState.errors.sortOrder?.message}
          >
            <input id="category-order" type="number" {...form.register('sortOrder')} />
          </Field>
          <label className="checkbox-label">
            <input type="checkbox" {...form.register('isActive')} />
            {vi.catalog.active}
          </label>
          <FormError message={form.formState.errors.root?.message} />
          <div className="modal-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={form.formState.isSubmitting}
            >
              {vi.common.cancel}
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              {vi.common.save}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
