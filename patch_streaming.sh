#!/bin/bash
sed -i '' 's/        let lastUiUpdateTime/        let chatMapKey = streamingSessionId ?? DRAFT_SESSION_KEY;\n        let lastUiUpdateTime/g' frontend/src/app/components/model-interface/features/chat/hooks/useStreamingResponse.ts
sed -i '' 's/            if (streamingSessionId === null) {/            if (streamingSessionId === null) {\n                chatMapKey = conversationId;\n                onDraftMaterialized?.(conversationId);/g' frontend/src/app/components/model-interface/features/chat/hooks/useStreamingResponse.ts
