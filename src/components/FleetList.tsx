import { useEffect, useState } from 'react';
import { generateTractorTelemetry, type TractorTelemetry } from '@/lib/telemetry';

interface FleetListProps {
  onTractorSelect: (tractor: TractorTelemetry) => void;
}

export function FleetList({ onTractorSelect }: FleetListProps) {
  const [fleet, setFleet] = useState<TractorTelemetry[]>([]);

  useEffect(() => {
    const tractors = Array.from({ length: 5 }, (_, i) =>
      generateTractorTelemetry(`T-${800 + i}`)
    );
    setFleet(tractors);

    const interval = setInterval(() => {
      setFleet((prev) => prev.map((t) => generateTractorTelemetry(t.tractorId)));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatus = (tractor: TractorTelemetry) => {
    if (tractor.engineTemp > 105) return 'Maintenance';
    if (tractor.hydraulicLoad > 90) return 'Warning';
    return 'Operational';
  };

  const getStatusColor = (status: string) => {
    if (status === 'Maintenance') return 'text-status-maintenance';
    if (status === 'Warning') return 'text-warning';
    return 'text-status-operational';
  };

  const drivers = ['J. Okonkwo', 'A. Adeyemi', 'M. Ibrahim', 'C. Nwosu', 'F. Bello'];
  const locations = ['Field A-12', 'Field B-08', 'Field C-15', 'Field A-09', 'Field D-03'];

  return (
    <div className="glass-panel-strong rounded-lg p-6">
      <h3 className="text-lg font-bold mb-4 text-foreground">Active Fleet</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40 text-muted-foreground">
              <th className="text-left py-3 px-4">Tractor ID</th>
              <th className="text-left py-3 px-4">Driver</th>
              <th className="text-left py-3 px-4">Location</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-left py-3 px-4">Temp</th>
              <th className="text-left py-3 px-4">Next Service</th>
              <th className="text-left py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {fleet.map((tractor, index) => {
              const status = getStatus(tractor);
              const nextService = new Date();
              nextService.setDate(nextService.getDate() + Math.floor(Math.random() * 30 + 10));

              return (
                <tr
                  key={tractor.tractorId}
                  className="border-b border-border/20 hover:bg-muted/20 cursor-pointer transition-colors"
                  onClick={() => onTractorSelect(tractor)}
                >
                  <td className="py-3 px-4 font-medium text-foreground">{tractor.tractorId}</td>
                  <td className="py-3 px-4 text-muted-foreground">{drivers[index]}</td>
                  <td className="py-3 px-4 text-muted-foreground">{locations[index]}</td>
                  <td className={`py-3 px-4 font-medium ${getStatusColor(status)}`}>{status}</td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {tractor.engineTemp.toFixed(0)}°C
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {nextService.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="py-3 px-4">
                    <button className="text-primary hover:text-primary-glow transition-colors">
                      View →
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
