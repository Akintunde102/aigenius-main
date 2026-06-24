import React from 'react';
import { ChatMessage as ChatMessageType } from '@/app/components/model-interface/shared/types';
import styles from './TypingIndicator.module.css';

interface TypingIndicatorProps {
    loading: boolean;
    streaming: boolean;
    showTyping: boolean;
    chat: ChatMessageType[];
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
    loading,
    streaming,
    showTyping,
    chat,
}) => {
    const hasAssistantMsg = chat.length > 0 && chat[chat.length - 1].role === 'assistant';
    const isStreamingAndNoData = streaming && !hasAssistantMsg;
    const shouldShowTyping = showTyping && (loading || isStreamingAndNoData);

    const getTypingState = () => {
        if (loading && !streaming) return "connecting";
        if (isStreamingAndNoData) return "responding";
        return "thinking";
    };

    const typingState = getTypingState();

    if (!shouldShowTyping) return null;

    const renderAnimation = () => {
        switch (typingState) {
            case "connecting":
                return (
                    <div className={styles.connectingAnimation}>
                        <div className={styles.connectingRing}></div>
                        <div className={styles.connectingRing}></div>
                        <div className={styles.connectingRing}></div>
                    </div>
                );
            case "responding":
                return (
                    <div className={styles.respondingAnimation}>
                        {/* <div className={styles.typingBubble}>
                            <div className={styles.bubbleDot}></div>
                            <div className={styles.bubbleDot}></div>
                            <div className={styles.bubbleDot}></div>
                        </div> */}
                        <div className={styles.responseWaves}>
                            <div className={styles.waveLine}></div>
                            <div className={styles.waveLine}></div>
                            <div className={styles.waveLine}></div>
                        </div>
                    </div>
                );
            default: // thinking
                return (
                    <div className={styles.thinkingAnimation}>
                        <div className={styles.pulseDot}></div>
                        <div className={styles.pulseDot}></div>
                        <div className={styles.pulseDot}></div>
                    </div>
                );
        }
    };

    return (
        <div
            className="flex w-full justify-start md:justify-center py-1"
            style={{ marginBottom: "0.5rem" }}
            aria-live="polite"
            aria-busy="true"
        >
            <div className="flex w-full md:max-w-[720px] justify-start">
                <div className="flex max-w-[85%] items-center gap-2 text-sm text-slate-500">
                    {renderAnimation()}
                    <span className="font-medium">
                        {typingState === "connecting" && "Connecting…"}
                        {typingState === "responding" && "Responding…"}
                        {typingState === "thinking" && "Thinking…"}
                    </span>
                </div>
            </div>
        </div>
    );
};
