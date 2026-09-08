import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import MapArea from '@/components/MapArea';
import { TelemetricsPanel } from '@/components/TelemetricsPanel';
import { FleetList } from '@/components/FleetList';
import { type TractorTelemetry } from '@/lib/telemetry';

const Index = () => {
  const [selectedTractor, setSelectedTractor] = useState<TractorTelemetry | null>(null);

  return (
    <AppShell>
      {/* Map and telemetry sit side by side on wide screens and stack below xl,
          where a 35% column would be too narrow to read a chart in */}
      <div className="flex flex-col gap-4 xl:flex-row">
        <div className="min-h-[420px] flex-1 xl:min-h-[560px] xl:basis-[62%]">
          <MapArea
            onTractorSelect={setSelectedTractor}
            selectedTractorId={selectedTractor?.tractorId || null}
          />
        </div>
        <div className="min-h-[420px] xl:min-h-[560px] xl:basis-[38%]">
          <TelemetricsPanel tractor={selectedTractor} />
        </div>
      </div>

      <div className="mt-4">
        <FleetList onTractorSelect={setSelectedTractor} />
      </div>
    </AppShell>
  );
};

export default Index;
