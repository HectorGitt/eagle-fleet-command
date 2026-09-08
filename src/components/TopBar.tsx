import { useFleet } from '@/context/FleetContext';
import { StatusDot } from '@/components/StatusBadge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';

/** A tractor is running hot enough to need attention now */
const isCritical = (engineTemp: number) => engineTemp > 105;

function Metric({
    label,
    value,
    tone = 'neutral',
}: {
    label: string;
    value: string;
    tone?: 'neutral' | 'critical';
}) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-muted-foreground">
                {label}
            </span>
            <span
                className={cn(
                    'text-[15px] font-semibold leading-none tracking-tight',
                    tone === 'critical' ? 'text-status-maintenance' : 'text-foreground'
                )}
            >
                {value}
            </span>
        </div>
    );
}

/**
 * A thin status strip, not a second dashboard.
 *
 * The old bar rendered three large KPI tiles with hardcoded values - 42 units,
 * 88%, 2 alerts - directly above pages that computed the real figures from
 * telemetry and disagreed with it. These come from the same context the pages
 * read, so the header can no longer contradict the page under it.
 */
export function TopBar() {
    const { tractors } = useFleet();

    const total = tractors.length;
    const active = tractors.filter(
        (t) => t.activity !== 'Idle' && t.activity !== 'Maintenance'
    ).length;
    const alerts = tractors.filter((t) => isCritical(t.engineTemp)).length;
    const utilization = total > 0 ? Math.round((active / total) * 100) : 0;

    return (
        <header
            className={cn(
                'sticky top-0 z-30 flex h-14 items-center justify-between gap-4',
                'border-b border-border bg-background/85 backdrop-blur',
                'pl-16 pr-4 lg:px-6' // room for the drawer trigger below lg
            )}
        >
            <div className="flex min-w-0 items-center gap-2">
                <StatusDot tone="operational" pulse />
                <span className="truncate text-xs text-muted-foreground">
                    Live telemetry active
                </span>
            </div>

            <div className="flex items-center gap-5 sm:gap-7">
                <div className="hidden items-center gap-5 sm:flex sm:gap-7">
                    <Metric label="Active" value={total > 0 ? `${active}/${total}` : '—'} />
                    <Metric label="Utilization" value={total > 0 ? `${utilization}%` : '—'} />
                </div>
                <Metric
                    label="Alerts"
                    value={total > 0 ? String(alerts) : '—'}
                    tone={alerts > 0 ? 'critical' : 'neutral'}
                />
                <ThemeToggle />
            </div>
        </header>
    );
}
