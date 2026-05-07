/**
 * ChartComments — Inline commenting system for dashboard charts
 * Threaded discussion with @mentions, reactions, and resolution
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { MessageSquare, Send, Trash2, CheckCircle2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

const REACTIONS = ['👍', '💡', '⚠️', '❓', '🔥', '✅'];

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ChartComments({ chartId, chartTitle, currentUser }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && !comments.length) fetchComments();
  }, [open]);

  const fetchComments = async () => {
    setLoading(true);
    const data = await base44.entities.ReportComment.filter({ reportId: `chart:${chartId}` }, '-created_date', 50);
    setComments(data);
    setLoading(false);
  };

  const post = async () => {
    if (!text.trim()) return;
    setPosting(true);
    await base44.entities.ReportComment.create({
      reportId: `chart:${chartId}`,
      text: text.trim(),
      authorName: currentUser?.full_name || currentUser?.email || 'Analyst',
      authorEmail: currentUser?.email || '',
    });
    setText('');
    setPosting(false);
    fetchComments();
  };

  const resolve = async (id) => {
    await base44.entities.ReportComment.update(id, { resolved: true });
    fetchComments();
  };

  const del = async (id) => {
    await base44.entities.ReportComment.delete(id);
    fetchComments();
  };

  const react = async (id, emoji) => {
    await base44.entities.ReportComment.update(id, { reaction: emoji });
    fetchComments();
  };

  const active = comments.filter(c => !c.resolved);
  const resolved = comments.filter(c => c.resolved);

  return (
    <div className="border-t border-white/5">
      <button onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium transition-all ${open ? 'text-teal-400 bg-teal-400/5' : 'text-white/30 hover:text-white/60 hover:bg-white/3'}`}>
        <span className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5" />
          Team Discussion
          {active.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-teal-400/15 text-teal-400 font-semibold">{active.length}</span>
          )}
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className="px-4 pb-4 space-y-3 bg-teal-400/[0.015] border-t border-teal-400/10">
              {loading ? (
                <div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 text-teal-400 animate-spin" /></div>
              ) : active.length === 0 && resolved.length === 0 ? (
                <div className="text-center py-4 text-xs text-white/25">No comments yet. Start the discussion.</div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 pt-3">
                  {active.map(comment => (
                    <CommentItem key={comment.id} comment={comment} currentUser={currentUser}
                      onResolve={() => resolve(comment.id)}
                      onDelete={() => del(comment.id)}
                      onReact={(emoji) => react(comment.id, emoji)} />
                  ))}
                  {resolved.length > 0 && (
                    <div className="text-xs text-white/20 flex items-center gap-1.5 pt-1">
                      <CheckCircle2 className="w-3 h-3 text-green-400/40" /> {resolved.length} resolved
                    </div>
                  )}
                </div>
              )}

              {/* Input */}
              <div className="flex gap-2 items-end pt-1">
                <div className="w-6 h-6 rounded-full bg-teal-400/15 border border-teal-400/20 flex items-center justify-center text-xs font-bold text-teal-400 flex-shrink-0">
                  {(currentUser?.full_name?.[0] || currentUser?.email?.[0] || '?').toUpperCase()}
                </div>
                <input
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), post())}
                  placeholder={`Comment on "${chartTitle}"…`}
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-teal-400/30 text-foreground"
                />
                <button onClick={post} disabled={!text.trim() || posting}
                  className="px-2.5 py-2 bg-teal-400/10 border border-teal-400/20 text-teal-400 rounded-xl hover:bg-teal-400/15 disabled:opacity-40 transition-all flex-shrink-0">
                  {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CommentItem({ comment, currentUser, onResolve, onDelete, onReact }) {
  const isOwn = comment.authorEmail === currentUser?.email || comment.created_by === currentUser?.email;
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2 group">
      <div className="w-5 h-5 rounded-full bg-purple-400/15 border border-purple-400/20 flex items-center justify-center text-xs font-bold text-purple-400 flex-shrink-0 mt-0.5">
        {(comment.authorName?.[0] || '?').toUpperCase()}
      </div>
      <div className="flex-1 min-w-0 bg-white/3 border border-white/6 rounded-xl px-3 py-2">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-xs font-semibold text-white/65">{comment.authorName || 'Analyst'}</span>
          <span className="text-xs text-white/20">{timeAgo(comment.created_date)}</span>
          {comment.reaction && <span className="text-sm">{comment.reaction}</span>}
        </div>
        <p className="text-xs text-white/60 leading-relaxed">{comment.text}</p>
        <div className="flex items-center gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-wrap">
          <div className="flex gap-0.5">
            {REACTIONS.map(emoji => (
              <button key={emoji} onClick={() => onReact(emoji)}
                className="text-xs hover:scale-125 transition-transform opacity-50 hover:opacity-100">{emoji}</button>
            ))}
          </div>
          {isOwn && (
            <>
              <button onClick={onResolve} className="text-xs text-green-400/50 hover:text-green-400 transition-colors flex items-center gap-0.5">
                <CheckCircle2 className="w-2.5 h-2.5" /> Resolve
              </button>
              <button onClick={onDelete} className="text-xs text-red-400/40 hover:text-red-400 transition-colors">
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}