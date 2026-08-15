import {
  extractWorkflowIdsFromToolResult,
  isWorkflowShellPath,
  normalizeWorkflowOpenPath,
  openWorkflow,
  workflowStudioPath,
} from '../open-workflow';

describe('isWorkflowShellPath', () => {
  const origin = 'http://localhost:3001';

  it('matches workflow list and studio paths', () => {
    expect(isWorkflowShellPath('/workflows')).toBe(true);
    expect(isWorkflowShellPath('/workflows/new')).toBe(true);
    expect(isWorkflowShellPath('/workflow/f284a24b-df4a-4596-a880-ba92ef255442')).toBe(true);
    expect(isWorkflowShellPath('/workflow/f284a24b-df4a-4596-a880-ba92ef255442/executions')).toBe(true);
  });

  it('rejects incomplete workflow paths', () => {
    expect(isWorkflowShellPath('/workflow/')).toBe(false);
    expect(isWorkflowShellPath('/workflow')).toBe(false);
  });

  it('matches same-origin absolute workflow URLs when origin is provided', () => {
    expect(
      isWorkflowShellPath('http://localhost:3001/workflow/f284a24b-df4a-4596-a880-ba92ef255442', origin),
    ).toBe(true);
    expect(
      isWorkflowShellPath('https://other.example/workflow/f284a24b-df4a-4596-a880-ba92ef255442', origin),
    ).toBe(false);
  });
});

describe('normalizeWorkflowOpenPath', () => {
  const origin = 'http://localhost:3001';

  it('returns safe internal paths', () => {
    expect(normalizeWorkflowOpenPath('/workflows', origin)).toBe('/workflows');
    expect(
      normalizeWorkflowOpenPath('http://localhost:3001/workflow/abc-123/executions?tab=1', origin),
    ).toBe('/workflow/abc-123/executions?tab=1');
  });

  it('returns null for non-workflow paths', () => {
    expect(normalizeWorkflowOpenPath('/chat/123', origin)).toBeNull();
    expect(normalizeWorkflowOpenPath('https://evil.example/workflow/abc', origin)).toBeNull();
  });
});

describe('workflowStudioPath', () => {
  it('encodes workflow id in path', () => {
    expect(workflowStudioPath('wf-1')).toBe('/workflow/wf-1');
  });
});

describe('extractWorkflowIdsFromToolResult', () => {
  it('collects ids from workflow_ids_touched and workflow_urls', () => {
    const ids = extractWorkflowIdsFromToolResult({
      workflow_ids_touched: ['wf-1', 'wf-2'],
      workflow_urls: ['http://localhost/workflow/wf-3'],
    });
    expect(ids).toEqual(expect.arrayContaining(['wf-1', 'wf-2', 'wf-3']));
    expect(ids.length).toBe(3);
  });

  it('returns empty for invalid payloads', () => {
    expect(extractWorkflowIdsFromToolResult(null)).toEqual([]);
    expect(extractWorkflowIdsFromToolResult({ workflow_ids_touched: [1, null] })).toEqual([]);
  });
});

describe('openWorkflow', () => {
  const originalOpen = window.open;

  beforeEach(() => {
    window.open = jest.fn();
    delete (window as { aigeniusDesktop?: unknown }).aigeniusDesktop;
  });

  afterEach(() => {
    window.open = originalOpen;
  });

  it('opens a new browser tab on web', () => {
    openWorkflow('/workflows');
    expect(window.open).toHaveBeenCalledWith(
      `${window.location.origin}/workflows`,
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('uses desktop IPC when available', () => {
    const openNewWindow = jest.fn().mockResolvedValue(undefined);
    (window as { aigeniusDesktop?: { isDesktop: true; openNewWindow: typeof openNewWindow } }).aigeniusDesktop = {
      isDesktop: true,
      openNewWindow,
    };

    openWorkflow('/workflow/wf-1');
    expect(openNewWindow).toHaveBeenCalledWith('/workflow/wf-1');
    expect(window.open).not.toHaveBeenCalled();
  });
});
