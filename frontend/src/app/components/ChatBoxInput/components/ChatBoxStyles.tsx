import React from 'react';

const ChatBoxStyles: React.FC = () => (
    <style jsx global>{`
        @keyframes glisten {
            0% { box-shadow: 0 0 0 0 transparent; }
            10% { box-shadow: 0 0 0 1px color-mix(in srgb, var(--chat-accent) 22%, transparent); }
            50% { box-shadow: 0 0 0 1px color-mix(in srgb, var(--chat-accent) 32%, transparent); }
            90% { box-shadow: 0 0 0 1px color-mix(in srgb, var(--chat-accent) 22%, transparent); }
            100% { box-shadow: 0 0 0 0 transparent; }
        }
        .glisten-border {
            animation: glisten 2.2s linear;
        }
        .chat-composer--wallet-muted {
            opacity: 0.9;
            filter: saturate(0.78);
            transition: opacity 0.2s ease, filter 0.2s ease;
        }
        .chat-composer--wallet-muted .chat-composer-textarea::placeholder {
            opacity: 0.72;
        }
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
        .chat-composer-stop {
            background-color: color-mix(in srgb, var(--app-ink-900) 52%, transparent);
            color: #fff;
        }
        .chat-composer-stop:hover {
            background-color: color-mix(in srgb, var(--app-ink-900) 68%, transparent);
        }
        :global(.dark) .chat-composer-stop {
            background-color: color-mix(in srgb, #fff 16%, transparent);
            color: #e2e8f0;
        }
        :global(.dark) .chat-composer-stop:hover {
            background-color: color-mix(in srgb, #fff 24%, transparent);
        }
        .blinking-caret {
            caret-color: var(--chat-accent);
            animation: caret-blink 1s steps(1) infinite;
        }
        @keyframes caret-blink {
            0%, 100% { caret-color: var(--chat-accent); }
            50% { caret-color: transparent; }
        }
    `}</style>
);

export default ChatBoxStyles;
