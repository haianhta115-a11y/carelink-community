import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useRef } from 'react';
import { Camera, Check, KeyRound, ShieldCheck, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { api, apiError, applyFormError } from '../api/client';
import type { Auth, User } from '../api/types';
import { useAuth } from '../features/auth/AuthProvider';
import { passwordSchema, phoneSchema } from '../features/auth/schemas';
import { Field, FormError, PasswordField } from '../components/forms';
import { Avatar } from '../components/AuthImage';
import { Button } from '../components/ui';
import { vi } from '../locales/vi';
const profileSchema = z.object({
  fullName: z.string().trim().min(2, vi.auth.nameInvalid).max(80),
  phone: phoneSchema,
  address: z.string().trim().max(200, vi.profile.addressInvalid),
});
const changeSchema = z
  .object({
    currentPassword: z.string().min(1, vi.common.required),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: vi.auth.passwordMismatch,
    path: ['confirmPassword'],
  });
export function ProfilePage() {
  const { user, updateUser, signIn } = useAuth();
  const [tab, setTab] = useState('profile');
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: user?.fullName, phone: user?.phone ?? '', address: user?.address ?? '' },
  });
  const password = useForm<z.infer<typeof changeSchema>>({
    resolver: zodResolver(changeSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });
  if (!user) return null;
  async function save(input: z.infer<typeof profileSchema>) {
    try {
      const { data } = await api.put<User>('/profile', input);
      updateUser(data);
      toast.success(vi.profile.saved);
    } catch (error) {
      applyFormError(error, form.setError);
    }
  }
  async function change(input: z.infer<typeof changeSchema>) {
    try {
      const { data } = await api.put<Auth>('/profile/password', input);
      signIn(data);
      password.reset();
      toast.success(vi.profile.passwordChanged);
    } catch (error) {
      applyFormError(error, password.setError);
    }
  }
  async function avatar(file?: File) {
    if (!file) return;
    if (file.size > 2097152 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error(vi.profile.avatarHint);
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append('image', file);
      const { data } = await api.put<User>('/profile/avatar', body);
      updateUser({ ...data, avatarUrl: data.avatarUrl ? `${data.avatarUrl}?v=${Date.now()}` : null });
      toast.success(vi.profile.avatarSaved);
    } catch (error) {
      toast.error(apiError(error));
    } finally {
      setUploading(false);
    }
  }
  return (
    <main className="container page profile-page">
      <div className="page-heading">
        <div className="eyebrow">{vi.profile.eyebrow}</div>
        <h1>{vi.nav.profile}</h1>
        <p>{vi.profile.body}</p>
      </div>
      <div className="profile-grid">
        <aside className="profile-summary panel">
          <div className="profile-avatar">
            <Avatar user={user} size="large" />
            <button
              className="icon-button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              aria-label={vi.profile.changeAvatar}
            >
              <Camera size={17} />
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => void avatar(event.target.files?.[0])}
            />
          </div>
          <h2>{user.fullName}</h2>
          <span className="role-badge">{vi.roles[user.role]}</span>
          <p>{user.email}</p>
          <div className="profile-privacy">
            <ShieldCheck size={21} />
            <p>{vi.profile.privacy}</p>
          </div>
        </aside>
        <section className="panel profile-content">
          <div className="panel-tabs">
            <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>
              <UserRound size={17} />
              {vi.profile.info}
            </button>
            <button className={tab === 'password' ? 'active' : ''} onClick={() => setTab('password')}>
              <KeyRound size={17} />
              {vi.profile.security}
            </button>
          </div>
          {tab === 'profile' ? (
            <form onSubmit={form.handleSubmit(save)} noValidate>
              <Field
                htmlFor="fullName"
                label={vi.common.fullName}
                error={form.formState.errors.fullName?.message}
              >
                <input id="fullName" {...form.register('fullName')} />
              </Field>
              <Field htmlFor="email" label={vi.common.email} hint={vi.profile.fixedEmail}>
                <input id="email" value={user.email} disabled />
              </Field>
              <Field htmlFor="phone" label={vi.common.phone} error={form.formState.errors.phone?.message}>
                <input id="phone" type="tel" {...form.register('phone')} />
              </Field>
              <Field
                htmlFor="address"
                label={vi.common.address}
                error={form.formState.errors.address?.message}
              >
                <textarea id="address" rows={3} {...form.register('address')} />
              </Field>
              <FormError message={form.formState.errors.root?.message} />
              <Button loading={form.formState.isSubmitting} type="submit">
                <Check size={17} />
                {vi.common.save}
              </Button>
              <small className="field-hint">{vi.profile.avatarHint}</small>
            </form>
          ) : (
            <form onSubmit={password.handleSubmit(change)} noValidate>
              <p className="security-note">{vi.profile.passwordNote}</p>
              <Field
                htmlFor="currentPassword"
                label={vi.profile.currentPassword}
                error={password.formState.errors.currentPassword?.message}
              >
                <PasswordField
                  id="currentPassword"
                  autoComplete="current-password"
                  {...password.register('currentPassword')}
                />
              </Field>
              <Field
                htmlFor="newPassword"
                label={vi.profile.newPassword}
                error={password.formState.errors.newPassword?.message}
              >
                <PasswordField
                  id="newPassword"
                  autoComplete="new-password"
                  {...password.register('newPassword')}
                />
              </Field>
              <Field
                htmlFor="confirmPassword"
                label={vi.auth.confirmPassword}
                error={password.formState.errors.confirmPassword?.message}
              >
                <PasswordField
                  id="confirmPassword"
                  autoComplete="new-password"
                  {...password.register('confirmPassword')}
                />
              </Field>
              <FormError message={password.formState.errors.root?.message} />
              <Button loading={password.formState.isSubmitting} type="submit">
                {vi.profile.changePassword}
              </Button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
