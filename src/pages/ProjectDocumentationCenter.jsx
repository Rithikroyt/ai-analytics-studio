import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, FileText, RefreshCw, Loader2, BookOpen, Shield, GitMerge } from 'lucide-react';
import { HandoffPDFButton, VersionLabel } from '@/components/readiness/FinalEvidencePackage';
import DocMetadataForm from '@/components/projectdoc/DocMetadataForm';
import DocSectionSelector from '@/components/projectdoc/DocSectionSelector';
import DocScreenshotManager from '@/components/projectdoc/DocScreenshotManager';
import DocDiagramManager from '@/components/projectdoc/DocDiagramManager';
import DocCodeManager from '@/components/projectdoc/DocCodeManager';
import DocReferenceManager from '@/components/projectdoc/DocReferenceManager';
import DocHistory from '@/components/projectdoc/DocHistory';
import DocGeneratePanel from '@/components/projectdoc/DocGeneratePanel';
import MermaidDiagramViewer from '@/components/diagrams/MermaidDiagramViewer';

const ADMIN_EMAILS = ['rthati1@asu.edu', 'thatirithikroy@gmail.com'];
function isAdmin(user) {
  if (!user) return false;
  if ((user.role || '').toLowerCase() === 'admin') return true;
  return ADMIN_EMAILS.includes((user.email || '').toLowerCase());
}

const TABS = [
  { id: 'metadata',    label: 'Project Metadata',       icon: FileText },
  { id: 'sections',   label: 'Section Selector',        icon: BookOpen },
  { id: 'screenshots',label: 'Screenshots',             icon: FileText },
  { id: 'diagrams',   label: 'Diagrams',                icon: FileText },
  { id: 'code',       label: 'Code Snippets',           icon: FileText },
  { id: 'references', label: 'References',              icon: FileText },
  { id: 'arch_diagrams', label: 'Architecture Diagrams',    icon: GitMerge },
  { id: 'generate',   label: 'Generate PDF',            icon: FileText },
  { id: 'history',    label: 'Document History',        icon: FileText },
];

export default function ProjectDocumentationCenter() {
  const { user } = useAuth();
  const [tab, setTab] = useState('metadata');
  const [config, setConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    if (!isAdmin(user)) return;
    loadConfig();
  }, [user]);

  const loadConfig = async () => {
    setLoadingConfig(true);
    try {
      const configs = await base44.entities.ProjectDocumentConfig.list('-updated_date', 1);
      if (configs.length > 0) {
        setConfig(configs[0]);
      } else {
        // Create a default config
        const created = await base44.entities.ProjectDocumentConfig.create({
          projectTitle: 'OmniData AI Analytics Studio',
          subtitle: 'AI-Powered Full-Stack Analytics and Decision Intelligence Platform',
          authorName: user?.full_name || '',
          organization: '',
          university: '',
          program: '',
          course: '',
          professorName: '',
          semester: '',
          version: '1.0',
          appUrl: window.location.origin,
          keywords: ['AI Analytics', 'Business Intelligence', 'Data Quality', 'SQL Analytics', 'Machine Learning', 'AI Agents', 'Decision Intelligence'],
          selectedSections: ['cover','declaration','acknowledgement','abstract','toc','abbreviations','ch1','ch2','ch3','ch4','ch5','ch6','ch7','ch8','ch9','ch10','ch11','ch12','ch13','ch14','ch15','ch16','ch17','ch18','ch19','ch20','ch21'],
          pageFormat: 'A4',
          fontFamily: 'Helvetica',
          lineSpacing: 1.15,
          createdBy: user?.email || '',
          updatedAt: new Date().toISOString(),
          abstract: '',
          acknowledgementText: '',
          confidentialityNote: 'This document is intended for academic and review purposes only.',
        });
        setConfig(created);
      }
    } catch (e) {
      console.error('Failed to load config:', e);
    }
    setLoadingConfig(false);
  };

  const handleConfigSaved = (updated) => {
    setConfig(updated);
  };

  if (!user || !isAdmin(user)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-400/10 border border-red-400/20 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p className="text-sm text-muted-foreground">Only admin users can access the Project Documentation Center.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/8 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-400/15 border border-cyan-400/25 flex items-center justify-center">
            <FileText className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black">Project Documentation Center</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-400/10 border border-red-400/20 text-red-400 flex items-center gap-1">
                <Shield className="w-2.5 h-2.5" /> Admin Only
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Generate a capstone-grade, MNC-standard project document PDF from live application data</p>
            <div className="mt-1"><VersionLabel compact /></div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <HandoffPDFButton variant="secondary" />
          <button onClick={loadConfig} disabled={loadingConfig}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/40 hover:text-white/70 transition-all disabled:opacity-40">
            {loadingConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Reload
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/8 px-8 flex gap-0 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${tab === t.id ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-white/35 hover:text-white/65'}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-8">
        {loadingConfig ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
              <p className="text-sm text-white/40">Loading project configuration…</p>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {tab === 'metadata'    && <DocMetadataForm config={config} onSaved={handleConfigSaved} />}
              {tab === 'sections'   && <DocSectionSelector config={config} onSaved={handleConfigSaved} />}
              {tab === 'screenshots'&& <DocScreenshotManager config={config} user={user} />}
              {tab === 'diagrams'   && <DocDiagramManager config={config} user={user} />}
              {tab === 'code'       && <DocCodeManager config={config} user={user} />}
              {tab === 'references' && <DocReferenceManager config={config} user={user} />}
              {tab === 'arch_diagrams' && (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-cyan-400/5 border border-cyan-400/15 text-xs text-white/50">
                    Pre-built Mermaid architecture diagrams for your project documentation. Copy the code and paste into <a href="https://mermaid.live" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">mermaid.live</a> to render, or include in your PDF.
                  </div>
                  <a href="/handover" className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-400/10 border border-amber-400/20 text-amber-400 rounded-xl text-xs font-semibold hover:bg-amber-400/15 transition-all">
                    <GitMerge className="w-3.5 h-3.5" /> View all 8 diagrams in Handover Package →
                  </a>
                </div>
              )}
              {tab === 'generate'   && <DocGeneratePanel config={config} user={user} />}
              {tab === 'history'    && <DocHistory config={config} />}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}