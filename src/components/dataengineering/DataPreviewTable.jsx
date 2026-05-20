import { useState } from 'react';
import { Eye, Download } from 'lucide-react';

export default function DataPreviewTable({ rows = [], columns = [] }) {
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const totalPages = Math.ceil(rows.length / pageSize);
  const pageRows = rows.slice(page * pageSize, (page + 1) * pageSize);
  const headers = columns.length > 0 ? columns.map(c => c.columnName) : (rows[0] ? Object.keys(rows[0]) : []);

  if (!rows.length) return (
    <div className="flex items-center justify-center py-20 text-sm text-white/30">Upload a dataset to preview data</div>
  );

  const downloadCSV = () => {
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'preview.csv'; a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-white/60">
          <Eye className="w-4 h-4 text-cyan-400" />
          Showing {rows.length} sample rows × {headers.length} columns
        </div>
        <button onClick={downloadCSV} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white/50 hover:text-white/80 transition-all">
          <Download className="w-3 h-3" /> Export CSV
        </button>
      </div>

      <div className="rounded-2xl border border-white/8 overflow-hidden overflow-x-auto">
        <table className="w-full text-xs min-w-max">
          <thead>
            <tr className="border-b border-white/8 bg-white/3">
              {headers.map(h => (
                <th key={h} className="text-left px-4 py-3 text-white/40 font-semibold whitespace-nowrap font-mono">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/2 transition-all">
                {headers.map(h => (
                  <td key={h} className="px-4 py-2.5 text-white/60 font-mono whitespace-nowrap max-w-48 overflow-hidden text-ellipsis">
                    {row[h] === null || row[h] === undefined || row[h] === ''
                      ? <span className="text-white/20 italic">null</span>
                      : String(row[h]).length > 40 ? String(row[h]).slice(0, 40) + '…' : String(row[h])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/50 disabled:opacity-30 hover:text-white/80 transition-all">← Prev</button>
          <span className="text-xs text-white/30">{page + 1} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/50 disabled:opacity-30 hover:text-white/80 transition-all">Next →</button>
        </div>
      )}
    </div>
  );
}