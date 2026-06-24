# Part Five — Distributed Systems Rules (Rules 59–68)

> These 10 rules cover failure modes that only appear in production: schema evolution, LLM audit, rate-limit exhaustion, duplicate side-effects, and unsafe migrations.

---

### Rule 59 — EVENT_VERSIONING: Every event and job payload must carry a `version` field

Evolving event schemas without versions silently breaks consumers. Consumers check `version` and branch on it. Never rename a field without bumping the version.

```typescript
export interface BaseEvent { readonly version: number }

export interface MessageNewEvent extends BaseEvent {
  readonly eventType: "message:new"
  readonly version:   1
  readonly sessionId: SessionId
  readonly message:   { id: MessageId; content: string }
}

// Consumer
if (evt.version === 1) handleV1(evt)
else if (evt.version === 2) handleV2(evt)
else log.warn({ version: evt.version }, "unknown event version — ignoring")
```

### Rule 60 — AGENT_DETERMINISM: Log all LLM inputs and outputs for audit and replay

AI calls are non-deterministic. Without recording the exact prompt, model, temperature, and raw response, you cannot replay, debug, or audit. Store in a dedicated `agent_runs` Postgres table (not Redis — prompts can be large).

```typescript
// Before calling the LLM
await db.query(
  `INSERT INTO agent_runs (job_id,session_id,agent_name,prompt,config,created_at)
   VALUES ($1,$2,$3,$4,$5,now())`,
  [job.jobId, job.sessionId, job.agentName, prompt, JSON.stringify(config)]
)
// After receiving the response
await db.query(
  "UPDATE agent_runs SET raw_response=$1,completed_at=now() WHERE job_id=$2",
  [rawResponse, job.jobId]
)
```

### Rule 61 — BACKPRESSURE: Limit concurrency with `p-limit`

Unbounded parallel LLM calls will exhaust rate limits or OOM the worker. Use `p-limit` for LLM calls and BullMQ's `concurrency` for jobs. Both limits are required.

```typescript
import pLimit from "p-limit"

const llmLimit = pLimit(5)   // max 5 concurrent LLM calls per worker

const results = await Promise.all(
  messages.map(msg => llmLimit(() => callLLM(msg)))
)

// BullMQ worker concurrency (separate control)
new Worker("agent-jobs", processor, { connection, concurrency: 3 })
```

### Rule 62 — IDEMPOTENT_ENDPOINTS: Require `Idempotency-Key` header on all writes

Network retries and duplicate requests must not cause double operations. Cache results in Redis for 24 hours.

```typescript
fastify.post("/sessions/:id/messages", async (req, reply) => {
  const key = req.headers["idempotency-key"] as string | undefined
  if (!key) return reply.code(400).send({ error: "Idempotency-Key required" })
  const cached = await redis.get(`idem:${key}`)
  if (cached) return reply.code(200).send(JSON.parse(cached))
  const result = await messageService.send(sessionId, input)
  if (result.ok)
    await redis.set(`idem:${key}`, JSON.stringify(result.value), "EX", 86400)
  return result.ok
    ? reply.code(201).send(result.value)
    : reply.code(500).send({ error: result.error })
})
```

### Rule 63 — OBSERVABILITY: Instrument with OpenTelemetry

Structured logs alone are not sufficient. Set up OpenTelemetry distributed traces and metrics from both `server.ts` and `worker.ts`. Correlate pino log lines with the active trace ID.

```typescript
import { NodeSDK } from "@opentelemetry/sdk-node"
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc"

new NodeSDK({
  traceExporter:    new OTLPTraceExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
}).start()

// In pino child logger — attach active trace ID
const span    = trace.getActiveSpan()
const traceId = span?.spanContext()?.traceId
logger.child({ sessionId, traceId, requestId })
```

### Rule 64 — DATA_OWNERSHIP: Each domain owns its own tables

The `messages/` service must not query the `sessions` table directly. If one domain needs another domain's data, it calls that domain's service interface.

```typescript
// ❌ Wrong — agents/ querying sessions table directly
const session = await db.query("SELECT * FROM sessions WHERE id=$1", [id])

// ✅ Right — call the owning service
const sessionResult = await sessionService.getContext(sessionId)
```

### Rule 65 — RETRY_POLICY: Exponential backoff with jitter

Blind immediate retries cause thundering-herd. All retry logic must use exponential backoff with random jitter.

```typescript
await queue.add("agent-jobs", job, {
  attempts: 5,
  backoff: { type: "exponential", delay: 1000 },
})

// Client-side jitter
const jitter = Math.random() * 200
```

### Rule 66 — AGENT_ISOLATION: Enforce timeouts on every agent run

Every `agent.run()` call must be raced against a timeout. Set a hard timeout in the circuit breaker (Rule 35) and add `Promise.race` as a second layer.

```typescript
const AGENT_TIMEOUT_MS = 30_000

const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    p,
    new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error("agent timeout")), ms)
    ),
  ])

const result = await withTimeout(agent.run(ctx), AGENT_TIMEOUT_MS)
  .catch(e => err(String(e)))
```

### Rule 67 — CANCELLATION: AbortController for in-flight operations

If a user closes the chat, abort the corresponding LLM request to save API cost. Pass `AbortSignal` from the disconnect event down to the `fetch` call.

```typescript
// Worker — abort LLM call if job is cancelled
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 30_000)

try {
  const response = await fetch(llmUrl, { signal: controller.signal, ... })
} finally {
  clearTimeout(timeoutId)
}

// React hook — abort fetch on unmount
useEffect(() => {
  const ctrl = new AbortController()
  fetchMessages(sessionId, ctrl.signal)
  return () => ctrl.abort()
}, [sessionId])
```

### Rule 68 — SCHEMA_MIGRATIONS: Expand, migrate, contract

Rolling out Postgres schema changes to a live system must not break running code. Never drop or rename a column in the same deployment that removes code using it.

```sql
-- Phase 1: Expand — add new column (nullable or with default)
ALTER TABLE sessions ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;

-- Deploy code that reads/writes is_archived.
-- Old code still works (uses the default). New code uses the column.

-- Phase 2: Backfill if needed
UPDATE sessions SET is_archived = FALSE WHERE is_archived IS NULL;

-- Phase 3: Contract — only after old code is fully retired
ALTER TABLE sessions DROP COLUMN old_status;
```
