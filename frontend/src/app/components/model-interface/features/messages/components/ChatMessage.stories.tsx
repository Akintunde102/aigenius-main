import type { Meta, StoryObj } from '@storybook/react';
import { ChatMessage as ChatMessage } from './ChatMessage';

const meta: Meta<typeof ChatMessage> = {
  title: 'Components/model-interface/features/messages/components/ChatMessage',
  component: ChatMessage,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ChatMessage>;

export const Default: Story = {
  args: {},
};
