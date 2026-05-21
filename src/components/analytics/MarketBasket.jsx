/**
 * Market Basket Analysis Module
 */
import { useState } from 'react';
import { Play, Copy, CheckCircle2, ShoppingCart } from 'lucide-react';

function buildMarketBasket(rows, transactionCol, itemCol) {
  const baskets = {};
  let totalTransactions = 0;
  const itemCounts = {};

  for (const row of rows) {
    const tid = String(row[transactionCol] ?? '');
    const item = String(row[itemCol] ?? '').trim();
    if (!tid || !item) continue;
    if (!baskets[tid]) { baskets[tid] = new Set(); totalTransactions++; }
    baskets[tid].add(item);
    itemCounts[item] = (itemCounts[item] || 0) + 1;
  }

  totalTransactions = Object.keys(baskets).length;
  const pairCounts = {};

  for (const items of Object.values(baskets)) {
    const arr = [...items].sort();
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const key = `${arr[i]}|||${arr[j]}`;
        pairCounts[key] = (pairCounts[key] || 0) + 1;
      }
    }
  }

  const results = Object.entries(pairCounts).map(([key, count]) => {
    const [itemA, itemB] = key.split('|||');
    const support = Math.round((count / totalTransactions) * 100 * 100) / 100;
    const supportA = (itemCounts[itemA] || 0) / totalTransactions;
    const supportB = (itemCounts[itemB] || 0) / totalTransactions;
    const confidence = Math.round((count / (itemCounts[itemA] || 1)) * 100 * 100) / 100;
    const lift = supportB > 0 ? Math.round((confidence / 100 / supportB) * 100) / 100 : 0;
    return { itemA, itemB, count, support, confidence, lift };
  }).sort((a, b) => b.lift - a.lift).slice(0, 30);

  const uniqueItems = Object.keys(itemCounts).length;
  return { results, totalTransactions, uniqueItems };
}

const PYTHON_CODE = (tCol, iCol) => `from itertools import combinations
from collections import Counter
import pandas as pd

def market_basket(df, transaction_col='${tCol}', item_col='${iCol}'):
    baskets = df.groupby(transaction_col)[item_col].apply(lambda x: list(set(x)))
    total_transactions = len(baskets)
    item_counts = df[item_col].value_counts().to_dict()
    
    pair_counts = Counter()
    for items in baskets:
        for pair in combinations(sorted(items), 2):
            pair_counts[pair] += 1
    
    results = []
    for (a, b), count in pair_counts.most_common(30):
        support = count / total_transactions * 100
        confidence = count / item_counts.get(a, 1) * 100
        lift = confidence / (item_counts.get(b, 1) / total_transactions * 100)
        results.append({'item_A': a, 'item_B': b, 'support': support, 'confidence': confidence, 'lift': lift})
    
    return pd.DataFrame(results).sort_values('lift', ascending=False)

rules = market_basket(df)
print(rules.head(20))`;

export default function MarketBasket({ rows = [], columns = [] }) {
  const colNames = columns.map(c => c.name || c);
  const [transactionCol, setTransactionCol] = useState('');
  const [itemCol, setItemCol] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const run = () => {
    if (!transactionCol || !itemCol || !rows.length) return;
    setResult(buildMarketBasket(rows, transactionCol, itemCol));
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-orange-400/5 border border-orange-400/15 text-xs text-white/55 leading-relaxed">
        <strong className="text-orange-400">Market Basket Analysis</strong> — Discovers which products are frequently purchased together. Computes Support (how often the pair appears), Confidence (how likely B is bought with A), and Lift (strength of association beyond chance).
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: '🧾 Transaction / Order ID', val: transactionCol, set: setTransactionCol },
          { label: '📦 Product / Item Column', val: itemCol, set: setItemCol },
        ].map(f => (
          <div key={f.label}>
            <label className="text-xs text-white/35 mb-1 block">{f.label}</label>
            <select value={f.val} onChange={e => f.set(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none">
              <option value="">— Select —</option>
              {colNames.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        ))}
      </div>

      <button onClick={run} disabled={!transactionCol || !itemCol || !rows.length}
        className="flex items-center gap-2 px-5 py-2.5 bg-orange-400/15 border border-orange-400/25 text-orange-400 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-orange-400/20 transition-all">
        <ShoppingCart className="w-4 h-4" /> Run Market Basket Analysis
      </button>

      {result && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Transactions', value: result.totalTransactions.toLocaleString(), color: 'text-cyan-400' },
              { label: 'Unique Items', value: result.uniqueItems, color: 'text-purple-400' },
              { label: 'Association Rules', value: result.results.length, color: 'text-orange-400' },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-xl bg-white/3 border border-white/8 text-center">
                <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                <div className="text-xs text-white/35">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Top bundles */}
          {result.results.slice(0, 5).map((r, i) => (
            <div key={i} className="p-3 rounded-xl bg-orange-400/5 border border-orange-400/15 flex items-center gap-4">
              <span className="text-xs text-white/30 w-4">{i + 1}</span>
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs font-bold text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded">{r.itemA}</span>
                <span className="text-white/30 text-xs">+</span>
                <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">{r.itemB}</span>
              </div>
              <div className="flex gap-4 text-xs font-mono">
                <span className="text-white/40">supp: <span className="text-white/70">{r.support}%</span></span>
                <span className="text-white/40">conf: <span className="text-white/70">{r.confidence}%</span></span>
                <span className="text-white/40">lift: <span className={r.lift > 2 ? 'text-green-400' : r.lift > 1.2 ? 'text-amber-400' : 'text-white/70'}>{r.lift}×</span></span>
              </div>
            </div>
          ))}

          {/* Full table */}
          <div className="rounded-xl border border-white/8 overflow-auto max-h-60">
            <table className="w-full text-xs min-w-max">
              <thead><tr className="border-b border-white/8 bg-white/3">
                {['Rank', 'Item A', 'Item B', 'Count', 'Support %', 'Confidence %', 'Lift'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-white/35 font-mono whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {result.results.map((r, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/2">
                    <td className="px-3 py-2 text-white/30">{i + 1}</td>
                    <td className="px-3 py-2 text-orange-400 font-semibold">{r.itemA}</td>
                    <td className="px-3 py-2 text-amber-400 font-semibold">{r.itemB}</td>
                    <td className="px-3 py-2 font-mono text-white/55">{r.count}</td>
                    <td className="px-3 py-2 font-mono text-white/55">{r.support}%</td>
                    <td className="px-3 py-2 font-mono text-white/55">{r.confidence}%</td>
                    <td className={`px-3 py-2 font-mono font-bold ${r.lift > 2 ? 'text-green-400' : r.lift > 1.2 ? 'text-amber-400' : 'text-white/50'}`}>{r.lift}×</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 rounded-xl bg-orange-400/5 border border-orange-400/15 text-xs text-white/50">
            <strong className="text-orange-400">Bundle Recommendation:</strong> Products with Lift &gt; 2 are strong candidates for bundling, cross-sell email triggers, and "frequently bought together" UI placement.
          </div>

          <div className="rounded-xl border border-purple-400/20 bg-black/20">
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
              <span className="text-xs text-purple-400 font-semibold">Generated Python</span>
              <button onClick={() => { navigator.clipboard.writeText(PYTHON_CODE(transactionCol, itemCol)); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                className="flex items-center gap-1 text-xs text-white/30 hover:text-purple-400 transition-all">
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="p-4 text-xs text-purple-400/80 font-mono overflow-x-auto whitespace-pre-wrap">{PYTHON_CODE(transactionCol, itemCol)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}