import fs from 'fs/promises';
import os from 'os';
import path from 'path';

const mockToFile = jest.fn().mockResolvedValue(undefined);
const mockSharp = jest.fn(() => ({
  png: jest.fn(() => ({ toFile: mockToFile })),
}));

jest.mock('sharp', () => ({
  __esModule: true,
  default: mockSharp,
}));

import { prepareImageForAnalysis } from './image-normalize.js';

/** Minimal valid JPEG (1×1). */
const MINI_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxISEhUQEhIVFhUVFRUYFxYYFhUYHSggGBolGxUVITEhJSkrLi4uFx8zODMtNygtLisBCgoKDg0OGxAQGy0lICUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAQMBIgACEQEDEQH/xAAbAAACAwEBAQAAAAAAAAAAAAABAgMEBQYAB//EADAQAAIBAwMCBAMFBAMBAAMAAAECAAMREiExQVFhBhMicYGRobHB0fAUI0Lh8RX/2gAMAwEAAhEDEQA/AOVKKKKKAP/Z',
  'base64',
);

describe('prepareImageForAnalysis', () => {
  beforeEach(() => {
    mockSharp.mockClear();
    mockToFile.mockClear();
  });

  it('passes through jfif without conversion', async () => {
    const tmp = path.join(os.tmpdir(), `aigenius-jfif-test-${Date.now()}.jfif`);
    await fs.writeFile(tmp, MINI_JPEG);

    const prepared = await prepareImageForAnalysis(tmp);
    expect(prepared.filePath).toBe(tmp);
    expect(mockSharp).not.toHaveBeenCalled();

    await prepared.cleanup();
    await fs.unlink(tmp).catch(() => undefined);
  });

  it('decodes heic via sharp to a temporary png', async () => {
    const tmp = path.join(os.tmpdir(), `aigenius-heic-test-${Date.now()}.heic`);
    await fs.writeFile(tmp, Buffer.from('fake-heic-bytes'));

    const prepared = await prepareImageForAnalysis(tmp);
    expect(mockSharp).toHaveBeenCalledWith(tmp);
    expect(mockToFile).toHaveBeenCalled();
    expect(prepared.filePath).not.toBe(tmp);
    expect(prepared.filePath.endsWith('.png')).toBe(true);

    await prepared.cleanup();
    await fs.unlink(tmp).catch(() => undefined);
  });
});
