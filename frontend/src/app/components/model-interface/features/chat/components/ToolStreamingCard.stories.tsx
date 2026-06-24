import type { Meta, StoryObj } from '@storybook/react';
import { ToolStreamingCard as ToolStreamingCard } from './ToolStreamingCard';

const meta: Meta<typeof ToolStreamingCard> = {
  title: 'Components/model-interface/features/chat/components/ToolStreamingCard',
  component: ToolStreamingCard,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ToolStreamingCard>;

export const Default: Story = {
  args: {},
};
