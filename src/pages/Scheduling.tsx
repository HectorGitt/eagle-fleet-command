import { useState } from "react";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { TopBar } from "@/components/TopBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Calendar,
    Play,
    RotateCcw,
    Zap,
    AlertTriangle,
    Clock,
    Fuel,
    CheckCircle2,
    Tractor
} from "lucide-react";
import { toast } from "sonner";

// Mock Data Types
interface Job {
    id: string;
    fieldId: string;
    type: "Ploughing" | "Harrowing" | "Seeding" | "Harvesting";
    durationHours: number;
    startTime: number; // Hour of the day (0-24)
    fuelCost: number;
    profit: number;
    status: "scheduled" | "completed" | "delayed";
    constraintWarning?: string;
}

interface TractorSchedule {
    tractorId: string;
    model: string;
    jobs: Job[];
    maxHours: number;
    maintenanceDueIn: number; // hours
}

const Scheduling = () => {
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optimizationStats, setOptimizationStats] = useState({
        totalFuel: 450,
        efficiency: 72,
        conflicts: 2
    });

    // Initial Unoptimized Data
    const [schedules, setSchedules] = useState<TractorSchedule[]>([
        {
            tractorId: "T-800",
            model: "John Deere 6M",
            maxHours: 8,
            maintenanceDueIn: 40,
            jobs: [
                { id: "J1", fieldId: "Field A", type: "Ploughing", durationHours: 4, startTime: 8, fuelCost: 120, profit: 500, status: "scheduled" },
                { id: "J2", fieldId: "Field C", type: "Harrowing", durationHours: 3, startTime: 13, fuelCost: 80, profit: 300, status: "scheduled", constraintWarning: "High Fuel Usage" }
            ]
        },
        {
            tractorId: "T-803",
            model: "Case IH Magnum",
            maxHours: 10,
            maintenanceDueIn: 5, // Critical constraint
            jobs: [
                { id: "J3", fieldId: "Field B", type: "Seeding", durationHours: 6, startTime: 9, fuelCost: 150, profit: 800, status: "scheduled", constraintWarning: "Maintenance Risk" }
            ]
        },
        {
            tractorId: "T-806",
            model: "New Holland T7",
            maxHours: 8,
            maintenanceDueIn: 100,
            jobs: [
                { id: "J4", fieldId: "Field D", type: "Harvesting", durationHours: 5, startTime: 7, fuelCost: 100, profit: 1200, status: "scheduled" },
                { id: "J5", fieldId: "Field A", type: "Seeding", durationHours: 2, startTime: 14, fuelCost: 40, profit: 200, status: "scheduled" }
            ]
        }
    ]);

    const runOptimization = () => {
        setIsOptimizing(true);

        // Simulate backend calculation delay
        setTimeout(() => {
            setIsOptimizing(false);

            // Update with "Optimized" data
            setSchedules(prev => [
                {
                    ...prev[0],
                    jobs: [
                        { id: "J1", fieldId: "Field A", type: "Ploughing", durationHours: 4, startTime: 7, fuelCost: 110, profit: 500, status: "scheduled" }, // Moved earlier
                        { id: "J5", fieldId: "Field A", type: "Seeding", durationHours: 2, startTime: 12, fuelCost: 35, profit: 200, status: "scheduled" } // Moved from T-806 to T-800 (same field optimization)
                    ]
                },
                {
                    ...prev[1],
                    jobs: [] // Removed job due to maintenance constraint
                },
                {
                    ...prev[2],
                    jobs: [
                        { id: "J4", fieldId: "Field D", type: "Harvesting", durationHours: 5, startTime: 7, fuelCost: 100, profit: 1200, status: "scheduled" },
                        { id: "J3", fieldId: "Field B", type: "Seeding", durationHours: 6, startTime: 13, fuelCost: 140, profit: 800, status: "scheduled" } // Moved from T-803 to T-806
                    ]
                }
            ]);

            setOptimizationStats({
                totalFuel: 385, // Reduced
                efficiency: 94, // Increased
                conflicts: 0 // Resolved
            });

            toast.success("VRP Optimization Complete", {
                description: "Schedule rebalanced. Fuel usage reduced by 15%. Maintenance conflict resolved.",
                icon: <Zap className="w-5 h-5 text-yellow-500" />
            });
        }, 2000);
    };

    const resetSimulation = () => {
        window.location.reload(); // Simple reset for prototype
    };

    const getJobColor = (type: string) => {
        switch (type) {
            case "Ploughing": return "bg-blue-500/20 border-blue-500 text-blue-500";
            case "Harrowing": return "bg-purple-500/20 border-purple-500 text-purple-500";
            case "Seeding": return "bg-green-500/20 border-green-500 text-green-500";
            case "Harvesting": return "bg-orange-500/20 border-orange-500 text-orange-500";
            default: return "bg-gray-500/20 border-gray-500 text-gray-500";
        }
    };

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
            <DashboardSidebar />

            <div className="flex-1 flex flex-col ml-64">
                <TopBar />

                <main className="flex-1 p-6 overflow-auto">
                    {/* Header */}
                    <div className="flex items-end justify-between mb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Calendar className="w-8 h-8 text-primary" />
                                <h1 className="text-3xl font-bold text-foreground">Machine Scheduling</h1>
                            </div>
                            <p className="text-muted-foreground max-w-2xl">
                                Vehicle Routing Problem (VRP) solver using Mixed-Integer Programming (MIP).
                                Optimizes for fuel efficiency and resource constraints.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={resetSimulation} disabled={isOptimizing}>
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Reset
                            </Button>
                            <Button onClick={runOptimization} disabled={isOptimizing || optimizationStats.conflicts === 0} className="bg-primary hover:bg-primary/90">
                                {isOptimizing ? (
                                    <>
                                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                                        Solving VRP...
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-4 h-4 mr-2" />
                                        Run Optimization
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Stats Panel */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <Card className="glass-panel p-6">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted-foreground">Total Fuel Est.</span>
                                <Fuel className="w-5 h-5 text-status-warning" />
                            </div>
                            <div className="flex items-end gap-2">
                                <span className="text-3xl font-bold text-foreground">{optimizationStats.totalFuel}</span>
                                <span className="text-sm text-muted-foreground mb-1">Liters</span>
                            </div>
                        </Card>

                        <Card className="glass-panel p-6">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted-foreground">Schedule Efficiency</span>
                                <Zap className="w-5 h-5 text-status-operational" />
                            </div>
                            <div className="flex items-end gap-2">
                                <span className="text-3xl font-bold text-foreground">{optimizationStats.efficiency}%</span>
                                {optimizationStats.efficiency > 80 && (
                                    <span className="text-xs text-status-operational mb-1 bg-status-operational/10 px-2 py-0.5 rounded-full">Optimal</span>
                                )}
                            </div>
                        </Card>

                        <Card className={`glass-panel p-6 ${optimizationStats.conflicts > 0 ? 'border-status-maintenance/50 bg-status-maintenance/5' : ''}`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted-foreground">Active Conflicts</span>
                                <AlertTriangle className={`w-5 h-5 ${optimizationStats.conflicts > 0 ? 'text-status-maintenance' : 'text-muted-foreground'}`} />
                            </div>
                            <div className="flex items-end gap-2">
                                <span className={`text-3xl font-bold ${optimizationStats.conflicts > 0 ? 'text-status-maintenance' : 'text-foreground'}`}>
                                    {optimizationStats.conflicts}
                                </span>
                                <span className="text-sm text-muted-foreground mb-1">Constraints Broken</span>
                            </div>
                        </Card>
                    </div>

                    {/* Gantt Chart / Timeline */}
                    <Card className="glass-panel p-6 overflow-hidden">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-foreground">Daily Schedule Timeline (06:00 - 18:00)</h2>
                            <div className="flex gap-4 text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-blue-500/20 border border-blue-500 rounded"></div>
                                    <span>Ploughing</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-purple-500/20 border border-purple-500 rounded"></div>
                                    <span>Harrowing</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-green-500/20 border border-green-500 rounded"></div>
                                    <span>Seeding</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-orange-500/20 border border-orange-500 rounded"></div>
                                    <span>Harvesting</span>
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            {/* Time Grid */}
                            <div className="grid grid-cols-12 gap-0 mb-4 border-b border-border/30 pb-2">
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <div key={i} className="text-xs text-muted-foreground font-mono">
                                        {(i + 6).toString().padStart(2, '0')}:00
                                    </div>
                                ))}
                            </div>

                            {/* Tractor Rows */}
                            <div className="space-y-6">
                                {schedules.map((tractor) => (
                                    <div key={tractor.tractorId} className="relative group">
                                        <div className="flex items-center gap-4 mb-2">
                                            <div className="flex items-center gap-2 w-48">
                                                <Tractor className="w-4 h-4 text-primary" />
                                                <div>
                                                    <div className="font-bold text-sm">{tractor.tractorId}</div>
                                                    <div className="text-[10px] text-muted-foreground">{tractor.model}</div>
                                                </div>
                                            </div>

                                            {/* Maintenance Warning */}
                                            {tractor.maintenanceDueIn < 10 && (
                                                <div className="flex items-center gap-1 text-xs text-status-maintenance bg-status-maintenance/10 px-2 py-0.5 rounded">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    <span>Maint. Due in {tractor.maintenanceDueIn}h</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Timeline Track */}
                                        <div className="h-12 bg-accent/5 rounded-lg relative w-full border border-border/20 overflow-hidden">
                                            {/* Hour Markers (Background) */}
                                            <div className="absolute inset-0 grid grid-cols-12 gap-0 pointer-events-none">
                                                {Array.from({ length: 12 }).map((_, i) => (
                                                    <div key={i} className="border-r border-border/10 h-full"></div>
                                                ))}
                                            </div>

                                            {/* Jobs */}
                                            {tractor.jobs.map((job) => {
                                                // Calculate position and width based on 06:00 start (index 0) to 18:00 (index 12)
                                                // Total 12 hours displayed
                                                const startOffset = job.startTime - 6;
                                                const width = job.durationHours;

                                                // Convert to percentage
                                                const leftPercent = (startOffset / 12) * 100;
                                                const widthPercent = (width / 12) * 100;

                                                return (
                                                    <div
                                                        key={job.id}
                                                        className={`absolute top-1 bottom-1 rounded-md border text-xs flex flex-col justify-center px-2 shadow-sm transition-all hover:brightness-110 cursor-pointer ${getJobColor(job.type)}`}
                                                        style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                                                    >
                                                        <div className="font-bold truncate">{job.fieldId}</div>
                                                        <div className="truncate opacity-80">{job.type}</div>

                                                        {/* Constraint Warning Icon */}
                                                        {job.constraintWarning && (
                                                            <div className="absolute -top-1 -right-1 bg-status-maintenance text-white rounded-full p-0.5 shadow-sm animate-pulse">
                                                                <AlertTriangle className="w-3 h-3" />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                </main>
            </div>
        </div>
    );
};

export default Scheduling;
