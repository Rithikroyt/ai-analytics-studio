/**
 * EvidenceDrilldown — Click any evidence item to see the specific rows
 * from the dataset that triggered that insight.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Table, X, ChevronRight, Search } from 'lucide-react';

function findMatchingRows(rows, evidenceText, columns) {
  if (!rows?.length || !evidenceText) return [];
  const text = evidenceText.toLowerCase();

  // Extract potential column names or values mentioned in the evidence
  const colNames = columns.map(c => (c.name || c));
  const mentionedCols = colNames.filter(col =>
    text.includes(col.toLowerCase().replace(/_/g, ' ')) ||
    text.includes(col.toLowerCase())
  );

  // Extract numeric values from evidence text
  const numericMatches = text.match(/[\d,.]+/g)?.map(n => parseFloat(n.replace(/,/g, ''))).filter(n => !isNaN(n)) || [];

  if (mentionedCols.length === 0 && numericMatches.length === 0) {
    // No specific match — return top 5 rows
    return rows.slice(0, 5).map(r => ({ row: r, score: 0.5, reason: 'Sample rows from dataset' }));
  }

  // Score each row by how well it matches the evidence
  const scored = rows.map(row => {
    let score = 0;
    let reasons = [];

    mentionedCols.forEach(col => {
      const val = row[col];
      if (val != null) {
        score += 1;
        // Check if any numeric values from evidence appear in this column
        numericMatches.forEach(num => {
          const rowVal = parseFloat(String(val).replace(/,/g, ''));
          if (!isNaN(rowVal) && Math.abs(rowVal - num) / (num || 1) < 0.05) {
            score += 3;
            reasons.push(`${col} = ${val}`);
          }
        });
      }
    });

    return { row, score, reason: reasons.join(', ') || `Matched: ${mentionedCols.slice(0, 2).join(', ')}` };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, 8).filter(r => r.score > 0);
}

export default function EvidenceDrilldown({ evidenceText, rows, columns, color }) {
  const [open, setOpen] = useState(false);
  const [matchedRows, setMatchedRows] = useState([]);

  const handleOpen = () => {
    const matched = findMatchingRows(rows, evidenceText, columns || []);
    setMatchedRows(matched);
    setOpen(true);
  };

  const displayCols = (columns || []).slice(0, 7);

  return (
    <>
      <button onClick={handleOpen}
        className="inline-flex items-center gap-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity ml-2 px-1.5 py-0.5 rounded border"
        style={{ color, borderColor: `${color}30`, background: `${color}0a` }}
        title="View source data for this insight">
        <Search className="w-2.5 h-2.5" /> rows
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={() => setOpen(false)}>
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="glass-card rounded-2xl border border-white/12 w-full max-w-4xl max-h-[70vh] overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/8"
                style={{ background: `${color}08` }}>
                <div className="flex items-center gap-2">
                  <Table className="w-4 h-4" style={{ color }} />
                  <span className="text-sm font-bold" style={{ color }}>Source Data</span>
                  <span className="text-xs text-white/30 ml-1">· {matchedRows.length} matching rows</span>
                </div>
                <button onClick={() => setOpen(false)} className="p-1 text-white/30 hover:text-white/60 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Evidence text */}
              <div className="px-5 py-3 border-b border-white/5"
                style={{ background: `${color}06` }}>
                <div className="flex items-start gap-2">
                  <ChevronRight className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color }} />
                  <p className="text-xs text-white/60 leading-relaxed italic">"{evidenceText}"</p>
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto p-4">
                {matchedRows.length === 0 ? (
                  <div className="text-center py-8 text-white/20 text-sm">No specific rows found for this evidence point.</div>
                ) : (
                  <div className="rounded-xl border border-white/8 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/3">
                          <th className="px-3 py-2 text-left text-white/35 font-semibold">#</th>
                          {displayCols.map(c => (
                            <th key={c.name || c} className="px-3 py-2 text-left text-white/35 font-semibold truncate max-w-32">
                              {(c.name || c).replace(/_/g, ' ')}
                            </th>
                          ))}
                          <th className="px-3 py-2 text-left text-white/35 font-semibold">Match reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matchedRows.map(({ row, reason }, i) => (
                          <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                            <td className="px-3 py-2 text-white/25 font-mono">{i + 1}</td>
                            {displayCols.map(c => {
                              const colName = c.name || c;
                              const val = row[colName];
                              return (
                                <td key={colName} className="px-3 py-2 text-white/65 max-w-32 truncate">
                                  {val != null ? String(val) : <span className="text-white/20">—</span>}
                                </td>
                              );
                            })}
                            <td className="px-3 py-2 text-white/30 italic max-w-48">{reason || 'Sample row'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}