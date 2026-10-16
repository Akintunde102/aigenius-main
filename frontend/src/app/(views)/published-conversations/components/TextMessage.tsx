import React from 'react';
import { TextMessage as SharedTextMessage, type TextMessageProps } from '@/shared/messages/TextMessage';

/** Published conversation TextMessage — no collapse, uses shared landing/chat typography. */
export const TextMessage: React.FC<Omit<TextMessageProps, 'collapseLongUserMessages'>> = (props) => (
  <SharedTextMessage {...props} collapseLongUserMessages={false} />
);

export type { TextMessageProps };
