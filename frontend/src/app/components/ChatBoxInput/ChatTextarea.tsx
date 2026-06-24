import React from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { ChatTextareaProps } from './types';

export const ChatTextarea: React.FC<ChatTextareaProps & {
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  sidebarStyle?: boolean;
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSubmit?: (e: React.FormEvent) => void;
  submitTitle?: string;
  hasUploadedFiles?: boolean;
}> = React.memo(({
  value,
  onChange,
  onKeyDown,
  placeholder,
  textareaDisabled = false,
  uploading,
  responseInProgress = false,
  onStopGeneration,
  textareaRef,
  sidebarStyle = false,
  onPaste,
  onFocus,
  onBlur,
  onSubmit,
  submitTitle = 'Send message (Shift+Enter)',
  hasUploadedFiles = false,
  mini = false
}) => {
  // Single consolidated effect for auto-resize and overflow management
  React.useLayoutEffect(() => {
    const target = textareaRef?.current;
    if (!target) return;

    // Reset height to calculate scrollHeight correctly
    target.style.height = 'auto';

    if (!value) {
      target.style.overflowY = 'hidden';
    } else {
      const maxHeight = mini ? 120 : 200;
      const newHeight = Math.min(target.scrollHeight, maxHeight);
      target.style.height = `${newHeight}px`;

      if (target.scrollHeight > maxHeight) {
        target.style.overflowY = 'auto';
        // Ensure we see the bottom of the input while typing
        target.scrollTop = target.scrollHeight;
      } else {
        target.style.overflowY = 'hidden';
      }
    }
  }, [value, textareaRef, mini]);

  const sendBlocked = responseInProgress || uploading;
  const canSend = (value.trim() || hasUploadedFiles) && !sendBlocked;

  return (
    <div className={`flex items-end gap-2 w-full ${mini ? 'px-1' : ''}`}>
      <label htmlFor="chat-composer-textarea" className="sr-only">
        {mini ? "Ask a question" : "Message input"}
      </label>
      <textarea
        id="chat-composer-textarea"
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        placeholder={mini ? "Ask..." : placeholder}
        disabled={textareaDisabled}
        onFocus={onFocus}
        onBlur={onBlur}
        className={`chat-composer-textarea blinking-caret flex-1 resize-none overflow-y-auto border-none bg-transparent outline-none hover:border-none focus:border-none focus:outline-none focus:ring-0 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 ${mini
            ? "min-h-[24px] max-h-[120px] py-1 text-sm leading-tight"
            : "min-h-[30px] max-h-[200px] py-2 text-[15px] leading-relaxed"
          }`}
        aria-label="Message input"
        rows={1}
        style={{
          minHeight: mini ? '24px' : '30px',
          maxHeight: mini ? '120px' : '200px',
          flex: 1,
          resize: 'none',
          overflowY: 'auto',
          wordWrap: 'break-word',
          whiteSpace: 'pre-wrap'
        }}
      />

      {responseInProgress && onStopGeneration ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onStopGeneration();
          }}
          className="chat-composer-send flex-shrink-0 rounded-full p-1.5 text-white transition-colors"
          title="Stop generation"
          aria-label="Stop generation"
          style={{ marginBottom: '2px' }}
        >
          <Square size={14} fill="currentColor" strokeWidth={0} className="text-white" />
        </button>
      ) : (
        <button
          type="submit"
          disabled={!canSend}
          onClick={onSubmit}
          className={`chat-composer-send flex-shrink-0 rounded-full p-1.5 transition-colors ${canSend ? "chat-composer-send--enabled" : "chat-composer-send--disabled"}`}
          title={submitTitle}
          aria-label="Send message"
          style={{ marginBottom: '2px' }}
        >
          <ArrowUp size={16} />
        </button>
      )}
    </div>
  );
});

/* Add blinking caret style */
<style jsx global>{`
.chat-composer-textarea {
  color: var(--app-ink-900);
}
.chat-composer-textarea::placeholder {
  color: var(--chat-muted-fg);
}

.chat-composer-send--enabled {
  background-color: var(--chat-accent);
}
.chat-composer-send--enabled:hover {
  background-color: var(--chat-accent-hover);
}
.chat-composer-send--disabled {
  cursor: not-allowed;
  background-color: var(--chat-accent-muted);
  color: var(--chat-muted-fg);
}

.blinking-caret {
  caret-color: var(--chat-accent);
  animation: caret-blink 1s steps(1) infinite;
}
@keyframes caret-blink {
  0%, 100% { caret-color: var(--chat-accent); }
  50% { caret-color: transparent; }
}

.blinking-caret {
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.35) transparent;
}

.blinking-caret::-webkit-scrollbar {
  width: 3px;
}

.blinking-caret::-webkit-scrollbar-track {
  background: transparent;
}

.blinking-caret::-webkit-scrollbar-thumb {
  background-color: rgba(148, 163, 184, 0.35);
  border-radius: 999px;
}

.blinking-caret::-webkit-scrollbar-thumb:hover {
  background-color: rgba(148, 163, 184, 0.5);
}

/* Mobile keyboard handling for textarea */
@media (max-width: 768px) {
  body.keyboard-open textarea.blinking-caret {
    // max-height: 120px !important;
  }
}
`}</style> 