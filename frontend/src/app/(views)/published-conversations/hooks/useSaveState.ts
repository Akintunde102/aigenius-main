import { useState, useMemo, useCallback } from 'react';
import { ChatMessage as ChatMessageType } from '@/app/components/model-interface/shared/types';

export const useSaveState = (
    msg: ChatMessageType,
    savedChats: ChatMessageType[],
    onSave: (msg: ChatMessageType) => void
) => {
    const [justSaved, setJustSaved] = useState(false);

    const isSaved = useMemo(() =>
        savedChats.some(m =>
            m.timestamp === msg.timestamp &&
            JSON.stringify(m.content) === JSON.stringify(msg.content)
        ), [msg, savedChats]
    );

    const handleSave = useCallback(() => {
        if (!isSaved) {
            onSave(msg);
            setJustSaved(true);
            setTimeout(() => setJustSaved(false), 1500);
        }
    }, [isSaved, onSave, msg]);

    return { isSaved, justSaved, handleSave };
};
