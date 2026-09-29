import type { FastifyPluginAsync } from 'fastify';
import { config } from '../config.js';

export const tokenRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/api/voice-token',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      if (!config.ASSEMBLYAI_API_KEY) {
        return reply.status(503).send({
          ok: false,
          error: 'ASSEMBLYAI_API_KEY is not configured on the server. Please set it in .env to enable live voice agents.',
        });
      }

      try {
        const response = await fetch('https://agents.assemblyai.com/v1/token?expires_in_seconds=600', {
          headers: {
            Authorization: `Bearer ${config.ASSEMBLYAI_API_KEY}`,
          },
        });

        if (!response.ok) {
          const body = await response.text();
          request.log.error(`AssemblyAI token minting failed [${response.status}]: ${body}`);
          return reply.status(response.status).send({
            ok: false,
            error: `Failed to mint voice token from AssemblyAI: ${response.statusText}`,
            detail: body,
          });
        }

        const data = (await response.json()) as { token: string };
        return {
          token: data.token,
          ws_url_base: 'wss://agents.assemblyai.com/v1/ws',
        };
      } catch (err) {
        request.log.error(err, 'AssemblyAI token request failed');
        return reply.status(500).send({
          ok: false,
          error: 'Internal server error while obtaining voice token.',
        });
      }
    }
  );
};
