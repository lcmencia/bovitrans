import L from "leaflet";

/**
 * Con bundlers, los iconos por defecto de Leaflet rompen sus rutas de imagen.
 * Definimos iconos explícitos servidos desde la CDN de unpkg.
 */
const BASE = "https://unpkg.com/leaflet@1.9.4/dist/images";

export const defaultIcon = L.icon({
  iconUrl: `${BASE}/marker-icon.png`,
  iconRetinaUrl: `${BASE}/marker-icon-2x.png`,
  shadowUrl: `${BASE}/marker-shadow.png`,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export const origenIcon = L.divIcon({
  className: "",
  html: `<div style="background:#256238;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export const destinoIcon = L.divIcon({
  className: "",
  html: `<div style="background:#b45309;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});
