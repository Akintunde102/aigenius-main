import React from 'react';
import { act } from '@testing-library/react';
import { createRoot, Root } from 'react-dom/client';
import { useMessageSendQueue } from '../useMessageSendQueue';
import {
  createClientDraftSessionId,
  getClientDraftSessionId,
  renewClientDraftSessionId,
} from '@/app/components/model-interface/conversation/clientDraftSession';
import { DRAFT_SESSION_KEY } from '../chatOperations.constants';

const model = {
  id: 'model-1',
  name: 'Test Model',
  description: 'test',
  context_length: 100000,
};

describe('useMessageSendQueue', () => {
  let container: HTMLDivElement;
  let root: Root;
  let resultRef: { current: ReturnType<typeof useMessageSendQueue> | null };

  beforeEach(() => {
    renewClientDraftSessionId();
    container = document.createElement('div');
    document.body.appendChild(container);
    resultRef = { current: null };
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  function renderHook(activeSessionKey: string) {
    function Wrapper() {
      resultRef.current = useMessageSendQueue({ activeSessionKey });
      return null;
    }
    act(() => {
      root = createRoot(container);
      root.render(React.createElement(Wrapper));
    });
  }

  it('enqueues messages on the active client draft session key', () => {
    const draftKey = getClientDraftSessionId();
    renderHook(draftKey);

    act(() => {
      resultRef.current!.enqueueMessage({ text: 'queued', model }, draftKey);
    });

    expect(resultRef.current!.queuedMessages).toHaveLength(1);
    expect(resultRef.current!.queuedMessages[0]?.text).toBe('queued');
  });

  it('migrates queue from client draft key when materializing', () => {
    const draftKey = createClientDraftSessionId();
    renderHook(draftKey);

    act(() => {
      resultRef.current!.enqueueMessage({ text: 'draft item', model }, draftKey);
      resultRef.current!.migrateDraftQueueToSession('conv-real', draftKey);
    });

    expect(resultRef.current!.getQueuedCount(draftKey)).toBe(0);
    expect(resultRef.current!.getQueuedCount('conv-real')).toBe(1);
  });

  it('clearSessionMessageQueue clears both client draft and legacy keys', () => {
    const draftKey = getClientDraftSessionId();
    renderHook(draftKey);

    act(() => {
      resultRef.current!.enqueueMessage({ text: 'a', model }, draftKey);
      resultRef.current!.enqueueMessage({ text: 'b', model }, DRAFT_SESSION_KEY);
      resultRef.current!.clearSessionMessageQueue(draftKey);
      resultRef.current!.clearSessionMessageQueue(DRAFT_SESSION_KEY);
    });

    expect(resultRef.current!.getQueuedCount(draftKey)).toBe(0);
    expect(resultRef.current!.getQueuedCount(DRAFT_SESSION_KEY)).toBe(0);
  });
});
