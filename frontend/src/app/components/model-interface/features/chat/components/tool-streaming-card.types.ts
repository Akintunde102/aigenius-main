import type { StreamingToolState } from '@/app/components/model-interface/shared/types';

export type ToolStreamingCardProps = {
  streaming_tool: StreamingToolState;
  /** Tool result string (only present for completed event-based tool calls) */
  result?: string;
  /** Tool arguments (only present for completed event-based tool calls) */
  arguments?: Record<string, unknown>;
  /** Compact row inside {@link ToolStreamingGroup} — title + chevron; input/result on expand */
  groupItem?: boolean;
};
