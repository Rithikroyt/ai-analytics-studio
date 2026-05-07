/**
 * StoryBuilderTour — Guided interactive tour for new users
 * Highlights specific UI areas with an overlay and tooltip
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Sparkles, BookOpen, BarChart2, Type, Play } from 'lucide-react';

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Story Builder! 👋',
    body: 'Story Builder lets you create stunning data-driven presentations from your saved charts. This tour will walk you through building your first story in 5 easy steps.',
    icon: BookOpen,
    color: 'text-purple-400',
    highlight: null,
    position: 'center',
  },
  {
    id: 'new_story',
    title: 'Step 1 — Create a Story',
    body: 'Click the "+ New" button in the header to create a blank story. Give it a meaningful title like "Q2 Sales Review" or "Executive Board Presentation".',
    icon: Sparkles,
    color: 'text-cyan-400',
    highlight: 'new-story-btn',
    position: 'bottom',
  },
  {
    id: 'chart_library',
    title: 'Step 2 — Add Charts from the Library',
    body: 'Your saved charts appear in the left panel. Hover over any chart and click the "+" icon to add it as a slide. Save charts from the AI Analyst first if the library is empty.',
    icon: BarChart2,
    color: 'text-teal-400',
    highlight: 'chart-library',
    position: 'right',
  },
  {
    id: 'insight_slide',
    title: 'Step 3 — Add Insight Slides',
    body: 'Click "Add Insight Slide" to insert a text-based narrative slide. Use these to add context, conclusions, or key findings between your charts.',
    icon: Type,
    color: 'text-amber-400',
    highlight: 'insight-btn',
    position: 'bottom',
  },
  {
    id: 'ai_narrate',
    title: 'Step 4 — AI Narrate All Slides',
    body: 'Click "AI Narrate All" to auto-generate professional presenter narration for every slide. You can also edit narrations manually per slide.',
    icon: Sparkles,
    color: 'text-purple-400',
    highlight: 'ai-narrate-btn',
    position: 'bottom',
  },
  {
    id: 'present',
    title: 'Step 5 — Present Your Story',
    body: 'Click the "Present" button to enter full-screen presentation mode. Use arrow keys or buttons to navigate slides and read narrations as you go.',
    icon: Play,
    color: 'text-green-400',
    highlight: 'present-btn',
    position: 'bottom',
  },
];

const STORAGE_KEY = 'omnidata_story_tour_done';

export default function StoryBuilderTour() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      setTimeout(() => setVisible(true), 800);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, '1');
  };

  const current = STEPS[step];
  const Icon = current.icon;
  const isCenter = current.position === 'center';
  const isLast = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm pointer-events-none"
          />

          {/* Tour card */}
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.2 }}
            className={`fixed z-50 w-80 glass-card rounded-2xl border border-white/15 shadow-2xl p-5 ${
              isCenter ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : 'top-32 left-1/2 -translate-x-1/2'
            }`}
          >
            {/* Progress dots */}
            <div className="flex items-center gap-1.5 mb-4">
              {STEPS.map((_, i) => (
                <div key={i} className={`h-1 rounded-full transition-all duration-300 ${
                  i === step ? 'w-5 bg-purple-400' : i < step ? 'w-2 bg-purple-400/40' : 'w-2 bg-white/10'
                }`} />
              ))}
              <button onClick={dismiss} className="ml-auto p-1 text-white/30 hover:text-white/70 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className={`w-9 h-9 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center mb-3`}>
              <Icon className={`w-4.5 h-4.5 ${current.color}`} />
            </div>

            <h3 className="font-bold text-sm mb-2">{current.title}</h3>
            <p className="text-xs text-white/60 leading-relaxed mb-5">{current.body}</p>

            <div className="flex items-center justify-between">
              <span className="text-xs text-white/25">{step + 1} of {STEPS.length}</span>
              <div className="flex gap-2">
                {step > 0 && (
                  <button onClick={() => setStep(s => s - 1)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-white/40 hover:text-white/80 border border-white/10 rounded-lg hover:bg-white/5 transition-all">
                    <ChevronLeft className="w-3 h-3" /> Back
                  </button>
                )}
                {isLast ? (
                  <button onClick={dismiss}
                    className="flex items-center gap-1 px-4 py-1.5 text-xs font-semibold bg-purple-400 rounded-lg hover:bg-purple-300 transition-all"
                    style={{ color: 'hsl(222,47%,6%)' }}>
                    Get Started!
                  </button>
                ) : (
                  <button onClick={() => setStep(s => s + 1)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-purple-400/15 border border-purple-400/25 text-purple-400 rounded-lg hover:bg-purple-400/20 transition-all">
                    Next <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook to reset the tour (useful for a "Restart Tour" button)
export function resetTour() {
  localStorage.removeItem(STORAGE_KEY);
}