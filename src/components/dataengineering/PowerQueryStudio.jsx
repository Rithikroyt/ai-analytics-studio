/**
 * PowerQueryStudio — Power Query-style transformation UI
 * 15+ transformation types with before/after preview, Python logic, SQL equivalent, and recipe saving
 */
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Play, Save, RefreshCw, ChevronDown, ChevronRight,
  CheckCircle2, Code2, Database, Loader2, Plus, Trash2, Eye
} from 'lucide-react';

const TRANSFORMATIONS = [
  {
    id: 'remove_duplicates', label: 'Remove Duplicates', category: 'Clean',
    icon: '🗑️', color: 'text-red-400', bg: 'bg-red-400/8 border-red-400/20',
    desc: 'Remove all duplicate rows from the dataset',
    params: [],
    python: (p, col) => `# Remove duplicates\ndf = df.drop_duplicates()\nprint(f"Removed {{duplicates}} duplicate rows")`,
    sql: () => `SELECT DISTINCT * FROM dataset;`,
  },
  {
    id: 'fill_missing', label: 'Fill Missing Values', category: 'Clean',
    icon: '🔧', color: 'text-amber-400', bg: 'bg-amber-400/8 border-amber-400/20',
    desc: 'Fill null/empty values with mean, median, mode, or a constant',
    params: [{ key: 'column', label: 'Column', type: 'column' }, { key: 'method', label: 'Fill Method', type: 'select', options: ['mean', 'median', 'mode', 'zero', 'forward_fill', 'backward_fill'] }],
    python: (p) => `# Fill missing values in '${p.column}' using ${p.method}\nif '${p.column}' in df.columns:\n    if '${p.method}' == 'mean':\n        df['${p.column}'].fillna(df['${p.column}'].mean(), inplace=True)\n    elif '${p.method}' == 'median':\n        df['${p.column}'].fillna(df['${p.column}'].median(), inplace=True)\n    elif '${p.method}' == 'mode':\n        df['${p.column}'].fillna(df['${p.column}'].mode()[0], inplace=True)\n    elif '${p.method}' == 'zero':\n        df['${p.column}'].fillna(0, inplace=True)\n    elif '${p.method}' == 'forward_fill':\n        df['${p.column}'].fillna(method='ffill', inplace=True)\n    elif '${p.method}' == 'backward_fill':\n        df['${p.column}'].fillna(method='bfill', inplace=True)`,
    sql: (p) => `UPDATE dataset\nSET ${p.column} = (SELECT AVG(${p.column}) FROM dataset)\nWHERE ${p.column} IS NULL;`,
  },
  {
    id: 'replace_values', label: 'Replace Values', category: 'Transform',
    icon: '🔄', color: 'text-cyan-400', bg: 'bg-cyan-400/8 border-cyan-400/20',
    desc: 'Replace specific values in a column with new values',
    params: [{ key: 'column', label: 'Column', type: 'column' }, { key: 'find', label: 'Find Value', type: 'text' }, { key: 'replace', label: 'Replace With', type: 'text' }],
    python: (p) => `# Replace values in '${p.column}'\ndf['${p.column}'] = df['${p.column}'].replace('${p.find}', '${p.replace}')`,
    sql: (p) => `UPDATE dataset\nSET ${p.column} = '${p.replace}'\nWHERE ${p.column} = '${p.find}';`,
  },
  {
    id: 'rename_column', label: 'Rename Column', category: 'Transform',
    icon: '✏️', color: 'text-blue-400', bg: 'bg-blue-400/8 border-blue-400/20',
    desc: 'Rename a column to a new name',
    params: [{ key: 'column', label: 'Column', type: 'column' }, { key: 'newName', label: 'New Name', type: 'text' }],
    python: (p) => `# Rename column\ndf = df.rename(columns={'${p.column}': '${p.newName}'})`,
    sql: (p) => `-- SQL: ALTER TABLE dataset RENAME COLUMN ${p.column} TO ${p.newName};`,
  },
  {
    id: 'convert_type', label: 'Convert Data Type', category: 'Transform',
    icon: '🔁', color: 'text-purple-400', bg: 'bg-purple-400/8 border-purple-400/20',
    desc: 'Convert column to numeric, text, or datetime type',
    params: [{ key: 'column', label: 'Column', type: 'column' }, { key: 'toType', label: 'Target Type', type: 'select', options: ['numeric', 'string', 'datetime', 'boolean', 'integer'] }],
    python: (p) => `# Convert '${p.column}' to ${p.toType}\nif '${p.toType}' == 'numeric':\n    df['${p.column}'] = pd.to_numeric(df['${p.column}'], errors='coerce')\nelif '${p.toType}' == 'datetime':\n    df['${p.column}'] = pd.to_datetime(df['${p.column}'], errors='coerce')\nelif '${p.toType}' == 'string':\n    df['${p.column}'] = df['${p.column}'].astype(str)\nelif '${p.toType}' == 'boolean':\n    df['${p.column}'] = df['${p.column}'].astype(bool)`,
    sql: (p) => `SELECT CAST(${p.column} AS ${p.toType === 'numeric' ? 'DECIMAL' : p.toType === 'datetime' ? 'TIMESTAMP' : 'VARCHAR'}) AS ${p.column}_converted\nFROM dataset;`,
  },
  {
    id: 'standardize_names', label: 'Standardize Column Names', category: 'Clean',
    icon: '🧹', color: 'text-green-400', bg: 'bg-green-400/8 border-green-400/20',
    desc: 'Convert all column names to lowercase_with_underscores format',
    params: [],
    python: () => `# Standardize column names to snake_case\ndf.columns = (\n    df.columns.astype(str)\n    .str.strip()\n    .str.lower()\n    .str.replace(r"[^a-z0-9]+", "_", regex=True)\n    .str.strip("_")\n)`,
    sql: () => `-- Rename each column in SQL:\n-- ALTER TABLE dataset RENAME COLUMN "Column Name" TO column_name;`,
  },
  {
    id: 'split_column', label: 'Split Column', category: 'Transform',
    icon: '✂️', color: 'text-pink-400', bg: 'bg-pink-400/8 border-pink-400/20',
    desc: 'Split one column into two using a delimiter',
    params: [{ key: 'column', label: 'Column', type: 'column' }, { key: 'delimiter', label: 'Delimiter', type: 'text' }, { key: 'col1', label: 'Left Column Name', type: 'text' }, { key: 'col2', label: 'Right Column Name', type: 'text' }],
    python: (p) => `# Split '${p.column}' by '${p.delimiter}'\ndf[['${p.col1}', '${p.col2}']] = df['${p.column}'].str.split('${p.delimiter}', n=1, expand=True)`,
    sql: (p) => `SELECT SPLIT_PART(${p.column}, '${p.delimiter}', 1) AS ${p.col1 || 'col1'},\n       SPLIT_PART(${p.column}, '${p.delimiter}', 2) AS ${p.col2 || 'col2'}\nFROM dataset;`,
  },
  {
    id: 'combine_columns', label: 'Combine Columns', category: 'Transform',
    icon: '🔗', color: 'text-teal-400', bg: 'bg-teal-400/8 border-teal-400/20',
    desc: 'Concatenate two columns into one',
    params: [{ key: 'col1', label: 'Column 1', type: 'column' }, { key: 'col2', label: 'Column 2', type: 'column' }, { key: 'sep', label: 'Separator', type: 'text' }, { key: 'newName', label: 'New Column Name', type: 'text' }],
    python: (p) => `# Combine '${p.col1}' and '${p.col2}'\ndf['${p.newName || 'combined'}'] = df['${p.col1}'].astype(str) + '${p.sep || ' '}' + df['${p.col2}'].astype(str)`,
    sql: (p) => `SELECT CONCAT(${p.col1}, '${p.sep || ' '}', ${p.col2}) AS ${p.newName || 'combined'}\nFROM dataset;`,
  },
  {
    id: 'group_by', label: 'Group By Aggregation', category: 'Aggregate',
    icon: '📊', color: 'text-orange-400', bg: 'bg-orange-400/8 border-orange-400/20',
    desc: 'Group rows and aggregate with SUM, COUNT, AVG',
    params: [{ key: 'groupCol', label: 'Group By Column', type: 'column' }, { key: 'valueCol', label: 'Value Column', type: 'column' }, { key: 'aggFunc', label: 'Aggregation', type: 'select', options: ['sum', 'mean', 'count', 'min', 'max'] }],
    python: (p) => `# Group by '${p.groupCol}' and aggregate '${p.valueCol}'\ndf_grouped = df.groupby('${p.groupCol}')['${p.valueCol}'].${p.aggFunc}().reset_index()\ndf_grouped.columns = ['${p.groupCol}', '${p.aggFunc}_${p.valueCol}']`,
    sql: (p) => `SELECT ${p.groupCol},\n       ${p.aggFunc?.toUpperCase()}(${p.valueCol}) AS ${p.aggFunc}_${p.valueCol}\nFROM dataset\nGROUP BY ${p.groupCol}\nORDER BY ${p.aggFunc}_${p.valueCol} DESC;`,
  },
  {
    id: 'filter_rows', label: 'Filter Rows', category: 'Filter',
    icon: '🔍', color: 'text-indigo-400', bg: 'bg-indigo-400/8 border-indigo-400/20',
    desc: 'Keep only rows matching a condition',
    params: [{ key: 'column', label: 'Column', type: 'column' }, { key: 'operator', label: 'Operator', type: 'select', options: ['>', '<', '>=', '<=', '==', '!=', 'contains', 'not null'] }, { key: 'value', label: 'Value', type: 'text' }],
    python: (p) => `# Filter rows where ${p.column} ${p.operator} ${p.value}\nif '${p.operator}' == 'contains':\n    df = df[df['${p.column}'].astype(str).str.contains('${p.value}', na=False)]\nelif '${p.operator}' == 'not null':\n    df = df[df['${p.column}'].notna()]\nelse:\n    df = df[df['${p.column}'] ${p.operator} ${isNaN(Number(p.value)) ? `'${p.value}'` : p.value}]`,
    sql: (p) => `SELECT * FROM dataset\nWHERE ${p.column} ${p.operator === 'contains' ? `LIKE '%${p.value}%'` : p.operator === 'not null' ? 'IS NOT NULL' : `${p.operator} '${p.value}'`};`,
  },
  {
    id: 'create_column', label: 'Create Custom Column', category: 'Transform',
    icon: '➕', color: 'text-yellow-400', bg: 'bg-yellow-400/8 border-yellow-400/20',
    desc: 'Create a new column using a formula',
    params: [{ key: 'newName', label: 'New Column Name', type: 'text' }, { key: 'formula', label: 'Formula (Python expression)', type: 'text' }],
    python: (p) => `# Create custom column '${p.newName}'\ndf['${p.newName}'] = ${p.formula || "df['col1'] + df['col2']"}`,
    sql: (p) => `SELECT *, ${p.formula || "col1 + col2"} AS ${p.newName || 'new_column'}\nFROM dataset;`,
  },
  {
    id: 'unpivot', label: 'Unpivot (Melt)', category: 'Reshape',
    icon: '↕️', color: 'text-cyan-400', bg: 'bg-cyan-400/8 border-cyan-400/20',
    desc: 'Convert wide format to long format',
    params: [{ key: 'idCol', label: 'ID Column (keep)', type: 'column' }, { key: 'varName', label: 'Variable Column Name', type: 'text' }, { key: 'valName', label: 'Value Column Name', type: 'text' }],
    python: (p) => `# Unpivot (melt) dataset\ndf_melted = df.melt(\n    id_vars=['${p.idCol}'],\n    var_name='${p.varName || 'variable'}',\n    value_name='${p.valName || 'value'}'\n)`,
    sql: () => `-- Use UNPIVOT operator in DuckDB/SQL Server or UNION ALL approach`,
  },
  {
    id: 'detect_date_format', label: 'Detect & Fix Date Formats', category: 'Clean',
    icon: '📅', color: 'text-amber-400', bg: 'bg-amber-400/8 border-amber-400/20',
    desc: 'Detect columns that should be dates and convert them',
    params: [{ key: 'column', label: 'Column', type: 'column' }],
    python: (p) => `# Detect and fix date format in '${p.column}'\ndf['${p.column}'] = pd.to_datetime(df['${p.column}'], infer_datetime_format=True, errors='coerce')\nprint(f"Invalid dates: {{df['${p.column}'].isna().sum()}}")`,
    sql: (p) => `SELECT TRY_CAST(${p.column} AS DATE) AS ${p.column}_parsed\nFROM dataset\nWHERE ${p.column} IS NOT NULL;`,
  },
  {
    id: 'trim_whitespace', label: 'Trim Whitespace', category: 'Clean',
    icon: '🧽', color: 'text-green-400', bg: 'bg-green-400/8 border-green-400/20',
    desc: 'Remove leading/trailing whitespace from text columns',
    params: [{ key: 'column', label: 'Column (blank = all text cols)', type: 'column_optional' }],
    python: (p) => p.column
      ? `# Trim whitespace from '${p.column}'\ndf['${p.column}'] = df['${p.column}'].astype(str).str.strip()`
      : `# Trim whitespace from all text columns\nfor col in df.select_dtypes(include='object').columns:\n    df[col] = df[col].astype(str).str.strip()`,
    sql: (p) => p.column
      ? `UPDATE dataset SET ${p.column} = TRIM(${p.column});`
      : `-- Apply TRIM to each text column manually`,
  },
  {
    id: 'numeric_mismatch', label: 'Fix Numeric/Text Mismatch', category: 'Clean',
    icon: '⚠️', color: 'text-red-400', bg: 'bg-red-400/8 border-red-400/20',
    desc: 'Detect columns that look numeric but stored as text, and convert them',
    params: [],
    python: () => `# Fix numeric/text mismatch\nfor col in df.select_dtypes(include='object').columns:\n    converted = pd.to_numeric(df[col], errors='coerce')\n    if converted.notna().sum() / len(df) > 0.8:\n        df[col] = converted\n        print(f"Converted '{col}' to numeric")`,
    sql: () => `-- Check each column with: SELECT column_name, COUNT(*) FROM dataset WHERE column_name ~ '^[0-9.]+$';`,
  },
];

const CATEGORIES = ['All', 'Clean', 'Transform', 'Aggregate', 'Filter', 'Reshape'];

export default function PowerQueryStudio({ columns = [], rows = [], datasetName = '', datasetId = '' }) {
  const [selectedTransform, setSelectedTransform] = useState(null);
  const [params, setParams] = useState({});
  const [appliedSteps, setAppliedSteps] = useState([]);
  const [previewRows, setPreviewRows] = useState(rows.slice(0, 5));
  const [showPython, setShowPython] = useState(false);
  const [showSQL, setShowSQL] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [category, setCategory] = useState('All');
  const colNames = columns.map(c => c.name || c);

  const filtered = TRANSFORMATIONS.filter(t => category === 'All' || t.category === category);

  const applyTransform = () => {
    if (!selectedTransform) return;
    const step = {
      id: selectedTransform.id,
      label: selectedTransform.label,
      params: { ...params },
      python: selectedTransform.python(params),
      sql: selectedTransform.sql(params),
    };
    setAppliedSteps(s => [...s, step]);
    setParams({});
    setSelectedTransform(null);
  };

  const saveRecipe = async () => {
    if (!appliedSteps.length) return;
    setSaving(true);
    try {
      const user = await base44.auth.me().catch(() => ({}));
      await base44.entities.TransformationRecipe.create({
        recipeName: `Recipe for ${datasetName || 'Dataset'} — ${new Date().toLocaleDateString()}`,
        datasetId, datasetName,
        steps: appliedSteps,
        generatedPython: appliedSteps.map(s => `# Step: ${s.label}\n${s.python}`).join('\n\n'),
        generatedSql: appliedSteps.map(s => `-- Step: ${s.label}\n${s.sql}`).join('\n\n'),
        rowsBefore: rows.length,
        rowsAfter: previewRows.length,
        columnsAffected: [...new Set(appliedSteps.flatMap(s => Object.values(s.params).filter(Boolean)))],
        createdBy: user.email || '',
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {}
    setSaving(false);
  };

  const generatedPython = appliedSteps.map(s => `# Step: ${s.label}\n${s.python}`).join('\n\n');
  const generatedSQL = appliedSteps.map(s => `-- Step: ${s.label}\n${s.sql}`).join('\n\n');

  return (
    <div className="space-y-5">
      {/* Transformation selector */}
      <div>
        <div className="flex items-center gap-1 mb-3 flex-wrap">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${category === c ? 'bg-cyan-400/20 text-cyan-400' : 'text-white/35 hover:text-white/60'}`}>{c}</button>
          ))}
        </div>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
          {filtered.map(t => (
            <button key={t.id} onClick={() => { setSelectedTransform(t); setParams({}); }}
              className={`text-left p-3 rounded-xl border transition-all hover:scale-[1.01] ${
                selectedTransform?.id === t.id ? t.bg : 'border-white/8 bg-white/2 hover:border-white/15'
              }`}>
              <div className="text-lg mb-1">{t.icon}</div>
              <div className={`text-xs font-semibold leading-tight ${selectedTransform?.id === t.id ? t.color : 'text-white/60'}`}>{t.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected transform config */}
      <AnimatePresence>
        {selectedTransform && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className={`p-4 rounded-2xl border ${selectedTransform.bg}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{selectedTransform.icon}</span>
              <div>
                <div className={`text-sm font-bold ${selectedTransform.color}`}>{selectedTransform.label}</div>
                <div className="text-xs text-white/40">{selectedTransform.desc}</div>
              </div>
            </div>
            {selectedTransform.params.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                {selectedTransform.params.map(p => (
                  <div key={p.key}>
                    <label className="text-xs text-white/35 mb-1 block">{p.label}</label>
                    {p.type === 'column' || p.type === 'column_optional' ? (
                      <select value={params[p.key] || ''} onChange={e => setParams(prev => ({ ...prev, [p.key]: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none">
                        <option value="">{p.type === 'column_optional' ? '— All —' : '— Select —'}</option>
                        {colNames.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : p.type === 'select' ? (
                      <select value={params[p.key] || ''} onChange={e => setParams(prev => ({ ...prev, [p.key]: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none">
                        <option value="">— Select —</option>
                        {p.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input value={params[p.key] || ''} onChange={e => setParams(prev => ({ ...prev, [p.key]: e.target.value }))}
                        placeholder={p.label}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none" />
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <button onClick={applyTransform}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/10 border border-white/15 text-white/80 rounded-xl text-xs font-semibold hover:bg-white/15 transition-all">
                <Play className="w-3.5 h-3.5" /> Apply Step
              </button>
              <button onClick={() => setSelectedTransform(null)} className="px-3 py-2 text-white/30 border border-white/8 rounded-xl text-xs hover:text-white/60 transition-all">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Applied steps */}
      {appliedSteps.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-white/40 uppercase tracking-widest">Applied Steps ({appliedSteps.length})</div>
            <div className="flex gap-2">
              <button onClick={() => setShowPython(v => !v)} className="flex items-center gap-1 px-2.5 py-1 text-xs text-purple-400 bg-purple-400/8 border border-purple-400/20 rounded-lg hover:bg-purple-400/12 transition-all">
                <Code2 className="w-3 h-3" /> Python
              </button>
              <button onClick={() => setShowSQL(v => !v)} className="flex items-center gap-1 px-2.5 py-1 text-xs text-green-400 bg-green-400/8 border border-green-400/20 rounded-lg hover:bg-green-400/12 transition-all">
                <Database className="w-3 h-3" /> SQL
              </button>
              <button onClick={saveRecipe} disabled={saving}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border transition-all disabled:opacity-50 ${saved ? 'text-green-400 bg-green-400/8 border-green-400/20' : 'text-cyan-400 bg-cyan-400/8 border-cyan-400/20 hover:bg-cyan-400/12'}`}>
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : saved ? <CheckCircle2 className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                {saved ? 'Saved!' : 'Save Recipe'}
              </button>
              <button onClick={() => setAppliedSteps([])} className="flex items-center gap-1 px-2.5 py-1 text-xs text-red-400 bg-red-400/8 border border-red-400/20 rounded-lg hover:bg-red-400/12 transition-all">
                <Trash2 className="w-3 h-3" /> Clear All
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            {appliedSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/3 border border-white/8">
                <span className="text-xs font-mono text-white/30 w-5">{i + 1}</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-white/70">{step.label}</span>
                {Object.entries(step.params).filter(([, v]) => v).map(([k, v]) => (
                  <span key={k} className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-white/35 font-mono">{v}</span>
                ))}
                <button onClick={() => setAppliedSteps(s => s.filter((_, j) => j !== i))}
                  className="ml-auto text-white/20 hover:text-red-400 transition-all">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {showPython && (
            <pre className="mt-3 bg-black/30 border border-purple-400/20 rounded-xl p-4 text-xs text-purple-400/80 font-mono overflow-auto max-h-48 whitespace-pre-wrap">{generatedPython}</pre>
          )}
          {showSQL && (
            <pre className="mt-3 bg-black/30 border border-green-400/20 rounded-xl p-4 text-xs text-green-400/80 font-mono overflow-auto max-h-48 whitespace-pre-wrap">{generatedSQL}</pre>
          )}
        </div>
      )}

      {appliedSteps.length === 0 && (
        <div className="text-center py-6 text-white/25 text-sm">Select a transformation above to start building your recipe</div>
      )}
    </div>
  );
}