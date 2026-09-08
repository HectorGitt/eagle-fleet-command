/**
 * Basemap tile sources.
 *
 * CARTO's basemaps.cartocdn.com endpoints now stamp "API KEY REQUIRED" across
 * every tile they serve, so the dark_all/light_all sources this app used render
 * watermarked. Esri's canvas basemaps are keyless, come as a matching
 * light/dark pair, and stay legible under coloured route lines.
 *
 * Both are subject to their provider's terms; point VITE_TILE_URL_DARK /
 * VITE_TILE_URL_LIGHT at your own tile server for production traffic.
 */
const ESRI_DARK =
    'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
const ESRI_LIGHT =
    'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';

export const TILE_DARK: string = import.meta.env.VITE_TILE_URL_DARK || ESRI_DARK;
export const TILE_LIGHT: string = import.meta.env.VITE_TILE_URL_LIGHT || ESRI_LIGHT;

export const TILE_ATTRIBUTION =
    'Tiles &copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, &copy; OpenStreetMap contributors';

/** Pick the basemap matching the active theme. Anything not light gets dark. */
export const tileUrlFor = (theme: string | undefined) =>
    theme === 'light' ? TILE_LIGHT : TILE_DARK;
