import { useState, useCallback, useEffect, useRef } from 'react';

interface UseInputStateProps {
    externalInputValue?: string;
    onInputChange?: (value: string) => void;
}

export const useInputState = ({ externalInputValue, onInputChange }: UseInputStateProps) => {
    // Initialize state directly from external value if present
    const [internalInputValue, setInternalInputValue] = useState(externalInputValue || '');
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const onInputChangeRef = useRef(onInputChange);
    // Keep track of the last value pushed up to the parent component
    const lastSentValueRef = useRef(externalInputValue || '');

    useEffect(() => {
        onInputChangeRef.current = onInputChange;
    }, [onInputChange]);

    // Sync internal state with external value only when it originates from an outside source
    // (e.g. STT speech-to-text, switching sessions, or inserting saved chats)
    useEffect(() => {
        if (externalInputValue !== undefined && externalInputValue !== lastSentValueRef.current) {
            setInternalInputValue(externalInputValue);
            lastSentValueRef.current = externalInputValue;
        }
    }, [externalInputValue]);

    const handleInputChange = useCallback((val: string) => {
        setInternalInputValue(val);

        // Clear previous pending timeout
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        // Debounce update to parent component to avoid layout rendering thrashing (150ms delay)
        debounceTimeoutRef.current = setTimeout(() => {
            lastSentValueRef.current = val;
            if (onInputChangeRef.current) {
                onInputChangeRef.current(val);
            }
        }, 150);
    }, []);

    const clearInput = useCallback(() => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        setInternalInputValue('');
        lastSentValueRef.current = '';
        if (onInputChangeRef.current) {
            onInputChangeRef.current('');
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, []);

    return {
        inputValue: internalInputValue,
        handleInputChange,
        clearInput
    };
};