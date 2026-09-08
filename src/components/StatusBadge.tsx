import { cn } from '@/lib/utils';

export type StatusTone = 'operational' | 'warning' | 'critical' | 'info' | 'neutral';

const tones: Record<StatusTone, string> = {
    operational: 'bg-status-operational-bg text-status-operational border-status-operational/25',
    warning: 'bg-status-warning-bg text-status-warning border-status-warning/25',
    critical: 'bg-status-maintenance-bg text-status-maintenance border-status-maintenance/25',
    info: 'bg-status-info-bg text-status-info border-status-info/25',
    neutral: 'bg-muted text-muted-foreground border-border',
};

const dots: Record<StatusTone, string> = {
    operational: 'bg-status-operational',
    warning: 'bg-status-warning',
    critical: 'bg-status-maintenance',
    info: 'bg-status-info',
    neutral: 'bg-muted-foreground',
};

/**
 * One shape for every state in the product, so "red" always means the same
 * thing wherever it appears. Previously each page hand-rolled its own badge
 * classes and one of them referenced a colour token that did not exist.
 */
export function StatusBadge({
    tone = 'neutral',
    children,
    dot = false,
    pulse = false,
    className,
}: {
    tone?: StatusTone;
    children: React.ReactNode;
    dot?: boolean;
    pulse?: boolean;
    className?: string;
}) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5',
                'text-[11px] font-medium leading-5 whitespace-nowrap',
                tones[tone],
                className
            )}
        >
            {dot && (
                <span
                    className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dots[tone], pulse && 'status-pulse')}
                />
            )}
            {children}
        </span>
    );
}

/** Bare indicator for table rows, where a full badge would be too heavy */
export function StatusDot({
    tone = 'neutral',
    pulse = false,
    className,
}: {
    tone?: StatusTone;
    pulse?: boolean;
    className?: string;
}) {
    return (
        <span
            className={cn('inline-block h-2 w-2 shrink-0 rounded-full', dots[tone], pulse && 'status-pulse', className)}
        />
    );
}
