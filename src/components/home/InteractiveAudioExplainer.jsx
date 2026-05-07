/**
 * InteractiveAudioExplainer — Chapter-based voice-narrated platform walkthrough
 * Uses browser's built-in Web Speech API (SpeechSynthesis) for voice narration
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, RotateCcw, Volume2, VolumeX, ChevronRight, ChevronLeft,
  Zap, Database, Brain, BarChart2, TrendingUp, FileText, Bell, Users, Shield
} from 'lucide-react';

const CHAPTERS = [
  {
    id: 'intro',
    label: 'Introduction',
    icon: Zap,
    color: '#00e5ff',
    title: 'OmniData AI Analytics Studio',
    subtitle: 'Universal AI-Powered Data Analytics Platform',
    stats: [
      { value: '3s', label: 'Avg Analysis Time' },
      { value: '10+', label: 'Report Types' },
      { value: '100%', label: 'Grounded AI' },
      { value: '0', label: 'Hallucinations' },
    ],
    script: `Welcome to OmniData AI Analytics Studio — the world's most advanced universal data analytics platform. OmniData transforms any raw CSV, Excel, or JSON file into executive-ready insights in seconds. Whether you're a data analyst, business executive, or product manager, OmniData gives you the power of a full analytics team — powered by AI. The platform combines data cleaning, statistical analysis, AI-grounded insights, forecasting, anomaly detection, SQL generation, and automated report writing — all in one seamless workflow. No setup. No data engineering. Just upload your data and let the AI do the rest.`,
  },
  {
    id: 'upload',
    label: 'Data Upload',
    icon: Database,
    color: '#00bfa5',
    title: 'Universal Data Intake',
    subtitle: 'Upload Any Format — Auto Profile Instantly',
    stats: [
      { value: 'CSV', label: 'Supported' },
      { value: 'XLSX', label: 'Supported' },
      { value: 'JSON', label: 'Supported' },
      { value: 'Auto', label: 'Schema Detection' },
    ],
    script: `The Data Upload module accepts any tabular format — CSV, Excel, or JSON. Simply drag and drop your file onto the workspace. OmniData immediately profiles every column: detecting whether each field is numeric, a date, a category, or an identifier. It calculates a comprehensive Data Quality Score based on completeness, uniqueness, validity, and consistency. Missing values are flagged, duplicates are counted, and column statistics like mean, standard deviation, min, and max are computed instantly. You'll see a full schema preview before running any analysis — giving you complete visibility into your dataset's health.`,
  },
  {
    id: 'quality',
    label: 'Quality Studio',
    icon: Shield,
    color: '#4caf50',
    title: 'Data Quality & Cleaning',
    subtitle: '9-Step Automated Cleaning Pipeline',
    stats: [
      { value: '9', label: 'Cleaning Steps' },
      { value: 'ISO', label: 'Date Standards' },
      { value: 'Auto', label: 'Null Imputation' },
      { value: '5σ', label: 'Outlier Threshold' },
    ],
    script: `The Quality Studio runs a comprehensive 9-step cleaning pipeline on your data. It normalizes column names to snake_case, strips hidden characters and whitespace, removes exact duplicate rows, standardizes all date formats to ISO 8601, imputes null values using median for numeric columns and mode for categorical ones, casts correct data types, flags format inconsistencies, removes extreme noisy outliers beyond 5 standard deviations, and generates a detailed cleaning report. After cleaning, your quality score updates in real time. You can also build custom validation rules — for example, ensuring revenue is always greater than zero, or that customer IDs are never null.`,
  },
  {
    id: 'ai_analysis',
    label: 'AI Analysis',
    icon: Brain,
    color: '#9c27b0',
    title: 'AI-Powered Analysis Engine',
    subtitle: 'Deep Statistical + Predictive Intelligence',
    stats: [
      { value: 'KPI', label: 'Auto Detection' },
      { value: 'Z-Score', label: 'Anomaly Method' },
      { value: 'Pearson', label: 'Correlations' },
      { value: 'Exp.', label: 'Smoothing Forecast' },
    ],
    script: `The AI Analysis Engine is the heart of OmniData. Once you define your primary KPI and date column, the engine runs a full multi-step pipeline. First, it computes period-over-period growth rates and identifies the trend direction. Then it performs Pearson correlation analysis across all numeric column pairs, flagging the strongest predictors of your KPI. Next, anomaly detection runs using a combined Z-score and IQR method — any data point beyond 2 standard deviations from the rolling mean is flagged with severity levels. Finally, if a date column is present, exponential smoothing blended with linear regression generates a 6-period forward forecast with bull, base, and bear scenarios. The result is a complete analytical picture of your data.`,
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: BarChart2,
    color: '#00e5ff',
    title: 'Executive Dashboard & Workbook',
    subtitle: 'Story-Driven Insight Hierarchy',
    stats: [
      { value: '4', label: 'Story Layers' },
      { value: '12+', label: 'Chart Types' },
      { value: 'Live', label: 'KPI Cards' },
      { value: 'Save', label: 'To Dashboard' },
    ],
    script: `The Executive Dashboard follows a clear 4-layer storytelling hierarchy. Layer 1 answers "What Happened" — showing your primary KPIs, total values, growth rates, and an AI-generated executive summary. Layer 2 answers "Why It Happened" — showing the primary trend chart with forecast overlay, segment contribution breakdown, and AI-generated chart panels. Layer 3 answers "Where the Risk Is" — displaying the anomaly detection register and key correlation drivers. Layer 4 answers "What to Do Next" — presenting prioritized recommendations ranked critical, high, medium, and low. Every chart has an AI Explain button that reveals what the chart shows, its business meaning, and the SQL query behind it.`,
  },
  {
    id: 'sql',
    label: 'SQL Studio',
    icon: FileText,
    color: '#29b6f6',
    title: 'Natural Language SQL Studio',
    subtitle: 'Ask Questions → Get SQL → Run Instantly',
    stats: [
      { value: 'NL', label: 'To SQL' },
      { value: '15+', label: 'SQL Templates' },
      { value: 'Live', label: 'In-Memory Run' },
      { value: 'CSV', label: 'Export Results' },
    ],
    script: `The SQL Studio allows you to query your data using plain English. Type any question like "show total revenue by region" or "which segment has the highest average order value" and the AI generates syntactically correct SQL tailored to your exact column names. The query runs instantly in-memory against your dataset — no database required. Results appear as a sortable table with an optional bar chart view. You also have access to 15 pre-built SQL templates covering top-N analysis, monthly trends, segment comparisons, anomaly Z-score detection, cohort retention, funnel conversion, and customer lifetime value calculations. Every query result can be exported as CSV.`,
  },
  {
    id: 'predictive',
    label: 'Predictive AI',
    icon: TrendingUp,
    color: '#ff6b35',
    title: 'Predictive Insights & Forecasting',
    subtitle: 'Bull / Base / Bear Scenario Planning',
    stats: [
      { value: '6+', label: 'Periods Forward' },
      { value: '3', label: 'Scenarios' },
      { value: 'MAPE', label: 'Accuracy Metric' },
      { value: 'CI', label: 'Confidence Bands' },
    ],
    script: `The Predictive Insights module provides forward-looking scenario analysis. The base forecast uses exponential smoothing with a linear regression blend. The bull scenario projects 20% upside from the base, while the bear scenario models a 20% downside. Confidence interval bands show the uncertainty range around each projection. You can manually adjust the growth rate assumption using a slider — from negative 30 percent to positive 50 percent — and see the adjusted end-value recalculate in real time. Forecast accuracy is evaluated using MAPE, RMSE, MAE, and sMAPE metrics compared against held-out historical data. Snapshots of your forecasts can be saved to the Forecast History Hub for tracking accuracy over time.`,
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: FileText,
    color: '#ff2d7a',
    title: 'AI Report Generation',
    subtitle: '10 Board-Ready Report Templates',
    stats: [
      { value: '10', label: 'Report Types' },
      { value: 'PDF', label: 'Export' },
      { value: 'HTML', label: 'Export' },
      { value: 'Slack', label: 'Notify' },
    ],
    script: `The Reports module generates fully written, board-ready documents at the click of a button. Choose from 10 report templates: Executive Summary for C-suite stakeholders, Board Memo in formal governance format, KPI and Trend Report with period-over-period decomposition, Anomaly and Risk Report with severity rankings, Forecast Report with all three scenario projections, Data Quality Audit with column-level profiling, SQL Analysis Report with embedded query code, RFM Customer Segmentation Report, Funnel Analysis Report with drop-off breakdowns, and a Feedback and Survey Insights Report. Every report is written by AI using your actual data — specific numbers, real segment names, and evidence-backed recommendations. Reports export as print-ready PDF, downloadable HTML, or plain text.`,
  },
  {
    id: 'collaboration',
    label: 'Collaboration',
    icon: Users,
    color: '#ffcc02',
    title: 'Collaboration & Sharing',
    subtitle: 'Share Reports · Comments · Access Control',
    stats: [
      { value: 'View', label: 'Access Level' },
      { value: 'Comment', label: 'Access Level' },
      { value: 'Edit', label: 'Access Level' },
      { value: 'Public', label: 'Link Sharing' },
    ],
    script: `The Collaboration Workspace lets you share any generated report with team members or external stakeholders. When creating a shared report, you choose the access level: View-only for read access, Comment for feedback threads, or Edit for full collaborative editing. You can invite specific email addresses or generate a public shareable link. Reports support threaded comments with reply nesting and resolution tracking — perfect for async review workflows. The Audit Log in the Governance module tracks every action: who viewed, who commented, who exported, and when. Alerts can notify your team via email digest or Slack webhook whenever a KPI crosses a threshold or an anomaly is detected.`,
  },
];

function useTextToSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const utteranceRef = useRef(null);

  const speak = (text) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.92;
    utter.pitch = 1.0;
    utter.volume = muted ? 0 : 1;
    // Try to pick a good English voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.includes('Google US English') ||
      v.name.includes('Samantha') ||
      v.name.includes('Alex') ||
      v.name.includes('Karen') ||
      (v.lang === 'en-US' && v.localService)
    ) || voices.find(v => v.lang === 'en-US') || voices[0];
    if (preferred) utter.voice = preferred;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    utteranceRef.current = utter;
    window.speechSynthesis.speak(utter);
    setSpeaking(true);
  };

  const pause = () => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  };

  const toggle = (text) => {
    if (speaking) { pause(); } else { speak(text); }
  };

  const restart = (text) => { pause(); setTimeout(() => speak(text), 100); };

  const toggleMute = () => {
    setMuted(m => {
      if (utteranceRef.current) utteranceRef.current.volume = m ? 1 : 0;
      return !m;
    });
  };

  useEffect(() => () => { if (window.speechSynthesis) window.speechSynthesis.cancel(); }, []);

  return { speaking, muted, toggle, restart, pause, toggleMute };
}

export default function InteractiveAudioExplainer() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const { speaking, muted, toggle, restart, pause, toggleMute } = useTextToSpeech();
  const progressRef = useRef(null);
  const chapter = CHAPTERS[activeIdx];
  const Icon = chapter.icon;

  // Animate progress bar while speaking
  useEffect(() => {
    setProgress(0);
    if (!speaking) return;
    const duration = chapter.script.length * 55; // rough ms estimate
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / duration) * 100, 99);
      setProgress(pct);
      if (!speaking) { clearInterval(interval); }
    }, 100);
    return () => clearInterval(interval);
  }, [speaking, activeIdx]);

  const goTo = (idx) => {
    pause();
    setProgress(0);
    setActiveIdx(idx);
  };

  const handlePrev = () => goTo(Math.max(0, activeIdx - 1));
  const handleNext = () => goTo(Math.min(CHAPTERS.length - 1, activeIdx + 1));

  return (
    <section className="py-20 px-6" style={{ background: 'hsl(222,47%,5%)' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-400/25 bg-cyan-400/8 mb-5">
            <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
            <span className="text-xs font-semibold text-cyan-400 tracking-widest uppercase">Interactive Audio Explainer</span>
          </div>
          <h2 className="text-4xl font-black mb-3">
            Full platform walkthrough in{' '}
            <span className="text-gradient">{CHAPTERS.length} chapters</span>
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            Press Play on any chapter to hear a detailed voice-narrated explanation —<br />
            data pipeline, AI engine, every interface, and reporting architecture.
          </p>
        </div>

        {/* Chapter tab bar */}
        <div className="flex gap-0.5 overflow-x-auto pb-0.5 mb-0 border-b border-white/8 scrollbar-hide">
          {CHAPTERS.map((ch, idx) => {
            const ChIcon = ch.icon;
            const isActive = idx === activeIdx;
            return (
              <button key={ch.id} onClick={() => goTo(idx)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border-b-2 -mb-px ${
                  isActive ? 'text-white border-cyan-400 bg-white/5' : 'text-white/35 border-transparent hover:text-white/65 hover:bg-white/3'
                }`}>
                <ChIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? '' : 'opacity-60'}`}
                  style={isActive ? { color: ch.color } : {}} />
                {ch.label}
              </button>
            );
          })}
        </div>

        {/* Main panel */}
        <AnimatePresence mode="wait">
          <motion.div key={activeIdx}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="rounded-b-2xl rounded-tr-2xl border border-t-0 border-white/10 overflow-hidden"
            style={{ background: 'hsl(222,44%,8%)' }}>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              {/* Left: Visual panel */}
              <div className="p-8 border-r border-white/6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${chapter.color}22` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: chapter.color }} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: chapter.color }}>
                    {chapter.label}
                  </span>
                </div>

                <h3 className="text-2xl font-black mb-1">{chapter.title}</h3>
                <p className="text-sm mb-8" style={{ color: chapter.color }}>{chapter.subtitle}</p>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3">
                  {chapter.stats.map((s, i) => (
                    <motion.div key={s.label}
                      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.07 }}
                      className="rounded-xl p-4 text-center border"
                      style={{ background: `${chapter.color}0d`, borderColor: `${chapter.color}25` }}>
                      <div className="text-2xl font-black font-mono mb-1" style={{ color: chapter.color }}>{s.value}</div>
                      <div className="text-xs text-white/40">{s.label}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Chapter position */}
                <div className="mt-6 text-xs text-white/25 text-center">
                  Chapter {activeIdx + 1} of {CHAPTERS.length}
                </div>
              </div>

              {/* Right: Script panel */}
              <div className="p-8 flex flex-col">
                <div className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-4">Narration Script</div>
                <div className="flex-1 text-sm text-white/65 leading-relaxed overflow-y-auto max-h-64 pr-2">
                  <AnimatePresence mode="wait">
                    <motion.p key={activeIdx}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      {chapter.script}
                    </motion.p>
                  </AnimatePresence>
                </div>

                <div className="mt-4 text-xs text-white/20 italic">
                  💡 Uses your browser's text-to-speech engine (Chrome / Edge recommended)
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-white/5">
              <motion.div className="h-full transition-all" style={{ width: `${speaking ? progress : 0}%`, background: chapter.color }} />
            </div>

            {/* Player controls */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-white/6"
              style={{ background: 'hsl(222,47%,6%)' }}>
              <div className="flex items-center gap-3">
                {/* Play/Pause */}
                <button onClick={() => toggle(chapter.script)}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: chapter.color }}>
                  {speaking
                    ? <Pause className="w-4 h-4" style={{ color: 'hsl(222,47%,6%)' }} />
                    : <Play className="w-4 h-4 fill-current ml-0.5" style={{ color: 'hsl(222,47%,6%)' }} />}
                </button>

                {/* Restart */}
                <button onClick={() => restart(chapter.script)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/8 transition-all">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                {/* Mute */}
                <button onClick={toggleMute}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/8 transition-all">
                  {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>

                {/* Speaking indicator */}
                {speaking && (
                  <div className="flex items-center gap-1 ml-1">
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} className="w-0.5 rounded-full"
                        style={{ background: chapter.color }}
                        animate={{ height: ['4px', '14px', '4px'] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
                    ))}
                  </div>
                )}
              </div>

              {/* Chapter nav */}
              <div className="flex items-center gap-3">
                <button onClick={handlePrev} disabled={activeIdx === 0}
                  className="flex items-center gap-1 text-xs text-white/40 hover:text-white/80 disabled:opacity-20 transition-all px-3 py-1.5 rounded-lg hover:bg-white/5">
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>
                <span className="text-xs text-white/30 font-mono">{activeIdx + 1} / {CHAPTERS.length}</span>
                <button onClick={handleNext} disabled={activeIdx === CHAPTERS.length - 1}
                  className="flex items-center gap-1 text-xs text-white/40 hover:text-white/80 disabled:opacity-20 transition-all px-3 py-1.5 rounded-lg hover:bg-white/5">
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}