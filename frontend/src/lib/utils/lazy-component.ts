import { createElement, type ComponentType, type ReactNode } from 'react';

function isRenderableType(component: unknown): component is ComponentType<never> {
  if (typeof component === 'function') {
    return true;
  }
  return Boolean(
    component &&
      typeof component === 'object' &&
      '$$typeof' in (component as Record<string, unknown>),
  );
}

/** Inline message when a code-split import has no component export. */
export function lazyLoadFailedElement(label: string): ReactNode {
  return createElement(
    'p',
    { className: 'text-xs text-red-700 dark:text-red-400', role: 'alert' },
    `Could not load ${label}.`,
  );
}

/**
 * `next/dynamic` crashes the page (React error #306) when the loader's default
 * export is missing. Always hand React a real component instead.
 */
export function ensureLazyDefault<P extends object>(
  component: ComponentType<P> | undefined | null,
  label: string,
): { default: ComponentType<P> } {
  if (isRenderableType(component)) {
    return { default: component as ComponentType<P> };
  }
  const Fallback = function LazyLoadFailed() {
    return lazyLoadFailedElement(label);
  };
  return { default: Fallback as ComponentType<P> };
}
