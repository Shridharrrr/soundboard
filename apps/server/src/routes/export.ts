import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ChartSpecSchema } from '@vd/shared';
import { config } from '../config.js';
import { exportDashboardToMetabase } from '../adapters/metabase.js';

const ExportRequestBodySchema = z.object({
  dashboard_title: z.string().optional().default('Voice Analytics Dashboard'),
  charts: z.array(ChartSpecSchema),
});

export const exportRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/api/export/metabase', async (request, reply) => {
    if (!config.METABASE_URL) {
      return reply.status(404).send({
        ok: false,
        error: 'Metabase export is not enabled (METABASE_URL is unset).',
      });
    }

    const parseResult = ExportRequestBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        ok: false,
        error: `Invalid export request: ${parseResult.error.message}`,
      });
    }

    try {
      const result = await exportDashboardToMetabase(
        parseResult.data.dashboard_title,
        parseResult.data.charts
      );
      return { ok: true, url: result.url };
    } catch (err) {
      request.log.error(err, 'Metabase export failed');
      return reply.status(500).send({
        ok: false,
        error: `Failed to export to Metabase: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });
};
