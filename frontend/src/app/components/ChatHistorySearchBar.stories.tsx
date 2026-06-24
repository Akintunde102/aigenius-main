import type { Meta, StoryObj } from '@storybook/react';
import ChatHistorySearchBar from './ChatHistorySearchBar';

const meta: Meta<typeof ChatHistorySearchBar> = {
  title: 'Components/ChatHistorySearchBar',
  component: ChatHistorySearchBar,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ChatHistorySearchBar>;

export const Default: Story = {
  args: {},
};
