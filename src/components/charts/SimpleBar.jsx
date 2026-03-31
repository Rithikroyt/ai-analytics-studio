import { useMemo } from 'react';

const COLORS = ['#00f5ff','#2dd4bf','#60a5fa','#c084fc','#f472b6','#fb923c','#facc15','#4ade80'];

export default function SimpleBar({ data = [], height = 200 }) {
  const maxVal = useMemo(() => Math.max(...data.map(d => d.value || 0), 1), [data]);
  const total = useMemo(() => data.reduce((s, d) => s + (d.value || 0), 0), [data]);

  if (!data.length) return <div className="flex items-center justify-center h-full text-muted-foreground text-xs">No data</div>;

  return (
    <div style={{ height }} className="flex flex-col gap-2 justify-center overflow-auto">
      {data.slice(0, 8).map((item, i) => {
        const pct = (item.value / maxVal) * 100;
        const sharePct = total > 0 ? Math.round(item.value / total * 100) : 0;
        return (
          <div key={item.name} className="flex items-center gap-3">
            <div className="w-24 text-xs text-muted-foreground truncate text-right flex-shrink-0">{item.name}</div>
            <div className="flex-1 h-5 bg-white/5 rounded overflow-hidden">
              <div
                className="h-full rounded transition-all"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${COLORS[i % COLORS.length]}cc, ${COLORS[i % COLORS.length]}66)`,
                }}
              />
            </div>
            <div className="w-12 text-xs text-right font-mono text-muted-foreground flex-shrink-0">{sharePct}%</div>
          </div>
        );
      })}
    </div>
  );
}