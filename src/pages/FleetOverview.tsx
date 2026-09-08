import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFleet } from "@/context/FleetContext";
import { AppShell, PageHeader, Section } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { StatusBadge, StatusDot, type StatusTone } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { TrendingUp, AlertTriangle, CheckCircle, Tractor, Leaf, Activity, MapPin, Thermometer, Droplet, Gauge } from "lucide-react";
import { toast } from "sonner";
import { type TractorTelemetry } from "@/lib/telemetry";

/** Activity to status meaning. One mapping, used by the dot, badge and sheet. */
const activityTone = (activity: string): StatusTone => {
  switch (activity) {
    case "Maintenance": return "critical";
    case "Idle": return "warning";
    case "Ploughing":
    case "Harrowing":
    case "Transport": return "operational";
    default: return "neutral";
  }
};

const FleetOverview = () => {
  const { tractors } = useFleet();
  const navigate = useNavigate();
  const [selectedTractor, setSelectedTractor] = useState<TractorTelemetry | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const totalUnits = tractors.length;
  const activeUnits = tractors.filter(t => t.activity !== 'Idle' && t.activity !== 'Maintenance').length;
  const inMaintenance = tractors.filter(t => t.activity === 'Maintenance').length;
  // Guard the first render, before the telemetry context has populated
  const utilizationRate = totalUnits > 0 ? Math.round((activeUnits / totalUnits) * 100) : 0;

  const totalWorkDone = tractors.reduce((acc, t) => acc + t.workDone, 0);
  const totalFuelConsumed = tractors.reduce((acc, t) => acc + t.fuelConsumed, 0);
  const avgEfficiency = totalFuelConsumed > 0 ? (totalWorkDone / totalFuelConsumed).toFixed(2) : "0.00";

  const handleViewDetails = (tractor: TractorTelemetry) => {
    setSelectedTractor(tractor);
    setIsSheetOpen(true);
  };

  const handleMaintenance = (id: string) => {
    toast.info(`Opening maintenance for ${id}`);
    navigate(`/maintenance?tractorId=${id}`);
  };

  return (
    <AppShell>
      <PageHeader
        title="Fleet Overview"
        description="Real-time operational intelligence and fleet status"
        icon={<Tractor />}
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Fleet Utilization"
          value={`${utilizationRate}%`}
          icon={<CheckCircle />}
          tone="operational"
          detail={
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {activeUnits} of {totalUnits || "—"} units working
            </span>
          }
        />
        <StatCard
          label="Total Work Done"
          value={totalWorkDone.toFixed(1)}
          unit="ha"
          icon={<Tractor />}
          detail={`Across ${totalUnits || "—"} units`}
        />
        <StatCard
          label="Avg Efficiency"
          value={avgEfficiency}
          unit="ha/L"
          icon={<Leaf />}
          detail="Work per litre burnt"
        />
        <StatCard
          label="In Maintenance"
          value={inMaintenance}
          icon={<AlertTriangle />}
          tone={inMaintenance > 0 ? "critical" : "neutral"}
          detail={inMaintenance > 0 ? "Units out of service" : "Whole fleet available"}
        />
      </div>

      <Section title="Live Fleet Status" description="Updates every 3 seconds">
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="data-table min-w-[900px]">
            <thead>
              <tr>
                <th>Tractor</th>
                <th>Activity</th>
                <th>Location (GPS)</th>
                <th>Engine Load</th>
                <th>Fuel</th>
                <th>Work Done</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tractors.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    Waiting for telemetry…
                  </td>
                </tr>
              )}
              {tractors.map((tractor) => {
                const tone = activityTone(tractor.activity);
                const overheating = tractor.engineTemp > 105;
                const lowFuel = tractor.fuelLevel < 20;

                return (
                  <tr key={tractor.tractorId}>
                    <td>
                      <div className="flex items-center gap-2">
                        <StatusDot tone={tone} pulse={tone === "operational"} />
                        <div className="min-w-0">
                          <div className="ident text-foreground">{tractor.tractorId}</div>
                          <div className="text-[11px] text-muted-foreground">{tractor.enginePower} HP</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <StatusBadge tone={tone}>{tractor.activity}</StatusBadge>
                    </td>
                    <td>
                      <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {tractor.gpsCoordinates.lat.toFixed(4)}, {tractor.gpsCoordinates.lng.toFixed(4)}
                      </span>
                    </td>
                    <td>
                      <span className="flex items-center gap-2">
                        <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className={overheating ? "font-semibold text-status-maintenance" : "text-foreground"}>
                          {tractor.hydraulicLoad.toFixed(0)}%
                        </span>
                      </span>
                    </td>
                    <td>
                      <span className={lowFuel ? "font-semibold text-status-warning" : "text-foreground"}>
                        {tractor.fuelLevel.toFixed(0)}%
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.min(100, (tractor.workDone / tractor.farmSize) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {tractor.workDone.toFixed(1)}/{tractor.farmSize} ha
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1.5">
                        <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs"
                          onClick={() => handleViewDetails(tractor)}>
                          Details
                        </Button>
                        <Button variant="ghost" size="sm"
                          className="h-7 px-2.5 text-xs text-status-maintenance hover:bg-status-maintenance/10 hover:text-status-maintenance"
                          onClick={() => handleMaintenance(tractor.tractorId)}>
                          Service
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-[520px]">
          <SheetHeader className="mb-5">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <Tractor className="h-5 w-5 text-primary" />
              <span className="ident text-base">{selectedTractor?.tractorId}</span>
            </SheetTitle>
            <SheetDescription>Detailed telemetry and operational status</SheetDescription>
          </SheetHeader>

          {selectedTractor && (
            <div className="space-y-6">
              <div className="surface-sunken flex items-center justify-between p-3">
                <span className="text-xs text-muted-foreground">Current status</span>
                <StatusBadge tone={activityTone(selectedTractor.activity)} dot>
                  {selectedTractor.activity}
                </StatusBadge>
              </div>

              <div>
                <h3 className="eyebrow mb-3">Engine Vitals</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: <Thermometer />, label: "Engine Temp", value: `${selectedTractor.engineTemp.toFixed(1)}°C`, alert: selectedTractor.engineTemp > 105 },
                    { icon: <Droplet />, label: "Oil Pressure", value: `${selectedTractor.oilPressure.toFixed(1)} PSI`, alert: false },
                    { icon: <Gauge />, label: "Hydraulic Load", value: `${selectedTractor.hydraulicLoad.toFixed(1)}%`, alert: selectedTractor.hydraulicLoad > 90 },
                    { icon: <Activity />, label: "Engine Power", value: `${selectedTractor.enginePower} HP`, alert: false },
                  ].map((v) => (
                    <Card key={v.label} className="border-border bg-card-elevated p-3 shadow-none">
                      <div className="mb-1.5 flex items-center gap-1.5 text-muted-foreground [&>svg]:h-3.5 [&>svg]:w-3.5">
                        {v.icon}
                        <span className="text-[11px]">{v.label}</span>
                      </div>
                      <div className={`metric-sm ${v.alert ? "text-status-maintenance" : ""}`}>{v.value}</div>
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="eyebrow mb-3">Performance</h3>
                <div className="space-y-4">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Fuel level</span>
                      <span className="font-semibold text-foreground">{selectedTractor.fuelLevel.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${selectedTractor.fuelLevel < 20 ? 'bg-status-warning' : 'bg-primary'}`}
                        style={{ width: `${selectedTractor.fuelLevel}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Work progress</span>
                      <span className="font-semibold text-foreground">
                        {selectedTractor.workDone.toFixed(1)} / {selectedTractor.farmSize} ha
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-status-operational"
                        style={{ width: `${Math.min(100, (selectedTractor.workDone / selectedTractor.farmSize) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="eyebrow mb-3">Location</h3>
                <div className="surface-sunken flex items-center justify-between gap-3 p-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <MapPin className="h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-foreground">GPS coordinates</div>
                      <div className="truncate font-mono text-[11px] text-muted-foreground">
                        {selectedTractor.gpsCoordinates.lat.toFixed(6)}, {selectedTractor.gpsCoordinates.lng.toFixed(6)}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="h-7 shrink-0 text-xs" onClick={() => navigate('/live-map')}>
                    View on map
                  </Button>
                </div>
              </div>

              <SheetFooter>
                <Button className="w-full" onClick={() => handleMaintenance(selectedTractor.tractorId)}>
                  Schedule maintenance
                </Button>
              </SheetFooter>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
};

export default FleetOverview;
