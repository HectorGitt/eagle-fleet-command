/**
 * Tractor Fleet Telemetry and AI Diagnostics Engine
 * Physics-based monitoring and predictive maintenance
 */

export interface TractorTelemetry {
  tractorId: string;
  engineTemp: number; // Celsius
  oilPressure: number; // PSI
  hydraulicLoad: number; // Percentage
  fuelLevel: number; // Percentage
  gpsCoordinates: { lat: number; lng: number };
  timestamp: Date;
}

export interface MaintenanceAlert {
  severity: 'critical' | 'warning' | 'normal';
  message: string;
  technicalReason: string;
}

export interface RouteOptimization {
  optimizedOrder: { lat: number; lng: number }[];
  totalDistance: number;
  distanceSaved: number;
  savingsPercentage: number;
}

// Nigerian farm region bounds (example: Niger State agricultural zone)
const FARM_BOUNDS = {
  lat: { min: 9.0, max: 9.5 },
  lng: { min: 5.5, max: 6.0 },
};

/**
 * Generates realistic mock telemetry data for a tractor
 * Simulates sensor readings with natural fluctuations
 */
export function generateTractorTelemetry(tractorId: string): TractorTelemetry {
  // Engine temperature: Diesel engines operate optimally at 85-95°C
  // Can spike to 110°C under heavy load (thermal stress threshold)
  const engineTemp = 85 + Math.random() * 25;

  // Oil pressure: Modern hydraulic systems require 30-60 PSI
  // Below 35 PSI indicates viscosity breakdown or pump failure
  const oilPressure = 30 + Math.random() * 30;

  // Hydraulic load: 0-100% representing actuator strain
  // >90% indicates cavitation risk (air bubble formation in fluid)
  const hydraulicLoad = Math.random() * 100;

  // Fuel level: Percentage of tank capacity
  const fuelLevel = 20 + Math.random() * 80;

  // GPS coordinates: Randomized within farm boundaries
  const gpsCoordinates = {
    lat: FARM_BOUNDS.lat.min + Math.random() * (FARM_BOUNDS.lat.max - FARM_BOUNDS.lat.min),
    lng: FARM_BOUNDS.lng.min + Math.random() * (FARM_BOUNDS.lng.max - FARM_BOUNDS.lng.min),
  };

  return {
    tractorId,
    engineTemp,
    oilPressure,
    hydraulicLoad,
    fuelLevel,
    gpsCoordinates,
    timestamp: new Date(),
  };
}

/**
 * Predictive maintenance engine using physics-based diagnostics
 * Analyzes telemetry data against known failure modes
 */
export function predictMaintenance(
  telemetry: TractorTelemetry,
  historicalLoad?: number[]
): MaintenanceAlert {
  const { engineTemp, oilPressure, hydraulicLoad } = telemetry;

  // RULE 1: Thermal Viscosity Breakdown
  // Physics: High temperature reduces oil viscosity (μ ∝ 1/T)
  // When μ drops, hydrodynamic lubrication fails, causing metal-to-metal contact
  // Critical threshold: T > 105°C AND P < 35 PSI
  if (engineTemp > 105 && oilPressure < 35) {
    return {
      severity: 'critical',
      message: 'Critical Alert: Thermal Viscosity Breakdown',
      technicalReason:
        'Oil viscosity has degraded beyond safe operating limits due to excessive heat. ' +
        'Hydrodynamic film strength insufficient for bearing protection. ' +
        'Risk: Bearing seizure within 2-4 hours of operation.',
    };
  }

  // RULE 2: Hydraulic Pump Cavitation Risk
  // Physics: Cavitation occurs when fluid pressure drops below vapor pressure
  // This creates vapor bubbles that implode violently, eroding pump surfaces
  // Sustained high load (>90%) increases suction-side pressure drop
  const loadHistory = historicalLoad || [hydraulicLoad];
  const recentHighLoad = loadHistory.slice(-3).filter((load) => load > 90).length;

  if (recentHighLoad >= 3) {
    return {
      severity: 'warning',
      message: 'Warning: Pump Cavitation Risk Detected',
      technicalReason:
        'Sustained hydraulic load >90% has caused pressure drop in suction line. ' +
        'Bernoulli principle: High velocity → Low pressure → Vapor formation. ' +
        'Risk: Pump impeller damage, reduced efficiency by 15-20% within 48 hours.',
    };
  }

  // Additional diagnostic: Early warning for thermal stress
  if (engineTemp > 100) {
    return {
      severity: 'warning',
      message: 'Elevated Operating Temperature',
      technicalReason:
        'Engine temperature approaching thermal stress threshold. ' +
        'Monitor coolant system and reduce load if possible.',
    };
  }

  // RULE 3: Systems Nominal
  return {
    severity: 'normal',
    message: 'Systems Nominal',
    technicalReason: 'All parameters within optimal operating ranges.',
  };
}

/**
 * Route optimization using Nearest Neighbor TSP approximation
 * Minimizes total travel distance for multi-destination trips
 */
export function optimizeRoute(
  start: { lat: number; lng: number },
  destinations: { lat: number; lng: number }[]
): RouteOptimization {
  // Calculate Euclidean distance between two GPS coordinates
  const calculateDistance = (
    p1: { lat: number; lng: number },
    p2: { lat: number; lng: number }
  ): number => {
    // Simplified Euclidean distance (for small regions, acceptable approximation)
    // For production: use Haversine formula for spherical Earth
    const dx = p2.lng - p1.lng;
    const dy = p2.lat - p1.lat;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Calculate total distance for a given route order
  const totalRouteDistance = (points: { lat: number; lng: number }[]): number => {
    let distance = 0;
    for (let i = 0; i < points.length - 1; i++) {
      distance += calculateDistance(points[i], points[i + 1]);
    }
    return distance;
  };

  // Baseline: Linear path (original order)
  const linearPath = [start, ...destinations];
  const linearDistance = totalRouteDistance(linearPath);

  // Nearest Neighbor Heuristic for TSP
  const optimizedOrder: { lat: number; lng: number }[] = [];
  const unvisited = [...destinations];
  let current = start;

  while (unvisited.length > 0) {
    // Find nearest unvisited destination
    let nearestIndex = 0;
    let nearestDistance = calculateDistance(current, unvisited[0]);

    for (let i = 1; i < unvisited.length; i++) {
      const dist = calculateDistance(current, unvisited[i]);
      if (dist < nearestDistance) {
        nearestDistance = dist;
        nearestIndex = i;
      }
    }

    // Move to nearest and mark as visited
    const nearest = unvisited.splice(nearestIndex, 1)[0];
    optimizedOrder.push(nearest);
    current = nearest;
  }

  const optimizedPath = [start, ...optimizedOrder];
  const optimizedDistance = totalRouteDistance(optimizedPath);

  const distanceSaved = linearDistance - optimizedDistance;
  const savingsPercentage = (distanceSaved / linearDistance) * 100;

  return {
    optimizedOrder,
    totalDistance: optimizedDistance,
    distanceSaved,
    savingsPercentage,
  };
}
