import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, HandHeart, HeartHandshake, ShieldCheck, Sprout } from 'lucide-react';
import { toast } from 'sonner';
import { api, applyFormError } from '../api/client';
import type { Auth } from '../api/types';
import { Button, Logo } from '../components/ui';
import { Field, FormError, PasswordField } from '../components/forms';
import { useAuth, roleHome } from '../features/auth/AuthProvider';
import { loginSchema, registerSchema } from '../features/auth/schemas';
import { safeReturnPath } from '../lib/auth-storage';
import { vi } from '../locales/vi';
function AuthAside() {
  return (
    <aside className="auth-aside">
      <Logo light />
      <div className="auth-aside-content">
        <span className="auth-flower">
          <Sprout size={55} strokeWidth={1.3} />
        </span>
        <h2>{vi.auth.asideTitle}</h2>
        <p>{vi.auth.asideBody}</p>
        <div>
          <ShieldCheck size={19} />
          <span>{vi.auth.asideTrust}</span>
        </div>
      </div>
      <span className="auth-aside-footer">{vi.slogan}</span>
      <span className="auth-orbit" />
    </aside>
  );
}
export function LoginPage() {
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  async function submit(input: z.infer<typeof loginSchema>) {
    try {
      const { data } = await api.post<Auth>('/auth/login', input);
      signIn(data);
      toast.success(vi.auth.loginSuccess);
      navigate(safeReturnPath(params.get('returnTo'), roleHome(data.user.role)), { replace: true });
    } catch (error) {
      applyFormError(error, form.setError);
    }
  }
  return (
    <main className="auth-page">
      <AuthAside />
      <div className="auth-main">
        <Link className="auth-back" to="/">
          ← {vi.auth.backHome}
        </Link>
        <div className="auth-form-wrap">
          <span className="eyebrow">{vi.auth.welcome}</span>
          <h1>{vi.auth.loginTitle}</h1>
          <p className="auth-intro">{vi.auth.loginBody}</p>
          <form onSubmit={form.handleSubmit(submit)} noValidate>
            <Field htmlFor="email" label={vi.common.email} error={form.formState.errors.email?.message}>
              <input
                id="email"
                autoComplete="email"
                type="email"
                placeholder={vi.auth.emailHint}
                {...form.register('email')}
              />
            </Field>
            <Field
              htmlFor="password"
              label={vi.common.password}
              error={form.formState.errors.password?.message}
            >
              <PasswordField
                id="password"
                autoComplete="current-password"
                placeholder={vi.auth.passwordHint}
                {...form.register('password')}
              />
            </Field>
            <FormError message={form.formState.errors.root?.message} />
            <Button type="submit" loading={form.formState.isSubmitting} className="w-full">
              {vi.nav.login}
              <ArrowRight size={18} />
            </Button>
          </form>
          <p className="auth-switch">
            {vi.auth.noAccount} <Link to="/register">{vi.auth.registerNow}</Link>
          </p>
          <div className="demo-box">
            <strong>{vi.auth.demoTitle}</strong>
            <p>{vi.auth.demoBody}</p>
            <div className="demo-buttons">
              {(['Requester', 'Helper', 'Admin'] as const).map((role) => (
                <button
                  type="button"
                  key={role}
                  onClick={() => {
                    form.setValue(
                      'email',
                      role === 'Admin' ? 'admin@carelink.vn' : role.toLowerCase() + '1@carelink.vn',
                    );
                    form.setValue('password', role === 'Admin' ? 'Admin@12345' : 'Demo@12345');
                    form.clearErrors();
                  }}
                >
                  {vi.roles[role]}
                </button>
              ))}
            </div>
            <small>{vi.auth.demoNote}</small>
          </div>
        </div>
      </div>
    </main>
  );
}
export function RegisterPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      role: params.get('role') === 'Requester' ? 'Requester' : 'Helper',
    },
  });
  const role = form.watch('role');
  async function submit(input: z.infer<typeof registerSchema>) {
    try {
      await api.post('/auth/register', input);
      toast.success(vi.auth.registerSuccess);
      navigate('/login');
    } catch (error) {
      applyFormError(error, form.setError);
    }
  }
  return (
    <main className="auth-page register-page">
      <AuthAside />
      <div className="auth-main">
        <Link className="auth-back" to="/">
          ← {vi.auth.backHome}
        </Link>
        <div className="auth-form-wrap">
          <span className="eyebrow">{vi.auth.registerEyebrow}</span>
          <h1>{vi.auth.registerTitle}</h1>
          <p className="auth-intro">{vi.auth.registerBody}</p>
          <form onSubmit={form.handleSubmit(submit)} noValidate>
            <fieldset className="role-fieldset">
              <legend>{vi.auth.roleLabel}</legend>
              <div className="role-cards">
                {(['Requester', 'Helper'] as const).map((value, i) => {
                  const Icon = i === 0 ? HeartHandshake : HandHeart;
                  return (
                    <label key={value} className={role === value ? 'role-card selected' : 'role-card'}>
                      <input type="radio" value={value} {...form.register('role')} />
                      <Icon size={25} />
                      <strong>{vi.auth.roleTitles[i]}</strong>
                      <span>{vi.auth.roleDescriptions[i]}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <Field
              htmlFor="fullName"
              label={vi.common.fullName}
              error={form.formState.errors.fullName?.message}
            >
              <input
                id="fullName"
                autoComplete="name"
                placeholder={vi.auth.nameHint}
                {...form.register('fullName')}
              />
            </Field>
            <Field htmlFor="email" label={vi.common.email} error={form.formState.errors.email?.message}>
              <input
                id="email"
                autoComplete="email"
                type="email"
                placeholder={vi.auth.emailHint}
                {...form.register('email')}
              />
            </Field>
            <div className="form-row">
              <Field
                htmlFor="password"
                label={vi.common.password}
                error={form.formState.errors.password?.message}
              >
                <PasswordField id="password" autoComplete="new-password" {...form.register('password')} />
              </Field>
              <Field
                htmlFor="confirmPassword"
                label={vi.auth.confirmPassword}
                error={form.formState.errors.confirmPassword?.message}
              >
                <PasswordField
                  id="confirmPassword"
                  autoComplete="new-password"
                  {...form.register('confirmPassword')}
                />
              </Field>
            </div>
            <p className="password-policy">{vi.auth.passwordPolicy}</p>
            <Field
              htmlFor="phone"
              label={`${vi.common.phone} (${vi.common.optional})`}
              error={form.formState.errors.phone?.message}
            >
              <input
                id="phone"
                autoComplete="tel"
                type="tel"
                placeholder={vi.auth.phoneHint}
                {...form.register('phone')}
              />
            </Field>
            <FormError message={form.formState.errors.root?.message} />
            <Button type="submit" loading={form.formState.isSubmitting} className="w-full">
              {vi.auth.registerButton}
              <ArrowRight size={18} />
            </Button>
            <p className="auth-privacy">
              <ShieldCheck size={14} />
              {vi.auth.privacy}
            </p>
          </form>
          <p className="auth-switch">
            {vi.auth.hasAccount} <Link to="/login">{vi.nav.login}</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
