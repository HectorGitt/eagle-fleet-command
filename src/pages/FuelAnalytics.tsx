import { useState } from "react";
import { useFleet } from "@/context/FleetContext";
import { AppShell, PageHeader, Section } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Fuel, TrendingUp, Coins, Leaf, Info } from "lucide-react";
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const FUEL_PRICE_NGN = 800;

/** Shared Recharts theming so every chart in the app reads the same tokens */
const axisProps = {
  stroke: "hsl(var(--muted-foreground))",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
};

const tooltipStyle = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
  color: "hsl(var(--popover-foreground))",
};

const FuelAnalytics = () => {
  const { tractors } = useFleet();

  const totalFuelConsumed = tractors.reduce((acc, t) => acc + t.fuelConsumed, 0);
  const totalWorkDone = tractors.reduce((acc, t) => acc + t.workDone, 0);
  const totalCost = totalFuelConsumed * FUEL_PRICE_NGN;
  const avgEfficiency = totalFuelConsumed > 0 ? (totalWorkDone / totalFuelConsumed) : 0;

  const [fuelConsumption] = useState([
    { day: "Mon", consumption: 450, cost: 450 * 800, efficiency: 0.92 },
    { day: "Tue", consumption: 480, cost: 480 * 800, efficiency: 0.89 },
    { day: "Wed", consumption: 420, cost: 420 * 800, efficiency: 0.95 },
    { day: "Thu", consumption: 510, cost: 510 * 800, efficiency: 0.87 },
    { day: "Fri", consumption: 490, cost: 490 * 800, efficiency: 0.90 },
    { day: "Sat", consumption: 380, cost: 380 * 800, efficiency: 0.96 },
    { day: "Sun", consumption: 340, cost: 340 * 800, efficiency: 0.97 },
  ]);

  const tractorComparison = tractors.slice(0, 5).map(t => ({
    id: t.tractorId,
    consumption: Number(t.fuelConsumed.toFixed(1)),
    efficiency: Number(t.efficiency.toFixed(2)),
  }));

  const ranked = [...tractors].sort((a, b) => b.efficiency - a.efficiency).slice(0, 3);

  return (
    <AppShell>
      <PageHeader
        title="Fuel Analytics"
        description="Consumption, efficiency and cost across the fleet"
        icon={<Fuel />}
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Consumption"
          value={totalFuelConsumed.toFixed(1)}
          unit="L"
          icon={<Fuel />}
          detail="Live accumulation this session"
        />
        <StatCard
          label="Avg Efficiency"
          value={avgEfficiency.toFixed(2)}
          unit="ha/L"
          icon={<TrendingUp />}
          tone="operational"
          detail="Work per litre burnt"
        />
        <StatCard
          label="Total Cost"
          value={`₦${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          icon={<Coins />}
          tone="warning"
          detail={
            <span className="inline-flex items-center gap-1">
              At ₦{FUEL_PRICE_NGN}/L
              <UITooltip>
                <TooltipTrigger asChild>
                  <button type="button" aria-label="How this is calculated">
                    <Info className="h-3 w-3 cursor-help" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Litres consumed × ₦{FUEL_PRICE_NGN} per litre</p>
                </TooltipContent>
              </UITooltip>
            </span>
          }
        />
        <StatCard
          label="CO₂ Avoided"
          value={(totalFuelConsumed * 2.68 * 0.1).toFixed(1)}
          unit="kg"
          icon={<Leaf />}
          tone="operational"
          detail="Estimated vs. previous fleet"
        />
      </div>

      <Tabs defaultValue="comparison" className="mb-5">
        <TabsList>
          <TabsTrigger value="comparison">Live comparison</TabsTrigger>
          <TabsTrigger value="consumption">Weekly trend</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="mt-4">
          <Section
            title="Fuel consumption by tractor"
            description="Litres burnt and hectares per litre, per machine"
          >
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={tractorComparison} margin={{ top: 4, right: 0, bottom: 0, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="id" {...axisProps} />
                {/* Litres and hectares-per-litre differ by two orders of
                    magnitude. On one axis the efficiency bars flatten the
                    consumption bars into nothing, so each series gets its own. */}
                <YAxis yAxisId="litres" {...axisProps} />
                <YAxis yAxisId="efficiency" orientation="right" {...axisProps} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted) / 0.5)" }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                {/* Categorical colours, not status colours - these bars label a
                    machine, they do not report its health */}
                <Bar yAxisId="litres" dataKey="consumption" fill="hsl(var(--cat-1))" name="Consumption (L)" radius={[3, 3, 0, 0]} />
                <Bar yAxisId="efficiency" dataKey="efficiency" fill="hsl(var(--cat-3))" name="Efficiency (ha/L)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Section>
        </TabsContent>

        <TabsContent value="consumption" className="mt-4">
          <Section title="Weekly fuel consumption" description="Simulated history pending a backend feed">
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={fuelConsumption} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
                <defs>
                  <linearGradient id="consumptionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--cat-1))" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(var(--cat-1))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" {...axisProps} />
                <YAxis {...axisProps} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="consumption"
                  name="Consumption (L)"
                  stroke="hsl(var(--cat-1))"
                  strokeWidth={2}
                  fill="url(#consumptionGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Section>
        </TabsContent>
      </Tabs>

      <Section title="Most fuel-efficient machines" description="Ranked live by hectares per litre">
        <div className="space-y-2">
          {ranked.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Waiting for telemetry…</p>
          )}
          {ranked.map((tractor, idx) => (
            <div key={tractor.tractorId} className="surface-sunken flex items-center justify-between gap-3 p-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-xs font-semibold text-primary-glow">
                  {idx + 1}
                </div>
                <div className="min-w-0">
                  <div className="ident text-foreground">{tractor.tractorId}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {tractor.fuelConsumed.toFixed(1)} L consumed
                  </div>
                </div>
              </div>
              <StatusBadge tone="operational">{tractor.efficiency.toFixed(2)} ha/L</StatusBadge>
            </div>
          ))}
        </div>
      </Section>
    </AppShell>
  );
};

export default FuelAnalytics;
