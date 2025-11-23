import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { TopBar } from "@/components/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, AlertTriangle, Calendar, Wrench, TrendingUp } from "lucide-react";
import { ScheduleMaintenanceModal } from "@/components/ScheduleMaintenanceModal";

const MaintenanceAI = () => {
  const [searchParams] = useSearchParams();
  const selectedTractorId = searchParams.get("tractorId");
  const [selectedTractorForMaintenance, setSelectedTractorForMaintenance] = useState<string | null>(null);

  const [predictions, setPredictions] = useState([
    {
      tractorId: "T-800",
      model: "John Deere 6M",
      prediction: "Critical Alert: Thermal Viscosity Breakdown",
      confidence: 94,
      daysToFailure: 2,
      priority: "critical",
      recommendation: "Replace oil and check cooling system immediately",
    },
    {
      tractorId: "T-803",
      model: "Case IH Magnum",
      prediction: "Warning: Pump Cavitation Risk",
      confidence: 87,
      daysToFailure: 5,
      priority: "high",
      recommendation: "Schedule hydraulic pump inspection within 48 hours",
    },
    {
      tractorId: "T-806",
      model: "New Holland T7",
      prediction: "Systems Nominal",
      confidence: 99,
      daysToFailure: null,
      priority: "normal",
      recommendation: "Continue routine maintenance schedule",
    },
  ]);

  useEffect(() => {
    // If a tractor was selected from Fleet Overview, add a manual report if not already present
    if (selectedTractorId) {
      setPredictions(prev => {
        if (prev.some(p => p.tractorId === selectedTractorId)) return prev;
        return [
          {
            tractorId: selectedTractorId,
            model: "Unknown Model", // In a real app, we'd fetch this
            prediction: "Manual Maintenance Request",
            confidence: 100,
            daysToFailure: 0,
            priority: "high",
            recommendation: "Operator reported issue. Inspect immediately.",
          },
          ...prev
        ];
      });
    }
  }, [selectedTractorId]);

  const [upcomingMaintenance] = useState([
    { tractorId: "T-801", task: "Oil Change", dueDate: "2025-12-01", status: "scheduled" },
    { tractorId: "T-805", task: "Hydraulic Filter Replacement", dueDate: "2025-12-03", status: "scheduled" },
    { tractorId: "T-802", task: "Engine Inspection", dueDate: "2025-11-30", status: "overdue" },
    { tractorId: "T-809", task: "Tire Rotation", dueDate: "2025-12-05", status: "scheduled" },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPredictions(prev =>
        prev.map(p => ({
          ...p,
          confidence: p.prediction === "Manual Maintenance Request" ? 100 : Math.min(99, Math.max(70, p.confidence + (Math.random() * 4 - 2))),
        }))
      );
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-status-maintenance/20 text-status-maintenance border-status-maintenance";
      case "high": return "bg-status-warning/20 text-status-warning border-status-warning";
      default: return "bg-status-operational/20 text-status-operational border-status-operational";
    }
  };

  const getStatusColor = (status: string) => {
    return status === "overdue"
      ? "bg-status-maintenance/20 text-status-maintenance border-status-maintenance"
      : "bg-status-operational/20 text-status-operational border-status-operational";
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <DashboardSidebar />

      <div className="flex-1 flex flex-col ml-64">
        <TopBar />

        <main className="flex-1 p-6 overflow-auto">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Brain className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">EagleAI Maintenance Intelligence</h1>
            </div>
            <p className="text-muted-foreground">Physics-based predictive analytics for fleet health monitoring</p>
          </div>

          {/* AI Predictions */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-status-warning" />
              Predictive Maintenance Alerts
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {predictions.map((pred) => (
                <Card key={pred.tractorId} className="glass-panel p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-foreground font-mono">{pred.tractorId}</h3>
                        <Badge className={getPriorityColor(pred.priority)}>
                          {pred.priority.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="font-mono">
                          {pred.confidence.toFixed(1)}% Confidence
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{pred.model}</p>
                    </div>
                    {pred.daysToFailure !== null && pred.daysToFailure !== undefined && (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-status-maintenance">{pred.daysToFailure}</div>
                        <div className="text-xs text-muted-foreground">Days to Failure</div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-accent/10 border border-border/50 rounded-lg mb-4">
                    <div className="flex items-start gap-2">
                      <Brain className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-foreground mb-1">AI Diagnostic:</div>
                        <div className="text-sm text-foreground">{pred.prediction}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 mb-4">
                    <Wrench className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <p className="text-sm text-muted-foreground flex-1">{pred.recommendation}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setSelectedTractorForMaintenance(pred.tractorId)}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule Maintenance
                    </Button>
                    <Button variant="outline" size="sm">View Details</Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Upcoming Maintenance */}
          <Card className="glass-panel p-6">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Scheduled Maintenance
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Tractor ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Task</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Due Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingMaintenance.map((item, idx) => (
                    <tr key={idx} className="border-b border-border/30 hover:bg-accent/5 transition-colors">
                      <td className="py-4 px-4 font-mono font-semibold text-foreground">{item.tractorId}</td>
                      <td className="py-4 px-4 text-foreground">{item.task}</td>
                      <td className="py-4 px-4 text-muted-foreground">{item.dueDate}</td>
                      <td className="py-4 px-4">
                        <Badge className={getStatusColor(item.status)}>
                          {item.status === "overdue" ? "OVERDUE" : "Scheduled"}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <Button variant="outline" size="sm">Complete</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Analytics Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <Card className="glass-panel p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Predicted Failures</span>
                <AlertTriangle className="w-5 h-5 text-status-maintenance" />
              </div>
              <div className="text-3xl font-bold text-foreground">2</div>
              <div className="text-xs text-muted-foreground mt-2">In next 7 days</div>
            </Card>

            <Card className="glass-panel p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Maintenance Scheduled</span>
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div className="text-3xl font-bold text-foreground">4</div>
              <div className="text-xs text-muted-foreground mt-2">Next 14 days</div>
            </Card>

            <Card className="glass-panel p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">AI Accuracy</span>
                <TrendingUp className="w-5 h-5 text-status-operational" />
              </div>
              <div className="text-3xl font-bold text-foreground">94%</div>
              <div className="text-xs text-muted-foreground mt-2">Last 90 days</div>
            </Card>
          </div>
        </main>
      </div>

      <ScheduleMaintenanceModal
        tractorId={selectedTractorForMaintenance}
        isOpen={!!selectedTractorForMaintenance}
        onClose={() => setSelectedTractorForMaintenance(null)}
      />
    </div>
  );
};

export default MaintenanceAI;
