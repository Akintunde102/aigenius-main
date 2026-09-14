import { describe, expect, it, jest } from '@jest/globals';
import { tagImage } from './yolo-tagger';

describe('yolo-tagger (onnxruntime-node availability)', () => {
  it('returns an empty array instead of crashing when onnxruntime-node fails to load', async () => {
    // onnxruntime-node's bundled DirectML binding can crash with ERR_DLOPEN_FAILED on machines
    // without a compatible GPU/DirectML runtime. Loading this module must never be able to bring
    // down the whole mini-server — image tagging is a purely optional feature.
    jest.doMock('onnxruntime-node', () => {
      throw new Error('A dynamic link library (DLL) initialization routine failed.');
    });

    const labels = await tagImage('/fake/image.png', '/fake/models');
    expect(labels).toEqual([]);

    jest.dontMock('onnxruntime-node');
  });

  it('returns an empty array when the model file is missing and download fails', async () => {
    jest.doMock('../../models-downloader.js', () => ({
      ensureModelsDownloaded: jest.fn(async () => undefined),
    }));

    const labels = await tagImage('/fake/image.png', '/nonexistent/models-dir');
    expect(labels).toEqual([]);

    jest.dontMock('../../models-downloader.js');
  });
});
