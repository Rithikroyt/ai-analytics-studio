/**
 * Relationship Inference — Phase 2 enhanced
 * Detects likely join keys across multiple tables using:
 * - Exact column name matching
 * - Normalized name matching (strip prefixes/suffixes, plurals)
 * - ID/key column prioritization
 * - Value overlap sampling for confidence scoring
 */

function normalizeName(name) {
  return String(name)
    .toLowerCase()
    .replace(/^(tbl_|t_|dim_|fact_|fct_|ref_)/, '') // strip table prefixes
    .replace(/_(id|key|code|ref|fk|pk)$/i, '')       // strip common suffixes
    .replace(/(s)$/, '')                               // naive depluralize
    .replace(/[^a-z0-9]/g, '_');
}

function sampleValues(table, colName, n = 200) {
  return (table.rows || [])
    .slice(0, n)
    .map(r => String(r[colName] ?? '').trim())
    .filter(v => v && v !== 'null' && v !== 'undefined');
}

export function inferRelationships(tables) {
  if (!tables || tables.length < 2) return [];
  const results = [];

  for (let i = 0; i < tables.length; i++) {
    for (let j = i + 1; j < tables.length; j++) {
      const tA = tables[i];
      const tB = tables[j];
      const colsA = tA.columns || [];
      const colsB = tB.columns || [];

      if (!colsA.length || !colsB.length) continue;

      const normMapB = new Map(colsB.map(c => [normalizeName(c.name), c.name]));

      const matches = [];

      for (const cA of colsA) {
        // 1. Exact match
        const exactMatch = colsB.find(c => c.name.toLowerCase() === cA.name.toLowerCase());
        if (exactMatch) {
          matches.push({ colA: cA.name, colB: exactMatch.name, matchType: 'exact' });
          continue;
        }
        // 2. Normalized match
        const normA = normalizeName(cA.name);
        if (normMapB.has(normA)) {
          matches.push({ colA: cA.name, colB: normMapB.get(normA), matchType: 'normalized' });
        }
      }

      if (!matches.length) continue;

      // Prioritize: id/key columns > exact matches > normalized
      const idMatches = matches.filter(m => /(_id|^id|_key$|_code$|_ref$)/i.test(m.colA) || /(_id|^id|_key$|_code$)/i.test(m.colB));
      const bestMatch = idMatches[0] || matches[0];

      // Value overlap for confidence boost
      let valueOverlap = 0;
      try {
        const valsA = new Set(sampleValues(tA, bestMatch.colA));
        const valsB = sampleValues(tB, bestMatch.colB, 200);
        const overlapping = valsB.filter(v => valsA.has(v)).length;
        valueOverlap = valsB.length > 0 ? overlapping / valsB.length : 0;
      } catch {}

      const confidence =
        idMatches.length > 0 && valueOverlap > 0.1 ? 'high' :
        idMatches.length > 0 || valueOverlap > 0.3 ? 'medium' :
        matches.length > 1 ? 'medium' : 'low';

      results.push({
        tableA: tA.name,
        tableB: tB.name,
        commonColumns: matches.map(m => m.colA),
        suggestedJoinKey: bestMatch.colA,
        matchedColumn: bestMatch.colB,
        matchType: bestMatch.matchType,
        valueOverlapPct: Math.round(valueOverlap * 100),
        confidence,
      });
    }
  }

  return results.sort((a, b) =>
    ['high', 'medium', 'low'].indexOf(a.confidence) - ['high', 'medium', 'low'].indexOf(b.confidence)
  );
}