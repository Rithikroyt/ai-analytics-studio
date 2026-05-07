import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Reply, Trash2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const REACTIONS = ['👍', '❤️', '🔥', '✅', '⚠️', '💡'];

export default function CommentThread({ comment, allComments, currentUser, reportId, onUpdate, canComment }) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [posting, setPosting] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const replies = allComments.filter(c => c.parentId === comment.id);
  const isOwner = comment.authorEmail === currentUser?.email || comment.created_by === currentUser?.email;
  const timeAgo = (() => {
    const diff = Date.now() - new Date(comment.created_date).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return new Date(comment.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  })();

  const postReply = async () => {
    if (!replyText.trim()) return;
    setPosting(true);
    await base44.entities.ReportComment.create({
      reportId,
      text: replyText.trim(),
      parentId: comment.id,
      authorName: currentUser?.full_name || 'Anonymous',
      authorEmail: currentUser?.email || '',
    });
    setReplyText('');
    setShowReply(false);
    setPosting(false);
    onUpdate();
  };

  const resolve = async () => {
    await base44.entities.ReportComment.update(comment.id, { resolved: true });
    onUpdate();
  };

  const deleteComment = async () => {
    await base44.entities.ReportComment.delete(comment.id);
    onUpdate();
  };

  const addReaction = async (emoji) => {
    await base44.entities.ReportComment.update(comment.id, { reaction: emoji });
    onUpdate();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white/3 border border-white/8 overflow-hidden">
      {/* Main comment */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-purple-400/15 border border-purple-400/20 flex items-center justify-center text-xs font-bold text-purple-400 flex-shrink-0">
            {(comment.authorName?.[0] || comment.authorEmail?.[0] || '?').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-semibold text-white/75">
                {comment.authorName || comment.authorEmail || 'Anonymous'}
              </span>
              <span className="text-xs text-white/25">{timeAgo}</span>
              {comment.reaction && <span className="text-sm">{comment.reaction}</span>}
            </div>
            <p className="text-sm text-white/65 leading-relaxed">{comment.text}</p>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-2.5 flex-wrap">
              {canComment && (
                <button onClick={() => setShowReply(v => !v)}
                  className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors">
                  <Reply className="w-3 h-3" /> Reply
                </button>
              )}
              {/* Reactions */}
              <div className="flex gap-0.5">
                {REACTIONS.map(emoji => (
                  <button key={emoji} onClick={() => addReaction(emoji)}
                    className="text-sm hover:scale-125 transition-transform opacity-40 hover:opacity-100">
                    {emoji}
                  </button>
                ))}
              </div>
              {isOwner && (
                <>
                  <button onClick={resolve}
                    className="flex items-center gap-1 text-xs text-green-400/50 hover:text-green-400 transition-colors">
                    <CheckCircle2 className="w-3 h-3" /> Resolve
                  </button>
                  <button onClick={deleteComment}
                    className="flex items-center gap-1 text-xs text-red-400/40 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </>
              )}
              {replies.length > 0 && (
                <button onClick={() => setExpanded(v => !v)}
                  className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors ml-auto">
                  {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Reply input */}
        <AnimatePresence>
          {showReply && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="mt-3 ml-10 overflow-hidden">
              <div className="flex gap-2">
                <input
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && postReply()}
                  placeholder="Write a reply…"
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-cyan-400/30 text-foreground"
                  autoFocus
                />
                <button onClick={postReply} disabled={!replyText.trim() || posting}
                  className="px-3 py-2 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-xs hover:bg-cyan-400/15 disabled:opacity-40 transition-all">
                  {posting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Post'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Replies */}
      <AnimatePresence>
        {expanded && replies.length > 0 && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="border-t border-white/5 overflow-hidden">
            {replies.map((reply, i) => (
              <div key={reply.id} className={`flex items-start gap-3 px-4 py-3 ${i < replies.length - 1 ? 'border-b border-white/4' : ''}`}>
                <div className="w-6 h-6 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-xs font-bold text-white/50 flex-shrink-0">
                  {(reply.authorName?.[0] || reply.authorEmail?.[0] || '?').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-white/65">{reply.authorName || reply.authorEmail || 'Anonymous'}</span>
                    <span className="text-xs text-white/20">
                      {(() => {
                        const diff = Date.now() - new Date(reply.created_date).getTime();
                        const m = Math.floor(diff / 60000);
                        if (m < 1) return 'just now';
                        if (m < 60) return `${m}m ago`;
                        const h = Math.floor(m / 60);
                        if (h < 24) return `${h}h ago`;
                        return new Date(reply.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      })()}
                    </span>
                  </div>
                  <p className="text-xs text-white/55 leading-relaxed">{reply.text}</p>
                </div>
                {(reply.authorEmail === currentUser?.email || reply.created_by === currentUser?.email) && (
                  <button onClick={async () => { await base44.entities.ReportComment.delete(reply.id); onUpdate(); }}
                    className="text-red-400/30 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}