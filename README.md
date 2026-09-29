# Soundboard

Conversational voice analytics powered by AssemblyAI.

Soundboard lets users talk to their business data. As questions are spoken, charts appear, filter, compare, and rearrange on a responsive dashboard in real time. The system combines full-duplex streaming audio with deterministic SQL compilation so that the language model never writes raw database queries.

## Architecture

The system splits responsibilities between browser-side audio streaming and server-side query compilation:

```
[User Audio] 
     │ (24 kHz PCM16 via WebSocket)
     ▼
[AssemblyAI Voice Agent API]
     │
     ├── tool.call (create_chart, filter, breakout, compare)
     ▼
[Browser Client (React + Zustand + Recharts)]
     │
     ├── Optimistic UI update (<100ms)
     │
     ▼ (Fetch data with validated parameters)
[Fastify Analytics API (/api/query)]
     │
     ▼ (Allowlist validation & parameter binding)
[YAML Semantic Layer]
     │
     ▼ (Parameterized SQL)
[PostgreSQL Database (analytics.fact_orders)]
```

### Key Technical Decisions

1. **Direct client-to-agent WebSocket**: The browser streams 24 kHz PCM16 audio directly to AssemblyAI Voice Agent. This avoids routing audio through an intermediate proxy, reducing turn latency and enabling natural barge-in interruption.
2. **Client-side tool execution**: Tool calls dispatched by AssemblyAI execute directly against the client-side dashboard store. Charts render optimistically while the voice agent speaks back insights.
3. **Deterministic semantic compiler**: The LLM does not write raw SQL. Instead, it selects metrics, dimensions, filters, and time ranges defined in an allowlisted semantic schema (`semantic/semantic.yaml`). The backend compiles these specifications into parameterized SQL with strict input validation.
4. **Conversational state management**: Edits, breakouts, and follow-up adjustments modify existing chart specifications in place rather than re-creating them from scratch.
5. **Database safety**: Queries execute against a dedicated, read-only PostgreSQL role (`voice_ro`) with access limited to the analytics view and a strict 5-second timeout.

## Prerequisites

- Node.js 22 LTS or higher
- npm (bundled with Node)
- Docker and Docker Compose (for running the PostgreSQL analytics database)
- AssemblyAI API Key

## Getting Started

### 1. Clone the repository and install dependencies

```bash
git clone https://github.com/Shridharrrr/soundboard.git
cd soundboard
npm install
```

### 2. Configure environment variables

Copy the example environment file:

```bash
cp .env.example .env
```

Open `.env` and set your AssemblyAI API key:

```ini
ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here
```

### 3. Start PostgreSQL and seed data

Start the local database container:

```bash
docker compose up -d postgres
```

Seed the database with 150,000 deterministic order records:

```bash
npm run db:seed
```

### 4. Start development servers

Run both the Fastify API backend and Vite frontend concurrently:

```bash
npm run dev
```

- Web application: http://localhost:5173
- API server: http://localhost:3001

Open http://localhost:5173 in Chrome or Edge and start speaking to interact with your data.

## Project Structure

```
├── apps/
│   ├── web/                 # Vite + React 18 frontend
│   │   ├── src/
│   │   │   ├── components/  # Chart cards, modals, landing page, audio controls
│   │   │   ├── store/       # Zustand dashboard state and history
│   │   │   ├── voice/       # Audio recorder, player, and WebSocket client
│   │   │   └── lib/         # API client and Metabase integration
│   └── server/              # Fastify backend
│       └── src/
│           ├── routes/      # Token minting and query endpoints
│           ├── semantic/    # YAML schema compiler and SQL builder
│           └── db/          # PostgreSQL connection pool and queries
├── packages/
│   └── shared/              # Shared TypeScript types and validators
├── semantic/
│   └── semantic.yaml        # Metrics, dimensions, synonyms, and joins
├── db/
│   ├── schema.sql           # Database schema and read-only roles
│   └── seed.ts              # Deterministic data generator (150k rows)
├── eval/
│   ├── run.ts               # Automated evaluation harness
│   └── cases/               # 30 conversational benchmark test cases
└── docker-compose.yml       # PostgreSQL and Metabase services
```

## Testing and Verification

### Unit and Integration Tests

Run the Vitest test suite across state stores, semantic compiler, database permissions, and API endpoints:

```bash
npm test
```

### Conversational Evaluation Suite

An automated evaluation harness tests speech turn-taking, follow-up edits, voice corrections, dimension breakouts, ambiguity resolution, and edge cases across 30 defined scenarios:

```bash
npm run eval
```

Summary of benchmark coverage:

| Category | Cases | Result | Accuracy |
| :--- | :--- | :--- | :--- |
| Basic Requests | 8 | 8 passed | 100% |
| Follow-ups and Edits | 6 | 6 passed | 100% |
| Voice Corrections | 4 | 4 passed | 100% |
| Dimension Breakouts | 3 | 3 passed | 100% |
| Ambiguity Handling | 3 | 3 passed | 100% |
| Out-of-Scope Refusals | 3 | 3 passed | 100% |
| State Controls and Undo | 3 | 3 passed | 100% |
| Overall Benchmark | 30 | 30 passed | 100% |

Median execution latency across evaluation cases is under 45ms.

## Security Model

1. **Zero Raw SQL Generation**: Queries are built by the semantic compiler using allowlisted metrics and dimensions. User input never directly touches SQL syntax.
2. **Credential Isolation**: The AssemblyAI API key remains on the backend. The client requests temporary ephemeral tokens with a 10-minute lifetime.
3. **Database Permissions**: The API connects via a read-only role (`voice_ro`) restricted to `analytics.fact_orders`. Write operations are not permitted.
4. **Query Safeguards**: Every query includes statement timeouts and row limit caps to protect database resources.

## License

MIT
