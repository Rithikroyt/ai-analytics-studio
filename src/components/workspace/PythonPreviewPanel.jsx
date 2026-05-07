/**
 * PythonPreviewPanel — Shows equivalent pandas/sklearn Python code for cleaning ops
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code2, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

function buildPythonCode(table, cleanProfile) {
  const cols = table?.columns || [];
  const numCols = cols.filter(c => c.type === 'numeric').map(c => c.name);
  const catCols = cols.filter(c => c.type === 'category').map(c => c.name);
  const dateCols = cols.filter(c => c.type === 'date').map(c => c.name);

  return `import pandas as pd
import numpy as np
from sklearn.impute import SimpleImputer

# Load dataset
df = pd.read_csv("${table?.name || 'dataset'}.csv")
print(f"Shape: {df.shape}")  # ${table?.rowCount?.toLocaleString() || 0} rows × ${cols.length} cols

# ── Step 1: Normalize column names ──────────────────────────────
df.columns = (
    df.columns.astype(str)
    .str.strip()
    .str.lower()
    .str.replace(r"[^a-z0-9]+", "_", regex=True)
    .str.strip("_")
)

# ── Step 2: Strip whitespace from text columns ──────────────────
for col in df.select_dtypes(include=["object"]).columns:
    df[col] = df[col].astype(str).str.strip()
    df[col] = df[col].replace({"": np.nan, "nan": np.nan, "None": np.nan})

# ── Step 3: Remove exact duplicates ────────────────────────────
duplicate_count = df.duplicated().sum()
df = df.drop_duplicates()
print(f"Duplicates removed: {duplicate_count}")${cleanProfile ? `  # Removed: ${cleanProfile.duplicatesRemoved}` : ''}

# ── Step 4: Parse date columns ──────────────────────────────────${dateCols.length ? `
date_cols = ${JSON.stringify(dateCols)}
for col in date_cols:
    df[col] = pd.to_datetime(df[col], errors="coerce", infer_datetime_format=True)` : '\n# No date columns detected'}

# ── Step 5: Impute numeric missing values ───────────────────────${numCols.length ? `
numeric_cols = ${JSON.stringify(numCols)}
imputer = SimpleImputer(strategy="median")  # median is robust to outliers
df[numeric_cols] = imputer.fit_transform(df[numeric_cols])` : '\n# No numeric columns detected'}

# ── Step 6: Impute categorical missing values ───────────────────${catCols.length ? `
cat_cols = ${JSON.stringify(catCols)}
for col in cat_cols:
    mode_val = df[col].mode(dropna=True)
    if not mode_val.empty:
        df[col] = df[col].fillna(mode_val.iloc[0])` : '\n# No categorical columns detected'}

# ── Step 7: Remove extreme outliers (> 5σ) ─────────────────────
for col in ${numCols.length ? JSON.stringify(numCols) : '[]'}:
    mean, std = df[col].mean(), df[col].std()
    if std > 0:
        df = df[np.abs(df[col] - mean) <= 5 * std]

# ── Step 8: Type casting ────────────────────────────────────────
for col in df.columns:
    if df[col].dtype == object:
        try:
            df[col] = pd.to_numeric(df[col])
        except (ValueError, TypeError):
            pass

# ── Final quality report ────────────────────────────────────────
print(f"\\nCleaned shape: {df.shape}")
print(f"Missing values after cleaning:\\n{df.isna().sum()}")
print(f"Quality improvement: see DataPrepStudio report")

df.to_csv("${table?.name || 'dataset'}_cleaned.csv", index=False)`;
}

export default function PythonPreviewPanel({ table, cleanProfile }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const code = buildPythonCode(table, cleanProfile);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-blue-400/20 bg-blue-400/3 overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-blue-400/5 transition-colors">
        <div className="flex items-center gap-2.5">
          <Code2 className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-blue-400">Python Equivalent</span>
          <span className="text-xs text-white/30 font-normal">— pandas + sklearn cleaning logic</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-blue-400/15">
            <div className="relative">
              <button onClick={handleCopy}
                className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 bg-white/8 border border-white/10 rounded-lg text-xs text-white/50 hover:text-white/80 transition-all">
                {copied ? <><Check className="w-3 h-3 text-green-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
              </button>
              <pre className="p-5 text-xs font-mono text-green-300/85 leading-relaxed overflow-auto max-h-96 whitespace-pre-wrap">
                {code}
              </pre>
            </div>
            <div className="px-5 py-3 border-t border-blue-400/10 text-xs text-white/25 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400/50 flex-shrink-0" />
              This is the Python equivalent of the cleaning pipeline applied above. Requires: pandas, numpy, scikit-learn.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}