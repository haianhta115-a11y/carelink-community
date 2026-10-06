import { Component, type ErrorInfo, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { ArrowLeft, HeartHandshake, LoaderCircle, RefreshCw, SearchX } from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { vi } from '../locales/vi';

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className={clsx('logo', light && 'logo-light')} aria-label={vi.brand}>
      <span className="logo-mark">
        <HeartHandshake size={25} strokeWidth={1.9} />
      </span>
      <span>
        Care<span className="logo-link">Link</span>
        <span className="logo-dot">.</span>
      </span>
    </Link>
  );
}
export function Button({
  children,
  loading,
  variant = 'primary',
  className,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}) {
  return (
    <button {...props} disabled={disabled || loading} className={clsx('btn', `btn-${variant}`, className)}>
      {loading && <LoaderCircle className="spin" size={18} />}
      {children}
    </button>
  );
}
export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <SearchX size={32} />
      </span>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}
export function LoadingCards() {
  return (
    <div className="request-grid" aria-label={vi.common.loading}>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton h-5 w-24" />
          <div className="skeleton h-6 w-3/4" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}
export function ErrorState({ retry }: { retry: () => void }) {
  return (
    <EmptyState
      title={vi.common.network}
      action={
        <Button variant="secondary" onClick={retry}>
          <RefreshCw size={17} />
          {vi.common.retry}
        </Button>
      }
    />
  );
}
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error.message, info.componentStack);
  }
  render() {
    return this.state.failed ? (
      <main className="container page">
        <EmptyState
          title={vi.errors.INTERNAL_ERROR}
          action={<Button onClick={() => window.location.reload()}>{vi.common.retry}</Button>}
        />
      </main>
    ) : (
      this.props.children
    );
  }
}
export function BackLink({ to }: { to: string }) {
  return (
    <Link to={to} className="back-link">
      <ArrowLeft size={17} />
      {vi.common.back}
    </Link>
  );
}
