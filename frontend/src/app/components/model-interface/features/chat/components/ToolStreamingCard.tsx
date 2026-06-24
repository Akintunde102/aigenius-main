'use client';

import React from 'react';
import { DefaultToolStreamingCard } from './DefaultToolStreamingCard';
import { resolveToolStreamingUi } from './tool-ui/tool-ui-registry';
import type { ToolStreamingCardProps } from './tool-streaming-card.types';

export type { ToolStreamingCardProps } from './tool-streaming-card.types';

export function ToolStreamingCard(props: ToolStreamingCardProps) {
  if (props.groupItem) {
    return <DefaultToolStreamingCard {...props} />;
  }
  const Custom = resolveToolStreamingUi(props.streaming_tool.tool);
  if (Custom) {
    return <Custom {...props} />;
  }
  return <DefaultToolStreamingCard {...props} />;
}
