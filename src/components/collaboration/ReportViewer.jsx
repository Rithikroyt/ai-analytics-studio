import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import CommentThread from '@/components/collaboration/CommentThread';
import {
  X, Globe, Lock, Users, MessageSquare, Copy, CheckCircle2,
  Edit3, Loader2, Share2, ChevronRight, Shield, Clock, User
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const TYPE_META = {
  executive: { label: 'Executive Summary', color: '#00e5ff', icon: '📄' },
  board: { label: 'Board Memo', color: '#a855f7', icon: '🏛️' },
  kpi_trend: { label: 'KPI & Trends', color: '#2dd4bf', icon: '📈' },
  anomaly: { label: 'Anomaly Report', color: '#fbbf24', icon: '⚠️' },
  forecast: { label: 'Forecast', color: '#60a5fa', icon: '🔮' },
  quality: { label: 'Quality Audit', color: '#ffffff80', icon: '🔍' },
  feedback: { label: 'Feedback Insights', color: '#f472b6', icon: '💬' },
  custom: { label: 'Custom Report', color: '#4ade80', icon: '📊' },
};

const ACCESS_LABELS = { view: 'View only', comment: 'Can comment', edit: 'Can edit' };

export default function ReportViewer({ report, currentUser, onClose, onUpdate }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [tab, setTab] = useState('content'); // content | comments | members
  const [copied, setCopied] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState(report.content || '');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  const isOwner = report.created_by === currentUser?.email;
  const canComment = report.accessLevel === 'comment' || report.accessLevel === 'edit' || isOwner;
  const canEdit = report.accessLevel === 'edit' || isOwner;
  const meta = TYPE_META[report.reportType] || TYPE_META.custom;

  useEffect(() => {
    fetchComments();
  }, [report.id]);

  const fetchComments = async () => {
    const data = await base44.entities.ReportComment.filter({ reportId: report.id }, '-created_date', 100);
    setComments(data);
  };

  const postComment = async () => {
    if (!newComment.trim()) return;
    setPosting(true);
    await base44.entities.ReportComment.create({
      reportId: report.id,
      text: newComment.trim(),
      authorName: currentUser?.full_name || 'Anonymous',
      authorEmail: currentUser?.email || '',
    });
    setNewComment('');
    setPosting(false);
    fetchComments();
  };

  const saveContent = async () => {
    setSaving(true);
    await base44.entities.SharedReport.update(report.id, { content: editContent });
    setSaving(false);
    setEditMode(false);
    onUpdate();
  };

  const copyLink = () => {
    const link = `${window.location.origin}/collaboration?token=${report.shareToken}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const topComments = comments.filter(c => !c.parentId && !c.resolved);
  const resolvedCount = comments.filter(c => c.resolved).length;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-stretch bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ x: 80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="ml-auto w-full max-w-3xl flex flex-col h-full glass-card border-l border-white/10 shadow-2xl overflow-hidden"
        style={{ background: 'hsl(222,47%,6%)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-white/8 flex-shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <span className="text-2xl flex-shrink-0 mt-0.5">{meta.icon}</span>
            <div className="min-w-0">
              <h2 className="font-bold text-base truncate">{report.title}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs font-medium" style={{ color: meta.color }}>{meta.label}</span>
                <span className="text-white/20">·</span>
                {report.isPublic
                  ? <span className="flex items-center gap-1 text-xs text-green-400"><Globe className="w-2.5 h-2.5" /> Public</span>
                  : <span className="flex items-center gap-1 text-xs text-white/40"><Lock className="w-2.5 h-2.5" /> Private</span>
                }
                <span className="text-white/20">·</span>
                <span className="text-xs text-white/35">{ACCESS_LABELS[report.accessLevel]}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            <button onClick={copyLink}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${copied ? 'text-green-400 border-green-400/25 bg-green-400/8' : 'text-white/50 border-white/10 hover:bg-white/5'}`}>
              {copied ? <><CheckCircle2 className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy Link</>}
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white/80 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 px-6 border-b border-white/5 flex-shrink-0">
          {[
            ['content', 'Report', null],
            ['comments', 'Comments', topComments.length || null],
            ['members', 'Members & Access', null],
          ].map(([id, label, badge]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-all ${tab === id ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-white/35 hover:text-white/65'}`}>
              {label}
              {badge > 0 && <span className="px-1.5 py-0.5 rounded-full bg-cyan-400/15 text-cyan-400 text-xs">{badge}</span>}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'content' && (
            <div className="p-6 space-y-4">
              {report.description && (
                <p className="text-sm text-white/55 leading-relaxed border-b border-white/5 pb-4">{report.description}</p>
              )}
              {/* Meta strip */}
              <div className="flex flex-wrap gap-3 text-xs">
                {report.tableName && <span className="flex items-center gap-1 text-white/35"><Shield className="w-3 h-3" /> {report.tableName}</span>}
                {report.qualityScore && <span className="text-green-400">{report.qualityScore}% quality</span>}
                <span className="flex items-center gap-1 text-white/25"><Clock className="w-3 h-3" /> {new Date(report.created_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                {report.created_by && <span className="flex items-center gap-1 text-white/25"><User className="w-3 h-3" /> {report.created_by}</span>}
              </div>

              {/* Edit / view content */}
              {canEdit && (
                <div className="flex justify-end">
                  {editMode ? (
                    <div className="flex gap-2">
                      <button onClick={() => setEditMode(false)} className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:bg-white/5 transition-all">Cancel</button>
                      <button onClick={saveContent} disabled={saving}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-cyan-400/15 border border-cyan-400/25 text-cyan-400 hover:bg-cyan-400/20 transition-all disabled:opacity-50">
                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Save
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setEditMode(true)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/5 transition-all">
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                  )}
                </div>
              )}

              {editMode ? (
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={20}
                  className="w-full px-4 py-3 bg-white/4 border border-white/10 rounded-xl text-sm font-mono focus:outline-none focus:border-cyan-400/30 text-foreground resize-none leading-relaxed"
                />
              ) : report.content ? (
                <div className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed text-white/75">
                  <ReactMarkdown>{report.content}</ReactMarkdown>
                </div>
              ) : (
                <div className="text-center py-12 text-white/25 text-sm">
                  No content added yet.{canEdit && ' Click Edit to add report content.'}
                </div>
              )}
            </div>
          )}

          {tab === 'comments' && (
            <div className="p-6 space-y-4">
              {/* Status summary bar */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/6 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-amber-400 font-semibold">{topComments.length} open</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="w-3 h-3 text-green-400" />
                  <span className="text-green-400 font-semibold">{resolvedCount} resolved</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-white/30 ml-auto">
                  <MessageSquare className="w-3 h-3" />
                  {comments.length} total threads
                </div>
                {resolvedCount > 0 && (
                  <button onClick={() => setTab('resolved')} className="text-xs text-white/35 hover:text-white/65 underline transition-colors">
                    View resolved
                  </button>
                )}
              </div>
              {topComments.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-8 h-8 text-white/15 mx-auto mb-3" />
                  <p className="text-sm text-white/30">No comments yet.</p>
                  {canComment && <p className="text-xs text-white/20 mt-1">Be the first to leave a comment.</p>}
                </div>
              ) : (
                <div className="space-y-3">
                  {topComments.map(comment => (
                    <CommentThread
                      key={comment.id}
                      comment={comment}
                      allComments={comments}
                      currentUser={currentUser}
                      reportId={report.id}
                      onUpdate={fetchComments}
                      canComment={canComment}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'members' && (
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                {/* Owner */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/8">
                  <div className="w-8 h-8 rounded-full bg-cyan-400/15 border border-cyan-400/20 flex items-center justify-center text-xs font-bold text-cyan-400">
                    {report.created_by?.[0]?.toUpperCase() || 'O'}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{report.created_by}</div>
                    <div className="text-xs text-white/35">Owner</div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">Owner</span>
                </div>
                {/* Invited */}
                {report.invitedEmails?.map(email => (
                  <div key={email} className="flex items-center gap-3 p-3 rounded-xl bg-white/2 border border-white/6">
                    <div className="w-8 h-8 rounded-full bg-teal-400/10 border border-teal-400/15 flex items-center justify-center text-xs font-bold text-teal-400">
                      {email[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-white/70">{email}</div>
                      <div className="text-xs text-white/35">Invited member</div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/10">
                      {ACCESS_LABELS[report.accessLevel]}
                    </span>
                  </div>
                ))}
                {(!report.invitedEmails?.length) && (
                  <p className="text-xs text-white/25 text-center py-4">No additional members invited.</p>
                )}
              </div>
              {/* Share link */}
              {report.isPublic && (
                <div className="p-4 rounded-xl bg-green-400/5 border border-green-400/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-xs font-semibold text-green-400">Public Share Link</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-white/50 bg-white/5 rounded px-2 py-1 flex-1 truncate font-mono">
                      {window.location.origin}/collaboration?token={report.shareToken}
                    </code>
                    <button onClick={copyLink}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all flex-shrink-0 ${copied ? 'text-green-400 border-green-400/25' : 'text-white/50 border-white/10 hover:bg-white/5'}`}>
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Comment input */}
        {tab === 'comments' && canComment && (
          <div className="px-6 py-4 border-t border-white/8 flex-shrink-0">
            <div className="flex gap-2.5 items-end">
              <div className="w-7 h-7 rounded-full bg-cyan-400/15 border border-cyan-400/20 flex items-center justify-center text-xs font-bold text-cyan-400 flex-shrink-0">
                {currentUser?.full_name?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || '?'}
              </div>
              <textarea
                ref={inputRef}
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postComment(); } }}
                placeholder="Add a comment… (Enter to post)"
                rows={1}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-white/25 focus:outline-none focus:border-cyan-400/30 resize-none"
                style={{ minHeight: 40, maxHeight: 100 }}
              />
              <button onClick={postComment} disabled={!newComment.trim() || posting}
                className="px-3 py-2.5 bg-cyan-400/15 border border-cyan-400/25 text-cyan-400 rounded-xl text-sm hover:bg-cyan-400/20 disabled:opacity-40 transition-all flex-shrink-0">
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}