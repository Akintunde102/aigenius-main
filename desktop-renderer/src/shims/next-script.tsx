import { useEffect } from 'react';

type ScriptProps = {
  id?: string;
  src?: string;
  strategy?: 'beforeInteractive' | 'afterInteractive' | 'lazyOnload';
  children?: string;
};

function runInlineScriptOnce(id: string, source: string): void {
  if (typeof document === 'undefined' || document.getElementById(id)) {
    return;
  }
  const el = document.createElement('script');
  el.id = id;
  el.text = source;
  document.head.appendChild(el);
}

export default function Script({
  id,
  src,
  strategy = 'afterInteractive',
  children,
}: ScriptProps) {
  if (strategy === 'beforeInteractive' && children && id) {
    runInlineScriptOnce(id, children);
    return null;
  }

  useEffect(() => {
    if (src) {
      const el = document.createElement('script');
      el.src = src;
      el.async = strategy === 'lazyOnload';
      if (id) {
        el.id = id;
      }
      document.body.appendChild(el);
      return () => {
        el.remove();
      };
    }
    if (children && id) {
      runInlineScriptOnce(id, children);
      return () => {
        document.getElementById(id)?.remove();
      };
    }
    return undefined;
  }, [children, id, src, strategy]);

  return null;
}
