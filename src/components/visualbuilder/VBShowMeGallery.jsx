/**
 * Show Me Gallery — chart type catalog with Tableau-style categories
 */
import { BarChart2, TrendingUp, PieChart, Activity, Layers, Target, Grid, Map, GitBranch, Circle, BarChart } from 'lucide-react';

const CATEGORIES = [
  {
    label: 'Bar & Comparison',
    charts: [
      { id: 'bar', label: 'Vertical Bar', icon: BarChart2, desc: 'Compare categories' },
      { id: 'bar_horizontal', label: 'Horizontal Bar', icon: BarChart, desc: 'Rank categories' },
      { id: 'bar_stacked', label: 'Stacked Bar', icon: BarChart2, desc: 'Part-to-whole' },
      { id: 'waterfall', label: 'Waterfall', icon: BarChart2, desc: 'Contribution variance' },
      { id: 'bullet', label: 'Bullet / KPI', icon: Target, desc: 'Actual vs target' },
    ],
  },
  {
    label: 'Line & Trend',
    charts: [
      { id: 'line', label: 'Line', icon: TrendingUp, desc: 'Trend over time' },
      { id: 'area', label: 'Area', icon: TrendingUp, desc: 'Trend + magnitude' },
      { id: 'area_stacked', label: 'Stacked Area', icon: Layers, desc: 'Contribution trend' },
      { id: 'dual_line', label: 'Dual Line', icon: TrendingUp, desc: 'Two measures' },
    ],
  },
  {
    label: 'Distribution',
    charts: [
      { id: 'histogram', label: 'Histogram', icon: BarChart2, desc: 'Frequency distribution' },
      { id: 'box_plot', label: 'Box Plot', icon: Layers, desc: 'Quartile spread' },
      { id: 'scatter', label: 'Scatter Plot', icon: Activity, desc: 'Correlation' },
      { id: 'density', label: 'Density / Heatmap', icon: Grid, desc: 'Concentration' },
    ],
  },
  {
    label: 'Part-to-Whole',
    charts: [
      { id: 'donut', label: 'Donut', icon: PieChart, desc: 'Cleaner pie' },
      { id: 'pie', label: 'Pie', icon: PieChart, desc: 'Proportions' },
      { id: 'treemap', label: 'Treemap', icon: Layers, desc: 'Hierarchical share' },
      { id: 'packed_bubble', label: 'Packed Bubbles', icon: Circle, desc: 'Category magnitude' },
    ],
  },
  {
    label: 'Table & Matrix',
    charts: [
      { id: 'text_table', label: 'Text Table', icon: Grid, desc: 'Exact values' },
      { id: 'highlight_table', label: 'Highlight Table', icon: Grid, desc: 'Color by value' },
      { id: 'heatmap', label: 'Heatmap', icon: Grid, desc: '2D intensity' },
      { id: 'pivot', label: 'Pivot Table', icon: Grid, desc: 'Grouped summary' },
    ],
  },
  {
    label: 'Advanced',
    charts: [
      { id: 'funnel', label: 'Funnel', icon: GitBranch, desc: 'Stage drop-off' },
      { id: 'sankey', label: 'Sankey', icon: GitBranch, desc: 'Flow between stages' },
      { id: 'radar', label: 'Radar', icon: Activity, desc: 'Multi-metric profile' },
      { id: 'gauge', label: 'Gauge', icon: Target, desc: 'KPI vs target' },
      { id: 'gantt', label: 'Gantt', icon: BarChart2, desc: 'Timeline / duration' },
      { id: 'candlestick', label: 'Candlestick', icon: BarChart2, desc: 'OHLC financial' },
      { id: 'metric_card', label: 'KPI Card', icon: Target, desc: 'Single KPI' },
    ],
  },
];

// auto-recommendation logic
export function recommendChartType(columns) {
  const hasDate = columns.some(c => c.type === 'date' || c.isDateCandidate);
  const numeric = columns.filter(c => c.type === 'numeric' || c.isKpiCandidate);
  const categorical = columns.filter(c => c.type === 'category' || c.isSegmentCandidate);
  const geo = columns.filter(c => ['country', 'state', 'city', 'lat', 'lon', 'latitude', 'longitude', 'zip'].includes(c.name?.toLowerCase()));

  if (geo.length > 0) return 'symbol_map';
  if (hasDate && numeric.length >= 1) return 'line';
  if (categorical.length >= 1 && numeric.length >= 1) return 'bar';
  if (numeric.length >= 2) return 'scatter';
  if (categorical.length >= 2 && numeric.length >= 1) return 'highlight_table';
  if (numeric.length === 1) return 'histogram';
  return 'text_table';
}

export default function VBShowMeGallery({ selected, onChange }) {
  return (
    <div className="space-y-4 p-3">
      <div className="text-xs text-white/30 uppercase tracking-widest font-semibold">Show Me</div>
      {CATEGORIES.map(cat => (
        <div key={cat.label}>
          <div className="text-xs text-white/20 uppercase tracking-wider mb-1.5 px-1">{cat.label}</div>
          <div className="grid grid-cols-2 gap-1">
            {cat.charts.map(chart => {
              const Icon = chart.icon;
              const isSelected = selected === chart.id;
              return (
                <button key={chart.id} onClick={() => onChange(chart.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all ${isSelected ? 'bg-cyan-400/12 border-cyan-400/30 text-cyan-400' : 'border-white/5 text-white/30 hover:text-white/60 hover:border-white/12 hover:bg-white/3'}`}>
                  <Icon className="w-4 h-4" />
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