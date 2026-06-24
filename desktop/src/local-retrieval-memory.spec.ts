import fs from 'fs';
import os from 'os';
import path from 'path';
import {
    getRetrievalMemoryBySlugFromTool,
    getRetrievalMemoryService,
    initLocalRetrievalMemory,
    LocalRetrievalMemoryService,
    upsertRetrievalMemoryFromTool,
} from './local-retrieval-memory';

describe('LocalRetrievalMemoryService', () => {
    let dir: string;

    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lrmem-'));
        initLocalRetrievalMemory(dir);
    });

    afterEach(() => {
        fs.rmSync(dir, { recursive: true, force: true });
    });

    it('upserts and gets by slug', async () => {
        const svc = getRetrievalMemoryService();
        const r = await svc.upsert({
            slug: 'my-note',
            name: 'My Note',
            description: 'One line',
            tags: ['a', 'b'],
            body: 'full text here',
        });
        expect(r).toEqual({ ok: true, slug: 'my-note' });

        const e = await svc.getBySlug('my-note');
        expect(e?.body).toBe('full text here');
        expect(e?.name).toBe('My Note');
        expect(e?.description).toBe('One line');
        expect(e?.tags).toEqual(['a', 'b']);
    });

    it('rejects invalid slug', async () => {
        const svc = getRetrievalMemoryService();
        const r = await svc.upsert({
            slug: 'bad slug',
            body: 'x',
        });
        expect(r.ok).toBe(false);
    });

    it('rejects empty body', async () => {
        const svc = getRetrievalMemoryService();
        const r = await svc.upsert({ slug: 'ok-slug', body: '   ' });
        expect(r.ok).toBe(false);
    });

    it('updates existing slug case-insensitively', async () => {
        const svc = getRetrievalMemoryService();
        await svc.upsert({ slug: 'ABC', body: 'first' });
        await svc.upsert({ slug: 'abc', body: 'second' });
        const e = await svc.getBySlug('ABC');
        expect(e?.body).toBe('second');
        const cat = svc.getCatalogEntriesForPrompt();
        expect(cat).toHaveLength(1);
        expect(cat[0].slug.toLowerCase()).toBe('abc');
    });

    it('getCatalogEntriesForPrompt lists public fields only', async () => {
        const svc = getRetrievalMemoryService();
        await svc.upsert({
            slug: 'x',
            name: 'N',
            description: 'D',
            tags: ['t'],
            body: 'secret body',
        });
        const rows = svc.getCatalogEntriesForPrompt();
        expect(rows).toHaveLength(1);
        expect(rows[0]).toEqual({
            slug: 'x',
            name: 'N',
            description: 'D',
            tags: ['t'],
        });
        expect(JSON.stringify(rows)).not.toContain('secret');
    });

    it('hydrates catalog from disk when the store file exists before first upsert', async () => {
        const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'lrmem-hydr-'));
        try {
            fs.writeFileSync(
                path.join(dir2, 'retrieval-memory-v1.json'),
                JSON.stringify({
                    version: 1,
                    entries: [
                        {
                            slug: 'pre',
                            name: 'Pre',
                            description: 'D',
                            tags: ['a'],
                            body: 'body',
                            updatedAtIso: new Date().toISOString(),
                        },
                    ],
                }),
                'utf8',
            );
            initLocalRetrievalMemory(dir2);
            const svc = getRetrievalMemoryService();
            await svc.ensurePromptCatalogHydrated();
            const cats = svc.getCatalogEntriesForPrompt();
            expect(cats).toHaveLength(1);
            expect(cats[0]).toEqual({
                slug: 'pre',
                name: 'Pre',
                description: 'D',
                tags: ['a'],
            });
        } finally {
            fs.rmSync(dir2, { recursive: true, force: true });
        }
    });
});

describe('LocalRetrievalMemoryService direct path', () => {
    it('constructs with custom dir without singleton', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lrmem2-'));
        try {
            const svc = new LocalRetrievalMemoryService(dir);
            await svc.upsert({ slug: 'z', body: 'content' });
            const raw = fs.readFileSync(path.join(dir, 'retrieval-memory-v1.json'), 'utf8');
            expect(raw).toContain('content');
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });
});

describe('tool helpers', () => {
    let dir: string;

    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lrmem-tool-'));
        initLocalRetrievalMemory(dir);
    });

    afterEach(() => {
        fs.rmSync(dir, { recursive: true, force: true });
    });

    it('getRetrievalMemoryBySlugFromTool returns found payload', async () => {
        await getRetrievalMemoryService().upsert({ slug: 't1', body: 'hello' });
        const out = await getRetrievalMemoryBySlugFromTool({ slug: 't1' });
        expect(out.ok).toBe(true);
        if (!out.ok) throw new Error('unexpected');
        const j = JSON.parse(out.result);
        expect(j.found).toBe(true);
        expect(j.body).toBe('hello');
    });

    it('getRetrievalMemoryBySlugFromTool returns found false when missing', async () => {
        const out = await getRetrievalMemoryBySlugFromTool({ slug: 'missing' });
        expect(out.ok).toBe(true);
        if (!out.ok) throw new Error('unexpected');
        const j = JSON.parse(out.result);
        expect(j.found).toBe(false);
    });

    it('upsertRetrievalMemoryFromTool generates slug when omitted', async () => {
        const out = await upsertRetrievalMemoryFromTool({
            body: 'data',
            name: 'Auto',
        });
        expect(out.ok).toBe(true);
        if (!out.ok) throw new Error('unexpected');
        const j = JSON.parse(out.result);
        expect(j.slug).toMatch(/^mem-[a-f0-9]+$/);
    });

    it('upsertRetrievalMemoryFromTool parses comma tags', async () => {
        const out = await upsertRetrievalMemoryFromTool({
            slug: 'tagged',
            body: 'b',
            tags: 'foo, bar',
        });
        expect(out.ok).toBe(true);
        const e = await getRetrievalMemoryService().getBySlug('tagged');
        expect(e?.tags).toEqual(['foo', 'bar']);
    });
});
