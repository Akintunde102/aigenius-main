import { useCallback, useEffect, useRef, useState } from 'react';
import type { ModelPickResolver } from '../ModelInterface.helpers';
import type { Model } from '../shared/types';

export function useModelInterfaceModelPick(
  showModelSelectionModal: boolean,
  setShowModelSelectionModal: (open: boolean) => void,
) {
  const [pendingModelPick, setPendingModelPick] = useState<ModelPickResolver | null>(null);
  const pendingModelPickRejectRef = useRef<((reason?: unknown) => void) | null>(null);

  const requestModelPick = useCallback(async (): Promise<Model | null> => {
    return new Promise((resolve, reject) => {
      setPendingModelPick(() => resolve);
      pendingModelPickRejectRef.current = reject;
      setShowModelSelectionModal(true);
    });
  }, [setShowModelSelectionModal]);

  useEffect(() => {
    return () => {
      if (pendingModelPickRejectRef.current) {
        pendingModelPickRejectRef.current(new Error('Model picker disposed'));
        pendingModelPickRejectRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (showModelSelectionModal || !pendingModelPick) {
      return;
    }
    pendingModelPick(null);
    setPendingModelPick(null);
    pendingModelPickRejectRef.current = null;
  }, [pendingModelPick, showModelSelectionModal]);

  const resolveModelPick = useCallback(
    (model: Model | null) => {
      if (!pendingModelPick) return false;
      pendingModelPick(model);
      setPendingModelPick(null);
      pendingModelPickRejectRef.current = null;
      setShowModelSelectionModal(false);
      return true;
    },
    [pendingModelPick, setShowModelSelectionModal],
  );

  return {
    requestModelPick,
    resolveModelPick,
  };
}
