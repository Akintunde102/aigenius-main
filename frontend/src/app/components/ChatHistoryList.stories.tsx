import type { Meta, StoryObj } from '@storybook/react';
import ChatHistoryList from './ChatHistoryList';

const meta: Meta<typeof ChatHistoryList> = {
  title: 'Components/ChatHistoryList',
  component: ChatHistoryList,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ChatHistoryList>;

export const Default: Story = {
  args: {},
};
