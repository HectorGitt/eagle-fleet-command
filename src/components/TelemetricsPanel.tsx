import { useEffect, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { type TractorTelemetry, predictMaintenance } from '@/lib/telemetry';

interface ChartData {
  time: string;
  value: number;
}

interface MiniChartProps {
  title: string;
  data: ChartData[];
  color: string;
  unit: string;
  currentValue: number;
}

function MiniChart({ title, data, color, unit, currentValue }: MiniChartProps) {
  return (
    <div className="glass-panel p-4 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-medium text-foreground">{title}</h4>
        <span className="text-lg font-bold" style={{ color }}>
          {currentValue.toFixed(1)} {unit}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={80}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
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
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#gradient-${title})`}
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

  useEffect(() => {
    if (!tractor) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    setEngineTempHistory((prev) =>
      [...prev, { time: timeStr, value: tractor.engineTemp }].slice(-20)
    );
    setOilPressureHistory((prev) =>
      [...prev, { time: timeStr, value: tractor.oilPressure }].slice(-20)
    );
    setHydraulicLoadHistory((prev) =>
      [...prev, { time: timeStr, value: tractor.hydraulicLoad }].slice(-20)
    );
    setLoadValues((prev) => [...prev, tractor.hydraulicLoad].slice(-10));
  }, [tractor]);

  if (!tractor) {
    return (
      <div className="w-full h-full glass-panel-strong rounded-lg p-8 flex items-center justify-center">
        <p className="text-muted-foreground">Select a tractor to view telemetrics</p>
      </div>
    );
  }

  const alert = predictMaintenance(tractor, loadValues);

  const getAlertIcon = () => {
    if (alert.severity === 'critical') return <XCircle className="w-5 h-5 text-destructive" />;
    if (alert.severity === 'warning')
      return <AlertTriangle className="w-5 h-5 text-warning" />;
    return <CheckCircle className="w-5 h-5 text-success" />;
  };

  const getAlertStyle = () => {
    if (alert.severity === 'critical')
      return 'bg-destructive/20 border-destructive/50 text-destructive';
    if (alert.severity === 'warning') return 'bg-warning/20 border-warning/50 text-warning';
    return 'bg-success/20 border-success/50 text-success';
  };

  return (
    <div className="w-full h-full glass-panel-strong rounded-lg p-6 flex flex-col gap-6 overflow-y-auto">
      {/* Header */}
      <div className="border-b border-border/40 pb-4">
        <h2 className="text-2xl font-bold text-foreground">{tractor.tractorId}</h2>
        <p className="text-sm text-muted-foreground">John Deere 6M Series</p>
        <div className="mt-2 text-xs text-muted-foreground">
          📍 {tractor.gpsCoordinates.lat.toFixed(4)}°N, {tractor.gpsCoordinates.lng.toFixed(4)}°E
        </div>
      </div>

      {/* Charts */}
      <div className="space-y-4">
        <MiniChart
          title="Engine Temperature"
          data={engineTempHistory}
          color="#ef4444"
          unit="°C"
          currentValue={tractor.engineTemp}
        />
        <MiniChart
          title="Oil Pressure"
          data={oilPressureHistory}
          color="#3b82f6"
          unit="PSI"
          currentValue={tractor.oilPressure}
        />
        <MiniChart
          title="Hydraulic Load"
          data={hydraulicLoadHistory}
          color="#f59e0b"
          unit="%"
          currentValue={tractor.hydraulicLoad}
        />
      </div>

      {/* AI Diagnostic Alert */}
      <div className={`glass-panel p-5 rounded-lg border-2 ${getAlertStyle()}`}>
        <div className="flex items-start gap-3">
          {getAlertIcon()}
          <div className="flex-1">
            <h3 className="font-bold text-sm mb-1">🦅 EagleAI Diagnostic</h3>
            <p className="font-medium mb-2">{alert.message}</p>
            <p className="text-xs opacity-90 leading-relaxed">{alert.technicalReason}</p>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-panel p-3 rounded-lg">
          <p className="text-xs text-muted-foreground">Fuel Level</p>
          <p className="text-xl font-bold text-foreground">{tractor.fuelLevel.toFixed(0)}%</p>
        </div>
        <div className="glass-panel p-3 rounded-lg">
          <p className="text-xs text-muted-foreground">Last Update</p>
          <p className="text-xl font-bold text-foreground">
            {tractor.timestamp.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
