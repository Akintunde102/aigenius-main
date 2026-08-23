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
  sendBlocked?: boolean;
  textareaId?: string;
  actionSlot?: React.ReactNode;
  canQueueMessage?: boolean;
}> = React.memo(({
  value,
  onChange,
  onKeyDown,
  placeholder,
  textareaDisabled = false,
  uploading,
  responseInProgress = false,
  sendBlocked = false,
  onStopGeneration,
  textareaRef,
  sidebarStyle = false,
  onPaste,
  onFocus,
  onBlur,
  onSubmit,
  submitTitle = 'Send message (Shift+Enter)',
  hasUploadedFiles = false,
  textareaId = 'chat-composer-textarea',
  mini = false,
  actionSlot,
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

  const isSendBlocked = responseInProgress || uploading || sendBlocked;
  const canSend = (value.trim() || hasUploadedFiles) && !isSendBlocked;

  return (
    <div className={`flex items-end gap-2 w-full ${mini ? 'px-1' : ''}`}>
      <label htmlFor={textareaId} className="sr-only">
        {mini ? "Ask a question" : "Message input"}
      </label>
      <textarea
        id={textareaId}
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

      {actionSlot}

      {responseInProgress ? (
        <>
          {onStopGeneration ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onStopGeneration();
              }}
              className="chat-composer-stop flex-shrink-0 rounded-full p-2 transition-all active:scale-95"
              title="Stop generation"
              aria-label="Stop generation"
              style={{ marginBottom: '2px' }}
            >
              <Square size={14} fill="currentColor" strokeWidth={0} />
            </button>
          ) : null}
        </>
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