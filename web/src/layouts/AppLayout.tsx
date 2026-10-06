import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  HandHeart,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Plus,
  Search,
  UserRound,
  ClipboardList,
} from 'lucide-react';
import { Logo } from '../components/ui';
import { Avatar } from '../components/AuthImage';
import { useAuth } from '../features/auth/AuthProvider';
import { vi } from '../locales/vi';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
export function AppLayout() {
  const { user, signOut } = useAuth();
  const unread = useQuery<{ count: number }>({
    queryKey: ['unread'],
    queryFn: async () => (await api.get('/sessions/unread')).data,
    enabled: Boolean(user && user.role !== 'Admin'),
    refetchInterval: 60000,
  });
  if (!user) return null;
  const mine =
    user.role === 'Requester'
      ? { to: '/my-requests', text: vi.nav.mine, icon: ClipboardList }
      : { to: '/my-jobs', text: vi.nav.jobs, icon: HandHeart };
  const links =
    user.role === 'Admin'
      ? [
          { to: '/admin', text: vi.nav.admin, icon: LayoutDashboard },
          { to: '/profile', text: vi.nav.profile, icon: UserRound },
        ]
      : [
          { to: '/requests', text: vi.nav.requests, icon: Search },
          mine,
          { to: '/sessions', text: vi.nav.sessions, icon: MessageCircle },
          { to: '/profile', text: vi.nav.profile, icon: UserRound },
        ];
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="container app-header-inner">
          <Logo />
          <nav>
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.to === '/admin'}>
                <link.icon size={17} />
                {link.text}
                {link.to === '/sessions' && Boolean(unread.data?.count) && (
                  <b className="nav-unread">{unread.data!.count}</b>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="app-account">
            {user.role === 'Requester' && (
              <Link className="btn btn-primary app-create" to="/requests/new">
                <Plus size={17} />
                {vi.requests.create}
              </Link>
            )}
            <Link to="/profile" aria-label={vi.nav.profile}>
              <Avatar user={user} size="small" />
            </Link>
            <button className="icon-button" onClick={signOut} aria-label={vi.nav.logout}>
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </header>
      <Outlet />
      <nav className="bottom-nav">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.to === '/admin'}>
            <link.icon size={20} />
            <span>{link.text}</span>
            {link.to === '/sessions' && Boolean(unread.data?.count) && (
              <b className="nav-unread">{unread.data!.count}</b>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
