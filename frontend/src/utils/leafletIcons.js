/**
 * Inline SVG marker icons for Leaflet.
 * Uses divIcon + SVG so no external CDN assets are needed,
 * which prevents Edge/Firefox "Tracking Prevention" storage blocks.
 */
import L from 'leaflet';

// ── Suppress the default PNG icon so Leaflet doesn't fetch external CDN assets ──
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: '', shadowUrl: '', iconRetinaUrl: '' });

// ── SVG pin factory ────────────────────────────────────────────────────────────
/**
 * Returns a Leaflet divIcon with an SVG pin shape.
 * @param {string} color    - fill color (hex or CSS color)
 * @param {string} emoji    - optional emoji rendered inside the pin
 * @param {number} size     - pin width/height in px (default 34)
 */
export const makePin = (color = '#6366f1', emoji = '', size = 34) => {
  const half = size / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 8}" viewBox="0 0 ${size} ${size + 8}">
    <circle cx="${half}" cy="${half}" r="${half - 2}" fill="${color}" stroke="white" stroke-width="2"/>
    <polygon points="${half - 5},${size - 2} ${half + 5},${size - 2} ${half},${size + 7}" fill="${color}"/>
    <text x="${half}" y="${half + 5}" font-size="${size * 0.42}" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [size, size + 8],
    iconAnchor: [half, size + 8],
    popupAnchor: [0, -(size + 8)],
  });
};

// ── Preset icons ───────────────────────────────────────────────────────────────
export const ICONS = {
  blue:    (emoji = '📍') => makePin('#3b82f6', emoji),
  green:   (emoji = '🟢') => makePin('#10b981', emoji),
  red:     (emoji = '🔴') => makePin('#ef4444', emoji),
  orange:  (emoji = '🟠') => makePin('#f59e0b', emoji),
  purple:  (emoji = '💜') => makePin('#8b5cf6', emoji),
  teal:    (emoji = '🔵') => makePin('#06b6d4', emoji),
  default: ()              => makePin('#6366f1', '📍'),
};

// Convenience named exports matching old usage patterns
export const pinBlue   = (emoji = '🏪') => makePin('#3b82f6', emoji);
export const pinGreen  = (emoji = '✅') => makePin('#10b981', emoji);
export const pinRed    = (emoji = '⚠️') => makePin('#ef4444', emoji);
export const pinOrange = (emoji = '🚚') => makePin('#f59e0b', emoji);
export const pinPurple = (emoji = '💜') => makePin('#8b5cf6', emoji);
export const pinTeal   = (emoji = '🔵') => makePin('#06b6d4', emoji);
