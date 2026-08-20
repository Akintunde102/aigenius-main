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
    `}</style>
);

export default ChatBoxStyles;
