import { Activity, AlertTriangle, TrendingUp } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  variant?: 'default' | 'warning';
}

function StatCard({ label, value, icon, variant = 'default' }: StatCardProps) {
  return (
    <div className="glass-panel px-6 py-3 rounded-lg flex items-center gap-4">
      <div
        className={`p-2 rounded-lg ${
          variant === 'warning' ? 'bg-warning/20 text-warning' : 'bg-primary/20 text-primary-glow'
        }`}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function TopBar() {
  return (
    <div className="h-20 glass-panel-strong border-b border-border/60 flex items-center justify-between px-8">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-success status-pulse" />
        <span className="text-sm text-muted-foreground">Live Telemetry Active</span>
      </div>

      <div className="flex items-center gap-6">
        <StatCard label="Active Units" value={42} icon={<Activity className="w-5 h-5" />} />
        <StatCard
          label="Fleet Utilization"
          value="88%"
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          label="Critical Alerts"
          value={2}
          icon={<AlertTriangle className="w-5 h-5" />}
          variant="warning"
        />
      </div>
    </div>
  );
}
