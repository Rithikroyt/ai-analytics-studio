import { useState } from 'react';
import { motion } from 'framer-motion';
import { Code2, Play, Save, Copy, Download, Sparkles, CheckCircle2, AlertTriangle, Loader2, BookOpen, Table2, BarChart2, ChevronDown, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const SQL_TEMPLATES = [
  {
    id: 'total_revenue',
    label: 'Total Revenue',
    category: 'Basic Aggregation',
    sql: `SELECT\n  SUM(revenue) AS total_revenue,\n  COUNT(DISTINCT order_id) AS total_orders,\n  AVG(revenue) AS average_order_value\nFROM sales;`,
    description: 'Calculate total revenue, order count, and AOV'
  },
  {
    id: 'monthly_growth',
    label: 'Monthly Revenue Growth',
    category: 'Window Functions',
    sql: `WITH monthly_revenue AS (\n  SELECT\n    DATE_TRUNC('month', order_date) AS month,\n    SUM(revenue) AS revenue\n  FROM sales\n  GROUP BY 1\n),\ngrowth AS (\n  SELECT\n    month,\n    revenue,\n    LAG(revenue) OVER (ORDER BY month) AS previous_revenue\n  FROM monthly_revenue\n)\nSELECT\n  month,\n  revenue,\n  previous_revenue,\n  ROUND(\n    (revenue - previous_revenue) * 100.0 / NULLIF(previous_revenue, 0),\n    2\n  ) AS growth_pct\nFROM growth\nORDER BY month;`,
    description: 'Month-over-month revenue growth with LAG window function'
  },
  {
    id: 'top_products',
    label: 'Top 10 Products',
    category: 'Ranking',
    sql: `SELECT\n  product_name,\n  SUM(quantity) AS units_sold,\n  SUM(revenue) AS total_revenue,\n  ROUND(SUM(revenue) * 100.0 / SUM(SUM(revenue)) OVER (), 2) AS revenue_share_pct\nFROM sales\nGROUP BY product_name\nORDER BY total_revenue DESC\nLIMIT 10;`,
    description: 'Top products by revenue with contribution percentage'
  },
  {
    id: 'clv',
    label: 'Customer Lifetime Value',
    category: 'Customer Analytics',
    sql: `SELECT\n  customer_id,\n  SUM(revenue) AS lifetime_value,\n  COUNT(DISTINCT order_id) AS order_count,\n  AVG(revenue) AS average_order_value,\n  MIN(order_date) AS first_order,\n  MAX(order_date) AS last_order\nFROM sales\nGROUP BY customer_id\nORDER BY lifetime_value DESC;`,
    description: 'Full customer lifetime value analysis'
  },
  {
    id: 'running_total',
    label: 'Running Total',
    category: 'Window Functions',
    sql: `SELECT\n  order_date,\n  revenue,\n  SUM(revenue) OVER (\n    ORDER BY order_date\n    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\n  ) AS running_revenue,\n  AVG(revenue) OVER (\n    ORDER BY order_date\n    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW\n  ) AS rolling_7day_avg\nFROM sales\nORDER BY order_date;`,
    description: 'Cumulative revenue with 7-day moving average'
  },
  {
    id: 'contribution_pct',
    label: 'Category Contribution',
    category: 'Analysis',
    sql: `SELECT\n  category,\n  SUM(revenue) AS category_revenue,\n  ROUND(\n    SUM(revenue) * 100.0 / SUM(SUM(revenue)) OVER (),\n    2\n  ) AS contribution_pct,\n  RANK() OVER (ORDER BY SUM(revenue) DESC) AS rank\nFROM sales\nGROUP BY category\nORDER BY contribution_pct DESC;`,
    description: 'Revenue contribution % by category (Pareto analysis)'
  },
  {
    id: 'duplicate_detection',
    label: 'Detect Duplicates',
    category: 'Data Quality',
    sql: `SELECT\n  order_id,\n  COUNT(*) AS duplicate_count\nFROM sales\nGROUP BY order_id\nHAVING COUNT(*) > 1\nORDER BY duplicate_count DESC;`,
    description: 'Find duplicate order IDs in dataset'
  },
  {
    id: 'cohort_retention',
    label: 'Cohort Retention',
    category: 'Advanced',
    sql: `WITH first_purchase AS (\n  SELECT\n    customer_id,\n    DATE_TRUNC('month', MIN(order_date)) AS cohort_month\n  FROM sales\n  GROUP BY customer_id\n),\nactivity AS (\n  SELECT\n    s.customer_id,\n    f.cohort_month,\n    DATE_TRUNC('month', s.order_date) AS activity_month,\n    DATEDIFF('month', f.cohort_month, DATE_TRUNC('month', s.order_date)) AS months_since_first\n  FROM sales s\n  JOIN first_purchase f ON s.customer_id = f.customer_id\n)\nSELECT\n  cohort_month,\n  months_since_first,\n  COUNT(DISTINCT customer_id) AS retained_customers\nFROM activity\nGROUP BY cohort_month, months_since_first\nORDER BY cohort_month, months_since_first;`,
    description: 'Cohort-based customer retention analysis'
  },
  {
    id: 'funnel',
    label: 'Funnel Conversion',
    category: 'Marketing',
    sql: `SELECT\n  funnel_stage,\n  COUNT(DISTINCT user_id) AS users,\n  ROUND(\n    COUNT(DISTINCT user_id) * 100.0 /\n    FIRST_VALUE(COUNT(DISTINCT user_id)) OVER (ORDER BY MIN(stage_order)),\n    2\n  ) AS conversion_from_start_pct,\n  ROUND(\n    COUNT(DISTINCT user_id) * 100.0 /\n    LAG(COUNT(DISTINCT user_id)) OVER (ORDER BY MIN(stage_order)),\n    2\n  ) AS step_conversion_pct\nFROM funnel_events\nGROUP BY funnel_stage, stage_order\nORDER BY stage_order;`,
    description: 'Funnel drop-off and conversion rates at each stage'
  },
  {
    id: 'churn',
    label: 'Churned Customers',
    category: 'Customer Analytics',
    sql: `SELECT\n  customer_id,\n  MAX(order_date) AS last_order_date,\n  DATEDIFF('day', MAX(order_date), CURRENT_DATE) AS days_since_last_order,\n  COUNT(DISTINCT order_id) AS total_orders,\n  SUM(revenue) AS total_revenue\nFROM sales\nGROUP BY customer_id\nHAVING DATEDIFF('day', MAX(order_date), CURRENT_DATE) > 90\nORDER BY days_since_last_order DESC;`,
    description: 'Customers inactive for 90+ days (churn risk)'
  }
];

const PYTHON_SNIPPETS = [
  { label: 'Load & Preview', code: `import pandas as pd\nimport numpy as np\n\ndf = pd.read_csv("data.csv")\nprint(df.shape)\ndf.head()` },
  { label: 'Data Profile', code: `print("Shape:", df.shape)\nprint("\\nDtypes:\\n", df.dtypes)\nprint("\\nMissing:\\n", df.isnull().sum())\nprint("\\nDuplicates:", df.duplicated().sum())\ndf.describe()` },
  { label: 'Clean Data', code: `# Remove duplicates\ndf = df.drop_duplicates()\n\n# Trim whitespace\nstr_cols = df.select_dtypes("object").columns\ndf[str_cols] = df[str_cols].apply(lambda x: x.str.strip())\n\n# Standardize column names\ndf.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")\n\nprint("After cleaning:", df.shape)` },
  { label: 'Feature Engineering', code: `# Convert date\ndf["order_date"] = pd.to_datetime(df["order_date"], errors="coerce")\ndf["year"] = df["order_date"].dt.year\ndf["month"] = df["order_date"].dt.month\ndf["quarter"] = df["order_date"].dt.quarter\n\n# Calculated fields\ndf["profit"] = df["revenue"] - df["cost"]\ndf["gross_margin_pct"] = np.where(\n    df["revenue"] != 0,\n    df["profit"] / df["revenue"] * 100,\n    np.nan\n)\ndf["rolling_revenue"] = df["revenue"].rolling(window=7).mean()\ndf["cumulative_revenue"] = df["revenue"].cumsum()` },
  { label: 'Group & Aggregate', code: `summary = (\n    df.groupby("category")\n      .agg(\n          total_revenue=("revenue", "sum"),\n          avg_revenue=("revenue", "mean"),\n          order_count=("order_id", "count"),\n          unique_customers=("customer_id", "nunique")\n      )\n      .reset_index()\n      .sort_values("total_revenue", ascending=False)\n)\nprint(summary)` },
  { label: 'Correlation Matrix', code: `import matplotlib.pyplot as plt\nimport seaborn as sns\n\nnumeric_cols = df.select_dtypes("number").columns\ncorr_matrix = df[numeric_cols].corr()\n\nplt.figure(figsize=(10, 8))\nsns.heatmap(corr_matrix, annot=True, cmap="coolwarm", fmt=".2f")\nplt.title("Correlation Matrix")\nplt.show()` },
  { label: 'Linear Regression', code: `from sklearn.linear_model import LinearRegression\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.metrics import r2_score, mean_absolute_error\n\nfeatures = ["quantity", "discount_pct"]\ntarget = "revenue"\n\nX = df[features].fillna(0)\ny = df[target].fillna(0)\n\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)\n\nmodel = LinearRegression()\nmodel.fit(X_train, y_train)\ny_pred = model.predict(X_test)\n\nprint(f"R²: {r2_score(y_test, y_pred):.3f}")\nprint(f"MAE: {mean_absolute_error(y_test, y_pred):.2f}")` },
  { label: 'Forecast (Holt-Winters)', code: `from statsmodels.tsa.holtwinters import ExponentialSmoothing\nimport pandas as pd\n\n# Aggregate monthly\nmonthly = df.groupby(df["order_date"].dt.to_period("M"))["revenue"].sum()\n\n# Fit Holt-Winters\nmodel = ExponentialSmoothing(\n    monthly.values,\n    trend="add",\n    seasonal="add",\n    seasonal_periods=12\n).fit()\n\nforecast = model.forecast(3)\nprint("Next 3 months forecast:", forecast)` }
];

const UNSAFE_PATTERNS = [/\bDELETE\b/i, /\bDROP\b/i, /\bUPDATE\b/i, /\bINSERT\b/i, /\bALTER\b/i, /\bTRUNCATE\b/i];

function validateSQL(sql) {
  const issues = [];
  UNSAFE_PATTERNS.forEach(p => {
    if (p.test(sql)) issues.push({ type: 'error', msg: `Blocked: ${p.source.replace(/\\b/g, '')} statement not allowed` });
  });
  if (/SELECT\s+\*/i.test(sql)) issues.push({ type: 'warning', msg: 'Avoid SELECT * — specify columns explicitly' });
  if (!/LIMIT\s+\d+/i.test(sql) && !/SUM|COUNT|AVG|MIN|MAX/i.test(sql)) issues.push({ type: 'warning', msg: 'Consider adding LIMIT to prevent large result sets' });
  if (issues.length === 0) issues.push({ type: 'success', msg: 'SQL is valid and safe to execute' });
  return issues;
}

export default function SQLPythonLab() {
  const [activeTab, setActiveTab] = useState('sql');
  const [sqlQuery, setSqlQuery] = useState(SQL_TEMPLATES[0].sql);
  const [sqlValidation, setSqlValidation] = useState([]);
  const [nlQuery, setNlQuery] = useState('');
  const [generatedSQL, setGeneratedSQL] = useState('');
  const [loadingNL, setLoadingNL] = useState(false);
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [activeSnippet, setActiveSnippet] = useState(PYTHON_SNIPPETS[0]);
  const [selectedTemplate, setSelectedTemplate] = useState(SQL_TEMPLATES[0]);
  const [expandedCategory, setExpandedCategory] = useState('Basic Aggregation');
  const [copied, setCopied] = useState(false);

  const handleValidate = () => setSqlValidation(validateSQL(sqlQuery));

  const handleNLtoSQL = async () => {
    if (!nlQuery.trim()) return;
    setLoadingNL(true);
    try {
      const res = await base44.functions.invoke('generateSQL', {
        naturalLanguageQuery: nlQuery,
        tableName: 'sales',
        columns: ['order_id', 'order_date', 'customer_id', 'product_name', 'category', 'region', 'revenue', 'cost', 'quantity', 'status'],
        domain: 'sales'
      });
      setGeneratedSQL(res.data?.sql || '-- Could not generate SQL');
      setSqlQuery(res.data?.sql || sqlQuery);
    } catch (e) {
      setGeneratedSQL(`-- Error: ${e.message}`);
    }
    setLoadingNL(false);
  };

  const handleExplain = async () => {
    if (!sqlQuery.trim()) return;
    setLoadingExplain(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Explain this SQL query in plain business English. Be concise and explain what business question it answers:\n\n${sqlQuery}`,
        response_json_schema: { type: 'object', properties: { explanation: { type: 'string' }, businessQuestion: { type: 'string' }, outputDescription: { type: 'string' } } }
      });
      setExplanation(`${res.businessQuestion || ''}\n\n${res.explanation || ''}\n\nOutput: ${res.outputDescription || ''}`);
    } catch (e) {
      setExplanation(`Error: ${e.message}`);
    }
    setLoadingExplain(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const categories = [...new Set(SQL_TEMPLATES.map(t => t.category))];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-white/6 px-6 py-4 bg-navy-800/50 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-400/10 border border-green-400/20 flex items-center justify-center">
            <Code2 className="w-4.5 h-4.5 text-green-400" />
          </div>
          <div>
            <h1 className="text-base font-bold">Excel + SQL + Python Lab</h1>
            <p className="text-xs text-white/40">SQL Workbench · Python Notebook · Query Library</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-3 flex gap-1">
          {[
            { id: 'sql', label: 'SQL Workbench' },
            { id: 'nl_sql', label: 'NL → SQL' },
            { id: 'advanced', label: 'Advanced SQL' },
            { id: 'python', label: 'Python Notebook' },
            { id: 'library', label: 'Query Library' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === tab.id ? 'bg-green-400/15 text-green-400 border border-green-400/25' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* SQL WORKBENCH */}
        {activeTab === 'sql' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Template sidebar */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-white/50 mb-2">SQL TEMPLATES</div>
              {categories.map(cat => (
                <div key={cat}>
                  <button onClick={() => setExpandedCategory(expandedCategory === cat ? null : cat)}
                    className="flex items-center justify-between w-full px-2 py-1.5 rounded-lg text-xs font-semibold text-white/50 hover:text-white/70">
                    {cat} {expandedCategory === cat ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                  {expandedCategory === cat && SQL_TEMPLATES.filter(t => t.category === cat).map(t => (
                    <button key={t.id} onClick={() => { setSqlQuery(t.sql); setSelectedTemplate(t); setSqlValidation([]); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ml-2 ${selectedTemplate?.id === t.id ? 'bg-green-400/10 text-green-400 border border-green-400/20' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* Editor */}
            <div className="lg:col-span-2 space-y-3">
              {selectedTemplate && (
                <div className="text-xs text-white/40 border-b border-white/5 pb-2">{selectedTemplate.description}</div>
              )}
              <div className="relative">
                <textarea value={sqlQuery} onChange={e => { setSqlQuery(e.target.value); setSqlValidation([]); }}
                  className="w-full h-56 px-4 py-3 bg-navy-900/60 border border-white/10 rounded-xl font-mono text-xs text-green-400/90 leading-relaxed focus:outline-none focus:border-green-400/30 resize-none"
                  spellCheck={false} />
                <button onClick={() => copyToClipboard(sqlQuery)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/5 text-white/30 hover:text-white/70 transition-all">
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button onClick={handleValidate} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-400/10 border border-green-400/25 text-green-400 rounded-lg text-xs font-semibold hover:bg-green-400/15">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Validate SQL
                </button>
                <button onClick={handleExplain} disabled={loadingExplain} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-400/10 border border-purple-400/25 text-purple-400 rounded-lg text-xs font-semibold hover:bg-purple-400/15 disabled:opacity-50">
                  {loadingExplain ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Explain SQL
                </button>
                <button onClick={() => copyToClipboard(sqlQuery)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-white/50 rounded-lg text-xs font-semibold hover:text-white/80">
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
              </div>

              {sqlValidation.length > 0 && (
                <div className="space-y-1.5">
                  {sqlValidation.map((issue, i) => (
                    <div key={i} className={`flex items-center gap-2 p-2.5 rounded-lg text-xs ${issue.type === 'error' ? 'bg-red-400/10 border border-red-400/20 text-red-400' : issue.type === 'warning' ? 'bg-yellow-400/10 border border-yellow-400/20 text-yellow-400' : 'bg-green-400/10 border border-green-400/20 text-green-400'}`}>
                      {issue.type === 'error' ? <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> : issue.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />}
                      {issue.msg}
                    </div>
                  ))}
                </div>
              )}

              {explanation && (
                <div className="glass-card rounded-xl border border-purple-400/20 p-4">
                  <div className="text-xs font-bold text-purple-400 mb-2">AI Explanation</div>
                  <p className="text-xs text-white/60 leading-relaxed whitespace-pre-line">{explanation}</p>
                </div>
              )}

              {/* Security notice */}
              <div className="flex items-start gap-2 p-3 rounded-xl bg-white/3 border border-white/6">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-white/35">Security: DELETE, DROP, UPDATE, INSERT, ALTER, and TRUNCATE are blocked. Only SELECT queries are permitted.</p>
              </div>
            </div>
          </div>
        )}

        {/* NL → SQL */}
        {activeTab === 'nl_sql' && (
          <div className="max-w-2xl space-y-5">
            <div className="glass-card rounded-2xl border border-green-400/20 p-6 space-y-4">
              <div className="text-sm font-bold">Natural Language → SQL</div>
              <textarea value={nlQuery} onChange={e => setNlQuery(e.target.value)} rows={3}
                placeholder="Ask in plain English: 'Show me monthly revenue by category for the last 6 months' or 'Which customers have spent more than $10,000?'"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none resize-none" />
              <button onClick={handleNLtoSQL} disabled={loadingNL || !nlQuery.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-400 text-navy-900 rounded-xl text-sm font-bold hover:bg-green-300 disabled:opacity-50">
                {loadingNL ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate SQL
              </button>
            </div>

            {generatedSQL && (
              <div className="glass-card rounded-xl border border-green-400/20 p-4">
                <div className="text-xs font-bold text-green-400 mb-2 flex items-center justify-between">
                  GENERATED SQL
                  <button onClick={() => { setSqlQuery(generatedSQL); setActiveTab('sql'); }} className="text-white/40 hover:text-white text-xs">Use in Editor →</button>
                </div>
                <pre className="font-mono text-xs text-green-400/80 whitespace-pre-wrap leading-relaxed">{generatedSQL}</pre>
              </div>
            )}

            <div className="glass-card rounded-xl border border-white/8 p-4">
              <div className="text-xs font-bold text-white/40 mb-2">EXAMPLE PROMPTS</div>
              <div className="space-y-1.5">
                {[
                  'What is the total revenue by month?',
                  'Show top 10 customers by lifetime value',
                  'Which products have declining sales in the last 3 months?',
                  'Calculate month-over-month growth rate',
                  'Find all customers who churned in the last 90 days',
                  'Show average order value by region',
                  'What is the revenue contribution by category?'
                ].map(q => (
                  <button key={q} onClick={() => setNlQuery(q)} className="block text-left w-full px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/80 hover:bg-white/5 transition-all">
                    → {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ADVANCED SQL */}
        {activeTab === 'advanced' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SQL_TEMPLATES.filter(t => ['Window Functions', 'Advanced', 'Marketing'].includes(t.category)).map(t => (
              <div key={t.id} className="glass-card rounded-xl border border-white/8 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-semibold text-sm">{t.label}</div>
                    <div className="text-xs text-white/35 mt-0.5">{t.description}</div>
                  </div>
                  <button onClick={() => { setSqlQuery(t.sql); setSelectedTemplate(t); setActiveTab('sql'); }}
                    className="px-2.5 py-1 bg-green-400/10 border border-green-400/20 text-green-400 rounded-lg text-xs font-semibold hover:bg-green-400/15 whitespace-nowrap">
                    Use →
                  </button>
                </div>
                <pre className="font-mono text-xs text-green-400/60 whitespace-pre-wrap leading-relaxed max-h-32 overflow-hidden">{t.sql.split('\n').slice(0, 8).join('\n')}…</pre>
              </div>
            ))}
          </div>
        )}

        {/* PYTHON NOTEBOOK */}
        {activeTab === 'python' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-white/50 mb-2">NOTEBOOKS</div>
              {PYTHON_SNIPPETS.map((s, i) => (
                <button key={i} onClick={() => setActiveSnippet(s)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${activeSnippet.label === s.label ? 'bg-purple-400/10 text-purple-400 border border-purple-400/20' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}>
                  {s.label}
                </button>
              ))}
            </div>
            <div className="lg:col-span-2 space-y-3">
              <div className="relative">
                <pre className="w-full px-4 py-4 bg-navy-900/80 border border-white/10 rounded-xl font-mono text-xs text-purple-400/90 leading-relaxed whitespace-pre-wrap overflow-auto max-h-96">
                  {activeSnippet.code}
                </pre>
                <button onClick={() => copyToClipboard(activeSnippet.code)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/5 text-white/30 hover:text-white/70 transition-all">
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => copyToClipboard(activeSnippet.code)} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-400/10 border border-purple-400/25 text-purple-400 rounded-lg text-xs font-semibold">
                  <Copy className="w-3.5 h-3.5" /> Copy Code
                </button>
                <button onClick={() => copyToClipboard(`python\n${activeSnippet.code}`)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-white/50 rounded-lg text-xs font-semibold">
                  <Download className="w-3.5 h-3.5" /> Download .py
                </button>
              </div>
            </div>
          </div>
        )}

        {/* QUERY LIBRARY */}
        {activeTab === 'library' && (
          <div className="space-y-3">
            <div className="text-sm font-bold">Complete SQL Query Library</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SQL_TEMPLATES.map(t => (
                <div key={t.id} className="glass-card rounded-xl border border-white/8 p-4 hover:border-white/15 transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-semibold text-sm">{t.label}</div>
                      <div className="text-xs text-white/35 mt-0.5">{t.category} · {t.description}</div>
                    </div>
                    <button onClick={() => { setSqlQuery(t.sql); setSelectedTemplate(t); setActiveTab('sql'); }}
                      className="px-2.5 py-1 bg-green-400/10 border border-green-400/20 text-green-400 rounded-lg text-xs font-semibold hover:bg-green-400/15 whitespace-nowrap ml-2">
                      Open →
                    </button>
                  </div>
                  <div className="text-xs text-white/25 font-mono truncate">{t.sql.split('\n')[0]}…</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}