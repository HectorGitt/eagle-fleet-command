import { Fragment, useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { AppShell, PageHeader, Section } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useFleet } from "@/context/FleetContext";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
    Tractor,
    Plus,
    Search,
    Trash2,
    Home
} from "lucide-react";
import { toast } from "sonner";
import { TILE_ATTRIBUTION, tileUrlFor } from "@/lib/basemap";
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

// The seed below only describes the three machines that start with work. Every
// other tractor in the fleet is still schedulable, so it joins the board empty
// with these stand-in specs rather than being invisible to the planner.
const FLEET_MODELS = ['John Deere 6M', 'Case IH Magnum', 'New Holland T7', 'Massey Ferguson 8S', 'Fendt 700 Vario'];
const DEFAULT_MAX_HOURS = 8;
const DEFAULT_MAINTENANCE_DUE_IN = 100;

// Stable per-machine model so the board does not reshuffle on a telemetry tick
const modelFor = (tractorId: string) => {
    const suffix = Number(tractorId.replace(/\D/g, ''));
    return FLEET_MODELS[(Number.isFinite(suffix) ? suffix : 0) % FLEET_MODELS.length];
};

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
    // Job fuel is the work itself, travel fuel the driving between sites
    jobFuel?: number;
    travelFuel?: number;
    totalDistanceKm?: number;
    distanceSource?: DistanceSource;
}

// The add/edit dialog's working copy of a job. Coordinates are null until a
// pin is dropped, so an unplaced job can never be mistaken for one at the depot.
interface JobForm {
    tractorId: string;
    fieldId: string;
    type: string;
    durationHours: number;
    latitude: number | null;
    longitude: number | null;
    timeWindowStart: number;
    timeWindowEnd: number;
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

// Location Picker Component. `value` prefills the pin when an existing job is
// reopened for editing, so the map never contradicts the job it belongs to.
const LocationPicker = ({ value, onLocationSelect }: {
    value: [number, number] | null;
    onLocationSelect: (lat: number, lng: number, name?: string) => void;
}) => {
    const { resolvedTheme } = useTheme();
    const [position, setPosition] = useState<[number, number] | null>(value);
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

                // Register the pin before the network call. Nominatim regularly
                // takes seconds, and until it answered the form still read "no
                // location chosen" with a pin sitting on the map - so saving was
                // refused for a location the user could plainly see they'd picked.
                onLocationSelect(lat, lng);

                // The reverse geocode only suggests a name; the pin already counts
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                    const data = await response.json();
                    const name = data.display_name ? data.display_name.split(',')[0] : "Selected Location";
                    onLocationSelect(lat, lng, name);
                    toast.success("Location Selected", { description: name });
                } catch (error) {
                    // Losing the suggestion is fine - the coordinates are already set
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
                <MapContainer center={value ?? DEPOT} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url={tileUrlFor(resolvedTheme)} attribution={TILE_ATTRIBUTION} />
                    <MapEvents />
                    <MapController coords={position} />
                    {position && <Marker position={position} />}
                </MapContainer>
            </div>
        </div>
    );
};

// Route Visualization Component

// Which token labels which job type. Categorical, never a status colour - a
// task type is not a health signal.
const JOB_TYPE_VAR: Record<string, string> = {
    Ploughing: '--cat-1',
    Harrowing: '--cat-2',
    Seeding: '--cat-3',
    Harvesting: '--cat-4',
};

const jobTypeVar = (type: string) => JOB_TYPE_VAR[type] ?? '--cat-5';

/** Inline style for a job block, tinted from its categorical token */
const jobTypeStyle = (type: string) => {
    const token = jobTypeVar(type);
    return {
        backgroundColor: `hsl(var(${token}) / 0.16)`,
        borderColor: `hsl(var(${token}) / 0.5)`,
        color: `hsl(var(${token}))`,
    };
};

const CAT_TOKENS = ['--cat-1', '--cat-2', '--cat-3', '--cat-4', '--cat-5'];

// Used until the tokens are read, and if getComputedStyle returns nothing
const FALLBACK_ROUTE_COLORS = ['#4c9aff', '#a78bfa', '#22c3e6', '#f59e0b', '#ec4899'];

/** Read the categorical tokens off <html> as literal colour strings */
const readRouteColors = (): string[] | null => {
    const styles = getComputedStyle(document.documentElement);
    const resolved = CAT_TOKENS.map(token => {
        const value = styles.getPropertyValue(token).trim();
        return value ? `hsl(${value})` : '';
    });
    return resolved.every(Boolean) ? resolved : null;
};

/**
 * Leaflet writes colours into SVG presentation attributes, where `var()` is
 * not resolved - so unlike the DOM elsewhere in this page, the route colours
 * have to be read off the document as literal strings.
 *
 * The theme class is applied by the provider's own effect, and React runs
 * child effects before parent ones, so reading once on mount captures the
 * pre-theme palette and never corrects itself. Watching the attribute covers
 * both that first paint and any later theme switch.
 */
const useRouteColors = () => {
    const [colors, setColors] = useState<string[]>(() =>
        (typeof window === 'undefined' ? null : readRouteColors()) ?? FALLBACK_ROUTE_COLORS
    );

    useEffect(() => {
        const sync = () => {
            const next = readRouteColors();
            if (next) setColors(prev => (prev.join('|') === next.join('|') ? prev : next));
        };
        sync();

        const observer = new MutationObserver(sync);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    return colors;
};

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

// Numbered pin so the visiting order of a route is readable on the map. The
// last stop gets a ring so you can tell where a route ends - every route loops
// back to the depot, so the line alone never shows which end is which.
const stopIcon = (color: string, sequence: number, isLast: boolean) =>
    L.divIcon({
        className: '',
        html: `<div style="width:30px;height:30px;display:flex;align-items:center;justify-content:center;
               border-radius:50%;${isLast ? `box-shadow:0 0 0 2px ${color};background:rgba(0,0,0,0.25)` : ''}">
               <div style="background:${color};color:#fff;width:22px;height:22px;border-radius:50%;
               display:flex;align-items:center;justify-content:center;font:700 11px/1 system-ui;
               border:2px solid rgba(255,255,255,0.85);box-shadow:0 1px 4px rgba(0,0,0,0.5)">${sequence}</div></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
    });

// The depot is where every route starts and ends, so it must not look like a
// stop or borrow a route colour. A white home plate reads at any zoom.
const depotIcon = L.divIcon({
    className: '',
    html: `<div style="width:34px;height:34px;border-radius:50%;background:#fff;
           border:3px solid #111827;box-shadow:0 2px 8px rgba(0,0,0,0.55);
           display:flex;align-items:center;justify-content:center">
           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111827"
                stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
             <path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>
           </svg></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
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
    const routeColors = useRouteColors();
    const { resolvedTheme } = useTheme();
    const tileUrl = tileUrlFor(resolvedTheme);

    // Jobs arrive in the order the solver visits them - that order is the route
    const routes = useMemo(() => schedules
        .map((tractor, idx) => {
            const stops = tractor.jobs.filter(hasCoords);
            return {
                tractorId: tractor.tractorId,
                color: routeColors[idx % routeColors.length],
                stops,
                path: [DEPOT, ...stops.map(j => [j.latitude, j.longitude] as [number, number]), DEPOT],
            };
        })
        .filter(route => route.stops.length > 0), [schedules, routeColors]);

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
        <div className="surface mt-4 flex h-[480px] flex-col overflow-hidden p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <h2 className="text-[15px] font-semibold text-foreground">Optimized Routes</h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    {routes.map((route) => {
                        const road = roadRoutes[route.tractorId];
                        return (
                            <div key={route.tractorId} className="flex items-center gap-1.5 text-xs">
                                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: route.color }} />
                                <span className="ident text-[11px] text-foreground">{route.tractorId}</span>
                                <span className="text-[11px] text-muted-foreground">
                                    {route.stops.length} {route.stops.length === 1 ? 'stop' : 'stops'}
                                    {road && ` · ${road.distanceKm.toFixed(1)} km · ${Math.round(road.durationMin)} min`}
                                </span>
                            </div>
                        );
                    })}
                    {routes.length > 0 && (
                        <span className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Home className="h-3 w-3" aria-hidden /> depot
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground" aria-hidden />
                                1 = first stop
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="h-3.5 w-3.5 rounded-full ring-1 ring-muted-foreground p-[2px]" aria-hidden>
                                    <span className="block h-full w-full rounded-full bg-muted-foreground" />
                                </span>
                                ringed = last stop
                            </span>
                        </span>
                    )}
                    {routes.length === 0 && (
                        <span className="text-xs text-muted-foreground">No routed jobs yet</span>
                    )}
                    {routingStatus === 'loading' && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock className="h-3 w-3 animate-spin" /> Fetching road paths…
                        </span>
                    )}
                    {(routingStatus === 'failed' || routingStatus === 'partial') && (
                        <StatusBadge tone="warning" dot>
                            <span title={`OSRM (${OSRM_BASE}) did not return a road path`}>
                                {routingStatus === 'failed' ? 'Straight-line fallback' : 'Some routes straight-line'}
                            </span>
                        </StatusBadge>
                    )}
                    {/* The drawn path and the ordering come from separate calls -
                        the solver's /table matrix can fall back independently */}
                    {distanceSource === 'osrm' && (
                        <span className="text-[11px] text-muted-foreground">Ordered by road distance</span>
                    )}
                    {distanceSource === 'haversine' && (
                        <StatusBadge tone="warning" dot>
                            <span title="The solver could not reach OSRM, so stop ordering used straight-line distance">
                                Ordered by straight-line distance
                            </span>
                        </StatusBadge>
                    )}
                </div>
            </div>
            <div className="min-h-0 w-full flex-1 overflow-hidden rounded-md border border-border">
                <MapContainer center={DEPOT} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer key={tileUrl} url={tileUrl} attribution={TILE_ATTRIBUTION} />
                    <FitRoutes points={points} boundsKey={boundsKey} />

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
                                    icon={stopIcon(route.color, stopIdx + 1, stopIdx === route.stops.length - 1)}
                                >
                                    <Popup>
                                        <strong>{job.fieldId}</strong><br />
                                        {route.tractorId} &middot; stop {stopIdx + 1} of {route.stops.length}
                                        {stopIdx === route.stops.length - 1 && ' (last before depot)'}<br />
                                        {job.type}<br />
                                        {formatHour(job.startTime)} &ndash; {formatHour(job.startTime + job.durationHours)}
                                    </Popup>
                                </Marker>
                            ))}
                        </Fragment>
                        );
                    })}

                    {/* Rendered after the routes so the depot plate is never
                        buried under a polyline that passes through it */}
                    <Marker position={DEPOT} icon={depotIcon} zIndexOffset={1000}>
                        <Popup>
                            <strong>Depot</strong><br />
                            Omatsola Complex, Alausa<br />
                            Every route starts and ends here
                        </Popup>
                    </Marker>
                </MapContainer>
            </div>
        </div>
    );
};

// Seed board, kept at module scope so Reset can restore it without a page reload
const INITIAL_SCHEDULES: TractorSchedule[] = [
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
];

const INITIAL_STATS: OptimizationStats = {
    totalFuel: 590,
    efficiency: 45,
    conflicts: 2
};

// A day's planning is real work now that jobs can be added, edited and moved,
// so the board outlives a refresh. Per-browser only - this is not a server.
const STORAGE_KEY = 'eaglesight.scheduling.board.v1';

interface PersistedBoard {
    schedules: TractorSchedule[];
    unassignedJobs: Job[];
    groundedTractors: GroundedTractor[];
    optimizationStats: OptimizationStats;
}

// Stats travel with the board: restoring solved routes under seed numbers would
// have the timeline and the stat cards describing different days.
const loadBoard = (): PersistedBoard | null => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        // Guard the shape - a half-written or stale entry should fall back to
        // the seed rather than crash the page on mount
        if (!Array.isArray(parsed?.schedules)) return null;
        return {
            schedules: parsed.schedules,
            unassignedJobs: Array.isArray(parsed.unassignedJobs) ? parsed.unassignedJobs : [],
            groundedTractors: Array.isArray(parsed.groundedTractors) ? parsed.groundedTractors : [],
            optimizationStats: parsed.optimizationStats ?? INITIAL_STATS,
        };
    } catch {
        // Private browsing, cleared site data, or blocked storage
        return null;
    }
};

const Scheduling = () => {
    // Read once on mount; every piece of board state initialises from it
    const [restored] = useState(loadBoard);

    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optimizationStats, setOptimizationStats] = useState<OptimizationStats>(
        () => restored?.optimizationStats ?? INITIAL_STATS
    );
    const [unassignedJobs, setUnassignedJobs] = useState<Job[]>(
        () => restored?.unassignedJobs ?? []
    );
    const [groundedTractors, setGroundedTractors] = useState<GroundedTractor[]>(
        () => restored?.groundedTractors ?? []
    );

    const [schedules, setSchedules] = useState<TractorSchedule[]>(
        () => restored?.schedules ?? structuredClone(INITIAL_SCHEDULES)
    );

    // Persist the whole board on every change
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                schedules,
                unassignedJobs,
                groundedTractors,
                optimizationStats,
            }));
        } catch {
            // Storage full or blocked - the board still works for this session
        }
    }, [schedules, unassignedJobs, groundedTractors, optimizationStats]);

    // Every machine the fleet reports is schedulable, not just the seeded three.
    // Merge is additive and keyed by id, so a telemetry tick never touches the
    // jobs already on the board.
    const { tractors: fleet } = useFleet();
    useEffect(() => {
        if (fleet.length === 0) return;
        setSchedules(prev => {
            // Grounded machines were deliberately pulled from the pool by the
            // solver - they belong in their own panel, not back on the timeline
            const known = new Set([
                ...prev.map(t => t.tractorId),
                ...groundedTractors.map(g => g.tractorId),
            ]);
            const additions = fleet
                .filter(t => !known.has(t.tractorId))
                .map(t => ({
                    tractorId: t.tractorId,
                    model: modelFor(t.tractorId),
                    maxHours: DEFAULT_MAX_HOURS,
                    maintenanceDueIn: DEFAULT_MAINTENANCE_DUE_IN,
                    jobs: [] as Job[],
                }));
            if (additions.length === 0) return prev;
            return [...prev, ...additions].sort((a, b) => a.tractorId.localeCompare(b.tractorId));
        });
    }, [fleet, groundedTractors]);

    // Job Form State. One dialog serves both create and edit; `editingJobId`
    // is the mode switch, and null coordinates mean nothing has been pinned yet.
    const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
    const [editingJobId, setEditingJobId] = useState<string | null>(null);
    const emptyJobForm: JobForm = {
        tractorId: schedules[0]?.tractorId ?? "T-800",
        fieldId: "",
        type: "Ploughing",
        durationHours: 2,
        latitude: null,
        longitude: null,
        timeWindowStart: DAY_START,
        timeWindowEnd: DAY_END
    };
    const [newJob, setNewJob] = useState<JobForm>(emptyJobForm);

    const openNewJob = () => {
        setEditingJobId(null);
        setNewJob({ ...emptyJobForm, tractorId: newJob.tractorId });
        setIsJobDialogOpen(true);
    };

    // Reopen an existing job — from a timeline bar or an unassigned card
    const openExistingJob = (job: Job, tractorId: string) => {
        setEditingJobId(job.id);
        setNewJob({
            tractorId,
            fieldId: job.fieldId,
            type: job.type,
            durationHours: job.durationHours,
            latitude: job.latitude ?? null,
            longitude: job.longitude ?? null,
            timeWindowStart: job.timeWindowStart ?? DAY_START,
            timeWindowEnd: job.timeWindowEnd ?? DAY_END,
        });
        setIsJobDialogOpen(true);
    };

    // Every job currently on the board, wherever it lives
    const allJobs = useMemo(
        () => [...schedules.flatMap(t => t.jobs), ...unassignedJobs],
        [schedules, unassignedJobs]
    );

    const closeJobDialog = () => {
        setIsJobDialogOpen(false);
        setEditingJobId(null);
        setNewJob({ ...emptyJobForm, tractorId: newJob.tractorId }); // Don't carry the last pin into the next job
    };

    const handleSaveJob = () => {
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

        // Without a pin the job would route to the depot and appear to cost
        // nothing to reach, which reads as a real plan but is not one
        if (newJob.latitude === null || newJob.longitude === null) {
            toast.error("Pick a location", {
                description: "Search for the field or click the map to drop a pin."
            });
            return;
        }

        const windowStart = Number(newJob.timeWindowStart);
        const windowEnd = Number(newJob.timeWindowEnd);
        const existing = editingJobId ? allJobs.find(j => j.id === editingJobId) : undefined;

        const job: Job = {
            id: existing?.id ?? `J${Date.now()}`,
            fieldId: newJob.fieldId,
            type: newJob.type as Job["type"],
            durationHours: Number(newJob.durationHours),
            // Keep the solved start when it still fits the window, else pull it back in
            startTime: Math.min(Math.max(existing?.startTime ?? windowStart, windowStart), windowEnd),
            fuelCost: existing?.fuelCost ?? 50,
            profit: existing?.profit ?? 100,
            status: "scheduled",
            // constraintWarning is deliberately not carried over: it described the
            // job before the edit, and only another solve can confirm it still holds
            latitude: newJob.latitude,
            longitude: newJob.longitude,
            timeWindowStart: windowStart,
            timeWindowEnd: windowEnd
        };

        // One path covers create, edit in place, move between machines, and
        // promoting a job back out of the unassigned pile
        setSchedules(prev => prev.map(t => {
            const withoutJob = t.jobs.filter(j => j.id !== job.id);
            if (t.tractorId === newJob.tractorId) {
                return { ...t, jobs: [...withoutJob, job].sort((a, b) => a.startTime - b.startTime) };
            }
            return withoutJob.length === t.jobs.length ? t : { ...t, jobs: withoutJob };
        }));
        setUnassignedJobs(prev => prev.filter(j => j.id !== job.id));

        closeJobDialog();
        toast.success(existing ? "Job Updated" : "Job Added", {
            description: `${job.type} at ${job.fieldId} (${job.latitude.toFixed(3)}, ${job.longitude.toFixed(3)})`
        });
    };

    const handleDeleteJob = () => {
        if (!editingJobId) return;
        const removed = allJobs.find(j => j.id === editingJobId);

        setSchedules(prev => prev.map(t => (
            t.jobs.some(j => j.id === editingJobId)
                ? { ...t, jobs: t.jobs.filter(j => j.id !== editingJobId) }
                : t
        )));
        setUnassignedJobs(prev => prev.filter(j => j.id !== editingJobId));

        closeJobDialog();
        toast.success("Job Removed", {
            description: removed ? `${removed.type} at ${removed.fieldId}` : undefined
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
                    icon: <AlertTriangle className="h-5 w-5 text-status-warning" />
                });
            } else {
                toast.success("VRP Optimization Complete", {
                    description: `${data.stats?.distanceSource === 'osrm' ? 'Road-distance' : 'Straight-line'} routing with time windows. Efficiency: ${data.stats?.efficiency ?? '—'}%`,
                    icon: <Zap className="h-5 w-5 text-primary" />
                });
            }
        } catch (error) {
            // Without this the schedule silently keeps the pre-optimization routes
            console.error('VRP optimization failed', error);
            toast.error("Optimization Failed", {
                description: error instanceof Error
                    ? `${error.message}. Is the VRP engine running on ${API_BASE}?`
                    : `Could not reach the VRP engine on ${API_BASE}.`,
                icon: <AlertTriangle className="h-5 w-5 text-status-maintenance" />
            });
        } finally {
            setIsOptimizing(false);
        }
    };

    // A page reload used to be the reset. Now that the board is persisted a
    // reload would restore the very plan being discarded, so clear it explicitly.
    const resetSimulation = () => {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {
            // Nothing stored to clear
        }
        setSchedules(structuredClone(INITIAL_SCHEDULES));
        setUnassignedJobs([]);
        setGroundedTractors([]);
        setOptimizationStats(INITIAL_STATS);
        closeJobDialog();
        toast.success("Schedule Reset", { description: "Back to the starting plan." });
    };

    return (
        <AppShell>
            <PageHeader
                title="Machine Scheduling"
                description="Vehicle-routing solver with road distances, time windows and shift capacity"
                icon={<Calendar />}
                actions={
                    <>
                        <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={openNewJob}>
                            <Plus className="h-3.5 w-3.5" />
                            Add job
                        </Button>
                        <Dialog
                            open={isJobDialogOpen}
                            onOpenChange={(open) => (open ? setIsJobDialogOpen(true) : closeJobDialog())}
                        >
                                <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle>{editingJobId ? "Edit Job" : "Add New Job"}</DialogTitle>
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
                                            <div className={`mb-1 text-xs ${
                                                newJob.latitude === null ? 'text-status-maintenance' : 'text-muted-foreground'
                                            }`}>
                                                {newJob.latitude !== null && newJob.longitude !== null
                                                    ? `Selected: ${newJob.latitude.toFixed(4)}, ${newJob.longitude.toFixed(4)}`
                                                    : 'No location chosen yet — search for the field or click the map.'}
                                            </div>
                                            <LocationPicker
                                                key={editingJobId ?? 'new'}
                                                value={newJob.latitude !== null && newJob.longitude !== null
                                                    ? [newJob.latitude, newJob.longitude]
                                                    : null}
                                                onLocationSelect={(lat, lng, name) => {
                                                    setNewJob(prev => ({
                                                        ...prev,
                                                        latitude: lat,
                                                        longitude: lng,
                                                        // Only fill a blank name - never overwrite one already typed
                                                        fieldId: prev.fieldId || name || ""
                                                    }));
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter className="sm:justify-between">
                                        {editingJobId ? (
                                            <Button variant="destructive" className="gap-1.5" onClick={handleDeleteJob}>
                                                <Trash2 className="h-4 w-4" />
                                                Delete job
                                            </Button>
                                        ) : <span />}
                                        <Button onClick={handleSaveJob}>
                                            {editingJobId ? "Save changes" : "Save Job"}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8" disabled={isOptimizing}>
                                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                                    Reset
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Reset the schedule?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This discards the saved plan &mdash; every job you have added,
                                        edited or moved &mdash; and restores the starting schedule.
                                        It cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Keep my plan</AlertDialogCancel>
                                    <AlertDialogAction onClick={resetSimulation}>
                                        Reset schedule
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <Button size="sm" className="h-8" onClick={runOptimization} disabled={isOptimizing}>
                            {isOptimizing ? (
                                <>
                                    <Clock className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                    Solving…
                                </>
                            ) : (
                                <>
                                    <Play className="mr-1.5 h-3.5 w-3.5" />
                                    Run optimization
                                </>
                            )}
                        </Button>
                    </>
                }
            />

            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                    label="Total Fuel Est."
                    value={optimizationStats.totalFuel}
                    unit="L"
                    icon={<Fuel />}
                    tone="warning"
                    detail={optimizationStats.travelFuel !== undefined
                        ? `${optimizationStats.jobFuel} L field work + ${optimizationStats.travelFuel} L driving${
                            optimizationStats.totalDistanceKm !== undefined ? ` over ${optimizationStats.totalDistanceKm} km` : ''}`
                        : 'Run the solver for a road-distance estimate'}
                />
                <StatCard
                    label="Schedule Efficiency"
                    value={`${optimizationStats.efficiency}%`}
                    icon={<Zap />}
                    tone="operational"
                    detail={optimizationStats.efficiency >= 100
                        ? 'Every active job placed on a route'
                        : 'Share of active jobs placed on a route'}
                />
                <StatCard
                    label="Active Conflicts"
                    value={optimizationStats.conflicts}
                    icon={<AlertTriangle />}
                    tone={optimizationStats.conflicts > 0 ? 'critical' : 'operational'}
                    detail={optimizationStats.conflicts > 0
                        ? 'Unassigned jobs plus grounded machines'
                        : 'No constraints broken'}
                />
            </div>

            {unassignedJobs.length > 0 && (
                <div className="mb-4 rounded-lg border border-status-maintenance/30 bg-status-maintenance-bg p-5">
                    <div className="mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-status-maintenance" />
                        <h2 className="text-[15px] font-semibold text-status-maintenance">
                            Unassigned jobs ({unassignedJobs.length})
                        </h2>
                    </div>
                    <p className="mb-3 text-xs text-muted-foreground">
                        No machine had a feasible slot for this work. Click a job to widen its
                        time window, put it on another machine, or drop it.
                    </p>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {unassignedJobs.map((job) => (
                            <button
                                key={job.id}
                                type="button"
                                onClick={() => openExistingJob(job, newJob.tractorId)}
                                title="Click to edit or reassign"
                                className="flex flex-col gap-1.5 rounded-md border border-border bg-card p-3 text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                            >
                                <div className="flex w-full items-start justify-between gap-2">
                                    <span className="text-[13px] font-medium text-foreground">{job.fieldId}</span>
                                    <StatusBadge tone="critical">Unassigned</StatusBadge>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {job.type} &middot; {job.durationHours}h
                                </div>
                                {job.constraintWarning && (
                                    <div className="text-[11px] font-medium text-status-maintenance">
                                        {job.constraintWarning}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {groundedTractors.length > 0 && (
                <div className="mb-4 rounded-lg border border-status-maintenance/30 bg-status-maintenance-bg p-5">
                    <div className="mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-status-maintenance" />
                        <h2 className="text-[15px] font-semibold text-status-maintenance">
                            Grounded machines ({groundedTractors.length})
                        </h2>
                    </div>
                    <p className="mb-3 text-xs text-muted-foreground">
                        Removed from the pool before routing, so no work was assigned to them.
                    </p>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {groundedTractors.map((tractor) => (
                            <div key={tractor.tractorId} className="flex flex-col gap-1.5 rounded-md border border-border bg-card p-3">
                                <div className="flex items-start justify-between gap-2">
                                    <span className="ident text-foreground">{tractor.tractorId}</span>
                                    <StatusBadge tone="critical" dot pulse>Grounded</StatusBadge>
                                </div>
                                <div className="text-xs font-medium text-status-maintenance">{tractor.reason}</div>
                                {tractor.telemetry && (
                                    <div className="mt-1 grid grid-cols-2 gap-2 rounded bg-muted/60 p-2 text-[11px] text-muted-foreground">
                                        <div>Temp: {tractor.telemetry.engineTemp}&deg;C</div>
                                        <div>Pressure: {tractor.telemetry.hydraulicPressure} psi</div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <Section
                title="Daily Schedule Timeline"
                description="06:00 - 18:00 working day"
                actions={
                    <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                        {['Ploughing', 'Harrowing', 'Seeding', 'Harvesting'].map(type => (
                            <div key={type} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <span
                                    className="h-2.5 w-2.5 rounded-sm border"
                                    style={jobTypeStyle(type)}
                                />
                                {type}
                            </div>
                        ))}
                    </div>
                }
            >
                        <div className="relative">
                            {/* Time Grid */}
                            <div className="mb-3 grid grid-cols-12 border-b border-border pb-1.5">
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <div key={i} className="font-mono text-[10px] text-muted-foreground">
                                        {(i + 6).toString().padStart(2, '0')}:00
                                    </div>
                                ))}
                            </div>

                            {/* Tractor Rows */}
                            <div className="space-y-4">
                                {schedules.map((tractor) => (
                                    <div key={tractor.tractorId} className="relative">
                                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                            <div className="flex w-44 items-center gap-2">
                                                <Tractor className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                                <div className="min-w-0">
                                                    <div className="ident text-foreground">{tractor.tractorId}</div>
                                                    <div className="text-[10px] text-muted-foreground">{tractor.model}</div>
                                                </div>
                                            </div>

                                            {tractor.jobs.length === 0 && (
                                                <StatusBadge tone="neutral">No work assigned</StatusBadge>
                                            )}

                                            {/* Maintenance Warning */}
                                            {tractor.maintenanceDueIn < 10 && (
                                                <StatusBadge tone="critical" dot>
                                                    Service due in {tractor.maintenanceDueIn}h
                                                </StatusBadge>
                                            )}

                                            {/* Work scheduled outside the drawn window is still reported */}
                                            {jobsOutsideWorkingDay(tractor.jobs).length > 0 && (
                                                <StatusBadge tone="warning">
                                                    {jobsOutsideWorkingDay(tractor.jobs).length} job(s) outside 06:00-18:00
                                                </StatusBadge>
                                            )}
                                        </div>

                                        {/* Timeline Track */}
                                        <div className="relative h-11 w-full overflow-hidden rounded-md border border-border bg-muted/40">
                                            {/* Hour Markers (Background) */}
                                            <div className="pointer-events-none absolute inset-0 grid grid-cols-12">
                                                {Array.from({ length: 12 }).map((_, i) => (
                                                    <div key={i} className="h-full border-r border-border/50 last:border-r-0" />
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
                                                    <button
                                                        key={job.id}
                                                        type="button"
                                                        onClick={() => openExistingJob(job, tractor.tractorId)}
                                                        title={`${job.fieldId} - ${job.type}, ${formatHour(job.startTime)}-${formatHour(job.startTime + job.durationHours)} (click to edit)`}
                                                        className="absolute bottom-1 top-1 flex cursor-pointer flex-col justify-center overflow-hidden rounded border px-2 text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                                                        style={{
                                                            left: `${leftPercent}%`,
                                                            width: `${widthPercent}%`,
                                                            ...jobTypeStyle(job.type),
                                                        }}
                                                    >
                                                        <div className="truncate text-[11px] font-semibold leading-tight">{job.fieldId}</div>
                                                        <div className="truncate text-[10px] leading-tight opacity-75">
                                                            {formatHour(job.startTime)} &ndash; {formatHour(job.startTime + job.durationHours)}
                                                        </div>

                                                        {/* Constraint Warning Icon */}
                                                        {job.constraintWarning && (
                                                            <div
                                                                className="absolute -right-0.5 -top-0.5 rounded-full bg-status-maintenance p-0.5 text-white shadow-sm"
                                                                title={job.constraintWarning}
                                                            >
                                                                <AlertTriangle className="h-2.5 w-2.5" />
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
            </Section>

            {/* Route Visualization Map */}
            <RouteMap schedules={schedules} distanceSource={optimizationStats.distanceSource} />
        </AppShell>
    );
};

export default Scheduling;
