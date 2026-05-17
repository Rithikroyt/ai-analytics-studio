import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * RAG + Evidence Retrieval Layer
 * Processes documents: extract → chunk → embed → store
 * Also handles: retrieve evidence for AI answers
 */

// Simple text chunking with overlap
function chunkText(text, chunkSize = 400, overlap = 80) {
  const words = text.split(/\s+/);
  const chunks = [];
  let i = 0;
  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim()) chunks.push(chunk.trim());
    i += chunkSize - overlap;
  }
  return chunks;
}

// Keyword-based similarity (lightweight, no external deps)
function keywordSimilarity(query, chunk) {
  const queryWords = new Set(query.toLowerCase().split(/\W+/).filter(w => w.length > 3));
  const chunkWords = new Set(chunk.toLowerCase().split(/\W+/).filter(w => w.length > 3));
  const intersection = [...queryWords].filter(w => chunkWords.has(w));
  if (queryWords.size === 0) return 0;
  return intersection.length / queryWords.size;
}

// Score chunks against query
function retrieveRelevantChunks(query, chunks, topK = 5) {
  return chunks
    .map((chunk, i) => ({ chunk, index: i, score: keywordSimilarity(query, chunk) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .filter(r => r.score > 0);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, fileUrl, fileName, fileType, query, documentIds } = body;

    // ── ACTION: process — extract, chunk, store ────────────────────────────────
    if (action === 'process') {
      if (!fileUrl) return Response.json({ error: 'fileUrl required' }, { status: 400 });

      // Fetch and extract text content
      let rawText = '';
      try {
        const extractResult = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
          file_url: fileUrl,
          json_schema: { type: 'object', properties: { content: { type: 'string' }, sections: { type: 'array', items: { type: 'string' } } } },
        });
        rawText = extractResult?.output?.content || JSON.stringify(extractResult?.output || '');
      } catch (e) {
        // Fallback: try fetching as text
        const r = await fetch(fileUrl);
        rawText = await r.text();
      }

      if (!rawText || rawText.length < 50) {
        return Response.json({ error: 'Could not extract text from document' }, { status: 400 });
      }

      // Chunk the text
      const chunks = chunkText(rawText, 400, 80);

      // Generate summary via LLM
      const summary = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Summarize this document in 2-3 sentences for use as evidence in business analysis. Document: ${rawText.slice(0, 2000)}`,
      });

      // Store each chunk as a DocumentChunk entity
      const docId = `doc_${Date.now()}`;
      const chunkRecords = chunks.slice(0, 50).map((chunk, i) => ({
        documentId: docId,
        documentName: fileName || 'Document',
        fileType: fileType || 'text',
        fileUrl,
        chunkIndex: i,
        content: chunk,
        wordCount: chunk.split(/\s+/).length,
        summary: i === 0 ? (typeof summary === 'string' ? summary : JSON.stringify(summary)) : '',
        uploadedBy: user.email,
        workspaceId: user.id,
      }));

      await base44.asServiceRole.entities.DocumentChunk.bulkCreate(chunkRecords);

      return Response.json({
        success: true,
        documentId: docId,
        chunksCreated: chunkRecords.length,
        summary: typeof summary === 'string' ? summary : JSON.stringify(summary),
        wordCount: rawText.split(/\s+/).length,
      });
    }

    // ── ACTION: retrieve — search chunks for evidence ──────────────────────────
    if (action === 'retrieve') {
      if (!query) return Response.json({ error: 'query required' }, { status: 400 });

      const allChunks = await base44.asServiceRole.entities.DocumentChunk.list('-created_date', 200);
      if (!allChunks.length) return Response.json({ evidence: [], message: 'No documents uploaded yet.' });

      const results = retrieveRelevantChunks(query, allChunks.map(c => c.content), 5);

      const evidence = results.map(r => ({
        chunk: allChunks[r.index]?.content || '',
        documentName: allChunks[r.index]?.documentName || 'Document',
        documentId: allChunks[r.index]?.documentId,
        chunkIndex: allChunks[r.index]?.chunkIndex,
        score: Math.round(r.score * 100),
      }));

      return Response.json({ evidence, query, totalDocuments: new Set(allChunks.map(c => c.documentId)).size });
    }

    // ── ACTION: list — list all documents ─────────────────────────────────────
    if (action === 'list') {
      const chunks = await base44.asServiceRole.entities.DocumentChunk.filter({ workspaceId: user.id }, '-created_date', 100);
      const docs = {};
      chunks.forEach(c => {
        if (!docs[c.documentId]) docs[c.documentId] = { id: c.documentId, name: c.documentName, fileType: c.fileType, chunkCount: 0, uploadedAt: c.created_date, summary: c.summary };
        docs[c.documentId].chunkCount++;
      });
      return Response.json({ documents: Object.values(docs) });
    }

    // ── ACTION: delete ─────────────────────────────────────────────────────────
    if (action === 'delete' && documentIds?.length) {
      const chunks = await base44.asServiceRole.entities.DocumentChunk.list('-created_date', 500);
      const toDelete = chunks.filter(c => documentIds.includes(c.documentId));
      await Promise.all(toDelete.map(c => base44.asServiceRole.entities.DocumentChunk.delete(c.id)));
      return Response.json({ success: true, deleted: toDelete.length });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});