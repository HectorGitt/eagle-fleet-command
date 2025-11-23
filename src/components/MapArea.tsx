import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useFleet } from '@/context/FleetContext';
import { type TractorTelemetry } from '@/lib/telemetry';
import { renderToStaticMarkup } from 'react-dom/server';
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

// Helper to create a custom icon that matches the previous design
const createTractorIcon = (tractor: TractorTelemetry, isActive: boolean) => {
  let colorClass = "text-status-operational"; // green-500
  let bgColor = "#22c55e";

  if (tractor.activity === "Maintenance") {
    colorClass = "text-status-maintenance"; // red-500
    bgColor = "#ef4444";
  }
  if (tractor.activity === "Idle") {
    colorClass = "text-status-warning"; // yellow-500
    bgColor = "#eab308";
  }

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

  // Ogun State Center (Abeokuta area)
  const mapCenter: [number, number] = [7.15, 3.35];

  return (
    <div className="flex-1 h-full relative overflow-hidden rounded-lg z-0 border border-border/50 shadow-lg">
      <MapContainer
        center={mapCenter}
        zoom={10}
        style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
        className="z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

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
      <div className="absolute top-4 right-4 glass-panel p-4 rounded-lg z-[400] pointer-events-none">
        <div className="text-right">
          <p className="text-lg font-bold text-primary">LIVE MAP VIEW</p>
          <p className="text-xs text-muted-foreground">Ogun State Agricultural Zone</p>
          <p className="text-[10px] text-muted-foreground mt-1 font-mono">
            {mapCenter[0]}°N, {mapCenter[1]}°E
          </p>
        </div>
      </div>

      {/* Map Controls / Legend */}
      <div className="absolute bottom-6 left-6 glass-panel p-3 rounded-lg space-y-2 z-[400]">
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded-full bg-status-operational" />
          <span>Operational</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded-full bg-warning" />
          <span>Warning</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded-full bg-status-maintenance" />
          <span>Maintenance</span>
        </div>
      </div>
    </div>
  );
}
