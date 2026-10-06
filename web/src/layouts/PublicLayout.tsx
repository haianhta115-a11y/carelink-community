import { Menu, X, ArrowUpRight, Heart } from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { Logo } from '../components/ui';
import { vi } from '../locales/vi';
import { useAuth, roleHome } from '../features/auth/AuthProvider';

export function PublicLayout() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  return (
    <>
      <header className="public-header">
        <div className="container header-inner">
          <Logo />
          <nav className="desktop-nav">
            <Link to="/" className="active">
              {vi.nav.home}
            </Link>
            <Link to="/requests">{vi.nav.requests}</Link>
            <Link to="/#fields">{vi.catalog.groupLabel}</Link>
            <Link to="/#how-it-works">{vi.nav.how}</Link>
          </nav>
          <div className="header-actions">
            <Link className="login-link" to={user ? roleHome(user.role) : '/login'}>
              {user ? vi.roles[user.role] : vi.nav.login}
            </Link>
            <Link className="btn btn-primary nav-join" to={user ? roleHome(user.role) : '/register'}>
              {user ? vi.nav.requests : vi.nav.join}
              <ArrowUpRight size={17} />
            </Link>
            <button
              className="icon-button mobile-menu"
              aria-label={open ? vi.common.close : vi.nav.home}
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {open && (
          <nav className="mobile-nav" onClick={() => setOpen(false)}>
            <Link to="/requests">{vi.nav.requests}</Link>
            <Link to="/#fields">{vi.catalog.groupLabel}</Link>
            <Link to="/#how-it-works">{vi.nav.how}</Link>
            <Link to="/#about">{vi.nav.about}</Link>
            <Link to={user ? roleHome(user.role) : '/login'}>
              {user ? vi.roles[user.role] : vi.nav.login}
            </Link>
            <Link to="/register">{vi.nav.join}</Link>
          </nav>
        )}
      </header>
      <Outlet />
      <footer className="footer">
        <div className="container">
          <div className="footer-top">
            <div>
              <Logo />
              <p>{vi.slogan}</p>
              <span className="footer-description">{vi.landing.footerBody}</span>
            </div>
            <div className="footer-links">
              <Link to="/#how-it-works">{vi.nav.how}</Link>
              <Link to="/#about">{vi.nav.about}</Link>
              <Link to="/requests">{vi.nav.requests}</Link>
              <Link to="/register">{vi.nav.join}</Link>
            </div>
          </div>
          <div className="footer-bottom">
            <span>{vi.landing.copyright}</span>
            <span>
              <Heart size={13} />
              {vi.landing.footerTeam}
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
