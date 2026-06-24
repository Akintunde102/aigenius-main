import type { Meta, StoryObj } from '@storybook/react';
import { AssistantStreamStatus as AssistantStreamStatus } from './AssistantStreamStatus';

const meta: Meta<typeof AssistantStreamStatus> = {
  title: 'Components/model-interface/features/messages/components/AssistantStreamStatus',
  component: AssistantStreamStatus,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof AssistantStreamStatus>;

export const Default: Story = {
  args: {},
};
