/**
 * Domain Analytics Packs — Pre-built analytics templates for 10 business domains
 */
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspaceStore } from '@/lib/store';
import {
  BarChart2, Users, TrendingUp, ShoppingCart, Heart, Home,
  Share2, Briefcase, UserX, Target, ChevronRight, Play,
  Loader2, Copy, CheckCircle2, Database, Sparkles
} from 'lucide-react';

const PACKS = [
  {
    id: 'sales', name: 'Sales Analytics', icon: TrendingUp, color: 'text-green-400', bg: 'border-green-400/20',
    required: ['order_id', 'order_date', 'customer_id', 'product', 'revenue', 'region'],
    optional: ['cost', 'category', 'salesperson', 'channel', 'discount'],
    kpis: ['Total Revenue', 'Revenue Growth %', 'Average Order Value', 'Top Customers', 'Top Products', 'Monthly Growth', 'Win Rate'],
    starterQuestions: ['What is our revenue trend this year?', 'Which region has the highest growth?', 'Who are our top 10 customers by revenue?', 'What products are underperforming?'],
    sqlTemplates: [
      { name: 'Monthly Revenue', sql: `SELECT DATE_TRUNC('month', order_date) AS month,\n       SUM(revenue) AS total_revenue,\n       COUNT(DISTINCT customer_id) AS unique_customers\nFROM sales\nGROUP BY month ORDER BY month;` },
      { name: 'Top Products', sql: `SELECT product, SUM(revenue) AS total_revenue,\n       COUNT(*) AS order_count,\n       ROUND(100.0 * SUM(revenue) / SUM(SUM(revenue)) OVER (), 2) AS pct\nFROM sales GROUP BY product ORDER BY total_revenue DESC LIMIT 10;` },
    ],
    reportTemplate: 'Sales Performance Report: Period overview → Revenue vs target → Top performers → Risk segments → Recommended actions',
    recommendations: ['Set revenue targets by region and track weekly', 'Build RFM analysis for top 20% of customers', 'Identify products with declining trend and investigate'],
  },
  {
    id: 'hr', name: 'HR Analytics', icon: Users, color: 'text-blue-400', bg: 'border-blue-400/20',
    required: ['employee_id', 'department', 'salary', 'attrition', 'years_at_company'],
    optional: ['role', 'gender', 'education', 'performance_rating', 'job_satisfaction', 'age'],
    kpis: ['Headcount', 'Attrition Rate', 'Average Tenure', 'Salary Distribution', 'Department Attrition', 'Performance Distribution'],
    starterQuestions: ['What is our attrition rate by department?', 'Which roles have the highest salary variance?', 'What are the key drivers of employee attrition?', 'How does tenure correlate with attrition?'],
    sqlTemplates: [
      { name: 'Attrition by Department', sql: `SELECT department,\n       COUNT(*) AS headcount,\n       SUM(CASE WHEN attrition = 1 THEN 1 ELSE 0 END) AS churned,\n       ROUND(100.0 * SUM(CASE WHEN attrition = 1 THEN 1 ELSE 0 END) / COUNT(*), 1) AS attrition_rate\nFROM employees GROUP BY department ORDER BY attrition_rate DESC;` },
    ],
    reportTemplate: 'HR Analytics Report: Headcount overview → Attrition analysis → Salary equity → Tenure distribution → Recommendations',
    recommendations: ['Prioritize retention programs for departments with >15% attrition', 'Review salary bands for roles with high variance', 'Investigate satisfaction scores in high-attrition teams'],
  },
  {
    id: 'finance', name: 'Finance Analytics', icon: BarChart2, color: 'text-cyan-400', bg: 'border-cyan-400/20',
    required: ['date', 'category', 'amount', 'type'],
    optional: ['department', 'project', 'budget', 'actual', 'forecast'],
    kpis: ['Total Revenue', 'Total Cost', 'Gross Margin', 'Budget Variance', 'Cost by Category', 'Cash Flow', 'EBITDA Proxy'],
    starterQuestions: ['How does actual spend compare to budget?', 'Which cost categories are growing fastest?', 'What is our gross margin trend?', 'Where are we over budget?'],
    sqlTemplates: [
      { name: 'Budget vs Actual', sql: `SELECT category, SUM(budget) AS budget, SUM(actual) AS actual,\n       SUM(actual) - SUM(budget) AS variance,\n       ROUND((SUM(actual) - SUM(budget)) / NULLIF(SUM(budget), 0) * 100, 1) AS variance_pct\nFROM financials GROUP BY category ORDER BY variance_pct DESC;` },
    ],
    reportTemplate: 'Financial Report: P&L summary → Budget variance → Cost drivers → Risk → Cash flow forecast',
    recommendations: ['Identify top 5 budget overage categories and escalate to owners', 'Build rolling 3-month forecast for cash flow planning'],
  },
  {
    id: 'ecommerce', name: 'E-Commerce Analytics', icon: ShoppingCart, color: 'text-orange-400', bg: 'border-orange-400/20',
    required: ['order_id', 'customer_id', 'product_id', 'order_date', 'revenue', 'quantity'],
    optional: ['category', 'channel', 'discount', 'return_flag', 'shipping_cost', 'country'],
    kpis: ['GMV', 'AOV', 'Cart Abandonment Rate', 'Return Rate', 'LTV', 'CAC', 'Conversion Rate'],
    starterQuestions: ['What is our cart abandonment rate?', 'Which product categories have the highest return rate?', 'What is the LTV/CAC ratio by channel?', 'Which channels drive the most profitable customers?'],
    sqlTemplates: [
      { name: 'Revenue by Category', sql: `SELECT category, SUM(revenue) AS total_gmv,\n       COUNT(DISTINCT order_id) AS orders,\n       AVG(revenue) AS aov,\n       SUM(quantity) AS units_sold\nFROM ecommerce GROUP BY category ORDER BY total_gmv DESC;` },
    ],
    reportTemplate: 'E-Commerce Report: GMV/AOV trends → Funnel conversion → Top categories → Return analysis → LTV/CAC → Growth levers',
    recommendations: ['Run RFM analysis to identify highest-value segments for VIP programs', 'Investigate high-return categories for product quality issues'],
  },
  {
    id: 'healthcare', name: 'Healthcare Analytics', icon: Heart, color: 'text-red-400', bg: 'border-red-400/20',
    required: ['patient_id', 'visit_date', 'diagnosis', 'department'],
    optional: ['age', 'gender', 'length_of_stay', 'readmission', 'cost', 'outcome'],
    kpis: ['Patient Volume', 'Average Length of Stay', 'Readmission Rate', 'Cost per Patient', 'Department Utilization', 'Diagnosis Distribution'],
    starterQuestions: ['What is our 30-day readmission rate?', 'Which departments have the highest utilization?', 'What are the most common diagnoses?', 'How does length of stay vary by diagnosis?'],
    sqlTemplates: [
      { name: 'Readmission Rate', sql: `SELECT department,\n       COUNT(DISTINCT patient_id) AS patients,\n       SUM(CASE WHEN readmission = 1 THEN 1 ELSE 0 END) AS readmissions,\n       ROUND(100.0 * SUM(CASE WHEN readmission = 1 THEN 1 ELSE 0 END) / COUNT(*), 1) AS readmission_rate\nFROM patients GROUP BY department ORDER BY readmission_rate DESC;` },
    ],
    reportTemplate: 'Healthcare Analytics: Volume trends → Readmission analysis → Cost efficiency → Department benchmarks',
    recommendations: ['Focus readmission reduction programs on top 3 departments', 'Review length-of-stay outliers for efficiency opportunities'],
  },
  {
    id: 'realestate', name: 'Real Estate Analytics', icon: Home, color: 'text-teal-400', bg: 'border-teal-400/20',
    required: ['property_id', 'listing_date', 'sale_price', 'property_type', 'location'],
    optional: ['sqft', 'bedrooms', 'days_on_market', 'list_price', 'agent_id', 'neighborhood'],
    kpis: ['Median Sale Price', 'Days on Market', 'Price per SqFt', 'List-to-Sale Ratio', 'Volume by Type', 'Market Velocity'],
    starterQuestions: ['What is the median sale price by neighborhood?', 'How do days on market correlate with final price?', 'Which property types sell fastest?', 'What is the list-to-sale price ratio by agent?'],
    sqlTemplates: [
      { name: 'Price by Neighborhood', sql: `SELECT location, COUNT(*) AS sales,\n       ROUND(AVG(sale_price)) AS avg_price,\n       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sale_price) AS median_price,\n       AVG(days_on_market) AS avg_dom\nFROM properties GROUP BY location ORDER BY median_price DESC;` },
    ],
    reportTemplate: 'Real Estate Market Report: Price trends → Inventory analysis → Days-on-market → Agent performance → Forecast',
    recommendations: ['Identify properties with days_on_market > 60 for price reduction triggers', 'Build price-per-sqft heatmap by neighborhood'],
  },
  {
    id: 'social', name: 'Social Media Analytics', icon: Share2, color: 'text-pink-400', bg: 'border-pink-400/20',
    required: ['post_id', 'post_date', 'platform', 'impressions', 'engagements'],
    optional: ['clicks', 'shares', 'comments', 'reach', 'spend', 'campaign_id', 'content_type'],
    kpis: ['Total Impressions', 'Engagement Rate', 'CPM', 'CTR', 'Reach', 'Share of Voice', 'ROI per Platform'],
    starterQuestions: ['Which platform drives the highest engagement?', 'What content type performs best?', 'How does engagement rate trend over time?', 'What is our cost per engagement by campaign?'],
    sqlTemplates: [
      { name: 'Engagement by Platform', sql: `SELECT platform,\n       SUM(impressions) AS total_impressions,\n       SUM(engagements) AS total_engagements,\n       ROUND(100.0 * SUM(engagements) / NULLIF(SUM(impressions), 0), 2) AS engagement_rate,\n       AVG(spend) AS avg_spend\nFROM social_posts GROUP BY platform ORDER BY engagement_rate DESC;` },
    ],
    reportTemplate: 'Social Media Report: Platform performance → Content analysis → Engagement trends → Spend efficiency → Recommendations',
    recommendations: ['Double down on top-performing content formats across all platforms', 'Set engagement rate benchmarks per platform and alert when below threshold'],
  },
  {
    id: 'recruitment', name: 'Recruitment Analytics', icon: Briefcase, color: 'text-amber-400', bg: 'border-amber-400/20',
    required: ['candidate_id', 'application_date', 'job_role', 'stage', 'outcome'],
    optional: ['source', 'department', 'time_to_hire', 'offer_accepted', 'salary_offered', 'recruiter'],
    kpis: ['Applications', 'Conversion Rate', 'Time to Hire', 'Offer Acceptance Rate', 'Source Quality', 'Cost per Hire'],
    starterQuestions: ['Which source generates the most hired candidates?', 'What is our time-to-hire by department?', 'Where does our hiring funnel lose the most candidates?', 'Which roles have the longest hire cycle?'],
    sqlTemplates: [
      { name: 'Source Quality', sql: `SELECT source,\n       COUNT(*) AS applications,\n       SUM(CASE WHEN outcome = 'hired' THEN 1 ELSE 0 END) AS hired,\n       ROUND(100.0 * SUM(CASE WHEN outcome = 'hired' THEN 1 ELSE 0 END) / COUNT(*), 1) AS hire_rate\nFROM candidates GROUP BY source ORDER BY hire_rate DESC;` },
    ],
    reportTemplate: 'Recruitment Report: Pipeline overview → Source quality → Time-to-hire → Offer analytics → Bottleneck analysis',
    recommendations: ['Prioritize budget to top-converting sources', 'Audit interview-to-offer drop-off for recruiter coaching opportunities'],
  },
  {
    id: 'churn', name: 'Customer Churn Analytics', icon: UserX, color: 'text-red-400', bg: 'border-red-400/20',
    required: ['customer_id', 'churn_date_or_flag', 'contract_type', 'tenure'],
    optional: ['monthly_charge', 'product', 'support_tickets', 'satisfaction_score', 'last_activity_date'],
    kpis: ['Churn Rate', 'Revenue Churn', 'Churn by Segment', 'Early Churn Rate', 'Win-Back Rate', 'At-Risk Score'],
    starterQuestions: ['What is our churn rate by contract type?', 'Which customers are most at risk of churning?', 'How does tenure correlate with churn?', 'What is the revenue impact of churn?'],
    sqlTemplates: [
      { name: 'Churn by Contract', sql: `SELECT contract_type,\n       COUNT(*) AS customers,\n       SUM(CASE WHEN churn = 1 THEN 1 ELSE 0 END) AS churned,\n       ROUND(AVG(monthly_charge), 2) AS avg_monthly_charge,\n       ROUND(100.0 * SUM(CASE WHEN churn = 1 THEN 1 ELSE 0 END) / COUNT(*), 1) AS churn_rate\nFROM customers GROUP BY contract_type ORDER BY churn_rate DESC;` },
    ],
    reportTemplate: 'Churn Analytics Report: Rate overview → Segment breakdown → Revenue impact → Risk factors → Retention recommendations',
    recommendations: ['Deploy early warning system for customers with satisfaction < 3', 'Create targeted win-back campaign for churned high-value customers'],
  },
  {
    id: 'segmentation', name: 'Customer Segmentation', icon: Target, color: 'text-purple-400', bg: 'border-purple-400/20',
    required: ['customer_id', 'revenue', 'frequency', 'recency_days'],
    optional: ['product_category', 'region', 'channel', 'clv', 'tenure', 'segment_label'],
    kpis: ['Segment Size', 'Revenue per Segment', 'CLV by Segment', 'Acquisition Cost', 'Retention Rate', 'Upgrade Rate'],
    starterQuestions: ['How many customers are in each segment?', 'Which segment contributes most to revenue?', 'How does CLV differ across segments?', 'Which segment should receive retention investment?'],
    sqlTemplates: [
      { name: 'Segment Revenue', sql: `SELECT segment_label,\n       COUNT(DISTINCT customer_id) AS customers,\n       SUM(revenue) AS total_revenue,\n       AVG(revenue) AS avg_revenue,\n       ROUND(100.0 * SUM(revenue) / SUM(SUM(revenue)) OVER (), 1) AS revenue_share\nFROM customers GROUP BY segment_label ORDER BY total_revenue DESC;` },
    ],
    reportTemplate: 'Segmentation Report: Segment overview → Revenue contribution → CLV analysis → Activation strategies → KPI targets',
    recommendations: ['Identify "move up" candidates — customers just below Champions threshold', 'Build personalized journey for each segment with distinct KPIs'],
  },
];

export default function DomainAnalyticsPacks() {
  const { getActiveTable } = useWorkspaceStore();
  const activeTable = getActiveTable();
  const [selected, setSelected] = useState(null);
  const [askedQuestion, setAskedQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedSQL, setCopiedSQL] = useState('');

  const askAI = async (question) => {
    if (!question || !activeTable) return;
    setAskedQuestion(question);
    setLoading(true);
    setAiAnswer('');
    try {
      const res = await base44.functions.invoke('runAgentOrchestrator', {
        question,
        persona: 'Principal Business Analyst',
        tableData: activeTable ? {
          name: activeTable.name,
          rowCount: activeTable.rows?.length,
          columns: activeTable.columns?.slice(0, 20),
          rows: activeTable.rows?.slice(0, 30),
        } : null,
        sessionId: `pack_${Date.now()}`,
      });
      setAiAnswer(res.data?.executive_summary || res.data?.analysis || JSON.stringify(res.data).slice(0, 500));
    } catch (e) {
      setAiAnswer(`Analysis error: ${e.message}`);
    }
    setLoading(false);
  };

  const copySQL = (sql, name) => {
    navigator.clipboard.writeText(sql);
    setCopiedSQL(name);
    setTimeout(() => setCopiedSQL(''), 1500);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-white/8 px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-400/15 border border-purple-400/25 flex items-center justify-center">
            <Database className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-black">Domain Analytics Packs</h1>
            <p className="text-xs text-muted-foreground">10 pre-built analytics templates · Required fields · KPI templates · SQL blueprints · Starter questions</p>
          </div>
          {activeTable && (
            <div className="ml-auto px-3 py-1.5 rounded-xl bg-green-400/8 border border-green-400/15 text-xs text-green-400 font-mono">
              {activeTable.name} · {activeTable.rows?.length} rows
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-0 overflow-hidden" style={{ height: 'calc(100vh - 73px)' }}>
        {/* Pack list */}
        <div className="w-64 border-r border-white/8 overflow-y-auto p-3 space-y-1.5 flex-shrink-0">
          {PACKS.map(pack => (
            <button key={pack.id} onClick={() => { setSelected(pack); setAiAnswer(''); }}
              className={`w-full text-left p-3 rounded-xl border transition-all ${selected?.id === pack.id ? `${pack.bg} bg-white/2` : 'border-white/8 bg-white/2 hover:border-white/15'}`}>
              <div className="flex items-center gap-2 mb-0.5">
                <pack.icon className={`w-3.5 h-3.5 ${selected?.id === pack.id ? pack.color : 'text-white/35'}`} />
                <span className={`text-xs font-semibold ${selected?.id === pack.id ? pack.color : 'text-white/60'}`}>{pack.name}</span>
              </div>
              <p className="text-xs text-white/25 leading-tight">{pack.kpis.slice(0, 2).join(', ')}</p>
            </button>
          ))}
        </div>

        {/* Pack detail */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!selected ? (
            <div className="flex items-center justify-center h-full text-white/25 text-sm flex-col gap-3">
              <Database className="w-12 h-12 opacity-30" />
              Select a domain pack to view templates, KPIs, SQL, and AI starter questions
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <selected.icon className={`w-6 h-6 ${selected.color}`} />
                <h2 className="text-xl font-black">{selected.name}</h2>
              </div>

              <div className="grid grid-cols-2 gap-5">
                {/* Required fields */}
                <div className="p-4 rounded-2xl border border-white/8 bg-white/2">
                  <div className="text-xs font-bold text-white/35 uppercase tracking-widest mb-2">Required Fields</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.required.map(f => (
                      <span key={f} className={`text-xs px-2 py-0.5 rounded-full border font-mono ${selected.bg} ${selected.color}`}>{f}</span>
                    ))}
                  </div>
                  {selected.optional.length > 0 && (
                    <>
                      <div className="text-xs font-bold text-white/25 uppercase tracking-widest mb-2 mt-3">Optional Fields</div>
                      <div className="flex flex-wrap gap-1">
                        {selected.optional.map(f => (
                          <span key={f} className="text-xs px-2 py-0.5 rounded-full border border-white/10 text-white/30 font-mono">{f}</span>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* KPIs */}
                <div className="p-4 rounded-2xl border border-white/8 bg-white/2">
                  <div className="text-xs font-bold text-white/35 uppercase tracking-widest mb-2">Key KPIs</div>
                  <div className="space-y-1.5">
                    {selected.kpis.map(kpi => (
                      <div key={kpi} className="flex items-center gap-2 text-xs">
                        <div className={`w-1.5 h-1.5 rounded-full ${selected.color.replace('text', 'bg')}`} />
                        <span className="text-white/60">{kpi}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* SQL Templates */}
              <div>
                <div className="text-xs font-bold text-white/35 uppercase tracking-widest mb-3">SQL Templates</div>
                {selected.sqlTemplates.map(tmpl => (
                  <div key={tmpl.name} className="rounded-xl border border-green-400/20 bg-black/20 mb-3">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                      <span className="text-xs text-green-400 font-semibold">{tmpl.name}</span>
                      <button onClick={() => copySQL(tmpl.sql, tmpl.name)}
                        className="flex items-center gap-1 text-xs text-white/30 hover:text-green-400 transition-all">
                        {copiedSQL === tmpl.name ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedSQL === tmpl.name ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre className="p-3 text-xs text-green-400/80 font-mono overflow-x-auto whitespace-pre-wrap">{tmpl.sql}</pre>
                  </div>
                ))}
              </div>

              {/* Starter Questions */}
              <div>
                <div className="text-xs font-bold text-white/35 uppercase tracking-widest mb-3">AI Starter Questions</div>
                <div className="grid grid-cols-2 gap-2">
                  {selected.starterQuestions.map(q => (
                    <button key={q} onClick={() => askAI(q)}
                      disabled={!activeTable || loading}
                      className="text-left p-3 rounded-xl border border-white/8 bg-white/2 hover:border-white/18 hover:bg-white/4 transition-all text-xs text-white/55 hover:text-white/80 disabled:opacity-40 flex items-start gap-2">
                      <Sparkles className={`w-3 h-3 mt-0.5 flex-shrink-0 ${selected.color}`} />
                      {q}
                    </button>
                  ))}
                </div>
                {!activeTable && <p className="text-xs text-amber-400/70 mt-2">⚠ Load a dataset in Workspace to use AI starter questions</p>}
              </div>

              {/* AI Answer */}
              {(loading || aiAnswer) && (
                <div className={`p-4 rounded-2xl border ${loading ? 'border-white/8' : 'border-cyan-400/20 bg-cyan-400/3'}`}>
                  {loading ? (
                    <div className="flex items-center gap-2 text-sm text-white/40">
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                      Analyzing with Principal Business Analyst…
                    </div>
                  ) : (
                    <>
                      <div className="text-xs text-cyan-400 font-bold mb-2">AI Answer — "{askedQuestion}"</div>
                      <p className="text-sm text-white/65 leading-relaxed">{aiAnswer}</p>
                    </>
                  )}
                </div>
              )}

              {/* Report template */}
              <div className="p-4 rounded-2xl border border-white/8 bg-white/2">
                <div className="text-xs font-bold text-white/35 uppercase tracking-widest mb-2">Report Template Structure</div>
                <p className="text-xs text-white/50 leading-relaxed">{selected.reportTemplate}</p>
              </div>

              {/* Recommendations */}
              <div className="p-4 rounded-2xl border border-white/8 bg-white/2">
                <div className="text-xs font-bold text-white/35 uppercase tracking-widest mb-2">Built-in Recommendations</div>
                <div className="space-y-2">
                  {selected.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-white/55">
                      <span className={`font-bold ${selected.color} flex-shrink-0`}>{i + 1}.</span>
                      {rec}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}