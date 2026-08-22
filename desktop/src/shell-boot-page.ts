/** Inline boot splash shown while sidecars start (data: URL in BrowserWindow). */
export function createShellBootDataUrl(sessionRestoreHint = false): string {
  const subtitle = sessionRestoreHint
    ? '<p class="sub">Verifying your saved session…</p>'
    : '<p class="sub">Starting local services…</p>';
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><style>
html,body{margin:0;height:100%;background:#0c0d0f;color:#d4d4d8;font-family:system-ui,-apple-system,sans-serif}
.wrap{display:flex;height:100%;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px}
.spin{width:28px;height:28px;border:2px solid rgba(34,211,238,0.2);border-top-color:#22d3ee;border-radius:50%;animation:r .8s linear infinite;margin-bottom:20px}
@keyframes r{to{transform:rotate(360deg)}}
p{font-size:14px;font-weight:500;color:#d4d4d8;margin:0}
.sub{font-size:12px;line-height:1.5;color:#71717a;margin-top:8px;max-width:18rem}
</style></head><body><div class="wrap"><div class="spin" role="status" aria-label="Loading"></div><p>Opening AIGenius…</p>${subtitle}</div></body></html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

export function isShellBootDataUrl(url: string): boolean {
  return url.startsWith('data:text/html');
}
