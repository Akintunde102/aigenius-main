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
    `}</style>
);

export default ChatBoxStyles;
