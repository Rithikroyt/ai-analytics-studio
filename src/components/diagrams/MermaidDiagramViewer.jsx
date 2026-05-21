/**
 * MermaidDiagramViewer — renders Mermaid diagrams as SVG via text rendering
 * Fallback: renders the mermaid code in a formatted code block
 */
import { useState } from 'react';
import { Copy, CheckCircle2, Download } from 'lucide-react';

const DIAGRAM_COLORS = {
  flowchart: 'text-cyan-400',
  sequence: 'text-purple-400',
  er: 'text-amber-400',
  class: 'text-teal-400',
};

export default function MermaidDiagramViewer({ code, title, type = 'flowchart' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([code], { type: 'text/plain' }));
    a.download = `${title?.replace(/\s+/g, '_').toLowerCase() || 'diagram'}.mmd`;
    a.click();
  };

  // Parse flowchart nodes for visual representation
  const parseNodes = () => {
    const lines = code.split('\n').filter(l => l.trim() && !l.trim().startsWith('%'));
    const nodes = [];
    const arrows = [];
    lines.forEach(line => {
      const arrowMatch = line.match(/(\w+)(?:\[([^\]]+)\])?\s*--?>+\s*(\w+)(?:\[([^\]]+)\])?/);
      if (arrowMatch) {
        const fromId = arrowMatch[1];
        const fromLabel = arrowMatch[2] || fromId;
        const toId = arrowMatch[3];
        const toLabel = arrowMatch[4] || toId;
        if (!nodes.find(n => n.id === fromId)) nodes.push({ id: fromId, label: fromLabel });
        if (!nodes.find(n => n.id === toId)) nodes.push({ id: toId, label: toLabel });
        arrows.push({ from: fromId, to: toId });
      }
    });
    return { nodes, arrows };
  };

  const { nodes } = parseNodes();
  const color = DIAGRAM_COLORS[type] || 'text-cyan-400';

  return (
    <div className="rounded-2xl border border-white/8 bg-white/2 overflow-hidden">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/8 bg-white/3">
          <span className={`text-xs font-semibold ${color}`}>{title}</span>
          <div className="flex items-center gap-1.5">
            <button onClick={handleCopy} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 text-white/40 hover:text-white/70 text-xs transition-all">
              {copied ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button onClick={handleDownload} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 text-white/40 hover:text-white/70 text-xs transition-all">
              <Download className="w-3 h-3" /> .mmd
            </button>
          </div>
        </div>
      )}
      {/* Visual node preview for flowcharts */}
      {type === 'flowchart' && nodes.length > 0 && (
        <div className="px-4 py-3 border-b border-white/5 overflow-x-auto">
          <div className="flex flex-wrap gap-1.5 items-center min-w-max">
            {nodes.slice(0, 12).map((node, i) => (
              <div key={node.id} className="flex items-center gap-1">
                <div className={`px-2.5 py-1 rounded-lg border border-cyan-400/25 bg-cyan-400/8 text-xs text-cyan-400/80 font-mono whitespace-nowrap`}>
                  {node.label.slice(0, 20)}
                </div>
                {i < nodes.slice(0, 12).length - 1 && (
                  <span className="text-white/20 text-xs">→</span>
                )}
              </div>
            ))}
            {nodes.length > 12 && <span className="text-xs text-white/25">+{nodes.length - 12} more</span>}
          </div>
        </div>
      )}
      {/* Raw mermaid code */}
      <pre className="px-4 py-3 text-xs font-mono text-white/50 overflow-auto max-h-64 whitespace-pre leading-relaxed">{code}</pre>
      <div className="px-4 py-2 border-t border-white/5 text-xs text-white/20">
        Paste into <a href="https://mermaid.live" target="_blank" rel="noopener noreferrer" className="text-cyan-400/60 hover:text-cyan-400 transition-all underline">mermaid.live</a> to render interactively
      </div>
    </div>
  );
}