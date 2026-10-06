/**
 * Turns a production React minified error into the sentence the decoder page would show.
 * The page still works when this returns the original message for errors we do not recognize.
 */

const REACT_INVARIANT_TEMPLATES: Record<string, string> = {
  '31': 'Objects are not valid as a React child (found: %s).%s',
  '130':
    'Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s',
  '152':
    'Nothing was returned from render. This usually means a return statement is missing. Or, to render nothing, return null.',
  '185':
    'Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate. React limits the number of nested updates to prevent infinite loops.',
  '306':
    'Element type is invalid. Received a promise that resolves to: %s. Lazy element type must resolve to a class or function.%s',
  '418': 'Hydration failed because the server rendered %s did not match the client.',
  '423': 'There was an error while hydrating this Suspense boundary. Switched to client rendering.',
  '425': 'Text content does not match server-rendered HTML.',
};

function fillTemplate(template: string, args: string[]): string {
  let index = 0;
  return template.replace(/%s/g, () => args[index++] ?? '').trim();
}

function decodeReactMinifiedMessage(message: string): string | null {
  const urlMatch = message.match(
    /https:\/\/reactjs\.org\/docs\/error-decoder\.html\?([^\s)]+)/,
  );
  if (!urlMatch) {
    return null;
  }
  const params = new URLSearchParams(urlMatch[1]);
  const code = params.get('invariant');
  if (!code) {
    return null;
  }
  const args = params.getAll('args[]');
  const template = REACT_INVARIANT_TEMPLATES[code];
  if (!template) {
    const extra = args.filter(Boolean).join(', ');
    return extra ? `React error #${code} (${extra})` : `React error #${code}`;
  }
  return fillTemplate(template, args);
}

export function explainClientError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
  return decodeReactMinifiedMessage(message) ?? message;
}
