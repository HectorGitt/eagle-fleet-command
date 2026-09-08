import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Home, Map, Wrench, Droplet, Settings, Calendar, Menu, X } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { StatusDot } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navigationItems = [
  { title: 'Fleet Overview', icon: Home, path: '/' },
  { title: 'Live Map', icon: Map, path: '/live-map' },
  { title: 'Maintenance AI', icon: Wrench, path: '/maintenance' },
  { title: 'Scheduling', icon: Calendar, path: '/scheduling' },
  { title: 'Fuel Analytics', icon: Droplet, path: '/fuel-analytics' },
  { title: 'Settings', icon: Settings, path: '/settings' },
];

export function DashboardSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { pathname } = useLocation();

  // Navigating on a phone should dismiss the drawer, not leave it covering
  // the page the user just asked for
  useEffect(() => setIsOpen(false), [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      {/* Drawer trigger, desktop-hidden */}
      <Button
        variant="outline"
        size="icon"
        className="fixed left-4 top-3.5 z-50 h-9 w-9 lg:hidden"
        onClick={() => setIsOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen w-60 flex-col',
          'border-r border-sidebar-border bg-sidebar',
          'transition-transform duration-200 lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-sidebar-border px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg leading-none" aria-hidden>🦅</span>
              <h1 className="truncate text-[15px] font-semibold tracking-tight text-sidebar-accent-foreground">
                EagleSight
              </h1>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Fleet Intelligence</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 lg:hidden"
            onClick={() => setIsOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {navigationItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium',
                'text-sidebar-foreground transition-colors',
                'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
              activeClassName="bg-primary-subtle font-semibold text-primary-glow"
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.title}</span>
            </NavLink>
          ))}
        </nav>

        <div className="space-y-2 border-t border-sidebar-border px-5 py-4 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">System status</span>
            <span className="flex items-center gap-1.5 font-medium text-status-operational">
              <StatusDot tone="operational" pulse />
              Online
            </span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Last sync</span>
            <span>2 min ago</span>
          </div>
        </div>
      </aside>
    </>
  );
}
