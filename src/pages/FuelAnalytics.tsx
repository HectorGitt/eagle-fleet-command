import { useState, useEffect } from "react";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { TopBar } from "@/components/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Fuel, TrendingDown, TrendingUp, DollarSign, Leaf } from "lucide-react";

const FuelAnalytics = () => {
  const [fuelConsumption] = useState([
    { day: "Mon", consumption: 450, cost: 585, efficiency: 92 },
    { day: "Tue", consumption: 480, cost: 624, efficiency: 89 },
    { day: "Wed", consumption: 420, cost: 546, efficiency: 95 },
    { day: "Thu", consumption: 510, cost: 663, efficiency: 87 },
    { day: "Fri", consumption: 490, cost: 637, efficiency: 90 },
    { day: "Sat", consumption: 380, cost: 494, efficiency: 96 },
    { day: "Sun", consumption: 340, cost: 442, efficiency: 97 },
  ]);

  const [tractorComparison] = useState([
    { id: "T-800", consumption: 185, efficiency: 88, cost: 240 },
    { id: "T-801", consumption: 165, efficiency: 92, cost: 215 },
    { id: "T-802", consumption: 195, efficiency: 85, cost: 254 },
    { id: "T-803", consumption: 172, efficiency: 91, cost: 224 },
    { id: "T-804", consumption: 188, efficiency: 87, cost: 245 },
  ]);

  const [kpis, setKpis] = useState({
    totalConsumption: 2670,
    avgEfficiency: 92,
    totalCost: 3471,
    co2Saved: 245,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setKpis(prev => ({
        ...prev,
        totalConsumption: 2670 + Math.floor(Math.random() * 100 - 50),
        avgEfficiency: 90 + Math.floor(Math.random() * 6),
      }));
    }, 6000);

    return () => clearInterval(interval);
  }, []);

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
              <div className="text-3xl font-bold text-foreground">{kpis.totalConsumption}L</div>
              <div className="flex items-center mt-2 text-xs text-status-operational">
                <TrendingDown className="w-3 h-3 mr-1" />
                <span>8% reduction this week</span>
              </div>
            </Card>

            <Card className="glass-panel p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Avg Efficiency</span>
                <TrendingUp className="w-5 h-5 text-status-operational" />
              </div>
              <div className="text-3xl font-bold text-foreground">{kpis.avgEfficiency}%</div>
              <div className="flex items-center mt-2 text-xs text-status-operational">
                <TrendingUp className="w-3 h-3 mr-1" />
                <span>5% improvement</span>
              </div>
            </Card>

            <Card className="glass-panel p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total Cost</span>
                <DollarSign className="w-5 h-5 text-status-warning" />
              </div>
              <div className="text-3xl font-bold text-foreground">₦{kpis.totalCost}</div>
              <div className="flex items-center mt-2 text-xs text-muted-foreground">
                <span>This week</span>
              </div>
            </Card>

            <Card className="glass-panel p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">CO₂ Saved</span>
                <Leaf className="w-5 h-5 text-status-operational" />
              </div>
              <div className="text-3xl font-bold text-foreground">{kpis.co2Saved}kg</div>
              <div className="flex items-center mt-2 text-xs text-status-operational">
                <span>vs. industry avg</span>
              </div>
            </Card>
          </div>

          {/* Charts */}
          <Tabs defaultValue="consumption" className="mb-8">
            <TabsList className="glass-panel">
              <TabsTrigger value="consumption">Consumption Trends</TabsTrigger>
              <TabsTrigger value="comparison">Tractor Comparison</TabsTrigger>
              <TabsTrigger value="efficiency">Efficiency Analysis</TabsTrigger>
            </TabsList>

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

            <TabsContent value="comparison" className="mt-6">
              <Card className="glass-panel p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">Fuel Consumption by Tractor</h3>
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
                    <Bar dataKey="efficiency" fill="hsl(var(--status-operational))" name="Efficiency (%)" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </TabsContent>

            <TabsContent value="efficiency" className="mt-6">
              <Card className="glass-panel p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">Efficiency Trends</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={fuelConsumption}>
                    <defs>
                      <linearGradient id="efficiencyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--status-operational))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--status-operational))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" domain={[80, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="efficiency"
                      stroke="hsl(var(--status-operational))"
                      strokeWidth={2}
                      fill="url(#efficiencyGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Top Performers */}
          <Card className="glass-panel p-6">
            <h3 className="text-lg font-bold text-foreground mb-4">Top Fuel-Efficient Tractors</h3>
            <div className="space-y-3">
              {tractorComparison
                .sort((a, b) => b.efficiency - a.efficiency)
                .slice(0, 3)
                .map((tractor, idx) => (
                  <div key={tractor.id} className="flex items-center justify-between p-4 bg-accent/10 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-mono font-semibold text-foreground">{tractor.id}</div>
                        <div className="text-sm text-muted-foreground">{tractor.consumption}L consumed</div>
                      </div>
                    </div>
                    <Badge className="bg-status-operational/20 text-status-operational border-status-operational">
                      {tractor.efficiency}% Efficient
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
