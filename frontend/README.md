# AIGenius Frontend (nobox-console)

Next.js frontend for **AIGenius** — a pay-as-you-go AI chat platform with multi-model support, personas, and real-time streaming.

> **Architecture map (routes, data flow, where to edit):** [ARCHITECTURE.md](./ARCHITECTURE.md)

> **Run both servers from repo root:** see the [root README](../README.md) for `npm run dev` (backend + frontend in one terminal with play/pause in the IDE).

## Features

- **Multi-model chat** — GPT-4, Claude, Gemini, and others in one interface
- **Pay-as-you-go** — Credit-based usage, no subscription
- **Real-time streaming** — Live AI responses
- **File uploads** — Images and documents in conversations
- **Chat history** — Save, search, and organize conversations
- **Personas** — Custom AI personalities with dedicated chats
- **Auth** — Google OAuth (email/GitHub configurable via env)
- **Payments** — Paystack integration
- **Responsive** — Desktop and mobile

## Tech Stack

| Layer | Technologies |
|-------|---------------|
| Framework | Next.js 13 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS, Sass/SCSS, Lucide React, Radix UI, Ant Design |
| Data | TanStack React Query, Axios, Zod |
| Editor | EditorJS, CodeMirror |
| Payments | react-paystack, Paystack |
| Testing | Jest, Playwright |
| Tooling | ESLint, Babel |

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (views)/            # Route groups
│   │   │   ├── (auth)/         # login, signup
│   │   │   ├── docs/           # privacy-policy, terms-and-conditions
│   │   │   ├── published-conversations/
│   │   │   ├── payment-callback/
│   │   │   └── ...
│   │   ├── components/         # Shared UI (chat, model interface, etc.)
│   │   ├── layout.tsx
│   │   ├── middleware.ts
│   │   └── styles/
│   ├── lib/                    # Utils, hooks, config, API call helpers
│   ├── nobox-client/           # API client (calls, schemas, auth)
│   ├── servercall/             # Server-call setup
│   └── assets/
├── public/
├── e2e/                        # Playwright E2E tests
├── ARCHITECTURE.md             # Routes, conventions, “where to change what”
├── DESIGN_SYSTEM.md            # Design tokens and components
├── docs/
│   ├── archive/                # Historical / exploratory notes (see README inside)
│   └── guides/                 # Longer how-tos (e.g. modals)
└── env.example
```

## Getting Started

### Prerequisites

- Node.js (see `engines` in `package.json`)
- **Yarn** (project uses Yarn; npm is discouraged)

### Install

```bash
yarn install
```

### Environment

Copy the example env and set values:

```bash
cp env.example .env.local
```

Key variables:

- `NEXT_PUBLIC_NOBOX_API_ROOT_URL` / `NEXT_PUBLIC_API_URL` — backend API base URL
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_GOOGLE_REDIRECT_URI` — Google OAuth
- `NEXT_PUBLIC_ENABLE_EMAIL_AUTH`, `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH`, `NEXT_PUBLIC_ENABLE_GITHUB_AUTH` — auth toggles

### Run

```bash
yarn dev      # Dev server on http://localhost:3001
yarn build    # Production build
yarn start    # Run production server
```

## Scripts

| Script | Description |
|--------|-------------|
| `yarn dev` | Start dev server (port 3001) |
| `yarn build` | Production build |
| `yarn start` | Start production server |
| `yarn lint` | Run ESLint |
| `yarn test` | Run Jest tests |
| `yarn test:watch` | Jest in watch mode |
| `yarn test:coverage` | Jest with coverage |
| `yarn deploy` | Run `deploy.sh` (chmod + execute) |

## Testing

- **Unit**: Jest + Testing Library — `yarn test`
- **E2E**: Playwright specs in `e2e/tests/`

## Deployment

- Use `deploy.sh` for deployment (e.g. `yarn deploy`).
- PM2: `yarn pm2:start:prod` runs the deploy script under PM2.

## Related Docs

- **ARCHITECTURE.md** — App Router map, chat data flow, layer conventions, edit index
- **DESIGN_SYSTEM.md** — Colors, typography, layout, and UI components
- **docs/archive/** — Auth refactor notes, plus-button UX studies (non-canonical)
- **src/app/components/model-interface/README.md** — Session management and hooks
- **env.example** — All environment variables and comments

## License

MIT (see `MIT` file in this folder).
