# Part One — Functional Programming Foundations (Rules 1–24)

> These 24 rules govern every function, module, and data transformation in the codebase.

---

## Core Purity Rules (1–6)

### Rule 1 — PURITY: Write only pure functions

A pure function always returns the same output for the same input and does nothing else. No I/O, no mutation, no exceptions thrown, no external state read or written. Time and randomness are side-effects — inject `Date.now()` and `Math.random()` as parameters.

```typescript
// ❌ Wrong — hidden side-effect
const makeJob = () => ({ id: uuid(), createdAt: Date.now() })

// ✅ Right — inject non-deterministic values as parameters
const makeJob = (id: string, now: number) => ({ id, createdAt: now })
const job = makeJob(uuid(), Date.now())  // side-effects at the call-site only
```

### Rule 2 — ERRORS: Never throw exceptions for expected errors

Throwing breaks referential transparency. Return `Result<T,E>` for any error a caller can reasonably handle. Reserve `throw` only for truly unrecoverable infrastructure failures (OOM, disk full).

```typescript
function parseUser(data: unknown): Result<User> {
  if (typeof data === "object" && data !== null) return ok(data as User)
  return err("Invalid input: expected object")
}
```

### Rule 3 — OPTIONALITY: Use Option / Result for missing or failed values

Never return `null`, `undefined`, or `-1` to signal absence. Wrap the return type so both the present and absent cases are explicit and the compiler forces the caller to handle both.

### Rule 4 — IMMUTABILITY: Use immutable data — never mutate

Create new objects with changes applied; never modify in place. Use TypeScript `Readonly<>` and `ReadonlyArray<>` on all domain types.

```typescript
// ❌ Wrong
messages.push(newMsg)
// ✅ Right
const next = [...messages, newMsg]
```

### Rule 5 — STATE: Make state explicit — pass and return it

When a function needs to track state, pass current state in as an argument and return the new state as output. Never hide state in a mutating closure. Short-lived mutable structures in `useState` are acceptable for UI, but core domain logic must remain pure.

```typescript
const updateSession = (state: Session, patch: Partial<Session>): Session =>
  ({ ...state, ...patch, updatedAt: new Date().toISOString() })
```

### Rule 6 — PARSING: Parse at the boundary — never trust raw input

Parse into a proper type immediately at every system boundary (HTTP route, WebSocket message, queue payload, LLM response). Use Zod schemas at every entry point.

```typescript
const MsgSchema = z.object({
  sessionId: z.string().uuid(),
  content:   z.string().min(1).max(8000),
})
const input = MsgSchema.parse(req.body)
```

---

## Algebraic Laws (7–14)

### Rule 7 — FUNCTOR: Obey the Functor law

`map(x, id) === x`. Mapping the identity function returns the structure unchanged. Ensure `Result.map` and `Array.map` behave as functors.

### Rule 8 — MONOID: Obey the Monoid laws

A monoid has a binary `combine` and a `zero` value. Two laws: (1) Associativity: `combine(combine(a,b),c) === combine(a,combine(b,c))`. (2) Identity: `combine(zero,x) === x`. Safely parallelisable.

### Rule 9 — MONAD: Obey the Monad laws

A monad has `flatMap` (chain) and `unit`. Three laws: Left identity, Right identity, Associativity. Never perform side effects inside `flatMap`.

```typescript
const processMessage = (sessionId: SessionId, content: string) =>
  pipe(
    validateContent(content),
    flatMap(parsed  => buildContext(sessionId, parsed)),
    flatMap(ctx     => callLLM(ctx)),
    flatMap(resp    => saveMessage(sessionId, resp)),
  )
```

### Rule 10 — DESIGN: Design the API and laws before implementing

Write down what properties must always hold before writing any implementation. The laws are the specification. Document invariants in comments or tests.

### Rule 11 — TESTING: Encode laws as executable property-based tests

Use `fast-check` to run laws against hundreds of randomly generated inputs.

```typescript
import * as fc from "fast-check"

test("Result map obeys functor identity", () => {
  fc.assert(fc.property(fc.string(), s => {
    const r = ok(s)
    expect(map(r, x => x)).toEqual(r)
  }))
})
```

### Rule 12 — COMPOSITION: Compose, don't duplicate

When two functions share the same structural pattern, factor it into a higher-order function. Copy-pasted logic is always a sign of a missing abstraction.

### Rule 13 — BOUNDARY: Functional core, imperative shell

Keep the core logic purely functional. Only let I/O, logging, database calls, or network requests happen at the outermost edges.

```typescript
// Pure core — no I/O
const buildPrompt = (ctx: SessionContext): string =>
  ctx.messages.map(m => `${m.role}: ${m.content}`).join("\n")

// Imperative shell — all side effects live here
const run = async (ctx: SessionContext) => {
  const prompt = buildPrompt(ctx)           // pure
  return callAnthropicAPI(prompt)            // I/O at boundary
}
```

### Rule 14 — LAZINESS: Use laziness deliberately, not by default

TypeScript/JavaScript is eager by default — use generators, async iterators, or RxJS only when needed (infinite sequences, streaming LLM tokens, early termination).

---

## Advanced FP (15–24)

### Rule 15 — TOTALITY: Write total functions

A total function returns a valid, defined value for every input in its domain. Use `never` in exhaustive switches.

```typescript
type Job = AgentJob | ScheduledJob

const handle = (job: Job): string => {
  switch (job.type) {
    case "run_agent":       return runAgent(job)
    case "scheduled_agent": return scheduleAgent(job)
    default:
      const _: never = job  // compile error if a new type is added
      return _
  }
}
```

### Rule 16 — ADT: Model domains with Algebraic Data Types

Use sum types (`A | B`) for "one or the other" and product types (`{ A, B }`) for "both together". Make illegal states unrepresentable.

```typescript
type AgentStatus =
  | { status: "idle" }
  | { status: "running"; jobId: string; startedAt: Date }
  | { status: "failed";  jobId: string; error: string }
// idle+jobId simultaneously is impossible
```

### Rule 17 — PARAMETRICITY: Let the type signature constrain you

Write the most general type signature possible. Generic type `A` limits implementation choices — fewer choices means fewer bugs.

### Rule 18 — TYPECLASSES: Prefer interfaces + DI over class inheritance

Model type classes as interfaces passed as arguments to factory functions. Solves the expression problem.

### Rule 19 — RECURSION: Prefer recursion; use trampolines for deep stacks

JavaScript does not guarantee tail-call optimisation. Use iterative solutions for large lists. Use a trampoline only when recursion depth is genuinely unbounded.

```typescript
type Thunk<T> = T | (() => Thunk<T>)
const trampoline = <T>(f: Thunk<T>): T => {
  let r = f
  while (typeof r === "function") r = (r as ()=>Thunk<T>)()
  return r as T
}
```

### Rule 20 — EFFECT: Separate description from execution

Build a data structure that describes what to do, then execute it at the boundary. This is the pattern behind Redux actions and queue job types.

```typescript
const job: AgentJob = {
  type: "run_agent",
  jobId: uuid(), sessionId, agentName: "summary", triggeredAt: Date.now(),
}
await queue.add("agent-jobs", job)  // execution at the boundary
```

### Rule 21 — PIPE: Build programs by chaining functions

`pipe(f,g,h)(x) = h(g(f(x)))`. The primary assembly mechanism — not classes, not inheritance. Use `pipeAsync` for async pipelines.

```typescript
const processIncoming = (raw: unknown) =>
  pipe(
    raw,
    parseMessage,
    flatMap(validate),
    flatMap(enrich),
    flatMap(persist),
  )
```

### Rule 22 — CURRYING: Configuration first, data last

Transform multi-argument functions into chains of single-argument functions. Data-last so curried functions slot directly into pipe chains.

```typescript
const withSessionId =
  (sessionId: SessionId) =>
  (message: Message): Message =>
  ({ ...message, sessionId })

pipe(rawMsg, parseMessage, flatMap(withSessionId(sid)))
```

### Rule 23 — SMART_CTORS: Use smart constructors

Never use raw primitives where a constrained type would prevent invalid values. Validate at the boundary, return a typed value.

```typescript
type SessionId = string & { readonly _brand: unique symbol }

const toSessionId = (s: string): Result<SessionId> =>
  /^[0-9a-f-]{36}$/.test(s) ? ok(s as SessionId) : err("Invalid session id")
```

### Rule 24 — MEMOIZE: Memoize pure functions for free performance

A pure function's results can be cached forever. Ensure cache size is bounded or use `WeakMap`.

```typescript
const memoize = <T,R>(fn:(a:T)=>R, cache=new Map<T,R>()) => (arg:T): R => {
  if (!cache.has(arg)) cache.set(arg, fn(arg))
  return cache.get(arg)!
}
```
