/** Jest stub — real OCR loads native deps and ESM; scenario tests mock at route boundary. */
export const PaddleOcrService = jest.fn();
export const V6_SMALL_MODEL = 'mock-v6-small';
export type ModelPathOptions = Record<string, unknown>;
