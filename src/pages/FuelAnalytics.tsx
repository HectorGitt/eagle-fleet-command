import { useState, useEffect } from "react";
import { useFleet } from "@/context/FleetContext";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { TopBar } from "@/components/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Fuel, TrendingDown, TrendingUp, DollarSign, Leaf, Info } from "lucide-react";
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const FuelAnalytics = () => {
  const { tractors } = useFleet();

  // Constants
  const FUEL_PRICE_NGN = 800;

  // Calculate Real-time KPIs
  const totalFuelConsumed = tractors.reduce((acc, t) => acc + t.fuelConsumed, 0);
  const totalWorkDone = tractors.reduce((acc, t) => acc + t.workDone, 0);
  const totalCost = totalFuelConsumed * FUEL_PRICE_NGN;
  const avgEfficiency = totalFuelConsumed > 0 ? (totalWorkDone / totalFuelConsumed) : 0;

  // Mock historical data for charts (since we don't have a backend history yet)
  // In a real app, this would come from an API based on the live data aggregation
  const [fuelConsumption] = useState([
    { day: "Mon", consumption: 450, cost: 450 * 800, efficiency: 0.92 },
    { day: "Tue", consumption: 480, cost: 480 * 800, efficiency: 0.89 },
    { day: "Wed", consumption: 420, cost: 420 * 800, efficiency: 0.95 },
    { day: "Thu", consumption: 510, cost: 510 * 800, efficiency: 0.87 },
    { day: "Fri", consumption: 490, cost: 490 * 800, efficiency: 0.90 },
    { day: "Sat", consumption: 380, cost: 380 * 800, efficiency: 0.96 },
    { day: "Sun", consumption: 340, cost: 340 * 800, efficiency: 0.97 },
  ]);

  // Prepare chart data from live tractors
  const tractorComparison = tractors.slice(0, 5).map(t => ({
    id: t.tractorId,
    consumption: t.fuelConsumed,
    efficiency: t.efficiency * 100, // Scale for chart visibility
    cost: t.fuelConsumed * FUEL_PRICE_NGN
  }));

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <DashboardSidebar />

      <div className="flex-1 flex flex-col ml-64">
        <TopBar />

        <main className="flex-1 p-6 overflow-auto">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Fuel className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">Fuel Analytics</h1>
            </div>
            <p className="text-muted-foreground">Monitor fuel consumption, efficiency, and cost optimization across your fleet</p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="glass-panel p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total Consumption</span>
                <Fuel className="w-5 h-5 text-primary" />
              </div>
              <div className="text-3xl font-bold text-foreground">{totalFuelConsumed.toFixed(1)}L</div>
              <div className="flex items-center mt-2 text-xs text-status-operational">
                <TrendingDown className="w-3 h-3 mr-1" />
                <span>Live Accumulation</span>
              </div>
            </Card>

            <Card className="glass-panel p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Avg Efficiency</span>
                <TrendingUp className="w-5 h-5 text-status-operational" />
              </div>
              <div className="text-3xl font-bold text-foreground">{avgEfficiency.toFixed(2)} ha/L</div>
              <div className="flex items-center mt-2 text-xs text-status-operational">
                <TrendingUp className="w-3 h-3 mr-1" />
                <span>Work per Litre</span>
              </div>
            </Card>

            <Card className="glass-panel p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Total Cost</span>
                  <UITooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Calculated at ₦{FUEL_PRICE_NGN}/Litre</p>
                    </TooltipContent>
                  </UITooltip>
                </div>
                <DollarSign className="w-5 h-5 text-status-warning" />
              </div>
              <div className="text-3xl font-bold text-foreground">₦{totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <div className="flex items-center mt-2 text-xs text-muted-foreground">
                <span>Current Session</span>
              </div>
            </Card>

            <Card className="glass-panel p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">CO₂ Saved</span>
                <Leaf className="w-5 h-5 text-status-operational" />
              </div>
              <div className="text-3xl font-bold text-foreground">{(totalFuelConsumed * 2.68 * 0.1).toFixed(1)}kg</div>
              <div className="flex items-center mt-2 text-xs text-status-operational">
                <span>Est. vs Old Fleet</span>
              </div>
            </Card>
          </div>

          {/* Charts */}
          <Tabs defaultValue="comparison" className="mb-8">
            <TabsList className="glass-panel">
              <TabsTrigger value="comparison">Live Tractor Comparison</TabsTrigger>
              <TabsTrigger value="consumption">Weekly Trends (Simulated)</TabsTrigger>
            </TabsList>

            <TabsContent value="comparison" className="mt-6">
              <Card className="glass-panel p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">Real-time Fuel Consumption by Tractor</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={tractorComparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="id" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="consumption" fill="hsl(var(--primary))" name="Consumption (L)" />
                    <Bar dataKey="cost" fill="hsl(var(--status-warning))" name="Cost (₦)" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </TabsContent>

            <TabsContent value="consumption" className="mt-6">
              <Card className="glass-panel p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">Weekly Fuel Consumption</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={fuelConsumption}>
                    <defs>
                      <linearGradient id="consumptionGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="consumption"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#consumptionGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Top Performers */}
          <Card className="glass-panel p-6">
            <h3 className="text-lg font-bold text-foreground mb-4">Top Fuel-Efficient Tractors (Live)</h3>
            <div className="space-y-3">
              {tractors
                .sort((a, b) => b.efficiency - a.efficiency)
                .slice(0, 3)
                .map((tractor, idx) => (
                  <div key={tractor.tractorId} className="flex items-center justify-between p-4 bg-accent/10 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-mono font-semibold text-foreground">{tractor.tractorId}</div>
                        <div className="text-sm text-muted-foreground">{tractor.fuelConsumed.toFixed(1)}L consumed</div>
                      </div>
                    </div>
                    <Badge className="bg-status-operational/20 text-status-operational border-status-operational">
                      {tractor.efficiency.toFixed(2)} ha/L
                    </Badge>
                  </div>
                ))}
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default FuelAnalytics;
