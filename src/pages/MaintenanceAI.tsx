import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppShell, PageHeader, Section } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { StatusBadge, type StatusTone } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Brain, AlertTriangle, Calendar, Wrench, TrendingUp, ShieldCheck } from "lucide-react";
import { ScheduleMaintenanceModal } from "@/components/ScheduleMaintenanceModal";

const priorityTone = (priority: string): StatusTone =>
  priority === "critical" ? "critical" : priority === "high" ? "warning" : "operational";

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
    if (selectedTractorId) {
      setPredictions(prev => {
        if (prev.some(p => p.tractorId === selectedTractorId)) return prev;
        return [
          {
            tractorId: selectedTractorId,
            model: "Unknown Model",
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
          confidence: p.prediction === "Manual Maintenance Request"
            ? 100
            : Math.min(99, Math.max(70, p.confidence + (Math.random() * 4 - 2))),
        }))
      );
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const predictedFailures = predictions.filter(p => p.daysToFailure !== null && p.daysToFailure !== undefined).length;
  const overdueCount = upcomingMaintenance.filter(m => m.status === "overdue").length;

  return (
    <AppShell>
      <PageHeader
        title="EagleAI Maintenance Intelligence"
        description="Physics-based predictive analytics for fleet health monitoring"
        icon={<Brain />}
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Predicted Failures"
          value={predictedFailures}
          icon={<AlertTriangle />}
          tone={predictedFailures > 0 ? "critical" : "operational"}
          detail="In the next 7 days"
        />
        <StatCard
          label="Maintenance Scheduled"
          value={upcomingMaintenance.length}
          icon={<Calendar />}
          tone={overdueCount > 0 ? "warning" : "neutral"}
          detail={overdueCount > 0 ? `${overdueCount} overdue` : "Next 14 days"}
        />
        <StatCard
          label="Model Accuracy"
          value="94%"
          icon={<TrendingUp />}
          tone="operational"
          detail="Trailing 90 days"
        />
      </div>

      <div className="mb-5 space-y-3">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
          <AlertTriangle className="h-4 w-4 text-status-warning" />
          Predictive Maintenance Alerts
        </h2>

        {predictions.map((pred) => {
          const tone = priorityTone(pred.priority);
          return (
            <div key={pred.tractorId} className="surface p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <h3 className="ident text-[15px] text-foreground">{pred.tractorId}</h3>
                    <StatusBadge tone={tone} dot pulse={tone === "critical"}>
                      {pred.priority.toUpperCase()}
                    </StatusBadge>
                    <StatusBadge tone="neutral">{pred.confidence.toFixed(1)}% confidence</StatusBadge>
                  </div>
                  <p className="text-xs text-muted-foreground">{pred.model}</p>
                </div>

                {pred.daysToFailure !== null && pred.daysToFailure !== undefined && (
                  <div className="text-right">
                    <div className="metric text-status-maintenance">{pred.daysToFailure}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">days to failure</div>
                  </div>
                )}
              </div>

              <div className="surface-sunken mb-3 p-3.5">
                <div className="flex items-start gap-2.5">
                  {tone === "operational"
                    ? <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-status-operational" />
                    : <Brain className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
                  <div className="min-w-0">
                    <div className="eyebrow mb-1">AI Diagnostic</div>
                    <div className="text-[13px] font-medium text-foreground">{pred.prediction}</div>
                  </div>
                </div>
              </div>

              <div className="mb-4 flex items-start gap-2">
                <Wrench className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <p className="text-[13px] text-muted-foreground">{pred.recommendation}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="h-8" onClick={() => setSelectedTractorForMaintenance(pred.tractorId)}>
                  <Calendar className="mr-1.5 h-3.5 w-3.5" />
                  Schedule maintenance
                </Button>
                <Button variant="outline" size="sm" className="h-8">View details</Button>
              </div>
            </div>
          );
        })}
      </div>

      <Section title="Scheduled Maintenance">
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="data-table min-w-[640px]">
            <thead>
              <tr>
                <th>Tractor</th>
                <th>Task</th>
                <th>Due Date</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {upcomingMaintenance.map((item, idx) => (
                <tr key={idx}>
                  <td><span className="ident text-foreground">{item.tractorId}</span></td>
                  <td className="text-foreground">{item.task}</td>
                  <td className="text-muted-foreground">{item.dueDate}</td>
                  <td>
                    <StatusBadge tone={item.status === "overdue" ? "critical" : "operational"} dot>
                      {item.status === "overdue" ? "Overdue" : "Scheduled"}
                    </StatusBadge>
                  </td>
                  <td className="text-right">
                    <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs">Complete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <ScheduleMaintenanceModal
        tractorId={selectedTractorForMaintenance}
        isOpen={!!selectedTractorForMaintenance}
        onClose={() => setSelectedTractorForMaintenance(null)}
      />
    </AppShell>
  );
};

export default MaintenanceAI;
