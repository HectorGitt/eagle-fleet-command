import { useEffect, useState } from 'react';
import { generateTractorTelemetry, type TractorTelemetry } from '@/lib/telemetry';

interface TractorPinProps {
  tractor: TractorTelemetry;
  isActive: boolean;
  onClick: () => void;
}

function TractorPin({ tractor, isActive, onClick }: TractorPinProps) {
  const getStatusColor = () => {
    if (tractor.engineTemp > 105) return 'bg-status-maintenance';
    if (tractor.hydraulicLoad > 90) return 'bg-warning';
    return 'bg-status-operational';
  };

  return (
    <button
      onClick={onClick}
      className={`absolute glass-panel p-3 rounded-lg transition-all duration-300 hover:scale-105 ${
        isActive ? 'ring-2 ring-primary scale-105' : ''
      }`}
      style={{
        left: `${20 + Math.random() * 60}%`,
        top: `${15 + Math.random() * 60}%`,
      }}
    >
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${getStatusColor()} status-pulse`} />
        <span className="text-sm font-medium">{tractor.tractorId}</span>
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        {tractor.engineTemp.toFixed(0)}°C • {tractor.hydraulicLoad.toFixed(0)}%
      </div>
    </button>
  );
}

interface MapAreaProps {
  onTractorSelect: (tractor: TractorTelemetry) => void;
  selectedTractorId: string | null;
}

export function MapArea({ onTractorSelect, selectedTractorId }: MapAreaProps) {
  const [tractors, setTractors] = useState<TractorTelemetry[]>([]);

  useEffect(() => {
    // Initialize tractors
    const initialTractors = Array.from({ length: 8 }, (_, i) =>
      generateTractorTelemetry(`T-${800 + i}`)
    );
    setTractors(initialTractors);

    // Auto-select first tractor
    onTractorSelect(initialTractors[0]);

    // Update telemetry every 3 seconds
    const interval = setInterval(() => {
      setTractors((prev) => prev.map((t) => generateTractorTelemetry(t.tractorId)));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 h-full relative overflow-hidden rounded-lg">
      {/* Map Background Placeholder */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-muted/40 via-background to-muted/60"
        style={{
          backgroundImage: `
            linear-gradient(rgba(45, 80, 22, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(45, 80, 22, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Map Overlay with Grid */}
      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30 pointer-events-none">
        <div className="text-center">
          <p className="text-6xl font-bold">LIVE MAP VIEW</p>
          <p className="text-xl mt-2">Niger State Agricultural Zone</p>
          <p className="text-sm mt-4">9.0°N - 9.5°N, 5.5°E - 6.0°E</p>
        </div>
      </div>

      {/* Tractor Pins */}
      {tractors.map((tractor) => (
        <TractorPin
          key={tractor.tractorId}
          tractor={tractor}
          isActive={tractor.tractorId === selectedTractorId}
          onClick={() => onTractorSelect(tractor)}
        />
      ))}

      {/* Map Controls */}
      <div className="absolute bottom-6 left-6 glass-panel p-3 rounded-lg space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded-full bg-status-operational" />
          <span>Operational</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded-full bg-warning" />
          <span>Warning</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded-full bg-status-maintenance" />
          <span>Maintenance</span>
        </div>
      </div>
    </div>
  );
}
