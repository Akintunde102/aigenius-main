import type { Meta, StoryObj } from '@storybook/react';
import ConversationPage from './page';

const meta: Meta<typeof ConversationPage> = {
  title: 'Pages/chat/[conversationId]',
  component: ConversationPage,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ConversationPage>;

export const Default: Story = {
  args: {},
};
