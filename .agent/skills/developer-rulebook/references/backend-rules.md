# Part Three — Backend Code Rules (Rules 37–44)

> These rules govern the implementation of services, repositories, agents, and queue workers.

---

### Rule 37 — RESULT_EVERYWHERE: Every fallible function returns `Result<T, E>`

No function in the service or repository layer is allowed to throw. It returns `Result<T,E>`. The only permitted throw sites are route handlers (which convert to HTTP errors) and the worker (which marks jobs as failed).

```typescript
async function findUser(id: UserId): Promise<Result<User>> {
  try {
    const row = await db.query("SELECT * FROM users WHERE id=$1", [id])
    return row ? ok(mapRowToUser(row)) : err("User not found")
  } catch (e) {
    return err(`DB error: ${String(e)}`)
  }
}
```

### Rule 38 — READONLY_TYPES: All domain types are `Readonly` — no exceptions

Every type exported from `shared/types.ts` uses `Readonly<>` and `ReadonlyArray<>`. Mutation of a domain object is a compile-time error.

```typescript
export type Message = Readonly<{
  id:        MessageId
  sessionId: SessionId
  role:      "user" | "assistant" | "agent"
  content:   string
  createdAt: Date
}>
```

### Rule 39 — BRANDED_IDS: All entity IDs are branded types

`SessionId`, `MessageId`, and `UserId` are branded string types. A function accepting `SessionId` cannot be called with a raw string or a `MessageId`.

```typescript
type MessageId = string & { readonly _brand: unique symbol }

const toMessageId = (s: string): Result<MessageId> =>
  /^[0-9a-f-]{36}$/.test(s) ? ok(s as MessageId) : err("Invalid message id")
```

### Rule 40 — PIPE_ASYNC: Use `pipeAsync` for async service pipelines

Any service method that chains more than two async operations must use `pipeAsync` from `shared/pipe.ts`. Nested `await` chains and long `.then()` chains are forbidden.

```typescript
const processMessage = (sessionId: SessionId, content: string) =>
  pipeAsync(
    { sessionId, content },
    validateContent,
    enrichWithContext,
    callLLM,
    persistMessage,
    publishToSocket,
  )
```

### Rule 41 — IDEMPOTENCY: Every queue job must be idempotent

A job that is retried must produce the same result as running it once. Assign a `jobId` (UUID) at creation. At job start, check whether this `jobId` has already been processed.

```typescript
const handleJob = async (job: AgentJob) => {
  if (await redis.get(`job:done:${job.jobId}`)) return ok(undefined)
  const result = await agent.run(context)
  await redis.set(`job:done:${job.jobId}`, "1", "EX", 86400)
  return result
}
```

### Rule 42 — JOBS_ARE_DATA: Queue jobs are plain serialisable data objects

A job is a discriminated union value with no methods, no class instances, no functions. It must serialise to JSON and back without loss. Must include a `version` field (see Rule 59).

```typescript
type AgentJob = {
  readonly type:        "run_agent"
  readonly jobId:       string
  readonly sessionId:   SessionId
  readonly agentName:   string
  readonly triggeredAt: number
  readonly version:     number
}
```

### Rule 43 — AGENT_STRATEGY: Every agent implements the `Agent` interface

Adding a new agent means implementing this interface and registering it in `AgentRegistry`. No other file changes.

```typescript
interface Agent {
  readonly name: string
  run(ctx: SessionContext): Promise<Result<AgentResult>>
}
```

### Rule 44 — VALIDATION_BOUNDARY: Validate all external input at the boundary with Zod

HTTP request bodies, WebSocket payloads, queue job payloads, and LLM JSON responses are all validated with Zod at the point of entry. Nothing downstream receives unvalidated data. Use `safeParse` in route handlers so validation errors return 400, not 500.

> **Note:** Also validate outputs from the LLM when you expect structured JSON. An LLM returning malformed JSON should produce `Result.Err`, not a runtime crash.
