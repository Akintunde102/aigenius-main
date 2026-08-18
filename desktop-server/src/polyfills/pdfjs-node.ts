/**
 * pdf.js v5 evaluates `new DOMMatrix()` at module load time. Node/Electron utility
 * processes do not provide DOMMatrix — polyfill before importing pdfjs-dist.
 */
export function ensurePdfJsNodePolyfills(): void {
  if (typeof globalThis.DOMMatrix !== 'undefined') {
    return;
  }

  class DOMMatrixPolyfill {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;

    constructor(init?: string | number[]) {
      if (Array.isArray(init) && init.length >= 6) {
        [this.a, this.b, this.c, this.d, this.e, this.f] = init;
      }
    }

    multiply(): DOMMatrixPolyfill {
      return this;
    }

    translate(): DOMMatrixPolyfill {
      return this;
    }

    scale(): DOMMatrixPolyfill {
      return this;
    }

    inverse(): DOMMatrixPolyfill {
      return this;
    }

    clone(): DOMMatrixPolyfill {
      return new DOMMatrixPolyfill([this.a, this.b, this.c, this.d, this.e, this.f]);
    }
  }

  (globalThis as typeof globalThis & { DOMMatrix: typeof DOMMatrix }).DOMMatrix =
    DOMMatrixPolyfill as unknown as typeof DOMMatrix;
}

ensurePdfJsNodePolyfills();
