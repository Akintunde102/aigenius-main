import type { Meta, StoryObj } from '@storybook/react';
import { ChatMessageWrapper as ChatMessageWrapper } from './ChatMessageWrapper';

const meta: Meta<typeof ChatMessageWrapper> = {
  title: 'Components/model-interface/features/messages/components/ChatMessageWrapper',
  component: ChatMessageWrapper,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ChatMessageWrapper>;

export const Default: Story = {
  args: {},
};
