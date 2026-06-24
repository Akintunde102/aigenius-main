import type { Meta, StoryObj } from '@storybook/react';
import { SessionInfo as SessionInfo } from './SessionInfo';

const meta: Meta<typeof SessionInfo> = {
  title: 'Components/ChatHistoryListItem/components/SessionInfo',
  component: SessionInfo,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof SessionInfo>;

export const Default: Story = {
  args: {},
};
