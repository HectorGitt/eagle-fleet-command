import { ReactNode } from 'react';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { TopBar } from '@/components/TopBar';
import { cn } from '@/lib/utils';

interface AppShellProps {
    children: ReactNode;
    /** Set for full-bleed pages (the live map) that manage their own padding */
    bare?: boolean;
}

/**
 * The page frame every route shares.
 *
 * Each page used to repeat this scaffold by hand, which is how they drifted
 * apart: different paddings, different max widths, and a hardcoded `ml-64`
 * that broke the moment the viewport dropped below the sidebar's width.
 */
export function AppShell({ children, bare = false }: AppShellProps) {
    return (
        <div className="min-h-screen bg-background">
            <DashboardSidebar />

            {/* The sidebar is fixed on desktop and off-canvas below lg, so the
                content offset has to disappear at the same breakpoint */}
            <div className="lg:pl-60 flex min-h-screen flex-col">
                <TopBar />
                <main className={cn('flex-1', !bare && 'p-5 lg:p-7')}>
                    <div className={cn(!bare && 'mx-auto w-full max-w-[1600px]')}>
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}

interface PageHeaderProps {
    title: string;
    description?: string;
    icon?: ReactNode;
    actions?: ReactNode;
}

export function PageHeader({ title, description, icon, actions }: PageHeaderProps) {
    return (
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                    {icon && <span className="text-primary [&>svg]:h-5 [&>svg]:w-5">{icon}</span>}
                    <h1 className="text-[22px] font-semibold tracking-tight text-foreground">{title}</h1>
                </div>
                {description && (
                    <p className="mt-1.5 max-w-2xl text-[13px] text-muted-foreground">{description}</p>
                )}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
    );
}

export function Section({
    title,
    description,
    actions,
    children,
    className,
}: {
    title?: string;
    description?: string;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section className={cn('surface p-5', className)}>
            {(title || actions) && (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                        {title && <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>}
                        {description && (
                            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
                        )}
                    </div>
                    {actions && <div className="flex items-center gap-2">{actions}</div>}
                </div>
            )}
            {children}
        </section>
    );
}
