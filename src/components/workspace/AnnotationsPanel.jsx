/**
 * AnnotationsPanel — Shared workspace annotations + live presence
 * Collaborative threads on charts, live user cursors simulation
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useWorkspaceStore } from '@/lib/store';
import {
  MessageSquare, Plus, X, Send, Users, Trash2,
  Pin, CheckCircle2, Circle, ChevronDown, ChevronRight, Loader2
} from 'lucide-react';

// Simulated live collaborators (in production, use real-time subscriptions)
const DEMO_USERS = [
  { id: 'u1', name: 'Sarah K.', color: '#00e5ff', initials: 'SK' },
  { id: 'u2', name: 'Marcus T.', color: '#9c27b0', initials: 'MT' },
  { id: 'u3', name: 'Priya N.', color: '#ff6b35', initials: 'PN' },
];

function UserAvatar({ user, size = 'sm' }) {
  const sz = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm';
  return (
    <div className={`${sz} rounded-full flex items-center justify-center font-bold flex-shrink-0`}
      style={{ background: user.color + '33', border: `2px solid ${user.color}`, color: user.color }}>
      {user.initials}
    </div>
  );
}

function AnnotationThread({ thread, onReply, onResolve, onDelete, currentUser }) {
  const [open, setOpen] = useState(true);
  const [reply, setReply] = useState('');
  const [posting, setPosting] = useState(false);

  const handleReply = async () => {
    if (!reply.trim()) return;
    setPosting(true);
    await onReply(thread.id, reply.trim());
    setReply('');
    setPosting(false);
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border overflow-hidden ${thread.resolved ? 'border-green-400/15 bg-green-400/3' : 'border-white/10 bg-white/3'}`}>
      {/* Thread header */}
      <div className="flex items-start gap-2.5 p-3">
        <UserAvatar user={thread.author} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold">{thread.author.name}</span>
              <span className="text-xs text-white/30">{thread.location}</span>
              {thread.resolved && <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-400/15 text-green-400">Resolved</span>}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setOpen(o => !o)} className="text-white/30 hover:text-white/60 transition-colors p-0.5">
                {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => onResolve(thread.id)} className="text-white/30 hover:text-green-400 transition-colors p-0.5" title="Resolve">
                {thread.resolved ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Circle className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => onDelete(thread.id)} className="text-white/20 hover:text-red-400 transition-colors p-0.5">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
          {open && <p className="text-xs text-white/65 mt-1 leading-relaxed">{thread.text}</p>}
        </div>
      </div>

      {/* Replies */}
      <AnimatePresence>
        {open && thread.replies?.length > 0 && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="pl-8 pr-3 pb-2 space-y-2 border-t border-white/5 pt-2">
              {thread.replies.map((r, i) => (
                <div key={i} className="flex items-start gap-2">
                  <UserAvatar user={r.author} size="sm" />
                  <div>
                    <span className="text-xs font-semibold text-white/60">{r.author.name} </span>
                    <span className="text-xs text-white/50 leading-relaxed">{r.text}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply input */}
      {open && !thread.resolved && (
        <div className="flex items-center gap-2 px-3 pb-3">
          <input
            value={reply}
            onChange={e => setReply(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleReply(); }}
            placeholder="Reply…"
            className="flex-1 px-2.5 py-1.5 bg-white/5 border border-white/8 rounded-lg text-xs focus:outline-none focus:border-cyan-400/25"
          />
          <button onClick={handleReply} disabled={!reply.trim() || posting}
            className="p-1.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-lg hover:bg-cyan-400/15 disabled:opacity-40 transition-all">
            {posting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default function AnnotationsPanel({ chartTitle = '' }) {
  const { analysisResults } = useWorkspaceStore();
  const [threads, setThreads] = useState(() => [
    {
      id: '1',
      author: DEMO_USERS[0],
      location: '· Revenue Trend',
      text: 'The October spike looks like a one-time promotion effect. Recommend excluding from forecast baseline.',
      replies: [{ author: DEMO_USERS[1], text: 'Agree — should flag in the board memo too.' }],
      resolved: false,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: '2',
      author: DEMO_USERS[2],
      location: '· Segment Breakdown',
      text: 'Enterprise segment is 47% of revenue but only 12% of accounts. We should double down here.',
      replies: [],
      resolved: false,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ]);
  const [newText, setNewText] = useState('');
  const [newLocation, setNewLocation] = useState(chartTitle || 'General');
  const [showNew, setShowNew] = useState(false);
  const [onlineUsers] = useState(DEMO_USERS.slice(0, 2)); // simulate 2 online

  const addThread = () => {
    if (!newText.trim()) return;
    const me = { id: 'me', name: 'You', color: '#00e5ff', initials: 'ME' };
    setThreads(t => [{
      id: Date.now().toString(),
      author: me,
      location: `· ${newLocation}`,
      text: newText.trim(),
      replies: [],
      resolved: false,
      createdAt: new Date().toISOString(),
    }, ...t]);
    setNewText('');
    setShowNew(false);
  };

  const handleReply = async (threadId, text) => {
    const me = { id: 'me', name: 'You', color: '#00e5ff', initials: 'ME' };
    setThreads(t => t.map(thread =>
      thread.id === threadId
        ? { ...thread, replies: [...(thread.replies || []), { author: me, text }] }
        : thread
    ));
  };

  const handleResolve = (id) => {
    setThreads(t => t.map(thread => thread.id === id ? { ...thread, resolved: !thread.resolved } : thread));
  };

  const handleDelete = (id) => {
    setThreads(t => t.filter(thread => thread.id !== id));
  };

  const unresolvedCount = threads.filter(t => !t.resolved).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-sm">Annotations</span>
          {unresolvedCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-400/15 text-amber-400 border border-amber-400/20">{unresolvedCount}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Live presence */}
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-white/35">{onlineUsers.length} online</span>
          </div>
          <div className="flex -space-x-1">
            {onlineUsers.map(u => (
              <div key={u.id} className="w-6 h-6 rounded-full border-2 border-background flex items-center justify-center text-xs font-bold"
                style={{ background: u.color + '33', borderColor: u.color, color: u.color }}>
                {u.initials}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* New annotation */}
      <div className="px-4 py-3 border-b border-white/5 flex-shrink-0">
        <AnimatePresence>
          {showNew ? (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
              <div className="flex gap-2">
                <input value={newLocation} onChange={e => setNewLocation(e.target.value)}
                  placeholder="Chart / section name"
                  className="w-28 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none focus:border-cyan-400/25" />
                <input value={newText} onChange={e => setNewText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) addThread(); }}
                  placeholder="Add annotation…"
                  className="flex-1 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none focus:border-cyan-400/25" />
              </div>
              <div className="flex gap-1.5">
                <button onClick={addThread} disabled={!newText.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-lg text-xs font-semibold hover:bg-cyan-400/15 disabled:opacity-40 transition-all">
                  <Pin className="w-3 h-3" /> Add Note
                </button>
                <button onClick={() => setShowNew(false)} className="px-2.5 py-1.5 text-xs text-white/40 hover:text-white/70 rounded-lg border border-white/8 hover:bg-white/5 transition-all">
                  Cancel
                </button>
              </div>
            </motion.div>
          ) : (
            <button onClick={() => setShowNew(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-white/15 hover:border-cyan-400/30 hover:bg-cyan-400/3 text-xs text-white/35 hover:text-white/60 transition-all">
              <Plus className="w-3.5 h-3.5" /> Add annotation to chart or analysis
            </button>
          )}
        </AnimatePresence>
      </div>

      {/* Threads */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {threads.length === 0 ? (
          <div className="text-center py-10 text-white/25 text-xs">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No annotations yet. Add the first one above.
          </div>
        ) : (
          threads.map(thread => (
            <AnnotationThread key={thread.id} thread={thread}
              onReply={handleReply} onResolve={handleResolve} onDelete={handleDelete} />
          ))
        )}
      </div>

      {/* Share workspace link */}
      <div className="px-4 py-3 border-t border-white/5 flex-shrink-0">
        <button
          onClick={() => {
            const url = window.location.href;
            navigator.clipboard?.writeText(url);
          }}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs text-white/35 hover:text-white/60 border border-white/8 rounded-xl hover:bg-white/4 transition-all">
          <Users className="w-3.5 h-3.5" /> Copy workspace link to invite collaborators
        </button>
      </div>
    </div>
  );
}