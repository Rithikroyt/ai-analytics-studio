/**
 * SlideComments — Collaborative comment thread for a Story Builder slide
 * Comments are stored per-slide in the story store (slide.comments[])
 * Each comment: { id, author, text, timestamp, resolved, replyTo? }
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, Send, Check, ChevronDown, ChevronRight,
  CornerDownRight, CheckCircle2, X
} from 'lucide-react';

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

function CommentThread({ comment, allComments, onResolve, onReply }) {
  const replies = allComments.filter(c => c.replyTo === comment.id);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [authorName, setAuthorName] = useState('');

  const submitReply = () => {
    if (!replyText.trim()) return;
    onReply(comment.id, replyText.trim(), authorName.trim() || 'Team Member');
    setReplyText('');
    setShowReply(false);
  };

  return (
    <div className={`rounded-xl border p-3 transition-all ${comment.resolved ? 'border-white/5 bg-white/1 opacity-55' : 'border-white/10 bg-white/4'}`}>
      <div className="flex items-start gap-2">
        {/* Avatar */}
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-cyan-400 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5">
          {(comment.author || '?')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-semibold text-white/70">{comment.author || 'Anonymous'}</span>
            <span className="text-xs text-white/25">{timeAgo(comment.timestamp)}</span>
            {comment.resolved && (
              <span className="text-xs text-green-400 flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" /> Resolved
              </span>
            )}
          </div>
          <p className="text-xs text-white/65 leading-relaxed">{comment.text}</p>

          {/* Actions */}
          {!comment.resolved && (
            <div className="flex items-center gap-2 mt-1.5">
              <button onClick={() => setShowReply(v => !v)}
                className="text-xs text-white/30 hover:text-white/60 flex items-center gap-0.5 transition-colors">
                <CornerDownRight className="w-3 h-3" /> Reply
              </button>
              <button onClick={() => onResolve(comment.id)}
                className="text-xs text-white/30 hover:text-green-400 flex items-center gap-0.5 transition-colors">
                <Check className="w-3 h-3" /> Resolve
              </button>
            </div>
          )}

          {/* Reply box */}
          <AnimatePresence>
            {showReply && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="mt-2 overflow-hidden space-y-1.5">
                <input value={authorName} onChange={e => setAuthorName(e.target.value)} placeholder="Your name"
                  className="w-full bg-white/5 border border-white/8 rounded-lg px-2 py-1 text-xs text-foreground placeholder:text-white/25 focus:outline-none focus:border-purple-400/30" />
                <div className="flex gap-1.5">
                  <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Write a reply…" rows={2}
                    className="flex-1 bg-white/5 border border-white/8 rounded-lg px-2 py-1.5 text-xs text-foreground placeholder:text-white/25 focus:outline-none focus:border-purple-400/30 resize-none" />
                  <button onClick={submitReply} disabled={!replyText.trim()}
                    className="px-2 py-1 rounded-lg bg-purple-400/15 border border-purple-400/25 text-purple-400 hover:bg-purple-400/20 transition-all disabled:opacity-40 self-end">
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Nested replies */}
      {replies.length > 0 && (
        <div className="mt-2 pl-4 border-l border-white/8 space-y-2">
          {replies.map(reply => (
            <div key={reply.id} className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-teal-400 to-blue-400 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5">
                {(reply.author || '?')[0].toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-white/60">{reply.author}</span>
                  <span className="text-xs text-white/20">{timeAgo(reply.timestamp)}</span>
                </div>
                <p className="text-xs text-white/55">{reply.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SlideComments({ slideId, comments = [], onAddComment, onResolveComment, onReplyComment }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [author, setAuthor] = useState('');

  const topLevel = comments.filter(c => !c.replyTo);
  const unresolvedCount = topLevel.filter(c => !c.resolved).length;

  const submit = () => {
    if (!text.trim()) return;
    onAddComment({
      id: Date.now().toString(),
      author: author.trim() || 'Team Member',
      text: text.trim(),
      timestamp: new Date().toISOString(),
      resolved: false,
    });
    setText('');
  };

  return (
    <div className="border-t border-white/5 pt-3 mt-1">
      {/* Toggle header */}
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 w-full text-left group">
        <MessageCircle className="w-3.5 h-3.5 text-white/30 group-hover:text-white/55 transition-colors" />
        <span className="text-xs text-white/35 group-hover:text-white/55 transition-colors uppercase tracking-widest">
          Comments
        </span>
        {unresolvedCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-amber-400/15 text-amber-400 text-xs font-semibold">
            {unresolvedCount}
          </span>
        )}
        {comments.length > 0 && (
          open ? <ChevronDown className="w-3 h-3 text-white/25 ml-auto" /> : <ChevronRight className="w-3 h-3 text-white/25 ml-auto" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className="mt-2 space-y-2">
              {/* Existing comments */}
              {topLevel.length === 0 && (
                <div className="text-xs text-white/25 italic py-2 text-center">No comments yet — be the first to leave feedback.</div>
              )}
              {topLevel.map(comment => (
                <CommentThread
                  key={comment.id}
                  comment={comment}
                  allComments={comments}
                  onResolve={onResolveComment}
                  onReply={(parentId, replyText, replyAuthor) =>
                    onReplyComment({ id: Date.now().toString(), author: replyAuthor, text: replyText, timestamp: new Date().toISOString(), resolved: false, replyTo: parentId })
                  }
                />
              ))}

              {/* New comment input */}
              <div className="pt-2 space-y-1.5">
                <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Your name (optional)"
                  className="w-full bg-white/4 border border-white/8 rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-white/20 focus:outline-none focus:border-purple-400/30" />
                <div className="flex gap-1.5">
                  <textarea value={text} onChange={e => setText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) submit(); }}
                    placeholder="Add a comment on this slide… (⌘+Enter to submit)"
                    rows={2}
                    className="flex-1 bg-white/4 border border-white/8 rounded-xl px-2.5 py-2 text-xs text-foreground placeholder:text-white/20 focus:outline-none focus:border-purple-400/30 resize-none"
                  />
                  <button onClick={submit} disabled={!text.trim()}
                    className="self-end p-2 rounded-xl bg-purple-400/15 border border-purple-400/25 text-purple-400 hover:bg-purple-400/20 transition-all disabled:opacity-35">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}