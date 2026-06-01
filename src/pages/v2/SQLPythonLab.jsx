import { useState } from 'react';
import { motion } from 'framer-motion';
import { Code2, Play, Save, Copy, Download, Sparkles, CheckCircle2, AlertTriangle, Loader2, BookOpen, Table2, BarChart2, ChevronDown, ChevronRight, FileText, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const SQL_TEMPLATES = [
  { id: 'total_revenue', label: 'Total Revenue', category: 'Basic Aggregation', sql: `SELECT\n  SUM(revenue) AS total_revenue,\n  COUNT(DISTINCT order_id) AS total_orders,\n  AVG(revenue) AS average_order_value,\n  MIN(order_date) AS first_order,\n  MAX(order_date) AS last_order\nFROM sales;`, description: 'Total revenue, order count, AOV, and date range' },
  { id: 'revenue_by_region', label: 'Revenue by Region', category: 'Basic Aggregation', sql: `SELECT\n  region,\n  COUNT(DISTINCT order_id) AS order_count,\n  SUM(revenue) AS total_revenue,\n  AVG(revenue) AS avg_revenue,\n  ROUND(SUM(revenue) * 100.0 / SUM(SUM(revenue)) OVER (), 2) AS revenue_share_pct\nFROM sales\nGROUP BY region\nORDER BY total_revenue DESC;`, description: 'Revenue breakdown and share by region' },
  { id: 'monthly_growth', label: 'Monthly Revenue Growth', category: 'Window Functions', sql: `WITH monthly_revenue AS (\n  SELECT\n    DATE_TRUNC('month', order_date) AS month,\n    SUM(revenue) AS revenue\n  FROM sales\n  GROUP BY 1\n),\ngrowth AS (\n  SELECT\n    month,\n    revenue,\n    LAG(revenue) OVER (ORDER BY month) AS previous_revenue\n  FROM monthly_revenue\n)\nSELECT\n  month,\n  revenue,\n  previous_revenue,\n  ROUND((revenue - previous_revenue) * 100.0 / NULLIF(previous_revenue, 0), 2) AS growth_pct\nFROM growth\nORDER BY month;`, description: 'Month-over-month revenue growth with LAG window function' },
  { id: 'running_total', label: 'Running Total + Moving Avg', category: 'Window Functions', sql: `SELECT\n  order_date,\n  revenue,\n  SUM(revenue) OVER (\n    ORDER BY order_date\n    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\n  ) AS running_revenue,\n  AVG(revenue) OVER (\n    ORDER BY order_date\n    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW\n  ) AS rolling_7day_avg,\n  RANK() OVER (ORDER BY revenue DESC) AS revenue_rank\nFROM sales\nORDER BY order_date;`, description: 'Cumulative revenue + 7-day moving average + rank' },
  { id: 'contribution_pct', label: 'Category Contribution %', category: 'Analysis', sql: `SELECT\n  category,\n  SUM(revenue) AS category_revenue,\n  ROUND(SUM(revenue) * 100.0 / SUM(SUM(revenue)) OVER (), 2) AS contribution_pct,\n  RANK() OVER (ORDER BY SUM(revenue) DESC) AS rank,\n  SUM(SUM(revenue)) OVER (ORDER BY SUM(revenue) DESC ROWS UNBOUNDED PRECEDING) /\n  SUM(SUM(revenue)) OVER () * 100 AS cumulative_pct\nFROM sales\nGROUP BY category\nORDER BY contribution_pct DESC;`, description: 'Pareto analysis — revenue contribution % by category' },
  { id: 'top_products', label: 'Top 10 Products', category: 'Ranking', sql: `SELECT\n  product_name,\n  SUM(quantity) AS units_sold,\n  SUM(revenue) AS total_revenue,\n  AVG(revenue) AS avg_revenue,\n  ROUND(SUM(revenue) * 100.0 / SUM(SUM(revenue)) OVER (), 2) AS revenue_share_pct,\n  RANK() OVER (ORDER BY SUM(revenue) DESC) AS revenue_rank\nFROM sales\nGROUP BY product_name\nORDER BY total_revenue DESC\nLIMIT 10;`, description: 'Top products by revenue with contribution and rank' },
  { id: 'clv', label: 'Customer Lifetime Value', category: 'Customer Analytics', sql: `SELECT\n  customer_id,\n  SUM(revenue) AS lifetime_value,\n  COUNT(DISTINCT order_id) AS order_count,\n  AVG(revenue) AS average_order_value,\n  MIN(order_date) AS first_order,\n  MAX(order_date) AS last_order,\n  DATEDIFF('day', MIN(order_date), MAX(order_date)) AS customer_lifespan_days\nFROM sales\nGROUP BY customer_id\nORDER BY lifetime_value DESC\nLIMIT 50;`, description: 'Full CLV with order count, AOV, and customer lifespan' },
  { id: 'churn', label: 'Churn Risk Detection', category: 'Customer Analytics', sql: `SELECT\n  customer_id,\n  MAX(order_date) AS last_order_date,\n  DATEDIFF('day', MAX(order_date), CURRENT_DATE) AS days_since_last_order,\n  COUNT(DISTINCT order_id) AS total_orders,\n  SUM(revenue) AS total_revenue,\n  CASE\n    WHEN DATEDIFF('day', MAX(order_date), CURRENT_DATE) > 180 THEN 'High Risk'\n    WHEN DATEDIFF('day', MAX(order_date), CURRENT_DATE) > 90 THEN 'Medium Risk'\n    ELSE 'Active'\n  END AS churn_risk\nFROM sales\nGROUP BY customer_id\nHAVING DATEDIFF('day', MAX(order_date), CURRENT_DATE) > 60\nORDER BY days_since_last_order DESC;`, description: 'Customers at risk of churning (60+ days inactive)' },
  { id: 'duplicate_detection', label: 'Detect Duplicates', category: 'Data Quality', sql: `SELECT\n  order_id,\n  COUNT(*) AS duplicate_count\nFROM sales\nGROUP BY order_id\nHAVING COUNT(*) > 1\nORDER BY duplicate_count DESC;`, description: 'Find duplicate order IDs in dataset' },
  { id: 'missing_values', label: 'Missing Value Analysis', category: 'Data Quality', sql: `SELECT\n  'revenue' AS column_name,\n  COUNT(*) AS total_rows,\n  SUM(CASE WHEN revenue IS NULL THEN 1 ELSE 0 END) AS missing_count,\n  ROUND(SUM(CASE WHEN revenue IS NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS missing_pct\nFROM sales\nUNION ALL\nSELECT 'region', COUNT(*),\n  SUM(CASE WHEN region IS NULL THEN 1 ELSE 0 END),\n  ROUND(SUM(CASE WHEN region IS NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2)\nFROM sales\nORDER BY missing_pct DESC;`, description: 'Data quality: missing values by column' },
  { id: 'cohort_retention', label: 'Cohort Retention', category: 'Advanced', sql: `WITH first_purchase AS (\n  SELECT customer_id, DATE_TRUNC('month', MIN(order_date)) AS cohort_month\n  FROM sales GROUP BY customer_id\n),\nactivity AS (\n  SELECT s.customer_id, f.cohort_month,\n    DATE_TRUNC('month', s.order_date) AS activity_month,\n    DATEDIFF('month', f.cohort_month, DATE_TRUNC('month', s.order_date)) AS months_since_first\n  FROM sales s\n  JOIN first_purchase f ON s.customer_id = f.customer_id\n)\nSELECT cohort_month, months_since_first,\n  COUNT(DISTINCT customer_id) AS retained_customers\nFROM activity\nGROUP BY cohort_month, months_since_first\nORDER BY cohort_month, months_since_first;`, description: 'Cohort-based customer retention by month' },
  { id: 'funnel', label: 'Funnel Conversion', category: 'Marketing', sql: `SELECT\n  funnel_stage,\n  COUNT(DISTINCT user_id) AS users,\n  ROUND(COUNT(DISTINCT user_id) * 100.0 /\n    FIRST_VALUE(COUNT(DISTINCT user_id)) OVER (ORDER BY MIN(stage_order)), 2) AS conversion_from_start_pct,\n  ROUND(COUNT(DISTINCT user_id) * 100.0 /\n    LAG(COUNT(DISTINCT user_id)) OVER (ORDER BY MIN(stage_order)), 2) AS step_conversion_pct\nFROM funnel_events\nGROUP BY funnel_stage, stage_order\nORDER BY stage_order;`, description: 'Funnel drop-off and step-by-step conversion rates' },
  { id: 'budget_variance', label: 'Budget vs Actual Variance', category: 'Finance', sql: `SELECT\n  department,\n  SUM(budget) AS total_budget,\n  SUM(actual_cost) AS total_actual,\n  SUM(actual_cost) - SUM(budget) AS variance,\n  ROUND((SUM(actual_cost) - SUM(budget)) * 100.0 / NULLIF(SUM(budget), 0), 2) AS variance_pct,\n  CASE\n    WHEN SUM(actual_cost) > SUM(budget) * 1.1 THEN 'Over Budget'\n    WHEN SUM(actual_cost) < SUM(budget) * 0.9 THEN 'Under Budget'\n    ELSE 'On Track'\n  END AS status\nFROM finance\nGROUP BY department\nORDER BY ABS(variance) DESC;`, description: 'Budget vs actual variance by department with status flags' },
  { id: 'supplier_performance', label: 'Supplier Performance Score', category: 'Supply Chain', sql: `SELECT\n  supplier_name,\n  COUNT(*) AS total_orders,\n  ROUND(AVG(CASE WHEN on_time_delivery = 1 THEN 100.0 ELSE 0 END), 2) AS on_time_pct,\n  ROUND(AVG(CASE WHEN defect_rate IS NOT NULL THEN CAST(REPLACE(defect_rate, '%', '') AS FLOAT) END), 2) AS avg_defect_rate,\n  ROUND(AVG(lead_time_days), 1) AS avg_lead_time_days,\n  ROUND(SUM(transportation_cost), 2) AS total_transport_cost\nFROM supply_chain\nGROUP BY supplier_name\nORDER BY on_time_pct DESC;`, description: 'Supplier performance: OTD, defect rate, lead time' },
  { id: 'rfm_analysis', label: 'RFM Customer Segmentation', category: 'Advanced', sql: `WITH rfm_calc AS (\n  SELECT\n    customer_id,\n    DATEDIFF('day', MAX(order_date), CURRENT_DATE) AS recency,\n    COUNT(DISTINCT order_id) AS frequency,\n    SUM(revenue) AS monetary\n  FROM sales\n  GROUP BY customer_id\n),\nrfm_scored AS (\n  SELECT *,\n    NTILE(5) OVER (ORDER BY recency ASC) AS r_score,\n    NTILE(5) OVER (ORDER BY frequency DESC) AS f_score,\n    NTILE(5) OVER (ORDER BY monetary DESC) AS m_score\n  FROM rfm_calc\n)\nSELECT\n  customer_id, recency, frequency, monetary,\n  r_score, f_score, m_score,\n  r_score + f_score + m_score AS rfm_total_score,\n  CASE\n    WHEN r_score >= 4 AND f_score >= 4 THEN 'Champions'\n    WHEN r_score >= 3 AND f_score >= 3 THEN 'Loyal'\n    WHEN r_score >= 4 THEN 'Recent Customers'\n    WHEN f_score >= 3 THEN 'Potential Loyalists'\n    WHEN r_score <= 2 AND f_score >= 3 THEN 'At Risk'\n    ELSE 'Need Attention'\n  END AS rfm_segment\nFROM rfm_scored\nORDER BY rfm_total_score DESC;`, description: 'Full RFM segmentation with Champions, Loyal, At-Risk labels' },
];

const PYTHON_SNIPPETS = [
  { label: 'Load & Preview', code: `import pandas as pd\nimport numpy as np\n\ndf = pd.read_csv("data.csv")\nprint(f"Shape: {df.shape}")\nprint(f"\\nColumn types:\\n{df.dtypes}")\nprint(f"\\nFirst 5 rows:")\ndf.head()` },
  { label: 'Data Profile', code: `print("=== DATA PROFILE ===")\nprint(f"Rows: {df.shape[0]:,} | Columns: {df.shape[1]}")\nprint(f"\\nDuplicates: {df.duplicated().sum():,}")\nprint(f"\\nMissing Values:")\nprint(df.isnull().sum()[df.isnull().sum() > 0])\nprint(f"\\nNumeric Summary:")\ndf.describe().round(2)` },
  { label: 'Clean Data', code: `# Remove duplicates\ndf = df.drop_duplicates()\n\n# Trim whitespace\nstr_cols = df.select_dtypes("object").columns\ndf[str_cols] = df[str_cols].apply(lambda x: x.str.strip())\n\n# Standardize column names\ndf.columns = df.columns.str.strip().str.lower().str.replace(" ", "_").str.replace(r"[^a-z0-9_]", "", regex=True)\n\n# Convert currency columns\nfor col in df.columns:\n    if df[col].dtype == "object" and df[col].str.contains(r"^\\$", na=False).any():\n        df[col] = pd.to_numeric(df[col].str.replace(r"[$,]", "", regex=True), errors="coerce")\n\nprint(f"After cleaning: {df.shape}")` },
  { label: 'Feature Engineering', code: `# Parse dates\ndf["order_date"] = pd.to_datetime(df["order_date"], errors="coerce", infer_datetime_format=True)\ndf["year"] = df["order_date"].dt.year\ndf["month"] = df["order_date"].dt.month\ndf["quarter"] = df["order_date"].dt.quarter\ndf["day_of_week"] = df["order_date"].dt.dayofweek\n\n# Calculated business metrics\ndf["profit"] = df["revenue"] - df["cost"]\ndf["gross_margin_pct"] = np.where(\n    df["revenue"] != 0,\n    df["profit"] / df["revenue"] * 100,\n    np.nan\n)\n\n# Rolling and cumulative\ndf_sorted = df.sort_values("order_date")\ndf_sorted["rolling_7d_revenue"] = df_sorted["revenue"].rolling(window=7, min_periods=1).mean()\ndf_sorted["cumulative_revenue"] = df_sorted["revenue"].cumsum()\n\nprint("Feature engineering complete")` },
  { label: 'Group & Aggregate', code: `# Advanced groupby aggregation\ncategory_summary = (\n    df.groupby("category")\n      .agg(\n          total_revenue=("revenue", "sum"),\n          avg_revenue=("revenue", "mean"),\n          total_cost=("cost", "sum"),\n          order_count=("order_id", "count"),\n          unique_customers=("customer_id", "nunique"),\n          gross_profit=("profit", "sum")\n      )\n      .assign(\n          gross_margin_pct=lambda x: (x["gross_profit"] / x["total_revenue"] * 100).round(2),\n          revenue_share_pct=lambda x: (x["total_revenue"] / x["total_revenue"].sum() * 100).round(2)\n      )\n      .reset_index()\n      .sort_values("total_revenue", ascending=False)\n)\nprint(category_summary)` },
  { label: 'RFM Segmentation', code: `from datetime import datetime\n\ndf["order_date"] = pd.to_datetime(df["order_date"])\nref_date = df["order_date"].max() + pd.Timedelta(days=1)\n\nrfm = df.groupby("customer_id").agg(\n    recency=("order_date", lambda x: (ref_date - x.max()).days),\n    frequency=("order_id", "nunique"),\n    monetary=("revenue", "sum")\n).reset_index()\n\n# Score 1-5\nrfm["r_score"] = pd.qcut(rfm["recency"], 5, labels=[5,4,3,2,1]).astype(int)\nrfm["f_score"] = pd.qcut(rfm["frequency"].rank(method="first"), 5, labels=[1,2,3,4,5]).astype(int)\nrfm["m_score"] = pd.qcut(rfm["monetary"], 5, labels=[1,2,3,4,5]).astype(int)\nrfm["rfm_total"] = rfm["r_score"] + rfm["f_score"] + rfm["m_score"]\n\ndef rfm_label(row):\n    if row.r_score >= 4 and row.f_score >= 4: return "Champions"\n    if row.r_score >= 3 and row.f_score >= 3: return "Loyal"\n    if row.r_score <= 2 and row.f_score >= 3: return "At Risk"\n    return "Need Attention"\n\nrfm["segment"] = rfm.apply(rfm_label, axis=1)\nprint(rfm.groupby("segment")[["monetary", "frequency"]].mean().round(2))` },
  { label: 'Correlation Analysis', code: `import matplotlib.pyplot as plt\nimport seaborn as sns\n\nnumeric_cols = df.select_dtypes("number").columns.tolist()\ncorr_matrix = df[numeric_cols].corr()\n\n# Print top correlations\ncorr_pairs = corr_matrix.unstack().drop_duplicates()\ntop_corr = corr_pairs[abs(corr_pairs) < 1].sort_values(ascending=False).head(10)\nprint("Top Correlations:")\nprint(top_corr)\n\n# Heatmap\nplt.figure(figsize=(10, 8))\nsns.heatmap(corr_matrix, annot=True, cmap="coolwarm", fmt=".2f", center=0)\nplt.title("Correlation Matrix")\nplt.tight_layout()\nplt.show()` },
  { label: 'Linear Regression', code: `from sklearn.linear_model import LinearRegression\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error\nimport numpy as np\n\n# Configure\nfeatures = ["quantity", "discount_pct", "cost"]\ntarget = "revenue"\n\nX = df[features].fillna(0)\ny = df[target].fillna(0)\n\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\n\nmodel = LinearRegression()\nmodel.fit(X_train, y_train)\ny_pred = model.predict(X_test)\n\nprint(f"R²:   {r2_score(y_test, y_pred):.4f}")\nprint(f"MAE:  {mean_absolute_error(y_test, y_pred):.2f}")\nprint(f"RMSE: {np.sqrt(mean_squared_error(y_test, y_pred)):.2f}")\n\nfor feature, coef in zip(features, model.coef_):\n    print(f"  {feature}: {coef:.4f}")` },
  { label: 'Holt-Winters Forecast', code: `from statsmodels.tsa.holtwinters import ExponentialSmoothing\nimport pandas as pd\nimport numpy as np\n\n# Aggregate monthly\ndf["order_date"] = pd.to_datetime(df["order_date"], errors="coerce")\nmonthly = df.groupby(df["order_date"].dt.to_period("M"))["revenue"].sum().reset_index()\nmonthly.columns = ["period", "revenue"]\nmonthly = monthly.sort_values("period")\n\nvalues = monthly["revenue"].values\n\n# Fit Holt-Winters Exponential Smoothing\nmodel = ExponentialSmoothing(\n    values,\n    trend="add",\n    seasonal="add",\n    seasonal_periods=min(12, len(values) // 2)\n).fit(optimized=True)\n\n# Forecast 3 periods\nforecast = model.forecast(3)\n\n# Accuracy metrics\ny_actual = values[-6:]\ny_fitted = model.fittedvalues[-6:]\nmape = np.mean(np.abs((y_actual - y_fitted) / (y_actual + 1e-9))) * 100\n\nprint(f"Forecast (next 3 periods):")\nfor i, f in enumerate(forecast, 1):\n    print(f"  Period +{i}: {f:,.0f}")\nprint(f"\\nForecast Accuracy (MAPE): {mape:.1f}%")` },
];

const UNSAFE_PATTERNS = [/\bDELETE\b/i, /\bDROP\b/i, /\bUPDATE\b/i, /\bINSERT\b/i, /\bALTER\b/i, /\bTRUNCATE\b/i, /\bCREATE\b/i, /\bGRANT\b/i];

function validateSQLLocal(sql) {
  const issues = [];
  UNSAFE_PATTERNS.forEach(p => {
    if (p.test(sql)) issues.push({ type: 'error', msg: `🚫 Blocked: ${p.source.replace(/\\b/g, '').toUpperCase()} statement is not allowed. Only SELECT is permitted.` });
  });
  if (/SELECT\s+\*/i.test(sql)) issues.push({ type: 'warning', msg: '⚠ Avoid SELECT * — specify columns explicitly for better performance.' });
  if (!/LIMIT\s+\d+/i.test(sql) && !/SUM|COUNT|AVG|MIN|MAX/i.test(sql)) issues.push({ type: 'warning', msg: '⚠ Consider adding LIMIT to prevent large result sets.' });
  if (/SUM\(.*?(id|rank|score)\)/i.test(sql)) issues.push({ type: 'warning', msg: '⚠ Potential issue: SUMming an ID or rank column is likely incorrect.' });
  if (issues.filter(i => i.type === 'error').length === 0) issues.push({ type: 'success', msg: '✓ SQL is valid and safe to execute.' });
  return issues;
}

const EXCEL_FORMULAS = [
  { category: 'Mathematical', formulas: [
    { name: 'SUM', syntax: '=SUM(A1:A100)', desc: 'Sum all values in range', sql: 'SELECT SUM(revenue) FROM sales', python: 'df["revenue"].sum()' },
    { name: 'AVERAGE', syntax: '=AVERAGE(A1:A100)', desc: 'Average of values', sql: 'SELECT AVG(revenue) FROM sales', python: 'df["revenue"].mean()' },
    { name: 'SUMIF', syntax: '=SUMIF(B1:B100,"East",A1:A100)', desc: 'Conditional sum', sql: 'SELECT SUM(revenue) FROM sales WHERE region = \'East\'', python: 'df[df["region"]=="East"]["revenue"].sum()' },
    { name: 'COUNTIF', syntax: '=COUNTIF(B1:B100,"Completed")', desc: 'Count matching cells', sql: 'SELECT COUNT(*) FROM sales WHERE status = \'Completed\'', python: 'df[df["status"]=="Completed"].shape[0]' },
  ]},
  { category: 'Date & Time', formulas: [
    { name: 'DATEDIF', syntax: '=DATEDIF(A1,TODAY(),"D")', desc: 'Days between dates', sql: 'SELECT DATEDIFF(\'day\', order_date, CURRENT_DATE)', python: '(pd.Timestamp.now() - df["order_date"]).dt.days' },
    { name: 'EOMONTH', syntax: '=EOMONTH(A1,0)', desc: 'Last day of month', sql: 'SELECT DATE_TRUNC(\'month\', order_date) + INTERVAL \'1 month\' - INTERVAL \'1 day\'', python: 'df["order_date"] + pd.offsets.MonthEnd(0)' },
  ]},
  { category: 'Lookup', formulas: [
    { name: 'VLOOKUP', syntax: '=VLOOKUP(A1,Table!A:C,2,FALSE)', desc: 'Look up value in table', sql: 'SELECT t2.value FROM t1 JOIN t2 ON t1.key = t2.key', python: 'df.merge(lookup_df, on="key", how="left")' },
    { name: 'INDEX-MATCH', syntax: '=INDEX(B:B,MATCH(A1,A:A,0))', desc: 'Flexible lookup', sql: 'SELECT value FROM table WHERE key = target_key', python: 'df.set_index("key").loc[target_key, "value"]' },
  ]},
];

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
  const [excelCategory, setExcelCategory] = useState('Mathematical');

  const handleValidate = () => setSqlValidation(validateSQLLocal(sqlQuery));

  const handleNLtoSQL = async () => {
    if (!nlQuery.trim()) return;
    setLoadingNL(true);
    try {
      const res = await base44.functions.invoke('generateSQL', {
        naturalLanguageQuery: nlQuery,
        tableName: 'sales',
        columns: ['order_id', 'order_date', 'customer_id', 'product_name', 'category', 'region', 'revenue', 'cost', 'quantity', 'discount_pct', 'status', 'sales_rep'],
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
        prompt: `Explain this SQL query in plain business English. Be concise. Tell me: (1) what business question it answers, (2) what the query does step by step, (3) what the output will look like.\n\n${sqlQuery}`,
        response_json_schema: { type: 'object', properties: { businessQuestion: { type: 'string' }, explanation: { type: 'string' }, outputDescription: { type: 'string' }, useCases: { type: 'array', items: { type: 'string' } } } }
      });
      setExplanation(`📌 Business Question: ${res.businessQuestion || ''}\n\n${res.explanation || ''}\n\n📊 Output: ${res.outputDescription || ''}`);
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
            <p className="text-xs text-white/40">15 SQL templates · NL→SQL · Python Notebook · Excel Formula Assistant</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-3 flex gap-1 overflow-x-auto pb-1">
          {[
            { id: 'sql', label: '💾 SQL Workbench' },
            { id: 'nl_sql', label: '✨ NL → SQL' },
            { id: 'advanced', label: '⚡ Advanced SQL' },
            { id: 'python', label: '🐍 Python Notebook' },
            { id: 'excel', label: '📊 Excel Formulas' },
            { id: 'library', label: '📚 Query Library' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-green-400/15 text-green-400 border border-green-400/25' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* ── SQL WORKBENCH ── */}
        {activeTab === 'sql' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="space-y-2">
              <div className="text-xs font-bold text-white/50 mb-2">SQL TEMPLATES ({SQL_TEMPLATES.length})</div>
              {categories.map(cat => (
                <div key={cat}>
                  <button onClick={() => setExpandedCategory(expandedCategory === cat ? null : cat)}
                    className="flex items-center justify-between w-full px-2 py-1.5 rounded-lg text-xs font-semibold text-white/50 hover:text-white/70 hover:bg-white/4">
                    {cat} {expandedCategory === cat ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                  {expandedCategory === cat && SQL_TEMPLATES.filter(t => t.category === cat).map(t => (
                    <button key={t.id} onClick={() => { setSqlQuery(t.sql); setSelectedTemplate(t); setSqlValidation([]); setExplanation(''); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ml-2 ${selectedTemplate?.id === t.id ? 'bg-green-400/10 text-green-400 border border-green-400/20' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>

            <div className="lg:col-span-2 space-y-3">
              {selectedTemplate && (
                <div className="text-xs text-white/40 border-b border-white/5 pb-2 flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-white/5 rounded text-white/30 font-mono">{selectedTemplate.category}</span>
                  {selectedTemplate.description}
                </div>
              )}
              <div className="relative">
                <textarea value={sqlQuery} onChange={e => { setSqlQuery(e.target.value); setSqlValidation([]); setExplanation(''); }}
                  className="w-full h-64 px-4 py-3 bg-navy-900/60 border border-white/10 rounded-xl font-mono text-xs text-green-400/90 leading-relaxed focus:outline-none focus:border-green-400/30 resize-none"
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
                    <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg text-xs ${issue.type === 'error' ? 'bg-red-400/10 border border-red-400/20 text-red-400' : issue.type === 'warning' ? 'bg-yellow-400/10 border border-yellow-400/20 text-yellow-400' : 'bg-green-400/10 border border-green-400/20 text-green-400'}`}>
                      {issue.type === 'error' ? <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> : issue.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> : <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
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

              <div className="flex items-start gap-2 p-3 rounded-xl bg-white/3 border border-white/6">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-white/35">Security: DELETE, DROP, UPDATE, INSERT, ALTER, TRUNCATE, CREATE, GRANT are blocked. Only SELECT queries allowed.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── NL → SQL ── */}
        {activeTab === 'nl_sql' && (
          <div className="max-w-2xl space-y-5">
            <div className="glass-card rounded-2xl border border-green-400/20 p-6 space-y-4">
              <div className="text-sm font-bold">Natural Language → SQL</div>
              <p className="text-xs text-white/40">Describe what you want to analyze in plain English and get a complete SQL query.</p>
              <textarea value={nlQuery} onChange={e => setNlQuery(e.target.value)} rows={3}
                placeholder="e.g. 'Show me monthly revenue by category for the last 6 months' or 'Which customers spent more than $10,000?'"
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
                  <button onClick={() => { setSqlQuery(generatedSQL); setSelectedTemplate(null); setActiveTab('sql'); }} className="text-white/40 hover:text-white text-xs font-semibold">Use in Editor →</button>
                </div>
                <pre className="font-mono text-xs text-green-400/80 whitespace-pre-wrap leading-relaxed">{generatedSQL}</pre>
              </div>
            )}

            <div className="glass-card rounded-xl border border-white/8 p-4">
              <div className="text-xs font-bold text-white/40 mb-3">EXAMPLE PROMPTS</div>
              <div className="space-y-1.5">
                {[
                  'What is the total revenue by month and category?',
                  'Show top 10 customers by lifetime value',
                  'Which products have declining sales in the last 3 months?',
                  'Calculate month-over-month growth rate for each region',
                  'Find all customers who churned in the last 90 days',
                  'Show average order value by region and customer segment',
                  'What is the revenue contribution percentage by category?',
                  'Detect duplicate order IDs in the dataset',
                  'Show budget vs actual variance by department',
                ].map(q => (
                  <button key={q} onClick={() => setNlQuery(q)} className="block text-left w-full px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/80 hover:bg-white/5 transition-all">
                    → {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── ADVANCED SQL ── */}
        {activeTab === 'advanced' && (
          <div className="space-y-4">
            <div className="text-sm font-bold mb-2">Advanced SQL Patterns & Window Functions</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SQL_TEMPLATES.filter(t => ['Window Functions', 'Advanced', 'Marketing', 'Finance', 'Supply Chain'].includes(t.category)).map(t => (
                <div key={t.id} className="glass-card rounded-xl border border-white/8 p-4 hover:border-white/15 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-semibold text-sm">{t.label}</div>
                      <div className="text-xs text-white/35 mt-0.5">{t.description}</div>
                    </div>
                    <button onClick={() => { setSqlQuery(t.sql); setSelectedTemplate(t); setActiveTab('sql'); }}
                      className="px-2.5 py-1 bg-green-400/10 border border-green-400/20 text-green-400 rounded-lg text-xs font-semibold hover:bg-green-400/15 whitespace-nowrap ml-3">
                      Use →
                    </button>
                  </div>
                  <pre className="font-mono text-xs text-green-400/55 whitespace-pre-wrap leading-relaxed max-h-28 overflow-hidden">{t.sql.split('\n').slice(0, 6).join('\n')}…</pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PYTHON NOTEBOOK ── */}
        {activeTab === 'python' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-white/50 mb-2">NOTEBOOK CELLS</div>
              {PYTHON_SNIPPETS.map((s, i) => (
                <button key={i} onClick={() => setActiveSnippet(s)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${activeSnippet.label === s.label ? 'bg-purple-400/10 text-purple-400 border border-purple-400/20' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}>
                  {s.label}
                </button>
              ))}
            </div>
            <div className="lg:col-span-2 space-y-3">
              <div className="relative">
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border-b border-white/8 rounded-t-xl">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-xs text-white/40 font-mono">{activeSnippet.label}.py</span>
                </div>
                <pre className="w-full px-4 py-4 bg-navy-900/80 border border-t-0 border-white/10 rounded-b-xl font-mono text-xs text-purple-400/90 leading-relaxed whitespace-pre-wrap overflow-auto max-h-96">
                  {activeSnippet.code}
                </pre>
                <button onClick={() => copyToClipboard(activeSnippet.code)}
                  className="absolute top-10 right-2 p-1.5 rounded-lg bg-white/5 text-white/30 hover:text-white/70 transition-all">
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => copyToClipboard(activeSnippet.code)} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-400/10 border border-purple-400/25 text-purple-400 rounded-lg text-xs font-semibold">
                  <Copy className="w-3.5 h-3.5" /> Copy Code
                </button>
                <button onClick={() => {
                  const blob = new Blob([activeSnippet.code], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = `${activeSnippet.label.replace(/\s+/g, '_').toLowerCase()}.py`; a.click();
                }} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-white/50 rounded-lg text-xs font-semibold hover:text-white/80">
                  <Download className="w-3.5 h-3.5" /> Download .py
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── EXCEL FORMULA ASSISTANT ── */}
        {activeTab === 'excel' && (
          <div className="space-y-5">
            <div className="text-sm font-bold">Excel Formula Assistant</div>
            <div className="flex gap-2 flex-wrap">
              {EXCEL_FORMULAS.map(cat => (
                <button key={cat.category} onClick={() => setExcelCategory(cat.category)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${excelCategory === cat.category ? 'bg-cyan-400/15 text-cyan-400 border border-cyan-400/25' : 'bg-white/5 text-white/50 border border-white/10 hover:text-white/80'}`}>
                  {cat.category}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(EXCEL_FORMULAS.find(c => c.category === excelCategory)?.formulas || []).map(f => (
                <div key={f.name} className="glass-card rounded-xl border border-white/8 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-sm text-cyan-400">{f.name}</div>
                    <button onClick={() => copyToClipboard(f.syntax)} className="p-1.5 bg-white/5 rounded text-white/30 hover:text-white/60">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs text-white/50 mb-3">{f.desc}</p>
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-white/30 mb-1">Excel Syntax</div>
                      <code className="text-xs font-mono text-yellow-400/80 bg-white/3 px-2 py-1 rounded block">{f.syntax}</code>
                    </div>
                    <div>
                      <div className="text-xs text-white/30 mb-1">SQL Equivalent</div>
                      <code className="text-xs font-mono text-green-400/80 bg-white/3 px-2 py-1 rounded block truncate">{f.sql}</code>
                    </div>
                    <div>
                      <div className="text-xs text-white/30 mb-1">Python / Pandas</div>
                      <code className="text-xs font-mono text-purple-400/80 bg-white/3 px-2 py-1 rounded block truncate">{f.python}</code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── QUERY LIBRARY ── */}
        {activeTab === 'library' && (
          <div className="space-y-4">
            <div className="text-sm font-bold">Complete SQL Query Library ({SQL_TEMPLATES.length} queries)</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SQL_TEMPLATES.map(t => (
                <div key={t.id} className="glass-card rounded-xl border border-white/8 p-4 hover:border-white/15 transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{t.label}</div>
                      <div className="text-xs text-white/35 mt-0.5">{t.category}</div>
                      <div className="text-xs text-white/40 mt-1 leading-relaxed">{t.description}</div>
                    </div>
                    <button onClick={() => { setSqlQuery(t.sql); setSelectedTemplate(t); setActiveTab('sql'); }}
                      className="px-2.5 py-1 bg-green-400/10 border border-green-400/20 text-green-400 rounded-lg text-xs font-semibold hover:bg-green-400/15 whitespace-nowrap ml-3 flex-shrink-0">
                      Open →
                    </button>
                  </div>
                  <div className="text-xs text-white/20 font-mono truncate">{t.sql.split('\n').slice(0, 2).join(' ')}…</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}