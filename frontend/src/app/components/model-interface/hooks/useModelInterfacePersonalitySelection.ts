import { useCallback } from "react";
import type { Personality } from "@/lib/calls/model-chat-conversation";
import { createSystemChatMessage } from "../ModelInterface.helpers";
import type { ChatMessage, Model } from "../shared/types";

type Params = {
  models: Model[];
  selectedModel: Model | null;
  setSelectedModel: (model: Model | null) => void;
  setSelectedPersonalityId: (id: string | undefined) => void;
  setSelectedSystemPrompt: (prompt: string | undefined) => void;
  setSelectedPersonalityName: (name: string | undefined) => void;
  setSelectedPersonalityIconUrl: (icon: string | undefined) => void;
  setChat: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setShowPersonalityModal: (open: boolean) => void;
  createNewSessionAndSwitchWrapper: (modelId: string) => Promise<void> | void;
};

export function useModelInterfacePersonalitySelection({
  models,
  selectedModel,
  setSelectedModel,
  setSelectedPersonalityId,
  setSelectedSystemPrompt,
  setSelectedPersonalityName,
  setSelectedPersonalityIconUrl,
  setChat,
  setShowPersonalityModal,
  createNewSessionAndSwitchWrapper,
}: Params) {
  const handlePersonalitySelect = useCallback(
    async (persona: Personality | null) => {
      const modelToUse = persona?.modelId
        ? models.find(
            (modelItem) =>
              modelItem.id === persona.modelId || modelItem.name === persona.modelId,
          )
        : selectedModel;

      if (modelToUse) {
        await createNewSessionAndSwitchWrapper(modelToUse.id);
      } else if (models.length > 0) {
        await createNewSessionAndSwitchWrapper(models[0].id);
      }

      setSelectedPersonalityId(persona?.id);
      setSelectedSystemPrompt(persona?.prompt);
      setSelectedPersonalityName(persona?.name);
      setSelectedPersonalityIconUrl(persona?.icon);

      if (persona?.modelId) {
        const resolvedModel = models.find(
          (modelItem) =>
            modelItem.id === persona.modelId || modelItem.name === persona.modelId,
        );
        if (resolvedModel) {
          setSelectedModel(resolvedModel);
        }
      }

      if (persona?.prompt) {
        const systemMsg = createSystemChatMessage({
          content: persona.prompt,
          model: modelToUse || selectedModel,
          personaName: persona.name,
          personaIconUrl: persona.icon,
        });
        setChat((prev) => [...prev.filter((message) => message.role !== "system"), systemMsg]);
      }

      setShowPersonalityModal(false);
    },
    [
      createNewSessionAndSwitchWrapper,
      models,
      selectedModel,
      setChat,
      setSelectedModel,
      setSelectedPersonalityIconUrl,
      setSelectedPersonalityId,
      setSelectedPersonalityName,
      setSelectedSystemPrompt,
      setShowPersonalityModal,
    ],
  );

  return { handlePersonalitySelect };
}
