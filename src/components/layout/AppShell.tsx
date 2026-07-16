import { useUIStore } from '../../store/uiStore';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import clsx from 'clsx';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { sidebarCollapsed, toggleSidebar, theme } = useUIStore();

  return (
    <div className={clsx(
      'flex h-screen overflow-hidden',
      theme === 'light' ? 'bg-claude-950' : 'bg-claude-950'
    )}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
      />
      <div className="flex flex-1 flex-col min-w-0">
        <Header />
        <main className={clsx(
          'flex-1 overflow-y-auto',
          'pb-16 lg:pb-6 p-6' // pb-16 for mobile bottom nav
        )}>
          {children}
        </main>
      </div>
    </div>
  );
}
