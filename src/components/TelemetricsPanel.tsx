import { useEffect, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, CheckCircle, Gauge, XCircle } from 'lucide-react';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { type TractorTelemetry, predictMaintenance } from '@/lib/telemetry';

interface ChartData {
    time: string;
    value: number;
}

interface MiniChartProps {
    title: string;
    data: ChartData[];
    /** CSS colour, taken from a theme token so it tracks light/dark */
    color: string;
    unit: string;
    currentValue: number;
    /** Distinct DOM id for the gradient - titles with spaces produced invalid ids */
    gradientId: string;
}

function MiniChart({ title, data, color, unit, currentValue, gradientId }: MiniChartProps) {
    return (
        <div className="surface-sunken p-3">
            <div className="mb-1 flex items-baseline justify-between gap-2">
                <h4 className="text-xs font-medium text-muted-foreground">{title}</h4>
                <span className="text-[15px] font-semibold tabular-nums" style={{ color }}>
                    {currentValue.toFixed(1)}
                    <span className="ml-0.5 text-[11px] font-normal text-muted-foreground">{unit}</span>
                </span>
            </div>
            <ResponsiveContainer width="100%" height={64}>
                <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="time" hide />
                    <YAxis hide domain={['dataMin', 'dataMax']} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                            color: 'hsl(var(--popover-foreground))',
                        }}
                        labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={1.75}
                        fill={`url(#${gradientId})`}
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

interface TelemetricsPanelProps {
    tractor: TractorTelemetry | null;
}

export function TelemetricsPanel({ tractor }: TelemetricsPanelProps) {
    const [engineTempHistory, setEngineTempHistory] = useState<ChartData[]>([]);
    const [oilPressureHistory, setOilPressureHistory] = useState<ChartData[]>([]);
    const [hydraulicLoadHistory, setHydraulicLoadHistory] = useState<ChartData[]>([]);
    const [loadValues, setLoadValues] = useState<number[]>([]);

    const selectedId = tractor?.tractorId;

    // Switching machines has to clear the traces, otherwise the new tractor's
    // chart opens with the previous one's history still drawn on it
    useEffect(() => {
        setEngineTempHistory([]);
        setOilPressureHistory([]);
        setHydraulicLoadHistory([]);
        setLoadValues([]);
    }, [selectedId]);

    useEffect(() => {
        if (!tractor) return;

        const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        setEngineTempHistory((prev) => [...prev, { time: timeStr, value: tractor.engineTemp }].slice(-20));
        setOilPressureHistory((prev) => [...prev, { time: timeStr, value: tractor.oilPressure }].slice(-20));
        setHydraulicLoadHistory((prev) => [...prev, { time: timeStr, value: tractor.hydraulicLoad }].slice(-20));
        setLoadValues((prev) => [...prev, tractor.hydraulicLoad].slice(-10));
    }, [tractor]);

    if (!tractor) {
        return (
            <div className="surface flex h-full min-h-[320px] flex-col items-center justify-center gap-2 p-8 text-center">
                <Gauge className="h-7 w-7 text-muted-foreground/50" />
                <p className="text-sm font-medium text-foreground">No machine selected</p>
                <p className="max-w-[220px] text-xs text-muted-foreground">
                    Pick a tractor on the map or in the fleet table to stream its telemetry here.
                </p>
            </div>
        );
    }

    const alert = predictMaintenance(tractor, loadValues);

    const alertTone: StatusTone =
        alert.severity === 'critical' ? 'critical' : alert.severity === 'warning' ? 'warning' : 'operational';

    const alertIcon =
        alert.severity === 'critical' ? <XCircle className="h-4 w-4 text-status-maintenance" />
            : alert.severity === 'warning' ? <AlertTriangle className="h-4 w-4 text-status-warning" />
                : <CheckCircle className="h-4 w-4 text-status-operational" />;

    const alertSurface =
        alert.severity === 'critical' ? 'border-status-maintenance/30 bg-status-maintenance-bg'
            : alert.severity === 'warning' ? 'border-status-warning/30 bg-status-warning-bg'
                : 'border-status-operational/30 bg-status-operational-bg';

    return (
        <div className="surface flex h-full flex-col gap-4 overflow-y-auto p-5">
            <div className="border-b border-border pb-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <h2 className="ident text-base text-foreground">{tractor.tractorId}</h2>
                        <p className="text-xs text-muted-foreground">{tractor.enginePower} HP · {tractor.activity}</p>
                    </div>
                    <StatusBadge tone={alertTone} dot pulse={alert.severity !== 'normal'}>
                        {alert.severity === 'normal' ? 'Nominal' : alert.severity}
                    </StatusBadge>
                </div>
                <div className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                    {tractor.gpsCoordinates.lat.toFixed(4)}°N, {tractor.gpsCoordinates.lng.toFixed(4)}°E
                </div>
            </div>

            <div className="space-y-2.5">
                <MiniChart
                    title="Engine Temperature" gradientId="grad-temp" unit="°C"
                    data={engineTempHistory} currentValue={tractor.engineTemp}
                    color="hsl(var(--status-maintenance))"
                />
                <MiniChart
                    title="Oil Pressure" gradientId="grad-oil" unit="PSI"
                    data={oilPressureHistory} currentValue={tractor.oilPressure}
                    color="hsl(var(--cat-1))"
                />
                <MiniChart
                    title="Hydraulic Load" gradientId="grad-load" unit="%"
                    data={hydraulicLoadHistory} currentValue={tractor.hydraulicLoad}
                    color="hsl(var(--status-warning))"
                />
            </div>

            <div className={`rounded-lg border p-4 ${alertSurface}`}>
                <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 shrink-0">{alertIcon}</span>
                    <div className="min-w-0">
                        <h3 className="eyebrow mb-1 text-foreground/70">EagleAI Diagnostic</h3>
                        <p className="text-[13px] font-medium text-foreground">{alert.message}</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{alert.technicalReason}</p>
                    </div>
                </div>
            </div>

            <div className="mt-auto grid grid-cols-2 gap-2.5">
                <div className="surface-sunken p-3">
                    <p className="eyebrow">Fuel Level</p>
                    <p className="metric-sm mt-1.5">{tractor.fuelLevel.toFixed(0)}%</p>
                </div>
                <div className="surface-sunken p-3">
                    <p className="eyebrow">Last Update</p>
                    <p className="metric-sm mt-1.5">
                        {tractor.timestamp.toLocaleTimeString('en-US', {
                            hour: '2-digit', minute: '2-digit', second: '2-digit',
                        })}
                    </p>
                </div>
            </div>
        </div>
    );
}
