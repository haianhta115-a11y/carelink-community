import { NavLink, Outlet } from 'react-router-dom';
import { ClipboardCheck, FileClock, Flag, LayoutDashboard, ShieldCheck, Users, Shapes } from 'lucide-react';
import { vi } from '../locales/vi';
export function AdminLayout() {
  const links = [
    { to: '/admin', text: vi.admin.overview, icon: LayoutDashboard },
    { to: '/admin/users', text: vi.admin.users, icon: Users },
    { to: '/admin/requests', text: vi.admin.requests, icon: ClipboardCheck },
    { to: '/admin/categories', text: vi.catalog.adminTitle, icon: Shapes },
    { to: '/admin/reports', text: vi.admin.reports, icon: Flag },
    { to: '/admin/audit', text: vi.admin.audit, icon: FileClock },
  ];
  return (
    <div className="container admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-title">
          <ShieldCheck size={20} />
          <div>
            <strong>{vi.admin.workspace}</strong>
            <span>{vi.admin.sidebarNote}</span>
          </div>
        </div>
        <nav>
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === '/admin'}>
              <link.icon size={17} />
              {link.text}
            </NavLink>
          ))}
        </nav>
        <p>
          <ShieldCheck size={18} />
          {vi.admin.privacy}
        </p>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
