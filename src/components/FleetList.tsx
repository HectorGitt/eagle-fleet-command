import { useEffect, useState } from 'react';
import { useFleet } from '@/context/FleetContext';
import { Section } from '@/components/AppShell';
import { StatusBadge, StatusDot, type StatusTone } from '@/components/StatusBadge';
import { ChevronRight } from 'lucide-react';
import { type TractorTelemetry } from '@/lib/telemetry';

interface FleetListProps {
  onTractorSelect: (tractor: TractorTelemetry) => void;
}

const statusFor = (tractor: TractorTelemetry): { label: string; tone: StatusTone } => {
  if (tractor.engineTemp > 105) return { label: 'Maintenance', tone: 'critical' };
  if (tractor.hydraulicLoad > 90) return { label: 'Warning', tone: 'warning' };
  return { label: 'Operational', tone: 'operational' };
};

const drivers = ['J. Okonkwo', 'A. Adeyemi', 'M. Ibrahim', 'C. Nwosu', 'F. Bello'];
const locations = ['Field A-12', 'Field B-08', 'Field C-15', 'Field A-09', 'Field D-03'];

export function FleetList({ onTractorSelect }: FleetListProps) {
  // Read the shared context rather than running a second telemetry simulation.
  // The old local interval meant this table and the map showed different
  // readings for the same machine at the same moment.
  const { tractors } = useFleet();
  const fleet = tractors.slice(0, 5);

  // Service dates were recomputed with Math.random() on every render, so they
  // reshuffled every few seconds. Fix them once per tractor instead.
  const [serviceDates, setServiceDates] = useState<Record<string, string>>({});
  useEffect(() => {
    setServiceDates((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const tractor of fleet) {
        if (!next[tractor.tractorId]) {
          const due = new Date();
          due.setDate(due.getDate() + Math.floor(Math.random() * 30 + 10));
          next[tractor.tractorId] = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [fleet]);

  return (
    <Section title="Active Fleet" description="Top 5 units by identifier">
      <div className="-mx-5 overflow-x-auto px-5">
        <table className="data-table min-w-[760px]">
          <thead>
            <tr>
              <th>Tractor</th>
              <th>Driver</th>
              <th>Location</th>
              <th>Status</th>
              <th>Engine Temp</th>
              <th>Next Service</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {fleet.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  Waiting for telemetry…
                </td>
              </tr>
            )}
            {fleet.map((tractor, index) => {
              const status = statusFor(tractor);
              return (
                <tr
                  key={tractor.tractorId}
                  className="cursor-pointer"
                  onClick={() => onTractorSelect(tractor)}
                >
                  <td>
                    <span className="flex items-center gap-2">
                      <StatusDot tone={status.tone} pulse={status.tone === 'operational'} />
                      <span className="ident text-foreground">{tractor.tractorId}</span>
                    </span>
                  </td>
                  <td className="text-muted-foreground">{drivers[index]}</td>
                  <td className="text-muted-foreground">{locations[index]}</td>
                  <td><StatusBadge tone={status.tone}>{status.label}</StatusBadge></td>
                  <td className={tractor.engineTemp > 105 ? 'font-semibold text-status-maintenance' : 'text-foreground'}>
                    {tractor.engineTemp.toFixed(0)}°C
                  </td>
                  <td className="text-muted-foreground">{serviceDates[tractor.tractorId] ?? '—'}</td>
                  <td className="text-right">
                    <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
