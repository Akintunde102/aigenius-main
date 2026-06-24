import type { Meta, StoryObj } from '@storybook/react';
import ChatLoadingIndicator from './ChatLoadingIndicator';

const meta: Meta<typeof ChatLoadingIndicator> = {
  title: 'Components/model-interface/features/chat/components/ChatLoadingIndicator',
  component: ChatLoadingIndicator,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ChatLoadingIndicator>;

export const Default: Story = {
  args: {},
};
