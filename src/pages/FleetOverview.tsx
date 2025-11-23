import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFleet } from "@/context/FleetContext";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { TopBar } from "@/components/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Tractor, Leaf, Activity, MapPin, Thermometer, Droplet, Gauge } from "lucide-react";
import { toast } from "sonner";
import { type TractorTelemetry } from "@/lib/telemetry";

const FleetOverview = () => {
  const { tractors } = useFleet();
  const navigate = useNavigate();
  const [selectedTractor, setSelectedTractor] = useState<TractorTelemetry | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Calculate KPIs dynamically
  const totalUnits = tractors.length;
  const activeUnits = tractors.filter(t => t.activity !== 'Idle' && t.activity !== 'Maintenance').length;
  const inMaintenance = tractors.filter(t => t.activity === 'Maintenance').length;
  const utilizationRate = Math.round((activeUnits / totalUnits) * 100);

  const totalWorkDone = tractors.reduce((acc, t) => acc + t.workDone, 0);
  const totalFuelConsumed = tractors.reduce((acc, t) => acc + t.fuelConsumed, 0);
  const avgEfficiency = totalFuelConsumed > 0 ? (totalWorkDone / totalFuelConsumed).toFixed(2) : "0.00";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Ploughing":
      case "Harrowing":
      case "Transport": return "bg-status-operational";
      case "Maintenance": return "bg-status-maintenance";
      case "Idle": return "bg-status-warning";
      default: return "bg-muted";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Ploughing":
      case "Harrowing":
      case "Transport": return <Badge className="bg-status-operational/20 text-status-operational border-status-operational">{status}</Badge>;
      case "Maintenance": return <Badge className="bg-status-maintenance/20 text-status-maintenance border-status-maintenance">Maintenance</Badge>;
      case "Idle": return <Badge className="bg-status-warning/20 text-status-warning border-status-warning">Idle</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const handleViewDetails = (tractor: TractorTelemetry) => {
    setSelectedTractor(tractor);
    setIsSheetOpen(true);
  };

  const handleMaintenance = (id: string) => {
    toast.info(`Redirecting to maintenance for Tractor ${id}...`);
    navigate(`/maintenance?tractorId=${id}`);
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <DashboardSidebar />

      <div className="flex-1 flex flex-col ml-64">
        <TopBar />

        <main className="flex-1 p-6 overflow-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">Fleet Overview</h1>
            <p className="text-muted-foreground">Real-time operational intelligence and fleet status</p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="glass-panel p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Fleet Utilization</span>
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
              <div className="text-3xl font-bold text-foreground">{utilizationRate}%</div>
              <div className="flex items-center mt-2 text-xs text-status-operational">
                <TrendingUp className="w-3 h-3 mr-1" />
                <span>{activeUnits} active units</span>
              </div>
            </Card>

            <Card className="glass-panel p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total Work Done</span>
                <Tractor className="w-5 h-5 text-status-operational" />
              </div>
              <div className="text-3xl font-bold text-foreground">{totalWorkDone.toFixed(1)} ha</div>
              <div className="flex items-center mt-2 text-xs text-muted-foreground">
                <span>Across {totalUnits} units</span>
              </div>
            </Card>

            <Card className="glass-panel p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Avg Efficiency</span>
                <Leaf className="w-5 h-5 text-status-warning" />
              </div>
              <div className="text-3xl font-bold text-foreground">{avgEfficiency} ha/L</div>
              <div className="flex items-center mt-2 text-xs text-status-operational">
                <TrendingUp className="w-3 h-3 mr-1" />
                <span>Optimized</span>
              </div>
            </Card>

            <Card className="glass-panel p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Maintenance</span>
                <AlertTriangle className="w-5 h-5 text-status-maintenance" />
              </div>
              <div className="text-3xl font-bold text-foreground">{inMaintenance}</div>
              <div className="flex items-center mt-2 text-xs text-muted-foreground">
                <span>Units in service</span>
              </div>
            </Card>
          </div>

          {/* Fleet Status Table */}
          <Card className="glass-panel p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Live Fleet Status</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Tractor ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Activity</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Location (GPS)</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Engine Load</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Fuel Level</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Work Done</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tractors.map((tractor) => (
                    <tr key={tractor.tractorId} className="border-b border-border/30 hover:bg-accent/5 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(tractor.activity)} status-pulse`} />
                          <span className="font-mono font-semibold text-foreground">{tractor.tractorId}</span>
                        </div>
                        <div className="text-xs text-muted-foreground ml-4">{tractor.enginePower} HP</div>
                      </td>
                      <td className="py-4 px-4">{getStatusBadge(tractor.activity)}</td>
                      <td className="py-4 px-4 text-muted-foreground font-mono text-xs">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {tractor.gpsCoordinates.lat.toFixed(4)}, {tractor.gpsCoordinates.lng.toFixed(4)}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-muted-foreground" />
                          <span className={tractor.engineTemp > 105 ? "text-status-maintenance font-semibold" : "text-foreground"}>
                            {tractor.hydraulicLoad.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={tractor.fuelLevel < 20 ? "text-status-warning font-semibold" : "text-foreground"}>
                          {tractor.fuelLevel.toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-foreground font-medium">{tractor.workDone.toFixed(1)} / {tractor.farmSize} ha</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => handleViewDetails(tractor)}
                          >
                            Details
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-status-maintenance hover:text-status-maintenance hover:bg-status-maintenance/10"
                            onClick={() => handleMaintenance(tractor.tractorId)}
                          >
                            Service
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </main>

        {/* Tractor Details Sheet */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
            <SheetHeader className="mb-6">
              <SheetTitle className="text-2xl font-bold flex items-center gap-2">
                <Tractor className="w-6 h-6 text-primary" />
                {selectedTractor?.tractorId}
              </SheetTitle>
              <SheetDescription>
                Detailed telemetry and operational status
              </SheetDescription>
            </SheetHeader>

            {selectedTractor && (
              <div className="space-y-6">
                {/* Status Badge */}
                <div className="flex items-center justify-between p-4 bg-accent/10 rounded-lg border border-border/50">
                  <span className="text-sm font-medium text-muted-foreground">Current Status</span>
                  {getStatusBadge(selectedTractor.activity)}
                </div>

                {/* Engine Vital Signs */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Engine Vitals</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-4 bg-card/50 border-border/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Thermometer className="w-4 h-4 text-status-warning" />
                        <span className="text-xs text-muted-foreground">Engine Temp</span>
                      </div>
                      <div className="text-2xl font-bold text-foreground">{selectedTractor.engineTemp.toFixed(1)}°C</div>
                    </Card>
                    <Card className="p-4 bg-card/50 border-border/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Droplet className="w-4 h-4 text-status-maintenance" />
                        <span className="text-xs text-muted-foreground">Oil Pressure</span>
                      </div>
                      <div className="text-2xl font-bold text-foreground">{selectedTractor.oilPressure.toFixed(1)} PSI</div>
                    </Card>
                    <Card className="p-4 bg-card/50 border-border/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Gauge className="w-4 h-4 text-primary" />
                        <span className="text-xs text-muted-foreground">Hydraulic Load</span>
                      </div>
                      <div className="text-2xl font-bold text-foreground">{selectedTractor.hydraulicLoad.toFixed(1)}%</div>
                    </Card>
                    <Card className="p-4 bg-card/50 border-border/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-status-operational" />
                        <span className="text-xs text-muted-foreground">Engine Power</span>
                      </div>
                      <div className="text-2xl font-bold text-foreground">{selectedTractor.enginePower} HP</div>
                    </Card>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Performance</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Fuel Level</span>
                      <span className="text-sm font-bold text-foreground">{selectedTractor.fuelLevel.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${selectedTractor.fuelLevel < 20 ? 'bg-status-warning' : 'bg-primary'}`}
                        style={{ width: `${selectedTractor.fuelLevel}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <span className="text-sm text-foreground">Work Progress</span>
                      <span className="text-sm font-bold text-foreground">
                        {selectedTractor.workDone.toFixed(1)} / {selectedTractor.farmSize} ha
                      </span>
                    </div>
                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-status-operational"
                        style={{ width: `${(selectedTractor.workDone / selectedTractor.farmSize) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Location</h3>
                  <Card className="p-4 bg-card/50 border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-primary" />
                      <div>
                        <div className="text-sm font-medium text-foreground">GPS Coordinates</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {selectedTractor.gpsCoordinates.lat.toFixed(6)}, {selectedTractor.gpsCoordinates.lng.toFixed(6)}
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate('/live-map')}>
                      View on Map
                    </Button>
                  </Card>
                </div>

                <SheetFooter className="mt-8">
                  <Button className="w-full" onClick={() => handleMaintenance(selectedTractor.tractorId)}>
                    Schedule Maintenance
                  </Button>
                </SheetFooter>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

export default FleetOverview;
