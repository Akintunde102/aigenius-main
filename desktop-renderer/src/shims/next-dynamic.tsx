import React, { lazy, Suspense, type ComponentType } from 'react';

type DynamicOptions<P = Record<string, unknown>> = {
  loading?: () => React.ReactNode;
  ssr?: boolean;
};

export default function dynamic<P = Record<string, unknown>>(
  loader: () => Promise<{ default: ComponentType<P> }>,
  options?: DynamicOptions<P>,
) {
  const LazyComponent = lazy(loader);
  const fallback = options?.loading?.() ?? null;

  function DynamicComponent(props: P) {
    return (
      <Suspense fallback={fallback}>
        <LazyComponent {...(props as P & JSX.IntrinsicAttributes)} />
      </Suspense>
    );
  }

  return DynamicComponent;
}
