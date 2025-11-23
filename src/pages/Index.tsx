import { useState } from 'react';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { TopBar } from '@/components/TopBar';
import MapArea from '@/components/MapArea';
import { TelemetricsPanel } from '@/components/TelemetricsPanel';
import { FleetList } from '@/components/FleetList';
import { type TractorTelemetry } from '@/lib/telemetry';

const Index = () => {
  const [selectedTractor, setSelectedTractor] = useState<TractorTelemetry | null>(null);

  return (
    <div className="min-h-screen w-full bg-background">
      <DashboardSidebar />

      {/* Main Content Area */}
      <div className="ml-64 min-h-screen flex flex-col">
        <TopBar />

        {/* Split View: Map (65%) + Telematics (35%) */}
        <div className="flex-1 flex p-6 gap-6">
          {/* Map Section */}
          <div className="flex-[65] min-h-[500px]">
            <MapArea
              onTractorSelect={setSelectedTractor}
              selectedTractorId={selectedTractor?.tractorId || null}
            />
          </div>

          {/* Telematics Panel */}
          <div className="flex-[35] min-h-[500px]">
            <TelemetricsPanel tractor={selectedTractor} />
          </div>
        </div>

        {/* Fleet List */}
        <div className="px-6 pb-6">
          <FleetList onTractorSelect={setSelectedTractor} />
        </div>
      </div>
    </div>
  );
};

export default Index;
