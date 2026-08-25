import type { Meta, StoryObj } from '@storybook/nextjs';
import ChatHistoryNewChatButton from './ChatHistoryNewChatButton';

const meta: Meta<typeof ChatHistoryNewChatButton> = {
  title: 'Components/ChatHistoryNewChatButton',
  component: ChatHistoryNewChatButton,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ChatHistoryNewChatButton>;

export const Default: Story = {
  args: {},
};
