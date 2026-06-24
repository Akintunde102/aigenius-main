---
name: developer-rulebook
description: "68-rule Developer Rulebook for multi-session chat + agent platform. FP foundations, architecture, backend, UI, and distributed systems rules. MANDATORY for all code generation."
allowed-tools: Read, Write, Edit
version: 2.0
priority: CRITICAL
---

# Developer Rulebook — 68 Rules

> **CRITICAL SKILL** — Every line of code produced MUST comply with these rules.
> Rules are binding unless explicitly overridden by the tech lead.

---

## 🎯 Selective Reading Rule

**Read ONLY the reference files relevant to the current task!** Use the content map below.

---

## 📑 Content Map

| File | Rules | When to Read |
|------|-------|--------------|
| `references/fp-foundations.md` | 1–24 | **ALWAYS** — Every coding task. Core purity, Result type, immutability, composition, pipe, currying, smart constructors |
| `references/architecture-rules.md` | 25–36 | Project structure, layers, DI, config, logging, circuit breakers |
| `references/backend-rules.md` | 37–44 | Service/repository implementation, queue jobs, agent interface |
| `references/ui-frontend-rules.md` | 45–58 | React/Next.js components, state management, WebSocket, virtualisation |
| `references/distributed-systems-rules.md` | 59–68 | Event versioning, observability, retries, migrations, cancellation |

### Which files to load per task type

| Task | Load |
|------|------|
| **Any backend code** | `fp-foundations.md` + `architecture-rules.md` + `backend-rules.md` |
| **Distributed/queue/agent work** | Above + `distributed-systems-rules.md` |
| **Any frontend code** | `fp-foundations.md` + `ui-frontend-rules.md` |
| **Full-stack feature** | All 5 files |
| **Code review** | All 5 files |

---

## 📋 Quick Reference — All 68 Rules

### Part 1 — FP Foundations (1–24)

| # | Tag | Rule |
|---|-----|------|
| 1 | PURITY | Write only pure functions |
| 2 | ERRORS | Never throw exceptions for expected errors — return `Result<T,E>` |
| 3 | OPTIONALITY | Use Option / Result for missing or failed values |
| 4 | IMMUTABILITY | Use immutable data — never mutate |
| 5 | STATE | Make state explicit — pass and return it |
| 6 | PARSING | Parse at the boundary — never trust raw input (Zod everywhere) |
| 7 | FUNCTOR | Obey the Functor law — `map(x, id) === x` |
| 8 | MONOID | Obey the Monoid laws — associativity + identity |
| 9 | MONAD | Obey the Monad laws |
| 10 | DESIGN | Design the API and laws before implementing |
| 11 | TESTING | Encode laws as executable property-based tests (fast-check) |
| 12 | COMPOSITION | Compose, don't duplicate |
| 13 | BOUNDARY | Push side effects to the boundary — functional core, imperative shell |
| 14 | LAZINESS | Use laziness deliberately, not by default |
| 15 | TOTALITY | Handle every possible input — write total functions |
| 16 | ADT | Model domains with Algebraic Data Types |
| 17 | PARAMETRICITY | Let the type signature constrain you |
| 18 | TYPECLASSES | Prefer interfaces + DI over class inheritance |
| 19 | RECURSION | Prefer recursion; use trampolines for deep stacks |
| 20 | EFFECT | Separate description from execution — Effect / Command pattern |
| 21 | PIPE | Build programs by chaining functions with `pipe` / `pipeAsync` |
| 22 | CURRYING | Curry functions — configuration first, data last |
| 23 | SMART_CTORS | Avoid primitive obsession — use smart constructors |
| 24 | MEMOIZE | Memoize pure functions for free performance |

### Part 2 — Architecture & Structure (25–36)

| # | Tag | Rule |
|---|-----|------|
| 25 | FEATURE_FOLDERS | Group files by domain, not by type |
| 26 | FILE_NAMING | Name files as `domain.role.ts` |
| 27 | TWO_PROCESSES | Run the API server and the worker as separate processes |
| 28 | SESSION_ID_FIRST | `sessionId` is the first argument to every session-scoped function |
| 29 | DI | Inject dependencies — never import infrastructure directly |
| 30 | CONFIG | Single config module — no `process.env` outside it |
| 31 | LAYERS | Layers only talk to the layer directly below |
| 32 | THIN_ROUTES | Routes are thin — parse, call service, respond |
| 33 | REPOSITORY | Repositories contain only DB queries and row mapping |
| 34 | REDIS_PUBSUB | Use Redis pub/sub for cross-process communication |
| 35 | CIRCUIT_BREAKER | Wrap all external calls with a circuit breaker |
| 36 | LOGGING | Log every operation with context using structured JSON (pino) |

### Part 3 — Backend Code (37–44)

| # | Tag | Rule |
|---|-----|------|
| 37 | RESULT_EVERYWHERE | Every fallible function returns `Result<T, E>` |
| 38 | READONLY_TYPES | All domain types are `Readonly` — no exceptions |
| 39 | BRANDED_IDS | All entity IDs are branded types |
| 40 | PIPE_ASYNC | Use `pipeAsync` for async service pipelines |
| 41 | IDEMPOTENCY | Every queue job must be idempotent |
| 42 | JOBS_ARE_DATA | Queue jobs are plain serialisable data objects with `version` field |
| 43 | AGENT_STRATEGY | Every agent implements the `Agent` interface |
| 44 | VALIDATION_BOUNDARY | Validate all external input at the boundary with Zod |

### Part 4 — UI & Frontend (45–58)

| # | Tag | Rule |
|---|-----|------|
| 45 | URL_AS_STATE | The session ID lives in the URL — nowhere else |
| 46 | SERVER_VS_CLIENT_STATE | Never store server data in `useState` — use TanStack Query |
| 47 | SOCKET_HOOK | One custom hook owns the WebSocket per session |
| 48 | CONTAINER_PRESENTER | Separate container components from presenter components |
| 49 | OPTIMISTIC_UPDATES | Show messages optimistically before server confirms |
| 50 | STREAMING_TOKENS | Stream LLM tokens by appending — never replacing |
| 51 | VIRTUALISE | Virtualise the message list — never render all messages |
| 52 | MEMO_BOUNDARIES | Memoize at component boundaries — not everywhere |
| 53 | NO_LOGIC_IN_COMPONENTS | Extract all business logic out of component files |
| 54 | CUSTOM_HOOKS | Extract all side effects into custom hooks |
| 55 | FEATURE_FOLDERS_UI | Mirror the backend domain structure in the frontend |
| 56 | TYPED_SOCKETS | Type all socket events end-to-end |
| 57 | LAZY_ROUTES | Lazy-load routes and code-split by page |
| 58 | ERROR_BOUNDARIES | Wrap every page in an error boundary |

### Part 5 — Distributed Systems (59–68)

| # | Tag | Rule |
|---|-----|------|
| 59 | EVENT_VERSIONING | Every event and job payload must carry a `version` field |
| 60 | AGENT_DETERMINISM | Log all LLM inputs and outputs per job for audit and replay |
| 61 | BACKPRESSURE | Limit concurrency of expensive operations with `p-limit` |
| 62 | IDEMPOTENT_ENDPOINTS | Require an `Idempotency-Key` header on all write endpoints |
| 63 | OBSERVABILITY | Instrument the entire system with OpenTelemetry |
| 64 | DATA_OWNERSHIP | Each domain owns its own tables — no cross-domain queries |
| 65 | RETRY_POLICY | Standardise retries with exponential backoff and jitter |
| 66 | AGENT_ISOLATION | Enforce timeouts and resource limits on every agent run |
| 67 | CANCELLATION | Support cancellation of in-flight operations with AbortController |
| 68 | SCHEMA_MIGRATIONS | Enforce backward-compatible DB migrations — expand, migrate, contract |

---

## 🔗 Related Skills

| Need | Skill |
|------|-------|
| Clean code basics | `@[skills/clean-code]` |
| API design patterns | `@[skills/api-patterns]` |
| Architecture decisions | `@[skills/architecture]` |
| Testing patterns | `@[skills/testing-patterns]` |
| Database design | `@[skills/database-design]` |
| React/Next.js perf | `@[skills/react-best-practices]` |

---

## ⚠️ Enforcement Reminder

When writing code under this rulebook:

1. **Every function** must be pure unless it's at the boundary (Rule 1, 13)
2. **Every error** must return `Result<T,E>` — no throwing (Rule 2, 37)
3. **Every type** must be `Readonly` with branded IDs (Rule 4, 38, 39)
4. **Every input** must be parsed with Zod at the boundary (Rule 6, 44)
5. **Every pipeline** must use `pipe` / `pipeAsync` (Rule 21, 40)
6. **Every dependency** must be injected (Rule 29)
7. **Every log** must be structured JSON with `sessionId` (Rule 36)
