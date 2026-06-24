import { useState, useCallback, useRef, useEffect } from 'react';

interface ModalState {
    isOpen: boolean;
    data?: any;
}

/**
 * Ultra-lightweight modal state management hook.
 * Optimized to minimize re-renders and processing overhead.
 */
export const useLightweightModal = (initialState = false) => {
    const [modalState, setModalState] = useState<ModalState>({
        isOpen: initialState
    });

    // Use refs to avoid unnecessary re-renders when possible
    const isOpenRef = useRef(initialState);

    // Memoized functions to prevent recreation on every render
    const openModal = useCallback((data?: any) => {
        if (!isOpenRef.current) {
            isOpenRef.current = true;
            setModalState({ isOpen: true, data });
        }
    }, []);

    const closeModal = useCallback(() => {
        if (isOpenRef.current) {
            isOpenRef.current = false;
            setModalState({ isOpen: false });
        }
    }, []);

    const toggleModal = useCallback((data?: any) => {
        if (isOpenRef.current) {
            closeModal();
        } else {
            openModal(data);
        }
    }, [openModal, closeModal]);

    return {
        isOpen: modalState.isOpen,
        data: modalState.data,
        openModal,
        closeModal,
        toggleModal,
    };
};

/**
 * Hook for managing multiple modals efficiently.
 * Uses a single state object to minimize re-renders.
 */
export const useMultipleLightweightModals = <T extends string>(modalIds: T[]) => {
    const [modals, setModals] = useState<Record<T, boolean>>(
        modalIds.reduce((acc, id) => ({ ...acc, [id]: false }), {} as Record<T, boolean>)
    );

    const openModal = useCallback((id: T) => {
        setModals(prev => prev[id] ? prev : { ...prev, [id]: true });
    }, []);

    const closeModal = useCallback((id: T) => {
        setModals(prev => !prev[id] ? prev : { ...prev, [id]: false });
    }, []);

    const toggleModal = useCallback((id: T) => {
        setModals(prev => ({ ...prev, [id]: !prev[id] }));
    }, []);

    const closeAllModals = useCallback(() => {
        setModals(prev => {
            const hasOpenModal = Object.values(prev).some(Boolean);
            if (!hasOpenModal) return prev;

            return modalIds.reduce((acc, id) => ({ ...acc, [id]: false }), {} as Record<T, boolean>);
        });
    }, [modalIds]);

    return {
        modals,
        openModal,
        closeModal,
        toggleModal,
        closeAllModals,
        isAnyModalOpen: Object.values(modals).some(Boolean),
    };
};

/**
 * Performance-focused modal hook with minimal overhead.
 * Only updates when absolutely necessary.
 */
export const useMinimalModal = () => {
    const isOpenRef = useRef(false);
    const [, forceUpdate] = useState({});

    const update = useCallback(() => {
        forceUpdate({});
    }, []);

    const open = useCallback(() => {
        if (!isOpenRef.current) {
            isOpenRef.current = true;
            update();
        }
    }, [update]);

    const close = useCallback(() => {
        if (isOpenRef.current) {
            isOpenRef.current = false;
            update();
        }
    }, [update]);

    return {
        isOpen: isOpenRef.current,
        open,
        close,
        toggle: useCallback(() => {
            if (isOpenRef.current) close();
            else open();
        }, [open, close]),
    };
};

export default useLightweightModal;
