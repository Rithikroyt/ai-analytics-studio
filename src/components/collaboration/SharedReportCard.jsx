import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import {
  Globe, Lock, MessageSquare, Users, MoreVertical,
  Archive, RotateCcw, Eye, Edit, ExternalLink,
  FileText, BarChart3, TrendingUp, AlertTriangle, Shield, Sparkles
} from 'lucide-react';

const TYPE_META = {
  executive: { label: 'Executive Summary', color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20', icon: '📄' },
  board: { label: 'Board Memo', color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20', icon: '🏛️' },
  kpi_trend: { label: 'KPI & Trends', color: 'text-teal-400', bg: 'bg-teal-400/10', border: 'border-teal-400/20', icon: '📈' },
  anomaly: { label: 'Anomaly Report', color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', icon: '⚠️' },
  forecast: { label: 'Forecast', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20', icon: '🔮' },
  quality: { label: 'Quality Audit', color: 'text-white/60', bg: 'bg-white/5', border: 'border-white/15', icon: '🔍' },
  feedback: { label: 'Feedback Insights', color: 'text-pink-400', bg: 'bg-pink-400/10', border: 'border-pink-400/20', icon: '💬' },
  custom: { label: 'Custom Report', color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20', icon: '📊' },
};

const ACCESS_LABELS = { view: 'View only', comment: 'Can comment', edit: 'Can edit' };
const ACCESS_COLORS = { view: 'text-white/40', comment: 'text-teal-400', edit: 'text-purple-400' };

export default function SharedReportCard({ report, currentUser, index, onClick, onArchive, onRefresh, isArchived }) {
  const [commentCount, setCommentCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    base44.entities.ReportComment.filter({ reportId: report.id }).then(comments => {
      setCommentCount(comments.filter(c => !c.resolved).length);
    }).catch(() => {});
  }, [report.id]);

  const meta = TYPE_META[report.reportType] || TYPE_META.custom;
  const isOwner = report.created_by === currentUser?.email;
  const inviteCount = report.invitedEmails?.length || 0;
  const timeAgo = (() => {
    const diff = Date.now() - new Date(report.created_date).getTime();
    const d = Math.floor(diff / 86400000);
    if (d === 0) return 'Today';
    if (d === 1) return 'Yesterday';
    if (d < 7) return `${d}d ago`;
    return new Date(report.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: index * 0.04 }}
      className={`glass-card rounded-2xl border ${meta.border} hover:scale-[1.01] transition-all cursor-pointer relative group ${isArchived ? 'opacity-50' : ''}`}
      onClick={onClick}
    >
      {/* Top color strip */}
      <div className="h-0.5 rounded-t-2xl" style={{ background: `linear-gradient(90deg, transparent, ${meta.color.replace('text-', '').replace('/60', '')}, transparent)` }} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xl flex-shrink-0">{meta.icon}</span>
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">{report.title}</div>
              <div className={`text-xs mt-0.5 ${meta.color}`}>{meta.label}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {report.isPublic
              ? <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 border border-green-400/20"><Globe className="w-2.5 h-2.5" /> Public</span>
              : <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/10"><Lock className="w-2.5 h-2.5" /> Private</span>
            }
            {/* Menu */}
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/30 hover:text-white/70 transition-all"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-8 z-50 w-40 rounded-xl bg-navy-800 border border-white/10 shadow-xl py-1 text-xs"
                  onMouseLeave={() => setMenuOpen(false)}>
                  <button onClick={() => { setMenuOpen(false); onClick(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-white/65 transition-colors">
                    <ExternalLink className="w-3 h-3" /> Open
                  </button>
                  <button onClick={() => { setMenuOpen(false); onArchive(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-white/65 transition-colors">
                    {isArchived ? <RotateCcw className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
                    {isArchived ? 'Restore' : 'Archive'}
                  </button>
                  {isOwner && !isArchived && (
                    <button onClick={async () => {
                      setMenuOpen(false);
                      await base44.entities.SharedReport.delete(report.id);
                      onRefresh();
                    }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-400/10 text-red-400/70 hover:text-red-400 transition-colors">
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {report.description && (
          <p className="text-xs text-white/45 leading-relaxed line-clamp-2 mb-3">{report.description}</p>
        )}

        {/* Metadata chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {report.tableName && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-white/40 font-mono truncate max-w-28">
              {report.tableName}
            </span>
          )}
          {report.qualityScore != null && (
            <span className={`text-xs px-2 py-0.5 rounded-full border font-mono ${report.qualityScore >= 90 ? 'bg-green-400/8 border-green-400/20 text-green-400' : 'bg-amber-400/8 border-amber-400/20 text-amber-400'}`}>
              Q {report.qualityScore}%
            </span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full bg-white/4 border border-white/8 ${ACCESS_COLORS[report.accessLevel]}`}>
            {ACCESS_LABELS[report.accessLevel]}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-white/30 pt-2 border-t border-white/6">
          <div className="flex items-center gap-3">
            {inviteCount > 0 && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" /> {inviteCount}
              </span>
            )}
            {commentCount > 0 && (
              <span className="flex items-center gap-1 text-teal-400/70">
                <MessageSquare className="w-3 h-3" /> {commentCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {isOwner && <span className="text-white/20">by you ·</span>}
            <span>{timeAgo}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}