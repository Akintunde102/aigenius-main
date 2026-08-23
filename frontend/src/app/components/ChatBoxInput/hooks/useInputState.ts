import { useState, useCallback, useEffect, useRef } from 'react';

interface UseInputStateProps {
    externalInputValue?: string;
    onInputChange?: (value: string) => void;
    /** Conversation id (or draft key) for the open composer — used to flush drafts on switch. */
    composerSessionKey?: string;
    /** Persist draft text under a specific session key (e.g. when switching before debounce). */
    commitDraftForKey?: (key: string, value: string) => void;
}

const INPUT_DEBOUNCE_MS = 150;

export const useInputState = ({
    externalInputValue,
    onInputChange,
    composerSessionKey = '',
    commitDraftForKey,
}: UseInputStateProps) => {
    const [internalInputValue, setInternalInputValue] = useState(externalInputValue || '');
    const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onInputChangeRef = useRef(onInputChange);
    const commitDraftForKeyRef = useRef(commitDraftForKey);
    const lastSentValueRef = useRef(externalInputValue || '');
    const internalInputValueRef = useRef(internalInputValue);
    const composerSessionKeyRef = useRef(composerSessionKey);
    const prevSessionKeyRef = useRef(composerSessionKey);

    internalInputValueRef.current = internalInputValue;
    composerSessionKeyRef.current = composerSessionKey;

    useEffect(() => {
        onInputChangeRef.current = onInputChange;
    }, [onInputChange]);

    useEffect(() => {
        commitDraftForKeyRef.current = commitDraftForKey;
    }, [commitDraftForKey]);

    const cancelDebounce = useCallback(() => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
            debounceTimeoutRef.current = null;
        }
    }, []);

    const flushPendingToKey = useCallback((key: string, value: string) => {
        if (value === lastSentValueRef.current) return;
        commitDraftForKeyRef.current?.(key, value);
        lastSentValueRef.current = value;
    }, []);

    // Session switch: save in-progress text to the old conversation, then load the new one.
    useEffect(() => {
        if (composerSessionKey === prevSessionKeyRef.current) {
            return;
        }

        cancelDebounce();
        const oldKey = prevSessionKeyRef.current;
        flushPendingToKey(oldKey, internalInputValueRef.current);

        prevSessionKeyRef.current = composerSessionKey;

        const external = externalInputValue ?? '';
        setInternalInputValue(external);
        lastSentValueRef.current = external;
    }, [composerSessionKey, externalInputValue, cancelDebounce, flushPendingToKey]);

    // Same-session external updates (STT, insert saved chat, etc.)
    useEffect(() => {
        if (composerSessionKey !== prevSessionKeyRef.current) {
            return;
        }
        if (externalInputValue !== undefined && externalInputValue !== lastSentValueRef.current) {
            cancelDebounce();
            setInternalInputValue(externalInputValue);
            lastSentValueRef.current = externalInputValue;
        }
    }, [externalInputValue, composerSessionKey, cancelDebounce]);

    const handleInputChange = useCallback((val: string) => {
        setInternalInputValue(val);
        cancelDebounce();

        const sessionAtSchedule = composerSessionKeyRef.current;
        debounceTimeoutRef.current = setTimeout(() => {
            debounceTimeoutRef.current = null;
            if (sessionAtSchedule !== composerSessionKeyRef.current) {
                flushPendingToKey(sessionAtSchedule, val);
                return;
            }
            lastSentValueRef.current = val;
            onInputChangeRef.current?.(val);
        }, INPUT_DEBOUNCE_MS);
    }, [cancelDebounce, flushPendingToKey]);

    const clearInput = useCallback(() => {
        cancelDebounce();
        setInternalInputValue('');
        lastSentValueRef.current = '';
        onInputChangeRef.current?.('');
    }, [cancelDebounce]);

    /** Push any pending debounced keystrokes to the parent before sending. */
    const flushInputToParent = useCallback(() => {
        cancelDebounce();
        const value = internalInputValueRef.current;
        lastSentValueRef.current = value;
        onInputChangeRef.current?.(value);
    }, [cancelDebounce]);

    useEffect(() => {
        return () => {
            cancelDebounce();
            const key = prevSessionKeyRef.current;
            const pending = internalInputValueRef.current;
            if (pending !== lastSentValueRef.current) {
                commitDraftForKeyRef.current?.(key, pending);
            }
        };
    }, [cancelDebounce]);

    return {
        inputValue: internalInputValue,
        handleInputChange,
        clearInput,
        flushInputToParent,
    };
};
