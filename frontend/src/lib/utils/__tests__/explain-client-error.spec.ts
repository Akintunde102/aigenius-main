import { explainClientError } from '../explain-client-error';

describe('explainClientError', () => {
  it('decodes React error 306 when a lazy import resolves to undefined', () => {
    const minified =
      'Minified React error #306; visit https://reactjs.org/docs/error-decoder.html?invariant=306&args[]=undefined&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.';

    expect(explainClientError(new Error(minified))).toBe(
      'Element type is invalid. Received a promise that resolves to: undefined. Lazy element type must resolve to a class or function.',
    );
  });

  it('decodes React error 130 when a component type is missing', () => {
    const minified =
      'Minified React error #130; visit https://reactjs.org/docs/error-decoder.html?invariant=130&args[]=undefined&args[]= for the full message';

    expect(explainClientError(new Error(minified))).toContain('got: undefined');
  });

  it('names an unknown React invariant instead of leaving the decoder URL', () => {
    const minified =
      'Minified React error #999; visit https://reactjs.org/docs/error-decoder.html?invariant=999&args[]=widget for the full message';

    expect(explainClientError(minified)).toBe('React error #999 (widget)');
  });

  it('returns a normal error message unchanged', () => {
    expect(explainClientError(new Error('Slug check failed'))).toBe('Slug check failed');
  });
});
