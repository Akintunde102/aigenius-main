import {
  countLinesFromSource,
  readLinesFromSource,
  type MemoryLineSource,
} from './line-source';

describe('line-source memory reads', () => {
  const source: MemoryLineSource = {
    type: 'memory',
    path: '/tmp/sample.doc',
    lines: ['line one', 'line two', 'line three'],
  };

  it('counts lines from in-memory extracted text', async () => {
    const count = await countLinesFromSource(source);
    expect(count).toEqual({ totalLines: 3, lineCountOmitted: false });
  });

  it('reads a bounded line window from in-memory extracted text', async () => {
    const slice = await readLinesFromSource(source, 2, 2);
    expect(slice.lines).toEqual(['line two', 'line three']);
    expect(slice.lineStart).toBe(2);
    expect(slice.lineEnd).toBe(3);
    expect(slice.totalLines).toBe(3);
    expect(slice.truncatedBelow).toBe(false);
  });
});
