/**
 * VBShowMeGallery — Tableau-style chart catalog with all chart types including maps
 */
import { BarChart2, TrendingUp, PieChart, Activity, Layers, Target, Grid, Map, GitBranch, Circle, BarChart, Zap, Globe, Hexagon, AlignLeft, Columns } from 'lucide-react';

export const CHART_CATALOG = [
  {
    label: 'Bar & Comparison',
    color: '#00e5ff',
    charts: [
      { id: 'bar', label: 'Bar', icon: BarChart2, desc: 'Compare categories' },
      { id: 'bar_horizontal', label: 'Horiz. Bar', icon: BarChart, desc: 'Rank long labels' },
      { id: 'bar_stacked', label: 'Stacked Bar', icon: BarChart2, desc: 'Part-to-whole' },
      { id: 'bar_grouped', label: 'Grouped Bar', icon: Columns, desc: 'Side-by-side groups' },
      { id: 'waterfall', label: 'Waterfall', icon: BarChart2, desc: 'Variance contribution' },
      { id: 'bullet', label: 'Bullet / KPI', icon: Target, desc: 'Actual vs target' },
    ],
  },
  {
    label: 'Line & Trend',
    color: '#a855f7',
    charts: [
      { id: 'line', label: 'Line', icon: TrendingUp, desc: 'Trend over time' },
      { id: 'area', label: 'Area', icon: TrendingUp, desc: 'Trend + magnitude' },
      { id: 'area_stacked', label: 'Stacked Area', icon: Layers, desc: 'Contribution trend' },
      { id: 'dual_axis', label: 'Dual Axis', icon: TrendingUp, desc: 'Two measures, two scales' },
      { id: 'step_line', label: 'Step Line', icon: AlignLeft, desc: 'Discrete steps' },
    ],
  },
  {
    label: 'Distribution',
    color: '#ff6b35',
    charts: [
      { id: 'scatter', label: 'Scatter', icon: Activity, desc: 'Correlation / outliers' },
      { id: 'bubble', label: 'Bubble', icon: Circle, desc: 'Scatter + size measure' },
      { id: 'histogram', label: 'Histogram', icon: BarChart2, desc: 'Frequency distribution' },
      { id: 'box_plot', label: 'Box Plot', icon: Layers, desc: 'Quartile spread' },
      { id: 'violin', label: 'Density Strip', icon: Activity, desc: 'Distribution shape' },
    ],
  },
  {
    label: 'Part-to-Whole',
    color: '#4caf50',
    charts: [
      { id: 'donut', label: 'Donut', icon: PieChart, desc: 'Cleaner pie' },
      { id: 'pie', label: 'Pie', icon: PieChart, desc: 'Proportions' },
      { id: 'treemap', label: 'Treemap', icon: Layers, desc: 'Hierarchical share' },
      { id: 'packed_bubble', label: 'Bubbles', icon: Circle, desc: 'Category magnitude' },
      { id: 'sunburst', label: 'Sunburst', icon: Hexagon, desc: 'Hierarchical rings' },
    ],
  },
  {
    label: 'Map & Geo',
    color: '#ffcc02',
    charts: [
      { id: 'choropleth_map', label: 'Filled Map', icon: Globe, desc: 'Color by region value' },
      { id: 'symbol_map', label: 'Symbol Map', icon: Map, desc: 'Bubbles on map' },
      { id: 'heat_map_geo', label: 'Density Map', icon: Map, desc: 'Concentration heatmap' },
    ],
  },
  {
    label: 'Table & Matrix',
    color: '#00bfa5',
    charts: [
      { id: 'text_table', label: 'Text Table', icon: Grid, desc: 'Exact values' },
      { id: 'highlight_table', label: 'Highlight', icon: Grid, desc: 'Color-coded values' },
      { id: 'heatmap', label: 'Heatmap', icon: Grid, desc: '2D intensity grid' },
      { id: 'pivot', label: 'Pivot', icon: Grid, desc: 'Grouped cross-tab' },
    ],
  },
  {
    label: 'Advanced / ML',
    color: '#e91e63',
    charts: [
      { id: 'funnel', label: 'Funnel', icon: GitBranch, desc: 'Stage drop-off' },
      { id: 'sankey', label: 'Sankey', icon: GitBranch, desc: 'Flow allocation' },
      { id: 'radar', label: 'Radar', icon: Activity, desc: 'Multi-metric profile' },
      { id: 'gauge', label: 'Gauge', icon: Target, desc: 'KPI vs target arc' },
      { id: 'candlestick', label: 'Candlestick', icon: BarChart2, desc: 'OHLC financial' },
      { id: 'gantt', label: 'Gantt', icon: BarChart2, desc: 'Timeline / duration' },
      { id: 'metric_card', label: 'KPI Card', icon: Zap, desc: 'Single big number' },
      { id: 'forecast_line', label: 'Forecast', icon: TrendingUp, desc: 'AI trend + CI band' },
    ],
  },
];

export function recommendChartType(columns) {
  const hasDate = columns.some(c => c.type === 'date' || c.isDateCandidate);
  const numeric = columns.filter(c => c.type === 'numeric' || c.isKpiCandidate);
  const categorical = columns.filter(c => c.type === 'category' || c.isSegmentCandidate);
  const geo = columns.filter(c => ['country', 'state', 'region', 'city', 'lat', 'lon', 'latitude', 'longitude', 'zip', 'continent'].includes(c.name?.toLowerCase()));
  if (geo.length > 0) return 'choropleth_map';
  if (hasDate && numeric.length >= 2) return 'dual_axis';
  if (hasDate && numeric.length >= 1) return 'line';
  if (categorical.length >= 1 && numeric.length >= 1) return 'bar';
  if (numeric.length >= 3) return 'bubble';
  if (numeric.length >= 2) return 'scatter';
  if (categorical.length >= 2 && numeric.length >= 1) return 'highlight_table';
  if (numeric.length === 1) return 'histogram';
  return 'text_table';
}

export default function VBShowMeGallery({ selected, onChange }) {
  return (
    <div className="space-y-3 p-3">
      <div className="text-xs font-black uppercase tracking-widest text-white/40 pb-1 border-b border-white/5">Show Me</div>
      {CHART_CATALOG.map(cat => (
        <div key={cat.label}>
          <div className="text-xs font-semibold mb-1.5 px-0.5" style={{ color: cat.color + 'aa' }}>{cat.label}</div>
          <div className="grid grid-cols-2 gap-1">
            {cat.charts.map(chart => {
              const Icon = chart.icon;
              const isSelected = selected === chart.id;
              return (
                <button key={chart.id} onClick={() => onChange(chart.id)} title={chart.desc}
                  className={`flex flex-col items-center gap-0.5 p-2 rounded-xl border text-center transition-all ${isSelected ? 'border-opacity-40 shadow-sm' : 'border-white/5 text-white/30 hover:text-white/70 hover:border-white/12 hover:bg-white/3'}`}
                  style={isSelected ? { borderColor: cat.color + '50', background: cat.color + '12', color: cat.color } : {}}>
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium leading-tight">{chart.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}