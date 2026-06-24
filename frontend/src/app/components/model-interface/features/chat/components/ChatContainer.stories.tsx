import type { Meta, StoryObj } from '@storybook/react';
import ChatContainer from './ChatContainer';

const meta: Meta<typeof ChatContainer> = {
  title: 'Components/model-interface/features/chat/components/ChatContainer',
  component: ChatContainer,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ChatContainer>;

export const Default: Story = {
  args: {},
};
