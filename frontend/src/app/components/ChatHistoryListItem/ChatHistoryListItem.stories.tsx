import type { Meta, StoryObj } from '@storybook/nextjs';
import ChatHistoryListItem from './ChatHistoryListItem';

const meta: Meta<typeof ChatHistoryListItem> = {
  title: 'Components/ChatHistoryListItem/ChatHistoryListItem',
  component: ChatHistoryListItem,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ChatHistoryListItem>;

export const Default: Story = {
  args: {},
};
