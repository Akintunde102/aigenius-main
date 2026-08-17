import React from 'react';
import { TextMessage as SharedTextMessage, type TextMessageProps } from '@/shared/messages/TextMessage';

/** Published conversation TextMessage — uses reading font, no collapse. */
export const TextMessage: React.FC<Omit<TextMessageProps, 'useChatReadingFont'>> = (props) => (
  <SharedTextMessage {...props} useChatReadingFont />
);

export type { TextMessageProps };
