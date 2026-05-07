import { useState } from 'react';
import { motion } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { base44 } from '@/api/base44Client';
import {
  Zap, Plus, ChevronLeft, Loader2, TrendingUp, Save,
  Copy, Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function WhatIfSimulator() {
  const { analysisResults, getActiveTable } = useWorkspaceStore();
  const table = getActiveTable();

  const [scenarios, setScenarios] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [simulating, setSimulating] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    parameters: [],
  });

  const handleAddParameter = () => {
    setForm(f => ({
      ...f,
      parameters: [...f.parameters, { name: '', currentVal: 0, newVal: 0, unit: '' }],
    }));
  };

  const handleSimulate = async () => {
    if (!form.name || !table) return;
    setSimulating('creating');

    const baselineMetrics = {
      revenue: analysisResults?.totalValue || 0,
      growth: analysisResults?.growthRate || 0,
    };

    try {
      const result = await base44.functions.invoke('runWhatIfSimulation', {
        baselineMetrics,
        parameters: form.parameters.map(p => ({
          name: p.name,
          label: p.name,
          currentVal: p.currentVal,
          newVal: p.newVal,
          unit: p.unit,
        })),
        formula: 'Revenue = Traffic * ConversionRate * AverageOrderValue',
      });

      await base44.entities.WhatIfScenario.create({
        name: form.name,
        description: form.description,
        tableId: table.id,
        tableName: table.name,
        baselineMetrics: result.data.baselineMetrics,
        parameters: result.data.parameters,
        projectedMetrics: result.data.projectedMetrics,
        incrementalImpact: result.data.incrementalImpact,
        liftPct: result.data.liftPct,
        confidence: result.data.confidence,
        formula: result.data.formula,
      });

      setScenarios(s => [...s, result.data]);
      setForm({ name: '', description: '', parameters: [] });
      setShowForm(false);
    } catch (e) {
      console.error('Simulation failed:', e);
    }
    setSimulating('');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/workspace" className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-blue-400/10 border border-blue-400/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold">What-If Simulator</h1>
              <p className="text-xs text-muted-foreground">Parametric scenario simulations</p>
            </div>
          </div>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-400/10 border border-blue-400/20 text-blue-400 rounded-xl text-xs font-semibold hover:bg-blue-400/15 transition-all">
            <Plus className="w-3.5 h-3.5" /> New Scenario
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Form */}
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-5 border border-blue-400/20 space-y-4">
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Scenario name (e.g., Conversion +10%)" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none text-foreground" />

            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Scenario description..." rows={2}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none text-foreground resize-none" />

            <div className="space-y-2">
              {form.parameters.map((p, i) => (
                <div key={i} className="flex gap-2 items-end">
                  <input type="text" value={p.name} placeholder="Parameter name"
                    onChange={e => {
                      const newParams = [...form.parameters];
                      newParams[i].name = e.target.value;
                      setForm(f => ({ ...f, parameters: newParams }));
                    }}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none text-foreground" />
                  <input type="number" value={p.currentVal} placeholder="Current"
                    onChange={e => {
                      const newParams = [...form.parameters];
                      newParams[i].currentVal = Number(e.target.value);
                      setForm(f => ({ ...f, parameters: newParams }));
                    }}
                    className="w-24 px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none text-foreground" />
                  <span className="text-white/30">→</span>
                  <input type="number" value={p.newVal} placeholder="New"
                    onChange={e => {
                      const newParams = [...form.parameters];
                      newParams[i].newVal = Number(e.target.value);
                      setForm(f => ({ ...f, parameters: newParams }));
                    }}
                    className="w-24 px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none text-foreground" />
                </div>
              ))}
            </div>

            <button onClick={handleAddParameter}
              className="text-xs text-blue-400 hover:text-blue-300">+ Add Parameter</button>

            <div className="flex gap-2 pt-2">
              <button onClick={handleSimulate} disabled={simulating}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-400 text-navy-900 font-bold rounded-xl text-sm hover:bg-blue-300 transition-all disabled:opacity-50">
                {simulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {simulating ? 'Simulating...' : 'Run Simulation'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-white/40 rounded-lg border border-white/8 hover:bg-white/5 text-sm">Cancel</button>
            </div>
          </motion.div>
        )}

        {/* Scenarios */}
        {scenarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-white/5 rounded-2xl">
            <Zap className="w-12 h-12 text-white/15 mb-4" />
            <h3 className="font-semibold mb-1">No scenarios yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs">Create a what-if scenario to explore potential outcomes.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scenarios.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-2xl p-5 border border-white/8">
                <div className="font-bold text-sm mb-2">{s.name}</div>
                <div className="text-xs text-white/50 mb-4">{s.description}</div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-white/5">
                    <div className="text-xs text-white/40">Current</div>
                    <div className="text-lg font-bold text-white/80">${s.baselineMetrics?.revenue?.toLocaleString() || 0}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5">
                    <div className="text-xs text-white/40">Projected</div>
                    <div className="text-lg font-bold text-cyan-400">${s.projectedMetrics?.projectedRevenue?.toLocaleString() || 0}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-green-400/5 border border-green-400/15">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-bold text-green-400">+{s.liftPct?.toFixed(1)}%</span>
                  <span className="text-xs text-white/40">impact</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}