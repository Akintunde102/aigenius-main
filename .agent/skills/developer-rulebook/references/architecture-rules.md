# Part Two — Architecture & Project Structure (Rules 25–36)

> These rules govern how the project is organised, how processes are separated, and how layers communicate.

---

### Rule 25 — FEATURE_FOLDERS: Group files by domain, not by type

Folders are named by domain (`sessions/`, `messages/`, `agents/`, `queue/`, `realtime/`), not by layer (`controllers/`, `models/`, `routes/`). Each domain folder owns its routes, service, repository, and types.

```
src/
  sessions/    — routes · service · repository · types
  messages/    — routes · service · repository · types
  agents/      — interface · registry · each agent file
  queue/       — client · worker · job.types
  realtime/    — socket.gateway · socket.rooms · pubsub.client
  config/      — env · db · redis  (infrastructure only)
  shared/      — result · pipe · types · logger
```

### Rule 26 — FILE_NAMING: Name files as `domain.role.ts`

Every file follows `domain.role.ts`. Role is one of: `routes`, `service`, `repository`, `types`, `client`, `gateway`, `worker`, `agent`, `interface`, `registry`. Ambiguous file names are forbidden.

### Rule 27 — TWO_PROCESSES: Separate API server and worker

`server.ts` handles HTTP and WebSocket connections. `worker.ts` handles queue jobs and the agent scheduler. Two isolated Node.js processes — ideally separate containers. A slow agent job must never block HTTP request handling.

```json
{
  "start:server": "node dist/server.js",
  "start:worker": "node dist/worker.js",
  "dev:server":   "tsx watch src/server.ts",
  "dev:worker":   "tsx watch src/worker.ts"
}
```

### Rule 28 — SESSION_ID_FIRST: `sessionId` is the first argument

Every service method, repository query, log line, queue job, and WebSocket room must be explicitly scoped to a `sessionId`. It appears as the first argument in all function signatures. Extend to `requestId` and `jobId` in logs and workers.

```typescript
getContext:    (sessionId: SessionId) => Promise<Result<SessionContext>>
findMessages:  (sessionId: SessionId) => Promise<Result<Message[]>>
pushToRoom:    (sessionId: string, event: string, data: unknown) => void
enqueueJob:    (sessionId: SessionId, agentName: string) => Promise<void>
```

### Rule 29 — DI: Inject dependencies — never import infrastructure directly

Services and agents receive dependencies (db, queue, logger, redis) as constructor arguments via factory functions. No service imports a database client directly. Testing is trivial — inject mocks via the factory.

```typescript
export const makeSessionService = (
  sessions: SessionRepository,
  messages: MessageRepository,
): SessionService => ({ ... })

// app.ts — wiring done exactly once
const sessionService = makeSessionService(
  makeSessionRepository(db),
  makeMessageRepository(db)
)
```

### Rule 30 — CONFIG: Single config module — no `process.env` outside it

`config/env.ts` is the only file that reads `process.env`. It validates all variables with Zod at startup and exports typed constants. If any variable is missing or wrong the process exits immediately.

```typescript
const schema = z.object({
  DATABASE_URL:      z.string().url(),
  REDIS_URL:         z.string().url(),
  ANTHROPIC_API_KEY: z.string().min(1),
  PORT:              z.coerce.number().default(3000),
})
const parsed = schema.safeParse(process.env)
if (!parsed.success) { console.error(parsed.error.flatten()); process.exit(1) }
export const env = parsed.data
```

### Rule 31 — LAYERS: Layers only talk to the layer directly below

Routes → Services → Repositories → Database. No layer skips a level. Enforce with ESLint import rules.

### Rule 32 — THIN_ROUTES: Routes are thin — parse, call service, respond

A route handler does exactly three things: validate input with Zod (`safeParse`, not `parse`), call a service method, and send the response.

```typescript
fastify.post("/sessions", async (req, reply) => {
  const parsed = SessionSchema.safeParse(req.body)
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
  const result = await sessionService.create(parsed.data)
  if (!result.ok) return reply.code(400).send({ error: result.error })
  return reply.code(201).send(result.value)
})
```

### Rule 33 — REPOSITORY: Only DB queries and row mapping

No business logic, no validation, no service calls. The row-to-domain mapping function is a pure function. Always use parameterised queries — never string interpolation.

```typescript
const mapRow = (row: QueryResultRow): Message => ({
  id:        row.id as MessageId,
  sessionId: row.session_id as SessionId,
  content:   row.content,
  role:      row.role,
  createdAt: new Date(row.created_at),
})

db.query("SELECT * FROM messages WHERE session_id = $1", [sessionId])
```

### Rule 34 — REDIS_PUBSUB: Use Redis pub/sub for cross-process communication

The worker publishes events to a Redis channel; the socket gateway subscribes and pushes to the right session room. This scales horizontally.

> **Note:** Redis pub/sub is fire-and-forget. For critical events that must not be missed, use Redis Streams or BullMQ's built-in event system. Namespace all channels by `sessionId`.

### Rule 35 — CIRCUIT_BREAKER: Wrap all external calls with a circuit breaker

LLM API calls, database connections, and Redis operations must be wrapped with Opossum. If a service fails 50% of calls in a window, the circuit opens and returns a fallback immediately.

```typescript
import CircuitBreaker from "@redhat/opossum"

const llmBreaker = new CircuitBreaker(callAnthropicAPI, {
  timeout:                  5000,
  errorThresholdPercentage: 50,
  resetTimeout:             30000,
})
llmBreaker.fallback(() => Promise.reject("LLM unavailable"))
```

### Rule 36 — LOGGING: Structured JSON with context (pino)

Every log line must be JSON and must include `sessionId`. Use `logger.child({ sessionId, jobId, agentName })` at the start of every request, job, and agent run. Never use `console.log` in production. Redact sensitive values.

```typescript
const log = logger.child({ sessionId, agentName, jobId, requestId })
log.info("agent run started")
log.error({ error: result.error }, "agent run failed")
```
