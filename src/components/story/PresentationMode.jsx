/**
 * PresentationMode — Full-screen slide deck presentation
 * Features animated transitions, narration blocks, keyboard nav
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AnalystChart from '@/components/workspace/analyst/AnalystChart';
import { ChevronLeft, ChevronRight, X, MessageSquare, BookOpen } from 'lucide-react';

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? 80 : -80, opacity: 0, scale: 0.97 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (dir) => ({ x: dir < 0 ? 80 : -80, opacity: 0, scale: 0.97 }),
};

function ChartSlide({ slide }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-12 max-w-5xl mx-auto w-full">
      <div className="text-xs text-cyan-400/60 uppercase tracking-widest mb-3 font-mono">{slide.chart?.type?.replace('_', ' ')} Chart</div>
      <h2 className="text-3xl font-black text-white mb-2 text-center">{slide.title || slide.chart?.title}</h2>
      {slide.chart?.subtitle && <p className="text-white/40 text-sm mb-6 text-center">{slide.chart.subtitle}</p>}
      <div className="w-full flex-1 max-h-96 mt-4">
        <AnalystChart chart={slide.chart} height={340} />
      </div>
    </div>
  );
}

function InsightSlide({ slide }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-16 max-w-4xl mx-auto w-full">
      <div className="w-14 h-14 rounded-2xl bg-purple-400/15 border border-purple-400/25 flex items-center justify-center mb-8">
        <MessageSquare className="w-7 h-7 text-purple-400" />
      </div>
      <h2 className="text-xl font-bold text-purple-400 mb-6 uppercase tracking-widest">{slide.title || 'Key Insight'}</h2>
      <p className="text-2xl text-white/85 leading-relaxed text-center font-light max-w-2xl">
        {slide.text || 'No insight text added yet.'}
      </p>
    </div>
  );
}

export default function PresentationMode({ story, onExit }) {
  const [current, setCurrent] = useState(0);
  const [dir, setDir] = useState(1);
  const [showNarration, setShowNarration] = useState(false);
  const slides = story.slides || [];
  const slide = slides[current];

  const go = (d) => {
    const next = current + d;
    if (next < 0 || next >= slides.length) return;
    setDir(d);
    setCurrent(next);
    setShowNarration(false);
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') go(1);
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') go(-1);
      if (e.key === 'Escape') onExit();
      if (e.key === 'n' || e.key === 'N') setShowNarration(v => !v);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [current, slides.length]);

  if (!slides.length) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'radial-gradient(ellipse 100% 80% at 50% 0%, rgba(0,229,255,0.06) 0%, transparent 60%), hsl(222,47%,5%)' }}>
      
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold text-white/70">{story.title}</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Slide dots */}
          <div className="flex items-center gap-1.5">
            {slides.map((_, i) => (
              <button key={i} onClick={() => { setDir(i > current ? 1 : -1); setCurrent(i); }}
                className={`rounded-full transition-all ${i === current ? 'w-5 h-2 bg-cyan-400' : 'w-2 h-2 bg-white/20 hover:bg-white/40'}`} />
            ))}
          </div>
          <span className="text-xs text-white/30 font-mono">{current + 1} / {slides.length}</span>
          <button onClick={() => setShowNarration(v => !v)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${showNarration ? 'bg-purple-400/15 border-purple-400/30 text-purple-400' : 'border-white/10 text-white/35 hover:text-white/65'}`}>
            <MessageSquare className="w-3 h-3" /> Notes
          </button>
          <button onClick={onExit} className="p-1.5 rounded-lg text-white/35 hover:text-white/80 hover:bg-white/8 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Slide content */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence custom={dir} mode="wait">
          <motion.div
            key={slide.id}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {slide.type === 'chart' ? <ChartSlide slide={slide} /> : <InsightSlide slide={slide} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Narration panel */}
      <AnimatePresence>
        {showNarration && slide.narration && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            className="flex-shrink-0 border-t border-purple-400/20 bg-purple-400/8 px-8 py-4 backdrop-blur-sm"
          >
            <div className="max-w-4xl mx-auto flex items-start gap-3">
              <MessageSquare className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-white/70 leading-relaxed italic">{slide.narration}</p>
            </div>
          </motion.div>
        )}
        {showNarration && !slide.narration && (
          <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
            className="flex-shrink-0 border-t border-white/5 bg-white/3 px-8 py-4">
            <p className="text-sm text-white/30 italic text-center">No narration for this slide. Go back to the Story Builder to add some.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4 py-4 border-t border-white/5 flex-shrink-0">
        <button onClick={() => go(-1)} disabled={current === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/10 text-sm text-white/50 hover:text-white/80 hover:bg-white/5 disabled:opacity-30 transition-all">
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>
        <span className="text-xs text-white/25">← → keys or N for notes</span>
        <button onClick={() => go(1)} disabled={current === slides.length - 1}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-400/10 border border-cyan-400/20 text-sm text-cyan-400 hover:bg-cyan-400/15 disabled:opacity-30 transition-all">
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}