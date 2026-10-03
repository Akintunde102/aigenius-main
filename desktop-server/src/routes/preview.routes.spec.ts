import { createPreviewRoutes } from './preview.routes';

describe('local HTML preview routes', () => {
  const routes = createPreviewRoutes();

  it('stores a draft and serves it as html', async () => {
    const stored = await routes.request('/store', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'draft-calc', html: '<h1>Calculator</h1>' }),
    });

    expect(stored.status).toBe(200);
    const body = (await stored.json()) as { id: string; previewPath: string };
    expect(body.previewPath).toBe('/preview/draft-calc');

    const served = await routes.request('/draft-calc');
    expect(served.status).toBe(200);
    expect(served.headers.get('content-type')).toContain('text/html');
    expect(await served.text()).toContain('Calculator');
  });

  it('rejects a preview id that could break the browser-open command', async () => {
    const stored = await routes.request('/store', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'bad" & calc', html: '<h1>Nope</h1>' }),
    });

    expect(stored.status).toBe(400);
    const served = await routes.request('/bad%22%20%26%20calc');
    expect(served.status).toBe(404);
  });

  it('rejects an empty html body', async () => {
    const stored = await routes.request('/store', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ html: '   ' }),
    });

    expect(stored.status).toBe(400);
  });
});
