import { motion } from 'framer-motion';
import { FileSpreadsheet, CheckCircle2, X } from 'lucide-react';

export default function SheetPreview({ sheet, onConfirm, onCancel }) {
  const previewRows = sheet.rows?.slice(0, 8) || [];
  const cols = sheet.columns || [];
  const displayCols = cols.slice(0, 10);

  const numericCount = cols.filter(c => c.type === 'numeric').length;
  const dateCount = cols.filter(c => c.type === 'date').length;
  const catCount = cols.filter(c => c.type === 'category').length;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="glass-card rounded-2xl p-5 border border-teal-400/25">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-400/10 flex items-center justify-center">
            <FileSpreadsheet className="w-4 h-4 text-teal-400" />
          </div>
          <div>
            <div className="font-semibold text-sm">{sheet.name}</div>
            <div className="text-xs text-muted-foreground">
              {sheet.rowCount?.toLocaleString()} rows · {cols.length} columns
              {numericCount > 0 && <span className="text-blue-400/70"> · {numericCount} numeric</span>}
              {dateCount > 0 && <span className="text-teal-400/70"> · {dateCount} date</span>}
              {catCount > 0 && <span className="text-purple-400/70"> · {catCount} category</span>}
            </div>
          </div>
        </div>
        <button onClick={onCancel} className="text-white/40 hover:text-white/70 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Data preview grid */}
      <div className="overflow-auto rounded-xl border border-white/8 mb-4" style={{ maxHeight: 200 }}>
        {previewRows.length > 0 ? (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-white/5 border-b border-white/8">
                {displayCols.map(c => (
                  <th key={c.name} className="px-3 py-2 text-left whitespace-nowrap">
                    <div className="font-mono text-white/55">{c.name}</div>
                    <div className={`text-xs mt-0.5 ${c.type === 'numeric' ? 'text-blue-400/60' : c.type === 'date' ? 'text-teal-400/60' : c.type === 'category' ? 'text-purple-400/60' : 'text-white/20'}`}>
                      {c.type}
                    </div>
                  </th>
                ))}
                {cols.length > 10 && (
                  <th className="px-3 py-2 text-white/25 text-xs">+{cols.length - 10} more</th>
                )}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/2">
                  {displayCols.map(c => (
                    <td key={c.name} className="px-3 py-1.5 font-mono text-white/55 whitespace-nowrap max-w-36 truncate">
                      {String(row[c.name] ?? '—')}
                    </td>
                  ))}
                  {cols.length > 10 && <td className="px-3 py-1.5 text-white/20">…</td>}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-8 text-center text-xs text-white/30">No preview rows available</div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={onConfirm}
          className="flex items-center gap-1.5 px-4 py-2 bg-teal-400/15 border border-teal-400/25 text-teal-400 rounded-xl text-xs font-semibold hover:bg-teal-400/20 transition-all">
          <CheckCircle2 className="w-3.5 h-3.5" /> Use This Sheet
        </button>
        <button onClick={onCancel}
          className="px-4 py-2 text-white/40 hover:text-white/70 text-xs rounded-xl border border-white/8 hover:bg-white/5 transition-all">
          Back to List
        </button>
      </div>
    </motion.div>
  );
}