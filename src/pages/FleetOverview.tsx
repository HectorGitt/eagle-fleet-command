import { useState, useEffect } from "react";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { TopBar } from "@/components/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react";
import { generateTractorTelemetry } from "@/lib/telemetry";

const FleetOverview = () => {
  const [fleetData, setFleetData] = useState({
    totalUnits: 42,
    activeUnits: 38,
    inMaintenance: 2,
    idle: 2,
    utilizationRate: 88,
    avgFuelEfficiency: 92,
    criticalAlerts: 2,
  });

  const tractors = Array.from({ length: 10 }, (_, i) => ({
    id: `T-${800 + i}`,
    model: i % 3 === 0 ? "John Deere 6M" : i % 3 === 1 ? "Case IH Magnum" : "New Holland T7",
    status: i < 7 ? "operational" : i < 9 ? "maintenance" : "idle",
    location: `Farm Zone ${String.fromCharCode(65 + (i % 5))}`,
    telemetry: generateTractorTelemetry(`T-${800 + i}`),
  }));

  useEffect(() => {
    const interval = setInterval(() => {
      setFleetData(prev => ({
        ...prev,
        activeUnits: 38 + Math.floor(Math.random() * 4) - 2,
        utilizationRate: 85 + Math.floor(Math.random() * 8),
        avgFuelEfficiency: 90 + Math.floor(Math.random() * 6),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "operational": return "bg-status-operational";
      case "maintenance": return "bg-status-maintenance";
      case "idle": return "bg-status-warning";
      default: return "bg-muted";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "operational": return <Badge className="bg-status-operational/20 text-status-operational border-status-operational">Operational</Badge>;
      case "maintenance": return <Badge className="bg-status-maintenance/20 text-status-maintenance border-status-maintenance">Maintenance</Badge>;
      case "idle": return <Badge className="bg-status-warning/20 text-status-warning border-status-warning">Idle</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <DashboardSidebar />
      
      <div className="flex-1 flex flex-col ml-64">
        <TopBar />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">Fleet Overview</h1>
            <p className="text-muted-foreground">Complete operational status of your tractor fleet</p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="glass-panel p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total Units</span>
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
              <div className="text-3xl font-bold text-foreground">{fleetData.totalUnits}</div>
              <div className="flex items-center mt-2 text-xs text-status-operational">
                <TrendingUp className="w-3 h-3 mr-1" />
                <span>5% from last month</span>
              </div>
            </Card>

            <Card className="glass-panel p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Fleet Utilization</span>
                <TrendingUp className="w-5 h-5 text-status-operational" />
              </div>
              <div className="text-3xl font-bold text-foreground">{fleetData.utilizationRate}%</div>
              <div className="flex items-center mt-2 text-xs text-status-operational">
                <TrendingUp className="w-3 h-3 mr-1" />
                <span>3% increase</span>
              </div>
            </Card>

            <Card className="glass-panel p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Avg Fuel Efficiency</span>
                <TrendingDown className="w-5 h-5 text-status-warning" />
              </div>
              <div className="text-3xl font-bold text-foreground">{fleetData.avgFuelEfficiency}%</div>
              <div className="flex items-center mt-2 text-xs text-status-warning">
                <TrendingDown className="w-3 h-3 mr-1" />
                <span>2% decrease</span>
              </div>
            </Card>

            <Card className="glass-panel p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Critical Alerts</span>
                <AlertTriangle className="w-5 h-5 text-status-maintenance" />
              </div>
              <div className="text-3xl font-bold text-foreground">{fleetData.criticalAlerts}</div>
              <div className="flex items-center mt-2 text-xs text-muted-foreground">
                <span>Requires immediate attention</span>
              </div>
            </Card>
          </div>

          {/* Fleet Status Table */}
          <Card className="glass-panel p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">All Tractors</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Tractor ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Model</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Location</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Engine Temp</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Fuel Level</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Oil Pressure</th>
                  </tr>
                </thead>
                <tbody>
                  {tractors.map((tractor, idx) => (
                    <tr key={tractor.id} className="border-b border-border/30 hover:bg-accent/5 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(tractor.status)} status-pulse`} />
                          <span className="font-mono font-semibold text-foreground">{tractor.id}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-foreground">{tractor.model}</td>
                      <td className="py-4 px-4 text-muted-foreground">{tractor.location}</td>
                      <td className="py-4 px-4">{getStatusBadge(tractor.status)}</td>
                      <td className="py-4 px-4">
                        <span className={tractor.telemetry.engineTemp > 105 ? "text-status-maintenance font-semibold" : "text-foreground"}>
                          {tractor.telemetry.engineTemp.toFixed(1)}°C
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={tractor.telemetry.fuelLevel < 20 ? "text-status-warning font-semibold" : "text-foreground"}>
                          {tractor.telemetry.fuelLevel.toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={tractor.telemetry.oilPressure < 35 ? "text-status-maintenance font-semibold" : "text-foreground"}>
                          {tractor.telemetry.oilPressure.toFixed(1)} PSI
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default FleetOverview;
