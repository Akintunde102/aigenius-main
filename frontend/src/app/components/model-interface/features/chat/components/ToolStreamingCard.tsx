'use client';

import React from 'react';
import { RenderErrorBoundary } from '@/app/components/RenderErrorBoundary';
import { DefaultToolStreamingCard } from './DefaultToolStreamingCard';
import { LocalApplyPatchToolCard } from './tool-ui/LocalApplyPatchToolCard';
import { ToolWebFetchCard } from './tool-ui/ToolWebFetchCard';
import { resolveToolStreamingUi } from './tool-ui/tool-ui-registry';
import type { ToolStreamingCardProps } from './tool-streaming-card.types';

export type { ToolStreamingCardProps } from './tool-streaming-card.types';

export function ToolStreamingCard(props: ToolStreamingCardProps) {
  return (
    <RenderErrorBoundary logLabel="[tool-card]">
      <ToolStreamingCardView {...props} />
    </RenderErrorBoundary>
  );
}

function ToolStreamingCardView(props: ToolStreamingCardProps) {
  if (props.groupItem) {
    if (props.streaming_tool.tool === 'local_apply_patch') {
      return <LocalApplyPatchToolCard {...props} />;
    }
    if (props.streaming_tool.tool === 'web_fetch') {
      return <ToolWebFetchCard {...props} />;
    }
    return <DefaultToolStreamingCard {...props} />;
  }
  const Custom = resolveToolStreamingUi(props.streaming_tool.tool);
  if (Custom) {
    return <Custom {...props} />;
  }
  return <DefaultToolStreamingCard {...props} />;
}
