import { NavLink } from 'react-router-dom';
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
} from 'lucide-react';
import clsx from 'clsx';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
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

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
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
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
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
      <div className="border-t border-claude-800 p-2">
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
}
