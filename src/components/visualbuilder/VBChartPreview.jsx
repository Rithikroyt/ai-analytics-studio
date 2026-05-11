/**
 * VBChartPreview — Professional chart rendering engine
 * All chart types: bars, lines, scatter, pie, maps, radar, gauge, candlestick, bubble, forecast, etc.
 */
import { useMemo } from 'react';
import VBMapChart from './VBMapChart.jsx';
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, ScatterChart, Scatter, ReferenceLine, Legend,
  FunnelChart, Funnel, LabelList, Treemap, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, ZAxis,
} from 'recharts';

export const PALETTE = ['#00e5ff','#a855f7','#ff6b35','#4caf50','#ff2d7a','#ffcc02','#00bfa5','#60a5fa','#e91e63','#fb923c','#34d399','#f87171'];
const TOOLTIP_STYLE = { backgroundColor:'rgba(4,9,20,0.97)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, fontSize:11, padding:'8px 12px' };
const AXIS_STYLE = { fontSize:9, fill:'rgba(255,255,255,0.28)' };
const GRID_STROKE = 'rgba(255,255,255,0.04)';

// ── Helpers ────────────────────────────────────────────────────────────────────
export function fmtV(v) {
  if (v == null || isNaN(v)) return String(v ?? '');
  const n = Number(v);
  if (Math.abs(n) >= 1e9) return `${(n/1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n/1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n/1e3).toFixed(0)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits:1 });
}

function linearRegression(data) {
  const n = data.length; if (n < 2) return data;
  const xs = data.map((_,i)=>i), ys = data.map(d=>d.value);
  const xm = xs.reduce((a,b)=>a+b,0)/n, ym = ys.reduce((a,b)=>a+b,0)/n;
  const slope = xs.reduce((s,x,i)=>s+(x-xm)*(ys[i]-ym),0) / (xs.reduce((s,x)=>s+(x-xm)**2,0)||1);
  const intercept = ym - slope * xm;
  return data.map((d,i)=>({...d, trend: Math.round((slope*i+intercept)*100)/100}));
}

function detectAnomalies(data) {
  const vals = data.map(d=>d.value);
  const mean = vals.reduce((a,b)=>a+b,0)/vals.length;
  const std = Math.sqrt(vals.reduce((s,v)=>s+(v-mean)**2,0)/vals.length);
  return data.map(d=>({...d, isAnomaly: Math.abs(d.value-mean) > 2*std}));
}

function buildForecast(data, steps=5) {
  if (data.length < 3) return [];
  const n = data.length;
  const slope = (data[n-1].value - data[Math.max(0,n-4)].value) / Math.min(3,n-1);
  return Array.from({length:steps},(_,i)=>({
    name: `+${i+1}`,
    value: null,
    forecast: Math.round((data[n-1].value + slope*(i+1))*100)/100,
    ci_upper: Math.round((data[n-1].value + slope*(i+1) + Math.abs(slope)*(i+1)*0.35)*100)/100,
    ci_lower: Math.round((data[n-1].value + slope*(i+1) - Math.abs(slope)*(i+1)*0.35)*100)/100,
  }));
}

// ── buildChartData ─────────────────────────────────────────────────────────────
export function buildChartData(rows, shelves, aggFn, chartType, marks) {
  if (!rows?.length) return [];
  const xField = shelves.x?.[0]?.name;
  const yField = shelves.y?.[0]?.name;
  const y2Field = shelves.y?.[1]?.name;
  const sizeField = shelves.size?.[0]?.name;
  const colorField = shelves.color?.[0]?.name;

  if (chartType === 'histogram' && yField) {
    const vals = rows.map(r=>Number(r[yField])).filter(v=>!isNaN(v));
    if (!vals.length) return [];
    const min=Math.min(...vals), max=Math.max(...vals), bins=15, range=(max-min)||1;
    const counts = new Array(bins).fill(0);
    vals.forEach(v=>counts[Math.min(bins-1,Math.floor(((v-min)/range)*bins))]++);
    return counts.map((c,i)=>({name:fmtV(min+(i/bins)*range), value:c}));
  }

  if ((chartType==='scatter'||chartType==='bubble') && xField && yField) {
    return rows.slice(0,500).map(r=>({
      x:Number(r[xField]), y:Number(r[yField]),
      z:sizeField?Number(r[sizeField])||10:10,
      label:colorField?String(r[colorField]):'',
    })).filter(d=>!isNaN(d.x)&&!isNaN(d.y));
  }

  if (chartType==='box_plot' && xField && yField) {
    const groups={};
    rows.forEach(r=>{ const k=String(r[xField]??'All'); const v=Number(r[yField]); if(!isNaN(v)){if(!groups[k])groups[k]=[];groups[k].push(v);}});
    return Object.entries(groups).slice(0,12).map(([name,vals])=>{
      const s=[...vals].sort((a,b)=>a-b);
      const q1=s[Math.floor(s.length*0.25)], median=s[Math.floor(s.length*0.5)], q3=s[Math.floor(s.length*0.75)];
      const iqr=q3-q1;
      return {name,min:s[0],q1,median,q3,max:s[s.length-1],whisker_low:Math.max(s[0],q1-1.5*iqr),whisker_high:Math.min(s[s.length-1],q3+1.5*iqr),value:median};
    });
  }

  if (chartType==='waterfall' && xField && yField) {
    const groups={};
    rows.forEach(r=>{const k=String(r[xField]??'');groups[k]=(groups[k]||0)+(Number(r[yField])||0);});
    let cum=0;
    const entries=Object.entries(groups).slice(0,15);
    const result=entries.map(([name,value])=>{const start=cum;cum+=value;return{name,value:Math.round(value),start:Math.round(start),positive:value>=0,total:Math.round(cum)};});
    result.push({name:'Total',value:cum,start:0,positive:cum>=0,isTotal:true});
    return result;
  }

  if (chartType==='candlestick' && xField) {
    return rows.slice(0,60).map(r=>({
      name:String(r[xField]||''),
      open:Number(r['open']||r['Open']||r[yField]||0),
      high:Number(r['high']||r['High']||r[yField]||0)*1.02,
      low:Number(r['low']||r['Low']||r[yField]||0)*0.98,
      close:Number(r['close']||r['Close']||r[yField]||0),
    })).filter(d=>d.close>0||d.open>0);
  }

  if (chartType==='radar') {
    const numCols=Object.keys(rows[0]||{}).filter(k=>!isNaN(Number(rows[0][k]))).slice(0,8);
    if (!numCols.length) return [];
    const means={};
    rows.forEach(r=>{numCols.forEach(c=>{means[c]=(means[c]||0)+(Number(r[c])||0);});});
    return numCols.map(c=>({subject:c.replace(/_/g,' ').slice(0,14),value:Math.round((means[c]/rows.length)*100)/100,fullMark:Math.max(...rows.map(r=>Number(r[c])||0))}));
  }

  if ((chartType==='choropleth_map'||chartType==='symbol_map'||chartType==='heat_map_geo') && xField) {
    const groups={};
    rows.forEach(r=>{const k=String(r[xField]??'');if(k){groups[k]=(groups[k]||0)+(Number(r[yField])||0);}});
    return Object.entries(groups).map(([name,value])=>({name,value:Math.round(value*100)/100})).sort((a,b)=>b.value-a.value);
  }

  if (chartType==='dual_axis' && xField && yField && y2Field) {
    const groups={};
    rows.forEach(row=>{const k=String(row[xField]??'');if(!groups[k])groups[k]={v1:[],v2:[]};if(!isNaN(Number(row[yField])))groups[k].v1.push(Number(row[yField]));if(!isNaN(Number(row[y2Field])))groups[k].v2.push(Number(row[y2Field]));});
    const fn=(arr)=>{const a=(aggFn||'SUM').toLowerCase();if(a==='avg')return arr.reduce((a,b)=>a+b,0)/(arr.length||1);if(a==='count')return arr.length;if(a==='min')return Math.min(...arr);if(a==='max')return Math.max(...arr);return arr.reduce((a,b)=>a+b,0);};
    return Object.entries(groups).slice(0,25).map(([name,g])=>({name,value:Math.round(fn(g.v1)*100)/100,value2:Math.round(fn(g.v2)*100)/100}));
  }

  if (!xField || !yField) return [];
  const groups={};
  rows.forEach(row=>{
    const key=String(row[xField]??'Unknown'); const val=Number(row[yField])||0;
    if(!groups[key])groups[key]={values:[],count:0};
    groups[key].values.push(val); groups[key].count++;
  });
  const agg=(g)=>{
    switch((aggFn||'SUM').toLowerCase()){
      case 'avg':return g.values.reduce((a,b)=>a+b,0)/g.values.length;
      case 'count':return g.count;
      case 'min':return Math.min(...g.values);
      case 'max':return Math.max(...g.values);
      case 'median':{const s=[...g.values].sort((a,b)=>a-b);return s[Math.floor(s.length/2)];}
      default:return g.values.reduce((a,b)=>a+b,0);
    }
  };
  let result=Object.entries(groups).map(([name,g])=>({name,value:Math.round(agg(g)*100)/100}));
  const sort=marks?.sort||'Desc';
  if(sort==='Desc')result.sort((a,b)=>b.value-a.value);
  else if(sort==='Asc')result.sort((a,b)=>a.value-b.value);
  else if(sort==='Alpha')result.sort((a,b)=>a.name.localeCompare(b.name));
  return result.slice(0,35);
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function EmptyState({msg}) {
  return (
    <div className="flex flex-col items-center justify-center h-52 gap-2 text-white/15">
      <div className="text-4xl">📊</div>
      <div className="text-xs text-center max-w-48 leading-relaxed">{msg||'Configure X and Y fields to preview chart'}</div>
    </div>
  );
}

function GaugeChart({value, max, color}) {
  const pct = Math.min(1, Math.max(0, value/(max||100)));
  const angle = -135 + pct*270;
  const zones = [{end:0.33,c:'#ef4444'},{end:0.66,c:'#ffcc02'},{end:1,c:'#4caf50'}];
  return (
    <div className="flex flex-col items-center justify-center h-56 gap-1">
      <svg width={200} height={130} viewBox="0 0 200 130">
        <defs>
          <linearGradient id="gaugeTrack" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.7}/>
            <stop offset="50%" stopColor="#ffcc02" stopOpacity={0.7}/>
            <stop offset="100%" stopColor="#4caf50" stopOpacity={0.7}/>
          </linearGradient>
        </defs>
        {/* Track */}
        <path d="M 22 115 A 78 78 0 0 1 178 115" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={16} strokeLinecap="round"/>
        {/* Filled arc */}
        <path d="M 22 115 A 78 78 0 0 1 178 115" fill="none" stroke="url(#gaugeTrack)" strokeWidth={16} strokeLinecap="round"
          strokeDasharray={`${pct*245} 245`}/>
        {/* Needle */}
        {(() => {
          const rad = ((angle-90)*Math.PI)/180;
          const nx = 100 + 62*Math.cos(rad), ny = 115 + 62*Math.sin(rad);
          return (<>
            <line x1={100} y1={115} x2={nx} y2={ny} stroke={color} strokeWidth={2.5} strokeLinecap="round" opacity={0.9}/>
            <circle cx={100} cy={115} r={6} fill={color} opacity={0.9}/>
            <circle cx={100} cy={115} r={3} fill="rgba(4,9,20,0.9)"/>
          </>);
        })()}
        <text x={100} y={98} textAnchor="middle" fill={color} fontSize={20} fontWeight="900" fontFamily="monospace">{fmtV(value)}</text>
        <text x={22} y={128} textAnchor="start" fill="rgba(255,255,255,0.2)" fontSize={9}>0</text>
        <text x={178} y={128} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={9}>{fmtV(max)}</text>
      </svg>
      <div className="text-xs font-mono" style={{color}}>{Math.round(pct*100)}% of target</div>
    </div>
  );
}

// (Geo rendering moved to VBMapChart.jsx with real Leaflet)
const _GEO_PLACEHOLDER = { // kept to avoid removing the block below accidentally
  'USA':         { cx:140, cy:120, label:'US' },
  'United States':{ cx:140, cy:120, label:'US' },
  'US':          { cx:140, cy:120, label:'US' },
  'Canada':      { cx:140, cy:85,  label:'CA' },
  'Mexico':      { cx:140, cy:145, label:'MX' },
  'Brazil':      { cx:185, cy:185, label:'BR' },
  'Argentina':   { cx:182, cy:215, label:'AR' },
  'UK':          { cx:278, cy:88,  label:'UK' },
  'Germany':     { cx:295, cy:90,  label:'DE' },
  'France':      { cx:283, cy:95,  label:'FR' },
  'Spain':       { cx:275, cy:102, label:'ES' },
  'Italy':       { cx:298, cy:100, label:'IT' },
  'Russia':      { cx:370, cy:75,  label:'RU' },
  'China':       { cx:420, cy:110, label:'CN' },
  'India':       { cx:390, cy:130, label:'IN' },
  'Japan':       { cx:455, cy:105, label:'JP' },
  'Australia':   { cx:440, cy:195, label:'AU' },
  'South Africa':{ cx:305, cy:195, label:'ZA' },
  'Nigeria':     { cx:292, cy:148, label:'NG' },
  'Egypt':       { cx:313, cy:122, label:'EG' },
  'Kenya':       { cx:325, cy:155, label:'KE' },
  'South Korea': { cx:451, cy:106, label:'KR' },
  'Indonesia':   { cx:435, cy:155, label:'ID' },
  'Saudi Arabia':{ cx:345, cy:122, label:'SA' },
  'Turkey':      { cx:328, cy:98,  label:'TR' },
  'Poland':      { cx:307, cy:86,  label:'PL' },
  'Netherlands': { cx:286, cy:85,  label:'NL' },
  'Sweden':      { cx:300, cy:72,  label:'SE' },
  'Norway':      { cx:291, cy:68,  label:'NO' },
  'Switzerland': { cx:292, cy:96,  label:'CH' },
  'Belgium':     { cx:284, cy:88,  label:'BE' },
  'Portugal':    { cx:270, cy:101, label:'PT' },
  'Greece':      { cx:313, cy:104, label:'GR' },
  'Pakistan':    { cx:385, cy:118, label:'PK' },
  'Bangladesh':  { cx:406, cy:125, label:'BD' },
  'Thailand':    { cx:425, cy:135, label:'TH' },
  'Vietnam':     { cx:433, cy:138, label:'VN' },
  'Philippines': { cx:448, cy:138, label:'PH' },
  'Malaysia':    { cx:432, cy:148, label:'MY' },
  'Singapore':   { cx:434, cy:152, label:'SG' },
  'Colombia':    { cx:170, cy:165, label:'CO' },
  'Chile':       { cx:178, cy:210, label:'CL' },
  'Peru':        { cx:172, cy:183, label:'PE' },
  'Venezuela':   { cx:180, cy:155, label:'VE' },
  'UAE':         { cx:352, cy:123, label:'AE' },
  'Israel':      { cx:330, cy:112, label:'IL' },
  'Iran':        { cx:358, cy:110, label:'IR' },
  'Iraq':        { cx:340, cy:110, label:'IQ' },
};

function _WorldMapChartUnused({ data, color, chartType }) {
  if (!data?.length) return <EmptyState msg="Add a country/region column to X and a numeric measure to Y"/>;
  const max = Math.max(...data.map(d=>d.value),1);
  const total = data.reduce((s,d)=>s+d.value,0);
  const GEO_BLOBS = {};

  // Try to match data to known geo blobs
  const mapped = data.map(d=>{
    const key = Object.keys(GEO_BLOBS).find(k=>k.toLowerCase()===d.name?.toLowerCase());
    return key ? {...d, geo:GEO_BLOBS[key]} : null;
  }).filter(Boolean);

  const W=500, H=260;

  return (
    <div className="space-y-2">
      <div className="rounded-xl overflow-hidden border border-white/6" style={{background:'rgba(4,9,20,0.7)'}}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{maxHeight:260}}>
          {/* Simple world outline */}
          <rect x={0} y={0} width={W} height={H} fill="rgba(0,0,0,0)" />
          {/* Ocean */}
          <rect x={0} y={0} width={W} height={H} fill={`${color}05`} rx={8}/>
          {/* Graticule lines */}
          {[0.25,0.5,0.75].map(t=>(
            <line key={t} x1={0} y1={H*t} x2={W} y2={H*t} stroke="rgba(255,255,255,0.03)" strokeWidth={1}/>
          ))}
          {[0.2,0.4,0.6,0.8].map(t=>(
            <line key={t} x1={W*t} y1={0} x2={W*t} y2={H} stroke="rgba(255,255,255,0.03)" strokeWidth={1}/>
          ))}

          {/* Render unmapped items as simple ranked bars (if < 5 mapped) */}
          {mapped.length === 0 && data.slice(0,20).map((d,i)=>{
            const x = (i/(Math.min(data.length,20)))*W + 2;
            const bw = W/Math.min(data.length,20) - 3;
            const bh = ((d.value/max)*H*0.7);
            const pct = d.value/max;
            const hex = Math.round(pct*200+30).toString(16).padStart(2,'0');
            return (
              <g key={d.name}>
                <rect x={x} y={H-bh-20} width={bw} height={bh} fill={`${color}${hex}`} rx={3}/>
                {bw>20 && <text x={x+bw/2} y={H-6} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={8}>{d.name.slice(0,8)}</text>}
              </g>
            );
          })}

          {/* Render geo blobs */}
          {mapped.map((d,i)=>{
            const pct = d.value/max;
            const r = chartType==='symbol_map' ? 5+pct*28 : 10+pct*8;
            const alpha = 0.15+pct*0.85;
            const hex = Math.round(alpha*255).toString(16).padStart(2,'0');
            return (
              <g key={d.name}>
                {chartType==='choropleth_map' && (
                  <rect x={d.geo.cx-8} y={d.geo.cy-5} width={16} height={10} fill={`${color}${hex}`} rx={2} stroke={`${color}40`} strokeWidth={1}/>
                )}
                {chartType==='symbol_map' && (
                  <circle cx={d.geo.cx} cy={d.geo.cy} r={r} fill={color} fillOpacity={0.2+pct*0.6} stroke={color} strokeWidth={1} strokeOpacity={0.5}/>
                )}
                {chartType==='heat_map_geo' && (
                  <circle cx={d.geo.cx} cy={d.geo.cy} r={18+pct*20} fill={color} fillOpacity={0.08+pct*0.25}/>
                )}
                <text x={d.geo.cx} y={d.geo.cy+(chartType==='symbol_map'?r+9:14)} textAnchor="middle"
                  fill="rgba(255,255,255,0.6)" fontSize={7} fontWeight="600">{d.geo.label}</text>
                <text x={d.geo.cx} y={d.geo.cy+(chartType==='symbol_map'?r+18:23)} textAnchor="middle"
                  fill={color} fontSize={6} fontFamily="monospace" opacity={0.8}>{fmtV(d.value)}</text>
              </g>
            );
          })}

          {/* Legend */}
          <defs>
            <linearGradient id="mapLegend" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} stopOpacity={0.15}/>
              <stop offset="100%" stopColor={color} stopOpacity={0.9}/>
            </linearGradient>
          </defs>
          <rect x={W-100} y={H-22} width={90} height={8} fill="url(#mapLegend)" rx={4}/>
          <text x={W-100} y={H-6} fill="rgba(255,255,255,0.3)" fontSize={7}>Low</text>
          <text x={W-14} y={H-6} fill="rgba(255,255,255,0.3)" fontSize={7} textAnchor="end">High</text>
        </svg>
      </div>

      {/* Ranked list below map */}
      <div className="grid grid-cols-2 gap-1 max-h-36 overflow-y-auto">
        {data.slice(0,12).map((d,i)=>{
          const pct=d.value/max;
          return (
            <div key={d.name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/2 border border-white/5 hover:bg-white/4 transition-all">
              <div className="text-xs font-mono text-white/25 w-4">{i+1}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white/65 truncate font-medium">{d.name}</div>
              </div>
              <div className="text-xs font-mono" style={{color}}>{fmtV(d.value)}</div>
              <div className="w-10 h-1 bg-white/5 rounded-full overflow-hidden flex-shrink-0">
                <div className="h-full rounded-full" style={{width:`${pct*100}%`, background:color}}/>
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-xs text-white/20 text-center">
        {mapped.length>0 ? `${mapped.length} regions mapped · ` : ''}{data.length} total · {fmtV(total)} aggregate
      </div>
    </div>
  );
}

function CandlestickChart({data, color}) {
  if (!data?.length) return <EmptyState msg="Need a date X field. Columns named open/high/low/close will auto-map"/>;
  const allVals = data.flatMap(d=>[d.high,d.low]).filter(v=>v>0);
  if (!allVals.length) return <EmptyState msg="No valid OHLC values found"/>;
  const minV=Math.min(...allVals), maxV=Math.max(...allVals), range=(maxV-minV)||1;
  const H=200, w=Math.max(data.length*18, 200), barW=Math.min(12,(w/data.length)*0.55);

  return (
    <div className="overflow-x-auto rounded-xl border border-white/5 bg-white/1 p-2">
      <svg width={w} height={H+32} style={{display:'block',minWidth:200}}>
        {/* Grid */}
        {[0,0.25,0.5,0.75,1].map(t=>(
          <line key={t} x1={0} y1={t*H} x2={w} y2={t*H} stroke="rgba(255,255,255,0.04)" strokeWidth={1}/>
        ))}
        {data.map((d,i)=>{
          const x=(i+0.5)*(w/data.length);
          const bullish=d.close>=d.open;
          const col=bullish?'#4caf50':'#f87171';
          const highY=((maxV-d.high)/range)*H, lowY=((maxV-d.low)/range)*H;
          const openY=((maxV-d.open)/range)*H, closeY=((maxV-d.close)/range)*H;
          const bodyTop=Math.min(openY,closeY), bodyH=Math.max(2,Math.abs(closeY-openY));
          return (
            <g key={i}>
              <line x1={x} y1={highY} x2={x} y2={lowY} stroke={col} strokeWidth={1.5} opacity={0.8}/>
              <rect x={x-barW/2} y={bodyTop} width={barW} height={bodyH} fill={col} fillOpacity={bullish?0.8:0.6} rx={1.5}/>
            </g>
          );
        })}
        {[0,0.25,0.5,0.75,1].map(t=>(
          <text key={t} x={2} y={t*H+3} fill="rgba(255,255,255,0.2)" fontSize={8} fontFamily="monospace">
            {fmtV(maxV-t*range)}
          </text>
        ))}
        {data.filter((_,i)=>i%(Math.ceil(data.length/8))===0).map((d,i,arr)=>(
          <text key={d.name} x={(data.indexOf(d)+0.5)*(w/data.length)} y={H+18}
            fill="rgba(255,255,255,0.25)" fontSize={8} textAnchor="middle">
            {d.name?.slice(0,8)}
          </text>
        ))}
      </svg>
    </div>
  );
}

function PackedBubbleChart({data, color}) {
  if (!data?.length) return <EmptyState/>;
  const max=Math.max(...data.map(d=>d.value),1);
  const W=500, H=240;
  const bubbles=data.slice(0,18).map((d,i)=>({
    ...d, r:10+(d.value/max)*55, color:PALETTE[i%PALETTE.length]
  }));
  const placed=bubbles.map((b,i)=>{
    const angle=i*2.618, dist=i===0?0:28+i*22;
    return {...b, cx:W/2+Math.cos(angle)*dist*0.95, cy:H/2+Math.sin(angle)*dist*0.65};
  });
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{maxHeight:250}}>
      {placed.map((b,i)=>(
        <g key={b.name}>
          <circle cx={b.cx} cy={b.cy} r={b.r} fill={b.color} fillOpacity={0.65} stroke={b.color} strokeWidth={1.5} strokeOpacity={0.35}/>
          {b.r>18&&<text x={b.cx} y={b.cy-1} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={Math.min(10,b.r/3)} fontWeight="700">{b.name.slice(0,10)}</text>}
          {b.r>26&&<text x={b.cx} y={b.cy+10} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize={8} fontFamily="monospace">{fmtV(b.value)}</text>}
        </g>
      ))}
    </svg>
  );
}

function SankeyChart({data, color}) {
  if (data.length<2) return <EmptyState msg="Need at least 2 data points"/>;
  const total=data.reduce((s,d)=>s+d.value,0);
  const H=220, W=480;
  let y=0;
  const bars=data.slice(0,10).map((d,i)=>{
    const h=Math.max(10,(d.value/total)*H*0.9);
    const bar={...d,y,h,color:PALETTE[i%PALETTE.length]};
    y+=h+5; return bar;
  });
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{maxHeight:230}}>
      {bars.map((b,i)=>(
        <g key={b.name}>
          <rect x={20} y={b.y} width={70} height={b.h} fill={b.color} fillOpacity={0.75} rx={4}/>
          {i<bars.length-1&&(
            <path d={`M 90 ${b.y+b.h/2} C 190 ${b.y+b.h/2}, 190 ${bars[i+1].y+bars[i+1].h/2}, 290 ${bars[i+1].y+bars[i+1].h/2}`}
              fill="none" stroke={b.color} strokeWidth={Math.max(3,b.h*0.5)} strokeOpacity={0.25}/>
          )}
          <rect x={290} y={b.y} width={70} height={b.h} fill={bars[(i+1)%bars.length].color} fillOpacity={0.75} rx={4}/>
          <text x={100} y={b.y+b.h/2+4} fill="rgba(255,255,255,0.55)" fontSize={9} fontWeight="600">{b.name.slice(0,14)}</text>
          <text x={370} y={b.y+b.h/2+4} fill="rgba(255,255,255,0.4)" fontSize={8} fontFamily="monospace">{fmtV(b.value)}</text>
        </g>
      ))}
    </svg>
  );
}

function SunburstChart({data, opacity}) {
  if (!data?.length) return <EmptyState/>;
  const total=data.reduce((s,d)=>s+d.value,0);
  const W=220, H=220, cx=W/2, cy=H/2;
  let angle=-Math.PI/2;
  const rings=[
    {r1:30,r2:70,slice:data.slice(0,8)},
    {r1:72,r2:100,slice:data.slice(0,Math.min(16,data.length))},
  ];
  const allArcs=[];
  rings.forEach(({r1,r2,slice},ri)=>{
    const t=slice.reduce((s,d)=>s+d.value,0);
    let a=-Math.PI/2;
    slice.forEach((d,i)=>{
      const sweep=(d.value/t)*2*Math.PI;
      const a1=a, a2=a+sweep; a=a2;
      const x1=cx+r1*Math.cos(a1),y1=cy+r1*Math.sin(a1);
      const x2=cx+r2*Math.cos(a1),y2=cy+r2*Math.sin(a1);
      const x3=cx+r2*Math.cos(a2),y3=cy+r2*Math.sin(a2);
      const x4=cx+r1*Math.cos(a2),y4=cy+r1*Math.sin(a2);
      const lg=sweep>Math.PI?1:0;
      allArcs.push({path:`M${x1} ${y1} A${r1} ${r1} 0 ${lg} 1 ${x4} ${y4} L${x3} ${y3} A${r2} ${r2} 0 ${lg} 0 ${x2} ${y2}Z`,color:PALETTE[(ri*4+i)%PALETTE.length],name:d.name,pct:Math.round(d.value/t*100)});
    });
  });
  return (
    <div className="flex items-center gap-4">
      <svg width={W} height={H} style={{flexShrink:0}}>
        {allArcs.map((a,i)=><path key={i} d={a.path} fill={a.color} fillOpacity={opacity} stroke="rgba(0,0,0,0.2)" strokeWidth={0.5}/>)}
        <circle cx={cx} cy={cy} r={28} fill="rgba(4,9,20,0.9)"/>
        <text x={cx} y={cy-2} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={9}>Total</text>
        <text x={cx} y={cy+10} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize={8} fontFamily="monospace">{fmtV(data.reduce((s,d)=>s+d.value,0))}</text>
      </svg>
      <div className="flex-1 space-y-1 text-xs max-h-48 overflow-y-auto">
        {data.slice(0,12).map((d,i)=>(
          <div key={d.name} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{background:PALETTE[i%PALETTE.length]}}/>
            <span className="flex-1 truncate text-white/55">{d.name}</span>
            <span className="font-mono text-white/35">{Math.round(d.value/total*100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────────
export default function VBChartPreview({chartType, data, marks, shelves}) {
  const color = marks?.color||'#00e5ff';
  const opacity = (marks?.opacity??85)/100;
  const showLabel = marks?.showLabel;
  const showGrid = marks?.showGrid!==false;
  const showLegend = marks?.showLegend;
  const showDots = marks?.showDots;
  const strokeWidth = marks?.strokeWidth??2;
  const borderRadius = marks?.borderRadius??4;
  const xField = shelves?.x?.[0]?.name;
  const yField = shelves?.y?.[0]?.name;
  const y2Field = shelves?.y?.[1]?.name;

  const enrichedData = useMemo(()=>{
    if (!data?.length) return [];
    let d = data;
    if (marks?.showTrendLine) d = linearRegression(d);
    if (marks?.showAnomalies) d = detectAnomalies(d);
    return d;
  }, [data, marks?.showTrendLine, marks?.showAnomalies]);

  const gradient = marks?.gradient;

  if (!data?.length) return <EmptyState/>;

  const gradId = `grad_${color.replace('#','')}`;
  const GradDefs = ()=>(
    <defs>
      <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={gradient?gradient.from:color} stopOpacity={0.5}/>
        <stop offset="100%" stopColor={gradient?gradient.to:color} stopOpacity={0.02}/>
      </linearGradient>
    </defs>
  );

  // ── BAR ──
  if (chartType==='bar'||chartType==='bar_horizontal') {
    const layout=chartType==='bar_horizontal'?'vertical':'horizontal';
    return (
      <ResponsiveContainer width="100%" height={270}>
        <BarChart data={enrichedData} layout={layout} margin={{top:4,right:16,bottom:30,left:0}}>
          <defs><GradDefs/></defs>
          {showGrid&&<CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE}/>}
          {layout==='horizontal'?(<>
            <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} interval={0} angle={-18} textAnchor="end" height={40}/>
            <YAxis tick={AXIS_STYLE} tickFormatter={fmtV} tickLine={false} axisLine={false} width={44}/>
          </>):(<>
            <XAxis type="number" tick={AXIS_STYLE} tickFormatter={fmtV} tickLine={false} axisLine={false}/>
            <YAxis type="category" dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} width={100}/>
          </>)}
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV}/>
          {marks?.showReferenceLine&&<ReferenceLine y={marks.referenceValue||0} stroke="rgba(255,255,255,0.3)" strokeDasharray="5 3" label={{value:'Target',fill:'rgba(255,255,255,0.4)',fontSize:9}}/>}
          {marks?.showTrendLine&&<Line type="monotone" dataKey="trend" stroke="#ffcc02" strokeWidth={1.5} dot={false} strokeDasharray="5 3"/>}
          <Bar dataKey="value" radius={[borderRadius,borderRadius,0,0]}>
            {enrichedData.map((d,i)=>(
              <Cell key={i} fill={gradient?`url(#${gradId})`:color} fillOpacity={d.isAnomaly?1:opacity}
                stroke={d.isAnomaly?'#ef4444':'none'} strokeWidth={d.isAnomaly?2:0}/>
            ))}
            {showLabel&&<LabelList dataKey="value" formatter={fmtV} style={{fontSize:9,fill:'rgba(255,255,255,0.55)'}}/>}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // ── BAR STACKED / GROUPED ──
  if (chartType==='bar_stacked'||chartType==='bar_grouped') {
    return (
      <ResponsiveContainer width="100%" height={270}>
        <BarChart data={enrichedData} margin={{top:4,right:16,bottom:30,left:0}}>
          {showGrid&&<CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE}/>}
          <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} angle={-15} textAnchor="end" interval="preserveStartEnd" height={36}/>
          <YAxis tick={AXIS_STYLE} tickFormatter={fmtV} tickLine={false} axisLine={false} width={44}/>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV}/>
          {showLegend&&<Legend wrapperStyle={{fontSize:10}}/>}
          <Bar dataKey="value" fill={color} fillOpacity={opacity} stackId={chartType==='bar_stacked'?'s':undefined} radius={[borderRadius,borderRadius,0,0]}>
            {showLabel&&<LabelList dataKey="value" formatter={fmtV} style={{fontSize:9,fill:'rgba(255,255,255,0.55)'}}/>}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // ── LINE / STEP ──
  if (chartType==='line'||chartType==='step_line') {
    return (
      <ResponsiveContainer width="100%" height={270}>
        <LineChart data={enrichedData} margin={{top:4,right:16,bottom:4,left:0}}>
          <defs><GradDefs/></defs>
          {showGrid&&<CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE}/>}
          <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
          <YAxis tick={AXIS_STYLE} tickFormatter={fmtV} tickLine={false} axisLine={false} width={44}/>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV}/>
          {showLegend&&<Legend wrapperStyle={{fontSize:10}}/>}
          {marks?.showReferenceLine&&<ReferenceLine y={marks.referenceValue||0} stroke="rgba(255,255,255,0.25)" strokeDasharray="5 3"/>}
          <Line type={chartType==='step_line'?'stepAfter':'monotone'} dataKey="value" stroke={color} strokeWidth={strokeWidth}
            dot={showDots?{fill:color,r:3,strokeWidth:1,stroke:'rgba(0,0,0,0.4)'}:false}
            activeDot={{r:5,fill:color,stroke:'rgba(0,0,0,0.5)',strokeWidth:2}}>
            {enrichedData.map((d,i)=>d.isAnomaly&&<Cell key={i} stroke="#ef4444" strokeWidth={3}/>)}
          </Line>
          {marks?.showTrendLine&&<Line type="monotone" dataKey="trend" stroke="#ffcc02" strokeWidth={1.5} dot={false} strokeDasharray="6 3"/>}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // ── AREA ──
  if (chartType==='area'||chartType==='area_stacked') {
    return (
      <ResponsiveContainer width="100%" height={270}>
        <AreaChart data={enrichedData} margin={{top:4,right:16,bottom:4,left:0}}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={gradient?.from||color} stopOpacity={0.45}/>
              <stop offset="95%" stopColor={gradient?.to||color} stopOpacity={0.02}/>
            </linearGradient>
          </defs>
          {showGrid&&<CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE}/>}
          <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
          <YAxis tick={AXIS_STYLE} tickFormatter={fmtV} tickLine={false} axisLine={false} width={44}/>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV}/>
          {marks?.showReferenceLine&&<ReferenceLine y={marks.referenceValue||0} stroke="rgba(255,255,255,0.25)" strokeDasharray="5 3"/>}
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={strokeWidth} fill={`url(#${gradId})`}
            dot={showDots?{fill:color,r:3}:false} stackId={chartType==='area_stacked'?'s':undefined}/>
          {marks?.showTrendLine&&<Line type="monotone" dataKey="trend" stroke="#ffcc02" strokeWidth={1.5} dot={false} strokeDasharray="6 3"/>}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // ── FORECAST LINE ──
  if (chartType==='forecast_line') {
    const combined=[...data.map(d=>({...d,historical:d.value})),...buildForecast(data)];
    return (
      <ResponsiveContainer width="100%" height={270}>
        <ComposedChart data={combined} margin={{top:4,right:16,bottom:4,left:0}}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
              <stop offset="95%" stopColor={color} stopOpacity={0.02}/>
            </linearGradient>
          </defs>
          {showGrid&&<CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE}/>}
          <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
          <YAxis tick={AXIS_STYLE} tickFormatter={fmtV} tickLine={false} axisLine={false} width={44}/>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV}/>
          <Area type="monotone" dataKey="ci_upper" stroke="none" fill={color} fillOpacity={0.08} legendType="none"/>
          <Area type="monotone" dataKey="ci_lower" stroke="none" fill="transparent" legendType="none"/>
          <Line type="monotone" dataKey="historical" stroke={color} strokeWidth={strokeWidth} dot={false} connectNulls name="Historical"/>
          <Line type="monotone" dataKey="forecast" stroke={color} strokeWidth={2} dot={{fill:color,r:5,stroke:'rgba(0,0,0,0.5)',strokeWidth:2}} strokeDasharray="7 4" connectNulls name="Forecast"/>
          {showLegend&&<Legend wrapperStyle={{fontSize:10}}/>}
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  // ── DUAL AXIS ──
  if (chartType==='dual_axis') {
    const hasDual=enrichedData.some(d=>d.value2!=null);
    if (!hasDual) return (
      <div className="space-y-1.5">
        <div className="text-xs text-amber-400 px-1">⚠ Add a second Y field to enable Dual Axis</div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={enrichedData} margin={{top:4,right:16,bottom:28,left:0}}>
            {showGrid&&<CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE}/>}
            <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
            <YAxis tick={AXIS_STYLE} tickFormatter={fmtV} tickLine={false} axisLine={false} width={44}/>
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV}/>
            <Bar dataKey="value" fill={color} fillOpacity={opacity} radius={[borderRadius,borderRadius,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
    return (
      <ResponsiveContainer width="100%" height={270}>
        <ComposedChart data={enrichedData} margin={{top:4,right:48,bottom:28,left:0}}>
          {showGrid&&<CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE}/>}
          <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} angle={-15} textAnchor="end" interval="preserveStartEnd"/>
          <YAxis yAxisId="left" tick={AXIS_STYLE} tickFormatter={fmtV} tickLine={false} axisLine={false} width={44}/>
          <YAxis yAxisId="right" orientation="right" tick={AXIS_STYLE} tickFormatter={fmtV} tickLine={false} axisLine={false} width={44}/>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV}/>
          {showLegend&&<Legend wrapperStyle={{fontSize:10}}/>}
          <Bar yAxisId="left" dataKey="value" fill={color} fillOpacity={opacity} radius={[borderRadius,borderRadius,0,0]} name={yField||'Metric 1'}/>
          <Line yAxisId="right" type="monotone" dataKey="value2" stroke="#a855f7" strokeWidth={strokeWidth} dot={false} name={y2Field||'Metric 2'}/>
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  // ── SCATTER / BUBBLE ──
  if (chartType==='scatter'||chartType==='bubble') {
    return (
      <ResponsiveContainer width="100%" height={270}>
        <ScatterChart margin={{top:4,right:16,bottom:4,left:0}}>
          {showGrid&&<CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE}/>}
          <XAxis type="number" dataKey="x" tick={AXIS_STYLE} tickLine={false} axisLine={false} tickFormatter={fmtV} name={xField}/>
          <YAxis type="number" dataKey="y" tick={AXIS_STYLE} tickLine={false} axisLine={false} tickFormatter={fmtV} width={44} name={yField}/>
          {chartType==='bubble'&&<ZAxis type="number" dataKey="z" range={[40,500]}/>}
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV} cursor={{strokeDasharray:'3 3'}}/>
          <Scatter data={data} fill={color} fillOpacity={opacity}/>
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  // ── HISTOGRAM ──
  if (chartType==='histogram') {
    return (
      <ResponsiveContainer width="100%" height={270}>
        <BarChart data={enrichedData} margin={{top:4,right:16,bottom:4,left:0}} barCategoryGap="2%">
          <defs><GradDefs/></defs>
          {showGrid&&<CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE}/>}
          <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false}/>
          <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={40} label={{value:'Freq.',angle:-90,fill:'rgba(255,255,255,0.2)',fontSize:9,position:'insideLeft'}}/>
          <Tooltip contentStyle={TOOLTIP_STYLE}/>
          <Bar dataKey="value" fill={gradient?`url(#${gradId})`:color} fillOpacity={opacity} name="Frequency" radius={[2,2,0,0]}/>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // ── PIE / DONUT ──
  if (chartType==='donut'||chartType==='pie') {
    const total=data.reduce((s,d)=>s+d.value,0);
    const inner=chartType==='donut'?65:0;
    return (
      <div className="flex items-center gap-4">
        <div style={{width:200,height:220,flexShrink:0}}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                {data.slice(0,12).map((_,i)=>(
                  <radialGradient key={i} id={`rg${i}`}>
                    <stop offset="0%" stopColor={PALETTE[i%PALETTE.length]} stopOpacity={0.95}/>
                    <stop offset="100%" stopColor={PALETTE[i%PALETTE.length]} stopOpacity={0.6}/>
                  </radialGradient>
                ))}
              </defs>
              <Pie data={data.slice(0,12)} cx="50%" cy="50%" innerRadius={inner} outerRadius={90} paddingAngle={chartType==='donut'?3:1} dataKey="value" startAngle={90} endAngle={-270}>
                {data.slice(0,12).map((_,i)=><Cell key={i} fill={`url(#rg${i})`} fillOpacity={opacity} stroke="rgba(0,0,0,0.2)" strokeWidth={1}/>)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v=>[fmtV(v)]}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1.5 text-xs max-h-48 overflow-y-auto">
          {data.slice(0,10).map((d,i)=>(
            <div key={d.name} className="flex items-center gap-2 group cursor-default">
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{background:PALETTE[i%PALETTE.length]}}/>
              <span className="flex-1 truncate text-white/55 group-hover:text-white/80 transition-colors">{d.name}</span>
              <span className="font-mono text-white/35">{total>0?Math.round(d.value/total*100):0}%</span>
            </div>
          ))}
          {data.length>10&&<div className="text-white/20">+{data.length-10} more</div>}
        </div>
      </div>
    );
  }

  // ── TREEMAP ──
  if (chartType==='treemap') {
    return (
      <ResponsiveContainer width="100%" height={270}>
        <Treemap data={data.slice(0,24).map(d=>({...d,size:Math.max(1,d.value)})) } dataKey="size" aspectRatio={16/9}
          content={({x,y,width,height,name,value,index})=>(
            <g>
              <rect x={x+1} y={y+1} width={width-2} height={height-2} fill={PALETTE[index%PALETTE.length]} fillOpacity={opacity} rx={5} stroke="rgba(0,0,0,0.25)" strokeWidth={1}/>
              {width>55&&height>28&&(<>
                <text x={x+7} y={y+height/2-5} fill="white" fillOpacity={0.85} fontSize={Math.min(11,width/8)} fontWeight="700">{name?.slice(0,16)}</text>
                <text x={x+7} y={y+height/2+9} fill="white" fillOpacity={0.5} fontSize={9} fontFamily="monospace">{fmtV(value)}</text>
              </>)}
            </g>
          )}/>
      </ResponsiveContainer>
    );
  }

  // ── WATERFALL ──
  if (chartType==='waterfall') {
    return (
      <ResponsiveContainer width="100%" height={270}>
        <ComposedChart data={enrichedData} margin={{top:4,right:16,bottom:28,left:0}}>
          {showGrid&&<CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE}/>}
          <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} angle={-20} textAnchor="end" interval="preserveStartEnd"/>
          <YAxis tick={AXIS_STYLE} tickFormatter={fmtV} tickLine={false} axisLine={false} width={44}/>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV}/>
          <Bar dataKey="start" stackId="a" fill="transparent" radius={0}/>
          <Bar dataKey="value" stackId="a" radius={[borderRadius,borderRadius,0,0]}>
            {enrichedData.map((d,i)=><Cell key={i} fill={d.isTotal?color:d.positive?'#4caf50':'#f87171'} fillOpacity={opacity}/>)}
            {showLabel&&<LabelList dataKey="total" formatter={fmtV} style={{fontSize:9,fill:'rgba(255,255,255,0.55)'}}/>}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  // ── BOX PLOT ──
  if (chartType==='box_plot') {
    return (
      <div className="space-y-2 overflow-auto max-h-60 px-1">
        {enrichedData.slice(0,12).map((d,i)=>{
          const range=(d.max-d.min)||1;
          const p=v=>`${Math.max(0,Math.min(100,((v-d.min)/range)*100))}%`;
          return (
            <div key={i} className="flex items-center gap-3 text-xs py-1.5">
              <span className="w-24 text-white/40 truncate shrink-0">{d.name}</span>
              <div className="flex-1 relative h-7 min-w-0 bg-white/2 rounded-lg overflow-hidden">
                <div className="absolute top-1/2 h-px bg-white/15" style={{left:p(d.whisker_low||d.min),right:`${100-parseFloat(p(d.whisker_high||d.max))}%`}}/>
                <div className="absolute top-1 bottom-1 w-0.5 bg-white/20" style={{left:p(d.whisker_low||d.min)}}/>
                <div className="absolute top-1 bottom-1 w-0.5 bg-white/20" style={{left:p(d.whisker_high||d.max)}}/>
                <div className="absolute inset-y-1.5 rounded border" style={{left:p(d.q1),right:`${100-parseFloat(p(d.q3))}%`,background:`${color}20`,borderColor:`${color}55`}}/>
                <div className="absolute inset-y-0 w-0.5 rounded" style={{left:p(d.median),background:color}}/>
              </div>
              <span className="font-mono text-white/35 w-12 text-right">{fmtV(d.median)}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-3 text-xs text-white/20 pt-1 border-t border-white/5">
          <span className="w-24"/>
          <div className="flex-1 flex justify-between"><span>Min</span><span>Q1</span><span style={{color}}>Median</span><span>Q3</span><span>Max</span></div>
        </div>
      </div>
    );
  }

  // ── HEATMAP / HIGHLIGHT TABLE ──
  if (chartType==='heatmap'||chartType==='highlight_table') {
    const max=Math.max(...data.map(d=>d.value),1);
    const cols=Math.min(Math.ceil(Math.sqrt(data.slice(0,36).length)),7);
    return (
      <div className="grid gap-1.5" style={{gridTemplateColumns:`repeat(${cols},1fr)`}}>
        {data.slice(0,36).map((d,i)=>{
          const pct=d.value/max;
          const a=Math.round(pct*200+15).toString(16).padStart(2,'0');
          return (
            <div key={i} className="rounded-xl p-2 text-center cursor-default hover:scale-105 transition-transform"
              style={{background:`${color}${a}`,border:`1px solid ${color}25`}}>
              <div className="text-white/50 truncate text-xs leading-tight">{d.name}</div>
              <div className="font-mono font-bold text-white mt-0.5 text-xs">{fmtV(d.value)}</div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── TEXT TABLE / PIVOT ──
  if (chartType==='text_table'||chartType==='pivot') {
    const total=data.reduce((s,d)=>s+d.value,0);
    const max=Math.max(...data.map(d=>d.value),1);
    return (
      <div className="overflow-auto rounded-xl border border-white/6">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-white/3">
              <th className="px-3 py-2 text-left text-white/35 font-semibold">{xField?.replace(/_/g,' ')||'Name'}</th>
              <th className="px-3 py-2 text-right text-white/35 font-semibold">{yField?.replace(/_/g,' ')||'Value'}</th>
              <th className="px-3 py-2 text-right text-white/35 font-semibold">Share</th>
              <th className="px-3 py-2 text-white/35 font-semibold w-24">Bar</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0,25).map((d,i)=>{
              const pct=total>0?d.value/total:0;
              return (
                <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-3 py-2 text-white/65 flex items-center gap-1.5">
                    <span className="w-4 text-white/20 font-mono">{i+1}</span>{d.name}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold" style={{color}}>{fmtV(d.value)}</td>
                  <td className="px-3 py-2 text-right font-mono text-white/35">{Math.round(pct*100)}%</td>
                  <td className="px-3 py-2">
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{width:`${(d.value/max)*100}%`,background:color}}/>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // ── FUNNEL ──
  if (chartType==='funnel') {
    const fData=data.slice(0,8);
    const maxV=Math.max(...fData.map(d=>d.value),1);
    return (
      <div className="space-y-1.5 py-2">
        {fData.map((d,i)=>{
          const pct=d.value/maxV;
          const conv=i>0?(d.value/fData[i-1].value*100).toFixed(0):null;
          return (
            <div key={d.name} className="flex flex-col items-center gap-0.5">
              <div className="rounded-lg flex items-center justify-center gap-3 py-2 transition-all"
                style={{width:`${40+pct*60}%`,background:`${PALETTE[i%PALETTE.length]}${Math.round(0.3+pct*0.5*255).toString(16).padStart(2,'0')}`,border:`1px solid ${PALETTE[i%PALETTE.length]}35`}}>
                <span className="text-xs font-bold text-white/80 truncate">{d.name}</span>
                <span className="text-xs font-mono text-white/55">{fmtV(d.value)}</span>
              </div>
              {conv&&<div className="text-xs text-white/20">↓ {conv}% conversion</div>}
            </div>
          );
        })}
      </div>
    );
  }

  // ── RADAR ──
  if (chartType==='radar') {
    return (
      <ResponsiveContainer width="100%" height={270}>
        <RadarChart data={enrichedData} margin={{top:10,right:25,bottom:10,left:25}}>
          <PolarGrid stroke={GRID_STROKE} strokeDasharray="3 3"/>
          <PolarAngleAxis dataKey="subject" tick={{...AXIS_STYLE,fontSize:10}}/>
          <PolarRadiusAxis tick={AXIS_STYLE} axisLine={false} tickFormatter={fmtV}/>
          <Radar dataKey="value" stroke={color} fill={color} fillOpacity={0.22} strokeWidth={strokeWidth} dot={{fill:color,r:3.5,strokeWidth:1,stroke:'rgba(0,0,0,0.4)'}}/>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV}/>
        </RadarChart>
      </ResponsiveContainer>
    );
  }

  // ── GAUGE ──
  if (chartType==='gauge') {
    const total=data.reduce((s,d)=>s+d.value,0);
    const max=data.length>0?Math.max(...data.map(d=>d.value))*Math.max(1,data.length):100;
    return <GaugeChart value={total} max={max||100} color={color}/>;
  }

  // ── KPI / METRIC CARD ──
  if (chartType==='metric_card'||chartType==='bullet') {
    const total=data.reduce((s,d)=>s+d.value,0);
    const top=data.slice(0,4);
    return (
      <div className="flex flex-col items-center justify-center h-56 gap-5">
        <div className="text-center">
          <div className="text-6xl font-black font-mono leading-none" style={{color,textShadow:`0 0 40px ${color}50`}}>{fmtV(total)}</div>
          <div className="text-sm text-white/35 mt-2 font-medium">{yField?.replace(/_/g,' ')||'Total KPI'}</div>
        </div>
        <div className="flex gap-5">
          {top.map((d,i)=>(
            <div key={d.name} className="text-center">
              <div className="font-mono font-bold text-sm" style={{color:PALETTE[i]}}>{fmtV(d.value)}</div>
              <div className="text-xs text-white/30 truncate max-w-20 mt-0.5">{d.name}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── MAP CHARTS ──
  if (chartType==='choropleth_map'||chartType==='symbol_map'||chartType==='heat_map_geo') {
    return <VBMapChart data={data} color={color} chartType={chartType}/>;
  }

  // ── CANDLESTICK ──
  if (chartType==='candlestick') {
    return <CandlestickChart data={data} color={color}/>;
  }

  // ── PACKED BUBBLE ──
  if (chartType==='packed_bubble') {
    return <PackedBubbleChart data={data} color={color}/>;
  }

  // ── SANKEY ──
  if (chartType==='sankey') {
    return <SankeyChart data={data} color={color}/>;
  }

  // ── SUNBURST ──
  if (chartType==='sunburst') {
    return <SunburstChart data={data} opacity={opacity}/>;
  }

  // ── DENSITY STRIP (violin) ──
  if (chartType==='violin') {
    const maxVal=Math.max(...enrichedData.map(d=>d.value),1);
    return (
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {enrichedData.slice(0,14).map((d,i)=>{
          const pct=d.value/maxVal;
          return (
            <div key={d.name} className="flex items-center gap-3 text-xs">
              <span className="w-24 text-white/40 truncate shrink-0">{d.name}</span>
              <div className="flex-1 h-5 relative overflow-hidden bg-white/2 rounded-full">
                <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{width:`${pct*100}%`,background:`linear-gradient(90deg,${color}30,${color}70)`}}/>
                <div className="absolute inset-y-1 rounded-full" style={{left:`${Math.max(0,pct*100-2)}%`,width:'3px',background:color}}/>
                {pct>0.05&&<div className="absolute inset-y-0 flex items-center px-2 text-white/60 font-mono" style={{left:`${pct*100}%`}}>{fmtV(d.value)}</div>}
              </div>
              <span className="font-mono text-white/35 w-12 text-right">{fmtV(d.value)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // ── GANTT ──
  if (chartType==='gantt') {
    const total=data.reduce((s,x)=>s+x.value,0)||1;
    return (
      <div className="space-y-1.5 overflow-auto max-h-60">
        <div className="flex items-center gap-2 text-xs text-white/20 mb-2 border-b border-white/5 pb-1">
          <span className="w-24"/>
          <div className="flex-1 flex justify-between">
            {[0,25,50,75,100].map(t=><span key={t}>{t}%</span>)}
          </div>
          <span className="w-12"/>
        </div>
        {data.slice(0,16).map((d,i)=>{
          const pct=(d.value/total)*100;
          const offset=data.slice(0,i).reduce((s,x)=>s+x.value,0)/total*100;
          return (
            <div key={d.name} className="flex items-center gap-2 text-xs">
              <span className="w-24 text-white/40 truncate shrink-0">{d.name}</span>
              <div className="flex-1 h-5 bg-white/3 rounded-lg relative overflow-hidden">
                <div className="absolute inset-y-0.5 rounded-md transition-all" style={{left:`${offset}%`,width:`${pct}%`,background:PALETTE[i%PALETTE.length],opacity:opacity}}/>
              </div>
              <span className="font-mono text-white/35 w-10 text-right">{fmtV(d.value)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Fallback bar ──
  return (
    <ResponsiveContainer width="100%" height={270}>
      <BarChart data={enrichedData} margin={{top:4,right:16,bottom:28,left:0}}>
        <defs><GradDefs/></defs>
        {showGrid&&<CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE}/>}
        <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} angle={-20} textAnchor="end" interval="preserveStartEnd"/>
        <YAxis tick={AXIS_STYLE} tickFormatter={fmtV} tickLine={false} axisLine={false} width={44}/>
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV}/>
        <Bar dataKey="value" fill={gradient?`url(#${gradId})`:color} fillOpacity={opacity} radius={[borderRadius,borderRadius,0,0]}/>
      </BarChart>
    </ResponsiveContainer>
  );
}