/**
 * Geospatial Analytics Pack
 * Detects lat/lon, city, state, zip — renders map, density, region KPIs
 */
import { useState, useMemo } from 'react';
import { useWorkspaceStore } from '@/lib/store';
import { Map, AlertTriangle, TrendingUp, Layers } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip as MapTooltip } from 'react-leaflet';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function detectGeoColumns(columns = []) {
  return {
    lat: columns.find(c => /^lat$|latitude|lat_/.test(c.name?.toLowerCase()))?.name,
    lon: columns.find(c => /^lon$|^lng$|longitude|long_/.test(c.name?.toLowerCase()))?.name,
    city: columns.find(c => /^city$|city_/.test(c.name?.toLowerCase()))?.name,
    state: columns.find(c => /^state$|state_/.test(c.name?.toLowerCase()))?.name,
    zip: columns.find(c => /zip|postal/.test(c.name?.toLowerCase()))?.name,
    region: columns.find(c => /region|territory|area|zone/.test(c.name?.toLowerCase()))?.name,
    value: columns.find(c => /revenue|amount|value|count|volume|sales/.test(c.name?.toLowerCase()))?.name,
    label: columns.find(c => /name|label|title|location/.test(c.name?.toLowerCase()))?.name,
  };
}

const COLORS = ['#00e5ff', '#2dd4bf', '#a855f7', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#ec4899'];

export default function GeoAnalyticsSection() {
  const { getActiveTable } = useWorkspaceStore();
  const table = getActiveTable();
  const [activeView, setActiveView] = useState('map');

  const geoCols = useMemo(() => detectGeoColumns(table?.columns || []), [table]);

  const hasMap = geoCols.lat && geoCols.lon;
  const hasRegion = geoCols.city || geoCols.state || geoCols.region || geoCols.zip;

  const mapPoints = useMemo(() => {
    if (!hasMap || !table?.rows) return [];
    return table.rows
      .map(r => ({
        lat: parseFloat(r[geoCols.lat]),
        lon: parseFloat(r[geoCols.lon]),
        label: r[geoCols.label] || r[geoCols.city] || 'Point',
        value: geoCols.value ? parseFloat(r[geoCols.value]) || 1 : 1,
      }))
      .filter(p => !isNaN(p.lat) && !isNaN(p.lon) && p.lat >= -90 && p.lat <= 90)
      .slice(0, 500);
  }, [table, geoCols, hasMap]);

  const regionData = useMemo(() => {
    if (!hasRegion || !table?.rows) return [];
    const col = geoCols.state || geoCols.city || geoCols.region || geoCols.zip;
    const map = {};
    table.rows.forEach(r => {
      const k = r[col] || 'Unknown';
      map[k] = (map[k] || 0) + (geoCols.value ? parseFloat(r[geoCols.value]) || 1 : 1);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
  }, [table, geoCols, hasRegion]);

  const center = useMemo(() => {
    if (!mapPoints.length) return [37.5, -95];
    const avgLat = mapPoints.reduce((s, p) => s + p.lat, 0) / mapPoints.length;
    const avgLon = mapPoints.reduce((s, p) => s + p.lon, 0) / mapPoints.length;
    return [avgLat, avgLon];
  }, [mapPoints]);

  const maxValue = mapPoints.length ? Math.max(...mapPoints.map(p => p.value)) : 1;

  if (!table) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-center">
        <Map className="w-12 h-12 text-white/15 mb-4" />
        <h3 className="font-bold text-lg mb-1">No Dataset Loaded</h3>
        <p className="text-sm text-muted-foreground">Load a dataset with latitude/longitude, city, state, or region columns.</p>
      </div>
    );
  }

  if (!hasMap && !hasRegion) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-center space-y-4">
        <Map className="w-12 h-12 text-white/15" />
        <div>
          <h3 className="font-bold text-lg mb-1">No Geographic Columns Detected</h3>
          <p className="text-sm text-muted-foreground max-w-sm">Add columns named: <code className="text-cyan-400 text-xs">latitude, longitude, city, state, region, zip</code> to enable geo analytics.</p>
        </div>
        <div className="p-4 rounded-xl bg-white/3 border border-white/8 text-xs text-white/40 text-left max-w-sm">
          <div className="font-semibold text-white/60 mb-2">Supported column names:</div>
          <div className="grid grid-cols-2 gap-1 font-mono">
            {['latitude', 'longitude', 'lat', 'lon', 'lng', 'city', 'state', 'region', 'zip', 'postal', 'territory', 'zone'].map(c => (
              <span key={c} className="bg-white/5 px-2 py-0.5 rounded">{c}</span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const TABS = [
    ...(hasMap ? [{ id: 'map', label: 'Location Map' }] : []),
    ...(hasRegion ? [{ id: 'region', label: 'Region Analysis' }] : []),
    { id: 'clusters', label: 'Clusters' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-400/10 border border-green-400/20 flex items-center justify-center">
          <Map className="w-5 h-5 text-green-400" />
        </div>
        <div>
          <h2 className="text-xl font-black">Geo & Operations Analytics</h2>
          <p className="text-xs text-muted-foreground">Location mapping · Region KPIs · Density · Clustering</p>
        </div>
      </div>

      {/* Detected columns */}
      <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-white/2 border border-white/8">
        {Object.entries(geoCols).map(([k, v]) => v && (
          <span key={k} className="text-xs px-2 py-1 rounded-full border bg-green-400/10 border-green-400/20 text-green-400 font-mono">
            {k}: {v}
          </span>
        ))}
        {mapPoints.length > 0 && (
          <span className="text-xs px-2 py-1 rounded-full border bg-cyan-400/10 border-cyan-400/20 text-cyan-400">
            {mapPoints.length} valid coordinates
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/3 border border-white/8 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveView(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeView === t.id ? 'bg-green-400/15 text-green-400' : 'text-white/35 hover:text-white/65'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Map view */}
      {activeView === 'map' && hasMap && (
        <div className="rounded-2xl border border-white/8 overflow-hidden" style={{ height: 420 }}>
          <MapContainer center={center} zoom={4} style={{ height: '100%', width: '100%', background: '#0d1117' }}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            />
            {mapPoints.map((pt, i) => (
              <CircleMarker key={i} center={[pt.lat, pt.lon]}
                radius={Math.max(4, (pt.value / maxValue) * 14)}
                pathOptions={{ color: '#00e5ff', fillColor: '#00e5ff', fillOpacity: 0.6, weight: 1 }}>
                <Popup><div className="text-xs text-black"><strong>{pt.label}</strong><br />Value: {pt.value.toLocaleString()}</div></Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      )}

      {/* Region breakdown */}
      {activeView === 'region' && regionData.length > 0 && (
        <div className="p-5 rounded-2xl border border-white/8 bg-white/2">
          <div className="text-xs text-white/35 uppercase tracking-widest mb-4">
            Top Regions by {geoCols.value ? geoCols.value : 'Count'} ({geoCols.state || geoCols.city || geoCols.region})
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={regionData} layout="vertical">
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} width={90} />
              <Tooltip contentStyle={{ background: 'hsl(222,44%,9%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }} />
              <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Clusters view */}
      {activeView === 'clusters' && (
        <div className="p-5 rounded-2xl border border-white/8 bg-white/2 space-y-4">
          <div className="text-xs text-white/35 uppercase tracking-widest">Geo Clustering Summary</div>
          {mapPoints.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              {[
                { label: 'Total Points', value: mapPoints.length.toLocaleString(), color: 'text-cyan-400' },
                { label: 'Avg Value/Point', value: (mapPoints.reduce((s, p) => s + p.value, 0) / mapPoints.length).toFixed(2), color: 'text-green-400' },
                { label: 'Max Value', value: maxValue.toLocaleString(), color: 'text-amber-400' },
                { label: 'Lat Range', value: `${Math.min(...mapPoints.map(p=>p.lat)).toFixed(1)}° – ${Math.max(...mapPoints.map(p=>p.lat)).toFixed(1)}°`, color: 'text-purple-400' },
                { label: 'Lon Range', value: `${Math.min(...mapPoints.map(p=>p.lon)).toFixed(1)}° – ${Math.max(...mapPoints.map(p=>p.lon)).toFixed(1)}°`, color: 'text-teal-400' },
                { label: 'Region Count', value: regionData.length, color: 'text-pink-400' },
              ].map(s => (
                <div key={s.label} className="p-3 rounded-xl bg-white/3 border border-white/8">
                  <div className="text-xs text-white/30 mb-1">{s.label}</div>
                  <div className={`font-bold ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-white/30 text-center py-8">No coordinate data available for clustering.</div>
          )}
          <div className="p-3 rounded-xl bg-white/3 border border-white/8 text-xs text-white/30">
            <strong className="text-white/50">Advanced clustering</strong> (DBSCAN, K-Means spatial) requires Python backend. Route optimization and concave hull analysis are available via the Pipeline Studio.
          </div>
        </div>
      )}
    </div>
  );
}