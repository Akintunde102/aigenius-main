import type { Meta, StoryObj } from '@storybook/react';
import { ChatArea as ChatArea } from './ChatArea';

const meta: Meta<typeof ChatArea> = {
  title: 'Components/model-interface/features/chat/components/ChatArea',
  component: ChatArea,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ChatArea>;

export const Default: Story = {
  args: {},
};
