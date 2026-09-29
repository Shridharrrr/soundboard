import type { FastifyPluginAsync } from 'fastify';
import { loadSemanticLayer } from '../semantic/load.js';
import { config } from '../config.js';
import { generateSystemPrompt, GREETING } from '../prompt.js';
import { buildAssemblyAITools } from '@vd/shared';

export const schemaRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/schema', async () => {
    const semantic = loadSemanticLayer();
    const systemPrompt = generateSystemPrompt(semantic, config.AS_OF_DATE);

    const metricKeys = Object.keys(semantic.metrics);
    const dimensionKeys = Object.keys(semantic.dimensions);
    const hasMetabase = Boolean(config.METABASE_URL);

    const tools = buildAssemblyAITools({
      metricKeys,
      dimensionKeys,
      hasMetabase,
    });

    return {
      as_of: config.AS_OF_DATE,
      source: semantic.source,
      time_column: semantic.time_column,
      metrics: semantic.metrics,
      dimensions: semantic.dimensions,
      granularities: semantic.granularities,
      default_breakout_order: semantic.default_breakout_order,
      system_prompt: systemPrompt,
      greeting: GREETING,
      tools,
    };
  });
};
