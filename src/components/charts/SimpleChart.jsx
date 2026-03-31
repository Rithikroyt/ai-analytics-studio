import { useMemo } from 'react';

export default function SimpleChart({ data = [], height = 200 }) {
  const { actual, forecast, xLabels, allValues } = useMemo(() => {
    const actual = data.filter(d => !d.isForecast);
    const forecast = data.filter(d => d.isForecast);
    const xLabels = data.map(d => d.date || d.label || '');
    const allValues = data.map(d => d.value || 0);
    return { actual, forecast, xLabels, allValues };
  }, [data]);

  if (!data.length) return <div className="flex items-center justify-center h-full text-muted-foreground text-xs">No data</div>;

  const maxVal = Math.max(...allValues, 1);
  const minVal = Math.min(...allValues, 0);
  const range = maxVal - minVal || 1;
  const pad = 8;
  const width = 100;
  const h = height;

  const toX = (i) => pad + (i / (data.length - 1 || 1)) * (width - pad * 2);
  const toY = (v) => pad + ((maxVal - v) / range) * (h - pad * 2 - 20);

  const actPoints = actual.map((d, i) => ({ x: toX(i), y: toY(d.value) }));
  const fcPoints = forecast.map((d, i) => ({ x: toX(actual.length + i), y: toY(d.value) }));
  const allPoints = data.map((d, i) => ({ x: toX(i), y: toY(d.value) }));

  const toPath = (pts) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const toArea = (pts, baseY) => {
    if (!pts.length) return '';
    return `${toPath(pts)} L ${pts[pts.length-1].x} ${baseY} L ${pts[0].x} ${baseY} Z`;
  };

  const baseY = toY(minVal < 0 ? 0 : minVal) + 20;

  // Show evenly-spaced tick labels
  const tickIdxs = data.length <= 8 ? data.map((_,i) => i) : [0, Math.floor(data.length/4), Math.floor(data.length/2), Math.floor(data.length*3/4), data.length-1];

  return (
    <div style={{ width: '100%', height }}>
      <svg viewBox={`0 0 ${width} ${h}`} preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00f5ff" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#00f5ff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="fcGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0.25,0.5,0.75].map(f => (
          <line key={f} x1={pad} x2={width - pad} y1={pad + f * (h - pad*2 - 20)} y2={pad + f * (h - pad*2 - 20)}
            stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        ))}

        {/* Area fills */}
        {actPoints.length > 1 && <path d={toArea(actPoints, baseY)} fill="url(#areaGrad)" />}
        {fcPoints.length > 1 && <path d={toArea(fcPoints, baseY)} fill="url(#fcGrad)" />}

        {/* Lines */}
        {actPoints.length > 1 && (
          <path d={toPath(actPoints)} fill="none" stroke="#00f5ff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {fcPoints.length > 1 && (
          <path d={toPath(fcPoints)} fill="none" stroke="#a855f7" strokeWidth="1" strokeDasharray="2 2" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* Connector between actual and forecast */}
        {actPoints.length > 0 && fcPoints.length > 0 && (
          <line x1={actPoints[actPoints.length-1].x} y1={actPoints[actPoints.length-1].y}
                x2={fcPoints[0].x} y2={fcPoints[0].y}
                stroke="#a855f7" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
        )}

        {/* X-axis labels */}
        {tickIdxs.map(i => (
          <text key={i} x={toX(i)} y={h - 2} textAnchor="middle" fontSize="4" fill="rgba(255,255,255,0.3)">
            {(xLabels[i] || '').slice(0, 7)}
          </text>
        ))}

        {/* Forecast label */}
        {fcPoints.length > 0 && (
          <text x={fcPoints[0].x + 1} y={fcPoints[0].y - 2} fontSize="3" fill="#a855f7" opacity="0.8">Forecast</text>
        )}
      </svg>
    </div>
  );
}