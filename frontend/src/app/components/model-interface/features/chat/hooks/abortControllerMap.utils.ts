export function migrateAbortControllerKey(
  map: Map<string, AbortController>,
  fromKey: string,
  toKey: string,
): void {
  if (fromKey === toKey) {
    return;
  }
  const controller = map.get(fromKey);
  if (!controller) {
    return;
  }
  map.delete(fromKey);
  map.set(toKey, controller);
}
