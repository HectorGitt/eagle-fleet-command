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

  // Enhanced Analytics Fields
  activity: 'Ploughing' | 'Harrowing' | 'Transport' | 'Idle' | 'Maintenance';
  workDone: number; // Hectares covered
  farmSize: number; // Total hectares assigned
  fuelConsumed: number; // Total litres consumed today
  enginePower: number; // Horsepower (HP)
  efficiency: number; // Hectares per Litre
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

// Ogun State farm region bounds (approx center around Abeokuta)
const FARM_BOUNDS = {
  lat: { min: 7.10, max: 7.30 },
  lng: { min: 3.20, max: 3.50 },
};

/**
 * Generates realistic mock telemetry data for a tractor
 * Simulates sensor readings with natural fluctuations
 */
export function generateTractorTelemetry(
  tractorId: string,
  previousTelemetry?: TractorTelemetry
): TractorTelemetry {
  // Static properties
  const farmSize = 500;
  const enginePower = 300;

  if (previousTelemetry) {
    // Smooth transitions for existing tractor
    let engineTemp = previousTelemetry.engineTemp + (Math.random() * 4 - 2);
    engineTemp = Math.max(80, Math.min(115, engineTemp));

    let oilPressure = previousTelemetry.oilPressure + (Math.random() * 4 - 2);
    oilPressure = Math.max(25, Math.min(65, oilPressure));

    let hydraulicLoad = previousTelemetry.hydraulicLoad + (Math.random() * 10 - 5);
    hydraulicLoad = Math.max(0, Math.min(100, hydraulicLoad));

    const fuelConsumptionRate = 0.05 + (hydraulicLoad / 100) * 0.1;
    const fuelLevel = Math.max(0, previousTelemetry.fuelLevel - (fuelConsumptionRate / 300) * 100);
    const fuelConsumed = previousTelemetry.fuelConsumed + fuelConsumptionRate;

    let workDone = previousTelemetry.workDone;
    if (previousTelemetry.activity === 'Ploughing' || previousTelemetry.activity === 'Harrowing') {
      workDone += 0.01;
    }

    // GPS: Random walk (simulate driving)
    const speedFactor = 0.0005;
    let lat = previousTelemetry.gpsCoordinates.lat + (Math.random() * speedFactor * 2 - speedFactor);
    let lng = previousTelemetry.gpsCoordinates.lng + (Math.random() * speedFactor * 2 - speedFactor);

    lat = Math.max(FARM_BOUNDS.lat.min, Math.min(FARM_BOUNDS.lat.max, lat));
    lng = Math.max(FARM_BOUNDS.lng.min, Math.min(FARM_BOUNDS.lng.max, lng));

    let activity = previousTelemetry.activity;
    if (Math.random() < 0.05) {
      const activities: TractorTelemetry['activity'][] = ['Ploughing', 'Harrowing', 'Transport', 'Idle'];
      activity = activities[Math.floor(Math.random() * activities.length)];
    }
    if (engineTemp > 110) activity = 'Maintenance';

    const efficiency = fuelConsumed > 0 ? workDone / fuelConsumed : 0;

    return {
      tractorId,
      engineTemp,
      oilPressure,
      hydraulicLoad,
      fuelLevel,
      gpsCoordinates: { lat, lng },
      timestamp: new Date(),
      activity,
      workDone,
      farmSize,
      fuelConsumed,
      enginePower,
      efficiency
    };
  }

  // Initial random state
  const engineTemp = 85 + Math.random() * 25;
  const oilPressure = 30 + Math.random() * 30;
  const hydraulicLoad = Math.random() * 100;
  const fuelLevel = 20 + Math.random() * 80;

  const gpsCoordinates = {
    lat: FARM_BOUNDS.lat.min + Math.random() * (FARM_BOUNDS.lat.max - FARM_BOUNDS.lat.min),
    lng: FARM_BOUNDS.lng.min + Math.random() * (FARM_BOUNDS.lng.max - FARM_BOUNDS.lng.min),
  };

  const activities: TractorTelemetry['activity'][] = ['Ploughing', 'Harrowing', 'Transport', 'Idle'];
  const activity = activities[Math.floor(Math.random() * activities.length)];

  return {
    tractorId,
    engineTemp,
    oilPressure,
    hydraulicLoad,
    fuelLevel,
    gpsCoordinates,
    timestamp: new Date(),
    activity,
    workDone: Math.random() * 100,
    farmSize,
    fuelConsumed: Math.random() * 500,
    enginePower,
    efficiency: 0.5 + Math.random() * 0.5
  };
}

export function updateTelemetry(current: TractorTelemetry): TractorTelemetry {
  return generateTractorTelemetry(current.tractorId, current);
}

/**
 * Predictive maintenance engine using physics-based diagnostics
 */
export function predictMaintenance(
  telemetry: TractorTelemetry,
  historicalLoad?: number[]
): MaintenanceAlert {
  const { engineTemp, oilPressure, hydraulicLoad } = telemetry;

  if (engineTemp > 105 && oilPressure < 35) {
    return {
      severity: 'critical',
      message: 'Critical Alert: Thermal Viscosity Breakdown',
      technicalReason: 'Oil viscosity degraded due to heat. Risk of bearing seizure.',
    };
  }

  const loadHistory = historicalLoad || [hydraulicLoad];
  const recentHighLoad = loadHistory.slice(-3).filter((load) => load > 90).length;

  if (recentHighLoad >= 3) {
    return {
      severity: 'warning',
      message: 'Warning: Pump Cavitation Risk Detected',
      technicalReason: 'Sustained high hydraulic load causing suction pressure drop.',
    };
  }

  if (engineTemp > 100) {
    return {
      severity: 'warning',
      message: 'Elevated Operating Temperature',
      technicalReason: 'Engine temp approaching thermal stress threshold.',
    };
  }

  return {
    severity: 'normal',
    message: 'Systems Nominal',
    technicalReason: 'All parameters within optimal operating ranges.',
  };
}

/**
 * Route optimization using Nearest Neighbor TSP approximation
 */
export function optimizeRoute(
  start: { lat: number; lng: number },
  destinations: { lat: number; lng: number }[]
): RouteOptimization {
  const calculateDistance = (p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) => {
    const dx = p2.lng - p1.lng;
    const dy = p2.lat - p1.lat;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const totalRouteDistance = (points: { lat: number; lng: number }[]) => {
    let distance = 0;
    for (let i = 0; i < points.length - 1; i++) {
      distance += calculateDistance(points[i], points[i + 1]);
    }
    return distance;
  };

  const linearPath = [start, ...destinations];
  const linearDistance = totalRouteDistance(linearPath);

  const optimizedOrder: { lat: number; lng: number }[] = [];
  const unvisited = [...destinations];
  let current = start;

  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = calculateDistance(current, unvisited[0]);

    for (let i = 1; i < unvisited.length; i++) {
      const dist = calculateDistance(current, unvisited[i]);
      if (dist < nearestDistance) {
        nearestDistance = dist;
        nearestIndex = i;
      }
    }

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
