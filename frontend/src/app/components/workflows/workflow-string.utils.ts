export function friendlyToolName(toolName: string): string {
  return toolName
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
