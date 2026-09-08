import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from 'next-themes';
import { useFleet } from '@/context/FleetContext';
import { TILE_ATTRIBUTION, tileUrlFor } from '@/lib/basemap';
import { type TractorTelemetry } from '@/lib/telemetry';
import { renderToStaticMarkup } from 'react-dom/server';
import { StatusDot } from '@/components/StatusBadge';
import { Tractor } from 'lucide-react';

// Fix for default marker icons in Leaflet with Vite/Webpack
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Status token -> literal colour. Leaflet builds this marker as an HTML
// string outside React, so the badge colour cannot come from a Tailwind class.
const statusColor = (activity: string) => {
  const token =
    activity === 'Maintenance' ? '--status-maintenance'
      : activity === 'Idle' ? '--status-warning'
        : '--status-operational';
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return value ? `hsl(${value})` : '#22c55e';
};

const createTractorIcon = (tractor: TractorTelemetry, isActive: boolean) => {
  const colorClass =
    tractor.activity === 'Maintenance' ? 'text-status-maintenance'
      : tractor.activity === 'Idle' ? 'text-status-warning'
        : 'text-status-operational';
  const bgColor = statusColor(tractor.activity);

  const activeClass = isActive ? 'scale-125' : '';

  // Render Lucide Tractor Icon to SVG string
  const iconMarkup = renderToStaticMarkup(
    <div className={`relative w-full h-full flex items-center justify-center ${colorClass}`}>
      <Tractor size={32} strokeWidth={2} />
    </div>
  );

  return L.divIcon({
    className: 'bg-transparent',
    html: `
      <div class="relative transition-transform duration-300 ${activeClass} w-10 h-10 flex items-center justify-center filter drop-shadow-md">
        ${iconMarkup}
        <div class="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white" style="background-color: ${bgColor}"></div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

interface MapAreaProps {
  onTractorSelect?: (tractor: TractorTelemetry) => void;
  selectedTractorId?: string | null;
}

export default function MapArea({ onTractorSelect, selectedTractorId }: MapAreaProps) {
  const { tractors } = useFleet();
  const { resolvedTheme } = useTheme();
  const tileUrl = tileUrlFor(resolvedTheme);

  // Ogun State Center (Abeokuta area)
  const mapCenter: [number, number] = [7.15, 3.35];

  return (
    <div className="surface relative z-0 h-full flex-1 overflow-hidden">
      <MapContainer
        center={mapCenter}
        zoom={10}
        style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
        className="z-0"
        zoomControl={false}
      >
        <TileLayer key={tileUrl} url={tileUrl} attribution={TILE_ATTRIBUTION} />

        {tractors.map((tractor) => (
          <Marker
            key={tractor.tractorId}
            position={[tractor.gpsCoordinates.lat, tractor.gpsCoordinates.lng]}
            icon={createTractorIcon(tractor, tractor.tractorId === selectedTractorId)}
            eventHandlers={{
              click: () => onTractorSelect && onTractorSelect(tractor),
            }}
          >
            <Popup className="glass-popup">
              <div className="p-2 min-w-[150px]">
                <h3 className="font-bold text-sm mb-1">{tractor.tractorId}</h3>
                <div className="text-xs text-muted-foreground mb-2">
                  Status: <span className="font-semibold text-foreground">{tractor.activity}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Temp</span>
                    <span className="font-mono">{tractor.engineTemp.toFixed(1)}°C</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Fuel</span>
                    <span className="font-mono">{tractor.fuelLevel.toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Overlay Info */}
      <div className="surface-raised pointer-events-none absolute right-3 top-3 z-[400] px-3 py-2 text-right">
        <p className="eyebrow">Live Map View</p>
        <p className="mt-0.5 text-xs font-medium text-foreground">Ogun State Agricultural Zone</p>
        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
          {mapCenter[0]}°N, {mapCenter[1]}°E
        </p>
      </div>

      {/* Map Controls / Legend */}
      <div className="surface-raised absolute bottom-3 left-3 z-[400] space-y-1.5 px-3 py-2">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <StatusDot tone="operational" /> Operational
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <StatusDot tone="warning" /> Idle
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <StatusDot tone="critical" /> Maintenance
        </div>
      </div>
    </div>
  );
}
