import { Fragment, useEffect, useMemo, useState } from "react";
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

// Depot: Omatsola Complex, Alausa, Ikeja. Must match DEPOT_COORDS in backend/solver.py
const DEPOT: [number, number] = [6.615, 3.355];

// Working day rendered by the Gantt chart, and the default window for new jobs
const DAY_START = 6;
const DAY_END = 18;

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/+$/, "");

// Road-network routing. The public demo server is rate limited and explicitly
// not for production - point VITE_OSRM_URL at your own OSRM instance to ship.
const OSRM_BASE = (import.meta.env.VITE_OSRM_URL || "https://router.project-osrm.org").replace(/\/+$/, "");

// Types
interface Job {
    id: string;
    fieldId: string;
    type: "Ploughing" | "Harrowing" | "Seeding" | "Harvesting";
    durationHours: number;
    startTime: number;
    fuelCost: number;
    profit: number;
    status: "scheduled" | "completed" | "delayed" | "unassigned";
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

// What the solver built its distance matrix from. 'haversine' means OSRM was
// unreachable and the stop ordering is straight-line, not road-accurate.
type DistanceSource = 'osrm' | 'haversine' | null;

interface OptimizationStats {
    totalFuel: number;
    efficiency: number;
    conflicts: number;
    distanceSource?: DistanceSource;
}

// Machines the solver removed from the pool before routing
interface GroundedTractor {
    tractorId: string;
    reason: string;
    telemetry?: {
        engineTemp: number;
        hydraulicPressure: number;
    };
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
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />
                    <MapEvents />
                    <MapController coords={position} />
                    {position && <Marker position={position} />}
                </MapContainer>
            </div>
        </div>
    );
};

// Route Visualization Component
const ROUTE_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#a855f7', '#f97316'];

const hasCoords = (job: Job): job is Job & { latitude: number; longitude: number } =>
    typeof job.latitude === 'number' && typeof job.longitude === 'number';

// Jobs the Gantt track cannot draw because they fall outside 06:00-18:00
const jobsOutsideWorkingDay = (jobs: Job[]) =>
    jobs.filter(job => Math.min(job.startTime + job.durationHours, DAY_END) <= Math.max(job.startTime, DAY_START));

const formatHour = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// Numbered pin so the visiting order of a route is readable on the map
const stopIcon = (color: string, sequence: number) =>
    L.divIcon({
        className: '',
        html: `<div style="background:${color};color:#fff;width:22px;height:22px;border-radius:50%;
               display:flex;align-items:center;justify-content:center;font:700 11px/1 system-ui;
               border:2px solid rgba(255,255,255,0.85);box-shadow:0 1px 4px rgba(0,0,0,0.5)">${sequence}</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
    });

interface RoadRoute {
    geometry: [number, number][];
    distanceKm: number;
    durationMin: number;
}

/**
 * Ask OSRM for the driving path through an ordered list of waypoints.
 *
 * The solver already decided the visiting order, so this uses /route (which
 * honours the given order) rather than /trip (which would re-optimise it).
 * Returns null on any failure so the caller can fall back to straight lines.
 */
const fetchRoadRoute = async (
    waypoints: [number, number][],
    signal: AbortSignal
): Promise<RoadRoute | null> => {
    if (waypoints.length < 2) return null;

    // OSRM takes lng,lat - the reverse of Leaflet's lat,lng
    const coords = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
    const url = `${OSRM_BASE}/route/v1/driving/${coords}?overview=full&geometries=geojson`;

    const response = await fetch(url, { signal });
    if (!response.ok) return null;

    const data = await response.json();
    const route = data?.routes?.[0];
    if (data?.code !== 'Ok' || !route?.geometry?.coordinates?.length) return null;

    return {
        geometry: (route.geometry.coordinates as [number, number][]).map(
            ([lng, lat]) => [lat, lng] as [number, number]
        ),
        distanceKm: (route.distance ?? 0) / 1000,
        durationMin: (route.duration ?? 0) / 60,
    };
};

// MapContainer ignores `center` changes after mount, so pan/zoom to the routes
// ourselves whenever the solver hands back a new set of stops.
const FitRoutes = ({ points, boundsKey }: { points: [number, number][]; boundsKey: string }) => {
    const map = useMap();
    useEffect(() => {
        if (points.length < 2) return; // Only the depot - leave the default view alone
        map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [boundsKey, map]);
    return null;
};

const RouteMap = ({ schedules, distanceSource }: {
    schedules: TractorSchedule[];
    distanceSource?: DistanceSource;
}) => {
    // Jobs arrive in the order the solver visits them - that order is the route
    const routes = useMemo(() => schedules
        .map((tractor, idx) => {
            const stops = tractor.jobs.filter(hasCoords);
            return {
                tractorId: tractor.tractorId,
                color: ROUTE_COLORS[idx % ROUTE_COLORS.length],
                stops,
                path: [DEPOT, ...stops.map(j => [j.latitude, j.longitude] as [number, number]), DEPOT],
            };
        })
        .filter(route => route.stops.length > 0), [schedules]);

    // The waypoint sequence is what OSRM is keyed on - only refetch when it moves
    const routesKey = useMemo(
        () => routes.map(r => `${r.tractorId}:${r.path.map(p => p.join(',')).join(';')}`).join('|'),
        [routes]
    );

    const [roadRoutes, setRoadRoutes] = useState<Record<string, RoadRoute>>({});
    const [routingStatus, setRoutingStatus] = useState<'idle' | 'loading' | 'partial' | 'failed'>('idle');

    useEffect(() => {
        if (routes.length === 0) {
            setRoadRoutes({});
            setRoutingStatus('idle');
            return;
        }

        const controller = new AbortController();
        let cancelled = false;
        setRoutingStatus('loading');

        Promise.all(
            routes.map(async route => {
                try {
                    return [route.tractorId, await fetchRoadRoute(route.path, controller.signal)] as const;
                } catch {
                    return [route.tractorId, null] as const; // Aborted or network error
                }
            })
        ).then(entries => {
            if (cancelled) return;

            const resolved: Record<string, RoadRoute> = {};
            for (const [tractorId, road] of entries) {
                if (road) resolved[tractorId] = road;
            }

            setRoadRoutes(resolved);
            const found = Object.keys(resolved).length;
            setRoutingStatus(found === entries.length ? 'idle' : found === 0 ? 'failed' : 'partial');
        });

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [routesKey, routes]);

    // Fit to the drawn road geometry when we have it - a road can swing well
    // outside the bounding box of its stops
    const points = useMemo(() => {
        const stopPoints = routes.flatMap(route =>
            roadRoutes[route.tractorId]?.geometry ?? route.path
        );
        return [DEPOT, ...stopPoints];
    }, [routes, roadRoutes]);
    const boundsKey = useMemo(() => points.map(p => p.join(',')).join('|'), [points]);

    return (
        <Card className="glass-panel p-6 overflow-hidden mt-6 h-[460px] flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-xl font-bold text-foreground">Optimized Route Visualization</h2>
                <div className="flex gap-4 flex-wrap items-center">
                    {routes.map((route) => {
                        const road = roadRoutes[route.tractorId];
                        return (
                            <div key={route.tractorId} className="flex items-center gap-2 text-xs">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: route.color }}></div>
                                <span>
                                    {route.tractorId} ({route.stops.length} {route.stops.length === 1 ? 'stop' : 'stops'}
                                    {road && ` · ${road.distanceKm.toFixed(1)} km · ${Math.round(road.durationMin)} min`})
                                </span>
                            </div>
                        );
                    })}
                    {routes.length === 0 && (
                        <span className="text-xs text-muted-foreground">No routed jobs yet</span>
                    )}
                    {routingStatus === 'loading' && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3 animate-spin" /> Fetching road paths...
                        </span>
                    )}
                    {(routingStatus === 'failed' || routingStatus === 'partial') && (
                        <span className="text-xs text-status-warning flex items-center gap-1" title={`OSRM (${OSRM_BASE}) did not return a road path`}>
                            <AlertTriangle className="w-3 h-3" />
                            {routingStatus === 'failed' ? 'Straight-line fallback' : 'Some routes straight-line'}
                        </span>
                    )}
                    {/* The drawn path and the ordering come from separate calls -
                        the solver's /table matrix can fall back independently */}
                    {distanceSource === 'osrm' && (
                        <span className="text-xs text-muted-foreground">Ordered by road distance</span>
                    )}
                    {distanceSource === 'haversine' && (
                        <span className="text-xs text-status-warning flex items-center gap-1"
                              title="The solver could not reach OSRM, so stop ordering used straight-line distance">
                            <AlertTriangle className="w-3 h-3" />
                            Ordered by straight-line distance
                        </span>
                    )}
                </div>
            </div>
            <div className="flex-1 min-h-0 w-full rounded-lg overflow-hidden border border-border/30">
                <MapContainer center={DEPOT} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />
                    <FitRoutes points={points} boundsKey={boundsKey} />

                    {/* Depot */}
                    <Marker position={DEPOT}>
                        <Popup>Depot (Omatsola Complex)</Popup>
                    </Marker>

                    {routes.map((route) => {
                        const road = roadRoutes[route.tractorId];
                        return (
                        <Fragment key={route.tractorId}>
                            {/* Road geometry from OSRM; dashed straight lines while it
                                is loading or if the routing service is unreachable */}
                            <Polyline
                                positions={road?.geometry ?? route.path}
                                // react-leaflet only re-applies styling through
                                // pathOptions - shorthand props are read once at mount
                                pathOptions={{
                                    color: route.color,
                                    weight: road ? 4 : 3,
                                    opacity: road ? 0.85 : 0.5,
                                    dashArray: road ? undefined : '6 8',
                                }}
                            />
                            {route.stops.map((job, stopIdx) => (
                                <Marker
                                    key={job.id}
                                    position={[job.latitude, job.longitude]}
                                    icon={stopIcon(route.color, stopIdx + 1)}
                                >
                                    <Popup>
                                        <strong>{job.fieldId}</strong><br />
                                        {route.tractorId} &middot; stop {stopIdx + 1} of {route.stops.length}<br />
                                        {job.type}<br />
                                        {formatHour(job.startTime)} &ndash; {formatHour(job.startTime + job.durationHours)}
                                    </Popup>
                                </Marker>
                            ))}
                        </Fragment>
                        );
                    })}
                </MapContainer>
            </div>
        </Card>
    );
};

const Scheduling = () => {
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optimizationStats, setOptimizationStats] = useState<OptimizationStats>({
        totalFuel: 590,
        efficiency: 45,
        conflicts: 2
    });
    const [unassignedJobs, setUnassignedJobs] = useState<Job[]>([]);
    const [groundedTractors, setGroundedTractors] = useState<GroundedTractor[]>([]);

    // Initial Data with Real Locations (Ikeja/Alausa Industrial Zone)
    const [schedules, setSchedules] = useState<TractorSchedule[]>([
        {
            tractorId: "T-800",
            model: "John Deere 6M",
            maxHours: 8,
            maintenanceDueIn: 40,
            jobs: [
                {
                    id: "J1",
                    fieldId: "Oregun Ind. Estate", // 6.620, 3.360 is Oregun
                    type: "Ploughing",
                    durationHours: 4,
                    startTime: 8,
                    fuelCost: 120,
                    profit: 500,
                    status: "scheduled",
                    latitude: 6.620,
                    longitude: 3.360,
                    timeWindowStart: DAY_START,
                    timeWindowEnd: 12
                },
                {
                    id: "J2",
                    fieldId: "Alausa Secretariat", // 6.610, 3.350 is near the Secretariat
                    type: "Harrowing",
                    durationHours: 3,
                    startTime: 13,
                    fuelCost: 80,
                    profit: 300,
                    status: "scheduled",
                    constraintWarning: "High Fuel Usage",
                    latitude: 6.610,
                    longitude: 3.350,
                    timeWindowStart: DAY_START,
                    timeWindowEnd: DAY_END
                }
            ]
        },
        {
            tractorId: "T-803",
            model: "Case IH Magnum",
            maxHours: 10,
            maintenanceDueIn: 5,
            jobs: [
                {
                    id: "J3",
                    fieldId: "Kudirat Abiola Way", // 6.605, 3.365 is near Ojota/Oregun link
                    type: "Seeding",
                    durationHours: 6,
                    startTime: 9,
                    fuelCost: 150,
                    profit: 800,
                    status: "scheduled",
                    constraintWarning: "Maintenance Risk",
                    latitude: 6.605,
                    longitude: 3.365,
                    timeWindowStart: DAY_START,
                    timeWindowEnd: DAY_END
                }
            ]
        },
        {
            tractorId: "T-806",
            model: "New Holland T7",
            maxHours: 8,
            maintenanceDueIn: 100,
            jobs: [
                {
                    id: "J4",
                    fieldId: "Agidingbi Project", // 6.625, 3.345 is Agidingbi area
                    type: "Harvesting",
                    durationHours: 5,
                    startTime: 7,
                    fuelCost: 100,
                    profit: 1200,
                    status: "scheduled",
                    latitude: 6.625,
                    longitude: 3.345,
                    timeWindowStart: DAY_START,
                    timeWindowEnd: DAY_END
                },
                {
                    id: "J5",
                    fieldId: "Oregun Ind. Estate", // Returning to Oregun
                    type: "Seeding",
                    durationHours: 2,
                    startTime: 14,
                    fuelCost: 40,
                    profit: 200,
                    status: "scheduled",
                    latitude: 6.620,
                    longitude: 3.360,
                    timeWindowStart: 10,
                    timeWindowEnd: DAY_END
                }
            ]
        }
    ]);

    // New Job Form State
    const [isAddJobOpen, setIsAddJobOpen] = useState(false);
    const emptyJobForm = {
        tractorId: "T-800",
        fieldId: "",
        type: "Ploughing",
        durationHours: 2,
        latitude: DEPOT[0],
        longitude: DEPOT[1],
        timeWindowStart: DAY_START,
        timeWindowEnd: DAY_END
    };
    const [newJob, setNewJob] = useState(emptyJobForm);

    const handleAddJob = () => {
        if (!newJob.fieldId) {
            toast.error("Please enter a field name");
            return;
        }

        // The solver silently drops jobs it cannot fit, so reject bad input here
        if (!(Number(newJob.durationHours) > 0)) {
            toast.error("Duration must be greater than zero");
            return;
        }

        if (Number(newJob.timeWindowEnd) < Number(newJob.timeWindowStart)) {
            toast.error("Latest start must be at or after the earliest start");
            return;
        }

        const job: Job = {
            id: `J${Date.now()}`,
            fieldId: newJob.fieldId,
            type: newJob.type as Job["type"],
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
        setNewJob({ ...emptyJobForm, tractorId: newJob.tractorId }); // Don't carry the last pin into the next job
        toast.success("Job Added", {
            description: `${job.type} at ${job.fieldId} (${job.latitude.toFixed(3)}, ${job.longitude.toFixed(3)})`
        });
    };

    const runOptimization = async () => {
        setIsOptimizing(true);

        try {
            const payload = { tractors: schedules };

            const response = await fetch(`${API_BASE}/optimize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const detail = await response.text().catch(() => '');
                throw new Error(`Solver returned ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`);
            }

            const data = await response.json();

            if (!Array.isArray(data.tractors)) {
                throw new Error('Solver response did not contain any routes');
            }

            setSchedules(data.tractors);
            setUnassignedJobs(data.unassigned || []);
            setGroundedTractors(data.grounded || []);
            setOptimizationStats(prev => data.stats ?? prev);

            if ((data.unassigned && data.unassigned.length > 0) || (data.grounded && data.grounded.length > 0)) {
                toast.warning(`Optimization Complete: Issues Detected`, {
                    description: `${data.unassigned?.length || 0} unassigned job(s), ${data.grounded?.length || 0} grounded tractor(s).`,
                    icon: <AlertTriangle className="w-5 h-5 text-orange-500" />
                });
            } else {
                toast.success("VRP Optimization Complete", {
                    description: `Routes optimized with Haversine distance & Time Windows. Efficiency: ${data.stats.efficiency}%`,
                    icon: <Zap className="w-5 h-5 text-yellow-500" />
                });
            }
        } catch (error) {
            // Without this the schedule silently keeps the pre-optimization routes
            console.error('VRP optimization failed', error);
            toast.error("Optimization Failed", {
                description: error instanceof Error
                    ? `${error.message}. Is the VRP engine running on ${API_BASE}?`
                    : `Could not reach the VRP engine on ${API_BASE}.`,
                icon: <AlertTriangle className="w-5 h-5 text-red-500" />
            });
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

                    {/* Unassigned Jobs Alert */}
                    {unassignedJobs.length > 0 && (
                        <Card className="mb-8 border-status-maintenance/50 bg-status-maintenance/5 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <AlertTriangle className="w-6 h-6 text-status-maintenance" />
                                <h2 className="text-xl font-bold text-status-maintenance">Capacity Overflow / Unassigned Jobs</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {unassignedJobs.map((job) => (
                                    <div key={job.id} className="bg-background/50 border border-status-maintenance/30 rounded-lg p-4 flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-foreground">{job.fieldId}</span>
                                            <Badge variant="outline" className="border-status-maintenance text-status-maintenance">
                                                Unassigned
                                            </Badge>
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {job.type} • {job.durationHours}h
                                        </div>
                                        {job.constraintWarning && (
                                            <div className="text-xs text-status-maintenance mt-1 font-medium">
                                                Reason: {job.constraintWarning}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Grounded Machines Alert */}
                    {groundedTractors.length > 0 && (
                        <Card className="mb-8 border-red-500/50 bg-red-500/5 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <AlertTriangle className="w-6 h-6 text-red-500" />
                                <h2 className="text-xl font-bold text-red-500">Grounded Fleet / Maintenance Alerts</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {groundedTractors.map((tractor) => (
                                    <div key={tractor.tractorId} className="bg-background/50 border border-red-500/30 rounded-lg p-4 flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-foreground">{tractor.tractorId}</span>
                                            <Badge variant="outline" className="border-red-500 text-red-500">
                                                GROUNDED
                                            </Badge>
                                        </div>
                                        <div className="text-sm text-red-400 font-medium">
                                            {tractor.reason}
                                        </div>
                                        {tractor.telemetry && (
                                            <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-muted-foreground bg-background/50 p-2 rounded">
                                                <div>Temp: {tractor.telemetry.engineTemp}°C</div>
                                                <div>Pressure: {tractor.telemetry.hydraulicPressure} psi</div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

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

                                            {/* Work scheduled outside the drawn window is still reported */}
                                            {jobsOutsideWorkingDay(tractor.jobs).length > 0 && (
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground bg-accent/10 px-2 py-0.5 rounded">
                                                    <Clock className="w-3 h-3" />
                                                    <span>
                                                        {jobsOutsideWorkingDay(tractor.jobs).length} job(s) outside 06:00-18:00
                                                    </span>
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
                                                // Clamp to the 06:00-18:00 track so a job scheduled
                                                // outside the working day cannot render off-chart
                                                const visibleStart = Math.max(job.startTime, DAY_START);
                                                const visibleEnd = Math.min(job.startTime + job.durationHours, DAY_END);
                                                if (visibleEnd <= visibleStart) return null;

                                                const span = DAY_END - DAY_START;
                                                const leftPercent = ((visibleStart - DAY_START) / span) * 100;
                                                const widthPercent = ((visibleEnd - visibleStart) / span) * 100;

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
                    <RouteMap schedules={schedules} distanceSource={optimizationStats.distanceSource} />
                </main>
            </div>
        </div>
    );
};

export default Scheduling;
