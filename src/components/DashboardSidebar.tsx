import { Home, Map, Wrench, Droplet, Settings } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';

const navigationItems = [
  { title: 'Fleet Overview', icon: Home, path: '/' },
  { title: 'Live Map', icon: Map, path: '/map' },
  { title: 'Maintenance AI', icon: Wrench, path: '/maintenance' },
  { title: 'Fuel Analytics', icon: Droplet, path: '/fuel' },
  { title: 'Settings', icon: Settings, path: '/settings' },
];

export function DashboardSidebar() {
  return (
    <aside className="w-64 h-screen fixed left-0 top-0 glass-panel-strong border-r border-border/60 flex flex-col">
      {/* Logo / Brand */}
      <div className="p-6 border-b border-border/40">
        <h1 className="text-2xl font-bold text-primary-glow flex items-center gap-2">
          <span className="text-3xl">🦅</span>
          EagleView
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Fleet Intelligence</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigationItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg',
              'text-sidebar-foreground hover:bg-sidebar-accent',
              'transition-all duration-200'
            )}
            activeClassName="bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-lg shadow-primary/20"
          >
            <item.icon className="w-5 h-5" />
            <span>{item.title}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border/40 text-xs text-muted-foreground">
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>System Status</span>
            <span className="text-success">Online</span>
          </div>
          <div className="flex justify-between">
            <span>Last Sync</span>
            <span>2 min ago</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
