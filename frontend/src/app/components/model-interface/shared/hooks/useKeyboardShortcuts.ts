import { useCallback } from 'react';

interface UseKeyboardShortcutsProps {
    chatContainerRef: React.RefObject<any>;
    chat: any[];
    onOpenModelSelection?: () => void;
}

export function useKeyboardShortcuts({
    chatContainerRef,
    chat,
    onOpenModelSelection
}: UseKeyboardShortcutsProps) {

    const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
        // Cmd+K or Ctrl+K to open model selection
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            if (onOpenModelSelection) onOpenModelSelection();
            return;
        }

        // Let native/browser shortcuts work (e.g. Ctrl/Cmd+C copy).
        if (e.metaKey || e.ctrlKey || e.altKey) return;

        // Ignore if typing in an input or textarea
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable)) return;

        // Only focus for letter keys (a-z, A-Z)
        if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
            chatContainerRef.current?.focusInput();
        }
    }, [chatContainerRef, onOpenModelSelection]);

    return {
        handleGlobalKeyDown
    };
}
