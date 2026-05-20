import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Zap, CheckCircle2, Code2, Loader2, ChevronDown, ChevronRight } from 'lucide-react';

const PYTHON_CLEANING_CODE = `import pandas as pd
import numpy as np
from sklearn.impute import SimpleImputer

def standardize_columns(df):
    df = df.copy()
    df.columns = (
        df.columns.astype(str)
        .str.strip()
        .str.lower()
        .str.replace(r"[^a-z0-9]+", "_", regex=True)
        .str.strip("_")
    )
    return df

def clean_dataset(df):
    df = standardize_columns(df)

    for col in df.select_dtypes(include="object").columns:
        df[col] = (
            df[col].astype(str).str.strip()
            .replace({"": np.nan, "nan": np.nan, "None": np.nan})
        )

    duplicate_count = int(df.duplicated().sum())
    df = df.drop_duplicates()

    for col in df.columns:
        if any(token in col for token in ["date", "time", "month", "created", "updated"]):
            df[col] = pd.to_datetime(df[col], errors="coerce")

    numeric_candidates = []
    for col in df.columns:
        converted = pd.to_numeric(df[col], errors="coerce")
        if converted.notna().mean() >= 0.85:
            df[col] = converted
            numeric_candidates.append(col)

    num_cols = df.select_dtypes(include=np.number).columns
    if len(num_cols) > 0:
        df[num_cols] = SimpleImputer(strategy="median").fit_transform(df[num_cols])

    cat_cols = df.select_dtypes(include="object").columns
    for col in cat_cols:
        mode = df[col].mode(dropna=True)
        if not mode.empty:
            df[col] = df[col].fillna(mode.iloc[0])

    return df, {"duplicates_removed": duplicate_count}`;

export default function CleaningLogPanel({ summary, columns = [], dataSourceId }) {
  const [logs, setLogs] = useState([]);
  const [showCode, setShowCode] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!dataSourceId) return;
    setLoading(true);
    base44.entities.ProcessingLog.filter({ dataSourceId }, '-created_date', 20)
      .then(data => setLogs(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dataSourceId]);

  const steps = [
    { label: 'Column Standardization', detail: 'Lowercase, snake_case, strip special chars' },
    { label: 'Empty/Null String Cleanup', detail: 'Replace "", "nan", "None" with NULL' },
    { label: 'Duplicate Row Removal', detail: 'Exact row deduplication' },
    { label: 'Date Column Detection', detail: 'Auto-convert date-like columns to ISO format' },
    { label: 'Numeric Type Coercion', detail: 'Convert strings to numbers when ≥85% parseable' },
    { label: 'Numeric Imputation', detail: 'Fill missing numerics with column median' },
    { label: 'Categorical Imputation', detail: 'Fill missing categoricals with column mode' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Summary */}
      {summary ? (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Original Rows', value: summary.originalRows?.toLocaleString() || '—', color: 'text-white/60' },
            { label: 'Cleaned Rows', value: summary.cleanedRows?.toLocaleString() || '—', color: 'text-green-400' },
            { label: 'Duplicates Removed', value: summary.duplicatesRemoved?.toLocaleString() || '0', color: 'text-amber-400' },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-2xl border border-white/8 bg-white/2 text-center">
              <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-xs text-white/30 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 rounded-2xl border border-white/8 bg-white/2 text-sm text-white/30 text-center">
          Run with "Clean + Profile" or "Full Pipeline" mode to see cleaning report
        </div>
      )}

      {/* Cleaning steps */}
      <div className="rounded-2xl border border-white/8 bg-white/2 p-5 space-y-3">
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest">Cleaning Pipeline Steps</h3>
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-green-400/15 border border-green-400/25 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckCircle2 className="w-3 h-3 text-green-400" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white/70">{i + 1}. {step.label}</div>
              <div className="text-xs text-white/30">{step.detail}</div>
            </div>
          </div>
        ))}
      </div>

      {/* View Python logic */}
      <div className="rounded-2xl border border-white/8 overflow-hidden">
        <button onClick={() => setShowCode(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 bg-white/2 hover:bg-white/3 transition-all">
          <div className="flex items-center gap-2 text-sm font-semibold text-cyan-400">
            <Code2 className="w-4 h-4" /> View Cleaning Logic (Python / pandas / sklearn)
          </div>
          {showCode ? <ChevronDown className="w-4 h-4 text-white/30" /> : <ChevronRight className="w-4 h-4 text-white/30" />}
        </button>
        {showCode && (
          <pre className="px-5 py-4 text-xs font-mono text-cyan-400/70 bg-black/30 overflow-x-auto max-h-80 overflow-y-auto">
            {PYTHON_CLEANING_CODE}
          </pre>
        )}
      </div>

      {/* Processing logs */}
      {logs.length > 0 && (
        <div className="rounded-2xl border border-white/8 bg-white/2 p-5 space-y-2">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Processing Logs</h3>
          {logs.map(log => (
            <div key={log.id} className="flex items-start gap-3 text-xs">
              <span className={`px-1.5 py-0.5 rounded font-semibold flex-shrink-0 ${
                log.status === 'success' ? 'bg-green-400/15 text-green-400' :
                log.status === 'failed' ? 'bg-red-400/15 text-red-400' :
                'bg-amber-400/15 text-amber-400'}`}>{log.status}</span>
              <span className="text-white/50 font-mono">{log.stepName}</span>
              <span className="text-white/30">{log.message}</span>
              {log.durationMs > 0 && <span className="text-white/20 ml-auto">{log.durationMs}ms</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}