import React from 'react';
import { TextMessage as SharedTextMessage, type TextMessageProps } from '@/shared/messages/TextMessage';

/** Main chat TextMessage — long user messages collapse with show more. */
export const TextMessage: React.FC<Omit<TextMessageProps, 'collapseLongUserMessages'>> = (props) => (
  <SharedTextMessage {...props} collapseLongUserMessages />
);

export type { TextMessageProps };
