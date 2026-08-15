import {
  CHAT_MAP_MAX_RETAINED_SESSIONS,
  evictChatMapSessions,
  stripMessagesFromHistorySessions,
  touchSessionLru,
} from '../chatMapMemoryPolicy';
import { DRAFT_SESSION_KEY } from '../chatOperations.constants';
import type { ChatMessage, ChatSession } from '@/app/components/model-interface/shared/types';

describe('chatMapMemoryPolicy', () => {
  it('stripMessagesFromHistorySessions clears message arrays', () => {
    const sessions: ChatSession[] = [
      { id: 'a', title: 'A', modelId: 'm', messages: [{ role: 'user', content: 'hi', timestamp: 1 }] },
    ];
    const stripped = stripMessagesFromHistorySessions(sessions);
    expect(stripped[0].messages).toEqual([]);
    expect(stripped[0].title).toBe('A');
  });

  it('touchSessionLru moves session to end', () => {
    expect(touchSessionLru(['a', 'b'], 'a')).toEqual(['b', 'a']);
    expect(touchSessionLru(['a', 'b'], 'c')).toEqual(['a', 'b', 'c']);
  });

  it('evictChatMapSessions keeps pinned sessions', () => {
    const map: Record<string, ChatMessage[]> = {
      s1: [{ role: 'user', content: '1', timestamp: 1 }],
      s2: [{ role: 'user', content: '2', timestamp: 2 }],
      s3: [{ role: 'user', content: '3', timestamp: 3 }],
    };
    const { map: next } = evictChatMapSessions(
      map,
      ['s1', 's2', 's3'],
      new Set(['s1']),
      2,
    );
    expect(next.s1).toHaveLength(1);
    expect(next.s2).toBeUndefined();
    expect(next.s3).toHaveLength(1);
  });

  it('never evicts draft session', () => {
    const map: Record<string, ChatMessage[]> = {
      [DRAFT_SESSION_KEY]: [{ role: 'user', content: 'draft', timestamp: 1 }],
      s1: [{ role: 'user', content: '1', timestamp: 1 }],
      s2: [{ role: 'user', content: '2', timestamp: 2 }],
    };
    const { map: next } = evictChatMapSessions(map, ['s1', '2', DRAFT_SESSION_KEY], new Set(), 1);
    expect(next[DRAFT_SESSION_KEY]).toHaveLength(1);
    expect(Object.keys(next).filter((k) => k !== DRAFT_SESSION_KEY)).toHaveLength(0);
  });

  it('default max matches CHAT_MAP_MAX_RETAINED_SESSIONS', () => {
    expect(CHAT_MAP_MAX_RETAINED_SESSIONS).toBeGreaterThan(1);
  });
});
