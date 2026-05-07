/**
 * StoryBuilder — Drag-and-drop presentation builder from saved charts & insights
 * Features:
 *  - Drag charts from saved library into a story sequence
 *  - Add custom insight/narration text slides
 *  - AI-generated transition narration between slides
 *  - Full-screen presentation mode (slide deck)
 */
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useWorkspaceStore } from '@/lib/store';
import { base44 } from '@/api/base44Client';
import AnalystChart from '@/components/workspace/analyst/AnalystChart';
import PresentationMode from '@/components/story/PresentationMode';
import SlideComments from '@/components/story/SlideComments';
import {
  BookOpen, Plus, Trash2, GripVertical, Sparkles, Loader2,
  Play, BarChart2, Type, Eye, ChevronLeft, Save, Pencil, Check, X,
  Library, PlusCircle, ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

// ── Slide type badge ──────────────────────────────────────────────
function SlideTypeBadge({ type }) {
  return type === 'chart'
    ? <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">Chart</span>
    : <span className="text-xs px-2 py-0.5 rounded-full bg-purple-400/10 text-purple-400 border border-purple-400/20">Insight</span>;
}

// ── Chart library panel ───────────────────────────────────────────
function ChartLibrary({ savedCharts, onAdd }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Library className="w-4 h-4 text-cyan-400" /> Chart Library
        </div>
        <div className="text-xs text-white/35 mt-0.5">{savedCharts.length} saved charts</div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {savedCharts.length === 0 && (
          <div className="text-center py-8 text-xs text-white/30">
            <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No saved charts yet.<br />
            <Link to="/workspace" className="text-cyan-400 hover:underline">Go to AI Analyst →</Link>
          </div>
        )}
        {savedCharts.map(item => (
          <div key={item.id} className="group rounded-xl border border-white/8 bg-white/3 p-3 hover:border-cyan-400/25 transition-all">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="text-xs font-medium truncate text-white/80">{item.label || item.chart?.title || 'Chart'}</div>
              <button
                onClick={() => onAdd({ type: 'chart', chartId: item.id, title: item.label || item.chart?.title, chart: item.chart, narration: '' })}
                className="flex-shrink-0 p-1 rounded-lg bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400/20 transition-all opacity-0 group-hover:opacity-100"
                title="Add to story"
              >
                <PlusCircle className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-xs text-white/30 mb-2">{item.datasetName} · {item.chart?.type}</div>
            <AnalystChart chart={item.chart} height={80} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Single slide card in builder ──────────────────────────────────
function SlideCard({ slide, index, onRemove, onUpdateNarration, onUpdateText, onUpdateComments }) {
  const [editingNarration, setEditingNarration] = useState(false);
  const [narration, setNarration] = useState(slide.narration || '');
  const [editingText, setEditingText] = useState(!slide.text && slide.type === 'insight');
  const [text, setText] = useState(slide.text || '');

  const saveNarration = () => { onUpdateNarration(slide.id, narration); setEditingNarration(false); };
  const saveText = () => { onUpdateText(slide.id, text); setEditingText(false); };

  return (
    <div className="rounded-2xl border border-white/8 bg-white/3 p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-white/8 flex items-center justify-center text-xs font-mono text-white/40 flex-shrink-0">{index + 1}</div>
        <SlideTypeBadge type={slide.type} />
        <div className="flex-1 text-sm font-medium truncate">{slide.title || (slide.type === 'insight' ? 'Insight Slide' : 'Chart Slide')}</div>
        <button onClick={() => onRemove(slide.id)} className="p-1.5 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-400/10 transition-all">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {slide.type === 'chart' && slide.chart && (
        <AnalystChart chart={slide.chart} height={120} />
      )}

      {slide.type === 'insight' && (
        <div>
          {editingText ? (
            <div className="space-y-2">
              <textarea
                autoFocus
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Type your insight or data finding…"
                rows={3}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-400/30 resize-none"
              />
              <div className="flex gap-2">
                <button onClick={saveText} className="flex items-center gap-1 text-xs px-2.5 py-1 bg-purple-400/10 border border-purple-400/20 text-purple-400 rounded-lg hover:bg-purple-400/15">
                  <Check className="w-3 h-3" /> Save
                </button>
                <button onClick={() => setEditingText(false)} className="text-xs px-2.5 py-1 text-white/40 hover:text-white/70 rounded-lg border border-white/8">Cancel</button>
              </div>
            </div>
          ) : (
            <div
              className="text-sm text-white/60 bg-purple-400/5 border border-purple-400/15 rounded-xl p-3 cursor-pointer hover:border-purple-400/30 transition-all min-h-12"
              onClick={() => setEditingText(true)}
            >
              {text || <span className="text-white/25 italic">Click to add insight text…</span>}
            </div>
          )}
        </div>
      )}

      {/* Narration block */}
      <div className="border-t border-white/5 pt-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-white/30 uppercase tracking-widest">AI Narration</span>
          {!editingNarration && (
            <button onClick={() => setEditingNarration(true)} className="text-xs text-white/30 hover:text-white/60 transition-colors">
              <Pencil className="w-3 h-3" />
            </button>
          )}
        </div>
        {editingNarration ? (
          <div className="space-y-2">
            <textarea
              autoFocus
              value={narration}
              onChange={e => setNarration(e.target.value)}
              placeholder="Add narration for presenters…"
              rows={2}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cyan-400/30 resize-none"
            />
            <div className="flex gap-2">
              <button onClick={saveNarration} className="flex items-center gap-1 text-xs px-2.5 py-1 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-lg">
                <Check className="w-3 h-3" /> Save
              </button>
              <button onClick={() => setEditingNarration(false)} className="text-xs px-2.5 py-1 text-white/40 rounded-lg border border-white/8">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="text-xs text-white/35 italic cursor-pointer hover:text-white/55" onClick={() => setEditingNarration(true)}>
            {narration || <span className="text-white/20">No narration — click to add or use AI Generate</span>}
          </div>
        )}
      </div>

      {/* Collaborative comments */}
      <SlideComments
        slideId={slide.id}
        comments={slide.comments || []}
        onAddComment={(comment) => onUpdateComments(slide.id, [...(slide.comments || []), comment])}
        onResolveComment={(id) => onUpdateComments(slide.id, (slide.comments || []).map(c => c.id === id ? { ...c, resolved: true } : c))}
        onReplyComment={(reply) => onUpdateComments(slide.id, [...(slide.comments || []), reply])}
      />
      </div>
      );
      }

// ── Narrative Editor panel ────────────────────────────────────────
function NarrativeEditor({ story, onUpdate }) {
  const [text, setText] = useState(story?.executiveSummary || '');
  const [saved, setSaved] = useState(false);
  const save = () => { onUpdate(text); setSaved(true); setTimeout(() => setSaved(false), 1500); };
  return (
    <div className="px-4 py-3 border-b border-white/5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">Findings Narrative</span>
        <button onClick={save} className={`text-xs px-2 py-0.5 rounded-lg transition-all ${saved ? 'text-green-400 bg-green-400/10' : 'text-white/30 hover:text-cyan-400 hover:bg-cyan-400/10'}`}>
          {saved ? '✓ Saved' : 'Save'}
        </button>
      </div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Write your executive summary, key findings, or presenter notes here…"
        rows={5}
        className="w-full px-3 py-2 bg-white/4 border border-white/8 rounded-xl text-xs text-foreground placeholder:text-white/20 focus:outline-none focus:border-purple-400/30 resize-none leading-relaxed"
      />
      {text && (
        <div className="text-xs text-white/20 mt-1">{text.split(/\s+/).filter(Boolean).length} words</div>
      )}
    </div>
  );
}

// ── Story title editor ────────────────────────────────────────────
function StoryTitleEditor({ title, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(title);
  const save = () => { onSave(val); setEditing(false); };
  if (editing) return (
    <div className="flex items-center gap-2">
      <input autoFocus value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save(); }} className="bg-white/8 border border-white/15 rounded-lg px-3 py-1.5 text-lg font-bold focus:outline-none focus:border-cyan-400/40 text-foreground w-64" />
      <button onClick={save} className="text-cyan-400"><Check className="w-4 h-4" /></button>
      <button onClick={() => setEditing(false)} className="text-white/40"><X className="w-4 h-4" /></button>
    </div>
  );
  return (
    <button onClick={() => setEditing(true)} className="flex items-center gap-2 group">
      <h1 className="text-xl font-bold">{title}</h1>
      <Pencil className="w-3.5 h-3.5 text-white/25 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

// ── Main StoryBuilder ─────────────────────────────────────────────
export default function StoryBuilder() {
  const { savedCharts, stories, addStory, updateStory, removeStory } = useWorkspaceStore();
  const [activeStoryId, setActiveStoryId] = useState(stories[0]?.id || null);
  const [presentationMode, setPresentationMode] = useState(false);
  const [generatingNarration, setGeneratingNarration] = useState(false);

  const activeStory = stories.find(s => s.id === activeStoryId) || null;
  const slides = activeStory?.slides || [];

  const createNewStory = () => {
    const newStory = { title: 'Untitled Story', slides: [] };
    addStory(newStory);
    // The store assigns an id — find it from the next render
    setTimeout(() => {
      const { stories } = useWorkspaceStore.getState();
      if (stories.length > 0) setActiveStoryId(stories[stories.length - 1].id);
    }, 50);
  };

  const updateSlides = useCallback((newSlides) => {
    if (!activeStoryId) return;
    updateStory(activeStoryId, { slides: newSlides });
  }, [activeStoryId, updateStory]);

  const addChartSlide = (slideData) => {
    const newSlide = { ...slideData, id: Date.now().toString() };
    updateSlides([...slides, newSlide]);
  };

  const addInsightSlide = () => {
    updateSlides([...slides, { id: Date.now().toString(), type: 'insight', title: 'Insight Slide', text: '', narration: '' }]);
  };

  const removeSlide = (id) => updateSlides(slides.filter(s => s.id !== id));

  const updateNarration = (id, narration) => {
    updateSlides(slides.map(s => s.id === id ? { ...s, narration } : s));
  };

  const updateText = (id, text) => {
    updateSlides(slides.map(s => s.id === id ? { ...s, text } : s));
  };

  const updateComments = (id, comments) => {
    updateSlides(slides.map(s => s.id === id ? { ...s, comments } : s));
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = Array.from(slides);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    updateSlides(reordered);
  };

  const generateAllNarration = async () => {
    if (!activeStory || slides.length === 0) return;
    setGeneratingNarration(true);
    const slideDescriptions = slides.map((s, i) =>
      `Slide ${i + 1}: ${s.type === 'chart' ? `Chart titled "${s.title || s.chart?.title}" (${s.chart?.type} chart)` : `Insight: "${s.text?.slice(0, 100)}"`}`
    ).join('\n');
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a data storytelling expert. Generate concise, engaging presenter narration for each slide in this data presentation.
Story title: "${activeStory.title}"
Slides:
${slideDescriptions}

For each slide, write 1-2 sentences of narration that a presenter would say while displaying it. Keep it professional and insight-focused.
Return JSON with a "narrations" array (one string per slide, in order).`,
      response_json_schema: {
        type: 'object',
        properties: { narrations: { type: 'array', items: { type: 'string' } } },
      },
    });
    if (result?.narrations) {
      const updatedSlides = slides.map((s, i) => ({ ...s, narration: result.narrations[i] || s.narration }));
      updateSlides(updatedSlides);
    }
    setGeneratingNarration(false);
  };

  if (presentationMode && activeStory) {
    return <PresentationMode story={activeStory} onExit={() => setPresentationMode(false)} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-3 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/dashboards" className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-all">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="w-8 h-8 rounded-xl bg-purple-400/10 border border-purple-400/20 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-purple-400" />
          </div>
          {activeStory ? (
            <StoryTitleEditor title={activeStory.title} onSave={(t) => updateStory(activeStoryId, { title: t })} />
          ) : (
            <h1 className="text-xl font-bold text-white/50">Story Builder</h1>
          )}
          {/* Story switcher */}
          <div className="flex items-center gap-1 ml-4">
            {stories.map(s => (
              <button key={s.id} onClick={() => setActiveStoryId(s.id)}
                className={`text-xs px-2.5 py-1 rounded-lg transition-all ${s.id === activeStoryId ? 'bg-purple-400/15 text-purple-400 border border-purple-400/25' : 'text-white/35 hover:text-white/65 hover:bg-white/5 border border-transparent'}`}>
                {s.title}
              </button>
            ))}
            <button onClick={createNewStory} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg text-white/30 hover:text-white/65 hover:bg-white/5 border border-dashed border-white/15 transition-all">
              <Plus className="w-3 h-3" /> New
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeStory && slides.length > 0 && (
            <>
              <button
                onClick={generateAllNarration}
                disabled={generatingNarration}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-purple-400/10 border border-purple-400/20 text-purple-400 hover:bg-purple-400/15 transition-all disabled:opacity-50"
              >
                {generatingNarration ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating…</> : <><Sparkles className="w-3 h-3" /> AI Narrate All</>}
              </button>
              <button
                onClick={() => setPresentationMode(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-cyan-400 text-navy-900 font-bold hover:bg-cyan-300 transition-all"
                style={{ color: 'hsl(222,47%,6%)' }}
              >
                <Play className="w-3 h-3" /> Present
              </button>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      {!activeStory ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-400/10 border border-purple-400/20 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-7 h-7 text-purple-400" />
            </div>
            <h2 className="text-lg font-bold mb-2">No stories yet</h2>
            <p className="text-sm text-muted-foreground mb-5">Create a story to start building your data presentation.</p>
            <button onClick={createNewStory} className="flex items-center gap-2 px-5 py-2.5 bg-purple-400/10 border border-purple-400/20 text-purple-400 rounded-xl text-sm font-semibold hover:bg-purple-400/15 transition-all mx-auto">
              <Plus className="w-4 h-4" /> Create First Story
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: chart library */}
          <div className="w-64 flex-shrink-0 border-r border-white/5 overflow-hidden flex flex-col">
            <ChartLibrary savedCharts={savedCharts} onAdd={addChartSlide} />
          </div>

          {/* Center: slide sequence */}
          <div className="flex-1 overflow-y-auto p-5 min-w-0">
            <div className="max-w-2xl mx-auto space-y-3">
              {/* Add insight button */}
              <div className="flex items-center gap-2 mb-4">
                <button onClick={addInsightSlide} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-dashed border-purple-400/30 text-purple-400 hover:bg-purple-400/8 transition-all">
                  <Type className="w-3 h-3" /> Add Insight Slide
                </button>
                <span className="text-xs text-white/25">{slides.length} slide{slides.length !== 1 ? 's' : ''}</span>
              </div>

              {slides.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-white/8 rounded-2xl">
                  <BarChart2 className="w-10 h-10 text-white/15 mb-3" />
                  <div className="text-sm text-white/30 mb-2">No slides yet</div>
                  <div className="text-xs text-white/20">Click <span className="text-cyan-400">+</span> on any chart in the library to add it, or add an Insight Slide above.</div>
                </div>
              )}

              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="slides">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                      {slides.map((slide, i) => (
                        <Draggable key={slide.id} draggableId={slide.id} index={i}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`transition-shadow ${snapshot.isDragging ? 'shadow-2xl shadow-purple-400/20 scale-[1.01]' : ''}`}
                            >
                              <div className="flex items-stretch gap-2">
                                <div {...provided.dragHandleProps} className="flex items-center px-1 text-white/20 hover:text-white/50 cursor-grab active:cursor-grabbing">
                                  <GripVertical className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                  <SlideCard
                                    slide={slide}
                                    index={i}
                                    onRemove={removeSlide}
                                    onUpdateNarration={updateNarration}
                                    onUpdateText={updateText}
                                    onUpdateComments={updateComments}
                                  />
                                </div>
                              </div>
                              {/* Arrow between slides */}
                              {i < slides.length - 1 && (
                                <div className="flex justify-center my-1">
                                  <ArrowRight className="w-3.5 h-3.5 text-white/15 rotate-90" />
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          </div>

          {/* Right: narrative editor + slide map */}
          <div className="w-64 flex-shrink-0 border-l border-white/5 overflow-y-auto flex flex-col">
            {/* Narrative / findings editor */}
            <NarrativeEditor story={activeStory} onUpdate={(text) => updateStory(activeStoryId, { executiveSummary: text })} />

            <div className="px-4 pt-3 text-xs text-white/35 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Eye className="w-3 h-3" /> Slide Map
            </div>
            <div className="space-y-2">
              {slides.map((s, i) => {
                const unresolvedComments = (s.comments || []).filter(c => !c.resolved && !c.replyTo).length;
                return (
                  <div key={s.id} className="rounded-lg border border-white/8 bg-white/2 p-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs font-mono text-white/25">{i + 1}</span>
                      <SlideTypeBadge type={s.type} />
                      {unresolvedComments > 0 && (
                        <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full bg-amber-400/15 text-amber-400 font-semibold leading-none">
                          {unresolvedComments}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-white/45 truncate">{s.title || s.text?.slice(0, 30) || '—'}</div>
                  </div>
                );
              })}
            </div>
            {slides.length > 0 && (
              <button onClick={() => setPresentationMode(true)}
                className="mt-4 mx-4 mb-4 w-[calc(100%-2rem)] flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-cyan-400 text-xs font-bold hover:bg-cyan-300 transition-all"
                style={{ color: 'hsl(222,47%,6%)' }}>
                <Play className="w-3 h-3" /> Present
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}