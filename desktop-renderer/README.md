# desktop-renderer (Vite packaged UI)

Production desktop packages use this workspace by default (`AIGENIUS_DESKTOP_UI=vite`).

- Builds a **client-only** Vite bundle from shared `client/frontend/src` code
- Next.js APIs are shimmed (`src/shims/next-*.tsx`)
- React Router handles `/desktop-login`, `/desktop-welcome`, `/desktop-search-index`, `/desktop-success`, `/`, and `/chat/:conversationId`
- Packaged apps load via `aigenius://app/...` (default) or a tiny static HTTP server (`AIGENIUS_DESKTOP_UI_PROTOCOL=0`)

## Build

```bash
cd client/desktop-renderer && npm run build
# or from client/desktop:
npm run build:desktop:ui
```

Dev still uses live Next.js (`client/frontend`). Do not add features here unless they are required for the packaged desktop shell.
