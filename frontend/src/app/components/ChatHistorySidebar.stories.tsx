import type { Meta, StoryObj } from '@storybook/react';
import ChatHistorySidebar from './ChatHistorySidebar';

const meta: Meta<typeof ChatHistorySidebar> = {
  title: 'Components/ChatHistorySidebar',
  component: ChatHistorySidebar,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ChatHistorySidebar>;

export const Default: Story = {
  args: {},
};
