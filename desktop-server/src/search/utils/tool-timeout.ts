const TOOL_SLA_MS = Number(process.env.AIGENIUS_TOOL_SLA_MS ?? 2000);

export const TOOL_RESPONSE_BUDGET_MS = TOOL_SLA_MS;

export async function withToolTimeout<T>(
  label: string,
  fn: () => T | Promise<T>,
  budgetMs = TOOL_RESPONSE_BUDGET_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(fn()),
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} exceeded ${budgetMs}ms response budget`)),
          budgetMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
