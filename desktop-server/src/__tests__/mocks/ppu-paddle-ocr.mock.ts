/** Jest stub — real OCR loads native deps and ESM; scenario tests mock at route boundary. */

const recognize = jest.fn().mockResolvedValue({ text: 'Hello OCR', confidence: 0.9, lines: [] });
const initialize = jest.fn().mockResolvedValue(undefined);
const destroy = jest.fn().mockResolvedValue(undefined);
const isInitialized = jest.fn().mockReturnValue(false);

export const PaddleOcrService = jest.fn().mockImplementation(() => ({
  initialize,
  recognize,
  destroy,
  isInitialized,
}));

export const V6_SMALL_MODEL = {
  detection: 'https://example.com/det.ort',
  recognition: 'https://example.com/rec.ort',
  charactersDictionary: 'https://example.com/dict.txt',
};

export const paddleOcrMocks = {
  recognize,
  initialize,
  destroy,
  isInitialized,
};
