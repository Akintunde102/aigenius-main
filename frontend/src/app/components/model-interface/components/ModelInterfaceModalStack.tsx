import React from "react";
import type { Personality } from "@/lib/calls/model-chat-conversation";
import { ModalContainer } from "../features";
import { PersonalityModal, PublishConversationModal } from "../features/modals";
import type { PublishState } from "../ModelInterface.types";

type Props = {
  modalContainerProps: React.ComponentProps<typeof ModalContainer>;
  showPersonalityModal: boolean;
  setShowPersonalityModal: (value: boolean) => void;
  personalities: Personality[];
  setPersonalities: (
    personalities: Personality[] | ((prev: Personality[]) => Personality[]),
  ) => void;
  currentUser: Record<string, unknown> | null;
  onSelectPersonality: (personality: Personality | null) => Promise<void>;
  publishState: PublishState;
  setPublishState: (state: PublishState) => void;
  onPublishConversation: (title: string, description?: string) => Promise<string>;
};

export function ModelInterfaceModalStack({
  modalContainerProps,
  showPersonalityModal,
  setShowPersonalityModal,
  personalities,
  setPersonalities,
  currentUser,
  onSelectPersonality,
  publishState,
  setPublishState,
  onPublishConversation,
}: Props) {
  return (
    <>
      <ModalContainer {...modalContainerProps} />

      {showPersonalityModal && (
        <PersonalityModal
          isOpen={showPersonalityModal}
          onClose={() => setShowPersonalityModal(false)}
          personalities={personalities}
          setPersonalities={setPersonalities}
          currentUser={currentUser}
          onSelect={onSelectPersonality}
          currentModelId={modalContainerProps.selectedModel?.id}
          currentModelName={modalContainerProps.selectedModel?.name}
        />
      )}

      {publishState.kind !== "closed" && (
        <PublishConversationModal
          isOpen={true}
          onClose={() => {
            setPublishState({ kind: "closed" });
          }}
          onPublish={onPublishConversation}
          session={publishState.session}
          isRepublishing={publishState.kind === "republish"}
          existingUrl={publishState.existingUrl}
        />
      )}
    </>
  );
}
