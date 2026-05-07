import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cellType, content, tableId } = await req.json();

    if (!cellType || !content) {
      return Response.json({ error: 'Missing cellType or content' }, { status: 400 });
    }

    let output = null;
    let status = 'success';
    let errorMessage = null;

    try {
      if (cellType === 'sql') {
        // Mock SQL execution
        output = {
          rows: 5,
          columns: ['column1', 'column2'],
          preview: [{ column1: 'value1', column2: 'value2' }],
          executedQuery: content,
        };
      } else if (cellType === 'python') {
        // Mock Python execution
        output = {
          result: 'Code executed successfully',
          logs: ['Execution completed'],
        };
      } else if (cellType === 'markdown') {
        output = { rendered: true };
      } else if (cellType === 'chart') {
        output = { chartType: 'bar', dataPoints: 10 };
      } else if (cellType === 'ai_insight') {
        // Invoke LLM for insight
        const insight = await base44.integrations.Core.InvokeLLM({
          prompt: `Generate a brief data insight: ${content}`,
        });
        output = { insight };
      }
    } catch (e) {
      status = 'error';
      errorMessage = e.message;
    }

    return Response.json({
      cellType,
      content,
      output,
      status,
      errorMessage,
      executedAt: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});