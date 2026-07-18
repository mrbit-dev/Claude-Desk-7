import { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  PlayCircle,
  Server,
  Settings,
  Bot,
  BookOpen,
  Puzzle,
  FolderOpen,
  UserCircle,
  Rocket,
  Cpu,
  Terminal,
  Search,
  PanelLeft,
  ChevronLeft,
  X,
  MessageSquare,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import clsx from 'clsx';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/sessions', label: 'Sessions', icon: PlayCircle },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/launch', label: 'Launch', icon: Rocket },
  { to: '/terminal', label: 'Terminal', icon: Terminal },
  { to: '/agents', label: 'Agents', icon: Cpu },
  { to: '/mcp-servers', label: 'MCP Servers', icon: Server },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/skills', label: 'Skills', icon: BookOpen },
  { to: '/plugins', label: 'Plugins', icon: Puzzle },
  { to: '/projects', label: 'Projects', icon: FolderOpen },
  { to: '/logs', label: 'Logs', icon: Terminal },
  { to: '/auth', label: 'Auth', icon: UserCircle },
];

// Mobile bottom navigation items (subset)
const mobileNavItems = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/sessions', label: 'Sessions', icon: PlayCircle },
  { to: '/launch', label: 'Launch', icon: Rocket },
  { to: '/agents', label: 'Agents', icon: Cpu },
  { to: '/terminal', label: 'Terminal', icon: Terminal },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const location = useLocation();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close drawer on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, setSidebarOpen]);

  // Close on Escape
  useEffect(() => {
    if (!sidebarOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sidebarOpen, setSidebarOpen]);

  const sidebarContent = (
    <aside
      className={clsx(
        'sidebar-transition flex flex-col border-r border-claude-800 bg-claude-900',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo area */}
      <div className="flex h-14 items-center justify-between border-b border-claude-800 px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-accent" />
            <span className="font-semibold text-gray-100">Claude Desk 7</span>
          </div>
        )}
        {collapsed && <Bot className="mx-auto h-6 w-6 text-accent" />}
        {/* Close button only on mobile drawer */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden rounded-lg p-1 text-gray-500 hover:text-gray-300 hover:bg-claude-800 transition-colors"
          aria-label="Close sidebar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent/10 text-accent'
                    : 'text-gray-400 hover:bg-claude-800 hover:text-gray-200'
                )
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse button */}
      <div className="border-t border-claude-800 p-2 hidden lg:block">
        <button
          onClick={onToggle}
          className={clsx(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-500 transition-colors hover:bg-claude-800 hover:text-gray-300',
            collapsed && 'justify-center'
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeft className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        {sidebarContent}
      </div>

      {/* Mobile drawer overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-black/50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        ref={drawerRef}
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-72 lg:hidden sidebar-transition',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Reuse the same sidebar structure but always expanded on mobile */}
        <aside className="flex flex-col h-full border-r border-claude-800 bg-claude-900 shadow-2xl">
          {/* Logo area */}
          <div className="flex h-14 items-center justify-between border-b border-claude-800 px-4">
            <div className="flex items-center gap-2">
              <Bot className="h-6 w-6 text-accent" />
              <span className="font-semibold text-gray-100">Claude Desk 7</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1.5 text-gray-500 hover:text-gray-300 hover:bg-claude-800 transition-colors"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-accent/10 text-accent'
                        : 'text-gray-400 hover:bg-claude-800 hover:text-gray-200'
                    )
                  }
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </aside>
      </div>

      {/* Mobile bottom navigation */}
      <nav className={clsx(
        'fixed bottom-0 left-0 right-0 z-30 lg:hidden flex items-center justify-around',
        'border-t border-claude-800 bg-claude-900 pb-safe'
      )}>
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={clsx(
                'flex flex-col items-center gap-0.5 py-2 px-3 text-[10px] font-medium transition-colors',
                isActive ? 'text-accent' : 'text-gray-500 hover:text-gray-300'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}
