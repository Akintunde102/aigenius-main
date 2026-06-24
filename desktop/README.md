# AIGenius desktop (Electron)

Linux-focused shell that runs the Next.js app and a small **Hono** companion server (`../desktop-server`) on `127.0.0.1`. Packaged builds use **`ELECTRON_RUN_AS_NODE=1`** so the same Electron binary runs `server.js` and the mini-server without shipping a separate Node runtime.

## Development

1. Install frontend deps: `cd frontend && yarn install` (or your usual flow).
2. Install desktop + mini-server deps:

   ```bash
   cd desktop-server && npm install && npm run build
   cd ../desktop && npm install && npm run compile
   ```

3. **Two terminals** — Electron does not start Next for you.

   - **Terminal 1** — Next (port **3001**, default API `http://127.0.0.1:8001` in dev via `frontend/next.config.js`):

     ```bash
     cd frontend && yarn dev
     ```

     Or from `desktop/`: `npm run dev:frontend`.

   - **Terminal 2** — mini-server + Electron main:

     ```bash
     cd desktop && npm run dev
     ```

     Start Terminal 2 after Next is listening. Electron opens when `http://127.0.0.1:3001/desktop-login` responds.

   **Faster repeat runs:** `npm run dev:quick` in `desktop/` skips `build:server` if the server is already built.

   Override the UI port with `AIGENIUS_FRONTEND_PORT` (must match Next).

   **Mini-server CORS:** set `AIGENIUS_DESKTOP_CORS_ORIGINS` to a comma-separated list if the UI origin is not `http://127.0.0.1:3001` / `http://localhost:3001` (must include the exact origin the renderer uses).

   **Upstream API:** the mini-server proxies to `AIGENIUS_UPSTREAM_API_URL` (default `http://127.0.0.1:8000`). Point it at your Nest gateway if the API is not local.

   **OAuth return URL:** backend must send the browser back to the same origin/port as this Next app. Set `CLIENT_AUTH_PATH` and/or `FRONTEND_URL` / `DASHBOARD_URL` in `backend/env/.local.env` to `http://127.0.0.1:3001` (or `http://localhost:3001`). If those still pointed at port **3000** while Next runs on **3001**, you would see a failed load and then `/login` again.

   **Workflow deep links:** set backend `WORKFLOW_STUDIO_BASE_URL=http://127.0.0.1:3001` (or your UI origin) so `workflow_agent` returns `/workflow/:id` URLs that open in this app. The Next route `/(views)/workflow/[id]` loads the workflow from the API.

   **Local file index:** full-home auto-index on first launch is **off** by default. Set `AIGENIUS_AUTO_INDEX_IF_EMPTY=1` to restore the old “scan home when index empty” behavior after 15s. `AIGENIUS_SKIP_AUTO_INDEX=1` still disables that path entirely.

   **Debug:** `npm run dev:electron:debug` or `AIGENIUS_DESKTOP_DEVTOOLS=1` before `electron .` (DevTools after first load).

   **Linux chrome-sandbox errors:** scripts set `ELECTRON_DISABLE_SANDBOX=1`. Packaged `.deb`: see `deb-after-install.sh`.

The UI expects `http://127.0.0.1:3001` and API `http://127.0.0.1:8001` in dev (frontend default) or `yarn build:desktop` / `npm run build:desktop` for packaged builds.

## Performance / profiling

Measure before tuning (cold start, long sessions, IPC latency):

- **Renderer (Next inside Electron):** Chrome DevTools **Performance** and **Memory** (heap snapshots if investigating leaks); React DevTools **Profiler** for rerenders. For bundle size, use `@next/bundle-analyzer` in `frontend/` when optimizing what the shell loads.
- **Main process:** Electron [`contentTracing`](https://www.electronjs.org/docs/latest/api/content-tracing), or run with `--trace-startup` / `--trace-startup-file` to inspect startup. Optional: `node --cpu-prof` when profiling the compiled main bundle.
- **Local profiling toggles:** `AIGENIUS_SKIP_AUTO_INDEX=1` skips background indexing; `AIGENIUS_DESKTOP_BRIDGE_DEBUG=1` logs preload/renderer bridge diagnostics.
- **Background throttling:** By default the shell keeps **`backgroundThrottling: false`** (smoother timers when the window is unfocused). Set **`AIGENIUS_BACKGROUND_THROTTLING=1`** to enable Chromium’s background throttling (better idle power; verify animations/timers if you enable it).

### Navigation lock (main window)

The main BrowserWindow only stays on the embedded Next app (`AIGENIUS_FRONTEND_PORT`, default `3001`) and the local mini-server (`AIGENIUS_MINI_SERVER_PORT`, default `8001`), plus optional extra origins and common HTTPS OAuth hosts (see `src/navigation-guards.ts`). Any other top-level navigation or `window.open` is intercepted and opened in a **closable modal** window (still http/https-only, sandboxed, no preload). Set `AIGENIUS_DESKTOP_EXTERNAL_USE_OS_BROWSER=1` to use the **system default browser** instead of that modal. For a remote API origin (e.g. production gateway), set `AIGENIUS_DESKTOP_ALLOWED_ORIGINS` to a comma-separated list of full origins (e.g. `https://api.example.com`). To tighten OAuth domains, override `AIGENIUS_DESKTOP_TRUSTED_HTTPS_SUFFIXES` (defaults include `google.com` and `googleapis.com`). When Google (or another allowed host) is shown in a **modal or popup**, any redirect to the local Next or mini-server origin is **handed off to the main window** and the child closes so you return to the app (see `registerLocalOriginHandoff` in `navigation-guards.ts`).

## App icon

**Source of truth:** repo-root [`../aigenius_icon_final.png`](../aigenius_icon_final.png) (512×512).

- **`npm run compile`** and **`npm run prepackage`** run **`npm run sync-brand-icon`**, which copies that PNG to `desktop/build/aigenius_icon_final.png` and `frontend/public/logo.png`.
- **Dev:** the main `BrowserWindow` loads the icon from the repo-root file first, then `desktop/build/`.
- **Packaged (.deb / etc.):** `build/aigenius_icon_final.png` is included in the app bundle (`package.json` → `build.files`) and passed to `BrowserWindow` (previously packaged builds skipped this and often showed the generic Electron icon).
- **electron-builder** also uses `build.icon` for Linux menu / `.desktop` icons.
- **Linux taskbar / dock** may cache icons. After replacing the asset, fully quit the app, run `npm run compile` from `desktop/`, and reinstall or rerun; if the dock still shows the old mark, log out/in or clear the shell’s icon cache.

## Production packages (`.deb` + Flatpak)

Prerequisites on the build machine:

- `flatpak` and `flatpak-builder`
- Appropriate Flatpak runtime/SDK (electron-builder uses `24.08` in `package.json`; adjust if your builder errors)
- Frontend `node_modules` installed so `npx next build` works

From `desktop/`:

```bash
npm run package
```

Artifacts land in `desktop/release/`.

- **`npm run package:deb`** — Debian package only
- **`npm run package:flatpak`** — Flatpak bundle only

`prepackage` runs: compile Electron main, build Hono server, **`npm run build:desktop`** in `frontend/` (pins `NEXT_PUBLIC_NOBOX_API_ROOT_URL` to the local mini-server), then copies `frontend/.next/standalone` + static + `public` and the mini-server into `dist-resources/` for `electron-builder`.

Use **`npm run package:deb:full`** for a one-shot **`.deb`** (same as `prepackage` + `electron-builder --linux deb`).

**Note:** Do not set `NEXT_PUBLIC_BUILD_TARGET=desktop` for `next build` — on Next 13 it can break static analysis (`/_document`).

### Debian sandbox permissions

The Debian package now runs `scripts/linux/deb-after-install.sh` during install. It automatically enforces:

- `/opt/AIGenius/chrome-sandbox` owner: `root:root`
- mode: `4755`

This removes the manual post-install `chown/chmod` step for new installs/upgrades.

## OAuth / Paystack

Register Google (and later GitHub) redirect URIs for `http://127.0.0.1:3001/...`. Paystack flows that must open in the system browser can use `window.aigeniusDesktop?.openExternal(url)` from the renderer when `isDesktop` is available.
