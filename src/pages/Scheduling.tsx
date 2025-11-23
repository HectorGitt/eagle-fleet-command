import { useState, useEffect } from "react";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { TopBar } from "@/components/TopBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Calendar,
    Play,
    RotateCcw,
    Zap,
    AlertTriangle,
    Clock,
    Fuel,
    CheckCircle2,
    Tractor,
    Plus,
    MapPin,
    Search
} from "lucide-react";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet Icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Types
interface Job {
    id: string;
    fieldId: string;
    type: "Ploughing" | "Harrowing" | "Seeding" | "Harvesting";
    durationHours: number;
    startTime: number;
    fuelCost: number;
    profit: number;
    status: "scheduled" | "completed" | "delayed";
    constraintWarning?: string;
    latitude?: number;
    longitude?: number;
    timeWindowStart?: number;
    timeWindowEnd?: number;
}

interface TractorSchedule {
    tractorId: string;
    model: string;
    jobs: Job[];
    maxHours: number;
    maintenanceDueIn: number;
}

// Location Picker Component
const LocationPicker = ({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number, name?: string) => void }) => {
    const [position, setPosition] = useState<[number, number] | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);

    // Component to handle map flyTo
    const MapController = ({ coords }: { coords: [number, number] | null }) => {
        const map = useMap();
        useEffect(() => {
            if (coords) {
                map.flyTo(coords, 13);
            }
        }, [coords, map]);
        return null;
    };

    const handleSearch = async () => {
        if (!searchQuery) return;
        setIsSearching(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
            const data = await response.json();
            if (data && data.length > 0) {
                const { lat, lon, display_name } = data[0];
                const newLat = parseFloat(lat);
                const newLng = parseFloat(lon);
                setPosition([newLat, newLng]);
                onLocationSelect(newLat, newLng, display_name.split(',')[0]); // Use first part of address as name
                toast.success("Location Found", { description: display_name });
            } else {
                toast.error("Location not found");
            }
        } catch (error) {
            toast.error("Search failed");
        } finally {
            setIsSearching(false);
        }
    };

    const MapEvents = () => {
        useMapEvents({
            click: async (e) => {
                const { lat, lng } = e.latlng;
                setPosition([lat, lng]);

                // Reverse Geocode
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                    const data = await response.json();
                    const name = data.display_name ? data.display_name.split(',')[0] : "Selected Location";
                    onLocationSelect(lat, lng, name);
                    toast.success("Location Selected", { description: name });
                } catch (error) {
                    onLocationSelect(lat, lng);
                }
            },
        });
        return null;
    };

    return (
        <div className="space-y-2 mt-2">
            <div className="flex gap-2">
                <Input
                    placeholder="Search location (e.g. Abeokuta)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button size="icon" variant="outline" onClick={handleSearch} disabled={isSearching}>
                    <Search className="w-4 h-4" />
                </Button>
            </div>
            <div className="h-[200px] w-full rounded-md overflow-hidden border border-input relative">
                <MapContainer center={[6.615, 3.355]} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                    <MapEvents />
                    <MapController coords={position} />
                    {position && <Marker position={position} />}
                </MapContainer>
            </div>
        </div>
    );
};

// Route Visualization Component
const RouteMap = ({ schedules }: { schedules: TractorSchedule[] }) => {
    const colors = ['blue', 'red', 'green', 'purple', 'orange'];

    return (
        <Card className="glass-panel p-6 overflow-hidden mt-6 h-[400px]">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-foreground">Optimized Route Visualization</h2>
                <div className="flex gap-4">
                    {schedules.map((t, i) => (
                        <div key={t.tractorId} className="flex items-center gap-2 text-xs">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[i % colors.length] }}></div>
                            <span>{t.tractorId}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="h-full w-full rounded-lg overflow-hidden border border-border/30">
                <MapContainer center={[6.615, 3.355]} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

                    {/* Depot */}
                    <Marker position={[6.615, 3.355]}>
                        <Popup>Depot (Omatsola Complex)</Popup>
                    </Marker>

                    {schedules.map((tractor, idx) => {
                        const color = colors[idx % colors.length];
                        const positions: [number, number][] = [[6.615, 3.355]]; // Start at Depot

                        // Sort jobs by start time to draw correct path
                        const sortedJobs = [...tractor.jobs].sort((a, b) => a.startTime - b.startTime);

                        sortedJobs.forEach(job => {
                            if (job.latitude && job.longitude) {
                                positions.push([job.latitude, job.longitude]);
                            }
                        });

                        // Return to Depot (optional, but good for VRP visualization)
                        // positions.push([6.615, 3.355]);

                        return (
                            <div key={tractor.tractorId}>
                                <Polyline positions={positions} color={color} weight={3} opacity={0.7} />
                                {sortedJobs.map(job => (
                                    job.latitude && job.longitude && (
                                        <Marker key={job.id} position={[job.latitude, job.longitude]}>
                                            <Popup>
                                                <strong>{job.fieldId}</strong><br />
                                                {job.type}<br />
                                                Start: {job.startTime.toFixed(2)}h
                                            </Popup>
                                        </Marker>
                                    )
                                ))}
                            </div>
                        );
                    })}
                </MapContainer>
            </div>
        </Card>
    );
};

const Scheduling = () => {
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optimizationStats, setOptimizationStats] = useState({
        totalFuel: 450,
        efficiency: 72,
        conflicts: 2
    });

    // Initial Data with Coords (Alausa Area)
    const [schedules, setSchedules] = useState<TractorSchedule[]>([
        {
            tractorId: "T-800",
            model: "John Deere 6M",
            maxHours: 8,
            maintenanceDueIn: 40,
            jobs: [
                { id: "J1", fieldId: "North Acre", type: "Ploughing", durationHours: 4, startTime: 8, fuelCost: 120, profit: 500, status: "scheduled", latitude: 6.620, longitude: 3.360 },
                { id: "J2", fieldId: "River Bank", type: "Harrowing", durationHours: 3, startTime: 13, fuelCost: 80, profit: 300, status: "scheduled", constraintWarning: "High Fuel Usage", latitude: 6.610, longitude: 3.350 }
            ]
        },
        {
            tractorId: "T-803",
            model: "Case IH Magnum",
            maxHours: 10,
            maintenanceDueIn: 5,
            jobs: [
                { id: "J3", fieldId: "South Pasture", type: "Seeding", durationHours: 6, startTime: 9, fuelCost: 150, profit: 800, status: "scheduled", constraintWarning: "Maintenance Risk", latitude: 6.605, longitude: 3.365 }
            ]
        },
        {
            tractorId: "T-806",
            model: "New Holland T7",
            maxHours: 8,
            maintenanceDueIn: 100,
            jobs: [
                { id: "J4", fieldId: "Hillside Plot", type: "Harvesting", durationHours: 5, startTime: 7, fuelCost: 100, profit: 1200, status: "scheduled", latitude: 6.625, longitude: 3.345 },
                { id: "J5", fieldId: "North Acre", type: "Seeding", durationHours: 2, startTime: 14, fuelCost: 40, profit: 200, status: "scheduled", latitude: 6.620, longitude: 3.360 }
            ]
        }
    ]);

    // New Job Form State
    const [isAddJobOpen, setIsAddJobOpen] = useState(false);
    const [newJob, setNewJob] = useState({
        tractorId: "T-800",
        fieldId: "",
        type: "Ploughing",
        durationHours: 2,
        latitude: 6.615,
        longitude: 3.355,
        timeWindowStart: 6,
        timeWindowEnd: 18
    });

    const handleAddJob = () => {
        if (!newJob.fieldId) {
            toast.error("Please enter a field name");
            return;
        }

        const job: Job = {
            id: `J${Date.now()}`,
            fieldId: newJob.fieldId,
            type: newJob.type as any,
            durationHours: Number(newJob.durationHours),
            startTime: Number(newJob.timeWindowStart), // Initial guess
            fuelCost: 50,
            profit: 100,
            status: "scheduled",
            latitude: newJob.latitude,
            longitude: newJob.longitude,
            timeWindowStart: Number(newJob.timeWindowStart),
            timeWindowEnd: Number(newJob.timeWindowEnd)
        };

        setSchedules(prev => prev.map(t => {
            if (t.tractorId === newJob.tractorId) {
                return {
                    ...t,
                    jobs: [...t.jobs, job]
                };
            }
            return t;
        }));

        setIsAddJobOpen(false);
        toast.success("Job Added", {
            description: `${job.type} at ${job.fieldId} (${job.latitude.toFixed(3)}, ${job.longitude.toFixed(3)})`
        });
    };

    const runOptimization = async () => {
        setIsOptimizing(true);

        try {
            const payload = { tractors: schedules };

            const response = await fetch(`${import.meta.env.VITE_API_URL}/optimize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error('Backend optimization failed');

            const data = await response.json();

            setSchedules(data.tractors);
            setOptimizationStats(data.stats);

            toast.success("VRP Optimization Complete", {
                description: `Routes optimized with Haversine distance & Time Windows. Efficiency: ${data.stats.efficiency}%`,
                icon: <Zap className="w-5 h-5 text-yellow-500" />
            });

        } catch (error) {
            console.error("Optimization error:", error);
            toast.error("Optimization Failed", {
                description: "Could not connect to VRP Backend.",
                icon: <AlertTriangle className="w-5 h-5 text-red-500" />
            });
            setTimeout(() => setIsOptimizing(false), 1000);
        } finally {
            setIsOptimizing(false);
        }
    };

    const resetSimulation = () => window.location.reload();

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
                                <h1 className="text-3xl font-bold text-foreground">Advanced Machine Scheduling</h1>
                            </div>
                            <p className="text-muted-foreground max-w-2xl">
                                VRP Solver with Dynamic Geolocation & Time Windows.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Dialog open={isAddJobOpen} onOpenChange={setIsAddJobOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="gap-2">
                                        <Plus className="w-4 h-4" />
                                        Add Job
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle>Add New Job</DialogTitle>
                                        <DialogDescription>
                                            Pick a location on the map and set time constraints.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label>Tractor</Label>
                                                <Select
                                                    value={newJob.tractorId}
                                                    onValueChange={(value) => setNewJob({ ...newJob, tractorId: value })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select tractor" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {schedules.map(t => (
                                                            <SelectItem key={t.tractorId} value={t.tractorId}>
                                                                {t.tractorId} ({t.model})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label>Task Type</Label>
                                                <Select
                                                    value={newJob.type}
                                                    onValueChange={(value) => setNewJob({ ...newJob, type: value })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select task type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Ploughing">Ploughing</SelectItem>
                                                        <SelectItem value="Harrowing">Harrowing</SelectItem>
                                                        <SelectItem value="Seeding">Seeding</SelectItem>
                                                        <SelectItem value="Harvesting">Harvesting</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label>Field Name</Label>
                                                <Input
                                                    value={newJob.fieldId}
                                                    onChange={(e) => setNewJob({ ...newJob, fieldId: e.target.value })}
                                                    placeholder="e.g. North Farm Zone 1"
                                                />
                                            </div>
                                            <div>
                                                <Label>Duration (Hours)</Label>
                                                <Input
                                                    type="number"
                                                    value={newJob.durationHours}
                                                    onChange={(e) => setNewJob({ ...newJob, durationHours: Number(e.target.value) })}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label>Earliest Start (Hr)</Label>
                                                <Input
                                                    type="number"
                                                    min="0" max="23"
                                                    value={newJob.timeWindowStart}
                                                    onChange={(e) => setNewJob({ ...newJob, timeWindowStart: Number(e.target.value) })}
                                                />
                                            </div>
                                            <div>
                                                <Label>Latest Start (Hr)</Label>
                                                <Input
                                                    type="number"
                                                    min="0" max="24"
                                                    value={newJob.timeWindowEnd}
                                                    onChange={(e) => setNewJob({ ...newJob, timeWindowEnd: Number(e.target.value) })}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <Label>Location (Search or Click on map)</Label>
                                            <div className="text-xs text-muted-foreground mb-1">
                                                Selected: {newJob.latitude.toFixed(4)}, {newJob.longitude.toFixed(4)}
                                            </div>
                                            <LocationPicker
                                                onLocationSelect={(lat, lng, name) => {
                                                    setNewJob(prev => ({
                                                        ...prev,
                                                        latitude: lat,
                                                        longitude: lng,
                                                        fieldId: name || prev.fieldId // Auto-fill name if provided
                                                    }));
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleAddJob}>Save Job</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            <Button variant="outline" onClick={resetSimulation} disabled={isOptimizing}>
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Reset
                            </Button>
                            <Button onClick={runOptimization} disabled={isOptimizing} className="bg-primary hover:bg-primary/90">
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

                    {/* Route Visualization Map */}
                    <RouteMap schedules={schedules} />
                </main>
            </div>
        </div>
    );
};

export default Scheduling;
