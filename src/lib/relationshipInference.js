/**
 * Relationship Inference — detects likely join keys across multiple tables
 */

export function inferRelationships(tables) {
  if (!tables || tables.length < 2) return [];
  const results = [];

  for (let i = 0; i < tables.length; i++) {
    for (let j = i + 1; j < tables.length; j++) {
      const tA = tables[i];
      const tB = tables[j];
      const colsA = (tA.columns || []).map(c => c.name.toLowerCase());
      const setB = new Set((tB.columns || []).map(c => c.name.toLowerCase()));

      const common = colsA.filter(c => setB.has(c));
      if (!common.length) continue;

      // Prefer ID/key columns as join candidates
      const idCandidates = common.filter(c => /(_id|^id_|\bid\b|_key$|_code$|_ref$)/i.test(c));

      results.push({
        tableA: tA.name,
        tableB: tB.name,
        commonColumns: common,
        suggestedJoinKey: idCandidates[0] || common[0],
        confidence: idCandidates.length > 0 ? 'high' : common.length > 1 ? 'medium' : 'low',
      });
    }
  }

  return results;
}