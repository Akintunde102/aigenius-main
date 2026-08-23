# AIGenius homepage — standalone preview

Open `home.html` in a browser (double-click or serve this folder).

## Files

- `home.html` — full standalone page (light + dark screenshots, theme toggle)
- `images/` — hero screenshots
- `snapshots/` — Playwright captures for visual review

## Theme

Use the **◐** button (top right) or set `data-theme="light"` / `data-theme="dark"` on `<html>`.

## Regenerate snapshots

```bash
cd client/frontend
node scripts/snapshot-home-standalone.cjs
```

Outputs `standalone/snapshots/home-light.png` and `home-dark.png`.
