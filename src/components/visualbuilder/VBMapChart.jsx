/**
 * VBMapChart — Real interactive Leaflet map for geo chart types
 * Supports: symbol map (circle markers), choropleth (color intensity), heat density
 */
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Comprehensive geo lookup: state codes, country names, country codes
const GEO_COORDS = {
  // US States
  'AL': [32.806671, -86.791130], 'AK': [61.370716, -152.404419], 'AZ': [33.729759, -111.431221],
  'AR': [34.969704, -92.373123], 'CA': [36.116203, -119.681564], 'CO': [39.059811, -105.311104],
  'CT': [41.597782, -72.755371], 'DE': [39.318523, -75.507141], 'FL': [27.766279, -81.686783],
  'GA': [33.040619, -83.643074], 'HI': [21.094318, -157.498337], 'ID': [44.240459, -114.478828],
  'IL': [40.349457, -88.986137], 'IN': [39.849426, -86.258278], 'IA': [42.011539, -93.210526],
  'KS': [38.526600, -96.726486], 'KY': [37.668140, -84.670067], 'LA': [31.169960, -91.867805],
  'ME': [44.693947, -69.381927], 'MD': [39.063946, -76.802101], 'MA': [42.230171, -71.530106],
  'MI': [43.326618, -84.536095], 'MN': [45.694454, -93.900192], 'MS': [32.741646, -89.678696],
  'MO': [38.456085, -92.288368], 'MT': [46.921925, -110.454353], 'NE': [41.125370, -98.268082],
  'NV': [38.313515, -117.055374], 'NH': [43.452492, -71.563896], 'NJ': [40.298904, -74.521011],
  'NM': [34.840515, -106.248482], 'NY': [42.165726, -74.948051], 'NC': [35.630066, -79.806419],
  'ND': [47.528912, -99.784012], 'OH': [40.388783, -82.764915], 'OK': [35.565342, -96.928917],
  'OR': [44.572021, -122.070938], 'PA': [40.590752, -77.209755], 'RI': [41.680893, -71.511780],
  'SC': [33.856892, -80.945007], 'SD': [44.299782, -99.438828], 'TN': [35.747845, -86.692345],
  'TX': [31.054487, -97.563461], 'UT': [40.150032, -111.862434], 'VT': [44.045876, -72.710686],
  'VA': [37.769337, -78.169968], 'WA': [47.400902, -121.490494], 'WV': [38.491226, -80.954453],
  'WI': [44.268543, -89.616508], 'WY': [42.755966, -107.302490], 'DC': [38.897438, -77.026817],
  'VI': [18.335765, -64.896335], 'PR': [18.220833, -66.590149], 'GU': [13.444304, 144.793731],
  // Full US State Names
  'Alabama': [32.806671, -86.791130], 'Alaska': [61.370716, -152.404419], 'Arizona': [33.729759, -111.431221],
  'Arkansas': [34.969704, -92.373123], 'California': [36.116203, -119.681564], 'Colorado': [39.059811, -105.311104],
  'Connecticut': [41.597782, -72.755371], 'Delaware': [39.318523, -75.507141], 'Florida': [27.766279, -81.686783],
  'Georgia': [33.040619, -83.643074], 'Hawaii': [21.094318, -157.498337], 'Idaho': [44.240459, -114.478828],
  'Illinois': [40.349457, -88.986137], 'Indiana': [39.849426, -86.258278], 'Iowa': [42.011539, -93.210526],
  'Kansas': [38.526600, -96.726486], 'Kentucky': [37.668140, -84.670067], 'Louisiana': [31.169960, -91.867805],
  'Maine': [44.693947, -69.381927], 'Maryland': [39.063946, -76.802101], 'Massachusetts': [42.230171, -71.530106],
  'Michigan': [43.326618, -84.536095], 'Minnesota': [45.694454, -93.900192], 'Mississippi': [32.741646, -89.678696],
  'Missouri': [38.456085, -92.288368], 'Montana': [46.921925, -110.454353], 'Nebraska': [41.125370, -98.268082],
  'Nevada': [38.313515, -117.055374], 'New Hampshire': [43.452492, -71.563896], 'New Jersey': [40.298904, -74.521011],
  'New Mexico': [34.840515, -106.248482], 'New York': [42.165726, -74.948051], 'North Carolina': [35.630066, -79.806419],
  'North Dakota': [47.528912, -99.784012], 'Ohio': [40.388783, -82.764915], 'Oklahoma': [35.565342, -96.928917],
  'Oregon': [44.572021, -122.070938], 'Pennsylvania': [40.590752, -77.209755], 'Rhode Island': [41.680893, -71.511780],
  'South Carolina': [33.856892, -80.945007], 'South Dakota': [44.299782, -99.438828], 'Tennessee': [35.747845, -86.692345],
  'Texas': [31.054487, -97.563461], 'Utah': [40.150032, -111.862434], 'Vermont': [44.045876, -72.710686],
  'Virginia': [37.769337, -78.169968], 'Washington': [47.400902, -121.490494], 'West Virginia': [38.491226, -80.954453],
  'Wisconsin': [44.268543, -89.616508], 'Wyoming': [42.755966, -107.302490],
  // Countries
  'United States': [37.09, -95.71], 'USA': [37.09, -95.71], 'US': [37.09, -95.71],
  'Canada': [56.13, -106.34], 'Mexico': [23.63, -102.55], 'Brazil': [-14.23, -51.92],
  'Argentina': [-38.41, -63.61], 'Chile': [-35.67, -71.54], 'Colombia': [4.57, -74.29],
  'Peru': [-9.19, -75.01], 'Venezuela': [6.42, -66.58], 'Ecuador': [-1.83, -78.18],
  'Bolivia': [-16.29, -63.58], 'Paraguay': [-23.44, -58.44], 'Uruguay': [-32.52, -55.76],
  'UK': [55.37, -3.43], 'United Kingdom': [55.37, -3.43], 'Great Britain': [55.37, -3.43],
  'Germany': [51.16, 10.45], 'France': [46.22, 2.21], 'Spain': [40.46, -3.74],
  'Italy': [41.87, 12.56], 'Portugal': [39.39, -8.22], 'Netherlands': [52.13, 5.29],
  'Belgium': [50.50, 4.46], 'Switzerland': [46.81, 8.22], 'Austria': [47.51, 14.55],
  'Sweden': [60.12, 18.64], 'Norway': [60.47, 8.46], 'Denmark': [56.26, 9.50],
  'Finland': [61.92, 25.74], 'Poland': [51.91, 19.14], 'Czech Republic': [49.81, 15.47],
  'Romania': [45.94, 24.96], 'Hungary': [47.16, 19.50], 'Greece': [39.07, 21.82],
  'Turkey': [38.96, 35.24], 'Russia': [61.52, 105.31], 'Ukraine': [48.37, 31.16],
  'China': [35.86, 104.19], 'Japan': [36.20, 138.25], 'South Korea': [35.90, 127.76],
  'India': [20.59, 78.96], 'Pakistan': [30.37, 69.34], 'Bangladesh': [23.68, 90.35],
  'Indonesia': [-0.78, 113.92], 'Philippines': [12.87, 121.77], 'Vietnam': [14.05, 108.27],
  'Thailand': [15.87, 100.99], 'Malaysia': [4.21, 101.97], 'Singapore': [1.35, 103.81],
  'Australia': [-25.27, 133.77], 'New Zealand': [-40.90, 174.88],
  'South Africa': [-30.55, 22.93], 'Nigeria': [9.08, 8.67], 'Kenya': [-0.02, 37.90],
  'Egypt': [26.82, 30.80], 'Ethiopia': [9.14, 40.48], 'Ghana': [7.95, -1.02],
  'Tanzania': [-6.36, 34.88], 'Morocco': [31.79, -7.09], 'Algeria': [28.03, 1.65],
  'Saudi Arabia': [23.88, 45.07], 'UAE': [23.42, 53.84], 'Israel': [31.04, 34.85],
  'Iran': [32.42, 53.68], 'Iraq': [33.22, 43.67],
};

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgb(${r},${g},${b})`;
}

function interpolateColor(color, pct) {
  const r = parseInt(color.slice(1,3),16), g = parseInt(color.slice(3,5),16), b = parseInt(color.slice(5,7),16);
  const alpha = 0.15 + pct * 0.85;
  return `rgba(${r},${g},${b},${alpha})`;
}

function MapBoundsAdjuster({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const lats = points.map(p => p[0]);
      const lngs = points.map(p => p[1]);
      const bounds = [[Math.min(...lats)-2, Math.min(...lngs)-2], [Math.max(...lats)+2, Math.max(...lngs)+2]];
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [points]);
  return null;
}

export default function VBMapChart({ data, color, chartType }) {
  if (!data?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-white/20">
        <div className="text-3xl">🗺️</div>
        <div className="text-sm text-center">Add a location field (country, state, city) to X<br/>and a numeric measure to Y</div>
      </div>
    );
  }

  const max = Math.max(...data.map(d => d.value), 1);

  // Match data to coordinates
  const mapped = data.map(d => {
    const nameKey = Object.keys(GEO_COORDS).find(k =>
      k.toLowerCase() === d.name?.toLowerCase()?.trim() ||
      k.toLowerCase() === d.name?.toLowerCase()?.trim().replace(/\./g, '')
    );
    if (!nameKey) return null;
    return { ...d, coords: GEO_COORDS[nameKey] };
  }).filter(Boolean);

  const unmapped = data.filter(d => !mapped.find(m => m.name === d.name));

  if (mapped.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex flex-col items-center justify-center h-40 gap-2 text-white/25">
          <div className="text-2xl">🌍</div>
          <div className="text-xs text-center">No recognized location names found.<br/>Try country names (e.g. "United States", "Germany") or US state codes (e.g. "CA", "TX")</div>
        </div>
        <div className="text-xs text-white/30 px-1">Your values: {data.slice(0,8).map(d=>d.name).join(', ')}{data.length>8?' …':''}</div>
      </div>
    );
  }

  const validPoints = mapped.map(d => d.coords);

  return (
    <div className="space-y-2">
      {/* Leaflet Map */}
      <div className="rounded-xl overflow-hidden border border-white/8" style={{ height: 320 }}>
        <MapContainer
          center={[20, 10]}
          zoom={2}
          style={{ height: '100%', width: '100%', background: '#0a1628' }}
          zoomControl={true}
          scrollWheelZoom={true}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />
          <MapBoundsAdjuster points={validPoints} />

          {mapped.map((d, i) => {
            const pct = d.value / max;
            const radius = chartType === 'symbol_map'
              ? 5 + pct * 25
              : chartType === 'heat_map_geo'
              ? 8 + pct * 35
              : 6 + pct * 16;
            const fillColor = interpolateColor(color, pct);
            const fillOpacity = chartType === 'choropleth_map' ? 0.6 + pct * 0.35 : 0.5 + pct * 0.45;

            return (
              <CircleMarker
                key={d.name}
                center={d.coords}
                radius={radius}
                pathOptions={{
                  color: color,
                  weight: 1,
                  opacity: 0.7,
                  fillColor: color,
                  fillOpacity,
                }}
              >
                <Tooltip direction="top" offset={[0, -radius]} opacity={0.97}>
                  <div style={{ background: 'rgba(4,9,20,0.97)', border: `1px solid ${color}40`, borderRadius: 8, padding: '6px 10px', fontSize: 11, color: 'rgba(255,255,255,0.85)', minWidth: 100 }}>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>{d.name}</div>
                    <div style={{ color, fontFamily: 'monospace' }}>{d.value?.toLocaleString()}</div>
                    <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>{Math.round(pct * 100)}% of max</div>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* Legend + ranked list */}
      <div className="flex items-center gap-3 px-1">
        <div className="flex items-center gap-2 text-xs text-white/30">
          <div className="flex gap-1 items-center">
            {[0.15, 0.4, 0.7, 1].map(p => (
              <div key={p} className="rounded-full border border-white/10"
                style={{ width: 6 + p * 10, height: 6 + p * 10, background: color, opacity: 0.2 + p * 0.8 }} />
            ))}
          </div>
          <span>Low → High</span>
        </div>
        <div className="text-xs text-white/25 ml-auto">
          {mapped.length}/{data.length} locations mapped
          {unmapped.length > 0 && ` · ${unmapped.length} unknown`}
        </div>
      </div>

      {/* Top ranked */}
      <div className="grid grid-cols-2 gap-1 max-h-28 overflow-y-auto">
        {data.slice(0, 10).map((d, i) => (
          <div key={d.name} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/2 border border-white/5 text-xs">
            <span className="text-white/20 font-mono w-3">{i + 1}</span>
            <span className="flex-1 truncate text-white/60">{d.name}</span>
            <span className="font-mono" style={{ color }}>{d.value?.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}