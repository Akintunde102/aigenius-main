import type { Meta, StoryObj } from '@storybook/react';
import { EmptyState as EmptyState } from './EmptyState';

const meta: Meta<typeof EmptyState> = {
  title: 'Components/model-interface/features/chat/components/EmptyState',
  component: EmptyState,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: {},
};
