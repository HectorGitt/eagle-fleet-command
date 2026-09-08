import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type StatTone = 'neutral' | 'operational' | 'warning' | 'critical' | 'info';

const toneIcon: Record<StatTone, string> = {
    neutral: 'bg-muted text-muted-foreground',
    operational: 'bg-status-operational/12 text-status-operational',
    warning: 'bg-status-warning/12 text-status-warning',
    critical: 'bg-status-maintenance/12 text-status-maintenance',
    info: 'bg-status-info/12 text-status-info',
};

const toneValue: Record<StatTone, string> = {
    neutral: 'text-foreground',
    operational: 'text-foreground',
    warning: 'text-foreground',
    critical: 'text-status-maintenance',
    info: 'text-foreground',
};

interface StatCardProps {
    label: string;
    value: ReactNode;
    /** Rendered small and muted beside the value, e.g. "Liters", "ha/L" */
    unit?: string;
    /** One line of context under the figure */
    detail?: ReactNode;
    icon?: ReactNode;
    tone?: StatTone;
    className?: string;
}

/**
 * The KPI tile. This markup was duplicated eleven times across the pages, which
 * is why the tiles had drifted into four slightly different paddings and three
 * different value sizes.
 *
 * Tone drives only the icon chip and, for `critical`, the figure itself - the
 * card never floods with colour, so a red figure still stands out on a page
 * full of tiles.
 */
export function StatCard({
    label,
    value,
    unit,
    detail,
    icon,
    tone = 'neutral',
    className,
}: StatCardProps) {
    return (
        <div className={cn('surface p-4', className)}>
            <div className="flex items-start justify-between gap-3">
                <span className="eyebrow">{label}</span>
                {icon && (
                    <span
                        className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-md [&>svg]:h-4 [&>svg]:w-4',
                            toneIcon[tone]
                        )}
                    >
                        {icon}
                    </span>
                )}
            </div>

            <div className="mt-3 flex items-baseline gap-1.5">
                <span className={cn('metric', toneValue[tone])}>{value}</span>
                {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
            </div>

            {detail && <div className="mt-2 text-xs text-muted-foreground">{detail}</div>}
        </div>
    );
}
