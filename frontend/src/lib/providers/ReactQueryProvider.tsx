"use client";

import { MutationCache, QueryCache, QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { initProactiveAccessTokenRefresh } from "@/lib/api/auth-client";
import { reportClientError } from "@/lib/utils/report-client-error";
import { shouldReportQueryError, shouldRetryFailedRequest } from "@/lib/providers/react-query-resilience";

const ReactQueryProvider = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error, query) => {
            if (!shouldReportQueryError(error, query.meta)) {
              return;
            }
            reportClientError(error, "react-query");
          },
        }),
        mutationCache: new MutationCache({
          onError: (error, _variables, _context, mutation) => {
            if (!shouldReportQueryError(error, mutation.meta)) {
              return;
            }
            reportClientError(error, "react-query-mutation");
          },
        }),
        defaultOptions: {
          queries: {
            retry: shouldRetryFailedRequest,
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
          },
        },
      }),
  );

  useEffect(() => {
    initProactiveAccessTokenRefresh();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

export default ReactQueryProvider;