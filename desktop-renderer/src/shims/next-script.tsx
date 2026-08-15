import { useEffect } from 'react';

type ScriptProps = {
  id?: string;
  src?: string;
  strategy?: 'beforeInteractive' | 'afterInteractive' | 'lazyOnload';
  children?: string;
};

export default function Script({
  id,
  src,
  strategy = 'afterInteractive',
  children,
}: ScriptProps) {
  useEffect(() => {
    if (strategy === 'beforeInteractive') {
      return;
    }
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
      const existing = document.getElementById(id);
      if (existing) {
        return;
      }
      const el = document.createElement('script');
      el.id = id;
      el.text = children;
      document.body.appendChild(el);
      return () => {
        el.remove();
      };
    }
    return undefined;
  }, [children, id, src, strategy]);

  return null;
}
