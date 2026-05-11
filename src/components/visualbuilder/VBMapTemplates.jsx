/**
 * VBMapTemplates — Pre-configured geographic map templates.
 * One-click to apply a regional visualization preset.
 */
import { Globe, Map, TrendingUp, DollarSign, Users, ShoppingCart, Activity, Zap } from 'lucide-react';

export const MAP_TEMPLATES = [
  {
    id: 'world_revenue',
    label: 'Global Revenue',
    icon: DollarSign,
    color: '#00e5ff',
    chartType: 'choropleth_map',
    desc: 'Revenue / sales by country worldwide',
    geoKeywords: ['country', 'nation', 'market'],
    kpiKeywords: ['revenue', 'sales', 'income', 'amount', 'total', 'gmv', 'arr', 'mrr'],
    aggFn: 'SUM',
  },
  {
    id: 'us_states_sales',
    label: 'US States Sales',
    icon: ShoppingCart,
    color: '#a855f7',
    chartType: 'symbol_map',
    desc: 'Sales volume by US state as bubbles',
    geoKeywords: ['state', 'us_state', 'region'],
    kpiKeywords: ['sales', 'orders', 'revenue', 'units', 'quantity'],
    aggFn: 'SUM',
  },
  {
    id: 'regional_customers',
    label: 'Customer Distribution',
    icon: Users,
    color: '#4caf50',
    chartType: 'symbol_map',
    desc: 'Customer count concentration by region',
    geoKeywords: ['country', 'state', 'city', 'region', 'location', 'market'],
    kpiKeywords: ['customers', 'users', 'accounts', 'clients', 'count'],
    aggFn: 'COUNT',
  },
  {
    id: 'world_growth',
    label: 'Growth by Market',
    icon: TrendingUp,
    color: '#ffcc02',
    chartType: 'choropleth_map',
    desc: 'Growth rate or change % by country',
    geoKeywords: ['country', 'market', 'region'],
    kpiKeywords: ['growth', 'change', 'rate', 'pct', 'percent', 'delta', 'diff'],
    aggFn: 'AVG',
  },
  {
    id: 'city_density',
    label: 'City Density',
    icon: Activity,
    color: '#ff6b35',
    chartType: 'heat_map_geo',
    desc: 'Activity or transaction density by city',
    geoKeywords: ['city', 'metro', 'municipality', 'location'],
    kpiKeywords: ['transactions', 'orders', 'events', 'activity', 'sessions', 'visits'],
    aggFn: 'COUNT',
  },
  {
    id: 'apac_revenue',
    label: 'APAC Revenue',
    icon: Globe,
    color: '#00bfa5',
    chartType: 'choropleth_map',
    desc: 'Revenue across Asia Pacific markets',
    geoKeywords: ['country', 'market', 'region'],
    kpiKeywords: ['revenue', 'sales', 'gmv'],
    aggFn: 'SUM',
    regionFilter: ['China', 'Japan', 'South Korea', 'India', 'Australia', 'Singapore', 'Indonesia', 'Thailand', 'Malaysia', 'Philippines', 'Vietnam', 'New Zealand'],
  },
  {
    id: 'emea_performance',
    label: 'EMEA Performance',
    icon: Map,
    color: '#ff2d7a',
    chartType: 'symbol_map',
    desc: 'Performance metrics across Europe, Middle East & Africa',
    geoKeywords: ['country', 'market', 'region'],
    kpiKeywords: ['revenue', 'sales', 'performance', 'score'],
    aggFn: 'SUM',
    regionFilter: ['UK', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Sweden', 'Poland', 'Saudi Arabia', 'UAE', 'South Africa', 'Nigeria', 'Egypt'],
  },
  {
    id: 'churn_by_region',
    label: 'Churn by Region',
    icon: Zap,
    color: '#ef4444',
    chartType: 'choropleth_map',
    desc: 'Churn rate or lost customers by geography',
    geoKeywords: ['country', 'state', 'region', 'market'],
    kpiKeywords: ['churn', 'attrition', 'lost', 'cancelled', 'cancellation'],
    aggFn: 'AVG',
  },
];

/**
 * Auto-match a template to dataset columns.
 * Returns best-matching template or null.
 */
export function autoMatchMapTemplate(columns) {
  const colNames = columns.map(c => c.name.toLowerCase());
  const hasGeo = t => t.geoKeywords.some(kw => colNames.some(n => n.includes(kw)));
  const hasKpi = t => t.kpiKeywords.some(kw => colNames.some(n => n.includes(kw)));
  return MAP_TEMPLATES.find(t => hasGeo(t) && hasKpi(t)) || null;
}

/**
 * Find best x/y columns for a given template from a columns list.
 */
export function resolveTemplateColumns(template, columns) {
  const geoCol = columns.find(c =>
    template.geoKeywords.some(kw => c.name.toLowerCase().includes(kw))
  );
  const kpiCol = columns.find(c =>
    (c.type === 'numeric' || c.isKpiCandidate) &&
    template.kpiKeywords.some(kw => c.name.toLowerCase().includes(kw))
  ) || columns.find(c => c.type === 'numeric' || c.isKpiCandidate);

  return { geoCol, kpiCol };
}

export default function VBMapTemplates({ columns, onApply }) {
  const colNames = columns.map(c => c.name.toLowerCase());
  const hasGeo = t => t.geoKeywords.some(kw => colNames.some(n => n.includes(kw)));

  // Split: matched templates first, then others
  const matched = MAP_TEMPLATES.filter(hasGeo);
  const unmatched = MAP_TEMPLATES.filter(t => !hasGeo(t));
  const sorted = [...matched, ...unmatched];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold text-white/50 uppercase tracking-widest">Map Templates</div>
        {matched.length > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400">
            {matched.length} matched
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {sorted.map(t => {
          const Icon = t.icon;
          const isMatch = hasGeo(t);
          return (
            <button
              key={t.id}
              onClick={() => onApply(t)}
              title={t.desc}
              className={`flex items-start gap-2 p-2.5 rounded-xl border text-left transition-all hover:scale-[1.02] ${
                isMatch
                  ? 'border-opacity-30 bg-opacity-8'
                  : 'border-white/8 bg-white/2 hover:border-white/15 opacity-60 hover:opacity-90'
              }`}
              style={isMatch ? { borderColor: `${t.color}40`, background: `${t.color}0d` } : {}}
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: `${t.color}18`, border: `1px solid ${t.color}30` }}>
                <Icon className="w-3.5 h-3.5" style={{ color: t.color }} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate" style={{ color: isMatch ? t.color : 'rgba(255,255,255,0.5)' }}>
                  {t.label}
                </div>
                <div className="text-xs text-white/25 leading-tight mt-0.5 line-clamp-2">{t.desc}</div>
                <div className="text-xs mt-0.5" style={{ color: `${t.color}80` }}>
                  {t.chartType.replace(/_/g, ' ')} · {t.aggFn}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}